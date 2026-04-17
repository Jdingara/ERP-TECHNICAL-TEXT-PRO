# ============================================================
# FILE: production/models.py
# PURPOSE: Database tables for production module.
#          BOM → Work Order → Production → Batch Tracking
#          When work order is completed, finished goods are
#          added to stock and raw materials are deducted.
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Item, Warehouse, Company


# ============================================================
# BILL OF MATERIALS (BOM)
# Recipe for making a finished product.
# Example: To make 100kg of 30s Cotton Yarn:
#          - 108kg Raw Cotton (waste 8%)
#          - Chemicals, etc.
# ============================================================
class BillOfMaterials(models.Model):

    STATUS_CHOICES = [
        ('draft',   'Draft'),
        ('active',  'Active'),
        ('inactive','Inactive'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    # The finished product this BOM produces
    finished_product    = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='bom_as_product')
    bom_name            = models.CharField(max_length=200)
    quantity_produced   = models.DecimalField(max_digits=12, decimal_places=3, default=1)  # How much this BOM produces
    status              = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes               = models.TextField(blank=True)
    created_by          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'production_bom'
        ordering = ['bom_name']

    def __str__(self):
        return f"BOM: {self.bom_name} → {self.finished_product.item_name}"


# ============================================================
# BOM LINE
# Each raw material needed in a BOM.
# ============================================================
class BOMLine(models.Model):
    bom             = models.ForeignKey(BillOfMaterials, on_delete=models.CASCADE, related_name='lines')
    raw_material    = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='bom_as_material')
    quantity        = models.DecimalField(max_digits=12, decimal_places=3)    # Qty needed per BOM
    waste_percent   = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # Expected waste %
    notes           = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'production_bom_line'

    @property
    def quantity_with_waste(self):
        """ Actual quantity needed including waste """
        return self.quantity * (1 + self.waste_percent / 100)


# ============================================================
# WORK ORDER
# Production instruction — make X quantity of product Y.
# ============================================================
class WorkOrder(models.Model):

    STATUS_CHOICES = [
        ('draft',       'Draft'),
        ('confirmed',   'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed',   'Completed'),
        ('cancelled',   'Cancelled'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    work_order_number   = models.CharField(max_length=50, unique=True)
    bom                 = models.ForeignKey(BillOfMaterials, on_delete=models.PROTECT)
    finished_product    = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='work_orders')
    planned_quantity    = models.DecimalField(max_digits=12, decimal_places=3)   # Target output
    actual_quantity     = models.DecimalField(max_digits=12, decimal_places=3, default=0)  # Actual output
    warehouse           = models.ForeignKey(Warehouse, on_delete=models.PROTECT)
    planned_start_date  = models.DateField()
    planned_end_date    = models.DateField(null=True, blank=True)
    actual_start_date   = models.DateField(null=True, blank=True)
    actual_end_date     = models.DateField(null=True, blank=True)
    status              = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes               = models.TextField(blank=True)
    created_by          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'production_work_order'
        ordering = ['-created_at']

    def __str__(self):
        return f"WO: {self.work_order_number} | {self.finished_product.item_name}"


# ============================================================
# WORK ORDER MATERIAL CONSUMPTION
# Tracks actual raw materials consumed in production.
# ============================================================
class WorkOrderMaterialConsumption(models.Model):
    work_order          = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='material_consumptions')
    raw_material        = models.ForeignKey(Item, on_delete=models.PROTECT)
    planned_quantity    = models.DecimalField(max_digits=12, decimal_places=3)
    actual_quantity     = models.DecimalField(max_digits=12, decimal_places=3, default=0)

    class Meta:
        db_table = 'production_material_consumption'


# ============================================================
# BATCH
# A production batch — one run of production.
# Used for traceability (critical for medical textile).
# ============================================================
class Batch(models.Model):
    batch_number        = models.CharField(max_length=50, unique=True)
    work_order          = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='batches')
    item                = models.ForeignKey(Item, on_delete=models.PROTECT)
    quantity_produced   = models.DecimalField(max_digits=12, decimal_places=3)
    production_date     = models.DateField()
    expiry_date         = models.DateField(null=True, blank=True)
    notes               = models.TextField(blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'production_batch'
        ordering = ['-production_date']

    def __str__(self):
        return f"Batch: {self.batch_number} | {self.item.item_name}"


# ============================================================
# MACHINE
# Equipment used in production — weaving, coating, finishing etc.
# ============================================================
class Machine(models.Model):

    MACHINE_TYPES = [
        ('weaving',   'Weaving'),
        ('knitting',  'Knitting'),
        ('nonwoven',  'Nonwoven'),
        ('coating',   'Coating'),
        ('finishing', 'Finishing'),
        ('testing',   'Testing / Lab'),
        ('other',     'Other'),
    ]
    STATUS_CHOICES = [
        ('active',      'Active'),
        ('idle',        'Idle'),
        ('maintenance', 'Under Maintenance'),
        ('breakdown',   'Breakdown'),
    ]

    company        = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    machine_code   = models.CharField(max_length=50, unique=True)
    machine_name   = models.CharField(max_length=200)
    machine_type   = models.CharField(max_length=50, choices=MACHINE_TYPES)
    capacity       = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    capacity_unit  = models.CharField(max_length=50, blank=True)   # e.g. meters/hr, kg/hr
    location       = models.CharField(max_length=100, blank=True)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    purchase_date  = models.DateField(null=True, blank=True)
    notes          = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'production_machine'
        ordering = ['machine_code']

    def __str__(self):
        return f"{self.machine_code} — {self.machine_name}"


# ============================================================
# QUALITY CHECK
# Quality inspection result for a work order or batch.
# ============================================================
class QualityCheck(models.Model):

    RESULT_CHOICES = [
        ('pass',    'Pass'),
        ('fail',    'Fail'),
        ('pending', 'Pending'),
    ]

    work_order      = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='quality_checks')
    batch           = models.ForeignKey(Batch, on_delete=models.SET_NULL, null=True, blank=True)
    check_date      = models.DateField()
    checked_by      = models.CharField(max_length=100)
    result          = models.CharField(max_length=20, choices=RESULT_CHOICES, default='pending')
    remarks         = models.TextField(blank=True)

    # Textile-specific quality parameters
    yarn_count_actual       = models.CharField(max_length=50, blank=True)   # Actual yarn count measured
    strength_value          = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    elongation_percent      = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    unevenness_percent      = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'production_quality_check'
        ordering = ['-check_date']
