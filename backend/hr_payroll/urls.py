# ============================================================
# FILE: hr_payroll/urls.py
# PURPOSE: URL routes for HR and Payroll module.
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    # Departments
    path('departments/',                            views.department_list_and_create,   name='dept-list'),

    # Employees
    path('employees/',                              views.employee_list_and_create,     name='emp-list'),
    path('employees/<int:employee_id>/',            views.employee_detail_update,       name='emp-detail'),

    # Attendance
    path('attendance/',                             views.attendance_list_and_create,   name='attendance-list'),

    # Salary (legacy)
    path('salary/',                                 views.salary_list_and_process,      name='salary-list'),
    path('salary/<int:salary_id>/',                 views.salary_detail,                name='salary-detail'),
    path('salary/<int:salary_id>/paid/',            views.salary_mark_paid,             name='salary-paid'),

    # Salary Structures
    path('structures/',                             views.salary_structure_list,        name='structure-list'),
    path('structures/<int:pk>/',                    views.salary_structure_detail,      name='structure-detail'),

    # Employee Statutory Details
    path('employees/<int:employee_id>/statutory/', views.employee_statutory,           name='emp-statutory'),

    # Professional Tax Slabs
    path('pt-slabs/',                               views.pt_slab_list,                name='pt-slab-list'),

    # Payroll Periods (payroll runs)
    path('payroll-periods/',                        views.payroll_period_list,          name='payroll-period-list'),
    path('payroll-periods/<int:pk>/',               views.payroll_period_detail,        name='payroll-period-detail'),
    path('payroll-periods/<int:pk>/run/',           views.payroll_period_run,           name='payroll-period-run'),
    path('payroll-periods/<int:pk>/post/',          views.payroll_period_post,          name='payroll-period-post'),

    # Payslips
    path('payslips/',                               views.payslip_list,                name='payslip-list'),
    path('payslips/<int:pk>/',                      views.payslip_detail,              name='payslip-detail'),
    path('payslips/<int:pk>/approve/',              views.payslip_approve,             name='payslip-approve'),

    # Leave
    path('leave-types/',                            views.leave_type_list,             name='leave-type-list'),
    path('leave-applications/',                     views.leave_application_list,      name='leave-app-list'),
    path('leave-applications/<int:pk>/approve/',    views.leave_application_approve,   name='leave-app-approve'),

    # Payroll Dashboard
    path('dashboard/',                              views.payroll_dashboard,           name='payroll-dashboard'),
]
