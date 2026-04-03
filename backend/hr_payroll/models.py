# ============================================================
# FILE: hr_payroll/models.py
# PURPOSE: Database tables for HR and Payroll module.
#          Department → Employee → Attendance → Salary
# ============================================================

from django.db import models
from django.contrib.auth.models import User


# ============================================================
# DEPARTMENT
# Factory departments — Spinning, Weaving, Admin, etc.
# ============================================================
class Department(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    code        = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'hr_department'
        ordering = ['name']

    def __str__(self):
        return self.name


# ============================================================
# EMPLOYEE
# All factory and office employees.
# ============================================================
class Employee(models.Model):

    GENDER_CHOICES = [
        ('male',    'Male'),
        ('female',  'Female'),
        ('other',   'Other'),
    ]

    EMPLOYMENT_TYPE_CHOICES = [
        ('permanent',   'Permanent'),
        ('contract',    'Contract'),
        ('daily_wage',  'Daily Wage'),
        ('trainee',     'Trainee'),
    ]

    STATUS_CHOICES = [
        ('active',      'Active'),
        ('inactive',    'Inactive'),
        ('resigned',    'Resigned'),
        ('terminated',  'Terminated'),
    ]

    # Basic info
    employee_code   = models.CharField(max_length=20, unique=True)
    first_name      = models.CharField(max_length=100)
    last_name       = models.CharField(max_length=100)
    gender          = models.CharField(max_length=10, choices=GENDER_CHOICES)
    date_of_birth   = models.DateField(null=True, blank=True)
    phone           = models.CharField(max_length=20, blank=True)
    email           = models.EmailField(blank=True)
    address         = models.TextField(blank=True)

    # Job info
    department      = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
    designation     = models.CharField(max_length=100, blank=True)   # Job title
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES, default='permanent')
    date_of_joining = models.DateField()
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # Salary info
    basic_salary    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    hra             = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # House Rent Allowance
    da              = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Dearness Allowance
    other_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Bank details
    bank_name       = models.CharField(max_length=100, blank=True)
    bank_account    = models.CharField(max_length=50, blank=True)
    ifsc_code       = models.CharField(max_length=20, blank=True)

    # Government IDs
    pan_number      = models.CharField(max_length=20, blank=True)
    aadhar_number   = models.CharField(max_length=20, blank=True)
    pf_number       = models.CharField(max_length=50, blank=True)
    esi_number      = models.CharField(max_length=50, blank=True)

    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'hr_employee'
        ordering = ['employee_code']

    def __str__(self):
        return f"{self.employee_code} - {self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def gross_salary(self):
        return self.basic_salary + self.hra + self.da + self.other_allowance


# ============================================================
# ATTENDANCE
# Daily attendance record for each employee.
# ============================================================
class Attendance(models.Model):

    STATUS_CHOICES = [
        ('present',     'Present'),
        ('absent',      'Absent'),
        ('half_day',    'Half Day'),
        ('leave',       'Leave'),
        ('holiday',     'Holiday'),
    ]

    employee        = models.ForeignKey(Employee, on_delete=models.CASCADE)
    date            = models.DateField()
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    shift           = models.CharField(max_length=20, blank=True)   # Morning, Night, General
    in_time         = models.TimeField(null=True, blank=True)
    out_time        = models.TimeField(null=True, blank=True)
    overtime_hours  = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes           = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table        = 'hr_attendance'
        unique_together = ('employee', 'date')
        ordering        = ['-date']

    def __str__(self):
        return f"{self.employee.employee_code} | {self.date} | {self.status}"


# ============================================================
# SALARY RECORD
# Monthly salary calculation for each employee.
# ============================================================
class SalaryRecord(models.Model):

    STATUS_CHOICES = [
        ('draft',   'Draft'),
        ('paid',    'Paid'),
    ]

    employee        = models.ForeignKey(Employee, on_delete=models.CASCADE)
    month           = models.IntegerField()                 # 1-12
    year            = models.IntegerField()
    working_days    = models.IntegerField(default=0)        # Total working days in month
    present_days    = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    absent_days     = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    overtime_hours  = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    # Earnings
    basic_salary    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    hra             = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    da              = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    overtime_pay    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gross_earnings  = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Deductions
    pf_deduction    = models.DecimalField(max_digits=10, decimal_places=2, default=0)   # 12% of basic
    esi_deduction   = models.DecimalField(max_digits=10, decimal_places=2, default=0)   # 0.75% of gross
    other_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Net pay
    net_salary      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    paid_date       = models.DateField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'hr_salary_record'
        unique_together = ('employee', 'month', 'year')
        ordering        = ['-year', '-month']

    def __str__(self):
        return f"{self.employee.full_name} | {self.month}/{self.year} | Net: {self.net_salary}"
