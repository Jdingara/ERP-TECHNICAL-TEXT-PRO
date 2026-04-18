# ============================================================
# FILE: masters/models.py
# PURPOSE: All master data for Technical Textile ERP
#          Yarn, Product/Design, BOM, Process, Machine, Location
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Company


class UOM(models.Model):
    name       = models.CharField(max_length=50)
    short_name = models.CharField(max_length=10)
    is_active  = models.BooleanField(default=True)

    def __str__(self): return self.short_name
    class Meta: ordering = ['name']


class Location(models.Model):
    LOCATION_TYPE = [
        ('raw_material', 'Raw Material Store'),
        ('wip',          'WIP / Production Floor'),
        ('finished',     'Finished Goods Store'),
        ('dispatch',     'Dispatch Area'),
    ]
    company       = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    name          = models.CharField(max_length=100)
    code          = models.CharField(max_length=20)
    location_type = models.CharField(max_length=20, choices=LOCATION_TYPE, default='raw_material')
    is_active     = models.BooleanField(default=True)

    def __str__(self): return f"{self.name} ({self.code})"
    class Meta: ordering = ['name']


class YarnMaster(models.Model):
    YARN_TYPE = [
        ('warp', 'Warp'), ('weft', 'Weft'), ('zari', 'Zari'), ('other', 'Other'),
    ]
    company       = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    item_code     = models.CharField(max_length=50, unique=True)
    item_name     = models.CharField(max_length=200)
    yarn_type     = models.CharField(max_length=20, choices=YARN_TYPE, default='warp')
    count         = models.CharField(max_length=50, blank=True)
    composition   = models.CharField(max_length=100, blank=True)
    color_code    = models.CharField(max_length=50, blank=True)
    color_name    = models.CharField(max_length=100, blank=True)
    uom           = models.ForeignKey(UOM, on_delete=models.SET_NULL, null=True)
    reorder_level = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.item_code} - {self.item_name}"
    class Meta: ordering = ['item_code']


class ItemMaster(models.Model):
    ITEM_TYPE = [
        ('chemical', 'Chemical'), ('pvc', 'PVC / Polymer'),
        ('fabric', 'Fabric'), ('accessory', 'Accessory'), ('other', 'Other'),
    ]
    company       = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    item_code     = models.CharField(max_length=50, unique=True)
    item_name     = models.CharField(max_length=200)
    item_type     = models.CharField(max_length=20, choices=ITEM_TYPE)
    uom           = models.ForeignKey(UOM, on_delete=models.SET_NULL, null=True)
    reorder_level = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.item_code} - {self.item_name}"
    class Meta: ordering = ['item_code']


class Machine(models.Model):
    MACHINE_TYPE = [
        ('warping', 'Warping'), ('weaving', 'Weaving'), ('stenter', 'Stenter'),
        ('tumbler', 'Tumbler'), ('embossing', 'Embossing'),
        ('lamination', 'Lamination'), ('inspection', 'Inspection'), ('other', 'Other'),
    ]
    company          = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    machine_code     = models.CharField(max_length=50, unique=True)
    machine_name     = models.CharField(max_length=200)
    machine_type     = models.CharField(max_length=20, choices=MACHINE_TYPE)
    location         = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    capacity_per_day = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    uom              = models.ForeignKey(UOM, on_delete=models.SET_NULL, null=True, blank=True)
    is_active        = models.BooleanField(default=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.machine_code} - {self.machine_name}"
    class Meta: ordering = ['machine_code']


class Process(models.Model):
    company      = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    process_code = models.CharField(max_length=50, unique=True)
    process_name = models.CharField(max_length=200)
    sequence     = models.IntegerField(default=1)
    machine_type = models.CharField(max_length=20, blank=True)
    description  = models.TextField(blank=True)
    is_active    = models.BooleanField(default=True)

    def __str__(self): return f"{self.sequence}. {self.process_name}"
    class Meta: ordering = ['sequence']


class ProductDesign(models.Model):
    company      = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    design_code  = models.CharField(max_length=50, unique=True)
    design_name  = models.CharField(max_length=200)
    category     = models.CharField(max_length=100, blank=True)
    gsm          = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    width_cm     = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    composition  = models.CharField(max_length=200, blank=True)
    customer_ref = models.CharField(max_length=100, blank=True)
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.design_code} - {self.design_name}"
    class Meta: ordering = ['design_code']


class BOM(models.Model):
    company    = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    product    = models.OneToOneField(ProductDesign, on_delete=models.CASCADE, related_name='bom')
    version    = models.CharField(max_length=20, default='v1.0')
    is_active  = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self): return f"BOM: {self.product.design_code} ({self.version})"


class BOMLine(models.Model):
    MATERIAL_TYPE = [
        ('yarn', 'Yarn'), ('chemical', 'Chemical'), ('item', 'Other Item'),
    ]
    bom           = models.ForeignKey(BOM, on_delete=models.CASCADE, related_name='lines')
    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPE)
    yarn          = models.ForeignKey(YarnMaster, on_delete=models.SET_NULL, null=True, blank=True)
    item          = models.ForeignKey(ItemMaster, on_delete=models.SET_NULL, null=True, blank=True)
    quantity      = models.DecimalField(max_digits=10, decimal_places=3)
    uom           = models.ForeignKey(UOM, on_delete=models.SET_NULL, null=True)
    process_stage = models.ForeignKey(Process, on_delete=models.SET_NULL, null=True, blank=True)
    notes         = models.CharField(max_length=200, blank=True)


class Vendor(models.Model):
    VENDOR_TYPE = [
        ('raw_material', 'Raw Material Supplier'),
        ('job_work', 'Job Work Vendor'),
        ('both', 'Both'),
    ]
    company        = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, related_name='tt_vendors')
    vendor_code    = models.CharField(max_length=50, unique=True)
    vendor_name    = models.CharField(max_length=200)
    vendor_type    = models.CharField(max_length=20, choices=VENDOR_TYPE, default='raw_material')
    contact_person = models.CharField(max_length=100, blank=True)
    phone          = models.CharField(max_length=20, blank=True)
    email          = models.CharField(max_length=100, blank=True)
    address        = models.TextField(blank=True)
    city           = models.CharField(max_length=100, blank=True)
    state          = models.CharField(max_length=100, blank=True)
    gstin          = models.CharField(max_length=20, blank=True)
    pan_number     = models.CharField(max_length=20, blank=True)
    credit_days    = models.IntegerField(default=30)
    is_active      = models.BooleanField(default=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.vendor_code} - {self.vendor_name}"
    class Meta: ordering = ['vendor_name']


class Customer(models.Model):
    company        = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, related_name='tt_customers')
    customer_code  = models.CharField(max_length=50, unique=True)
    customer_name  = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100, blank=True)
    phone          = models.CharField(max_length=20, blank=True)
    email          = models.CharField(max_length=100, blank=True)
    address        = models.TextField(blank=True)
    city           = models.CharField(max_length=100, blank=True)
    state          = models.CharField(max_length=100, blank=True)
    gstin          = models.CharField(max_length=20, blank=True)
    credit_days    = models.IntegerField(default=30)
    credit_limit   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active      = models.BooleanField(default=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.customer_code} - {self.customer_name}"
    class Meta: ordering = ['customer_name']
