from django.contrib import admin
from .models import BankAccount, BankTransaction, ChequeBook, ChequeEntry, FundTransfer, BankReconciliation, PettyCash, PettyCashEntry

@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display  = ['account_name', 'bank_name', 'account_number', 'account_type', 'currency', 'is_active']
    list_filter   = ['account_type', 'currency', 'is_active', 'company']
    search_fields = ['account_name', 'account_number', 'bank_name', 'ifsc_code']

@admin.register(BankTransaction)
class BankTransactionAdmin(admin.ModelAdmin):
    list_display   = ['transaction_date', 'bank_account', 'transaction_type', 'amount', 'narration', 'is_reconciled', 'source']
    list_filter    = ['transaction_type', 'is_reconciled', 'source', 'bank_account']
    search_fields  = ['narration', 'reference', 'bank_reference']
    date_hierarchy = 'transaction_date'

@admin.register(ChequeBook)
class ChequeBookAdmin(admin.ModelAdmin):
    list_display = ['bank_account', 'series_start', 'series_end', 'leaves', 'issued_date', 'is_active']

@admin.register(ChequeEntry)
class ChequeEntryAdmin(admin.ModelAdmin):
    list_display  = ['cheque_type', 'cheque_number', 'cheque_date', 'amount', 'party_name', 'status']
    list_filter   = ['cheque_type', 'status', 'bank_account']
    search_fields = ['cheque_number', 'party_name']

@admin.register(FundTransfer)
class FundTransferAdmin(admin.ModelAdmin):
    list_display = ['transfer_number', 'transfer_date', 'from_account', 'to_account', 'amount', 'transfer_mode', 'status']
    list_filter  = ['transfer_mode', 'status']

@admin.register(BankReconciliation)
class BankReconciliationAdmin(admin.ModelAdmin):
    list_display = ['bank_account', 'statement_date', 'statement_closing', 'book_balance', 'difference', 'status']
    list_filter  = ['status', 'bank_account']

@admin.register(PettyCash)
class PettyCashAdmin(admin.ModelAdmin):
    list_display = ['fund_name', 'company', 'custodian', 'opening_balance', 'is_active']

@admin.register(PettyCashEntry)
class PettyCashEntryAdmin(admin.ModelAdmin):
    list_display = ['entry_date', 'entry_type', 'amount', 'description', 'petty_cash']
    list_filter  = ['entry_type']
