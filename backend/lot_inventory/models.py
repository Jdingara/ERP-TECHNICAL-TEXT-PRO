# ============================================================
# FILE: lot_inventory/models.py
# PURPOSE: Lot-wise inventory — stock movements per lot
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Company
from masters.models import Location, YarnMaster, ItemMaster
from purchase.models import Lot


class LotMovement(models.Model):
    MOVEMENT_TYPE = [
        ('grn_in',       'GRN Inward'),
        ('issue_out',    'Issued to Production'),
        ('return_in',    'Return from Production'),
        ('adjustment',   'Stock Adjustment'),
        ('transfer',     'Location Transfer'),
    ]
    company       = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    lot           = models.ForeignKey(Lot, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE)
    quantity      = models.DecimalField(max_digits=10, decimal_places=3)
    from_location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name='outward_movements')
    to_location   = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name='inward_movements')
    reference     = models.CharField(max_length=100, blank=True)  # GRN no, Process entry no
    notes         = models.CharField(max_length=200, blank=True)
    created_by    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.lot.lot_number} | {self.movement_type} | {self.quantity}"
    class Meta: ordering = ['-created_at']


class StockAdjustment(models.Model):
    REASON = [
        ('damage',    'Damage'),
        ('shortage',  'Shortage Found'),
        ('excess',    'Excess Found'),
        ('other',     'Other'),
    ]
    company    = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    lot        = models.ForeignKey(Lot, on_delete=models.CASCADE)
    reason     = models.CharField(max_length=20, choices=REASON)
    adjustment_qty = models.DecimalField(max_digits=10, decimal_places=3)  # +ve or -ve
    notes      = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta: ordering = ['-created_at']
