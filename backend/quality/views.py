# ============================================================
# FILE: quality/views.py
# PURPOSE: Quality Inspection CRUD + QC Dashboard
#          Inspection result updates Batch status automatically
# ============================================================

import json
import datetime
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db import transaction
from django.db.models import Q, Sum

from master_data.company_utils import get_active_company
from .models import Inspection, DefectType, InspectionDefect, SampleTest
from production_exec.models import Batch


# ── Serializers ───────────────────────────────────────────────

def defect_dict(d):
    return {
        'id': d.id,
        'defect_type_id': d.defect_type_id,
        'defect_name': d.defect_name,
        'quantity': str(d.quantity),
        'notes': d.notes,
    }


def inspection_dict(insp, include_defects=False):
    d = {
        'id': insp.id,
        'inspection_number': insp.inspection_number,
        'batch_id': insp.batch_id,
        'batch_number': insp.batch.batch_number if insp.batch else '',
        'product_name': (
            insp.batch.production_order.product.design_name
            if insp.batch and insp.batch.production_order and insp.batch.production_order.product
            else ''
        ),
        'inspection_stage': insp.inspection_stage,
        'inspection_date': str(insp.inspection_date),
        'inspected_by': insp.inspected_by,
        'inspected_qty': str(insp.inspected_qty),
        'passed_qty': str(insp.passed_qty),
        'rejected_qty': str(insp.rejected_qty),
        'rework_qty': str(insp.rework_qty),
        'rejection_pct': insp.rejection_pct,
        'result': insp.result,
        'defect_category': insp.defect_category,
        'remarks': insp.remarks,
        'created_at': insp.created_at.strftime('%Y-%m-%d %H:%M'),
    }
    if include_defects:
        d['defects'] = [defect_dict(df) for df in insp.defects.all()]
    return d


def defect_type_dict(dt):
    return {
        'id': dt.id,
        'name': dt.name,
        'stage': dt.stage,
        'description': dt.description,
        'is_active': dt.is_active,
    }


# ── Auto-number helper ────────────────────────────────────────

def next_inspection_number():
    today = datetime.date.today().strftime('%Y%m%d')
    count = Inspection.objects.filter(inspection_number__startswith=f'QC-{today}').count()
    return f"QC-{today}-{str(count + 1).zfill(3)}"


# ── Inspection List / Create ──────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def inspection_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = Inspection.objects.filter(company=company).select_related(
            'batch__production_order__product'
        )
        stage = request.GET.get('stage')
        result = request.GET.get('result')
        batch_id = request.GET.get('batch_id')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        search = request.GET.get('search', '').strip()

        if stage:
            qs = qs.filter(inspection_stage=stage)
        if result:
            qs = qs.filter(result=result)
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        if date_from:
            qs = qs.filter(inspection_date__gte=date_from)
        if date_to:
            qs = qs.filter(inspection_date__lte=date_to)
        if search:
            qs = qs.filter(
                Q(inspection_number__icontains=search) |
                Q(batch__batch_number__icontains=search) |
                Q(batch__production_order__product__design_name__icontains=search)
            )
        return JsonResponse({'inspections': [inspection_dict(i) for i in qs]})

    data = json.loads(request.body)
    batch_id = data.get('batch_id')
    try:
        batch = Batch.objects.get(pk=batch_id, company=company)
    except Batch.DoesNotExist:
        return JsonResponse({'error': 'Batch not found'}, status=404)

    with transaction.atomic():
        insp = Inspection.objects.create(
            company=company,
            inspection_number=next_inspection_number(),
            batch=batch,
            inspection_stage=data['inspection_stage'],
            inspection_date=data.get('inspection_date', str(datetime.date.today())),
            inspected_by=data.get('inspected_by', ''),
            inspected_qty=data.get('inspected_qty', 0),
            passed_qty=data.get('passed_qty', 0),
            rejected_qty=data.get('rejected_qty', 0),
            rework_qty=data.get('rework_qty', 0),
            result=data['result'],
            defect_category=data.get('defect_category', ''),
            remarks=data.get('remarks', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )

        # Save defect details
        for def_data in data.get('defects', []):
            InspectionDefect.objects.create(
                inspection=insp,
                defect_type_id=def_data.get('defect_type_id') or None,
                defect_name=def_data.get('defect_name', ''),
                quantity=def_data.get('quantity', 0),
                notes=def_data.get('notes', ''),
            )

        # Auto-update batch status based on inspection result
        result = data['result']
        if result == 'pass':
            if data.get('inspection_stage') == 'finished':
                batch.status = 'finished'
            else:
                batch.status = 'qc_passed'
        elif result == 'fail':
            batch.status = 'qc_failed'
        elif result == 'rework':
            batch.status = 'rework'
        # 'hold' — leave batch status unchanged
        batch.save()

    return JsonResponse({'success': True, 'inspection': inspection_dict(insp, include_defects=True)}, status=201)


# ── Inspection Detail ─────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'PUT'])
def inspection_detail(request, pk):
    try:
        insp = Inspection.objects.get(pk=pk)
    except Inspection.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'inspection': inspection_dict(insp, include_defects=True)})

    data = json.loads(request.body)
    with transaction.atomic():
        insp.inspected_qty = data.get('inspected_qty', insp.inspected_qty)
        insp.passed_qty = data.get('passed_qty', insp.passed_qty)
        insp.rejected_qty = data.get('rejected_qty', insp.rejected_qty)
        insp.rework_qty = data.get('rework_qty', insp.rework_qty)
        insp.result = data.get('result', insp.result)
        insp.defect_category = data.get('defect_category', insp.defect_category)
        insp.remarks = data.get('remarks', insp.remarks)
        insp.inspected_by = data.get('inspected_by', insp.inspected_by)

        if 'defects' in data:
            insp.defects.all().delete()
            for def_data in data['defects']:
                InspectionDefect.objects.create(
                    inspection=insp,
                    defect_type_id=def_data.get('defect_type_id') or None,
                    defect_name=def_data.get('defect_name', ''),
                    quantity=def_data.get('quantity', 0),
                    notes=def_data.get('notes', ''),
                )
        insp.save()
    return JsonResponse({'success': True, 'inspection': inspection_dict(insp, include_defects=True)})


# ── QC Dashboard ──────────────────────────────────────────────
# Summary stats for quality screen

@csrf_exempt
@require_http_methods(['GET'])
def qc_dashboard(request):
    company = get_active_company(request)
    today = datetime.date.today()
    month_start = today.replace(day=1)

    total_today = Inspection.objects.filter(company=company, inspection_date=today).count()
    passed_today = Inspection.objects.filter(company=company, inspection_date=today, result='pass').count()
    rejected_today = Inspection.objects.filter(company=company, inspection_date=today, result='fail').count()
    rework_today = Inspection.objects.filter(company=company, inspection_date=today, result='rework').count()

    month_inspections = Inspection.objects.filter(company=company, inspection_date__gte=month_start)
    month_total_qty = month_inspections.aggregate(t=Sum('inspected_qty'))['t'] or 0
    month_rejected_qty = month_inspections.aggregate(t=Sum('rejected_qty'))['t'] or 0
    month_rejection_pct = round(
        (float(month_rejected_qty) / float(month_total_qty)) * 100, 1
    ) if month_total_qty > 0 else 0

    # Batches pending QC
    qc_pending = Batch.objects.filter(company=company, status='qc_pending').count()
    in_rework = Batch.objects.filter(company=company, status='rework').count()

    # Top defects this month
    from django.db.models import Count
    top_defects = (
        InspectionDefect.objects
        .filter(inspection__company=company, inspection__inspection_date__gte=month_start)
        .values('defect_name')
        .annotate(count=Count('id'))
        .order_by('-count')[:5]
    )

    return JsonResponse({
        'today': {
            'total': total_today,
            'passed': passed_today,
            'rejected': rejected_today,
            'rework': rework_today,
        },
        'month': {
            'total_inspected_qty': str(month_total_qty),
            'total_rejected_qty': str(month_rejected_qty),
            'rejection_pct': month_rejection_pct,
        },
        'pending_qc_batches': qc_pending,
        'rework_batches': in_rework,
        'top_defects': list(top_defects),
    })


# ── Defect Type List / Create ─────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def defect_type_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = DefectType.objects.filter(company=company, is_active=True)
        stage = request.GET.get('stage')
        if stage:
            qs = qs.filter(stage=stage)
        return JsonResponse({'defect_types': [defect_type_dict(dt) for dt in qs]})

    data = json.loads(request.body)
    dt = DefectType.objects.create(
        company=company,
        name=data['name'],
        stage=data.get('stage', ''),
        description=data.get('description', ''),
    )
    return JsonResponse({'success': True, 'defect_type': defect_type_dict(dt)}, status=201)


# ── Sample Testing ────────────────────────────────────────────

def sample_test_dict(st):
    return {
        'id':                  st.id,
        'test_number':         st.test_number,
        'batch_id':            st.batch_id,
        'batch_number':        st.batch.batch_number if st.batch else '',
        'product_name':        (st.batch.production_order.product.design_name
                                if st.batch and st.batch.production_order and st.batch.production_order.product else ''),
        'test_date':           str(st.test_date),
        'tested_by':           st.tested_by,
        'tensile_strength':    str(st.tensile_strength) if st.tensile_strength is not None else '',
        'elongation_pct':      str(st.elongation_pct)   if st.elongation_pct   is not None else '',
        'width_cm':            str(st.width_cm)          if st.width_cm          is not None else '',
        'weight_per_sqm':      str(st.weight_per_sqm)   if st.weight_per_sqm   is not None else '',
        'breaking_strength':   str(st.breaking_strength) if st.breaking_strength is not None else '',
        'tear_strength':       str(st.tear_strength)     if st.tear_strength     is not None else '',
        'custom_param_name':   st.custom_param_name,
        'custom_param_value':  st.custom_param_value,
        'result':              st.result,
        'remarks':             st.remarks,
        'created_at':          st.created_at.strftime('%Y-%m-%d'),
    }


@csrf_exempt
@require_http_methods(['GET', 'POST'])
def sample_test_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = SampleTest.objects.filter(company=company).select_related(
            'batch__production_order__product')
        result = request.GET.get('result')
        if result:
            qs = qs.filter(result=result)
        return JsonResponse({'sample_tests': [sample_test_dict(st) for st in qs]})

    data = json.loads(request.body)
    st = SampleTest.objects.create(
        company=company,
        batch_id=data['batch_id'],
        test_date=data['test_date'],
        tested_by=data.get('tested_by', ''),
        tensile_strength=data.get('tensile_strength') or None,
        elongation_pct=data.get('elongation_pct')     or None,
        width_cm=data.get('width_cm')                 or None,
        weight_per_sqm=data.get('weight_per_sqm')     or None,
        breaking_strength=data.get('breaking_strength') or None,
        tear_strength=data.get('tear_strength')        or None,
        custom_param_name=data.get('custom_param_name', ''),
        custom_param_value=data.get('custom_param_value', ''),
        result=data.get('result', 'pending'),
        remarks=data.get('remarks', ''),
        created_by=request.user if request.user.is_authenticated else None,
    )
    return JsonResponse({'success': True, 'sample_test': sample_test_dict(st)}, status=201)


@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def sample_test_detail(request, pk):
    company = get_active_company(request)
    try:
        st = SampleTest.objects.get(id=pk, company=company)
    except SampleTest.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'sample_test': sample_test_dict(st)})

    if request.method == 'DELETE':
        st.delete()
        return JsonResponse({'success': True})

    data = json.loads(request.body)
    st.result  = data.get('result', st.result)
    st.remarks = data.get('remarks', st.remarks)
    for f in ['tensile_strength', 'elongation_pct', 'width_cm', 'weight_per_sqm',
              'breaking_strength', 'tear_strength', 'custom_param_name', 'custom_param_value']:
        if f in data:
            setattr(st, f, data[f] or None if f not in ['custom_param_name', 'custom_param_value'] else data[f])
    st.save()
    return JsonResponse({'success': True, 'sample_test': sample_test_dict(st)})
