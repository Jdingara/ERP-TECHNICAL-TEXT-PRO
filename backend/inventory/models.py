# ============================================================
# FILE: inventory/models.py
# PURPOSE: Database tables for inventory management.
#          Tracks current stock levels and all stock movements
#          (stock in, stock out, transfers, adjustments).
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Item, Warehouse, Company


# ============================================================
# STOCK
# Current stock level of each item in each warehouse.
# This is the main stock balance table.
# ============================================================
class Stock(models.Model):
    company     = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    item        = models.ForeignKey(Item, on_delete=models.CASCADE)
    warehouse   = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    quantity    = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table        = 'inventory_stock'
        unique_together = ('item', 'warehouse')   # One record per item per warehouse
        ordering        = ['item__item_code']

    def __str__(self):
        return f"{self.item.item_code} | {self.warehouse.code} | Qty: {self.quantity}"


# ============================================================
# STOCK MOVEMENT
# Every time stock moves (in or out), a record is created here.
# This is the full history of all stock transactions.
# ============================================================
class StockMovement(models.Model):

    MOVEMENT_TYPE_CHOICES = [
        ('stock_in',        'Stock In'),           # Received from supplier
        ('stock_out',       'Stock Out'),          # Issued for production or sale
        ('adjustment_in',   'Adjustment In'),      # Manual increase
        ('adjustment_out',  'Adjustment Out'),     # Manual decrease
        ('transfer_in',     'Transfer In'),        # Received from another warehouse
        ('transfer_out',    'Transfer Out'),       # Sent to another warehouse
        ('production_in',   'Production In'),      # Finished goods from production
        ('production_out',  'Production Out'),     # Raw material used in production
    ]

    # What moved
    company         = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    item            = models.ForeignKey(Item, on_delete=models.CASCADE)
    warehouse       = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    movement_type   = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    quantity        = models.DecimalField(max_digits=14, decimal_places=3)

    # Reference info
    reference_number    = models.CharField(max_length=100, blank=True)  # PO number, WO number, etc.
    reference_type      = models.CharField(max_length=50, blank=True)   # 'purchase_order', 'work_order', etc.
    notes               = models.TextField(blank=True)

    # Who did it and when
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table    = 'inventory_stock_movement'
        ordering    = ['-created_at']

    def __str__(self):
        return f"{self.movement_type} | {self.item.item_code} | {self.quantity}"


# ============================================================
# STOCK ADJUSTMENT
# When stock is manually corrected (physical count difference).
# ============================================================
class StockAdjustment(models.Model):

    STATUS_CHOICES = [
        ('draft',       'Draft'),
        ('confirmed',   'Confirmed'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    adjustment_number   = models.CharField(max_length=50, unique=True)
    warehouse           = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    adjustment_date     = models.DateField()
    reason              = models.TextField(blank=True)
    status              = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table    = 'inventory_stock_adjustment'
        ordering    = ['-created_at']

    def __str__(self):
        return f"Adjustment {self.adjustment_number}"


# ============================================================
# STOCK ADJUSTMENT LINE
# Each item in a stock adjustment
# ============================================================
class StockAdjustmentLine(models.Model):
    adjustment          = models.ForeignKey(StockAdjustment, on_delete=models.CASCADE, related_name='lines')
    item                = models.ForeignKey(Item, on_delete=models.CASCADE)
    system_quantity     = models.DecimalField(max_digits=14, decimal_places=3, default=0)  # What system shows
    physical_quantity   = models.DecimalField(max_digits=14, decimal_places=3, default=0)  # What you counted
    difference          = models.DecimalField(max_digits=14, decimal_places=3, default=0)  # physical - system
    notes               = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'inventory_stock_adjustment_line'
