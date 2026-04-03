# ============================================================
# FILE: master_data/models.py
# PURPOSE: Database table definitions for all master data.
#          Master data = the basic reference data that all
#          other modules use (items, suppliers, customers, etc.)
# ============================================================

from django.db import models


# ============================================================
# UNIT OF MEASURE
# Examples: kg, meters, rolls, pieces, liters
# ============================================================
class UnitOfMeasure(models.Model):
    name        = models.CharField(max_length=50, unique=True)   # Example: Kilogram
    short_name  = models.CharField(max_length=10, unique=True)   # Example: kg
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'master_unit_of_measure'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.short_name})"


# ============================================================
# ITEM CATEGORY
# Examples: Raw Material, Finished Goods, Spare Parts
# ============================================================
class ItemCategory(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'master_item_category'
        ordering = ['name']

    def __str__(self):
        return self.name


# ============================================================
# ITEM (PRODUCT)
# Every raw material, finished product, or spare part
# used in the textile factory is stored here.
# ============================================================
class Item(models.Model):

    # Item type choices
    ITEM_TYPE_CHOICES = [
        ('raw_material',    'Raw Material'),
        ('finished_goods',  'Finished Goods'),
        ('semi_finished',   'Semi Finished'),
        ('spare_parts',     'Spare Parts'),
        ('consumable',      'Consumable'),
        ('packing',         'Packing Material'),
    ]

    # Basic info
    item_code       = models.CharField(max_length=50, unique=True)   # Unique code like RM-001
    item_name       = models.CharField(max_length=200)
    item_type       = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    category        = models.ForeignKey(ItemCategory, on_delete=models.SET_NULL, null=True, blank=True)
    unit_of_measure = models.ForeignKey(UnitOfMeasure, on_delete=models.SET_NULL, null=True)
    description     = models.TextField(blank=True)

    # Textile specific fields
    hsn_code        = models.CharField(max_length=20, blank=True)    # HSN code for GST
    yarn_count      = models.CharField(max_length=50, blank=True)    # Example: 30s Ne, 40s Ne
    composition     = models.CharField(max_length=200, blank=True)   # Example: 100% Cotton, 60/40 PC

    # Stock settings
    minimum_stock   = models.DecimalField(max_digits=12, decimal_places=3, default=0)  # Reorder level
    standard_price  = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    is_active       = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'master_item'
        ordering = ['item_code']

    def __str__(self):
        return f"{self.item_code} - {self.item_name}"


# ============================================================
# WAREHOUSE
# Physical locations where stock is stored.
# A factory can have multiple warehouses.
# ============================================================
class Warehouse(models.Model):
    name        = models.CharField(max_length=100)
    code        = models.CharField(max_length=20, unique=True)
    address     = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'master_warehouse'
        ordering = ['name']

    def __str__(self):
        return f"{self.code} - {self.name}"


# ============================================================
# SUPPLIER
# Companies or people from whom you buy raw materials.
# ============================================================
class Supplier(models.Model):

    SUPPLIER_TYPE_CHOICES = [
        ('yarn_supplier',       'Yarn Supplier'),
        ('chemical_supplier',   'Chemical Supplier'),
        ('machine_supplier',    'Machine Supplier'),
        ('spare_parts_supplier','Spare Parts Supplier'),
        ('other',               'Other'),
    ]

    # Basic info
    supplier_code   = models.CharField(max_length=50, unique=True)
    supplier_name   = models.CharField(max_length=200)
    supplier_type   = models.CharField(max_length=30, choices=SUPPLIER_TYPE_CHOICES, default='other')

    # Contact info
    contact_person  = models.CharField(max_length=100, blank=True)
    phone           = models.CharField(max_length=20, blank=True)
    email           = models.EmailField(blank=True)
    address         = models.TextField(blank=True)
    city            = models.CharField(max_length=100, blank=True)
    state           = models.CharField(max_length=100, blank=True)
    country         = models.CharField(max_length=100, default='India')
    pincode         = models.CharField(max_length=10, blank=True)

    # Tax info
    gstin           = models.CharField(max_length=20, blank=True)   # GST number
    pan_number      = models.CharField(max_length=20, blank=True)

    # Payment terms
    payment_days    = models.IntegerField(default=30)   # Credit days

    is_active       = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'master_supplier'
        ordering = ['supplier_name']

    def __str__(self):
        return f"{self.supplier_code} - {self.supplier_name}"


# ============================================================
# CUSTOMER
# Companies or people to whom you sell products.
# ============================================================
class Customer(models.Model):

    CUSTOMER_TYPE_CHOICES = [
        ('domestic',    'Domestic'),
        ('export',      'Export'),
        ('both',        'Both Domestic & Export'),
    ]

    # Basic info
    customer_code   = models.CharField(max_length=50, unique=True)
    customer_name   = models.CharField(max_length=200)
    customer_type   = models.CharField(max_length=20, choices=CUSTOMER_TYPE_CHOICES, default='domestic')

    # Contact info
    contact_person  = models.CharField(max_length=100, blank=True)
    phone           = models.CharField(max_length=20, blank=True)
    email           = models.EmailField(blank=True)
    address         = models.TextField(blank=True)
    city            = models.CharField(max_length=100, blank=True)
    state           = models.CharField(max_length=100, blank=True)
    country         = models.CharField(max_length=100, default='India')
    pincode         = models.CharField(max_length=10, blank=True)

    # Tax info
    gstin           = models.CharField(max_length=20, blank=True)
    pan_number      = models.CharField(max_length=20, blank=True)

    # Payment terms
    credit_days     = models.IntegerField(default=30)
    credit_limit    = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    is_active       = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'master_customer'
        ordering = ['customer_name']

    def __str__(self):
        return f"{self.customer_code} - {self.customer_name}"
