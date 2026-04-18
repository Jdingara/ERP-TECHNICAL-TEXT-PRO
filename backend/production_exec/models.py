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
