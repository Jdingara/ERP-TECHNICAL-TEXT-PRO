# ============================================================
# FILE: purchase/models.py
# PURPOSE: Purchase Order, GRN, Lot Creation
#          Lot creation in GRN is where traceability starts
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Company
from masters.models import Vendor, YarnMaster, ItemMaster, Location, UOM
import datetime


def grn_lot_number():
    today = datetime.date.today().strftime('%Y%m%d')
    last = Lot.objects.filter(lot_number__startswith=f'LOT-{today}').count()
    return f"LOT-{today}-{str(last + 1).zfill(3)}"


# ── Purchase Order ────────────────────────────────────────────
class PurchaseOrder(models.Model):
    STATUS = [
        ('draft', 'Draft'), ('confirmed', 'Confirmed'),
        ('partial', 'Partially Received'), ('received', 'Fully Received'),
        ('cancelled', 'Cancelled'),
    ]
    company       = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    po_number     = models.CharField(max_length=50, unique=True)
    vendor        = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    order_date    = models.DateField()
    expected_date = models.DateField(null=True, blank=True)
    status        = models.CharField(max_length=20, choices=STATUS, default='draft')
    notes         = models.TextField(blank=True)
    total_amount  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_by    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.po_number
    class Meta: ordering = ['-created_at']


class PurchaseOrderLine(models.Model):
    MATERIAL_TYPE = [('yarn', 'Yarn'), ('item', 'Item')]
    purchase_order     = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='lines')
    material_type      = models.CharField(max_length=10, choices=MATERIAL_TYPE, default='yarn')
    yarn               = models.ForeignKey(YarnMaster, on_delete=models.SET_NULL, null=True, blank=True)
    item               = models.ForeignKey(ItemMaster, on_delete=models.SET_NULL, null=True, blank=True)
    ordered_quantity   = models.DecimalField(max_digits=10, decimal_places=3)
    received_quantity  = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    unit_price         = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price        = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    uom                = models.ForeignKey(UOM, on_delete=models.SET_NULL, null=True, blank=True)
    notes              = models.CharField(max_length=200, blank=True)

    @property
    def pending_quantity(self):
        return self.ordered_quantity - self.received_quantity

    @property
    def material_name(self):
        if self.yarn: return self.yarn.item_name
        if self.item: return self.item.item_name
        return ''


# ── Goods Receipt Note (GRN) ─────────────────────────────────
class GRN(models.Model):
    STATUS = [('draft', 'Draft'), ('confirmed', 'Confirmed')]
    company                = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    grn_number             = models.CharField(max_length=50, unique=True)
    purchase_order         = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name='grns')
    receipt_date           = models.DateField()
    vendor_invoice_number  = models.CharField(max_length=100, blank=True)
    status                 = models.CharField(max_length=20, choices=STATUS, default='draft')
    notes                  = models.TextField(blank=True)
    created_by             = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at             = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.grn_number
    class Meta: ordering = ['-created_at']


class GRNLine(models.Model):
    grn               = models.ForeignKey(GRN, on_delete=models.CASCADE, related_name='lines')
    po_line           = models.ForeignKey(PurchaseOrderLine, on_delete=models.PROTECT)
    received_quantity = models.DecimalField(max_digits=10, decimal_places=3)
    lot_created       = models.BooleanField(default=False)  # track if lots created for this line


# ── LOT (Critical — traceability starts here) ─────────────────
class Lot(models.Model):
    STATUS = [
        ('available', 'Available'),
        ('in_use',    'In Use / Issued to Production'),
        ('consumed',  'Fully Consumed'),
        ('rejected',  'Rejected'),
    ]
    company       = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    lot_number    = models.CharField(max_length=50, unique=True)
    grn           = models.ForeignKey(GRN, on_delete=models.SET_NULL, null=True, blank=True, related_name='lots')
    grn_line      = models.ForeignKey(GRNLine, on_delete=models.SET_NULL, null=True, blank=True)

    # What material is in this lot
    material_type = models.CharField(max_length=10, choices=[('yarn', 'Yarn'), ('item', 'Item')], default='yarn')
    yarn          = models.ForeignKey(YarnMaster, on_delete=models.SET_NULL, null=True, blank=True)
    item          = models.ForeignKey(ItemMaster, on_delete=models.SET_NULL, null=True, blank=True)

    # Lot details
    color_code    = models.CharField(max_length=50, blank=True)
    color_name    = models.CharField(max_length=100, blank=True)
    quantity      = models.DecimalField(max_digits=10, decimal_places=3)   # original qty
    balance_qty   = models.DecimalField(max_digits=10, decimal_places=3)   # remaining qty
    uom           = models.ForeignKey(UOM, on_delete=models.SET_NULL, null=True, blank=True)
    location      = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    status        = models.CharField(max_length=20, choices=STATUS, default='available')

    # Traceability
    received_date = models.DateField(null=True, blank=True)
    vendor_lot_ref = models.CharField(max_length=100, blank=True)  # vendor's own lot reference
    created_by    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.lot_number

    @property
    def material_name(self):
        if self.yarn: return f"{self.yarn.item_name} ({self.yarn.color_name or self.color_name})"
        if self.item: return self.item.item_name
        return ''

    class Meta: ordering = ['-created_at']


# ── Purchase Invoice ─────────────────────────────────────────
class PurchaseInvoice(models.Model):
    STATUS = [('draft', 'Draft'), ('posted', 'Posted'), ('paid', 'Paid')]
    company        = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    invoice_number = models.CharField(max_length=50, unique=True)
    grn            = models.ForeignKey(GRN, on_delete=models.PROTECT, related_name='invoices')
    vendor         = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    invoice_date   = models.DateField()
    due_date       = models.DateField(null=True, blank=True)
    total_amount   = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_amount     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status         = models.CharField(max_length=20, choices=STATUS, default='draft')
    notes          = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.invoice_number
    class Meta: ordering = ['-created_at']
