# ============================================================
# FILE: dispatch/models.py
# PURPOSE: Dispatch Entry, Packing List, Challan, Invoice, Barcode
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Company
from masters.models import Customer
from planning.models import SalesOrder, ProductionOrder
from production_exec.models import Batch


class DispatchEntry(models.Model):
    STATUS = [('draft', 'Draft'), ('confirmed', 'Dispatched'), ('cancelled', 'Cancelled')]

    company         = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    dispatch_number = models.CharField(max_length=50, unique=True)
    sales_order     = models.ForeignKey(SalesOrder, on_delete=models.SET_NULL, null=True, blank=True)
    customer        = models.ForeignKey(Customer, on_delete=models.PROTECT)
    dispatch_date   = models.DateField()
    vehicle_number  = models.CharField(max_length=50, blank=True)
    driver_name     = models.CharField(max_length=100, blank=True)
    lr_number       = models.CharField(max_length=100, blank=True)  # Lorry Receipt
    transporter     = models.CharField(max_length=200, blank=True)
    status          = models.CharField(max_length=20, choices=STATUS, default='draft')
    notes           = models.TextField(blank=True)
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.dispatch_number
    class Meta: ordering = ['-dispatch_date', '-created_at']


class DispatchLine(models.Model):
    dispatch = models.ForeignKey(DispatchEntry, on_delete=models.CASCADE, related_name='lines')
    batch    = models.ForeignKey(Batch, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    rolls    = models.IntegerField(default=1)  # number of rolls/pieces
    notes    = models.CharField(max_length=200, blank=True)


class SalesInvoice(models.Model):
    STATUS = [('draft', 'Draft'), ('sent', 'Sent'), ('paid', 'Paid'), ('overdue', 'Overdue')]

    company        = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    invoice_number = models.CharField(max_length=50, unique=True)
    dispatch       = models.OneToOneField(DispatchEntry, on_delete=models.PROTECT, related_name='invoice', null=True, blank=True)
    customer       = models.ForeignKey(Customer, on_delete=models.PROTECT)
    invoice_date   = models.DateField()
    due_date       = models.DateField(null=True, blank=True)
    subtotal       = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_amount     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount   = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    paid_amount    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status         = models.CharField(max_length=20, choices=STATUS, default='draft')
    notes          = models.TextField(blank=True)
    created_by     = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    @property
    def balance_due(self): return self.total_amount - self.paid_amount

    def __str__(self): return self.invoice_number
    class Meta: ordering = ['-invoice_date']


class PackingLabel(models.Model):
    dispatch_line  = models.ForeignKey(DispatchLine, on_delete=models.CASCADE, related_name='labels')
    label_number   = models.CharField(max_length=50, unique=True)
    batch_number   = models.CharField(max_length=50)
    product_code   = models.CharField(max_length=50)
    quantity       = models.DecimalField(max_digits=10, decimal_places=3)
    roll_number    = models.IntegerField(default=1)
    barcode_data   = models.CharField(max_length=200)  # data encoded in barcode
    printed        = models.BooleanField(default=False)
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.label_number
    class Meta: ordering = ['-created_at']
