# ============================================================
# FILE: banking/models.py
# PURPOSE: Bank accounts, transactions, cheques, deposits,
#          fund transfers, and bank reconciliation.
#
# Bank feed auto-import is a stub — set bank_feed_enabled=True
# and configure the provider once Account Aggregator / Setu
# credentials are available.
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from master_data.models import Company


# ============================================================
# BANK ACCOUNT
# Each bank account the company holds — current, savings, OD, CC.
# Linked to a GL account in Chart of Accounts for auto-journaling.
# ============================================================
class BankAccount(models.Model):

    ACCOUNT_TYPE_CHOICES = [
        ('current',  'Current Account'),
        ('savings',  'Savings Account'),
        ('od',       'Overdraft Account'),
        ('cc',       'Cash Credit Account'),
        ('fdrd',     'FD / RD'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    account_name        = models.CharField(max_length=200)              # "SBI Current A/C"
    account_number      = models.CharField(max_length=50)
    bank_name           = models.CharField(max_length=200)
    branch_name         = models.CharField(max_length=200, blank=True)
    ifsc_code           = models.CharField(max_length=15, blank=True)
    micr_code           = models.CharField(max_length=15, blank=True)
    swift_code          = models.CharField(max_length=15, blank=True)   # For international wires
    account_type        = models.CharField(max_length=10, choices=ACCOUNT_TYPE_CHOICES, default='current')
    currency            = models.CharField(max_length=3, default='INR')

    opening_balance     = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    opening_balance_date = models.DateField(null=True, blank=True)

    # Link to Chart of Accounts — journal entries debit/credit this GL account
    gl_account          = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, null=True, blank=True, related_name='bank_accounts')

    # Bank feed integration stub — disabled until AA/Setu credentials configured
    bank_feed_enabled   = models.BooleanField(default=False)
    bank_feed_provider  = models.CharField(max_length=50, blank=True)  # setu, finbox, razorpay_x
    bank_feed_account_id = models.CharField(max_length=100, blank=True)

    is_active           = models.BooleanField(default=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'banking_bank_account'
        ordering = ['account_name']

    def __str__(self):
        return f"{self.account_name} — {self.bank_name} ({self.account_number[-4:]})"

    @property
    def current_balance(self):
        from django.db.models import Sum
        credits = self.transactions.filter(transaction_type='credit').aggregate(Sum('amount'))['amount__sum'] or 0
        debits  = self.transactions.filter(transaction_type='debit').aggregate(Sum('amount'))['amount__sum'] or 0
        return self.opening_balance + credits - debits


# ============================================================
# BANK TRANSACTION
# Every credit or debit in a bank account.
# Created automatically when a payment/receipt/transfer is posted.
# Can also be imported from bank statement (CSV/OFX) or bank feed.
# ============================================================
class BankTransaction(models.Model):

    TRANSACTION_TYPE_CHOICES = [
        ('credit', 'Credit (Money In)'),
        ('debit',  'Debit (Money Out)'),
    ]

    SOURCE_CHOICES = [
        ('payment',   'Payment Voucher'),
        ('receipt',   'Receipt Voucher'),
        ('transfer',  'Fund Transfer'),
        ('contra',    'Contra Entry'),
        ('import',    'Bank Statement Import'),
        ('bank_feed', 'Bank Feed (Auto-import)'),
        ('manual',    'Manual Entry'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    bank_account        = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='transactions')

    transaction_date    = models.DateField()
    value_date          = models.DateField(null=True, blank=True)       # Bank value date
    transaction_type    = models.CharField(max_length=6, choices=TRANSACTION_TYPE_CHOICES)
    amount              = models.DecimalField(max_digits=16, decimal_places=2)
    balance_after       = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)

    narration           = models.CharField(max_length=500)
    reference           = models.CharField(max_length=100, blank=True)  # Cheque no / UTR / reference
    bank_reference      = models.CharField(max_length=100, blank=True)  # Bank's own transaction ID

    is_reconciled       = models.BooleanField(default=False, db_index=True)
    reconciled_date     = models.DateField(null=True, blank=True)

    source              = models.CharField(max_length=10, choices=SOURCE_CHOICES, default='manual')

    # Source document — only one will be set
    payment             = models.ForeignKey('finance.Payment', on_delete=models.SET_NULL, null=True, blank=True, related_name='bank_transactions')
    receipt             = models.ForeignKey('finance.Receipt', on_delete=models.SET_NULL, null=True, blank=True, related_name='bank_transactions')
    fund_transfer       = models.ForeignKey('banking.FundTransfer', on_delete=models.SET_NULL, null=True, blank=True, related_name='bank_transactions')

    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'banking_transaction'
        ordering = ['-transaction_date', '-created_at']
        indexes  = [models.Index(fields=['bank_account', 'transaction_date'])]

    def __str__(self):
        return f"{self.transaction_date} | {self.transaction_type.upper()} | ₹{self.amount} | {self.narration[:40]}"


# ============================================================
# CHEQUE BOOK
# Register of issued cheque books for a bank account.
# ============================================================
class ChequeBook(models.Model):
    bank_account        = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='cheque_books')
    series_start        = models.CharField(max_length=15)   # First cheque number e.g., "000001"
    series_end          = models.CharField(max_length=15)   # Last cheque number e.g., "000050"
    leaves              = models.IntegerField(default=50)
    issued_date         = models.DateField()
    is_active           = models.BooleanField(default=True)
    notes               = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'banking_cheque_book'

    def __str__(self):
        return f"{self.bank_account.account_name} | {self.series_start}–{self.series_end}"


# ============================================================
# CHEQUE ENTRY
# Individual cheque issued or received.
# Issued cheques link to a Payment; received cheques link to a Receipt.
# ============================================================
class ChequeEntry(models.Model):

    CHEQUE_TYPE_CHOICES = [
        ('issued',   'Cheque Issued (Outgoing)'),
        ('received', 'Cheque Received (Incoming)'),
    ]

    STATUS_CHOICES = [
        ('issued',    'Issued'),
        ('deposited', 'Deposited'),
        ('cleared',   'Cleared'),
        ('bounced',   'Bounced'),
        ('cancelled', 'Cancelled / Stopped'),
        ('stale',     'Stale / Expired'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    bank_account        = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='cheques')
    cheque_type         = models.CharField(max_length=10, choices=CHEQUE_TYPE_CHOICES)
    cheque_number       = models.CharField(max_length=30)
    cheque_date         = models.DateField()
    amount              = models.DecimalField(max_digits=14, decimal_places=2)

    # Party
    party_name          = models.CharField(max_length=200)
    party_bank          = models.CharField(max_length=200, blank=True)

    status              = models.CharField(max_length=15, choices=STATUS_CHOICES, default='issued')
    deposited_date      = models.DateField(null=True, blank=True)
    cleared_date        = models.DateField(null=True, blank=True)
    bounce_reason       = models.CharField(max_length=200, blank=True)

    payment             = models.ForeignKey('finance.Payment', on_delete=models.SET_NULL, null=True, blank=True, related_name='cheques')
    receipt             = models.ForeignKey('finance.Receipt', on_delete=models.SET_NULL, null=True, blank=True, related_name='cheques')

    notes               = models.CharField(max_length=300, blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'banking_cheque_entry'
        ordering = ['-cheque_date']

    def __str__(self):
        return f"{'OUT' if self.cheque_type == 'issued' else 'IN'} | {self.cheque_number} | ₹{self.amount} | {self.status}"


# ============================================================
# FUND TRANSFER
# Money moved between two of the company's bank accounts.
# Auto-creates a Contra journal entry when posted.
# ============================================================
class FundTransfer(models.Model):

    TRANSFER_MODE_CHOICES = [
        ('neft',     'NEFT'),
        ('rtgs',     'RTGS'),
        ('imps',     'IMPS'),
        ('upi',      'UPI'),
        ('internal', 'Internal Transfer'),
        ('cheque',   'Cheque'),
    ]

    STATUS_CHOICES = [
        ('draft',  'Draft'),
        ('posted', 'Posted'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    transfer_number     = models.CharField(max_length=50, unique=True)
    transfer_date       = models.DateField()
    from_account        = models.ForeignKey(BankAccount, on_delete=models.PROTECT, related_name='transfers_out')
    to_account          = models.ForeignKey(BankAccount, on_delete=models.PROTECT, related_name='transfers_in')
    amount              = models.DecimalField(max_digits=14, decimal_places=2)
    transfer_mode       = models.CharField(max_length=10, choices=TRANSFER_MODE_CHOICES)
    reference           = models.CharField(max_length=100, blank=True)  # UTR number
    narration           = models.TextField(blank=True)
    status              = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    journal_entry       = models.ForeignKey('finance.JournalEntry', on_delete=models.SET_NULL, null=True, blank=True)
    created_by          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'banking_fund_transfer'
        ordering = ['-transfer_date']

    def __str__(self):
        return f"{self.transfer_number} | {self.from_account} → {self.to_account} | ₹{self.amount}"


# ============================================================
# BANK RECONCILIATION
# Monthly reconciliation: match book entries to bank statement.
# Stores the closing balance from bank statement and computed
# book balance; difference should be zero after matching.
# ============================================================
class BankReconciliation(models.Model):

    STATUS_CHOICES = [
        ('draft',     'Draft'),
        ('completed', 'Completed'),
    ]

    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    bank_account        = models.ForeignKey(BankAccount, on_delete=models.PROTECT, related_name='reconciliations')
    reconciliation_date = models.DateField()
    statement_date      = models.DateField()                            # Date on bank statement

    statement_opening   = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    statement_closing   = models.DecimalField(max_digits=16, decimal_places=2)
    book_balance        = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    difference          = models.DecimalField(max_digits=14, decimal_places=2, default=0)   # Should be 0

    # Unreconciled items at close
    outstanding_cheques     = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    deposits_in_transit     = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    bank_charges_unrecorded = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    status              = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    notes               = models.TextField(blank=True)
    completed_by        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    completed_at        = models.DateTimeField(null=True, blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = 'banking_reconciliation'
        unique_together = ('bank_account', 'statement_date')
        ordering        = ['-statement_date']

    def __str__(self):
        return f"Recon | {self.bank_account.account_name} | {self.statement_date} | {self.status}"


# ============================================================
# PETTY CASH
# Small cash fund for day-to-day petty expenses.
# ============================================================
class PettyCash(models.Model):
    company             = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    fund_name           = models.CharField(max_length=100, default='Petty Cash')
    custodian           = models.CharField(max_length=100, blank=True)
    opening_balance     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gl_account          = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, null=True, blank=True)
    is_active           = models.BooleanField(default=True)

    class Meta:
        db_table = 'banking_petty_cash'

    def __str__(self):
        return f"{self.fund_name} — {self.company.name}"


class PettyCashEntry(models.Model):
    ENTRY_TYPE_CHOICES = [
        ('receipt',  'Cash Received (Replenishment)'),
        ('payment',  'Cash Paid (Expense)'),
    ]

    petty_cash          = models.ForeignKey(PettyCash, on_delete=models.CASCADE, related_name='entries')
    entry_date          = models.DateField()
    entry_type          = models.CharField(max_length=10, choices=ENTRY_TYPE_CHOICES)
    amount              = models.DecimalField(max_digits=10, decimal_places=2)
    description         = models.CharField(max_length=300)
    voucher_number      = models.CharField(max_length=50, blank=True)
    expense_account     = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, null=True, blank=True)
    journal_entry       = models.ForeignKey('finance.JournalEntry', on_delete=models.SET_NULL, null=True, blank=True)
    created_by          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'banking_petty_cash_entry'
        ordering = ['-entry_date']

    def __str__(self):
        return f"{self.entry_date} | {self.entry_type} | ₹{self.amount} | {self.description[:40]}"
