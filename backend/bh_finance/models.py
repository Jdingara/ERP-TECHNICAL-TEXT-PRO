# ============================================================
# FILE: bh_finance/models.py
# PURPOSE: Sales Invoices, Purchase Invoices, Payments
#          for the Buying House ERP
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from master_data.models import Company
from masters.models import Customer, Vendor
from order_management.models import CustomerOrder, FactoryOrder
from shipment.models import Shipment


def _next_number(cls, company, prefix, field):
    year = timezone.now().year
    pfx = f'{prefix}-{year}-'
    last = cls.objects.filter(company=company, **{f'{field}__startswith': pfx}).order_by(field).last()
    seq = (int(getattr(last, field).split('-')[-1]) + 1) if last else 1
    return f'{pfx}{seq:04d}'


class SalesInvoice(models.Model):
    STATUS = [
        ('draft',           'Draft'),
        ('sent',            'Sent to Customer'),
        ('partially_paid',  'Partially Paid'),
        ('paid',            'Paid'),
        ('overdue',         'Overdue'),
        ('cancelled',       'Cancelled'),
    ]
    company          = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='sales_invoices')
    invoice_number   = models.CharField(max_length=30, unique=True, editable=False)
    customer_order   = models.ForeignKey(CustomerOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_invoices')
    shipment         = models.ForeignKey(Shipment, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_invoices')
    customer         = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales_invoices')
    invoice_date     = models.DateField()
    due_date         = models.DateField(null=True, blank=True)
    currency         = models.CharField(max_length=10, default='USD')
    subtotal         = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_amount       = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_amount     = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount_paid      = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status           = models.CharField(max_length=20, choices=STATUS, default='draft')
    bank_details     = models.TextField(blank=True)
    notes            = models.TextField(blank=True)
    created_by       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='bh_sales_invoices')
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-invoice_date', '-created_at']

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = _next_number(SalesInvoice, self.company, 'SI', 'invoice_number')
        # Recalculate total
        self.total_amount = self.subtotal + self.tax_amount
        # Auto-update status based on payment (promote draft → partially_paid/paid when payment applied)
        if self.status not in ('cancelled',):
            if float(self.amount_paid) >= float(self.total_amount) > 0:
                self.status = 'paid'
            elif float(self.amount_paid) > 0:
                self.status = 'partially_paid'
        super().save(*args, **kwargs)

    @property
    def balance_due(self):
        return float(self.total_amount) - float(self.amount_paid)

    def __str__(self):
        return self.invoice_number


class SalesInvoiceItem(models.Model):
    invoice     = models.ForeignKey(SalesInvoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=300)
    quantity    = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    unit_price  = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    amount      = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.amount = float(self.quantity) * float(self.unit_price)
        super().save(*args, **kwargs)
        # Push subtotal back to parent invoice
        inv = self.invoice
        inv.subtotal = sum(i.amount for i in inv.items.all())
        inv.save()

    def delete(self, *args, **kwargs):
        inv = self.invoice
        super().delete(*args, **kwargs)
        inv.subtotal = sum(i.amount for i in inv.items.all())
        inv.save()

    def __str__(self):
        return f'{self.invoice.invoice_number} — {self.description}'


class PurchaseInvoice(models.Model):
    STATUS = [
        ('draft',           'Draft'),
        ('received',        'Received'),
        ('approved',        'Approved'),
        ('partially_paid',  'Partially Paid'),
        ('paid',            'Paid'),
        ('disputed',        'Disputed'),
        ('cancelled',       'Cancelled'),
    ]
    company              = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='purchase_invoices')
    invoice_number       = models.CharField(max_length=30, unique=True, editable=False)
    factory_order        = models.ForeignKey(FactoryOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_invoices')
    vendor               = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_invoices')
    vendor_invoice_ref   = models.CharField(max_length=100, blank=True)  # vendor's own invoice number
    invoice_date         = models.DateField()
    due_date             = models.DateField(null=True, blank=True)
    currency             = models.CharField(max_length=10, default='INR')
    subtotal             = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_amount           = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_amount         = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount_paid          = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status               = models.CharField(max_length=20, choices=STATUS, default='draft')
    notes                = models.TextField(blank=True)
    created_by           = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='bh_purchase_invoices')
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-invoice_date', '-created_at']

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = _next_number(PurchaseInvoice, self.company, 'PI', 'invoice_number')
        self.total_amount = self.subtotal + self.tax_amount
        # Auto-update status (promote draft → partially_paid/paid when payment applied)
        if self.status not in ('cancelled', 'disputed'):
            if float(self.amount_paid) >= float(self.total_amount) > 0:
                self.status = 'paid'
            elif float(self.amount_paid) > 0:
                self.status = 'partially_paid'
        super().save(*args, **kwargs)

    @property
    def balance_due(self):
        return float(self.total_amount) - float(self.amount_paid)

    def __str__(self):
        return self.invoice_number


class PurchaseInvoiceItem(models.Model):
    invoice     = models.ForeignKey(PurchaseInvoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=300)
    quantity    = models.DecimalField(max_digits=12, decimal_places=2, default=1)
    unit_price  = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    amount      = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.amount = float(self.quantity) * float(self.unit_price)
        super().save(*args, **kwargs)
        # Push subtotal back to parent invoice
        inv = self.invoice
        inv.subtotal = sum(i.amount for i in inv.items.all())
        inv.save()

    def delete(self, *args, **kwargs):
        inv = self.invoice
        super().delete(*args, **kwargs)
        inv.subtotal = sum(i.amount for i in inv.items.all())
        inv.save()

    def __str__(self):
        return f'{self.invoice.invoice_number} — {self.description}'


class Payment(models.Model):
    PAYMENT_TYPE   = [('received', 'Received from Customer'), ('made', 'Made to Vendor')]
    PAYMENT_METHOD = [
        ('bank_transfer', 'Bank Transfer / TT'),
        ('lc',            'Letter of Credit (LC)'),
        ('cheque',        'Cheque'),
        ('cash',          'Cash'),
        ('other',         'Other'),
    ]
    company          = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='payments')
    payment_number   = models.CharField(max_length=30, unique=True, editable=False)
    payment_type     = models.CharField(max_length=20, choices=PAYMENT_TYPE)
    payment_date     = models.DateField()
    amount           = models.DecimalField(max_digits=14, decimal_places=2)
    currency         = models.CharField(max_length=10, default='USD')
    payment_method   = models.CharField(max_length=20, choices=PAYMENT_METHOD, default='bank_transfer')
    reference        = models.CharField(max_length=200, blank=True)   # bank ref, cheque no., LC no.
    sales_invoice    = models.ForeignKey(SalesInvoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    purchase_invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    notes            = models.TextField(blank=True)
    created_by       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='bh_payments')
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']

    def save(self, *args, **kwargs):
        if not self.payment_number:
            self.payment_number = _next_number(Payment, self.company, 'PAY', 'payment_number')
        super().save(*args, **kwargs)
        # Update invoice amount_paid
        if self.sales_invoice_id:
            inv = self.sales_invoice
            inv.amount_paid = sum(p.amount for p in inv.payments.all())
            inv.save()
        if self.purchase_invoice_id:
            inv = self.purchase_invoice
            inv.amount_paid = sum(p.amount for p in inv.payments.all())
            inv.save()

    def __str__(self):
        return self.payment_number
