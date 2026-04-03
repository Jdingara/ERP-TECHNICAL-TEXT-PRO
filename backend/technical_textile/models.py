# ============================================================
# FILE: technical_textile/models.py
# PURPOSE: Database tables for Technical Textile module.
#          Covers: Product Categories, Performance Specs,
#          Sample Management, Technical Data Sheets,
#          Testing Lab Records, R&D Projects.
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Item, Customer


# ============================================================
# TECHNICAL PRODUCT CATEGORY
# Categories specific to technical textiles
# e.g. Geotextile, Agrotextile, Medical, Protective, Automotive
# ============================================================
class TechnicalProductCategory(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    code        = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    application = models.CharField(max_length=200, blank=True)  # e.g. Road construction, Agriculture
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tech_product_category'
        ordering = ['name']

    def __str__(self):
        return f"{self.code} — {self.name}"


# ============================================================
# PERFORMANCE SPECIFICATION
# Technical specs for each product — tensile, elongation, GSM, etc.
# Critical for technical textile sales and quality sign-off.
# ============================================================
class PerformanceSpec(models.Model):

    STATUS_CHOICES = [
        ('draft',    'Draft'),
        ('approved', 'Approved'),
        ('archived', 'Archived'),
    ]

    item            = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='performance_specs')
    category        = models.ForeignKey(TechnicalProductCategory, on_delete=models.SET_NULL, null=True, blank=True)
    spec_version    = models.CharField(max_length=20, default='v1.0')   # Version tracking
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Physical properties
    gsm                     = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name='GSM (g/m²)')
    width_cm                = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name='Width (cm)')
    thickness_mm            = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True, verbose_name='Thickness (mm)')

    # Strength properties
    tensile_strength_warp   = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name='Tensile Strength Warp (N)')
    tensile_strength_weft   = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name='Tensile Strength Weft (N)')
    elongation_warp         = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name='Elongation Warp (%)')
    elongation_weft         = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name='Elongation Weft (%)')
    tear_strength           = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name='Tear Strength (N)')
    burst_strength          = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name='Burst Strength (kPa)')

    # Other properties
    air_permeability        = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name='Air Permeability (mm/s)')
    water_permeability      = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name='Water Permeability')
    uv_resistance           = models.CharField(max_length=100, blank=True)
    fire_resistance         = models.CharField(max_length=100, blank=True)
    composition             = models.CharField(max_length=200, blank=True)   # e.g. 100% Polypropylene

    # Standards compliance
    standard_reference      = models.CharField(max_length=200, blank=True)  # e.g. IS 14715, ASTM D4595
    notes                   = models.TextField(blank=True)

    created_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tech_performance_spec'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.item.item_code} — Spec {self.spec_version}"


# ============================================================
# SAMPLE
# Samples sent to customers for approval before bulk order.
# Tracks sample status: sent, approved, rejected.
# ============================================================
class Sample(models.Model):

    STATUS_CHOICES = [
        ('prepared',  'Prepared'),
        ('sent',      'Sent to Customer'),
        ('approved',  'Approved'),
        ('rejected',  'Rejected'),
        ('revision',  'Revision Required'),
    ]

    sample_number   = models.CharField(max_length=50, unique=True)
    item            = models.ForeignKey(Item, on_delete=models.CASCADE)
    customer        = models.ForeignKey(Customer, on_delete=models.CASCADE)
    quantity        = models.DecimalField(max_digits=10, decimal_places=3)
    sent_date       = models.DateField(null=True, blank=True)
    approved_date   = models.DateField(null=True, blank=True)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='prepared')
    customer_remarks = models.TextField(blank=True)   # Feedback from customer
    internal_notes  = models.TextField(blank=True)
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tech_sample'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sample_number} — {self.item.item_code}"


# ============================================================
# TECHNICAL DATA SHEET (TDS)
# Document sent to customers with full product specs.
# Links a product to its performance spec + test results.
# ============================================================
class TechnicalDataSheet(models.Model):

    STATUS_CHOICES = [
        ('draft',    'Draft'),
        ('issued',   'Issued'),
        ('revised',  'Revised'),
    ]

    tds_number      = models.CharField(max_length=50, unique=True)
    item            = models.ForeignKey(Item, on_delete=models.CASCADE)
    spec            = models.ForeignKey(PerformanceSpec, on_delete=models.SET_NULL, null=True, blank=True)
    issue_date      = models.DateField()
    revision_number = models.CharField(max_length=10, default='R0')
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    prepared_by     = models.CharField(max_length=100, blank=True)
    approved_by     = models.CharField(max_length=100, blank=True)
    notes           = models.TextField(blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tech_data_sheet'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.tds_number} — {self.item.item_code}"


# ============================================================
# TESTING LAB RECORD
# Records actual test results for a batch/item.
# Each record = one test session with multiple parameters.
# ============================================================
class TestingLabRecord(models.Model):

    RESULT_CHOICES = [
        ('pass',    'Pass'),
        ('fail',    'Fail'),
        ('pending', 'Pending'),
    ]

    TEST_TYPE_CHOICES = [
        ('physical',   'Physical Test'),
        ('chemical',   'Chemical Test'),
        ('mechanical', 'Mechanical Test'),
        ('flammability','Flammability Test'),
        ('biological', 'Biological Test'),
        ('other',      'Other'),
    ]

    test_number     = models.CharField(max_length=50, unique=True)
    item            = models.ForeignKey(Item, on_delete=models.CASCADE)
    test_type       = models.CharField(max_length=20, choices=TEST_TYPE_CHOICES, default='physical')
    test_date       = models.DateField()
    tested_by       = models.CharField(max_length=100)
    lab_name        = models.CharField(max_length=200, blank=True)   # Internal or external lab

    # Test results — actual values measured
    gsm_actual              = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    tensile_warp_actual     = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    tensile_weft_actual     = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    elongation_warp_actual  = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    elongation_weft_actual  = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    tear_strength_actual    = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    air_permeability_actual = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    overall_result  = models.CharField(max_length=10, choices=RESULT_CHOICES, default='pending')
    remarks         = models.TextField(blank=True)
    standard_used   = models.CharField(max_length=200, blank=True)  # e.g. IS 1954, ASTM D5261

    created_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tech_testing_lab'
        ordering = ['-test_date']

    def __str__(self):
        return f"{self.test_number} — {self.item.item_code} — {self.overall_result}"


# ============================================================
# R&D PROJECT
# Tracks research and development projects for new products.
# ============================================================
class RDProject(models.Model):

    STATUS_CHOICES = [
        ('planning',    'Planning'),
        ('in_progress', 'In Progress'),
        ('testing',     'Testing'),
        ('completed',   'Completed'),
        ('on_hold',     'On Hold'),
        ('cancelled',   'Cancelled'),
    ]

    project_number  = models.CharField(max_length=50, unique=True)
    project_name    = models.CharField(max_length=200)
    objective       = models.TextField()
    target_product  = models.CharField(max_length=200, blank=True)   # What product we're trying to develop
    category        = models.ForeignKey(TechnicalProductCategory, on_delete=models.SET_NULL, null=True, blank=True)
    start_date      = models.DateField()
    target_end_date = models.DateField(null=True, blank=True)
    actual_end_date = models.DateField(null=True, blank=True)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    lead_engineer   = models.CharField(max_length=100, blank=True)
    budget          = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    outcome         = models.TextField(blank=True)   # Final result / what was achieved
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tech_rd_project'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project_number} — {self.project_name}"
