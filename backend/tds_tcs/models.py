# ============================================================
# FILE: tds_tcs/models.py
# PURPOSE: Tax Deducted at Source (TDS) and Tax Collected at
#          Source (TCS) management for India compliance.
#
# TDS — Company deducts tax when paying vendors/employees
#        above threshold. Deposited to govt via challan.
#        Returns filed: Form 26Q (non-salary), 27Q (foreign),
#        24Q (salary). Certificates: Form 16 (salary), 16A (others).
#
# TCS — Company collects tax from customers on certain goods/services
#        when receipt exceeds threshold. Returns: Form 27EQ.
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Company


# ============================================================
# TDS SECTION MASTER
# Maps Income Tax sections to rates and thresholds.
# Common sections: 194C (contractor), 194A (interest),
#   194I (rent), 194J (professional fee), 192 (salary)
# ============================================================
class TDSSection(models.Model):
    section_code        = models.CharField(max_length=20, unique=True)    # "194C", "194A", "192"
    description         = models.CharField(max_length=300)
    nature_of_payment   = models.CharField(max_length=200)                # "Contract/Sub-contract", "Interest"

    # Rates differ for Individual/HUF vs Company
    rate_individual_huf = models.DecimalField(max_digits=5, decimal_places=2)   # e.g., 1.00 %
    rate_company        = models.DecimalField(max_digits=5, decimal_places=2)   # e.g., 2.00 %
    rate_no_pan         = models.DecimalField(max_digits=5, decimal_places=2, default=20)  # 20% if no PAN

    # Threshold — TDS applies only once cumulative payments exceed this
    single_payment_threshold    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    annual_threshold            = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    surcharge_applicable    = models.BooleanField(default=False)
    health_cess_applicable  = models.BooleanField(default=True)     # 4% H&E cess on surcharge
    is_salary_section       = models.BooleanField(default=False)    # True only for Section 192

    is_active               = models.BooleanField(default=True)

    class Meta:
        db_table = 'tds_section'
        ordering = ['section_code']

    def __str__(self):
        return f"{self.section_code} — {self.nature_of_payment}"


# ============================================================
# VENDOR TDS CONFIGURATION
# Per-vendor TDS section override — which section applies
# and whether this vendor is exempt (Form 15G/15H etc).
# ============================================================
class VendorTDSConfig(models.Model):
    DEDUCTEE_TYPE_CHOICES = [
        ('individual',      'Individual / HUF'),
        ('company',         'Company / Firm'),
        ('other',           'Other'),
    ]

    vendor              = models.OneToOneField('masters.Vendor', on_delete=models.CASCADE, related_name='tds_config')
    section             = models.ForeignKey(TDSSection, on_delete=models.SET_NULL, null=True, blank=True)
    deductee_type       = models.CharField(max_length=15, choices=DEDUCTEE_TYPE_CHOICES, default='company')
    tds_exempt          = models.BooleanField(default=False)        # Exempt (lower/nil deduction certificate)
    lower_deduction_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    lower_deduction_cert = models.CharField(max_length=50, blank=True)  # Certificate number
    cert_valid_from     = models.DateField(null=True, blank=True)
    cert_valid_to       = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'tds_vendor_config'

    def __str__(self):
        return f"{self.vendor} | {self.section}"


# ============================================================
# TDS DEDUCTION
# One record per payment where TDS is deducted.
# Linked to the Payment voucher in finance app.
# ============================================================
class TDSDeduction(models.Model):

    PARTY_TYPE_CHOICES = [
        ('vendor',   'Vendor'),
        ('employee', 'Employee'),
        ('other',    'Other'),
    ]

    STATUS_CHOICES = [
        ('deducted',  'Deducted — Pending Deposit'),
        ('deposited', 'Deposited to Govt'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    fiscal_year         = models.ForeignKey('finance.FiscalYear', on_delete=models.CASCADE)
    accounting_period   = models.ForeignKey('finance.AccountingPeriod', on_delete=models.SET_NULL, null=True, blank=True)
    section             = models.ForeignKey(TDSSection, on_delete=models.PROTECT)

    deduction_date      = models.DateField()

    party_type          = models.CharField(max_length=10, choices=PARTY_TYPE_CHOICES)
    vendor              = models.ForeignKey('masters.Vendor', on_delete=models.SET_NULL, null=True, blank=True, related_name='tds_deductions')
    employee            = models.ForeignKey('hr_payroll.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='tds_deductions')
    party_pan           = models.CharField(max_length=20, blank=True)
    party_name          = models.CharField(max_length=200)

    transaction_amount  = models.DecimalField(max_digits=14, decimal_places=2)  # Gross payment
    tds_rate            = models.DecimalField(max_digits=6, decimal_places=3)
    tds_amount          = models.DecimalField(max_digits=12, decimal_places=2)
    surcharge_amount    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cess_amount         = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_tds           = models.DecimalField(max_digits=12, decimal_places=2)  # tds + surcharge + cess

    # Challan for deposit to government
    deposit_date        = models.DateField(null=True, blank=True)
    challan_number      = models.CharField(max_length=50, blank=True)    # BSR code + challan serial
    bsr_code            = models.CharField(max_length=15, blank=True)
    challan_date        = models.DateField(null=True, blank=True)

    status              = models.CharField(max_length=10, choices=STATUS_CHOICES, default='deducted')

    # Source document
    payment             = models.ForeignKey('finance.Payment', on_delete=models.SET_NULL, null=True, blank=True, related_name='tds_deductions')
    payslip             = models.ForeignKey('hr_payroll.PaySlip', on_delete=models.SET_NULL, null=True, blank=True, related_name='tds_deductions')
    journal_entry       = models.ForeignKey('finance.JournalEntry', on_delete=models.SET_NULL, null=True, blank=True)

    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tds_deduction'
        ordering = ['-deduction_date']
        indexes  = [models.Index(fields=['company', 'fiscal_year', 'status'])]

    def __str__(self):
        return f"TDS | {self.section.section_code} | {self.party_name} | ₹{self.total_tds}"


# ============================================================
# TDS RETURN FILING
# Track Form 26Q / 27Q / 24Q filing for each quarter.
# Actual e-filing is a stub — link to TRACES portal later.
# ============================================================
class TDSReturn(models.Model):

    FORM_CHOICES = [
        ('24Q',  'Form 24Q — Salary TDS'),
        ('26Q',  'Form 26Q — Non-salary TDS (Resident)'),
        ('27Q',  'Form 27Q — Non-salary TDS (Non-resident)'),
        ('27EQ', 'Form 27EQ — TCS Return'),
    ]

    QUARTER_CHOICES = [
        ('Q1', 'Q1 — Apr to Jun'),
        ('Q2', 'Q2 — Jul to Sep'),
        ('Q3', 'Q3 — Oct to Dec'),
        ('Q4', 'Q4 — Jan to Mar'),
    ]

    STATUS_CHOICES = [
        ('draft',  'Draft'),
        ('filed',  'Filed'),
        ('revised','Revised'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    fiscal_year         = models.ForeignKey('finance.FiscalYear', on_delete=models.CASCADE)
    form_type           = models.CharField(max_length=5, choices=FORM_CHOICES)
    quarter             = models.CharField(max_length=2, choices=QUARTER_CHOICES)

    total_deductions    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_tds_deposited = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    status              = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    filed_date          = models.DateField(null=True, blank=True)
    ack_number          = models.CharField(max_length=50, blank=True)    # From TRACES

    # Stub — actual e-filing disabled until TRACES credentials configured
    integration_enabled = models.BooleanField(default=False)

    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table        = 'tds_return'
        unique_together = ('company', 'fiscal_year', 'form_type', 'quarter')

    def __str__(self):
        return f"{self.form_type} | {self.fiscal_year.year_name} | {self.quarter} | {self.status}"


# ============================================================
# TCS SECTION MASTER
# Tax Collected at Source — applicable on sale of certain
# goods (scrap, minerals, motor vehicles, etc.) per Section 206C.
# ============================================================
class TCSSection(models.Model):
    section_code        = models.CharField(max_length=10, unique=True)    # "206C(1)", "206C(1H)"
    description         = models.CharField(max_length=300)
    goods_description   = models.CharField(max_length=200)
    rate_percentage     = models.DecimalField(max_digits=5, decimal_places=2)
    rate_no_pan         = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    threshold_amount    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_active           = models.BooleanField(default=True)

    class Meta:
        db_table = 'tcs_section'
        ordering = ['section_code']

    def __str__(self):
        return f"{self.section_code} — {self.goods_description}"


# ============================================================
# TCS COLLECTION
# One record per sale where TCS is collected from customer.
# Linked to the SalesInvoice or Receipt.
# ============================================================
class TCSCollection(models.Model):

    STATUS_CHOICES = [
        ('collected', 'Collected — Pending Deposit'),
        ('deposited', 'Deposited to Govt'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    fiscal_year         = models.ForeignKey('finance.FiscalYear', on_delete=models.CASCADE)
    accounting_period   = models.ForeignKey('finance.AccountingPeriod', on_delete=models.SET_NULL, null=True, blank=True)
    section             = models.ForeignKey(TCSSection, on_delete=models.PROTECT)

    collection_date     = models.DateField()
    customer            = models.ForeignKey('masters.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='tcs_collections')
    customer_pan        = models.CharField(max_length=20, blank=True)
    customer_name       = models.CharField(max_length=200)

    transaction_amount  = models.DecimalField(max_digits=14, decimal_places=2)
    tcs_rate            = models.DecimalField(max_digits=6, decimal_places=3)
    tcs_amount          = models.DecimalField(max_digits=12, decimal_places=2)

    deposit_date        = models.DateField(null=True, blank=True)
    challan_number      = models.CharField(max_length=50, blank=True)
    bsr_code            = models.CharField(max_length=15, blank=True)

    status              = models.CharField(max_length=10, choices=STATUS_CHOICES, default='collected')

    sales_invoice       = models.ForeignKey('dispatch.SalesInvoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='tcs_collections')
    receipt             = models.ForeignKey('finance.Receipt', on_delete=models.SET_NULL, null=True, blank=True, related_name='tcs_collections')
    journal_entry       = models.ForeignKey('finance.JournalEntry', on_delete=models.SET_NULL, null=True, blank=True)

    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tcs_collection'
        ordering = ['-collection_date']

    def __str__(self):
        return f"TCS | {self.section.section_code} | {self.customer_name} | ₹{self.tcs_amount}"
