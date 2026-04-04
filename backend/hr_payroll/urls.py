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

    # Salary
    path('salary/',                                 views.salary_list_and_process,      name='salary-list'),
    path('salary/<int:salary_id>/',                 views.salary_detail,                name='salary-detail'),
    path('salary/<int:salary_id>/paid/',            views.salary_mark_paid,             name='salary-paid'),
]
