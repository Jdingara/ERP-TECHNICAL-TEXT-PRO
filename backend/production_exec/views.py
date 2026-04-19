# ============================================================
# FILE: production_exec/views.py
# PURPOSE: Process Entry (consume LOTs → produce Batch), Beam Outward
#          Confirming a process entry:
#            1. Deducts balance_qty from each input LOT
#            2. Creates a Batch (qc_pending status)
#            3. Updates production_order.produced_qty
#            4. Creates TraceabilityRecord linking lot→batch
# ============================================================

import json
import datetime
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db import transaction
from django.db.models import Q

from master_data.company_utils import get_active_company
from .models import (
    ProcessEntry, ProcessEntryLotInput, Batch, BeamOutward, batch_number, YarnIssue,
    WarpingDetail, WeavingDetail, StenterDetail, TumblerDetail, EmbossingDetail, LaminationDetail,
    DeliveryChallan,
)
from purchase.models import Lot
from lot_inventory.models import LotMovement
from planning.models import ProductionOrder


# ── Serializers ───────────────────────────────────────────────

def lot_input_dict(inp):
    return {
        'id': inp.id,
        'lot_id': inp.lot_id,
        'lot_number': inp.lot.lot_number if inp.lot else '',
        'material_name': inp.lot.material_name if inp.lot else '',
        'color_code': inp.lot.color_code if inp.lot else '',
        'quantity_used': str(inp.quantity_used),
        'lot_balance_after': str(inp.lot.balance_qty) if inp.lot else '',
    }


def process_entry_dict(entry, include_lots=False):
    d = {
        'id': entry.id,
        'entry_number': entry.entry_number,
        'production_order_id': entry.production_order_id,
        'prod_order_number': entry.production_order.po_number if entry.production_order else '',
        'product_name': entry.production_order.product.design_name if entry.production_order and entry.production_order.product else '',
        'daily_plan_id': entry.daily_plan_id,
        'process_stage_id': entry.process_stage_id,
        'process_name': entry.process_stage.process_name if entry.process_stage else '',
        'machine_id': entry.machine_id,
        'machine_code': entry.machine.machine_code if entry.machine else '',
        'machine_name': entry.machine.machine_name if entry.machine else '',
        'entry_date': str(entry.entry_date),
        'shift': entry.shift,
        'operator_name': entry.operator_name,
        'output_quantity': str(entry.output_quantity),
        'rejection_qty': str(entry.rejection_qty),
        'status': entry.status,
        'notes': entry.notes,
        'created_at': entry.created_at.strftime('%Y-%m-%d %H:%M'),
    }
    if include_lots:
        d['lot_inputs'] = [lot_input_dict(i) for i in entry.lot_inputs.all()]
        d['batches'] = [batch_dict(b) for b in entry.batches.all()]
    return d


def batch_dict(batch):
    return {
        'id': batch.id,
        'batch_number': batch.batch_number,
        'process_entry_id': batch.process_entry_id,
        'production_order_id': batch.production_order_id,
        'prod_order_number': batch.production_order.po_number if batch.production_order else '',
        'product_name': batch.production_order.product.design_name if batch.production_order and batch.production_order.product else '',
        'process_stage_id': batch.process_stage_id,
        'process_name': batch.process_stage.process_name if batch.process_stage else '',
        'quantity': str(batch.quantity),
        'balance_qty': str(batch.balance_qty),
        'status': batch.status,
        'created_at': batch.created_at.strftime('%Y-%m-%d %H:%M'),
    }


def beam_dict(beam):
    return {
        'id': beam.id,
        'beam_number': beam.beam_number,
        'process_entry_id': beam.process_entry_id,
        'quantity': str(beam.quantity),
        'issued_to_machine_id': beam.issued_to_machine_id,
        'machine_code': beam.issued_to_machine.machine_code if beam.issued_to_machine else '',
        'issue_date': str(beam.issue_date) if beam.issue_date else '',
        'notes': beam.notes,
        'created_at': beam.created_at.strftime('%Y-%m-%d %H:%M'),
    }


# ── Auto-number helper ────────────────────────────────────────

def next_entry_number():
    today = datetime.date.today().strftime('%Y%m%d')
    count = ProcessEntry.objects.filter(entry_number__startswith=f'PE-{today}').count()
    return f"PE-{today}-{str(count + 1).zfill(3)}"


# ── Process Entry List / Create ───────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def process_entry_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = ProcessEntry.objects.filter(company=company).select_related(
            'production_order__product', 'process_stage', 'machine'
        )
        prod_order_id = request.GET.get('production_order_id')
        machine_id = request.GET.get('machine_id')
        entry_date = request.GET.get('entry_date')
        status_filter = request.GET.get('status')
        shift = request.GET.get('shift')
        if prod_order_id:
            qs = qs.filter(production_order_id=prod_order_id)
        if machine_id:
            qs = qs.filter(machine_id=machine_id)
        if entry_date:
            qs = qs.filter(entry_date=entry_date)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if shift:
            qs = qs.filter(shift=shift)
        return JsonResponse({'process_entries': [process_entry_dict(e) for e in qs]})

    data = json.loads(request.body)
    with transaction.atomic():
        entry = ProcessEntry.objects.create(
            company=company,
            entry_number=next_entry_number(),
            production_order_id=data['production_order_id'],
            daily_plan_id=data.get('daily_plan_id') or None,
            process_stage_id=data['process_stage_id'],
            machine_id=data['machine_id'],
            entry_date=data.get('entry_date', str(datetime.date.today())),
            shift=data.get('shift', 'morning'),
            operator_name=data.get('operator_name', ''),
            output_quantity=data.get('output_quantity', 0),
            rejection_qty=data.get('rejection_qty', 0),
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        for lot_data in data.get('lot_inputs', []):
            ProcessEntryLotInput.objects.create(
                process_entry=entry,
                lot_id=lot_data['lot_id'],
                quantity_used=lot_data['quantity_used'],
            )
    return JsonResponse({'success': True, 'process_entry': process_entry_dict(entry, include_lots=True)}, status=201)


# ── Process Entry Detail ──────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'PUT'])
def process_entry_detail(request, pk):
    try:
        entry = ProcessEntry.objects.get(pk=pk)
    except ProcessEntry.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'process_entry': process_entry_dict(entry, include_lots=True)})

    data = json.loads(request.body)
    action = data.get('action')

    if action == 'cancel':
        if entry.status == 'confirmed':
            return JsonResponse({'error': 'Confirmed entries cannot be cancelled'}, status=400)
        entry.status = 'cancelled'
        entry.save()
        return JsonResponse({'success': True})

    # General edit — only in draft
    if entry.status != 'draft':
        return JsonResponse({'error': 'Only draft entries can be edited'}, status=400)

    with transaction.atomic():
        entry.output_quantity = data.get('output_quantity', entry.output_quantity)
        entry.rejection_qty = data.get('rejection_qty', entry.rejection_qty)
        entry.operator_name = data.get('operator_name', entry.operator_name)
        entry.shift = data.get('shift', entry.shift)
        entry.notes = data.get('notes', entry.notes)
        entry.machine_id = data.get('machine_id', entry.machine_id)
        entry.process_stage_id = data.get('process_stage_id', entry.process_stage_id)

        if 'lot_inputs' in data:
            entry.lot_inputs.all().delete()
            for lot_data in data['lot_inputs']:
                ProcessEntryLotInput.objects.create(
                    process_entry=entry,
                    lot_id=lot_data['lot_id'],
                    quantity_used=lot_data['quantity_used'],
                )
        entry.save()
    return JsonResponse({'success': True, 'process_entry': process_entry_dict(entry, include_lots=True)})


# ── Confirm Process Entry (Critical: consume LOTs → create Batch) ──
# This endpoint:
#   1. Validates lot balance is sufficient for each input
#   2. Deducts quantity from each lot's balance_qty
#   3. Marks lot as 'in_use' or 'consumed' based on remaining balance
#   4. Creates a Batch record (qc_pending)
#   5. Updates production_order.produced_qty
#   6. Creates TraceabilityRecord for each lot→batch link

@csrf_exempt
@require_http_methods(['POST'])
def confirm_process_entry(request, pk):
    company = get_active_company(request)
    try:
        entry = ProcessEntry.objects.get(pk=pk, company=company)
    except ProcessEntry.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if entry.status != 'draft':
        return JsonResponse({'error': 'Entry already confirmed or cancelled'}, status=400)

    lot_inputs = list(entry.lot_inputs.select_related('lot').all())
    if not lot_inputs:
        return JsonResponse({'error': 'No lot inputs defined. Add materials before confirming.'}, status=400)

    # Validate lot balances before touching anything
    for inp in lot_inputs:
        lot = inp.lot
        if lot.status == 'consumed':
            return JsonResponse({'error': f'Lot {lot.lot_number} is already fully consumed'}, status=400)
        if lot.status == 'rejected':
            return JsonResponse({'error': f'Lot {lot.lot_number} is rejected and cannot be used'}, status=400)
        if float(inp.quantity_used) > float(lot.balance_qty):
            return JsonResponse({
                'error': f'Lot {lot.lot_number}: requested {inp.quantity_used} but only {lot.balance_qty} available'
            }, status=400)

    with transaction.atomic():
        # Deduct lots
        for inp in lot_inputs:
            lot = inp.lot
            new_balance = float(lot.balance_qty) - float(inp.quantity_used)
            lot.balance_qty = max(0, new_balance)
            lot.status = 'consumed' if lot.balance_qty <= 0 else 'in_use'
            lot.save()

        # Create Batch
        new_batch = Batch.objects.create(
            company=company,
            batch_number=batch_number(),
            process_entry=entry,
            production_order=entry.production_order,
            process_stage=entry.process_stage,
            quantity=entry.output_quantity,
            balance_qty=entry.output_quantity,
            status='qc_pending',
        )

        # Update production order produced_qty
        prod_order = entry.production_order
        prod_order.produced_qty = float(prod_order.produced_qty) + float(entry.output_quantity)
        if prod_order.produced_qty >= prod_order.planned_qty:
            prod_order.status = 'completed'
        elif prod_order.status == 'planned':
            prod_order.status = 'in_progress'
        prod_order.save()

        # Confirm the entry
        entry.status = 'confirmed'
        entry.save()

        # Create TraceabilityRecord for each lot→batch link
        try:
            from traceability.models import TraceabilityRecord
            for inp in lot_inputs:
                lot = inp.lot
                TraceabilityRecord.objects.create(
                    company=company,
                    lot=lot,
                    lot_number=lot.lot_number,
                    material_name=lot.material_name,
                    process_entry=entry,
                    batch=new_batch,
                    batch_number=new_batch.batch_number,
                    process_stage=entry.process_stage.process_name if entry.process_stage else '',
                    machine_used=entry.machine.machine_code if entry.machine else '',
                    production_date=entry.entry_date,
                )
        except Exception:
            pass  # Traceability is informational — don't fail the confirm

    return JsonResponse({
        'success': True,
        'message': 'Process entry confirmed. Lots consumed. Batch created.',
        'batch': batch_dict(new_batch),
        'entry_status': entry.status,
        'prod_order_status': prod_order.status,
    })


# ── Batch List ────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET'])
def batch_list(request):
    company = get_active_company(request)
    qs = Batch.objects.filter(company=company).select_related(
        'production_order__product', 'process_stage'
    )
    status_filter = request.GET.get('status')
    prod_order_id = request.GET.get('production_order_id')
    search = request.GET.get('search', '').strip()

    if status_filter:
        qs = qs.filter(status=status_filter)
    if prod_order_id:
        qs = qs.filter(production_order_id=prod_order_id)
    if search:
        qs = qs.filter(
            Q(batch_number__icontains=search) |
            Q(production_order__product__design_name__icontains=search)
        )
    return JsonResponse({'batches': [batch_dict(b) for b in qs]})


# ── Batch Detail / Status Update ─────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'PUT'])
def batch_detail(request, pk):
    try:
        b = Batch.objects.get(pk=pk)
    except Batch.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'batch': batch_dict(b)})

    data = json.loads(request.body)
    # Allow status update (QC result, rework, finished)
    new_status = data.get('status')
    if new_status and new_status in dict(Batch.STATUS):
        b.status = new_status
    b.save()
    return JsonResponse({'success': True, 'batch': batch_dict(b)})


# ── Beam Outward List / Create ────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def beam_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = BeamOutward.objects.filter(company=company).select_related('process_entry', 'issued_to_machine')
        return JsonResponse({'beams': [beam_dict(b) for b in qs]})

    data = json.loads(request.body)
    today = datetime.date.today().strftime('%Y%m%d')
    count = BeamOutward.objects.filter(beam_number__startswith=f'BEAM-{today}').count()
    beam_num = f"BEAM-{today}-{str(count + 1).zfill(3)}"

    beam = BeamOutward.objects.create(
        company=company,
        beam_number=beam_num,
        process_entry_id=data['process_entry_id'],
        quantity=data['quantity'],
        issued_to_machine_id=data.get('issued_to_machine_id') or None,
        issue_date=data.get('issue_date') or None,
        notes=data.get('notes', ''),
    )
    return JsonResponse({'success': True, 'beam': beam_dict(beam)}, status=201)


# ── Yarn Issue (Warp / Weft) ──────────────────────────────────

def yarn_issue_dict(yi):
    return {
        'id':                  yi.id,
        'issue_number':        yi.issue_number,
        'production_order_id': yi.production_order_id,
        'prod_order_number':   yi.production_order.po_number if yi.production_order else '',
        'lot_id':              yi.lot_id,
        'lot_number':          yi.lot.lot_number if yi.lot else '',
        'material_name':       yi.lot.material_name if yi.lot else '',
        'color_code':          yi.lot.color_code if yi.lot else '',
        'lot_balance':         str(yi.lot.balance_qty) if yi.lot else '0',
        'issued_qty':          str(yi.issued_qty),
        'purpose':             yi.purpose,
        'issue_date':          str(yi.issue_date),
        'shift':               yi.shift,
        'machine_id':          yi.issued_to_machine_id,
        'machine_code':        yi.issued_to_machine.machine_code if yi.issued_to_machine else '',
        'issued_by':           yi.issued_by,
        'status':              yi.status,
        'notes':               yi.notes,
    }


@csrf_exempt
@require_http_methods(['GET', 'POST'])
def yarn_issue_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = YarnIssue.objects.filter(company=company).select_related(
            'production_order', 'lot', 'issued_to_machine')
        status = request.GET.get('status')
        if status:
            qs = qs.filter(status=status)
        return JsonResponse({'yarn_issues': [yarn_issue_dict(yi) for yi in qs]})

    data    = json.loads(request.body)
    yi = YarnIssue.objects.create(
        company=company,
        production_order_id=data['production_order_id'],
        lot_id=data['lot_id'],
        issued_qty=data['issued_qty'],
        purpose=data.get('purpose', 'warp'),
        issue_date=data['issue_date'],
        shift=data.get('shift', 'morning'),
        issued_to_machine_id=data.get('machine_id') or None,
        issued_by=data.get('issued_by', ''),
        notes=data.get('notes', ''),
        status='draft',
        created_by=request.user if request.user.is_authenticated else None,
    )
    return JsonResponse({'success': True, 'yarn_issue': yarn_issue_dict(yi)}, status=201)


@csrf_exempt
@require_http_methods(['POST'])
def confirm_yarn_issue(request, pk):
    company = get_active_company(request)
    try:
        yi = YarnIssue.objects.get(id=pk, company=company)
    except YarnIssue.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if yi.status == 'confirmed':
        return JsonResponse({'error': 'Already confirmed'}, status=400)

    lot = yi.lot
    if lot.balance_qty < yi.issued_qty:
        return JsonResponse({'error': f'Insufficient balance: {lot.balance_qty} available'}, status=400)

    with transaction.atomic():
        lot.balance_qty -= yi.issued_qty
        if lot.balance_qty == 0:
            lot.status = 'consumed'
        else:
            lot.status = 'partial'
        lot.save()

        # Create movement record
        LotMovement.objects.create(
            company=company,
            lot=lot,
            movement_type='issued',
            quantity=yi.issued_qty,
            reference_number=yi.issue_number,
            remarks=f'Yarn issued for {yi.get_purpose_display()} — {yi.production_order.po_number if yi.production_order else ""}',
        )

        yi.status = 'confirmed'
        yi.save()

    return JsonResponse({'success': True, 'yarn_issue': yarn_issue_dict(yi)})


# ══════════════════════════════════════════════════════════════
# Phase B — Stage-Specific Screen Views
# Each view creates ProcessEntry + stage detail in one transaction
# GET → list entries for that stage; POST → create entry + detail
# ══════════════════════════════════════════════════════════════

def _stage_entry_dict(entry):
    """Process entry dict enriched with whatever stage detail exists."""
    d = process_entry_dict(entry, include_lots=True)
    for attr, key in [
        ('warping_detail',   'warping'),
        ('weaving_detail',   'weaving'),
        ('stenter_detail',   'stenter'),
        ('tumbler_detail',   'tumbler'),
        ('embossing_detail', 'embossing'),
        ('lamination_detail','lamination'),
    ]:
        try:
            detail = getattr(entry, attr)
            d[key] = {f.name: getattr(detail, f.name) for f in detail._meta.fields if f.name != 'process_entry'}
            # convert Decimal to str for JSON
            for k, v in d[key].items():
                import decimal
                if isinstance(v, decimal.Decimal):
                    d[key][k] = str(v)
        except Exception:
            d[key] = None
    return d


def _get_stage_entries(company, stage_keywords):
    """Return process entries whose process_stage name contains any keyword (case-insensitive)."""
    from django.db.models import Q
    q = Q()
    for kw in stage_keywords:
        q |= Q(process_stage__process_name__icontains=kw)
    return ProcessEntry.objects.filter(company=company).filter(q).select_related(
        'production_order__product', 'process_stage', 'machine'
    )


# ── Warping Screen ────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def warping_screen(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = _get_stage_entries(company, ['warp'])
        return JsonResponse({'entries': [_stage_entry_dict(e) for e in qs]})

    data = json.loads(request.body)
    with transaction.atomic():
        entry = ProcessEntry.objects.create(
            company=company,
            entry_number=next_entry_number(),
            production_order_id=data['production_order_id'],
            daily_plan_id=data.get('daily_plan_id') or None,
            process_stage_id=data['process_stage_id'],
            machine_id=data['machine_id'],
            entry_date=data.get('entry_date', str(datetime.date.today())),
            shift=data.get('shift', 'morning'),
            operator_name=data.get('operator_name', ''),
            output_quantity=data.get('output_quantity', 0),
            rejection_qty=data.get('rejection_qty', 0),
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        WarpingDetail.objects.create(
            process_entry=entry,
            beam_count=data.get('beam_count', 1),
            total_ends=data.get('total_ends', 0),
            reed_count=data.get('reed_count', ''),
            warp_length_m=data.get('warp_length_m', 0),
            sizing_done=data.get('sizing_done', False),
            beam_numbers=data.get('beam_numbers', ''),
            warp_tension_g=data.get('warp_tension_g', 0),
        )
        for lot_data in data.get('lot_inputs', []):
            ProcessEntryLotInput.objects.create(
                process_entry=entry, lot_id=lot_data['lot_id'],
                quantity_used=lot_data['quantity_used'],
            )
    return JsonResponse({'success': True, 'entry': _stage_entry_dict(entry)}, status=201)


# ── Weaving Screen ────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def weaving_screen(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = _get_stage_entries(company, ['weav', 'loom'])
        return JsonResponse({'entries': [_stage_entry_dict(e) for e in qs]})

    data = json.loads(request.body)
    with transaction.atomic():
        entry = ProcessEntry.objects.create(
            company=company,
            entry_number=next_entry_number(),
            production_order_id=data['production_order_id'],
            daily_plan_id=data.get('daily_plan_id') or None,
            process_stage_id=data['process_stage_id'],
            machine_id=data['machine_id'],
            entry_date=data.get('entry_date', str(datetime.date.today())),
            shift=data.get('shift', 'morning'),
            operator_name=data.get('operator_name', ''),
            output_quantity=data.get('output_quantity', 0),
            rejection_qty=data.get('rejection_qty', 0),
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        WeavingDetail.objects.create(
            process_entry=entry,
            beam_outward_id=data.get('beam_outward_id') or None,
            loom_rpm=data.get('loom_rpm', 0),
            picks_per_cm=data.get('picks_per_cm', 0),
            weft_pattern=data.get('weft_pattern', ''),
            fabric_width_cm=data.get('fabric_width_cm', 0),
            efficiency_pct=data.get('efficiency_pct', 0),
        )
        for lot_data in data.get('lot_inputs', []):
            ProcessEntryLotInput.objects.create(
                process_entry=entry, lot_id=lot_data['lot_id'],
                quantity_used=lot_data['quantity_used'],
            )
    return JsonResponse({'success': True, 'entry': _stage_entry_dict(entry)}, status=201)


# ── Stenter Screen ────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def stenter_screen(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = _get_stage_entries(company, ['stenter', 'heat'])
        return JsonResponse({'entries': [_stage_entry_dict(e) for e in qs]})

    data = json.loads(request.body)
    with transaction.atomic():
        entry = ProcessEntry.objects.create(
            company=company,
            entry_number=next_entry_number(),
            production_order_id=data['production_order_id'],
            daily_plan_id=data.get('daily_plan_id') or None,
            process_stage_id=data['process_stage_id'],
            machine_id=data['machine_id'],
            entry_date=data.get('entry_date', str(datetime.date.today())),
            shift=data.get('shift', 'morning'),
            operator_name=data.get('operator_name', ''),
            output_quantity=data.get('output_quantity', 0),
            rejection_qty=data.get('rejection_qty', 0),
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        StenterDetail.objects.create(
            process_entry=entry,
            temp_zone1=data.get('temp_zone1', 0),
            temp_zone2=data.get('temp_zone2', 0),
            temp_zone3=data.get('temp_zone3', 0),
            temp_zone4=data.get('temp_zone4', 0),
            speed_mpm=data.get('speed_mpm', 0),
            width_cm=data.get('width_cm', 0),
            overfeed_pct=data.get('overfeed_pct', 0),
            chemical_recipe=data.get('chemical_recipe', ''),
        )
        for lot_data in data.get('lot_inputs', []):
            ProcessEntryLotInput.objects.create(
                process_entry=entry, lot_id=lot_data['lot_id'],
                quantity_used=lot_data['quantity_used'],
            )
    return JsonResponse({'success': True, 'entry': _stage_entry_dict(entry)}, status=201)


# ── Tumbler Screen ────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def tumbler_screen(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = _get_stage_entries(company, ['tumbler', 'drum'])
        return JsonResponse({'entries': [_stage_entry_dict(e) for e in qs]})

    data = json.loads(request.body)
    with transaction.atomic():
        entry = ProcessEntry.objects.create(
            company=company,
            entry_number=next_entry_number(),
            production_order_id=data['production_order_id'],
            daily_plan_id=data.get('daily_plan_id') or None,
            process_stage_id=data['process_stage_id'],
            machine_id=data['machine_id'],
            entry_date=data.get('entry_date', str(datetime.date.today())),
            shift=data.get('shift', 'morning'),
            operator_name=data.get('operator_name', ''),
            output_quantity=data.get('output_quantity', 0),
            rejection_qty=data.get('rejection_qty', 0),
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        TumblerDetail.objects.create(
            process_entry=entry,
            temp_celsius=data.get('temp_celsius', 0),
            duration_minutes=data.get('duration_minutes', 0),
            softener_name=data.get('softener_name', ''),
            softener_qty_kg=data.get('softener_qty_kg', 0),
            anti_wrinkle=data.get('anti_wrinkle', ''),
        )
        for lot_data in data.get('lot_inputs', []):
            ProcessEntryLotInput.objects.create(
                process_entry=entry, lot_id=lot_data['lot_id'],
                quantity_used=lot_data['quantity_used'],
            )
    return JsonResponse({'success': True, 'entry': _stage_entry_dict(entry)}, status=201)


# ── Embossing Screen ──────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def embossing_screen(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = _get_stage_entries(company, ['emboss'])
        return JsonResponse({'entries': [_stage_entry_dict(e) for e in qs]})

    data = json.loads(request.body)
    with transaction.atomic():
        entry = ProcessEntry.objects.create(
            company=company,
            entry_number=next_entry_number(),
            production_order_id=data['production_order_id'],
            daily_plan_id=data.get('daily_plan_id') or None,
            process_stage_id=data['process_stage_id'],
            machine_id=data['machine_id'],
            entry_date=data.get('entry_date', str(datetime.date.today())),
            shift=data.get('shift', 'morning'),
            operator_name=data.get('operator_name', ''),
            output_quantity=data.get('output_quantity', 0),
            rejection_qty=data.get('rejection_qty', 0),
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        EmbossingDetail.objects.create(
            process_entry=entry,
            pattern_code=data.get('pattern_code', ''),
            pressure_bar=data.get('pressure_bar', 0),
            temp_celsius=data.get('temp_celsius', 0),
            speed_mpm=data.get('speed_mpm', 0),
        )
        for lot_data in data.get('lot_inputs', []):
            ProcessEntryLotInput.objects.create(
                process_entry=entry, lot_id=lot_data['lot_id'],
                quantity_used=lot_data['quantity_used'],
            )
    return JsonResponse({'success': True, 'entry': _stage_entry_dict(entry)}, status=201)


# ── Lamination Screen ─────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def lamination_screen(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = _get_stage_entries(company, ['laminat', 'coat'])
        return JsonResponse({'entries': [_stage_entry_dict(e) for e in qs]})

    data = json.loads(request.body)
    with transaction.atomic():
        entry = ProcessEntry.objects.create(
            company=company,
            entry_number=next_entry_number(),
            production_order_id=data['production_order_id'],
            daily_plan_id=data.get('daily_plan_id') or None,
            process_stage_id=data['process_stage_id'],
            machine_id=data['machine_id'],
            entry_date=data.get('entry_date', str(datetime.date.today())),
            shift=data.get('shift', 'morning'),
            operator_name=data.get('operator_name', ''),
            output_quantity=data.get('output_quantity', 0),
            rejection_qty=data.get('rejection_qty', 0),
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        LaminationDetail.objects.create(
            process_entry=entry,
            film_type=data.get('film_type', ''),
            film_gsm=data.get('film_gsm', 0),
            coat_weight_gsm=data.get('coat_weight_gsm', 0),
            adhesive_type=data.get('adhesive_type', ''),
            line_speed_mpm=data.get('line_speed_mpm', 0),
            curing_temp=data.get('curing_temp', 0),
        )
        for lot_data in data.get('lot_inputs', []):
            ProcessEntryLotInput.objects.create(
                process_entry=entry, lot_id=lot_data['lot_id'],
                quantity_used=lot_data['quantity_used'],
            )
    return JsonResponse({'success': True, 'entry': _stage_entry_dict(entry)}, status=201)


# ── Delivery Challan ──────────────────────────────────────────

def dc_dict(dc):
    return {
        'id': dc.id,
        'dc_number': dc.dc_number,
        'dispatch_entry_id': dc.dispatch_entry_id,
        'dispatch_number': dc.dispatch_entry.dispatch_number if dc.dispatch_entry else '',
        'customer_name': dc.dispatch_entry.customer.customer_name if dc.dispatch_entry and dc.dispatch_entry.customer else '',
        'dc_date': str(dc.dc_date),
        'vehicle_number': dc.vehicle_number,
        'driver_name': dc.driver_name,
        'lr_number': dc.lr_number,
        'transporter': dc.transporter,
        'eway_bill': dc.eway_bill,
        'delivery_address': dc.delivery_address,
        'remarks': dc.remarks,
        'status': dc.status,
        'created_at': dc.created_at.strftime('%Y-%m-%d %H:%M'),
    }


@csrf_exempt
@require_http_methods(['GET', 'POST'])
def delivery_challan_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = DeliveryChallan.objects.filter(company=company).select_related(
            'dispatch_entry__customer'
        )
        return JsonResponse({'challans': [dc_dict(dc) for dc in qs]})

    data = json.loads(request.body)
    dc = DeliveryChallan.objects.create(
        company=company,
        dispatch_entry_id=data.get('dispatch_entry_id') or None,
        dc_date=data.get('dc_date', str(datetime.date.today())),
        vehicle_number=data.get('vehicle_number', ''),
        driver_name=data.get('driver_name', ''),
        lr_number=data.get('lr_number', ''),
        transporter=data.get('transporter', ''),
        eway_bill=data.get('eway_bill', ''),
        delivery_address=data.get('delivery_address', ''),
        remarks=data.get('remarks', ''),
        status='draft',
        created_by=request.user if request.user.is_authenticated else None,
    )
    return JsonResponse({'success': True, 'challan': dc_dict(dc)}, status=201)


@csrf_exempt
@require_http_methods(['GET', 'PUT'])
def delivery_challan_detail(request, pk):
    company = get_active_company(request)
    try:
        dc = DeliveryChallan.objects.get(pk=pk, company=company)
    except DeliveryChallan.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'challan': dc_dict(dc)})

    data = json.loads(request.body)
    for field in ['vehicle_number', 'driver_name', 'lr_number', 'transporter',
                  'eway_bill', 'delivery_address', 'remarks', 'status']:
        if field in data:
            setattr(dc, field, data[field])
    dc.save()
    return JsonResponse({'success': True, 'challan': dc_dict(dc)})
