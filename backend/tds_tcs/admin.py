from django.contrib import admin
from .models import TDSSection, VendorTDSConfig, TDSDeduction, TDSReturn, TCSSection, TCSCollection

@admin.register(TDSSection)
class TDSSectionAdmin(admin.ModelAdmin):
    list_display  = ['section_code', 'nature_of_payment', 'rate_individual_huf', 'rate_company', 'annual_threshold', 'is_active']
    list_filter   = ['is_active', 'is_salary_section']
    search_fields = ['section_code', 'nature_of_payment']

@admin.register(VendorTDSConfig)
class VendorTDSConfigAdmin(admin.ModelAdmin):
    list_display  = ['vendor', 'section', 'deductee_type', 'tds_exempt', 'lower_deduction_rate']
    list_filter   = ['deductee_type', 'tds_exempt']
    search_fields = ['vendor__supplier_name']

@admin.register(TDSDeduction)
class TDSDeductionAdmin(admin.ModelAdmin):
    list_display   = ['deduction_date', 'section', 'party_name', 'party_pan', 'transaction_amount', 'tds_rate', 'total_tds', 'status']
    list_filter    = ['status', 'section', 'party_type', 'company']
    search_fields  = ['party_name', 'party_pan', 'challan_number']
    date_hierarchy = 'deduction_date'

@admin.register(TDSReturn)
class TDSReturnAdmin(admin.ModelAdmin):
    list_display = ['company', 'fiscal_year', 'form_type', 'quarter', 'total_tds_deposited', 'status', 'filed_date']
    list_filter  = ['form_type', 'quarter', 'status']

@admin.register(TCSSection)
class TCSSectionAdmin(admin.ModelAdmin):
    list_display = ['section_code', 'goods_description', 'rate_percentage', 'threshold_amount', 'is_active']
    list_filter  = ['is_active']

@admin.register(TCSCollection)
class TCSCollectionAdmin(admin.ModelAdmin):
    list_display   = ['collection_date', 'section', 'customer_name', 'customer_pan', 'transaction_amount', 'tcs_amount', 'status']
    list_filter    = ['status', 'section', 'company']
    search_fields  = ['customer_name', 'customer_pan', 'challan_number']
    date_hierarchy = 'collection_date'
