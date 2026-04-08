# ============================================================
# FILE: hr_payroll/views.py
# PURPOSE: API endpoints for HR and Payroll module.
#          Departments, Employees, Attendance, Salary.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, Count
import json

from .models import Department, Employee, Attendance, SalaryRecord
from master_data.doc_series_utils import generate_next_number
from authentication.audit import log_action, field_diff


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def department_to_dict(d):
    return {'id': d.id, 'name': d.name, 'code': d.code, 'description': d.description, 'is_active': d.is_active}

def employee_to_dict(e):
    return {
        'id':               e.id,
        'employee_code':    e.employee_code,
        'full_name':        e.full_name,
        'first_name':       e.first_name,
        'last_name':        e.last_name,
        'gender':           e.gender,
        'phone':            e.phone,
        'email':            e.email,
        'department':       e.department.name if e.department else '',
        'department_id':    e.department_id,
        'designation':      e.designation,
        'employment_type':  e.employment_type,
        'date_of_joining':  str(e.date_of_joining),
        'status':           e.status,
        'basic_salary':     str(e.basic_salary),
        'hra':              str(e.hra),
        'da':               str(e.da),
        'other_allowance':  str(e.other_allowance),
        'gross_salary':     str(e.gross_salary),
        'bank_name':        e.bank_name,
        'bank_account':     e.bank_account,
        'pan_number':       e.pan_number,
        'pf_number':        e.pf_number,
    }

def attendance_to_dict(a):
    return {
        'id':               a.id,
        'employee_id':      a.employee_id,
        'employee_code':    a.employee.employee_code,
        'employee_name':    a.employee.full_name,
        'date':             str(a.date),
        'status':           a.status,
        'shift':            a.shift,
        'overtime_hours':   str(a.overtime_hours),
        'notes':            a.notes,
    }

def salary_to_dict(s):
    return {
        'id':               s.id,
        'employee_id':      s.employee_id,
        'employee_code':    s.employee.employee_code,
        'employee_name':    s.employee.full_name,
        'department':       s.employee.department.name if s.employee.department else '',
        'month':            s.month,
        'year':             s.year,
        'working_days':     s.working_days,
        'present_days':     str(s.present_days),
        'absent_days':      str(s.absent_days),
        'basic_salary':     str(s.basic_salary),
        'hra':              str(s.hra),
        'da':               str(s.da),
        'other_allowance':  str(s.other_allowance),
        'overtime_pay':     str(s.overtime_pay),
        'gross_earnings':   str(s.gross_earnings),
        'pf_deduction':     str(s.pf_deduction),
        'esi_deduction':    str(s.esi_deduction),
        'other_deduction':  str(s.other_deduction),
        'total_deductions': str(s.total_deductions),
        'net_salary':       str(s.net_salary),
        'status':           s.status,
        'paid_date':        str(s.paid_date) if s.paid_date else '',
    }


# ============================================================
# DEPARTMENTS
# ============================================================

@csrf_exempt
def department_list_and_create(request):
    if request.method == 'GET':
        depts = Department.objects.filter(is_active=True)
        return JsonResponse({'departments': [department_to_dict(d) for d in depts]})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            dept = Department.objects.create(
                name=data['name'], code=data['code'],
                description=data.get('description', '')
            )
            return JsonResponse({'message': 'Department created.', 'department': department_to_dict(dept)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


# ============================================================
# EMPLOYEES
# ============================================================

@csrf_exempt
def employee_list_and_create(request):
    if request.method == 'GET':
        employees = Employee.objects.select_related('department').filter(status='active')
        search = request.GET.get('search', '')
        if search:
            employees = employees.filter(first_name__icontains=search) | \
                        Employee.objects.filter(employee_code__icontains=search, status='active')
        dept_id = request.GET.get('department_id', '')
        if dept_id:
            employees = employees.filter(department_id=dept_id)
        return JsonResponse({'employees': [employee_to_dict(e) for e in employees], 'total': employees.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            emp_code = generate_next_number('employee') or data.get('employee_code', '').strip()
            if not emp_code:
                return JsonResponse({'message': 'Employee code required or enable auto-numbering in Format Panel.'}, status=400)
            emp = Employee.objects.create(
                employee_code   = emp_code,
                first_name      = data['first_name'],
                last_name       = data.get('last_name', ''),
                gender          = data.get('gender', 'male'),
                date_of_birth   = data.get('date_of_birth') or None,
                phone           = data.get('phone', ''),
                email           = data.get('email', ''),
                address         = data.get('address', ''),
                department_id   = data.get('department_id') or None,
                designation     = data.get('designation', ''),
                employment_type = data.get('employment_type', 'permanent'),
                date_of_joining = data['date_of_joining'],
                basic_salary    = data.get('basic_salary', 0),
                hra             = data.get('hra', 0),
                da              = data.get('da', 0),
                other_allowance = data.get('other_allowance', 0),
                bank_name       = data.get('bank_name', ''),
                bank_account    = data.get('bank_account', ''),
                ifsc_code       = data.get('ifsc_code', ''),
                pan_number      = data.get('pan_number', ''),
                aadhar_number   = data.get('aadhar_number', ''),
                pf_number       = data.get('pf_number', ''),
                esi_number      = data.get('esi_number', ''),
            )
            log_action(request, 'Employee', 'Created', emp.employee_code,
                       {'name': emp.full_name, 'designation': emp.designation, 'department': emp.department.name if emp.department else ''})
            return JsonResponse({'message': 'Employee created.', 'employee': employee_to_dict(emp)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def employee_detail_update(request, employee_id):
    try:
        emp = Employee.objects.get(id=employee_id)
    except Employee.DoesNotExist:
        return JsonResponse({'message': 'Employee not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'employee': employee_to_dict(emp)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        before = {'status': emp.status, 'designation': emp.designation, 'basic_salary': str(emp.basic_salary)}
        for field in ['first_name', 'last_name', 'phone', 'email', 'address',
                      'designation', 'employment_type', 'status',
                      'basic_salary', 'hra', 'da', 'other_allowance',
                      'bank_name', 'bank_account', 'ifsc_code', 'pan_number']:
            if field in data:
                setattr(emp, field, data[field])
        if 'department_id' in data:
            emp.department_id = data['department_id'] or None
        emp.save()
        after = {'status': emp.status, 'designation': emp.designation, 'basic_salary': str(emp.basic_salary)}
        diff = field_diff(before, after)
        if diff:
            log_action(request, 'Employee', 'Updated', emp.employee_code, {'name': emp.full_name, 'changes': diff})
        return JsonResponse({'message': 'Employee updated.', 'employee': employee_to_dict(emp)})


# ============================================================
# ATTENDANCE
# ============================================================

@csrf_exempt
def attendance_list_and_create(request):
    if request.method == 'GET':
        attendance = Attendance.objects.select_related('employee').all()
        date_filter = request.GET.get('date', '')
        emp_id = request.GET.get('employee_id', '')
        if date_filter:
            attendance = attendance.filter(date=date_filter)
        if emp_id:
            attendance = attendance.filter(employee_id=emp_id)
        return JsonResponse({'attendance': [attendance_to_dict(a) for a in attendance[:200]]})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            att, created = Attendance.objects.update_or_create(
                employee_id = data['employee_id'],
                date        = data['date'],
                defaults    = {
                    'status':           data.get('status', 'present'),
                    'shift':            data.get('shift', ''),
                    'overtime_hours':   data.get('overtime_hours', 0),
                    'notes':            data.get('notes', ''),
                }
            )
            msg = 'Attendance recorded.' if created else 'Attendance updated.'
            return JsonResponse({'message': msg, 'attendance': attendance_to_dict(att)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


# ============================================================
# SALARY PROCESSING
# Auto-calculates salary based on attendance and salary structure
# ============================================================

@csrf_exempt
def salary_list_and_process(request):
    if request.method == 'GET':
        salaries = SalaryRecord.objects.select_related('employee', 'employee__department').all()
        month = request.GET.get('month', '')
        year  = request.GET.get('year', '')
        if month: salaries = salaries.filter(month=month)
        if year:  salaries = salaries.filter(year=year)
        return JsonResponse({'salaries': [salary_to_dict(s) for s in salaries]})

    if request.method == 'POST':
        # Process salary for an employee for a given month/year
        data = json.loads(request.body)
        try:
            emp     = Employee.objects.get(id=data['employee_id'])
            month   = int(data['month'])
            year    = int(data['year'])
            working_days = int(data.get('working_days', 26))

            # Count attendance for the month
            att = Attendance.objects.filter(employee=emp, date__month=month, date__year=year)
            present_days    = att.filter(status__in=['present']).count()
            half_days       = att.filter(status='half_day').count()
            overtime_hours  = att.aggregate(Sum('overtime_hours'))['overtime_hours__sum'] or 0
            present_days    = present_days + (half_days * 0.5)
            absent_days     = working_days - present_days

            # Calculate proportional salary
            ratio           = present_days / working_days if working_days > 0 else 1
            basic           = float(emp.basic_salary) * ratio
            hra             = float(emp.hra) * ratio
            da              = float(emp.da) * ratio
            other           = float(emp.other_allowance) * ratio
            overtime_pay    = float(overtime_hours) * (float(emp.basic_salary) / (working_days * 8)) * 1.5
            gross           = basic + hra + da + other + overtime_pay

            # Deductions
            pf_deduction    = basic * 0.12           # 12% of basic
            esi_deduction   = gross * 0.0075         # 0.75% of gross (employee share)
            other_deduction = float(data.get('other_deduction', 0))
            total_deductions = pf_deduction + esi_deduction + other_deduction
            net_salary      = gross - total_deductions

            salary, created = SalaryRecord.objects.update_or_create(
                employee=emp, month=month, year=year,
                defaults={
                    'working_days':     working_days,
                    'present_days':     present_days,
                    'absent_days':      absent_days,
                    'overtime_hours':   overtime_hours,
                    'basic_salary':     round(basic, 2),
                    'hra':              round(hra, 2),
                    'da':               round(da, 2),
                    'other_allowance':  round(other, 2),
                    'overtime_pay':     round(overtime_pay, 2),
                    'gross_earnings':   round(gross, 2),
                    'pf_deduction':     round(pf_deduction, 2),
                    'esi_deduction':    round(esi_deduction, 2),
                    'other_deduction':  round(other_deduction, 2),
                    'total_deductions': round(total_deductions, 2),
                    'net_salary':       round(net_salary, 2),
                    'status':           'draft',
                }
            )
            return JsonResponse({'message': 'Salary processed.', 'salary': salary_to_dict(salary)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def salary_detail(request, salary_id):
    """ GET = salary details | DELETE = delete draft salary """
    try:
        salary = SalaryRecord.objects.select_related('employee', 'employee__department').get(id=salary_id)
    except SalaryRecord.DoesNotExist:
        return JsonResponse({'message': 'Salary record not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'salary': salary_to_dict(salary)})

    if request.method == 'DELETE':
        if salary.status == 'paid':
            return JsonResponse({'message': 'Cannot delete a paid salary record. It is a financial record.'}, status=400)
        salary.delete()
        return JsonResponse({'message': 'Salary record deleted.'})


@csrf_exempt
def salary_mark_paid(request, salary_id):
    """ Mark salary as paid """
    try:
        salary = SalaryRecord.objects.get(id=salary_id)
        from django.utils import timezone
        salary.status    = 'paid'
        salary.paid_date = timezone.now().date()
        salary.save()
        return JsonResponse({'message': 'Salary marked as paid.', 'salary': salary_to_dict(salary)})
    except SalaryRecord.DoesNotExist:
        return JsonResponse({'message': 'Salary record not found.'}, status=404)
