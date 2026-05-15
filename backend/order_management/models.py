from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from master_data.models import Company
from masters.models import Customer, Vendor, Brand, Category
from product_development.models import PDRequest


def _next_number(model_class, prefix, field='co_number'):
    year = timezone.now().year
    last = model_class.objects.filter(**{f'{field}__startswith': f'{prefix}-{year}-'}).order_by(field).last()
    seq = (int(getattr(last, field).split('-')[-1]) + 1) if last else 1
    return f'{prefix}-{year}-{seq:04d}'


# ── Buyer Inquiry + Vendor Quotation ─────────────────────────

class BuyerInquiry(models.Model):
    STATUS = [
        ('open',         'Open'),
        ('costing_done', 'Costing Done'),
        ('rfq_sent',     'RFQ Sent'),
        ('quoted',       'Quoted to Buyer'),
        ('confirmed',    'Converted to Order'),
        ('dropped',      'Dropped'),
    ]
    company           = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    inquiry_number    = models.CharField(max_length=30, unique=True, editable=False)
    customer          = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='inquiries')
    brand             = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='inquiries')
    category          = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='inquiries')
    inquiry_date      = models.DateField()
    required_delivery = models.DateField(null=True, blank=True)
    destination       = models.CharField(max_length=200, blank=True)
    target_fob_price  = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    currency          = models.CharField(max_length=10, default='USD')
    description       = models.TextField(blank=True)
    status            = models.CharField(max_length=20, choices=STATUS, default='open')
    notes             = models.TextField(blank=True)
    customer_order    = models.ForeignKey('CustomerOrder', on_delete=models.SET_NULL, null=True, blank=True, related_name='source_inquiry')
    created_by        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='inquiries')
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.inquiry_number:
            self.inquiry_number = _next_number(BuyerInquiry, 'INQ', 'inquiry_number')
        super().save(*args, **kwargs)

    def total_qty(self):
        return sum(i.quantity for i in self.items.all())

    def __str__(self): return self.inquiry_number
    class Meta: ordering = ['-created_at']


class InquiryItem(models.Model):
    inquiry      = models.ForeignKey(BuyerInquiry, on_delete=models.CASCADE, related_name='items')
    style_ref    = models.CharField(max_length=100, blank=True)
    description  = models.CharField(max_length=300)
    color        = models.CharField(max_length=100, blank=True)
    size_range   = models.CharField(max_length=100, blank=True)
    quantity     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    target_price = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)

    def __str__(self): return f"{self.inquiry.inquiry_number} — {self.description}"


class InquiryCostSheet(models.Model):
    inquiry       = models.OneToOneField(BuyerInquiry, on_delete=models.CASCADE, related_name='cost_sheet')
    fabric_cost   = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    trims_cost    = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    cm_cost       = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    washing_cost  = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    testing_cost  = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    freight_cost  = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    overhead_pct  = models.DecimalField(max_digits=5,  decimal_places=2, default=0)
    margin_pct    = models.DecimalField(max_digits=5,  decimal_places=2, default=0)
    currency      = models.CharField(max_length=10, default='USD')
    selling_price = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    notes         = models.TextField(blank=True)
    updated_at    = models.DateTimeField(auto_now=True)

    @property
    def base_cost(self):
        return sum([float(self.fabric_cost), float(self.trims_cost), float(self.cm_cost),
                    float(self.washing_cost), float(self.testing_cost), float(self.freight_cost)])

    @property
    def total_cost(self):
        base     = self.base_cost
        overhead = base * float(self.overhead_pct) / 100
        subtotal = base + overhead
        margin   = subtotal * float(self.margin_pct) / 100
        return round(subtotal + margin, 4)

    def __str__(self): return f"Cost Sheet — {self.inquiry.inquiry_number}"


class VendorQuotation(models.Model):
    STATUS = [
        ('sent',     'RFQ Sent'),
        ('received', 'Quote Received'),
        ('selected', 'Selected'),
        ('rejected', 'Rejected'),
    ]
    inquiry        = models.ForeignKey(BuyerInquiry, on_delete=models.CASCADE, related_name='quotations')
    vendor         = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, related_name='quotations')
    rfq_date       = models.DateField()
    response_date  = models.DateField(null=True, blank=True)
    lead_time_days = models.IntegerField(null=True, blank=True)
    currency       = models.CharField(max_length=10, default='INR')
    unit_quoted    = models.DecimalField(max_digits=12, decimal_places=4, default=0)
    total_quoted   = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status         = models.CharField(max_length=20, choices=STATUS, default='sent')
    notes          = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta: ordering = ['unit_quoted']

    def __str__(self):
        return f"{self.inquiry.inquiry_number} — {self.vendor.vendor_name if self.vendor else '?'}"


# ─────────────────────────────────────────────────────────────

class CustomerOrder(models.Model):
    STATUS = [
        ('draft',       'Draft'),
        ('confirmed',   'Confirmed'),
        ('in_production','In Production'),
        ('inspected',   'Inspected'),
        ('shipped',     'Shipped'),
        ('delivered',   'Delivered'),
        ('cancelled',   'Cancelled'),
    ]
    company      = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    co_number    = models.CharField(max_length=30, unique=True, editable=False)
    customer     = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='customer_orders')
    brand        = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True)
    category     = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    pd_request   = models.ForeignKey(PDRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name='customer_orders')
    customer_po_ref = models.CharField(max_length=100, blank=True)
    order_date   = models.DateField()
    ship_by_date = models.DateField(null=True, blank=True)
    ex_factory_date = models.DateField(null=True, blank=True)
    status       = models.CharField(max_length=20, choices=STATUS, default='draft')
    currency     = models.CharField(max_length=10, default='USD')
    notes        = models.TextField(blank=True)
    created_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.co_number:
            self.co_number = _next_number(CustomerOrder, 'CO')
        super().save(*args, **kwargs)

    def total_qty(self):
        return sum(i.quantity for i in self.items.all())

    def total_value(self):
        return sum(i.quantity * (i.unit_price or 0) for i in self.items.all())

    def __str__(self): return f"{self.co_number}"
    class Meta: ordering = ['-created_at']


class CustomerOrderItem(models.Model):
    customer_order = models.ForeignKey(CustomerOrder, on_delete=models.CASCADE, related_name='items')
    style_ref      = models.CharField(max_length=100, blank=True)
    description    = models.CharField(max_length=300)
    color          = models.CharField(max_length=100, blank=True)
    size           = models.CharField(max_length=100, blank=True)
    quantity       = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price     = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)

    def line_total(self):
        return self.quantity * (self.unit_price or 0)

    def __str__(self): return f"{self.customer_order.co_number} — {self.description}"


class FactoryOrder(models.Model):
    STATUS = [
        ('draft',         'Draft'),
        ('sent',          'Sent to Factory'),
        ('confirmed',     'Factory Confirmed'),
        ('cutting',       'Cutting'),
        ('sewing',        'Sewing'),
        ('finishing',     'Finishing'),
        ('qc_passed',     'QC Passed'),
        ('ready_to_ship', 'Ready to Ship'),
        ('shipped',       'Shipped'),
        ('cancelled',     'Cancelled'),
    ]
    company         = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    fo_number       = models.CharField(max_length=30, unique=True, editable=False)
    customer_order  = models.ForeignKey(CustomerOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='factory_orders')
    vendor          = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='factory_orders')
    order_date      = models.DateField()
    ex_factory_date = models.DateField(null=True, blank=True)
    status          = models.CharField(max_length=20, choices=STATUS, default='draft')
    currency        = models.CharField(max_length=10, default='INR')
    notes           = models.TextField(blank=True)
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.fo_number:
            self.fo_number = _next_number(FactoryOrder, 'FO', 'fo_number')
        super().save(*args, **kwargs)

    def total_qty(self):
        return sum(i.quantity for i in self.items.all())

    def total_cost(self):
        return sum(i.quantity * (i.unit_cost or 0) for i in self.items.all())

    def __str__(self): return f"{self.fo_number}"
    class Meta: ordering = ['-created_at']


class FactoryOrderItem(models.Model):
    factory_order = models.ForeignKey(FactoryOrder, on_delete=models.CASCADE, related_name='items')
    co_item       = models.ForeignKey(CustomerOrderItem, on_delete=models.SET_NULL, null=True, blank=True)
    style_ref     = models.CharField(max_length=100, blank=True)
    description   = models.CharField(max_length=300)
    color         = models.CharField(max_length=100, blank=True)
    size          = models.CharField(max_length=100, blank=True)
    quantity      = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost     = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)

    def line_total(self):
        return self.quantity * (self.unit_cost or 0)


class TAMilestone(models.Model):
    STATUS = [
        ('pending',    'Pending'),
        ('in_progress','In Progress'),
        ('completed',  'Completed'),
        ('delayed',    'Delayed'),
    ]
    customer_order = models.ForeignKey(CustomerOrder, on_delete=models.CASCADE, related_name='ta_milestones', null=True, blank=True)
    factory_order  = models.ForeignKey(FactoryOrder, on_delete=models.CASCADE, related_name='ta_milestones', null=True, blank=True)
    milestone_name = models.CharField(max_length=200)
    planned_date   = models.DateField()
    actual_date    = models.DateField(null=True, blank=True)
    status         = models.CharField(max_length=20, choices=STATUS, default='pending')
    responsible    = models.CharField(max_length=100, blank=True)
    notes          = models.TextField(blank=True)

    class Meta: ordering = ['planned_date']

    def __str__(self): return f"{self.milestone_name} ({self.planned_date})"
