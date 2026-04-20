# ============================================================
# FILE: quality/models.py
# PURPOSE: Inspection and QC at every stage
#          Greige Inspection → Bare Inspection → Final Inspection
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Company
from masters.models import Machine, Process
from production_exec.models import Batch, ProcessEntry


class Inspection(models.Model):
    INSPECTION_STAGE = [
        ('greige',   'Greige Inspection'),
        ('bare',     'Bare Inspection (Post Processing)'),
        ('finished', 'Final / Finished Inspection'),
    ]
    RESULT = [
        ('pass',   'Pass'),
        ('fail',   'Fail / Reject'),
        ('rework', 'Rework'),
        ('hold',   'Hold'),
    ]
    company           = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    inspection_number = models.CharField(max_length=50, unique=True)
    batch             = models.ForeignKey(Batch, on_delete=models.PROTECT, related_name='inspections')
    inspection_stage  = models.CharField(max_length=20, choices=INSPECTION_STAGE)
    inspection_date   = models.DateField()
    inspected_by      = models.CharField(max_length=100, blank=True)

    # Quantities
    inspected_qty     = models.DecimalField(max_digits=10, decimal_places=3)
    passed_qty        = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    rejected_qty      = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    rework_qty        = models.DecimalField(max_digits=10, decimal_places=3, default=0)

    # Result
    result            = models.CharField(max_length=10, choices=RESULT)
    defect_category   = models.CharField(max_length=100, blank=True)  # weaving defect, stain, etc.
    remarks           = models.TextField(blank=True)

    created_by        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.inspection_number

    @property
    def rejection_pct(self):
        if self.inspected_qty > 0:
            return round((float(self.rejected_qty) / float(self.inspected_qty)) * 100, 1)
        return 0

    class Meta: ordering = ['-inspection_date', '-created_at']


class DefectType(models.Model):
    company         = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    defect_code     = models.CharField(max_length=50, blank=True)
    name            = models.CharField(max_length=100)   # = defect_name
    stage           = models.CharField(max_length=20, blank=True)   # = defect_category
    severity        = models.CharField(max_length=20, blank=True, default='minor')  # minor/major/critical
    description     = models.TextField(blank=True)
    is_active       = models.BooleanField(default=True)

    def __str__(self): return self.name
    class Meta: ordering = ['name']


class InspectionDefect(models.Model):
    inspection  = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name='defects')
    defect_type = models.ForeignKey(DefectType, on_delete=models.SET_NULL, null=True, blank=True)
    defect_name = models.CharField(max_length=100)
    quantity    = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    notes       = models.CharField(max_length=200, blank=True)


# ── Sample Testing (physical lab tests on finished goods) ─────
def sample_test_number():
    import datetime
    today = datetime.date.today().strftime('%Y%m%d')
    last  = SampleTest.objects.filter(test_number__startswith=f'ST-{today}').count()
    return f"ST-{today}-{str(last + 1).zfill(3)}"


class SampleTest(models.Model):
    RESULT = [
        ('pass',             'Pass'),
        ('fail',             'Fail'),
        ('conditional_pass', 'Conditional Pass'),
        ('pending',          'Pending'),
    ]
    company            = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    test_number        = models.CharField(max_length=50, unique=True, default=sample_test_number)
    batch              = models.ForeignKey(Batch, on_delete=models.PROTECT, related_name='sample_tests')
    test_date          = models.DateField()
    tested_by          = models.CharField(max_length=100, blank=True)
    # Physical test parameters
    tensile_strength   = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='N')
    elongation_pct     = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text='%')
    width_cm           = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, help_text='cm')
    weight_per_sqm     = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='gsm')
    breaking_strength  = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='N')
    tear_strength      = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='N')
    custom_param_name  = models.CharField(max_length=100, blank=True)
    custom_param_value = models.CharField(max_length=100, blank=True)
    result             = models.CharField(max_length=20, choices=RESULT, default='pending')
    remarks            = models.TextField(blank=True)
    created_by         = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at         = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.test_number
    class Meta: ordering = ['-test_date', '-created_at']
