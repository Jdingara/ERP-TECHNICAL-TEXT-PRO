# ============================================================
# FILE: sales/models.py
# PURPOSE: Database tables for sales module.
#          Sales Order → Invoice → Payment
#          Confirming delivery reduces stock automatically.
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Item, Customer, Warehouse, Company


# ============================================================
# CUSTOMER INQUIRY
# When a customer asks about a product with specific requirements.
# This is the START of the order journey in technical textile.
# ============================================================
class CustomerInquiry(models.Model):

    STATUS_CHOICES = [
        ('new',           'New'),
        ('in_discussion', 'In Discussion'),
        ('sampling',      'Sampling'),
        ('quoted',        'Quoted'),
        ('won',           'Won'),
        ('lost',          'Lost'),
    ]
    END_USE_CHOICES = [
        ('geotextile',  'Geotextile'),
        ('agrotextile', 'Agrotextile'),
        ('filtration',  'Filtration'),
        ('automotive',  'Automotive'),
        ('medical',     'Medical'),
        ('protective',  'Protective / FR'),
        ('industrial',  'Industrial'),
        ('other',       'Other'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    inquiry_number      = models.CharField(max_length=50, unique=True)  # INQ-YYYYMMDD-001
    customer            = models.ForeignKey(Customer, on_delete=models.PROTECT)
    received_date       = models.DateField()
    product_description = models.CharField(max_length=500)
    end_use             = models.CharField(max_length=50, choices=END_USE_CHOICES, default='other')

    # Technical spec requirements from customer
    gsm_required        = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    width_cm            = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    tensile_requirement = models.CharField(max_length=200, blank=True)
    coating_required    = models.BooleanField(default=False)
    coating_type        = models.CharField(max_length=200, blank=True)
    color               = models.CharField(max_length=100, blank=True)

    # Commercial
    quantity_required   = models.DecimalField(max_digits=12, decimal_places=2)
    unit                = models.CharField(max_length=20, default='meters')
    target_price        = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    required_by_date    = models.DateField(null=True, blank=True)

    # Tracking
    status              = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    assigned_to         = models.CharField(max_length=100, blank=True)
    notes               = models.TextField(blank=True)
    created_by          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sales_inquiry'
        ordering = ['-created_at']

    def __str__(self):
        return f"INQ: {self.inquiry_number} | {self.customer.customer_name}"


# ============================================================
# QUOTATION
# Formal price + spec offer sent to customer after inquiry.
# ============================================================
class Quotation(models.Model):

    STATUS_CHOICES = [
        ('draft',    'Draft'),
        ('sent',     'Sent to Customer'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired',  'Expired'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    quotation_number    = models.CharField(max_length=50, unique=True)  # QT-YYYYMMDD-001
    inquiry             = models.ForeignKey(CustomerInquiry, on_delete=models.SET_NULL, null=True, blank=True, related_name='quotations')
    customer            = models.ForeignKey(Customer, on_delete=models.PROTECT)
    date                = models.DateField()
    valid_until         = models.DateField()

    # Product being quoted
    product_description = models.CharField(max_length=500)
    gsm                 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    width_cm            = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    quantity            = models.DecimalField(max_digits=12, decimal_places=2)
    unit                = models.CharField(max_length=20, default='meters')
    unit_price          = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount        = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    lead_time_days      = models.IntegerField(default=30)

    # Terms
    spec_notes          = models.TextField(blank=True)
    payment_terms       = models.CharField(max_length=200, blank=True)
    delivery_terms      = models.CharField(max_length=200, blank=True)

    status              = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sales_quotation'
        ordering = ['-created_at']

    def __str__(self):
        return f"QT: {self.quotation_number} | {self.customer.customer_name}"


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

    company         = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
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

    company         = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
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
