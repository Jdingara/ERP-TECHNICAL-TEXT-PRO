# ============================================================
# FILE: shipment/models.py
# PURPOSE: Pre-Shipment Inspection, Shipment, and Costing Sheet
#          for the Buying House ERP
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from master_data.models import Company
from order_management.models import CustomerOrder, FactoryOrder


def _next_psi_number(company):
    year = timezone.now().year
    prefix = f'PSI-{year}-'
    last = PreShipmentInspection.objects.filter(
        company=company, psi_number__startswith=prefix
    ).order_by('psi_number').last()
    seq = (int(last.psi_number.split('-')[-1]) + 1) if last else 1
    return f'{prefix}{seq:04d}'


def _next_shipment_number(company):
    year = timezone.now().year
    prefix = f'SHP-{year}-'
    last = Shipment.objects.filter(
        company=company, shipment_number__startswith=prefix
    ).order_by('shipment_number').last()
    seq = (int(last.shipment_number.split('-')[-1]) + 1) if last else 1
    return f'{prefix}{seq:04d}'


class PreShipmentInspection(models.Model):
    PSI_RESULT = [
        ('pending',      'Pending'),
        ('pass',         'Pass'),
        ('pass_remarks', 'Pass with Remarks'),
        ('fail',         'Fail'),
        ('re_inspect',   'Re-Inspection Required'),
    ]
    company           = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='psi_list')
    psi_number        = models.CharField(max_length=30, unique=True, editable=False)
    customer_order    = models.ForeignKey(CustomerOrder, on_delete=models.CASCADE, related_name='psi_list')
    factory_order     = models.ForeignKey(FactoryOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='psi_list')
    inspection_date   = models.DateField()
    inspector_name    = models.CharField(max_length=200, blank=True)
    inspection_agency = models.CharField(max_length=200, blank=True)
    result            = models.CharField(max_length=20, choices=PSI_RESULT, default='pending')
    quantity_inspected= models.IntegerField(default=0)
    quantity_passed   = models.IntegerField(default=0)
    aql_level         = models.CharField(max_length=20, blank=True, default='2.5')
    critical_defects  = models.IntegerField(default=0)
    major_defects     = models.IntegerField(default=0)
    minor_defects     = models.IntegerField(default=0)
    remarks           = models.TextField(blank=True)
    report_file_url   = models.CharField(max_length=500, blank=True)
    created_by        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-inspection_date', '-created_at']

    def save(self, *args, **kwargs):
        if not self.psi_number:
            self.psi_number = _next_psi_number(self.company)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.psi_number


class PSIChecklistItem(models.Model):
    RESULT_CHOICES = [('pass', 'Pass'), ('fail', 'Fail'), ('na', 'N/A')]
    psi         = models.ForeignKey(PreShipmentInspection, on_delete=models.CASCADE, related_name='checklist_items')
    section     = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=300)
    result      = models.CharField(max_length=10, choices=RESULT_CHOICES, default='na')
    remarks     = models.CharField(max_length=300, blank=True)
    sort_order  = models.IntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return f'{self.psi.psi_number} — {self.description}'


class Shipment(models.Model):
    MODE_CHOICES = [
        ('sea',     'Sea Freight'),
        ('air',     'Air Freight'),
        ('land',    'Land/Road'),
        ('courier', 'Courier'),
    ]
    STATUS_CHOICES = [
        ('draft',      'Draft'),
        ('booked',     'Booking Confirmed'),
        ('loaded',     'Loaded / Stuffed'),
        ('in_transit', 'In Transit'),
        ('arrived',    'Arrived at Port'),
        ('customs',    'Customs Clearance'),
        ('delivered',  'Delivered'),
        ('cancelled',  'Cancelled'),
    ]
    company           = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='shipments')
    shipment_number   = models.CharField(max_length=30, unique=True, editable=False)
    customer_order    = models.ForeignKey(CustomerOrder, on_delete=models.CASCADE, related_name='shipments')
    factory_order     = models.ForeignKey(FactoryOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    psi               = models.ForeignKey(PreShipmentInspection, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    mode              = models.CharField(max_length=20, choices=MODE_CHOICES, default='sea')
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    shipper           = models.CharField(max_length=200, blank=True)
    consignee         = models.CharField(max_length=200, blank=True)
    forwarder         = models.CharField(max_length=200, blank=True)
    port_of_loading   = models.CharField(max_length=100, blank=True)
    port_of_discharge = models.CharField(max_length=100, blank=True)
    etd               = models.DateField(null=True, blank=True)
    eta               = models.DateField(null=True, blank=True)
    actual_departure  = models.DateField(null=True, blank=True)
    actual_arrival    = models.DateField(null=True, blank=True)
    bl_number         = models.CharField(max_length=100, blank=True)
    container_number  = models.CharField(max_length=100, blank=True)
    total_cartons     = models.IntegerField(default=0)
    total_qty         = models.IntegerField(default=0)
    gross_weight_kg   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cbm               = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    invoice_value     = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency          = models.CharField(max_length=10, default='USD')
    notes             = models.TextField(blank=True)
    created_by        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.shipment_number:
            self.shipment_number = _next_shipment_number(self.company)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.shipment_number


class CostingSheet(models.Model):
    """Order-level costing / margin calculation for a Customer Order."""
    customer_order    = models.OneToOneField(CustomerOrder, on_delete=models.CASCADE, related_name='costing_sheet')
    currency          = models.CharField(max_length=10, default='USD')

    # Revenue
    fob_price_per_pc  = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    total_quantity    = models.IntegerField(default=0)

    # Costs per piece
    fabric_cost       = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    trim_cost         = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    embroidery_print  = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    washing_finishing = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    cm_cost           = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    testing_cost      = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    inspection_cost   = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    freight_cost      = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    other_cost        = models.DecimalField(max_digits=10, decimal_places=4, default=0)

    # Buying House Commission
    commission_pct    = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    notes             = models.TextField(blank=True)
    updated_at        = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Costing — {self.customer_order.co_number}'
