from django.db import models
from django.contrib.auth.models import User
from master_data.models import Company
from masters.models import Customer, Vendor, Brand, Category, FabricType, TestingParameter


class PDRequest(models.Model):
    STATUS = [
        ('draft',              'Draft'),
        ('open',               'Open'),
        ('vendor_assigned',    'Vendor Assigned'),
        ('sample_in_progress', 'Sample In Progress'),
        ('sample_received',    'Sample Received'),
        ('testing',            'Testing In Progress'),
        ('approved',           'Approved'),
        ('rejected',           'Rejected'),
        ('cancelled',          'Cancelled'),
    ]
    company      = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    pd_number    = models.CharField(max_length=30, unique=True, editable=False)
    title        = models.CharField(max_length=300)
    customer     = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='pd_requests')
    brand        = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True)
    category     = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    request_date = models.DateField()
    required_by  = models.DateField(null=True, blank=True)
    status       = models.CharField(max_length=30, choices=STATUS, default='draft')
    notes        = models.TextField(blank=True)
    created_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.pd_number:
            from django.utils import timezone
            year = timezone.now().year
            last = PDRequest.objects.filter(pd_number__startswith=f'PD-{year}-').order_by('pd_number').last()
            seq = (int(last.pd_number.split('-')[-1]) + 1) if last else 1
            self.pd_number = f'PD-{year}-{seq:04d}'
        super().save(*args, **kwargs)

    def __str__(self): return f"{self.pd_number} — {self.title}"
    class Meta: ordering = ['-created_at']


class PDTechnicalSpec(models.Model):
    pd_request              = models.OneToOneField(PDRequest, on_delete=models.CASCADE, related_name='tech_spec')
    fabric_type             = models.ForeignKey(FabricType, on_delete=models.SET_NULL, null=True, blank=True)
    construction            = models.CharField(max_length=200, blank=True)
    size_dimension_variants = models.TextField(blank=True)
    design_file             = models.FileField(upload_to='pd/design_files/', null=True, blank=True)
    packaging_specs         = models.TextField(blank=True)
    additional_notes        = models.TextField(blank=True)
    updated_at              = models.DateTimeField(auto_now=True)

    def __str__(self): return f"Spec for {self.pd_request.pd_number}"


class PDSpecTestingParam(models.Model):
    spec                = models.ForeignKey(PDTechnicalSpec, on_delete=models.CASCADE, related_name='testing_params')
    parameter           = models.ForeignKey(TestingParameter, on_delete=models.SET_NULL, null=True, blank=True)
    acceptance_override = models.CharField(max_length=300, blank=True)

    def __str__(self):
        return self.parameter.parameter_name if self.parameter else '?'


class PDVendorAssignment(models.Model):
    STATUS = [
        ('pending',  'Pending Response'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    pd_request       = models.ForeignKey(PDRequest, on_delete=models.CASCADE, related_name='vendor_assignments')
    vendor           = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True)
    assigned_date    = models.DateField(auto_now_add=True)
    status           = models.CharField(max_length=20, choices=STATUS, default='pending')
    rejection_reason = models.TextField(blank=True)
    sample_dev_cost  = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency         = models.CharField(max_length=10, default='INR')
    ta_notes         = models.TextField(blank=True)
    accepted_date    = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ('pd_request', 'vendor')

    def __str__(self):
        return f"{self.vendor.vendor_name if self.vendor else '?'} — {self.pd_request.pd_number}"


class PDSampleShipment(models.Model):
    pd_request        = models.ForeignKey(PDRequest, on_delete=models.CASCADE, related_name='sample_shipments')
    vendor_assignment = models.ForeignKey(PDVendorAssignment, on_delete=models.SET_NULL, null=True, blank=True)
    shipment_date     = models.DateField()
    lr_number         = models.CharField(max_length=100, blank=True)
    tracking_number   = models.CharField(max_length=100, blank=True)
    courier_name      = models.CharField(max_length=100, blank=True)
    expected_arrival  = models.DateField(null=True, blank=True)
    received_date     = models.DateField(null=True, blank=True)
    notes             = models.TextField(blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"Shipment — {self.pd_request.pd_number}"


class PDSampleInvoice(models.Model):
    pd_request        = models.ForeignKey(PDRequest, on_delete=models.CASCADE, related_name='sample_invoices')
    vendor_assignment = models.ForeignKey(PDVendorAssignment, on_delete=models.SET_NULL, null=True, blank=True)
    invoice_number    = models.CharField(max_length=100)
    invoice_date      = models.DateField()
    amount            = models.DecimalField(max_digits=12, decimal_places=2)
    currency          = models.CharField(max_length=10, default='INR')
    invoice_file      = models.FileField(upload_to='pd/invoices/', null=True, blank=True)
    notes             = models.TextField(blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"Invoice {self.invoice_number} — {self.pd_request.pd_number}"
