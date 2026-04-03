# ============================================================
# FILE: sales/models.py
# PURPOSE: Database tables for sales module.
#          Sales Order → Invoice → Payment
#          Confirming delivery reduces stock automatically.
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Item, Customer, Warehouse


# ============================================================
# SALES ORDER
# Created when a customer places an order.
# ============================================================
class SalesOrder(models.Model):

    STATUS_CHOICES = [
        ('draft',       'Draft'),
        ('confirmed',   'Confirmed'),
        ('partial',     'Partial Delivery'),
        ('delivered',   'Fully Delivered'),
        ('cancelled',   'Cancelled'),
    ]

    so_number       = models.CharField(max_length=50, unique=True)
    customer        = models.ForeignKey(Customer, on_delete=models.PROTECT)
    warehouse       = models.ForeignKey(Warehouse, on_delete=models.PROTECT)
    order_date      = models.DateField()
    delivery_date   = models.DateField(null=True, blank=True)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes           = models.TextField(blank=True)
    total_amount    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sales_order'
        ordering = ['-created_at']

    def __str__(self):
        return f"SO: {self.so_number} | {self.customer.customer_name}"


# ============================================================
# SALES ORDER LINE
# Each item in a sales order.
# ============================================================
class SalesOrderLine(models.Model):
    sales_order         = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name='lines')
    item                = models.ForeignKey(Item, on_delete=models.PROTECT)
    ordered_quantity    = models.DecimalField(max_digits=14, decimal_places=3)
    delivered_quantity  = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    unit_price          = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_price         = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes               = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'sales_order_line'


# ============================================================
# INVOICE
# Generated from a sales order for billing the customer.
# ============================================================
class Invoice(models.Model):

    STATUS_CHOICES = [
        ('draft',   'Draft'),
        ('sent',    'Sent to Customer'),
        ('paid',    'Paid'),
        ('overdue', 'Overdue'),
    ]

    invoice_number  = models.CharField(max_length=50, unique=True)
    sales_order     = models.ForeignKey(SalesOrder, on_delete=models.PROTECT)
    customer        = models.ForeignKey(Customer, on_delete=models.PROTECT)
    invoice_date    = models.DateField()
    due_date        = models.DateField()
    subtotal        = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_amount      = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_amount    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    paid_amount     = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes           = models.TextField(blank=True)
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sales_invoice'
        ordering = ['-created_at']

    def __str__(self):
        return f"INV: {self.invoice_number} | {self.customer.customer_name}"

    @property
    def balance_due(self):
        return self.total_amount - self.paid_amount
