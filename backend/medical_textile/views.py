# ============================================================
# FILE: medical_textile/views.py
# PURPOSE: API endpoints for Medical Textile module.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from datetime import date

from .models import (
    RegulatoryCompliance, BatchTraceability, SterilityRecord,
    CAPA, AuditTrail, ShelfLifeRecord
)
from production.models import Batch
from master_data.models import Item
from master_data.company_utils import get_active_company


# ── Auto-number ───────────────────────────────────────────────
def next_number(prefix, model, field):
    today = date.today().strftime('%Y%m%d')
    full_prefix = f'{prefix}-{today}-'
    last = model.objects.filter(**{f'{field}__startswith': full_prefix}).order_by(f'-{field}').first()
    num = int(getattr(last, field).split('-')[-1]) + 1 if last else 1
    return f'{full_prefix}{str(num).zfill(3)}'

# ── Audit log helper ──────────────────────────────────────────
def log_audit(module, record_id, record_ref, action, user, details=''):
    AuditTrail.objects.create(
        module=module, record_id=record_id, record_ref=record_ref,
        action=action, performed_by=user, details=details,
    )

# ── Dict helpers ──────────────────────────────────────────────
def compliance_to_dict(c):
    return {
        'id': c.id, 'item_id': c.item_id,
        'item_code': c.item.item_code, 'item_name': c.item.item_name,
        'standard': c.standard, 'certificate_number': c.certificate_number,
        'issuing_body': c.issuing_body, 'issue_date': str(c.issue_date),
        'expiry_date': str(c.expiry_date) if c.expiry_date else '',
        'status': c.status, 'scope': c.scope, 'notes': c.notes,
    }

def traceability_to_dict(t):
    return {
        'id': t.id, 'batch_id': t.batch_id,
        'batch_number': t.batch.batch_number,
        'item_code': t.item.item_code, 'item_name': t.item.item_name,
        'raw_material_lot': t.raw_material_lot,
        'supplier_batch_ref': t.supplier_batch_ref,
        'raw_material_coa': t.raw_material_coa,
        'production_date': str(t.production_date),
        'production_line': t.production_line,
        'operator_name': t.operator_name, 'supervisor_name': t.supervisor_name,
        'qc_passed': t.qc_passed, 'qc_checked_by': t.qc_checked_by,
        'qc_date': str(t.qc_date) if t.qc_date else '',
        'qc_remarks': t.qc_remarks,
        'dispatched_to': t.dispatched_to,
        'dispatch_date': str(t.dispatch_date) if t.dispatch_date else '',
        'invoice_reference': t.invoice_reference, 'notes': t.notes,
        'created_at': t.created_at.strftime('%Y-%m-%d'),
    }

def sterility_to_dict(s):
    return {
        'id': s.id, 'batch_id': s.batch_id,
        'batch_number': s.batch.batch_number,
        'sterilization_method': s.sterilization_method,
        'sterilization_date': str(s.sterilization_date),
        'sterilized_by': s.sterilized_by, 'cycle_number': s.cycle_number,
        'temperature': str(s.temperature) if s.temperature else '',
        'exposure_time_min': s.exposure_time_min,
        'test_result': s.test_result,
        'test_date': str(s.test_date) if s.test_date else '',
        'tested_by': s.tested_by,
        'certificate_number': s.certificate_number, 'remarks': s.remarks,
    }

def capa_to_dict(c):
    return {
        'id': c.id, 'capa_number': c.capa_number,
        'capa_type': c.capa_type, 'source': c.source,
        'description': c.description, 'root_cause': c.root_cause,
        'action_taken': c.action_taken, 'responsible_person': c.responsible_person,
        'target_date': str(c.target_date) if c.target_date else '',
        'closed_date': str(c.closed_date) if c.closed_date else '',
        'status': c.status, 'effectiveness_check': c.effectiveness_check,
        'related_batch': c.related_batch.batch_number if c.related_batch else '',
        'related_item': c.related_item.item_code if c.related_item else '',
        'created_at': c.created_at.strftime('%Y-%m-%d'),
    }

def shelf_to_dict(s):
    return {
        'id': s.id, 'batch_id': s.batch_id,
        'batch_number': s.batch.batch_number,
        'item_code': s.item.item_code, 'item_name': s.item.item_name,
        'manufacture_date': str(s.manufacture_date),
        'expiry_date': str(s.expiry_date),
        'shelf_life_months': s.shelf_life_months,
        'storage_condition': s.storage_condition,
        'status': s.status,
        'quantity_remaining': str(s.quantity_remaining),
        'notes': s.notes,
    }


# ============================================================
# REGULATORY COMPLIANCE
# ============================================================
@csrf_exempt
def compliance_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        records = RegulatoryCompliance.objects.select_related('item').all()
        if company:
            records = records.filter(company=company)
        return JsonResponse({'records': [compliance_to_dict(r) for r in records]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            rec = RegulatoryCompliance.objects.create(
                company=company,
                item_id=data['item_id'], standard=data['standard'],
                certificate_number=data.get('certificate_number', ''),
                issuing_body=data['issuing_body'], issue_date=data['issue_date'],
                expiry_date=data.get('expiry_date') or None,
                status=data.get('status', 'active'),
                scope=data.get('scope', ''), notes=data.get('notes', ''),
                created_by=request.user if request.user.is_authenticated else None,
            )
            log_audit('compliance', rec.id, rec.certificate_number, 'created', request.user)
            return JsonResponse({'message': 'Compliance record created.', 'record': compliance_to_dict(rec)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def compliance_detail(request, rec_id):
    try:
        rec = RegulatoryCompliance.objects.select_related('item').get(id=rec_id)
    except RegulatoryCompliance.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        rec.status = data.get('status', rec.status)
        rec.notes = data.get('notes', rec.notes)
        rec.expiry_date = data.get('expiry_date') or rec.expiry_date
        rec.save()
        log_audit('compliance', rec.id, rec.certificate_number, 'updated', request.user)
        return JsonResponse({'message': 'Updated.', 'record': compliance_to_dict(rec)})
    if request.method == 'DELETE':
        rec.delete()
        return JsonResponse({'message': 'Deleted.'})


# ============================================================
# BATCH TRACEABILITY
# ============================================================
@csrf_exempt
def traceability_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        records = BatchTraceability.objects.select_related('batch', 'item').all()
        if company:
            records = records.filter(company=company)
        return JsonResponse({'records': [traceability_to_dict(r) for r in records]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            rec = BatchTraceability.objects.create(
                company=company,
                batch_id=data['batch_id'], item_id=data['item_id'],
                raw_material_lot=data.get('raw_material_lot', ''),
                supplier_batch_ref=data.get('supplier_batch_ref', ''),
                raw_material_coa=data.get('raw_material_coa', ''),
                production_date=data['production_date'],
                production_line=data.get('production_line', ''),
                operator_name=data.get('operator_name', ''),
                supervisor_name=data.get('supervisor_name', ''),
                qc_passed=data.get('qc_passed', False),
                qc_checked_by=data.get('qc_checked_by', ''),
                qc_date=data.get('qc_date') or None,
                qc_remarks=data.get('qc_remarks', ''),
                dispatched_to=data.get('dispatched_to', ''),
                dispatch_date=data.get('dispatch_date') or None,
                invoice_reference=data.get('invoice_reference', ''),
                notes=data.get('notes', ''),
                created_by=request.user if request.user.is_authenticated else None,
            )
            log_audit('traceability', rec.id, rec.batch.batch_number, 'created', request.user)
            return JsonResponse({'message': 'Traceability record created.', 'record': traceability_to_dict(rec)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


# ============================================================
# STERILITY RECORDS
# ============================================================
@csrf_exempt
def sterility_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        records = SterilityRecord.objects.select_related('batch').all()
        if company:
            records = records.filter(company=company)
        return JsonResponse({'records': [sterility_to_dict(r) for r in records]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            rec = SterilityRecord.objects.create(
                company=company,
                batch_id=data['batch_id'],
                sterilization_method=data['sterilization_method'],
                sterilization_date=data['sterilization_date'],
                sterilized_by=data.get('sterilized_by', ''),
                cycle_number=data.get('cycle_number', ''),
                temperature=data.get('temperature') or None,
                exposure_time_min=data.get('exposure_time_min') or None,
                test_result=data.get('test_result', 'pending'),
                test_date=data.get('test_date') or None,
                tested_by=data.get('tested_by', ''),
                certificate_number=data.get('certificate_number', ''),
                remarks=data.get('remarks', ''),
                created_by=request.user if request.user.is_authenticated else None,
            )
            log_audit('sterility', rec.id, rec.batch.batch_number, 'created', request.user)
            return JsonResponse({'message': 'Sterility record created.', 'record': sterility_to_dict(rec)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


# ============================================================
# CAPA
# ============================================================
@csrf_exempt
def capa_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        capas = CAPA.objects.all()
        if company:
            capas = capas.filter(company=company)
        return JsonResponse({'capas': [capa_to_dict(c) for c in capas]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            capa = CAPA.objects.create(
                company=company,
                capa_number=next_number('CAPA', CAPA, 'capa_number'),
                capa_type=data['capa_type'], source=data['source'],
                description=data['description'],
                root_cause=data.get('root_cause', ''),
                responsible_person=data.get('responsible_person', ''),
                target_date=data.get('target_date') or None,
                status='open',
                related_batch_id=data.get('related_batch_id') or None,
                related_item_id=data.get('related_item_id') or None,
                created_by=request.user if request.user.is_authenticated else None,
            )
            log_audit('capa', capa.id, capa.capa_number, 'created', request.user)
            return JsonResponse({'message': 'CAPA created.', 'capa': capa_to_dict(capa)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def capa_close(request, capa_id):
    try:
        capa = CAPA.objects.get(id=capa_id)
    except CAPA.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'POST':
        data = json.loads(request.body)
        capa.status = data.get('status', 'closed')
        capa.action_taken = data.get('action_taken', capa.action_taken)
        capa.root_cause = data.get('root_cause', capa.root_cause)
        capa.effectiveness_check = data.get('effectiveness_check', '')
        if data.get('status') == 'closed':
            capa.closed_date = date.today()
        capa.save()
        log_audit('capa', capa.id, capa.capa_number, 'updated', request.user, f'Status → {capa.status}')
        return JsonResponse({'message': 'CAPA updated.', 'capa': capa_to_dict(capa)})


# ============================================================
# AUDIT TRAIL
# ============================================================
def audit_trail_list(request):
    trails = AuditTrail.objects.select_related('performed_by').all()[:200]
    result = [{
        'id': t.id, 'module': t.module, 'record_ref': t.record_ref,
        'action': t.action,
        'performed_by': t.performed_by.username if t.performed_by else 'system',
        'performed_at': t.performed_at.strftime('%Y-%m-%d %H:%M'),
        'details': t.details,
    } for t in trails]
    return JsonResponse({'trails': result})


# ============================================================
# SHELF LIFE
# ============================================================
@csrf_exempt
def shelf_life_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        records = ShelfLifeRecord.objects.select_related('batch', 'item').all()
        if company:
            records = records.filter(company=company)
        # Auto-update status based on today's date
        today = date.today()
        for r in records:
            days_left = (r.expiry_date - today).days
            if days_left < 0:
                r.status = 'expired'
            elif days_left < 90:
                r.status = 'near_expiry'
            else:
                r.status = 'valid'
        return JsonResponse({'records': [shelf_to_dict(r) for r in records]})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            rec = ShelfLifeRecord.objects.create(
                company=company,
                batch_id=data['batch_id'], item_id=data['item_id'],
                manufacture_date=data['manufacture_date'],
                expiry_date=data['expiry_date'],
                shelf_life_months=data['shelf_life_months'],
                storage_condition=data.get('storage_condition', ''),
                quantity_remaining=data.get('quantity_remaining', 0),
                notes=data.get('notes', ''),
                created_by=request.user if request.user.is_authenticated else None,
            )
            log_audit('shelf_life', rec.id, rec.batch.batch_number, 'created', request.user)
            return JsonResponse({'message': 'Shelf life record created.', 'record': shelf_to_dict(rec)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)
