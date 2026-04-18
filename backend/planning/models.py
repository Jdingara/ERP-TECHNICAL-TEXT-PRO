# ============================================================
# FILE: planning/models.py
# PURPOSE: Production Orders and Daily Planning
#          Sales Order → Production Order → Daily Plan → Machine
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Company
from masters.models import ProductDesign, Machine, Process, Customer


class SalesOrder(models.Model):
    STATUS = [
        ('draft', 'Draft'), ('confirmed', 'Confirmed'),
        ('in_production', 'In Production'), ('completed', 'Completed'),
        ('dispatched', 'Dispatched'), ('cancelled', 'Cancelled'),
    ]
    company       = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    so_number     = models.CharField(max_length=50, unique=True)
    customer      = models.ForeignKey(Customer, on_delete=models.PROTECT)
    order_date    = models.DateField()
    delivery_date = models.DateField(null=True, blank=True)
    status        = models.CharField(max_length=20, choices=STATUS, default='draft')
    notes         = models.TextField(blank=True)
    total_amount  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_by    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.so_number
    class Meta: ordering = ['-created_at']


class SalesOrderLine(models.Model):
    sales_order   = models.ForeignKey(SalesOrder, on_delete=models.CASCADE, related_name='lines')
    product       = models.ForeignKey(ProductDesign, on_delete=models.PROTECT)
    quantity      = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    delivery_date = models.DateField(null=True, blank=True)
    notes         = models.CharField(max_length=200, blank=True)


class ProductionOrder(models.Model):
    STATUS = [
        ('draft',       'Draft'),
        ('planned',     'Planned'),
        ('in_progress', 'In Progress'),
        ('completed',   'Completed'),
        ('cancelled',   'Cancelled'),
    ]
    PRIORITY = [('low', 'Low'), ('normal', 'Normal'), ('high', 'High'), ('urgent', 'Urgent')]

    company        = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    po_number      = models.CharField(max_length=50, unique=True)  # Production Order no (not Purchase)
    sales_order    = models.ForeignKey(SalesOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='production_orders')
    sales_order_line = models.ForeignKey(SalesOrderLine, on_delete=models.SET_NULL, null=True, blank=True)
    product        = models.ForeignKey(ProductDesign, on_delete=models.PROTECT)
    planned_qty    = models.DecimalField(max_digits=10, decimal_places=2)
    produced_qty   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    start_date     = models.DateField(null=True, blank=True)
    delivery_date  = models.DateField(null=True, blank=True)
    priority       = models.CharField(max_length=10, choices=PRIORITY, default='normal')
    status         = models.CharField(max_length=20, choices=STATUS, default='draft')
    notes          = models.TextField(blank=True)
    created_by     = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self): return self.po_number

    @property
    def pending_qty(self): return self.planned_qty - self.produced_qty

    @property
    def completion_pct(self):
        if self.planned_qty > 0:
            return round((self.produced_qty / self.planned_qty) * 100, 1)
        return 0

    class Meta: ordering = ['-created_at']


class DailyPlan(models.Model):
    STATUS = [('planned', 'Planned'), ('in_progress', 'In Progress'), ('completed', 'Completed')]

    company           = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    plan_date         = models.DateField()
    production_order  = models.ForeignKey(ProductionOrder, on_delete=models.CASCADE, related_name='daily_plans')
    machine           = models.ForeignKey(Machine, on_delete=models.PROTECT)
    process_stage     = models.ForeignKey(Process, on_delete=models.PROTECT)
    planned_qty       = models.DecimalField(max_digits=10, decimal_places=2)
    actual_qty        = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status            = models.CharField(max_length=20, choices=STATUS, default='planned')
    notes             = models.CharField(max_length=200, blank=True)
    created_by        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.plan_date} | {self.production_order.po_number} | {self.machine.machine_code}"
    class Meta: ordering = ['plan_date', 'machine']
