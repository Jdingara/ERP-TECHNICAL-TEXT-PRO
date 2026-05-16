# ============================================================
# FILE: finance/models.py
# PURPOSE: Database tables for finance and accounting module.
#          Chart of Accounts → Journal Entries → Ledger
#          Standard double-entry bookkeeping system.
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Company
from django.db.models import Sum


# ============================================================
# ACCOUNT TYPE
# Top-level classification of accounts
# ============================================================
class AccountType(models.Model):
    name            = models.CharField(max_length=100, unique=True)
    # normal_balance: debit = assets/expenses grow with debit
    #                 credit = liabilities/equity/income grow with credit
    normal_balance  = models.CharField(max_length=10, choices=[('debit','Debit'),('credit','Credit')])

    class Meta:
        db_table = 'finance_account_type'

    def __str__(self):
        return self.name


# ============================================================
# ACCOUNT (CHART OF ACCOUNTS)
# Every financial account — cash, bank, sales, purchases, etc.
# ============================================================
class Account(models.Model):

    ACCOUNT_CATEGORY_CHOICES = [
        ('asset',       'Asset'),           # Cash, bank, stock, machinery
        ('liability',   'Liability'),       # Loans, payables
        ('equity',      'Equity'),          # Owner capital, retained earnings
        ('income',      'Income'),          # Sales, other income
        ('expense',     'Expense'),         # Purchases, salaries, rent
    ]

    company         = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    account_code    = models.CharField(max_length=20, unique=True)
    account_name    = models.CharField(max_length=200)
    account_category = models.CharField(max_length=20, choices=ACCOUNT_CATEGORY_CHOICES)
    account_type    = models.ForeignKey(AccountType, on_delete=models.SET_NULL, null=True, blank=True)
    parent_account  = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_accounts')
    description     = models.TextField(blank=True)
    is_active       = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_account'
        ordering = ['account_code']

    def __str__(self):
        return f"{self.account_code} - {self.account_name}"

    def get_balance(self):
        """ Calculate current balance of this account from all journal entry lines """
        from django.db.models import Sum
        debits  = self.journal_lines.filter(entry__status='posted').aggregate(Sum('debit_amount'))['debit_amount__sum'] or 0
        credits = self.journal_lines.filter(entry__status='posted').aggregate(Sum('credit_amount'))['credit_amount__sum'] or 0
        if self.account_category in ('asset', 'expense'):
            return debits - credits   # Debit normal balance
        else:
            return credits - debits   # Credit normal balance


# ============================================================
# JOURNAL ENTRY
# Every financial transaction is recorded as a journal entry.
# Must always balance: Total Debits = Total Credits
# ============================================================
class JournalEntry(models.Model):

    STATUS_CHOICES = [
        ('draft',   'Draft'),
        ('posted',  'Posted'),   # Confirmed and affects account balances
        ('reversed','Reversed'),
    ]

    company         = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    entry_number    = models.CharField(max_length=50, unique=True)
    entry_date      = models.DateField()
    description     = models.TextField()
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    reference       = models.CharField(max_length=100, blank=True)   # PO number, SO number, etc.
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_journal_entry'
        ordering = ['-entry_date', '-created_at']

    def __str__(self):
        return f"JE: {self.entry_number} | {self.description[:50]}"

    def total_debits(self):
        from django.db.models import Sum
        return self.lines.aggregate(Sum('debit_amount'))['debit_amount__sum'] or 0

    def total_credits(self):
        from django.db.models import Sum
        return self.lines.aggregate(Sum('credit_amount'))['credit_amount__sum'] or 0

    def is_balanced(self):
        return self.total_debits() == self.total_credits()


# ============================================================
# JOURNAL ENTRY LINE
# Each debit or credit line in a journal entry.
# ============================================================
class JournalEntryLine(models.Model):
    entry           = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account         = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='journal_lines')
    description     = models.CharField(max_length=200, blank=True)
    debit_amount    = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    credit_amount   = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = 'finance_journal_entry_line'

    def __str__(self):
        return f"{self.account.account_code} | Dr: {self.debit_amount} | Cr: {self.credit_amount}"


# ============================================================
# COST CENTER
# Track income/expense by department or project.
# Optional — only needed if module_budget is enabled.
# ============================================================
class CostCenter(models.Model):
    company     = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    code        = models.CharField(max_length=20)
    name        = models.CharField(max_length=200)
    parent      = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    is_active   = models.BooleanField(default=True)

    class Meta:
        db_table        = 'finance_cost_center'
        unique_together = ('company', 'code')
        ordering        = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"


# ============================================================
# FISCAL YEAR  (per-company)
# Full accounting year with open/closed status.
# Separate from master_data.FinancialYear which controls
# document numbering — this one controls accounting periods.
# ============================================================
class FiscalYear(models.Model):
    company         = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    year_name       = models.CharField(max_length=20)       # e.g., "2025-26" or "2025"
    start_date      = models.DateField()                    # e.g., 2025-04-01
    end_date        = models.DateField()                    # e.g., 2026-03-31
    is_active       = models.BooleanField(default=False)    # Only one active per company
    is_closed       = models.BooleanField(default=False)    # Closed years are read-only
    closing_balance_transferred = models.BooleanField(default=False)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'finance_fiscal_year'
        unique_together = ('company', 'year_name')
        ordering        = ['-start_date']

    def __str__(self):
        return f"{self.company.name} | {self.year_name}"

    def save(self, *args, **kwargs):
        if self.is_active:
            FiscalYear.objects.filter(company=self.company).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


# ============================================================
# ACCOUNTING PERIOD  (monthly period within a fiscal year)
# Transactions are blocked once a period is closed.
# ============================================================
class AccountingPeriod(models.Model):
    fiscal_year     = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='periods')
    period_name     = models.CharField(max_length=30)       # e.g., "April 2025"
    period_number   = models.IntegerField()                 # 1–12
    start_date      = models.DateField()
    end_date        = models.DateField()
    is_closed       = models.BooleanField(default=False)

    class Meta:
        db_table        = 'finance_accounting_period'
        unique_together = ('fiscal_year', 'period_number')
        ordering        = ['period_number']

    def __str__(self):
        return f"{self.fiscal_year.year_name} | {self.period_name}"


# ============================================================
# PAYMENT VOUCHER
# Outgoing payment: paying a vendor, employee, or other party.
# Each posted payment auto-creates a journal entry.
# ============================================================
class Payment(models.Model):

    PAYMENT_MODE_CHOICES = [
        ('cash',   'Cash'),
        ('cheque', 'Cheque'),
        ('neft',   'NEFT'),
        ('rtgs',   'RTGS'),
        ('imps',   'IMPS'),
        ('upi',    'UPI'),
        ('dd',     'Demand Draft'),
    ]

    PARTY_TYPE_CHOICES = [
        ('vendor',   'Vendor'),
        ('employee', 'Employee'),
        ('other',    'Other'),
    ]

    STATUS_CHOICES = [
        ('draft',    'Draft'),
        ('posted',   'Posted'),
        ('cleared',  'Cleared'),   # Bank has cleared the cheque/transfer
        ('bounced',  'Bounced'),   # Cheque bounced
        ('cancelled','Cancelled'),
    ]

    company         = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    payment_number  = models.CharField(max_length=50, unique=True)
    payment_date    = models.DateField()
    fiscal_year     = models.ForeignKey(FiscalYear, on_delete=models.SET_NULL, null=True, blank=True)
    accounting_period = models.ForeignKey(AccountingPeriod, on_delete=models.SET_NULL, null=True, blank=True)

    payment_mode    = models.CharField(max_length=10, choices=PAYMENT_MODE_CHOICES)
    party_type      = models.CharField(max_length=10, choices=PARTY_TYPE_CHOICES)

    # Party — only one FK will be set based on party_type
    vendor          = models.ForeignKey('masters.Vendor', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    employee        = models.ForeignKey('hr_payroll.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')

    # Bank account the payment goes from
    bank_account    = models.ForeignKey('banking.BankAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments_out')

    amount          = models.DecimalField(max_digits=14, decimal_places=2)
    tds_amount      = models.DecimalField(max_digits=12, decimal_places=2, default=0)   # TDS deducted at source
    net_amount      = models.DecimalField(max_digits=14, decimal_places=2)              # amount - tds_amount

    # Cheque details (when mode=cheque)
    cheque_number   = models.CharField(max_length=50, blank=True)
    cheque_date     = models.DateField(null=True, blank=True)
    bank_name       = models.CharField(max_length=200, blank=True)

    narration       = models.TextField(blank=True)
    reference       = models.CharField(max_length=100, blank=True)
    status          = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft')
    journal_entry   = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_payment'
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"{self.payment_number} | {self.net_amount}"


# ============================================================
# RECEIPT VOUCHER
# Incoming payment: receiving money from a customer.
# ============================================================
class Receipt(models.Model):

    RECEIPT_MODE_CHOICES = [
        ('cash',   'Cash'),
        ('cheque', 'Cheque'),
        ('neft',   'NEFT'),
        ('rtgs',   'RTGS'),
        ('imps',   'IMPS'),
        ('upi',    'UPI'),
        ('online', 'Online Payment Gateway'),
    ]

    STATUS_CHOICES = [
        ('draft',    'Draft'),
        ('posted',   'Posted'),
        ('deposited','Deposited'),   # Cheque deposited in bank
        ('cleared',  'Cleared'),
        ('bounced',  'Bounced'),
        ('cancelled','Cancelled'),
    ]

    company         = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    receipt_number  = models.CharField(max_length=50, unique=True)
    receipt_date    = models.DateField()
    fiscal_year     = models.ForeignKey(FiscalYear, on_delete=models.SET_NULL, null=True, blank=True)
    accounting_period = models.ForeignKey(AccountingPeriod, on_delete=models.SET_NULL, null=True, blank=True)

    receipt_mode    = models.CharField(max_length=10, choices=RECEIPT_MODE_CHOICES)
    customer        = models.ForeignKey('masters.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='receipts')

    bank_account    = models.ForeignKey('banking.BankAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='receipts_in')

    amount          = models.DecimalField(max_digits=14, decimal_places=2)
    tcs_amount      = models.DecimalField(max_digits=12, decimal_places=2, default=0)   # TCS collected on sale

    cheque_number   = models.CharField(max_length=50, blank=True)
    cheque_date     = models.DateField(null=True, blank=True)
    bank_name       = models.CharField(max_length=200, blank=True)

    # Online payment gateway (stub — enabled later)
    gateway_reference   = models.CharField(max_length=100, blank=True)
    gateway_provider    = models.CharField(max_length=50, blank=True)   # razorpay, cashfree, etc.

    narration       = models.TextField(blank=True)
    reference       = models.CharField(max_length=100, blank=True)
    status          = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft')
    journal_entry   = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='receipts')
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_receipt'
        ordering = ['-receipt_date', '-created_at']

    def __str__(self):
        return f"{self.receipt_number} | {self.amount}"


# ============================================================
# PAYMENT ALLOCATION
# Maps a payment/receipt to specific invoice(s) it clears.
# A single payment can partially or fully clear one or more invoices.
# ============================================================
class PaymentAllocation(models.Model):
    payment         = models.ForeignKey(Payment, on_delete=models.CASCADE, null=True, blank=True, related_name='allocations')
    receipt         = models.ForeignKey(Receipt, on_delete=models.CASCADE, null=True, blank=True, related_name='allocations')

    # The invoice being cleared — only one of these will be set
    purchase_invoice = models.ForeignKey('purchase.PurchaseInvoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='allocations')
    sales_invoice    = models.ForeignKey('dispatch.SalesInvoice',    on_delete=models.SET_NULL, null=True, blank=True, related_name='allocations')

    allocated_amount = models.DecimalField(max_digits=14, decimal_places=2)
    allocation_date  = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'finance_payment_allocation'

    def __str__(self):
        src = self.payment or self.receipt
        return f"{src} → ₹{self.allocated_amount}"


# ============================================================
# CONTRA ENTRY / FUND TRANSFER
# Moving money between two bank accounts or cash/bank.
# Stored separately from Payment so it's easy to identify.
# ============================================================
class ContraEntry(models.Model):
    STATUS_CHOICES = [
        ('draft',  'Draft'),
        ('posted', 'Posted'),
    ]

    company         = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    contra_number   = models.CharField(max_length=50, unique=True)
    entry_date      = models.DateField()
    from_account    = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='contra_from')
    to_account      = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='contra_to')
    amount          = models.DecimalField(max_digits=14, decimal_places=2)
    narration       = models.TextField(blank=True)
    status          = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    journal_entry   = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True)
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_contra_entry'
        ordering = ['-entry_date']

    def __str__(self):
        return f"{self.contra_number} | ₹{self.amount}"


# ============================================================
# CREDIT NOTE
# Issued to customer when goods are returned or price adjusted downward.
# Reduces accounts receivable.
# ============================================================
class CreditNote(models.Model):
    STATUS_CHOICES = [
        ('draft',    'Draft'),
        ('posted',   'Posted'),
        ('adjusted', 'Adjusted Against Invoice'),
    ]

    company         = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    credit_note_number = models.CharField(max_length=50, unique=True)
    credit_note_date   = models.DateField()
    customer        = models.ForeignKey('masters.Customer', on_delete=models.PROTECT, related_name='credit_notes')
    sales_invoice   = models.ForeignKey('dispatch.SalesInvoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='credit_notes')
    reason          = models.CharField(max_length=200, blank=True)
    taxable_amount  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cgst_amount     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst_amount     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst_amount     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount    = models.DecimalField(max_digits=14, decimal_places=2)
    status          = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft')
    journal_entry   = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True)
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_credit_note'
        ordering = ['-credit_note_date']

    def __str__(self):
        return f"{self.credit_note_number} | {self.customer} | ₹{self.total_amount}"


# ============================================================
# DEBIT NOTE
# Issued to vendor when goods are returned or price adjustment needed.
# Reduces accounts payable.
# ============================================================
class DebitNote(models.Model):
    STATUS_CHOICES = [
        ('draft',    'Draft'),
        ('posted',   'Posted'),
        ('adjusted', 'Adjusted Against Bill'),
    ]

    company         = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    debit_note_number  = models.CharField(max_length=50, unique=True)
    debit_note_date    = models.DateField()
    vendor          = models.ForeignKey('masters.Vendor', on_delete=models.PROTECT, related_name='debit_notes')
    purchase_invoice = models.ForeignKey('purchase.PurchaseInvoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='debit_notes')
    reason          = models.CharField(max_length=200, blank=True)
    taxable_amount  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    cgst_amount     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst_amount     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    igst_amount     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount    = models.DecimalField(max_digits=14, decimal_places=2)
    status          = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft')
    journal_entry   = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True)
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'finance_debit_note'
        ordering = ['-debit_note_date']

    def __str__(self):
        return f"{self.debit_note_number} | {self.vendor} | ₹{self.total_amount}"


# ============================================================
# BUDGET
# Annual budget per account per period for variance analysis.
# Only active when module_budget is enabled in CompanySettings.
# ============================================================
class Budget(models.Model):
    company         = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    fiscal_year     = models.ForeignKey(FiscalYear, on_delete=models.CASCADE)
    budget_name     = models.CharField(max_length=100)
    is_active       = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'finance_budget'
        unique_together = ('company', 'fiscal_year', 'budget_name')

    def __str__(self):
        return f"{self.budget_name} | {self.fiscal_year.year_name}"


class BudgetLine(models.Model):
    budget          = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='lines')
    account         = models.ForeignKey(Account, on_delete=models.PROTECT)
    period          = models.ForeignKey(AccountingPeriod, on_delete=models.PROTECT)
    budgeted_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table        = 'finance_budget_line'
        unique_together = ('budget', 'account', 'period')

    def __str__(self):
        return f"{self.budget} | {self.account.account_code} | {self.period.period_name} | {self.budgeted_amount}"
