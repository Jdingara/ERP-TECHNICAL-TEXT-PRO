# ============================================================
# FILE: production_exec/models.py
# PURPOSE: Process Entry (core engine) and Batch Management
#          Each process entry consumes LOTs and creates a Batch
#          This drives: consumption, WIP, and traceability
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Company
from masters.models import Machine, Process
from planning.models import ProductionOrder, DailyPlan
from purchase.models import Lot
import datetime


def batch_number():
    today = datetime.date.today().strftime('%Y%m%d')
    last = Batch.objects.filter(batch_number__startswith=f'BTH-{today}').count()
    return f"BTH-{today}-{str(last + 1).zfill(3)}"


# ── Process Entry ─────────────────────────────────────────────
# This is the CORE SCREEN — operator fills this for every process stage
class ProcessEntry(models.Model):
    STATUS = [
        ('draft',     'Draft'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    ]
    company          = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    entry_number     = models.CharField(max_length=50, unique=True)
    production_order = models.ForeignKey(ProductionOrder, on_delete=models.PROTECT, related_name='process_entries')
    daily_plan       = models.ForeignKey(DailyPlan, on_delete=models.SET_NULL, null=True, blank=True)
    process_stage    = models.ForeignKey(Process, on_delete=models.PROTECT)
    machine          = models.ForeignKey(Machine, on_delete=models.PROTECT)
    entry_date       = models.DateField()
    shift            = models.CharField(max_length=20, choices=[
        ('morning', 'Morning'), ('afternoon', 'Afternoon'), ('night', 'Night'),
    ], default='morning')
    operator_name    = models.CharField(max_length=100, blank=True)
    output_quantity  = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    rejection_qty    = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    status           = models.CharField(max_length=20, choices=STATUS, default='draft')
    notes            = models.TextField(blank=True)
    created_by       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.entry_number

    @property
    def total_input(self):
        return sum(i.quantity_used for i in self.lot_inputs.all())

    class Meta: ordering = ['-entry_date', '-created_at']


# ── LOT Inputs for a Process Entry ───────────────────────────
# Which lots were consumed in this process entry
class ProcessEntryLotInput(models.Model):
    process_entry = models.ForeignKey(ProcessEntry, on_delete=models.CASCADE, related_name='lot_inputs')
    lot           = models.ForeignKey(Lot, on_delete=models.PROTECT)
    quantity_used = models.DecimalField(max_digits=10, decimal_places=3)

    def __str__(self): return f"{self.lot.lot_number} × {self.quantity_used}"


# ── Batch (Output of a Process Entry) ────────────────────────
# Each confirmed process entry creates one or more batches
class Batch(models.Model):
    STATUS = [
        ('in_process',   'In Process'),
        ('qc_pending',   'QC Pending'),
        ('qc_passed',    'QC Passed'),
        ('qc_failed',    'QC Failed / Rejected'),
        ('rework',       'Rework'),
        ('finished',     'Finished Goods'),
        ('dispatched',   'Dispatched'),
    ]
    company          = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    batch_number     = models.CharField(max_length=50, unique=True)
    process_entry    = models.ForeignKey(ProcessEntry, on_delete=models.PROTECT, related_name='batches')
    production_order = models.ForeignKey(ProductionOrder, on_delete=models.PROTECT, related_name='batches')
    process_stage    = models.ForeignKey(Process, on_delete=models.PROTECT)
    quantity         = models.DecimalField(max_digits=10, decimal_places=3)
    balance_qty      = models.DecimalField(max_digits=10, decimal_places=3)  # remaining after dispatch
    status           = models.CharField(max_length=20, choices=STATUS, default='in_process')
    created_at       = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.batch_number
    class Meta: ordering = ['-created_at']


# ── Beam Outward (specific to Warping → Weaving flow) ────────
class BeamOutward(models.Model):
    company        = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    beam_number    = models.CharField(max_length=50, unique=True)
    process_entry  = models.ForeignKey(ProcessEntry, on_delete=models.PROTECT)  # warping entry
    quantity       = models.DecimalField(max_digits=10, decimal_places=3)
    issued_to_machine = models.ForeignKey(Machine, on_delete=models.SET_NULL, null=True, blank=True)
    issue_date     = models.DateField(null=True, blank=True)
    notes          = models.CharField(max_length=200, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.beam_number
    class Meta: ordering = ['-created_at']


# ── Yarn Issue (Warp / Weft Issue to production floor) ────────
# Issued before a process entry — warp yarn to warping machine,
# weft yarn to weaving machine
def yarn_issue_number():
    import datetime
    today = datetime.date.today().strftime('%Y%m%d')
    last  = YarnIssue.objects.filter(issue_number__startswith=f'YI-{today}').count()
    return f"YI-{today}-{str(last + 1).zfill(3)}"


class YarnIssue(models.Model):
    PURPOSE = [
        ('warp',  'Warp Yarn Issue'),
        ('weft',  'Weft / Filling Issue'),
        ('other', 'Other Material Issue'),
    ]
    STATUS = [
        ('draft',     'Draft'),
        ('confirmed', 'Confirmed'),
    ]
    company          = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    issue_number     = models.CharField(max_length=50, unique=True, default=yarn_issue_number)
    production_order = models.ForeignKey(ProductionOrder, on_delete=models.PROTECT, related_name='yarn_issues')
    lot              = models.ForeignKey(Lot, on_delete=models.PROTECT, related_name='yarn_issues')
    issued_qty       = models.DecimalField(max_digits=10, decimal_places=3)
    purpose          = models.CharField(max_length=20, choices=PURPOSE, default='warp')
    issue_date       = models.DateField()
    shift            = models.CharField(max_length=20, choices=[
        ('morning', 'Morning'), ('afternoon', 'Afternoon'), ('night', 'Night'),
    ], default='morning')
    issued_to_machine = models.ForeignKey(Machine, on_delete=models.SET_NULL, null=True, blank=True, related_name='yarn_issues')
    issued_by        = models.CharField(max_length=100, blank=True)
    status           = models.CharField(max_length=20, choices=STATUS, default='draft')
    notes            = models.TextField(blank=True)
    created_by       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.issue_number
    class Meta: ordering = ['-issue_date', '-created_at']


# ── Phase B: Stage-Specific Detail Models ─────────────────────
# Each is a OneToOne extension of ProcessEntry for operator fields

class WarpingDetail(models.Model):
    process_entry     = models.OneToOneField(ProcessEntry, on_delete=models.CASCADE, related_name='warping_detail')
    beam_count        = models.IntegerField(default=1)
    total_ends        = models.IntegerField(default=0)       # number of warp threads
    reed_count        = models.CharField(max_length=30, blank=True)   # e.g. "72/10cm"
    warp_length_m     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sizing_done       = models.BooleanField(default=False)
    beam_numbers      = models.TextField(blank=True)         # comma-separated beam IDs
    warp_tension_g    = models.IntegerField(default=0)       # grams

    def __str__(self): return f"Warping:{self.process_entry_id}"


class WeavingDetail(models.Model):
    process_entry     = models.OneToOneField(ProcessEntry, on_delete=models.CASCADE, related_name='weaving_detail')
    beam_outward      = models.ForeignKey(BeamOutward, on_delete=models.SET_NULL, null=True, blank=True)
    loom_rpm          = models.IntegerField(default=0)
    picks_per_cm      = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    weft_pattern      = models.CharField(max_length=100, blank=True)    # plain/twill/satin
    fabric_width_cm   = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    efficiency_pct    = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    def __str__(self): return f"Weaving:{self.process_entry_id}"


class StenterDetail(models.Model):
    process_entry     = models.OneToOneField(ProcessEntry, on_delete=models.CASCADE, related_name='stenter_detail')
    temp_zone1        = models.IntegerField(default=0)       # °C
    temp_zone2        = models.IntegerField(default=0)
    temp_zone3        = models.IntegerField(default=0)
    temp_zone4        = models.IntegerField(default=0)
    speed_mpm         = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    width_cm          = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    overfeed_pct      = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    chemical_recipe   = models.CharField(max_length=200, blank=True)

    def __str__(self): return f"Stenter:{self.process_entry_id}"


class TumblerDetail(models.Model):
    process_entry     = models.OneToOneField(ProcessEntry, on_delete=models.CASCADE, related_name='tumbler_detail')
    temp_celsius      = models.IntegerField(default=0)
    duration_minutes  = models.IntegerField(default=0)
    softener_name     = models.CharField(max_length=100, blank=True)
    softener_qty_kg   = models.DecimalField(max_digits=8, decimal_places=3, default=0)
    anti_wrinkle      = models.CharField(max_length=100, blank=True)

    def __str__(self): return f"Tumbler:{self.process_entry_id}"


class EmbossingDetail(models.Model):
    process_entry     = models.OneToOneField(ProcessEntry, on_delete=models.CASCADE, related_name='embossing_detail')
    pattern_code      = models.CharField(max_length=100, blank=True)
    pressure_bar      = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    temp_celsius      = models.IntegerField(default=0)
    speed_mpm         = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    def __str__(self): return f"Embossing:{self.process_entry_id}"


class LaminationDetail(models.Model):
    process_entry     = models.OneToOneField(ProcessEntry, on_delete=models.CASCADE, related_name='lamination_detail')
    film_type         = models.CharField(max_length=100, blank=True)    # PVC, TPU, PE, etc.
    film_gsm          = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    coat_weight_gsm   = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    adhesive_type     = models.CharField(max_length=100, blank=True)
    line_speed_mpm    = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    curing_temp       = models.IntegerField(default=0)

    def __str__(self): return f"Lamination:{self.process_entry_id}"


# ── Delivery Challan ──────────────────────────────────────────
def dc_number():
    import datetime
    today = datetime.date.today().strftime('%Y%m%d')
    last  = DeliveryChallan.objects.filter(dc_number__startswith=f'DC-{today}').count()
    return f"DC-{today}-{str(last + 1).zfill(3)}"


class DeliveryChallan(models.Model):
    STATUS = [
        ('draft',     'Draft'),
        ('issued',    'Issued'),
        ('returned',  'Returned'),
        ('converted', 'Converted to Invoice'),
    ]
    company           = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    dc_number         = models.CharField(max_length=50, unique=True, default=dc_number)
    dispatch_entry    = models.OneToOneField('dispatch.DispatchEntry', on_delete=models.PROTECT,
                                             null=True, blank=True, related_name='delivery_challan')
    dc_date           = models.DateField()
    vehicle_number    = models.CharField(max_length=50, blank=True)
    driver_name       = models.CharField(max_length=100, blank=True)
    lr_number         = models.CharField(max_length=100, blank=True)   # lorry receipt
    transporter       = models.CharField(max_length=200, blank=True)
    eway_bill         = models.CharField(max_length=100, blank=True)
    delivery_address  = models.TextField(blank=True)
    remarks           = models.TextField(blank=True)
    status            = models.CharField(max_length=20, choices=STATUS, default='draft')
    created_by        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.dc_number
    class Meta: ordering = ['-dc_date', '-created_at']
