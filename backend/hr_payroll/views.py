# ============================================================
# FILE: hr_payroll/views.py
# PURPOSE: API endpoints for HR and Payroll module.
#          Departments, Employees, Attendance, Salary.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, Count
import json

from .models import (Department, Employee, Attendance, SalaryRecord,
                     EmployeeStatutory, ProfessionalTaxSlab, SalaryStructure, SalaryComponent,
                     EmployeeSalaryAssignment, PayrollPeriod, PaySlip, PaySlipLine,
                     LeaveType, LeaveApplication)
from master_data.doc_series_utils import generate_next_number
from master_data.company_utils import get_active_company
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
    company = get_active_company(request)

    if request.method == 'GET':
        depts = Department.objects.filter(is_active=True)
        if company:
            depts = depts.filter(company=company)
        return JsonResponse({'departments': [department_to_dict(d) for d in depts]})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            dept = Department.objects.create(
                company=company,
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
    company = get_active_company(request)

    if request.method == 'GET':
        employees = Employee.objects.select_related('department').filter(status='active')
        if company:
            employees = employees.filter(company=company)
        search = request.GET.get('search', '')
        if search:
            employees = employees.filter(first_name__icontains=search) | \
                        employees.filter(employee_code__icontains=search)
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
                company         = company,
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
        _fields = ['first_name', 'last_name', 'phone', 'email', 'address', 'designation', 'employment_type', 'status', 'basic_salary', 'hra', 'da', 'other_allowance', 'bank_name', 'bank_account', 'pan_number']
        before = {f: str(getattr(emp, f, '') or '') for f in _fields}
        for field in ['first_name', 'last_name', 'phone', 'email', 'address',
                      'designation', 'employment_type', 'status',
                      'basic_salary', 'hra', 'da', 'other_allowance',
                      'bank_name', 'bank_account', 'ifsc_code', 'pan_number']:
            if field in data:
                setattr(emp, field, data[field])
        if 'department_id' in data:
            emp.department_id = data['department_id'] or None
        emp.save()
        after = {f: str(getattr(emp, f, '') or '') for f in _fields}
        log_action(request, 'Employee', 'Updated', emp.employee_code, {'name': emp.full_name, 'changes': field_diff(before, after)})
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


# ============================================================
# SALARY STRUCTURE
# ============================================================

@csrf_exempt
def salary_structure_list(request):
    company = get_active_company(request)
    qs = SalaryStructure.objects.filter(company=company, is_active=True) if company else SalaryStructure.objects.filter(is_active=True)

    if request.method == 'GET':
        result = []
        for s in qs:
            components = [
                {'id': c.id, 'component_name': c.component_name, 'component_code': c.component_code,
                 'component_type': c.component_type, 'calculation_type': c.calculation_type,
                 'amount': str(c.amount), 'percentage': str(c.percentage), 'sequence': c.sequence}
                for c in s.components.all().order_by('sequence')
            ]
            result.append({'id': s.id, 'name': s.name, 'description': s.description, 'components': components})
        return JsonResponse({'salary_structures': result})

    if request.method == 'POST':
        data = json.loads(request.body)
        s = SalaryStructure.objects.create(company=company, name=data['name'], description=data.get('description', ''))
        for comp in data.get('components', []):
            SalaryComponent.objects.create(
                structure=s, component_name=comp['component_name'], component_code=comp['component_code'],
                component_type=comp['component_type'], calculation_type=comp['calculation_type'],
                amount=comp.get('amount', 0), percentage=comp.get('percentage', 0),
                is_taxable=comp.get('is_taxable', True), is_pf_applicable=comp.get('is_pf_applicable', False),
                is_esi_applicable=comp.get('is_esi_applicable', False), sequence=comp.get('sequence', 10),
            )
        return JsonResponse({'message': 'Salary structure created.', 'id': s.id}, status=201)


@csrf_exempt
def salary_structure_detail(request, pk):
    try:
        s = SalaryStructure.objects.get(id=pk)
    except SalaryStructure.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'GET':
        components = [
            {'id': c.id, 'component_name': c.component_name, 'component_code': c.component_code,
             'component_type': c.component_type, 'calculation_type': c.calculation_type,
             'amount': str(c.amount), 'percentage': str(c.percentage)}
            for c in s.components.all().order_by('sequence')
        ]
        return JsonResponse({'salary_structure': {'id': s.id, 'name': s.name, 'components': components}})
    if request.method == 'PUT':
        data = json.loads(request.body)
        s.name = data.get('name', s.name)
        s.save()
        return JsonResponse({'message': 'Updated.'})


# ============================================================
# EMPLOYEE STATUTORY
# ============================================================

@csrf_exempt
def employee_statutory(request, employee_id):
    try:
        emp = Employee.objects.get(id=employee_id)
    except Employee.DoesNotExist:
        return JsonResponse({'message': 'Employee not found.'}, status=404)

    stat, _ = EmployeeStatutory.objects.get_or_create(employee=emp)
    if request.method == 'GET':
        return JsonResponse({'statutory': {
            'uan_number': stat.uan_number, 'pf_applicable': stat.pf_applicable,
            'pf_rate_employee': str(stat.pf_rate_employee), 'pf_ceiling': str(stat.pf_ceiling),
            'esi_applicable': stat.esi_applicable, 'esi_ceiling': str(stat.esi_ceiling),
            'pt_applicable': stat.pt_applicable, 'pt_state': stat.pt_state,
            'tds_on_salary': stat.tds_on_salary, 'tax_regime': stat.tax_regime,
        }})
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['uan_number', 'pf_applicable', 'pf_ceiling', 'esi_applicable', 'esi_ceiling',
                  'pt_applicable', 'pt_state', 'tds_on_salary', 'tax_regime']:
            if f in data:
                setattr(stat, f, data[f])
        stat.save()
        return JsonResponse({'message': 'Statutory details saved.'})


# ============================================================
# PROFESSIONAL TAX SLABS
# ============================================================

def pt_slab_list(request):
    state = request.GET.get('state', '')
    qs = ProfessionalTaxSlab.objects.filter(is_active=True)
    if state:
        qs = qs.filter(state=state)
    return JsonResponse({'pt_slabs': [
        {'id': p.id, 'state': p.state, 'slab_from': str(p.slab_from),
         'slab_to': str(p.slab_to) if p.slab_to else None,
         'pt_amount': str(p.pt_amount), 'effective_from': str(p.effective_from)}
        for p in qs.order_by('state', 'slab_from')
    ]})


# ============================================================
# PAYROLL PERIOD
# ============================================================

def _period_to_dict(p):
    return {
        'id': p.id, 'period_name': p.period_name, 'period_month': p.period_month,
        'period_year': p.period_year, 'start_date': str(p.start_date), 'end_date': str(p.end_date),
        'payment_date': str(p.payment_date) if p.payment_date else None,
        'working_days': p.working_days, 'status': p.status,
        'total_gross': str(p.total_gross), 'total_net': str(p.total_net),
        'total_pf_employee': str(p.total_pf_employee), 'total_esi_employee': str(p.total_esi_employee),
        'total_pt': str(p.total_pt), 'total_tds': str(p.total_tds),
    }


@csrf_exempt
def payroll_period_list(request):
    company = get_active_company(request)
    qs = PayrollPeriod.objects.filter(company=company) if company else PayrollPeriod.objects.all()
    if request.method == 'GET':
        return JsonResponse({'payroll_periods': [_period_to_dict(p) for p in qs.order_by('-period_year', '-period_month')]})
    if request.method == 'POST':
        data = json.loads(request.body)
        p = PayrollPeriod.objects.create(
            company=company, period_name=data['period_name'],
            period_month=data['period_month'], period_year=data['period_year'],
            start_date=data['start_date'], end_date=data['end_date'],
            payment_date=data.get('payment_date') or None,
            working_days=data.get('working_days', 26), status='draft',
            created_by=request.user if request.user.is_authenticated else None,
        )
        return JsonResponse({'message': 'Payroll period created.', 'payroll_period': _period_to_dict(p)}, status=201)


@csrf_exempt
def payroll_period_detail(request, pk):
    try:
        p = PayrollPeriod.objects.get(id=pk)
    except PayrollPeriod.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'payroll_period': _period_to_dict(p)})
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['payment_date', 'working_days', 'status']:
            if f in data:
                setattr(p, f, data[f])
        p.save()
        return JsonResponse({'message': 'Updated.', 'payroll_period': _period_to_dict(p)})


@csrf_exempt
def payroll_period_run(request, pk):
    """Generate payslips for all active employees. Calculates PF, ESI, PT automatically."""
    from django.db import models as django_models
    try:
        period = PayrollPeriod.objects.get(id=pk)
    except PayrollPeriod.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if period.status != 'draft':
        return JsonResponse({'message': 'Can only run a draft payroll period.'}, status=400)

    company = period.company
    employees = Employee.objects.filter(company=company, status='active')
    from django.db import transaction as db_transaction
    created_count = 0

    with db_transaction.atomic():
        for emp in employees:
            if PaySlip.objects.filter(period=period, employee=emp).exists():
                continue
            try:
                stat = emp.statutory
            except EmployeeStatutory.DoesNotExist:
                stat = None

            gross = float(emp.gross_salary)
            basic = float(emp.basic_salary)
            pf_base = min(basic, float(stat.pf_ceiling) if stat else 15000)
            pf_ee = round(pf_base * 0.12, 2) if (stat and stat.pf_applicable) else 0
            pf_er = pf_ee
            esi_ceiling = float(stat.esi_ceiling) if stat else 21000
            esi_ee = round(gross * 0.0075, 2) if (stat and stat.esi_applicable and gross <= esi_ceiling) else 0
            esi_er = round(gross * 0.0325, 2) if esi_ee > 0 else 0
            pt_state = stat.pt_state if stat else ''
            pt = 0
            if pt_state and stat and stat.pt_applicable:
                slab = ProfessionalTaxSlab.objects.filter(
                    state=pt_state, is_active=True, slab_from__lte=gross
                ).filter(
                    django_models.Q(slab_to__gte=gross) | django_models.Q(slab_to__isnull=True)
                ).first()
                pt = float(slab.pt_amount) if slab else 0

            total_deductions = pf_ee + esi_ee + pt
            net = round(gross - total_deductions, 2)

            payslip = PaySlip.objects.create(
                company=company, period=period, employee=emp,
                working_days=period.working_days, paid_days=period.working_days,
                gross_earnings=gross, pf_employee=pf_ee, pf_employer=pf_er,
                esi_employee=esi_ee, esi_employer=esi_er, professional_tax=pt,
                total_deductions=total_deductions, net_salary=net,
                bank_account_number=emp.bank_account, bank_ifsc=emp.ifsc_code, status='draft',
            )
            PaySlipLine.objects.create(payslip=payslip, component_name='Basic', component_code='BASIC', component_type='earning', amount=emp.basic_salary)
            PaySlipLine.objects.create(payslip=payslip, component_name='HRA', component_code='HRA', component_type='earning', amount=emp.hra)
            if float(emp.da):
                PaySlipLine.objects.create(payslip=payslip, component_name='DA', component_code='DA', component_type='earning', amount=emp.da)
            if float(emp.other_allowance):
                PaySlipLine.objects.create(payslip=payslip, component_name='Other Allowance', component_code='OTH', component_type='earning', amount=emp.other_allowance)
            if pf_ee:
                PaySlipLine.objects.create(payslip=payslip, component_name='PF Employee', component_code='PF_EE', component_type='deduction', amount=pf_ee)
            if esi_ee:
                PaySlipLine.objects.create(payslip=payslip, component_name='ESI Employee', component_code='ESI_EE', component_type='deduction', amount=esi_ee)
            if pt:
                PaySlipLine.objects.create(payslip=payslip, component_name='Professional Tax', component_code='PT', component_type='deduction', amount=pt)
            if pf_er:
                PaySlipLine.objects.create(payslip=payslip, component_name='PF Employer', component_code='PF_ER', component_type='employer_contribution', amount=pf_er)
            if esi_er:
                PaySlipLine.objects.create(payslip=payslip, component_name='ESI Employer', component_code='ESI_ER', component_type='employer_contribution', amount=esi_er)
            created_count += 1

        period.status = 'processing'
        payslips = PaySlip.objects.filter(period=period)
        period.total_gross       = payslips.aggregate(Sum('gross_earnings'))['gross_earnings__sum'] or 0
        period.total_deductions  = payslips.aggregate(Sum('total_deductions'))['total_deductions__sum'] or 0
        period.total_net         = payslips.aggregate(Sum('net_salary'))['net_salary__sum'] or 0
        period.total_pf_employee = payslips.aggregate(Sum('pf_employee'))['pf_employee__sum'] or 0
        period.total_pf_employer = payslips.aggregate(Sum('pf_employer'))['pf_employer__sum'] or 0
        period.total_esi_employee= payslips.aggregate(Sum('esi_employee'))['esi_employee__sum'] or 0
        period.total_esi_employer= payslips.aggregate(Sum('esi_employer'))['esi_employer__sum'] or 0
        period.total_pt          = payslips.aggregate(Sum('professional_tax'))['professional_tax__sum'] or 0
        period.total_tds         = payslips.aggregate(Sum('tds_on_salary'))['tds_on_salary__sum'] or 0
        period.save()

    return JsonResponse({'message': f'Payroll run complete. {created_count} payslips generated.', 'payroll_period': _period_to_dict(period)})


@csrf_exempt
def payroll_period_post(request, pk):
    try:
        period = PayrollPeriod.objects.get(id=pk)
    except PayrollPeriod.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if period.status not in ('processing', 'draft'):
        return JsonResponse({'message': f'Cannot post from {period.status} status.'}, status=400)
    PaySlip.objects.filter(period=period, status='draft').update(status='approved')
    period.status = 'posted'
    period.save()
    log_action(request, 'Payroll', 'Payroll Period Posted', period.period_name, {'total_net': str(period.total_net)})
    return JsonResponse({'message': 'Payroll posted.', 'payroll_period': _period_to_dict(period)})


# ============================================================
# PAYSLIPS
# ============================================================

def _payslip_to_dict(p, include_lines=False):
    d = {
        'id': p.id, 'period_name': p.period.period_name,
        'employee_code': p.employee.employee_code, 'employee_name': p.employee.full_name,
        'working_days': p.working_days, 'paid_days': str(p.paid_days),
        'gross_earnings': str(p.gross_earnings),
        'pf_employee': str(p.pf_employee), 'pf_employer': str(p.pf_employer),
        'esi_employee': str(p.esi_employee), 'esi_employer': str(p.esi_employer),
        'professional_tax': str(p.professional_tax), 'tds_on_salary': str(p.tds_on_salary),
        'total_deductions': str(p.total_deductions), 'net_salary': str(p.net_salary), 'status': p.status,
    }
    if include_lines:
        d['lines'] = [{'component_name': l.component_name, 'component_type': l.component_type, 'amount': str(l.amount)} for l in p.lines.all()]
    return d


def payslip_list(request):
    company = get_active_company(request)
    qs = PaySlip.objects.filter(company=company).select_related('employee', 'period') if company else PaySlip.objects.select_related('employee', 'period').all()
    period_id = request.GET.get('period', '')
    if period_id:
        qs = qs.filter(period_id=period_id)
    return JsonResponse({'payslips': [_payslip_to_dict(p) for p in qs]})


def payslip_detail(request, pk):
    try:
        p = PaySlip.objects.get(id=pk)
    except PaySlip.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    return JsonResponse({'payslip': _payslip_to_dict(p, include_lines=True)})


@csrf_exempt
def payslip_approve(request, pk):
    try:
        p = PaySlip.objects.get(id=pk)
    except PaySlip.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    p.status = 'approved'
    p.save()
    return JsonResponse({'message': 'Payslip approved.', 'payslip': _payslip_to_dict(p)})


# ============================================================
# LEAVE
# ============================================================

def leave_type_list(request):
    company = get_active_company(request)
    qs = LeaveType.objects.filter(company=company, is_active=True) if company else LeaveType.objects.filter(is_active=True)
    return JsonResponse({'leave_types': [
        {'id': l.id, 'name': l.name, 'code': l.code, 'is_paid': l.is_paid, 'max_days_per_year': l.max_days_per_year}
        for l in qs
    ]})


@csrf_exempt
def leave_application_list(request):
    company = get_active_company(request)
    qs = LeaveApplication.objects.filter(employee__company=company).select_related('employee', 'leave_type') if company else LeaveApplication.objects.select_related('employee', 'leave_type').all()
    status_f = request.GET.get('status', '')
    if status_f:
        qs = qs.filter(status=status_f)
    if request.method == 'GET':
        return JsonResponse({'leave_applications': [
            {'id': l.id, 'employee_name': l.employee.full_name, 'leave_type': l.leave_type.code,
             'from_date': str(l.from_date), 'to_date': str(l.to_date), 'total_days': str(l.total_days),
             'status': l.status, 'reason': l.reason}
            for l in qs.order_by('-from_date')
        ]})
    if request.method == 'POST':
        data = json.loads(request.body)
        from datetime import date
        from_dt = date.fromisoformat(data['from_date'])
        to_dt   = date.fromisoformat(data['to_date'])
        l = LeaveApplication.objects.create(
            employee_id=data['employee_id'], leave_type_id=data['leave_type_id'],
            from_date=from_dt, to_date=to_dt, total_days=(to_dt - from_dt).days + 1,
            reason=data.get('reason', ''), status='pending',
        )
        return JsonResponse({'message': 'Leave application submitted.', 'id': l.id}, status=201)


@csrf_exempt
def leave_application_approve(request, pk):
    try:
        l = LeaveApplication.objects.get(id=pk)
    except LeaveApplication.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    data = json.loads(request.body)
    from django.utils import timezone
    l.status = data.get('status', 'approved')
    l.approved_by = request.user if request.user.is_authenticated else None
    l.approved_at = timezone.now()
    l.notes = data.get('notes', '')
    l.save()
    return JsonResponse({'message': f'Leave {l.status}.'})


# ============================================================
# PAYROLL DASHBOARD
# ============================================================

def payroll_dashboard(request):
    company = get_active_company(request)
    emp_qs     = Employee.objects.filter(company=company)     if company else Employee.objects.all()
    payslip_qs = PaySlip.objects.filter(company=company)      if company else PaySlip.objects.all()
    leave_qs   = LeaveApplication.objects.filter(employee__company=company, status='pending') if company else LeaveApplication.objects.filter(status='pending')
    return JsonResponse({
        'total_employees': emp_qs.filter(status='active').count(),
        'total_payroll_ytd': str(payslip_qs.aggregate(Sum('net_salary'))['net_salary__sum'] or 0),
        'total_pf_ytd': str(payslip_qs.aggregate(Sum('pf_employee'))['pf_employee__sum'] or 0),
        'total_esi_ytd': str(payslip_qs.aggregate(Sum('esi_employee'))['esi_employee__sum'] or 0),
        'total_pt_ytd': str(payslip_qs.aggregate(Sum('professional_tax'))['professional_tax__sum'] or 0),
        'pending_leave_approvals': leave_qs.count(),
    })
