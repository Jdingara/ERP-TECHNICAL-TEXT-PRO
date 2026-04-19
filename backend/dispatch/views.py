# ============================================================
# FILE: dispatch/views.py
# PURPOSE: Dispatch Entry, Sales Invoice, Packing Labels/Barcodes
#          Confirming dispatch:
#            1. Deducts batch balance_qty
#            2. Marks batch as 'dispatched'
#            3. Updates SalesOrder status
#            4. Updates TraceabilityRecord with dispatch info
# ============================================================

import json
import datetime
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db import transaction
from django.db.models import Q

from master_data.company_utils import get_active_company
from .models import DispatchEntry, DispatchLine, SalesInvoice, PackingLabel
from production_exec.models import Batch


# ── Serializers ───────────────────────────────────────────────

def dispatch_line_dict(line):
    return {
        'id': line.id,
        'batch_id': line.batch_id,
        'batch_number': line.batch.batch_number if line.batch else '',
        'product_name': (
            line.batch.production_order.product.design_name
            if line.batch and line.batch.production_order and line.batch.production_order.product
            else ''
        ),
        'quantity': str(line.quantity),
        'rolls': line.rolls,
        'notes': line.notes,
    }


def dispatch_dict(dispatch, include_lines=False):
    d = {
        'id': dispatch.id,
        'dispatch_number': dispatch.dispatch_number,
        'sales_order_id': dispatch.sales_order_id,
        'so_number': dispatch.sales_order.so_number if dispatch.sales_order else '',
        'customer_id': dispatch.customer_id,
        'customer_name': dispatch.customer.customer_name if dispatch.customer else '',
        'dispatch_date': str(dispatch.dispatch_date),
        'vehicle_number': dispatch.vehicle_number,
        'driver_name': dispatch.driver_name,
        'lr_number': dispatch.lr_number,
        'transporter': dispatch.transporter,
        'status': dispatch.status,
        'notes': dispatch.notes,
        'created_at': dispatch.created_at.strftime('%Y-%m-%d %H:%M'),
    }
    if include_lines:
        d['lines'] = [dispatch_line_dict(l) for l in dispatch.lines.all()]
    return d


def invoice_dict(inv):
    return {
        'id': inv.id,
        'invoice_number': inv.invoice_number,
        'dispatch_id': inv.dispatch_id,
        'dispatch_number': inv.dispatch.dispatch_number if inv.dispatch else '',
        'customer_id': inv.customer_id,
        'customer_name': inv.customer.customer_name if inv.customer else '',
        'invoice_date': str(inv.invoice_date),
        'due_date': str(inv.due_date) if inv.due_date else '',
        'subtotal': str(inv.subtotal),
        'tax_amount': str(inv.tax_amount),
        'total_amount': str(inv.total_amount),
        'paid_amount': str(inv.paid_amount),
        'balance_due': str(inv.balance_due),
        'status': inv.status,
        'notes': inv.notes,
        'created_at': inv.created_at.strftime('%Y-%m-%d %H:%M'),
    }


def label_dict(label):
    return {
        'id': label.id,
        'label_number': label.label_number,
        'batch_number': label.batch_number,
        'product_code': label.product_code,
        'quantity': str(label.quantity),
        'roll_number': label.roll_number,
        'barcode_data': label.barcode_data,
        'printed': label.printed,
    }


# ── Auto-number helpers ───────────────────────────────────────

def next_dispatch_number():
    today = datetime.date.today().strftime('%Y%m%d')
    count = DispatchEntry.objects.filter(dispatch_number__startswith=f'DC-{today}').count()
    return f"DC-{today}-{str(count + 1).zfill(3)}"


def next_invoice_number():
    today = datetime.date.today().strftime('%Y%m%d')
    count = SalesInvoice.objects.filter(invoice_number__startswith=f'SINV-{today}').count()
    return f"SINV-{today}-{str(count + 1).zfill(3)}"


def next_label_number(prefix):
    today = datetime.date.today().strftime('%Y%m%d')
    count = PackingLabel.objects.filter(label_number__startswith=f'LBL-{today}').count()
    return f"LBL-{today}-{str(count + 1).zfill(4)}"


# ── Dispatch Entry List / Create ──────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def dispatch_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = DispatchEntry.objects.filter(company=company).select_related('customer', 'sales_order')
        status_filter = request.GET.get('status')
        customer_id = request.GET.get('customer_id')
        search = request.GET.get('search', '').strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        if search:
            qs = qs.filter(
                Q(dispatch_number__icontains=search) |
                Q(customer__customer_name__icontains=search) |
                Q(lr_number__icontains=search)
            )
        return JsonResponse({'dispatch_entries': [dispatch_dict(d) for d in qs]})

    data = json.loads(request.body)
    with transaction.atomic():
        dispatch = DispatchEntry.objects.create(
            company=company,
            dispatch_number=next_dispatch_number(),
            sales_order_id=data.get('sales_order_id') or None,
            customer_id=data['customer_id'],
            dispatch_date=data.get('dispatch_date', str(datetime.date.today())),
            vehicle_number=data.get('vehicle_number', ''),
            driver_name=data.get('driver_name', ''),
            lr_number=data.get('lr_number', ''),
            transporter=data.get('transporter', ''),
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        for line_data in data.get('lines', []):
            DispatchLine.objects.create(
                dispatch=dispatch,
                batch_id=line_data['batch_id'],
                quantity=line_data['quantity'],
                rolls=line_data.get('rolls', 1),
                notes=line_data.get('notes', ''),
            )
    return JsonResponse({'success': True, 'dispatch': dispatch_dict(dispatch, include_lines=True)}, status=201)


# ── Dispatch Entry Detail ─────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'PUT'])
def dispatch_detail(request, pk):
    try:
        dispatch = DispatchEntry.objects.get(pk=pk)
    except DispatchEntry.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'dispatch': dispatch_dict(dispatch, include_lines=True)})

    data = json.loads(request.body)
    if dispatch.status == 'confirmed':
        return JsonResponse({'error': 'Confirmed dispatches cannot be edited'}, status=400)

    dispatch.vehicle_number = data.get('vehicle_number', dispatch.vehicle_number)
    dispatch.driver_name = data.get('driver_name', dispatch.driver_name)
    dispatch.lr_number = data.get('lr_number', dispatch.lr_number)
    dispatch.transporter = data.get('transporter', dispatch.transporter)
    dispatch.notes = data.get('notes', dispatch.notes)
    dispatch.save()
    return JsonResponse({'success': True, 'dispatch': dispatch_dict(dispatch, include_lines=True)})


# ── Confirm Dispatch (critical: deduct batch, update traceability) ──

@csrf_exempt
@require_http_methods(['POST'])
def confirm_dispatch(request, pk):
    company = get_active_company(request)
    try:
        dispatch = DispatchEntry.objects.get(pk=pk, company=company)
    except DispatchEntry.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if dispatch.status == 'confirmed':
        return JsonResponse({'error': 'Already dispatched'}, status=400)

    lines = list(dispatch.lines.select_related('batch').all())
    if not lines:
        return JsonResponse({'error': 'No lines in dispatch'}, status=400)

    # Validate batch quantities
    for line in lines:
        batch = line.batch
        if batch.status not in ('finished', 'qc_passed'):
            return JsonResponse({
                'error': f'Batch {batch.batch_number} is not ready for dispatch (status: {batch.status})'
            }, status=400)
        if float(line.quantity) > float(batch.balance_qty):
            return JsonResponse({
                'error': f'Batch {batch.batch_number}: dispatch qty {line.quantity} > available {batch.balance_qty}'
            }, status=400)

    with transaction.atomic():
        for line in lines:
            batch = line.batch
            new_balance = float(batch.balance_qty) - float(line.quantity)
            batch.balance_qty = max(0, new_balance)
            batch.status = 'dispatched' if batch.balance_qty <= 0 else batch.status
            batch.save()

            # Update TraceabilityRecord with dispatch info
            try:
                from traceability.models import TraceabilityRecord
                TraceabilityRecord.objects.filter(
                    company=company, batch=batch
                ).update(
                    dispatch=dispatch,
                    dispatch_number=dispatch.dispatch_number,
                    customer_name=dispatch.customer.customer_name if dispatch.customer else '',
                    dispatch_date=dispatch.dispatch_date,
                )
            except Exception:
                pass

        dispatch.status = 'confirmed'
        dispatch.save()

        # Update SalesOrder status if linked
        if dispatch.sales_order:
            so = dispatch.sales_order
            so.status = 'dispatched'
            so.save()

    return JsonResponse({
        'success': True,
        'message': 'Dispatch confirmed. Batches updated.',
        'dispatch_number': dispatch.dispatch_number,
    })


# ── Sales Invoice List / Create ───────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def invoice_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = SalesInvoice.objects.filter(company=company).select_related('customer', 'dispatch')
        status_filter = request.GET.get('status')
        customer_id = request.GET.get('customer_id')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        return JsonResponse({'invoices': [invoice_dict(i) for i in qs]})

    data = json.loads(request.body)
    dispatch_id = data.get('dispatch_id')
    try:
        dispatch = DispatchEntry.objects.get(pk=dispatch_id, company=company)
    except DispatchEntry.DoesNotExist:
        return JsonResponse({'error': 'Dispatch not found'}, status=404)

    if dispatch.status != 'confirmed':
        return JsonResponse({'error': 'Dispatch must be confirmed before creating invoice'}, status=400)

    inv = SalesInvoice.objects.create(
        company=company,
        invoice_number=next_invoice_number(),
        dispatch=dispatch,
        customer=dispatch.customer,
        invoice_date=data.get('invoice_date', str(datetime.date.today())),
        due_date=data.get('due_date') or None,
        subtotal=data.get('subtotal', 0),
        tax_amount=data.get('tax_amount', 0),
        total_amount=data.get('total_amount', 0),
        notes=data.get('notes', ''),
        created_by=request.user if request.user.is_authenticated else None,
    )
    return JsonResponse({'success': True, 'invoice': invoice_dict(inv)}, status=201)


# ── Invoice Detail / Payment Update ──────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'PUT'])
def invoice_detail(request, pk):
    try:
        inv = SalesInvoice.objects.get(pk=pk)
    except SalesInvoice.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'invoice': invoice_dict(inv)})

    data = json.loads(request.body)
    action = data.get('action')
    if action == 'mark_sent':
        inv.status = 'sent'
        inv.save()
    elif action == 'record_payment':
        inv.paid_amount = float(inv.paid_amount) + float(data.get('amount', 0))
        inv.status = 'paid' if float(inv.paid_amount) >= float(inv.total_amount) else 'sent'
        inv.save()
    elif action == 'mark_overdue':
        inv.status = 'overdue'
        inv.save()
    else:
        inv.subtotal = data.get('subtotal', inv.subtotal)
        inv.tax_amount = data.get('tax_amount', inv.tax_amount)
        inv.total_amount = data.get('total_amount', inv.total_amount)
        inv.due_date = data.get('due_date', inv.due_date)
        inv.notes = data.get('notes', inv.notes)
        inv.save()
    return JsonResponse({'success': True, 'invoice': invoice_dict(inv)})


# ── Packing Labels / Barcode Generation ──────────────────────

@csrf_exempt
@require_http_methods(['POST'])
def generate_labels(request):
    """
    Generate packing labels for a dispatch.
    Creates one label per roll per dispatch line.
    POST body: { "dispatch_id": 5 }
    """
    company = get_active_company(request)
    data = json.loads(request.body)
    dispatch_id = data.get('dispatch_id')

    try:
        dispatch = DispatchEntry.objects.get(pk=dispatch_id, company=company)
    except DispatchEntry.DoesNotExist:
        return JsonResponse({'error': 'Dispatch not found'}, status=404)

    labels_created = []
    today = datetime.date.today().strftime('%Y%m%d')

    with transaction.atomic():
        for line in dispatch.lines.select_related('batch__production_order__product').all():
            batch = line.batch
            product_code = batch.production_order.product.design_code if batch.production_order and batch.production_order.product else ''
            qty_per_roll = float(line.quantity) / max(1, line.rolls)

            for roll_num in range(1, line.rolls + 1):
                count = PackingLabel.objects.filter(label_number__startswith=f'LBL-{today}').count()
                label_num = f"LBL-{today}-{str(count + 1).zfill(4)}"

                # Barcode encodes: batch|product|dispatch|roll
                barcode = f"{batch.batch_number}|{product_code}|{dispatch.dispatch_number}|R{roll_num:03d}"

                label = PackingLabel.objects.create(
                    dispatch_line=line,
                    label_number=label_num,
                    batch_number=batch.batch_number,
                    product_code=product_code,
                    quantity=round(qty_per_roll, 3),
                    roll_number=roll_num,
                    barcode_data=barcode,
                )
                labels_created.append(label_dict(label))

    return JsonResponse({
        'success': True,
        'message': f'{len(labels_created)} label(s) generated',
        'labels': labels_created,
    })


# ── Mark Labels as Printed ────────────────────────────────────

@csrf_exempt
@require_http_methods(['POST'])
def mark_labels_printed(request):
    data = json.loads(request.body)
    label_ids = data.get('label_ids', [])
    PackingLabel.objects.filter(pk__in=label_ids).update(printed=True)
    return JsonResponse({'success': True, 'updated': len(label_ids)})
