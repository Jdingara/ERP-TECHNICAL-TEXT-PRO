# ============================================================
# FILE: purchasing/models.py
# PURPOSE: Database tables for purchasing module.
#          Purchase Order (PO) → Goods Receipt (GRN) → Stock
#          When GRN is confirmed, stock is automatically updated.
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Item, Supplier, Warehouse, Company


# ============================================================
# PURCHASE ORDER
# Created when you want to buy something from a supplier.
# ============================================================
class PurchaseOrder(models.Model):

    STATUS_CHOICES = [
        ('draft',       'Draft'),           # Being prepared
        ('confirmed',   'Confirmed'),       # Sent to supplier
        ('partial',     'Partial Receipt'), # Some items received
        ('received',    'Fully Received'),  # All items received
        ('cancelled',   'Cancelled'),
    ]

    company         = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    po_number       = models.CharField(max_length=50, unique=True)
    supplier        = models.ForeignKey(Supplier, on_delete=models.PROTECT)
    warehouse       = models.ForeignKey(Warehouse, on_delete=models.PROTECT)
    order_date      = models.DateField()
    expected_date   = models.DateField(null=True, blank=True)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes           = models.TextField(blank=True)
    total_amount    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'purchasing_purchase_order'
        ordering = ['-created_at']

    def __str__(self):
        return f"PO: {self.po_number} | {self.supplier.supplier_name}"


# ============================================================
# PURCHASE ORDER LINE
# Each item in a purchase order.
# ============================================================
class PurchaseOrderLine(models.Model):
    purchase_order      = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='lines')
    item                = models.ForeignKey(Item, on_delete=models.PROTECT)
    ordered_quantity    = models.DecimalField(max_digits=14, decimal_places=3)
    received_quantity   = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    unit_price          = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_price         = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes               = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'purchasing_purchase_order_line'

    def __str__(self):
        return f"{self.purchase_order.po_number} | {self.item.item_code}"


# ============================================================
# GOODS RECEIPT NOTE (GRN)
# Created when goods physically arrive from supplier.
# Confirming GRN automatically adds stock.
# ============================================================
class GoodsReceipt(models.Model):

    STATUS_CHOICES = [
        ('draft',       'Draft'),
        ('confirmed',   'Confirmed'),   # Stock has been added
    ]

    company         = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    grn_number      = models.CharField(max_length=50, unique=True)
    purchase_order  = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT)
    receipt_date    = models.DateField()
    supplier_invoice_number = models.CharField(max_length=100, blank=True)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes           = models.TextField(blank=True)
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'purchasing_goods_receipt'
        ordering = ['-created_at']

    def __str__(self):
        return f"GRN: {self.grn_number}"


# ============================================================
# GOODS RECEIPT LINE
# Each item received in a GRN.
# ============================================================
class GoodsReceiptLine(models.Model):
    goods_receipt       = models.ForeignKey(GoodsReceipt, on_delete=models.CASCADE, related_name='lines')
    purchase_order_line = models.ForeignKey(PurchaseOrderLine, on_delete=models.PROTECT)
    item                = models.ForeignKey(Item, on_delete=models.PROTECT)
    received_quantity   = models.DecimalField(max_digits=14, decimal_places=3)
    notes               = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'purchasing_goods_receipt_line'
