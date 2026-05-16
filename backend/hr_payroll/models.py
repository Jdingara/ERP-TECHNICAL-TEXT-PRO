# ============================================================
# FILE: hr_payroll/models.py
# PURPOSE: Database tables for HR and Payroll module.
#          Department → Employee → Attendance → Salary
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Company


# ============================================================
# DEPARTMENT
# Factory departments — Spinning, Weaving, Admin, etc.
# ============================================================
class Department(models.Model):
    company     = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
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

    company         = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)

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


# ============================================================
# EMPLOYEE STATUTORY DETAILS
# India-specific fields added on top of basic Employee model.
# Stored as a separate table to keep Employee model clean.
# ============================================================
class EmployeeStatutory(models.Model):
    DEDUCTEE_TYPE_CHOICES = [
        ('individual', 'Individual'),
        ('huf',        'HUF'),
        ('other',      'Other'),
    ]

    employee            = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='statutory')
    uan_number          = models.CharField(max_length=20, blank=True)    # PF Universal Account Number
    pf_applicable       = models.BooleanField(default=True)
    pf_rate_employee    = models.DecimalField(max_digits=5, decimal_places=2, default=12)  # 12% of basic
    pf_rate_employer    = models.DecimalField(max_digits=5, decimal_places=2, default=12)  # 12% of basic
    pf_ceiling          = models.DecimalField(max_digits=10, decimal_places=2, default=15000)  # PF on max ₹15,000

    esi_applicable      = models.BooleanField(default=True)
    esi_rate_employee   = models.DecimalField(max_digits=5, decimal_places=2, default=0.75)  # 0.75% of gross
    esi_rate_employer   = models.DecimalField(max_digits=5, decimal_places=2, default=3.25)  # 3.25% of gross
    esi_ceiling         = models.DecimalField(max_digits=10, decimal_places=2, default=21000)  # ESI if gross ≤ ₹21,000

    pt_applicable       = models.BooleanField(default=True)   # Professional Tax (state-wise)
    pt_state            = models.CharField(max_length=100, blank=True)

    tds_on_salary       = models.BooleanField(default=False)  # Income tax deduction applicable
    deductee_type       = models.CharField(max_length=15, choices=DEDUCTEE_TYPE_CHOICES, default='individual')
    tax_regime          = models.CharField(max_length=10, choices=[('old','Old Regime'),('new','New Regime')], default='new')
    declaration_submitted = models.BooleanField(default=False)

    gratuity_applicable = models.BooleanField(default=False)
    lwf_applicable      = models.BooleanField(default=False)  # Labour Welfare Fund

    class Meta:
        db_table = 'hr_employee_statutory'

    def __str__(self):
        return f"Statutory | {self.employee.full_name}"


# ============================================================
# PROFESSIONAL TAX SLAB
# State-wise monthly salary slabs for Professional Tax.
# Common states: Maharashtra, Karnataka, Tamil Nadu, etc.
# ============================================================
class ProfessionalTaxSlab(models.Model):
    state               = models.CharField(max_length=100)
    slab_from           = models.DecimalField(max_digits=10, decimal_places=2)   # Monthly gross from
    slab_to             = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # null = no upper limit
    pt_amount           = models.DecimalField(max_digits=8, decimal_places=2)    # Monthly PT amount
    effective_from      = models.DateField()
    is_active           = models.BooleanField(default=True)

    class Meta:
        db_table = 'hr_professional_tax_slab'
        ordering = ['state', 'slab_from']

    def __str__(self):
        return f"{self.state} | ₹{self.slab_from}–{self.slab_to or '∞'} → ₹{self.pt_amount}/month"


# ============================================================
# SALARY STRUCTURE
# Template defining salary components for a category of employees.
# E.g., "Staff Grade A", "Manager", "Contract Worker"
# ============================================================
class SalaryStructure(models.Model):
    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    name                = models.CharField(max_length=100)     # "Staff Grade A"
    description         = models.TextField(blank=True)
    is_active           = models.BooleanField(default=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'hr_salary_structure'
        unique_together = ('company', 'name')
        ordering        = ['name']

    def __str__(self):
        return f"{self.name} — {self.company.name}"


# ============================================================
# SALARY COMPONENT
# Individual earning/deduction/employer-contribution items
# within a salary structure.
# ============================================================
class SalaryComponent(models.Model):

    COMPONENT_TYPE_CHOICES = [
        ('earning',              'Earning'),
        ('deduction',            'Deduction'),
        ('employer_contribution','Employer Contribution'),
    ]

    CALCULATION_TYPE_CHOICES = [
        ('fixed',               'Fixed Amount'),
        ('pct_basic',           '% of Basic'),
        ('pct_gross',           '% of Gross Earnings'),
        ('pct_ctc',             '% of CTC'),
        ('formula',             'Custom Formula'),
    ]

    structure           = models.ForeignKey(SalaryStructure, on_delete=models.CASCADE, related_name='components')
    component_name      = models.CharField(max_length=100)   # "Basic", "HRA", "PF Employee", "ESI Employer"
    component_code      = models.CharField(max_length=20)    # "BASIC", "HRA", "PF_EE", "ESI_ER"
    component_type      = models.CharField(max_length=25, choices=COMPONENT_TYPE_CHOICES)
    calculation_type    = models.CharField(max_length=15, choices=CALCULATION_TYPE_CHOICES)

    amount              = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # If fixed
    percentage          = models.DecimalField(max_digits=6, decimal_places=3, default=0)   # If percentage

    is_taxable          = models.BooleanField(default=True)
    is_pf_applicable    = models.BooleanField(default=False)   # Included in PF wages
    is_esi_applicable   = models.BooleanField(default=False)   # Included in ESI wages
    sequence            = models.IntegerField(default=10)      # Display order on payslip

    gl_account          = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table        = 'hr_salary_component'
        unique_together = ('structure', 'component_code')
        ordering        = ['sequence']

    def __str__(self):
        return f"{self.structure.name} | {self.component_name}"


# ============================================================
# EMPLOYEE SALARY ASSIGNMENT
# Assigns a salary structure to an employee with effective dates.
# Allows salary revisions without losing history.
# ============================================================
class EmployeeSalaryAssignment(models.Model):
    employee            = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='salary_assignments')
    structure           = models.ForeignKey(SalaryStructure, on_delete=models.PROTECT)
    basic_salary        = models.DecimalField(max_digits=10, decimal_places=2)
    ctc                 = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Annual CTC
    effective_from      = models.DateField()
    effective_to        = models.DateField(null=True, blank=True)
    notes               = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'hr_salary_assignment'
        ordering = ['-effective_from']

    def __str__(self):
        return f"{self.employee.full_name} | {self.structure.name} | ₹{self.basic_salary} from {self.effective_from}"


# ============================================================
# PAYROLL PERIOD (PAYROLL RUN)
# Groups all payslips for a given month/period.
# Status flow: draft → processing → posted → paid
# ============================================================
class PayrollPeriod(models.Model):

    STATUS_CHOICES = [
        ('draft',      'Draft'),
        ('processing', 'Processing'),
        ('posted',     'Posted'),      # Journal entries created
        ('paid',       'Paid'),        # Salaries disbursed
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    period_name         = models.CharField(max_length=50)        # "April 2025"
    period_month        = models.IntegerField()                  # 1–12
    period_year         = models.IntegerField()
    start_date          = models.DateField()
    end_date            = models.DateField()
    payment_date        = models.DateField(null=True, blank=True)

    working_days        = models.IntegerField(default=26)        # Standard working days in month

    total_gross         = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_deductions    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_net           = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_pf_employee   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_pf_employer   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_esi_employee  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_esi_employer  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_pt            = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_tds           = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    status              = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft')
    fiscal_year         = models.ForeignKey('finance.FiscalYear', on_delete=models.SET_NULL, null=True, blank=True)
    journal_entry       = models.ForeignKey('finance.JournalEntry', on_delete=models.SET_NULL, null=True, blank=True, related_name='payroll_periods')
    created_by          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table        = 'hr_payroll_period'
        unique_together = ('company', 'period_month', 'period_year')
        ordering        = ['-period_year', '-period_month']

    def __str__(self):
        return f"{self.period_name} — {self.company.name} | {self.status}"


# ============================================================
# PAY SLIP
# Individual salary slip for one employee for one period.
# ============================================================
class PaySlip(models.Model):

    STATUS_CHOICES = [
        ('draft',    'Draft'),
        ('approved', 'Approved'),
        ('paid',     'Paid'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    period              = models.ForeignKey(PayrollPeriod, on_delete=models.CASCADE, related_name='payslips')
    employee            = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name='payslips')

    working_days        = models.IntegerField(default=0)
    paid_days           = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    lop_days            = models.DecimalField(max_digits=5, decimal_places=1, default=0)  # Loss of Pay
    overtime_hours      = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    # Earnings summary
    gross_earnings      = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Statutory deductions
    pf_employee         = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Employee PF (12%)
    pf_employer         = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Employer PF (12%)
    esi_employee        = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Employee ESI (0.75%)
    esi_employer        = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Employer ESI (3.25%)
    professional_tax    = models.DecimalField(max_digits=8,  decimal_places=2, default=0)
    tds_on_salary       = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Income tax
    other_deductions    = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Advance, loan, etc.

    total_deductions    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary          = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ctc_monthly         = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # net + all employer contributions

    # Bank payment
    bank_account_number = models.CharField(max_length=50, blank=True)
    bank_ifsc           = models.CharField(max_length=20, blank=True)

    status              = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    paid_date           = models.DateField(null=True, blank=True)

    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'hr_payslip'
        unique_together = ('period', 'employee')
        ordering        = ['employee__employee_code']

    def __str__(self):
        return f"{self.employee.full_name} | {self.period.period_name} | Net: ₹{self.net_salary}"


# ============================================================
# PAY SLIP LINE
# Itemised earning/deduction on a payslip.
# ============================================================
class PaySlipLine(models.Model):
    payslip             = models.ForeignKey(PaySlip, on_delete=models.CASCADE, related_name='lines')
    component_name      = models.CharField(max_length=100)
    component_code      = models.CharField(max_length=20, blank=True)
    component_type      = models.CharField(max_length=25)   # earning / deduction / employer_contribution
    amount              = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = 'hr_payslip_line'
        ordering = ['component_type', 'component_name']

    def __str__(self):
        return f"{self.payslip} | {self.component_name} | {self.amount}"


# ============================================================
# LEAVE TYPE
# Annual, Sick, Casual, Earned leave types.
# ============================================================
class LeaveType(models.Model):
    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    name                = models.CharField(max_length=100)    # "Annual Leave", "Sick Leave"
    code                = models.CharField(max_length=10)     # "AL", "SL", "CL"
    is_paid             = models.BooleanField(default=True)
    max_days_per_year   = models.IntegerField(default=0)      # 0 = unlimited
    carry_forward       = models.BooleanField(default=False)
    is_active           = models.BooleanField(default=True)

    class Meta:
        db_table        = 'hr_leave_type'
        unique_together = ('company', 'code')

    def __str__(self):
        return f"{self.code} — {self.name}"


# ============================================================
# LEAVE APPLICATION
# Employee leave request with approval workflow.
# ============================================================
class LeaveApplication(models.Model):

    STATUS_CHOICES = [
        ('draft',    'Draft'),
        ('pending',  'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled','Cancelled'),
    ]

    employee            = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_applications')
    leave_type          = models.ForeignKey(LeaveType, on_delete=models.PROTECT)
    from_date           = models.DateField()
    to_date             = models.DateField()
    total_days          = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    reason              = models.TextField(blank=True)
    status              = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    approved_by         = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    approved_at         = models.DateTimeField(null=True, blank=True)
    notes               = models.CharField(max_length=300, blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'hr_leave_application'
        ordering = ['-from_date']

    def __str__(self):
        return f"{self.employee.full_name} | {self.leave_type.code} | {self.from_date} to {self.to_date} | {self.status}"
