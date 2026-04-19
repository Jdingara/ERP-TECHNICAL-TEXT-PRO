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
from .models import ProcessEntry, ProcessEntryLotInput, Batch, BeamOutward, batch_number, YarnIssue
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
