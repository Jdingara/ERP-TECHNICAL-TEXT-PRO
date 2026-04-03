# ============================================================
# FILE: medical_textile/models.py
# PURPOSE: Database tables for Medical Textile module.
#          Covers: Regulatory Compliance, Batch Traceability,
#          Sterility Records, CAPA Management,
#          Audit Trail, Shelf Life Tracking.
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Item
from production.models import Batch


# ============================================================
# REGULATORY COMPLIANCE
# Tracks certifications per product: ISO 13485, FDA, CE Mark
# ============================================================
class RegulatoryCompliance(models.Model):

    STATUS_CHOICES = [
        ('active',   'Active / Valid'),
        ('expired',  'Expired'),
        ('pending',  'Pending Renewal'),
        ('revoked',  'Revoked'),
    ]

    STANDARD_CHOICES = [
        ('iso_13485', 'ISO 13485'),
        ('iso_9001',  'ISO 9001'),
        ('fda_510k',  'FDA 510(k)'),
        ('ce_mark',   'CE Mark'),
        ('bis',       'BIS'),
        ('nabl',      'NABL'),
        ('who_gmp',   'WHO-GMP'),
        ('other',     'Other'),
    ]

    item               = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='compliance_records')
    standard           = models.CharField(max_length=30, choices=STANDARD_CHOICES)
    certificate_number = models.CharField(max_length=100, blank=True)
    issuing_body       = models.CharField(max_length=200)
    issue_date         = models.DateField()
    expiry_date        = models.DateField(null=True, blank=True)
    status             = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    scope              = models.TextField(blank=True)
    notes              = models.TextField(blank=True)
    created_by         = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'med_regulatory_compliance'
        ordering = ['-issue_date']

    def __str__(self):
        return f"{self.item.item_code} — {self.standard}"


# ============================================================
# BATCH TRACEABILITY
# Full traceability: raw material → production → dispatch
# ============================================================
class BatchTraceability(models.Model):

    batch              = models.OneToOneField(Batch, on_delete=models.CASCADE, related_name='traceability')
    item               = models.ForeignKey(Item, on_delete=models.CASCADE)
    raw_material_lot   = models.CharField(max_length=200, blank=True)
    supplier_batch_ref = models.CharField(max_length=200, blank=True)
    raw_material_coa   = models.CharField(max_length=200, blank=True)
    production_date    = models.DateField()
    production_line    = models.CharField(max_length=100, blank=True)
    operator_name      = models.CharField(max_length=100, blank=True)
    supervisor_name    = models.CharField(max_length=100, blank=True)
    qc_passed          = models.BooleanField(default=False)
    qc_checked_by      = models.CharField(max_length=100, blank=True)
    qc_date            = models.DateField(null=True, blank=True)
    qc_remarks         = models.TextField(blank=True)
    dispatched_to      = models.CharField(max_length=200, blank=True)
    dispatch_date      = models.DateField(null=True, blank=True)
    invoice_reference  = models.CharField(max_length=100, blank=True)
    notes              = models.TextField(blank=True)
    created_by         = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'med_batch_traceability'
        ordering = ['-created_at']

    def __str__(self):
        return f"Trace: {self.batch.batch_number}"


# ============================================================
# STERILITY RECORD
# Sterilization process record for surgical/wound care products
# ============================================================
class SterilityRecord(models.Model):

    METHOD_CHOICES = [
        ('eo_gas',   'EO Gas'),
        ('gamma',    'Gamma Radiation'),
        ('steam',    'Steam Autoclave'),
        ('dry_heat', 'Dry Heat'),
        ('e_beam',   'E-Beam'),
        ('other',    'Other'),
    ]

    RESULT_CHOICES = [
        ('pass',    'Pass — Sterile'),
        ('fail',    'Fail — Not Sterile'),
        ('pending', 'Pending'),
    ]

    batch                = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='sterility_records')
    sterilization_method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    sterilization_date   = models.DateField()
    sterilized_by        = models.CharField(max_length=200, blank=True)
    cycle_number         = models.CharField(max_length=50, blank=True)
    temperature          = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    exposure_time_min    = models.IntegerField(null=True, blank=True)
    test_result          = models.CharField(max_length=10, choices=RESULT_CHOICES, default='pending')
    test_date            = models.DateField(null=True, blank=True)
    tested_by            = models.CharField(max_length=100, blank=True)
    certificate_number   = models.CharField(max_length=100, blank=True)
    remarks              = models.TextField(blank=True)
    created_by           = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at           = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'med_sterility_record'
        ordering = ['-sterilization_date']

    def __str__(self):
        return f"Sterility: {self.batch.batch_number} — {self.test_result}"


# ============================================================
# CAPA — Corrective and Preventive Action (ISO 13485 required)
# ============================================================
class CAPA(models.Model):

    TYPE_CHOICES = [
        ('corrective', 'Corrective Action'),
        ('preventive', 'Preventive Action'),
    ]

    SOURCE_CHOICES = [
        ('customer_complaint', 'Customer Complaint'),
        ('internal_audit',     'Internal Audit'),
        ('external_audit',     'External Audit'),
        ('product_failure',    'Product Failure'),
        ('supplier_issue',     'Supplier Issue'),
        ('process_deviation',  'Process Deviation'),
        ('other',              'Other'),
    ]

    STATUS_CHOICES = [
        ('open',        'Open'),
        ('in_progress', 'In Progress'),
        ('closed',      'Closed'),
        ('overdue',     'Overdue'),
    ]

    capa_number        = models.CharField(max_length=50, unique=True)
    capa_type          = models.CharField(max_length=20, choices=TYPE_CHOICES)
    source             = models.CharField(max_length=30, choices=SOURCE_CHOICES)
    description        = models.TextField()
    root_cause         = models.TextField(blank=True)
    action_taken       = models.TextField(blank=True)
    responsible_person = models.CharField(max_length=100, blank=True)
    target_date        = models.DateField(null=True, blank=True)
    closed_date        = models.DateField(null=True, blank=True)
    status             = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    effectiveness_check = models.TextField(blank=True)
    related_batch      = models.ForeignKey(Batch, on_delete=models.SET_NULL, null=True, blank=True)
    related_item       = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True)
    created_by         = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='capa_created')
    created_at         = models.DateTimeField(auto_now_add=True)
    updated_at         = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'med_capa'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.capa_number} — {self.status}"


# ============================================================
# AUDIT TRAIL — every action logged for regulatory inspection
# ============================================================
class AuditTrail(models.Model):

    module       = models.CharField(max_length=50)
    record_id    = models.IntegerField()
    record_ref   = models.CharField(max_length=100)
    action       = models.CharField(max_length=50)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    performed_at = models.DateTimeField(auto_now_add=True)
    details      = models.TextField(blank=True)

    class Meta:
        db_table = 'med_audit_trail'
        ordering = ['-performed_at']

    def __str__(self):
        return f"{self.module} | {self.record_ref} | {self.action}"


# ============================================================
# SHELF LIFE TRACKING — expiry dates and near-expiry alerts
# ============================================================
class ShelfLifeRecord(models.Model):

    STATUS_CHOICES = [
        ('valid',       'Valid'),
        ('near_expiry', 'Near Expiry'),
        ('expired',     'Expired'),
        ('recalled',    'Recalled'),
    ]

    batch              = models.OneToOneField(Batch, on_delete=models.CASCADE, related_name='shelf_life')
    item               = models.ForeignKey(Item, on_delete=models.CASCADE)
    manufacture_date   = models.DateField()
    expiry_date        = models.DateField()
    shelf_life_months  = models.IntegerField()
    storage_condition  = models.CharField(max_length=200, blank=True)
    status             = models.CharField(max_length=20, choices=STATUS_CHOICES, default='valid')
    quantity_remaining = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    notes              = models.TextField(blank=True)
    created_by         = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'med_shelf_life'
        ordering = ['expiry_date']

    def __str__(self):
        return f"{self.batch.batch_number} — Expires: {self.expiry_date}"
