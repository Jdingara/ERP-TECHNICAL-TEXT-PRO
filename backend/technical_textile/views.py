# ============================================================
# FILE: technical_textile/views.py
# PURPOSE: API endpoints for Technical Textile module.
#          Covers: Categories, Performance Specs, Samples,
#          Technical Data Sheets, Testing Lab, R&D Projects.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from datetime import date

from .models import (
    TechnicalProductCategory, PerformanceSpec, Sample,
    TechnicalDataSheet, TestingLabRecord, RDProject
)


# ── Helper: decimal or None ───────────────────────────────────
def dn(val):
    return float(val) if val not in (None, '', '0', 0) else None

# ── Auto-number generator ─────────────────────────────────────
def next_number(prefix, model, field):
    today = date.today().strftime('%Y%m%d')
    full_prefix = f'{prefix}-{today}-'
    last = model.objects.filter(**{f'{field}__startswith': full_prefix}).order_by(f'-{field}').first()
    num = int(getattr(last, field).split('-')[-1]) + 1 if last else 1
    return f'{full_prefix}{str(num).zfill(3)}'

# ── Dict helpers ──────────────────────────────────────────────
def category_to_dict(c):
    return {'id': c.id, 'name': c.name, 'code': c.code,
            'description': c.description, 'application': c.application}

def spec_to_dict(s):
    return {
        'id': s.id, 'item_id': s.item_id,
        'item_code': s.item.item_code, 'item_name': s.item.item_name,
        'category': s.category.name if s.category else '', 'category_id': s.category_id,
        'spec_version': s.spec_version, 'status': s.status,
        'gsm': str(s.gsm) if s.gsm else '',
        'width_cm': str(s.width_cm) if s.width_cm else '',
        'thickness_mm': str(s.thickness_mm) if s.thickness_mm else '',
        'tensile_strength_warp': str(s.tensile_strength_warp) if s.tensile_strength_warp else '',
        'tensile_strength_weft': str(s.tensile_strength_weft) if s.tensile_strength_weft else '',
        'elongation_warp': str(s.elongation_warp) if s.elongation_warp else '',
        'elongation_weft': str(s.elongation_weft) if s.elongation_weft else '',
        'tear_strength': str(s.tear_strength) if s.tear_strength else '',
        'burst_strength': str(s.burst_strength) if s.burst_strength else '',
        'air_permeability': str(s.air_permeability) if s.air_permeability else '',
        'composition': s.composition, 'standard_reference': s.standard_reference,
        'notes': s.notes, 'created_at': s.created_at.strftime('%Y-%m-%d'),
    }

def sample_to_dict(s):
    return {
        'id': s.id, 'sample_number': s.sample_number,
        'item_id': s.item_id, 'item_code': s.item.item_code, 'item_name': s.item.item_name,
        'customer_id': s.customer_id, 'customer_name': s.customer.company_name,
        'quantity': str(s.quantity),
        'sent_date': str(s.sent_date) if s.sent_date else '',
        'approved_date': str(s.approved_date) if s.approved_date else '',
        'status': s.status, 'customer_remarks': s.customer_remarks,
        'internal_notes': s.internal_notes, 'created_at': s.created_at.strftime('%Y-%m-%d'),
    }

def tds_to_dict(t):
    return {
        'id': t.id, 'tds_number': t.tds_number,
        'item_id': t.item_id, 'item_code': t.item.item_code, 'item_name': t.item.item_name,
        'spec_id': t.spec_id, 'issue_date': str(t.issue_date),
        'revision_number': t.revision_number, 'status': t.status,
        'prepared_by': t.prepared_by, 'approved_by': t.approved_by, 'notes': t.notes,
    }

def lab_to_dict(l):
    return {
        'id': l.id, 'test_number': l.test_number,
        'item_id': l.item_id, 'item_code': l.item.item_code, 'item_name': l.item.item_name,
        'test_type': l.test_type, 'test_date': str(l.test_date),
        'tested_by': l.tested_by, 'lab_name': l.lab_name,
        'gsm_actual': str(l.gsm_actual) if l.gsm_actual else '',
        'tensile_warp_actual': str(l.tensile_warp_actual) if l.tensile_warp_actual else '',
        'tensile_weft_actual': str(l.tensile_weft_actual) if l.tensile_weft_actual else '',
        'elongation_warp_actual': str(l.elongation_warp_actual) if l.elongation_warp_actual else '',
        'elongation_weft_actual': str(l.elongation_weft_actual) if l.elongation_weft_actual else '',
        'tear_strength_actual': str(l.tear_strength_actual) if l.tear_strength_actual else '',
        'air_permeability_actual': str(l.air_permeability_actual) if l.air_permeability_actual else '',
        'overall_result': l.overall_result, 'remarks': l.remarks,
        'standard_used': l.standard_used, 'created_at': l.created_at.strftime('%Y-%m-%d'),
    }

def rd_to_dict(r):
    return {
        'id': r.id, 'project_number': r.project_number, 'project_name': r.project_name,
        'objective': r.objective, 'target_product': r.target_product,
        'category': r.category.name if r.category else '', 'category_id': r.category_id,
        'start_date': str(r.start_date),
        'target_end_date': str(r.target_end_date) if r.target_end_date else '',
        'actual_end_date': str(r.actual_end_date) if r.actual_end_date else '',
        'status': r.status, 'lead_engineer': r.lead_engineer,
        'budget': str(r.budget) if r.budget else '', 'outcome': r.outcome,
        'created_at': r.created_at.strftime('%Y-%m-%d'),
    }


# ============================================================
# PRODUCT CATEGORIES
# ============================================================
@csrf_exempt
def category_list(request):
    if request.method == 'GET':
        return JsonResponse({'categories': [category_to_dict(c) for c in TechnicalProductCategory.objects.all()]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            cat = TechnicalProductCategory.objects.create(
                name=data['name'], code=data['code'],
                description=data.get('description', ''), application=data.get('application', ''),
            )
            return JsonResponse({'message': 'Category created.', 'category': category_to_dict(cat)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def category_detail(request, cat_id):
    try:
        cat = TechnicalProductCategory.objects.get(id=cat_id)
    except TechnicalProductCategory.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        cat.name = data.get('name', cat.name)
        cat.code = data.get('code', cat.code)
        cat.description = data.get('description', cat.description)
        cat.application = data.get('application', cat.application)
        cat.save()
        return JsonResponse({'message': 'Updated.', 'category': category_to_dict(cat)})
    if request.method == 'DELETE':
        cat.delete()
        return JsonResponse({'message': 'Deleted.'})


# ============================================================
# PERFORMANCE SPECS
# ============================================================
@csrf_exempt
def spec_list(request):
    if request.method == 'GET':
        specs = PerformanceSpec.objects.select_related('item', 'category').all()
        return JsonResponse({'specs': [spec_to_dict(s) for s in specs]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            spec = PerformanceSpec.objects.create(
                item_id=data['item_id'], category_id=data.get('category_id') or None,
                spec_version=data.get('spec_version', 'v1.0'), status=data.get('status', 'draft'),
                gsm=dn(data.get('gsm')), width_cm=dn(data.get('width_cm')),
                thickness_mm=dn(data.get('thickness_mm')),
                tensile_strength_warp=dn(data.get('tensile_strength_warp')),
                tensile_strength_weft=dn(data.get('tensile_strength_weft')),
                elongation_warp=dn(data.get('elongation_warp')),
                elongation_weft=dn(data.get('elongation_weft')),
                tear_strength=dn(data.get('tear_strength')),
                burst_strength=dn(data.get('burst_strength')),
                air_permeability=dn(data.get('air_permeability')),
                composition=data.get('composition', ''),
                standard_reference=data.get('standard_reference', ''),
                notes=data.get('notes', ''),
                created_by=request.user if request.user.is_authenticated else None,
            )
            return JsonResponse({'message': 'Spec created.', 'spec': spec_to_dict(spec)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def spec_detail(request, spec_id):
    try:
        spec = PerformanceSpec.objects.select_related('item', 'category').get(id=spec_id)
    except PerformanceSpec.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'DELETE':
        spec.delete()
        return JsonResponse({'message': 'Deleted.'})


# ============================================================
# SAMPLES
# ============================================================
@csrf_exempt
def sample_list(request):
    if request.method == 'GET':
        samples = Sample.objects.select_related('item', 'customer').all()
        return JsonResponse({'samples': [sample_to_dict(s) for s in samples]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            sample = Sample.objects.create(
                sample_number=next_number('SMP', Sample, 'sample_number'),
                item_id=data['item_id'], customer_id=data['customer_id'],
                quantity=data['quantity'], sent_date=data.get('sent_date') or None,
                status=data.get('status', 'prepared'),
                internal_notes=data.get('internal_notes', ''),
                created_by=request.user if request.user.is_authenticated else None,
            )
            return JsonResponse({'message': 'Sample created.', 'sample': sample_to_dict(sample)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def sample_update_status(request, sample_id):
    try:
        sample = Sample.objects.select_related('item', 'customer').get(id=sample_id)
    except Sample.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'POST':
        data = json.loads(request.body)
        sample.status = data.get('status', sample.status)
        sample.customer_remarks = data.get('customer_remarks', sample.customer_remarks)
        if data.get('status') == 'approved':
            sample.approved_date = date.today()
        sample.save()
        return JsonResponse({'message': 'Status updated.', 'sample': sample_to_dict(sample)})


# ============================================================
# TECHNICAL DATA SHEETS
# ============================================================
@csrf_exempt
def tds_list(request):
    if request.method == 'GET':
        sheets = TechnicalDataSheet.objects.select_related('item', 'spec').all()
        return JsonResponse({'sheets': [tds_to_dict(t) for t in sheets]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            tds = TechnicalDataSheet.objects.create(
                tds_number=next_number('TDS', TechnicalDataSheet, 'tds_number'),
                item_id=data['item_id'], spec_id=data.get('spec_id') or None,
                issue_date=data['issue_date'], revision_number=data.get('revision_number', 'R0'),
                status=data.get('status', 'draft'), prepared_by=data.get('prepared_by', ''),
                approved_by=data.get('approved_by', ''), notes=data.get('notes', ''),
            )
            return JsonResponse({'message': 'TDS created.', 'tds': tds_to_dict(tds)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def tds_issue(request, tds_id):
    try:
        tds = TechnicalDataSheet.objects.select_related('item', 'spec').get(id=tds_id)
    except TechnicalDataSheet.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'POST':
        tds.status = 'issued'
        tds.save()
        return JsonResponse({'message': 'TDS issued.', 'tds': tds_to_dict(tds)})


# ============================================================
# TESTING LAB
# ============================================================
@csrf_exempt
def lab_list(request):
    if request.method == 'GET':
        records = TestingLabRecord.objects.select_related('item').all()
        return JsonResponse({'records': [lab_to_dict(r) for r in records]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            record = TestingLabRecord.objects.create(
                test_number=next_number('TST', TestingLabRecord, 'test_number'),
                item_id=data['item_id'], test_type=data.get('test_type', 'physical'),
                test_date=data['test_date'], tested_by=data['tested_by'],
                lab_name=data.get('lab_name', ''),
                gsm_actual=dn(data.get('gsm_actual')),
                tensile_warp_actual=dn(data.get('tensile_warp_actual')),
                tensile_weft_actual=dn(data.get('tensile_weft_actual')),
                elongation_warp_actual=dn(data.get('elongation_warp_actual')),
                elongation_weft_actual=dn(data.get('elongation_weft_actual')),
                tear_strength_actual=dn(data.get('tear_strength_actual')),
                air_permeability_actual=dn(data.get('air_permeability_actual')),
                overall_result=data.get('overall_result', 'pending'),
                remarks=data.get('remarks', ''), standard_used=data.get('standard_used', ''),
                created_by=request.user if request.user.is_authenticated else None,
            )
            return JsonResponse({'message': 'Test record created.', 'record': lab_to_dict(record)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


# ============================================================
# R&D PROJECTS
# ============================================================
@csrf_exempt
def rd_list(request):
    if request.method == 'GET':
        projects = RDProject.objects.select_related('category').all()
        return JsonResponse({'projects': [rd_to_dict(p) for p in projects]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            proj = RDProject.objects.create(
                project_number=next_number('RD', RDProject, 'project_number'),
                project_name=data['project_name'], objective=data['objective'],
                target_product=data.get('target_product', ''),
                category_id=data.get('category_id') or None,
                start_date=data['start_date'],
                target_end_date=data.get('target_end_date') or None,
                status=data.get('status', 'planning'),
                lead_engineer=data.get('lead_engineer', ''),
                budget=data.get('budget') or None,
                created_by=request.user if request.user.is_authenticated else None,
            )
            return JsonResponse({'message': 'R&D project created.', 'project': rd_to_dict(proj)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def rd_update_status(request, proj_id):
    try:
        proj = RDProject.objects.select_related('category').get(id=proj_id)
    except RDProject.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'POST':
        data = json.loads(request.body)
        proj.status = data.get('status', proj.status)
        proj.outcome = data.get('outcome', proj.outcome)
        if data.get('status') == 'completed':
            proj.actual_end_date = date.today()
        proj.save()
        return JsonResponse({'message': 'Updated.', 'project': rd_to_dict(proj)})
