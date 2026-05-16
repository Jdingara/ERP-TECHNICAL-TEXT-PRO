from django.contrib import admin
from .models import GSTRate, HSNCode, SACCode, GSTLedger, GSTR1Summary, GSTR3BSummary, EInvoice, EWayBill, GSTChallan

@admin.register(GSTRate)
class GSTRateAdmin(admin.ModelAdmin):
    list_display = ['rate_name', 'total_rate', 'cgst_rate', 'sgst_rate', 'igst_rate', 'is_active']
    list_filter  = ['is_active']

@admin.register(HSNCode)
class HSNCodeAdmin(admin.ModelAdmin):
    list_display = ['hsn_code', 'description', 'gst_rate', 'is_active']
    search_fields = ['hsn_code', 'description']

@admin.register(SACCode)
class SACCodeAdmin(admin.ModelAdmin):
    list_display = ['sac_code', 'description', 'gst_rate', 'is_active']
    search_fields = ['sac_code', 'description']

@admin.register(GSTLedger)
class GSTLedgerAdmin(admin.ModelAdmin):
    list_display  = ['transaction_date', 'transaction_type', 'document_number', 'party_name', 'taxable_amount', 'total_tax_amount', 'supply_type']
    list_filter   = ['transaction_type', 'supply_type', 'company']
    search_fields = ['document_number', 'party_name', 'party_gstin']
    date_hierarchy = 'transaction_date'

@admin.register(GSTR1Summary)
class GSTR1SummaryAdmin(admin.ModelAdmin):
    list_display = ['company', 'accounting_period', 'status', 'filed_date', 'arn_number']
    list_filter  = ['status', 'company']

@admin.register(GSTR3BSummary)
class GSTR3BSummaryAdmin(admin.ModelAdmin):
    list_display = ['company', 'accounting_period', 'status', 'filed_date']
    list_filter  = ['status', 'company']

@admin.register(EInvoice)
class EInvoiceAdmin(admin.ModelAdmin):
    list_display = ['sales_invoice', 'irn', 'status', 'integration_enabled', 'created_at']
    list_filter  = ['status', 'integration_enabled']

@admin.register(EWayBill)
class EWayBillAdmin(admin.ModelAdmin):
    list_display = ['dispatch', 'ewb_number', 'status', 'valid_upto', 'integration_enabled']
    list_filter  = ['status', 'integration_enabled']

@admin.register(GSTChallan)
class GSTChallanAdmin(admin.ModelAdmin):
    list_display = ['company', 'accounting_period', 'challan_number', 'payment_date', 'status']
    list_filter  = ['status', 'company']
