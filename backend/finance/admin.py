from django.contrib import admin
from .models import (AccountType, Account, JournalEntry, JournalEntryLine,
                     CostCenter, FiscalYear, AccountingPeriod,
                     Payment, Receipt, PaymentAllocation, ContraEntry,
                     CreditNote, DebitNote, Budget, BudgetLine)

@admin.register(AccountType)
class AccountTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'normal_balance']

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display  = ['account_code', 'account_name', 'account_category', 'company', 'is_active']
    list_filter   = ['account_category', 'is_active', 'company']
    search_fields = ['account_code', 'account_name']

class JournalEntryLineInline(admin.TabularInline):
    model = JournalEntryLine
    extra = 0

@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display   = ['entry_number', 'entry_date', 'description', 'status', 'reference', 'company']
    list_filter    = ['status', 'company']
    search_fields  = ['entry_number', 'description', 'reference']
    date_hierarchy = 'entry_date'
    inlines        = [JournalEntryLineInline]

@admin.register(CostCenter)
class CostCenterAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'company', 'is_active']

@admin.register(FiscalYear)
class FiscalYearAdmin(admin.ModelAdmin):
    list_display = ['year_name', 'company', 'start_date', 'end_date', 'is_active', 'is_closed']
    list_filter  = ['is_active', 'is_closed', 'company']

@admin.register(AccountingPeriod)
class AccountingPeriodAdmin(admin.ModelAdmin):
    list_display = ['period_name', 'fiscal_year', 'period_number', 'start_date', 'end_date', 'is_closed']
    list_filter  = ['is_closed', 'fiscal_year']

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display   = ['payment_number', 'payment_date', 'payment_mode', 'party_type', 'amount', 'tds_amount', 'net_amount', 'status']
    list_filter    = ['status', 'payment_mode', 'party_type', 'company']
    search_fields  = ['payment_number', 'cheque_number', 'narration']
    date_hierarchy = 'payment_date'

@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display   = ['receipt_number', 'receipt_date', 'receipt_mode', 'amount', 'status']
    list_filter    = ['status', 'receipt_mode', 'company']
    search_fields  = ['receipt_number', 'cheque_number', 'narration']
    date_hierarchy = 'receipt_date'

@admin.register(CreditNote)
class CreditNoteAdmin(admin.ModelAdmin):
    list_display = ['credit_note_number', 'credit_note_date', 'customer', 'total_amount', 'status']
    list_filter  = ['status', 'company']

@admin.register(DebitNote)
class DebitNoteAdmin(admin.ModelAdmin):
    list_display = ['debit_note_number', 'debit_note_date', 'vendor', 'total_amount', 'status']
    list_filter  = ['status', 'company']

@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ['budget_name', 'company', 'fiscal_year', 'is_active']
