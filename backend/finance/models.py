# ============================================================
# FILE: finance/models.py
# PURPOSE: Database tables for finance and accounting module.
#          Chart of Accounts → Journal Entries → Ledger
#          Standard double-entry bookkeeping system.
# ============================================================

from django.db import models
from django.contrib.auth.models import User


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
