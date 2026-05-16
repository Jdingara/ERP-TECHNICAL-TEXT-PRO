# ============================================================
# FILE: gst/models.py
# PURPOSE: India GST management — rates, HSN/SAC codes,
#          input/output tax ledger, GSTR tracking,
#          e-Invoice stub, e-Way Bill stub.
#
# Integration stubs (e-Invoice, e-Way Bill) are created but
# disabled by default. Set integration_enabled=True to activate
# once GSP API credentials are configured.
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Company


# ============================================================
# GST RATE
# Standard GST slabs: 0%, 5%, 12%, 18%, 28%
# CGST + SGST = total for intra-state
# IGST = total for inter-state
# ============================================================
class GSTRate(models.Model):
    rate_name       = models.CharField(max_length=50, unique=True)      # e.g., "GST 18%"
    total_rate      = models.DecimalField(max_digits=6, decimal_places=2)  # 18.00
    cgst_rate       = models.DecimalField(max_digits=6, decimal_places=2)  # 9.00
    sgst_rate       = models.DecimalField(max_digits=6, decimal_places=2)  # 9.00
    igst_rate       = models.DecimalField(max_digits=6, decimal_places=2)  # 18.00
    cess_rate       = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    is_active       = models.BooleanField(default=True)

    class Meta:
        db_table = 'gst_rate'
        ordering = ['total_rate']

    def __str__(self):
        return self.rate_name


# ============================================================
# HSN CODE (Harmonised System of Nomenclature)
# For goods — 4, 6, or 8 digit codes.
# Required on GST invoices above ₹5 crore turnover.
# ============================================================
class HSNCode(models.Model):
    hsn_code        = models.CharField(max_length=10, unique=True)
    description     = models.TextField()
    gst_rate        = models.ForeignKey(GSTRate, on_delete=models.SET_NULL, null=True, blank=True)
    is_active       = models.BooleanField(default=True)

    class Meta:
        db_table = 'gst_hsn_code'
        ordering = ['hsn_code']

    def __str__(self):
        return f"{self.hsn_code} — {self.description[:60]}"


# ============================================================
# SAC CODE (Services Accounting Code)
# For services — 6 digit codes.
# ============================================================
class SACCode(models.Model):
    sac_code        = models.CharField(max_length=10, unique=True)
    description     = models.TextField()
    gst_rate        = models.ForeignKey(GSTRate, on_delete=models.SET_NULL, null=True, blank=True)
    is_active       = models.BooleanField(default=True)

    class Meta:
        db_table = 'gst_sac_code'
        ordering = ['sac_code']

    def __str__(self):
        return f"{self.sac_code} — {self.description[:60]}"


# ============================================================
# GST LEDGER
# One row per GST transaction line (sale or purchase).
# Source of truth for all GSTR report generation.
# Populated automatically when a sales/purchase invoice is posted.
# ============================================================
class GSTLedger(models.Model):

    TRANSACTION_TYPE_CHOICES = [
        ('sale',            'Sale'),
        ('purchase',        'Purchase'),
        ('credit_note',     'Credit Note (Sale Return)'),
        ('debit_note',      'Debit Note (Purchase Return)'),
        ('advance_receipt', 'Advance Receipt'),
    ]

    SUPPLY_TYPE_CHOICES = [
        ('intra_state',  'Intra-State (CGST + SGST)'),
        ('inter_state',  'Inter-State (IGST)'),
        ('export_lut',   'Export with LUT (Zero-rated)'),
        ('export_igst',  'Export with IGST'),
        ('import',       'Import'),
        ('nil_rated',    'Nil Rated'),
        ('exempt',       'Exempt'),
        ('non_gst',      'Non-GST Supply'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    fiscal_year         = models.ForeignKey('finance.FiscalYear', on_delete=models.SET_NULL, null=True, blank=True)
    accounting_period   = models.ForeignKey('finance.AccountingPeriod', on_delete=models.SET_NULL, null=True, blank=True)

    transaction_type    = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    transaction_date    = models.DateField()
    document_number     = models.CharField(max_length=50, db_index=True)    # Invoice / credit note number

    # Party details
    party_gstin         = models.CharField(max_length=20, blank=True)
    party_name          = models.CharField(max_length=200)
    party_state_code    = models.CharField(max_length=5, blank=True)

    supply_type         = models.CharField(max_length=20, choices=SUPPLY_TYPE_CHOICES)
    hsn_code            = models.CharField(max_length=10, blank=True)
    gst_rate            = models.ForeignKey(GSTRate, on_delete=models.SET_NULL, null=True, blank=True)

    taxable_amount      = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cgst_amount         = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst_amount         = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst_amount         = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cess_amount         = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_tax_amount    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount        = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    is_reverse_charge   = models.BooleanField(default=False)   # Reverse charge mechanism

    # Source document links
    sales_invoice       = models.ForeignKey('dispatch.SalesInvoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='gst_entries')
    purchase_invoice    = models.ForeignKey('purchase.PurchaseInvoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='gst_entries')
    credit_note         = models.ForeignKey('finance.CreditNote', on_delete=models.SET_NULL, null=True, blank=True, related_name='gst_entries')
    debit_note          = models.ForeignKey('finance.DebitNote', on_delete=models.SET_NULL, null=True, blank=True, related_name='gst_entries')

    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'gst_ledger'
        ordering = ['-transaction_date']
        indexes  = [
            models.Index(fields=['company', 'fiscal_year', 'transaction_type']),
            models.Index(fields=['transaction_date']),
        ]

    def __str__(self):
        return f"{self.transaction_type} | {self.document_number} | {self.party_name} | ₹{self.total_amount}"


# ============================================================
# GSTR-1 SUMMARY
# Monthly/quarterly summary for outward supplies filing.
# Populated by aggregating GSTLedger sale rows for the period.
# ============================================================
class GSTR1Summary(models.Model):
    STATUS_CHOICES = [
        ('draft',     'Draft'),
        ('filed',     'Filed'),
        ('amended',   'Amended'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    fiscal_year         = models.ForeignKey('finance.FiscalYear', on_delete=models.CASCADE)
    accounting_period   = models.ForeignKey('finance.AccountingPeriod', on_delete=models.CASCADE)

    # Aggregate totals
    total_taxable_value = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    total_igst          = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_cgst          = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_sgst          = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_cess          = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_invoice_value = models.DecimalField(max_digits=16, decimal_places=2, default=0)

    status              = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    filed_date          = models.DateField(null=True, blank=True)
    arn_number          = models.CharField(max_length=50, blank=True)    # Acknowledgement Reference Number from GST portal
    filed_by            = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    # Integration stub — actual filing is disabled until GSP is configured
    integration_enabled = models.BooleanField(default=False)
    last_sync_at        = models.DateTimeField(null=True, blank=True)
    sync_error          = models.TextField(blank=True)

    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table        = 'gst_gstr1_summary'
        unique_together = ('company', 'fiscal_year', 'accounting_period')
        ordering        = ['-accounting_period__start_date']

    def __str__(self):
        return f"GSTR-1 | {self.company.name} | {self.accounting_period.period_name}"


# ============================================================
# GSTR-3B SUMMARY
# Monthly summary return — tax payable and ITC claimed.
# ============================================================
class GSTR3BSummary(models.Model):
    STATUS_CHOICES = [
        ('draft',   'Draft'),
        ('filed',   'Filed'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    fiscal_year         = models.ForeignKey('finance.FiscalYear', on_delete=models.CASCADE)
    accounting_period   = models.ForeignKey('finance.AccountingPeriod', on_delete=models.CASCADE)

    # 3.1 — Outward supplies
    taxable_outward_igst    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    taxable_outward_cgst    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    taxable_outward_sgst    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    taxable_outward_cess    = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # 4 — Input Tax Credit (ITC) eligible
    itc_igst                = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    itc_cgst                = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    itc_sgst                = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    itc_cess                = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # 6.1 — Tax payable
    tax_payable_igst        = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_payable_cgst        = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_payable_sgst        = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_payable_cess        = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    status              = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    filed_date          = models.DateField(null=True, blank=True)
    arn_number          = models.CharField(max_length=50, blank=True)
    filed_by            = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    integration_enabled = models.BooleanField(default=False)

    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table        = 'gst_gstr3b_summary'
        unique_together = ('company', 'fiscal_year', 'accounting_period')

    def __str__(self):
        return f"GSTR-3B | {self.company.name} | {self.accounting_period.period_name}"


# ============================================================
# E-INVOICE STUB
# Placeholder for GST portal e-Invoice (IRN) integration.
# integration_enabled=False means API calls are skipped.
# When enabled, the system calls the configured GSP API to
# generate an IRN and QR code for each invoice above ₹5 crore.
# ============================================================
class EInvoice(models.Model):
    STATUS_CHOICES = [
        ('pending',    'Pending Generation'),
        ('generated',  'IRN Generated'),
        ('cancelled',  'Cancelled'),
        ('failed',     'Generation Failed'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    sales_invoice       = models.OneToOneField('dispatch.SalesInvoice', on_delete=models.CASCADE, related_name='e_invoice')

    # IRN details — populated after successful GSP API call
    irn                 = models.CharField(max_length=100, blank=True)          # Invoice Reference Number
    ack_number          = models.CharField(max_length=50, blank=True)           # Acknowledgement number
    ack_date            = models.DateTimeField(null=True, blank=True)
    qr_code             = models.TextField(blank=True)                          # Base64 QR code image
    signed_invoice      = models.TextField(blank=True)                          # Signed JSON from GSP

    status              = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    cancellation_reason = models.CharField(max_length=200, blank=True)
    cancelled_at        = models.DateTimeField(null=True, blank=True)
    error_message       = models.TextField(blank=True)

    # Integration flag — set False to disable API calls (stub mode)
    integration_enabled = models.BooleanField(default=False)
    gsp_provider        = models.CharField(max_length=50, blank=True)           # e.g., "masters_india", "iris"

    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'gst_e_invoice'

    def __str__(self):
        return f"e-Invoice | {self.sales_invoice.invoice_number} | {self.status}"


# ============================================================
# E-WAY BILL STUB
# Placeholder for NIC e-Way Bill API integration.
# Required for goods movement above ₹50,000 value.
# ============================================================
class EWayBill(models.Model):
    STATUS_CHOICES = [
        ('pending',    'Pending'),
        ('generated',  'Generated'),
        ('cancelled',  'Cancelled'),
        ('extended',   'Extended'),
        ('failed',     'Failed'),
    ]

    TRANSPORT_MODE_CHOICES = [
        ('1', 'Road'),
        ('2', 'Rail'),
        ('3', 'Air'),
        ('4', 'Ship'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    dispatch            = models.OneToOneField('dispatch.DispatchEntry', on_delete=models.CASCADE, related_name='e_way_bill')
    sales_invoice       = models.ForeignKey('dispatch.SalesInvoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='e_way_bills')

    ewb_number          = models.CharField(max_length=20, blank=True)           # 12-digit EWB number
    ewb_date            = models.DateTimeField(null=True, blank=True)
    valid_upto          = models.DateTimeField(null=True, blank=True)

    # Transport details
    transport_mode      = models.CharField(max_length=1, choices=TRANSPORT_MODE_CHOICES, default='1')
    vehicle_number      = models.CharField(max_length=20, blank=True)
    transporter_id      = models.CharField(max_length=20, blank=True)
    transporter_name    = models.CharField(max_length=200, blank=True)
    distance_km         = models.IntegerField(default=0)

    status              = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    error_message       = models.TextField(blank=True)
    cancellation_reason = models.CharField(max_length=200, blank=True)

    integration_enabled = models.BooleanField(default=False)

    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'gst_e_way_bill'

    def __str__(self):
        return f"EWB | {self.dispatch.dispatch_number} | {self.status}"


# ============================================================
# GST PAYMENT CHALLAN
# Track GST paid to government via PMT-06 challan.
# ============================================================
class GSTChallan(models.Model):
    STATUS_CHOICES = [
        ('created',  'Created'),
        ('paid',     'Paid'),
        ('expired',  'Expired'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    fiscal_year         = models.ForeignKey('finance.FiscalYear', on_delete=models.CASCADE)
    accounting_period   = models.ForeignKey('finance.AccountingPeriod', on_delete=models.CASCADE)
    challan_number      = models.CharField(max_length=50, blank=True)           # CIN from GST portal
    payment_date        = models.DateField(null=True, blank=True)

    igst_paid           = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cgst_paid           = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    sgst_paid           = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cess_paid           = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    interest_paid       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    penalty_paid        = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    payment_mode        = models.CharField(max_length=20, blank=True)           # NEFT, OTC, etc.
    bank_reference      = models.CharField(max_length=100, blank=True)
    status              = models.CharField(max_length=10, choices=STATUS_CHOICES, default='created')

    gstr3b              = models.ForeignKey(GSTR3BSummary, on_delete=models.SET_NULL, null=True, blank=True, related_name='challans')
    journal_entry       = models.ForeignKey('finance.JournalEntry', on_delete=models.SET_NULL, null=True, blank=True)

    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'gst_challan'

    def __str__(self):
        return f"GST Challan | {self.accounting_period.period_name} | {self.challan_number or 'Pending'}"
