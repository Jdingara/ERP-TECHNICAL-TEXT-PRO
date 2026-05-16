from django.contrib import admin
from .models import (Department, Employee, Attendance, SalaryRecord,
                     EmployeeStatutory, ProfessionalTaxSlab, SalaryStructure, SalaryComponent,
                     EmployeeSalaryAssignment, PayrollPeriod, PaySlip, PaySlipLine,
                     LeaveType, LeaveApplication)

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'company', 'is_active']

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display  = ['employee_code', 'full_name', 'department', 'designation', 'employment_type', 'status', 'company']
    list_filter   = ['status', 'employment_type', 'department', 'company']
    search_fields = ['employee_code', 'first_name', 'last_name', 'pan_number', 'esi_number']

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display   = ['employee', 'date', 'status', 'shift', 'overtime_hours']
    list_filter    = ['status', 'shift']
    date_hierarchy = 'date'

@admin.register(SalaryRecord)
class SalaryRecordAdmin(admin.ModelAdmin):
    list_display = ['employee', 'month', 'year', 'gross_earnings', 'net_salary', 'status']
    list_filter  = ['status', 'year', 'month']

@admin.register(EmployeeStatutory)
class EmployeeStatutoryAdmin(admin.ModelAdmin):
    list_display = ['employee', 'pf_applicable', 'esi_applicable', 'pt_applicable', 'tds_on_salary', 'tax_regime']

@admin.register(ProfessionalTaxSlab)
class ProfessionalTaxSlabAdmin(admin.ModelAdmin):
    list_display = ['state', 'slab_from', 'slab_to', 'pt_amount', 'effective_from', 'is_active']
    list_filter  = ['state', 'is_active']

class SalaryComponentInline(admin.TabularInline):
    model = SalaryComponent
    extra = 0

@admin.register(SalaryStructure)
class SalaryStructureAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'is_active']
    inlines      = [SalaryComponentInline]

@admin.register(EmployeeSalaryAssignment)
class EmployeeSalaryAssignmentAdmin(admin.ModelAdmin):
    list_display = ['employee', 'structure', 'basic_salary', 'effective_from', 'effective_to']

class PaySlipInline(admin.TabularInline):
    model = PaySlip
    extra = 0
    readonly_fields = ['employee', 'gross_earnings', 'net_salary', 'status']

@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ['period_name', 'company', 'status', 'total_gross', 'total_net', 'payment_date']
    list_filter  = ['status', 'company']
    inlines      = [PaySlipInline]

class PaySlipLineInline(admin.TabularInline):
    model = PaySlipLine
    extra = 0

@admin.register(PaySlip)
class PaySlipAdmin(admin.ModelAdmin):
    list_display = ['employee', 'period', 'gross_earnings', 'pf_employee', 'esi_employee', 'professional_tax', 'net_salary', 'status']
    list_filter  = ['status', 'period', 'company']
    inlines      = [PaySlipLineInline]

@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_paid', 'max_days_per_year', 'carry_forward']

@admin.register(LeaveApplication)
class LeaveApplicationAdmin(admin.ModelAdmin):
    list_display   = ['employee', 'leave_type', 'from_date', 'to_date', 'total_days', 'status']
    list_filter    = ['status', 'leave_type']
    date_hierarchy = 'from_date'
