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
    company      = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    name         = models.CharField(max_length=100)
    stage        = models.CharField(max_length=20, blank=True)  # which inspection stage
    description  = models.TextField(blank=True)
    is_active    = models.BooleanField(default=True)

    def __str__(self): return self.name
    class Meta: ordering = ['name']


class InspectionDefect(models.Model):
    inspection  = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name='defects')
    defect_type = models.ForeignKey(DefectType, on_delete=models.SET_NULL, null=True, blank=True)
    defect_name = models.CharField(max_length=100)
    quantity    = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    notes       = models.CharField(max_length=200, blank=True)
