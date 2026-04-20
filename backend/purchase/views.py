# ============================================================
# FILE: purchase/views.py
# PURPOSE: Purchase Order, GRN, Lot Creation APIs
#          Lot creation on GRN confirm is where traceability starts
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
    PurchaseOrder, PurchaseOrderLine,
    GRN, GRNLine, Lot, grn_lot_number, PurchaseInvoice
)
from masters.models import Vendor, YarnMaster, ItemMaster, UOM, Location


# ── Serializers ───────────────────────────────────────────────

def po_line_dict(line):
    return {
        'id': line.id,
        'material_type': line.material_type,
        'yarn_id': line.yarn_id,
        'yarn_code': line.yarn.item_code if line.yarn else '',
        'yarn_name': line.yarn.item_name if line.yarn else '',
        'item_id': line.item_id,
        'item_code': line.item.item_code if line.item else '',
        'item_name': line.item.item_name if line.item else '',
        'material_name': line.material_name,
        'ordered_quantity': str(line.ordered_quantity),
        'received_quantity': str(line.received_quantity),
        'pending_quantity': str(line.pending_quantity),
        'unit_price': str(line.unit_price),
        'total_price': str(line.total_price),
        'uom_id': line.uom_id,
        'uom_name': line.uom.short_name if line.uom else '',
        'notes': line.notes,
    }


def po_dict(po, include_lines=False):
    v = po.vendor
    d = {
        'id': po.id,
        'po_number': po.po_number,
        'vendor_id': po.vendor_id,
        'vendor_name': v.vendor_name if v else '',
        'vendor_code': v.vendor_code if v else '',
        'vendor_phone': v.phone if v else '',
        'vendor_email': v.email if v else '',
        'vendor_address': v.address if v else '',
        'vendor_city': v.city if v else '',
        'vendor_state': v.state if v else '',
        'vendor_gstin': v.gstin if v else '',
        'vendor_contact': v.contact_person if v else '',
        'order_date': str(po.order_date),
        'expected_date': str(po.expected_date) if po.expected_date else '',
        'status': po.status,
        'notes': po.notes,
        'total_amount': str(po.total_amount),
        'created_at': po.created_at.strftime('%Y-%m-%d %H:%M'),
    }
    if include_lines:
        d['lines'] = [po_line_dict(l) for l in po.lines.all()]
    return d


def grn_line_dict(line):
    return {
        'id': line.id,
        'po_line_id': line.po_line_id,
        'material_name': line.po_line.material_name if line.po_line else '',
        'material_type': line.po_line.material_type if line.po_line else '',
        'ordered_quantity': str(line.po_line.ordered_quantity) if line.po_line else '0',
        'received_quantity': str(line.received_quantity),
        'lot_created': line.lot_created,
    }


def grn_dict(grn, include_lines=False):
    d = {
        'id': grn.id,
        'grn_number': grn.grn_number,
        'purchase_order_id': grn.purchase_order_id,
        'po_number': grn.purchase_order.po_number if grn.purchase_order else '',
        'vendor_name': grn.purchase_order.vendor.vendor_name if grn.purchase_order and grn.purchase_order.vendor else '',
        'receipt_date': str(grn.receipt_date),
        'vendor_invoice_number': grn.vendor_invoice_number,
        'status': grn.status,
        'notes': grn.notes,
        'created_at': grn.created_at.strftime('%Y-%m-%d %H:%M'),
    }
    if include_lines:
        d['lines'] = [grn_line_dict(l) for l in grn.lines.all()]
    return d


def lot_dict(lot):
    return {
        'id': lot.id,
        'lot_number': lot.lot_number,
        'grn_id': lot.grn_id,
        'grn_number': lot.grn.grn_number if lot.grn else '',
        'material_type': lot.material_type,
        'yarn_id': lot.yarn_id,
        'yarn_code': lot.yarn.item_code if lot.yarn else '',
        'item_id': lot.item_id,
        'item_code': lot.item.item_code if lot.item else '',
        'material_name': lot.material_name,
        'color_code': lot.color_code,
        'color_name': lot.color_name,
        'quantity': str(lot.quantity),
        'balance_qty': str(lot.balance_qty),
        'uom_id': lot.uom_id,
        'uom_name': lot.uom.short_name if lot.uom else '',
        'location_id': lot.location_id,
        'location_name': lot.location.name if lot.location else '',
        'status': lot.status,
        'received_date': str(lot.received_date) if lot.received_date else '',
        'vendor_lot_ref': lot.vendor_lot_ref,
        'created_at': lot.created_at.strftime('%Y-%m-%d %H:%M'),
    }


def invoice_dict(inv):
    v = inv.vendor
    return {
        'id': inv.id,
        'invoice_number': inv.invoice_number,
        'grn_id': inv.grn_id,
        'grn_number': inv.grn.grn_number if inv.grn else '',
        'vendor_id': inv.vendor_id,
        'vendor_name': v.vendor_name if v else '',
        'vendor_phone': v.phone if v else '',
        'vendor_email': v.email if v else '',
        'vendor_address': v.address if v else '',
        'vendor_city': v.city if v else '',
        'vendor_state': v.state if v else '',
        'vendor_gstin': v.gstin if v else '',
        'vendor_contact': v.contact_person if v else '',
        'invoice_date': str(inv.invoice_date),
        'due_date': str(inv.due_date) if inv.due_date else '',
        'total_amount': str(inv.total_amount),
        'tax_amount': str(inv.tax_amount),
        'status': inv.status,
        'notes': inv.notes,
        'created_at': inv.created_at.strftime('%Y-%m-%d %H:%M'),
    }


# ── Auto-number helpers ───────────────────────────────────────

def next_po_number():
    today = datetime.date.today().strftime('%Y%m%d')
    count = PurchaseOrder.objects.filter(po_number__startswith=f'PO-{today}').count()
    return f"PO-{today}-{str(count + 1).zfill(3)}"


def next_grn_number():
    today = datetime.date.today().strftime('%Y%m%d')
    count = GRN.objects.filter(grn_number__startswith=f'GRN-{today}').count()
    return f"GRN-{today}-{str(count + 1).zfill(3)}"


def next_invoice_number():
    today = datetime.date.today().strftime('%Y%m%d')
    count = PurchaseInvoice.objects.filter(invoice_number__startswith=f'PINV-{today}').count()
    return f"PINV-{today}-{str(count + 1).zfill(3)}"


# ── Purchase Order List / Create ──────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def po_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = PurchaseOrder.objects.filter(company=company).select_related('vendor')
        status_filter = request.GET.get('status')
        search = request.GET.get('search', '').strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(
                Q(po_number__icontains=search) |
                Q(vendor__vendor_name__icontains=search)
            )
        return JsonResponse({'purchase_orders': [po_dict(p) for p in qs]})

    data = json.loads(request.body)
    with transaction.atomic():
        po = PurchaseOrder.objects.create(
            company=company,
            po_number=next_po_number(),
            vendor_id=data['vendor_id'],
            order_date=data['order_date'],
            expected_date=data.get('expected_date') or None,
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        total = 0
        for line_data in data.get('lines', []):
            qty = float(line_data.get('ordered_quantity', 0))
            price = float(line_data.get('unit_price', 0))
            line_total = qty * price
            total += line_total
            PurchaseOrderLine.objects.create(
                purchase_order=po,
                material_type=line_data.get('material_type', 'yarn'),
                yarn_id=line_data.get('yarn_id') or None,
                item_id=line_data.get('item_id') or None,
                ordered_quantity=qty,
                unit_price=price,
                total_price=line_total,
                uom_id=line_data.get('uom_id') or None,
                notes=line_data.get('notes', ''),
            )
        po.total_amount = total
        po.save()
    return JsonResponse({'success': True, 'purchase_order': po_dict(po, include_lines=True)}, status=201)


# ── Purchase Order Detail / Update / Confirm / Cancel ─────────

@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def po_detail(request, pk):
    try:
        po = PurchaseOrder.objects.get(pk=pk)
    except PurchaseOrder.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'purchase_order': po_dict(po, include_lines=True)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        action = data.get('action')

        if action == 'confirm':
            if po.status != 'draft':
                return JsonResponse({'error': 'Only draft POs can be confirmed'}, status=400)
            po.status = 'confirmed'
            po.save()
            return JsonResponse({'success': True, 'status': po.status})

        if action == 'cancel':
            if po.status in ('received', 'cancelled'):
                return JsonResponse({'error': 'Cannot cancel this PO'}, status=400)
            po.status = 'cancelled'
            po.save()
            return JsonResponse({'success': True, 'status': po.status})

        # General edit — only allowed in draft
        if po.status != 'draft':
            return JsonResponse({'error': 'Only draft POs can be edited'}, status=400)

        with transaction.atomic():
            po.vendor_id = data.get('vendor_id', po.vendor_id)
            po.order_date = data.get('order_date', po.order_date)
            po.expected_date = data.get('expected_date') or po.expected_date
            po.notes = data.get('notes', po.notes)

            if 'lines' in data:
                po.lines.all().delete()
                total = 0
                for line_data in data['lines']:
                    qty = float(line_data.get('ordered_quantity', 0))
                    price = float(line_data.get('unit_price', 0))
                    line_total = qty * price
                    total += line_total
                    PurchaseOrderLine.objects.create(
                        purchase_order=po,
                        material_type=line_data.get('material_type', 'yarn'),
                        yarn_id=line_data.get('yarn_id') or None,
                        item_id=line_data.get('item_id') or None,
                        ordered_quantity=qty,
                        unit_price=price,
                        total_price=line_total,
                        uom_id=line_data.get('uom_id') or None,
                        notes=line_data.get('notes', ''),
                    )
                po.total_amount = total
            po.save()
        return JsonResponse({'success': True, 'purchase_order': po_dict(po, include_lines=True)})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ── GRN List / Create ─────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def grn_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = GRN.objects.filter(company=company).select_related('purchase_order__vendor')
        po_id = request.GET.get('po_id')
        status_filter = request.GET.get('status')
        if po_id:
            qs = qs.filter(purchase_order_id=po_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return JsonResponse({'grns': [grn_dict(g) for g in qs]})

    data = json.loads(request.body)
    po_id = data.get('purchase_order_id')
    try:
        po = PurchaseOrder.objects.get(pk=po_id, company=company)
    except PurchaseOrder.DoesNotExist:
        return JsonResponse({'error': 'Purchase Order not found'}, status=404)

    if po.status not in ('confirmed', 'partial'):
        return JsonResponse({'error': 'PO must be confirmed before creating GRN'}, status=400)

    with transaction.atomic():
        grn = GRN.objects.create(
            company=company,
            grn_number=next_grn_number(),
            purchase_order=po,
            receipt_date=data.get('receipt_date', str(datetime.date.today())),
            vendor_invoice_number=data.get('vendor_invoice_number', ''),
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        for line_data in data.get('lines', []):
            GRNLine.objects.create(
                grn=grn,
                po_line_id=line_data['po_line_id'],
                received_quantity=line_data['received_quantity'],
            )
    return JsonResponse({'success': True, 'grn': grn_dict(grn, include_lines=True)}, status=201)


# ── GRN Detail ────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET'])
def grn_detail(request, pk):
    try:
        grn = GRN.objects.get(pk=pk)
    except GRN.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    return JsonResponse({'grn': grn_dict(grn, include_lines=True)})


# ── GRN Confirm + Lot Creation (CRITICAL ENDPOINT) ───────────
# Confirms GRN and creates individual LOTs from each GRN line.
# Each line can be split into multiple lots (different colors,
# different locations, or vendor sub-lots).
# This is where lot traceability begins.
#
# POST body example:
# {
#   "grn_id": 5,
#   "lot_splits": [
#     {
#       "grn_line_id": 12,
#       "lots": [
#         { "quantity": 100, "color_code": "R01", "color_name": "Red",
#           "location_id": 3, "vendor_lot_ref": "VL-001" },
#         { "quantity": 50, "color_code": "R01", "color_name": "Red",
#           "location_id": 3, "vendor_lot_ref": "VL-002" }
#       ]
#     }
#   ]
# }

@csrf_exempt
@require_http_methods(['POST'])
def grn_confirm_lots(request):
    company = get_active_company(request)
    data = json.loads(request.body)
    grn_id = data.get('grn_id')

    try:
        grn = GRN.objects.get(pk=grn_id, company=company)
    except GRN.DoesNotExist:
        return JsonResponse({'error': 'GRN not found'}, status=404)

    if grn.status == 'confirmed':
        return JsonResponse({'error': 'GRN already confirmed'}, status=400)

    lot_splits = data.get('lot_splits', [])
    if not lot_splits:
        return JsonResponse({'error': 'No lot split data provided'}, status=400)

    created_lots = []

    with transaction.atomic():
        for split in lot_splits:
            grn_line_id = split.get('grn_line_id')
            try:
                grn_line = GRNLine.objects.get(pk=grn_line_id, grn=grn)
            except GRNLine.DoesNotExist:
                return JsonResponse({'error': f'GRN Line {grn_line_id} not found'}, status=404)

            po_line = grn_line.po_line
            lots_data = split.get('lots', [])

            # Validate total lot qty does not exceed received qty
            total_lot_qty = sum(float(l.get('quantity', 0)) for l in lots_data)
            if round(total_lot_qty, 3) > round(float(grn_line.received_quantity), 3):
                return JsonResponse({
                    'error': (
                        f'Lot quantities ({total_lot_qty}) exceed received quantity '
                        f'({grn_line.received_quantity}) for GRN line {grn_line_id}'
                    )
                }, status=400)

            for lot_data in lots_data:
                qty = float(lot_data.get('quantity', 0))
                if qty <= 0:
                    continue
                lot = Lot.objects.create(
                    company=company,
                    lot_number=grn_lot_number(),
                    grn=grn,
                    grn_line=grn_line,
                    material_type=po_line.material_type,
                    yarn=po_line.yarn,
                    item=po_line.item,
                    color_code=lot_data.get('color_code', ''),
                    color_name=lot_data.get('color_name', ''),
                    quantity=qty,
                    balance_qty=qty,
                    uom=po_line.uom,
                    location_id=lot_data.get('location_id') or None,
                    status='available',
                    received_date=grn.receipt_date,
                    vendor_lot_ref=lot_data.get('vendor_lot_ref', ''),
                    created_by=request.user if request.user.is_authenticated else None,
                )
                created_lots.append(lot_dict(lot))

            grn_line.lot_created = True
            grn_line.save()

            # Update PO line received quantity
            po_line.received_quantity = (
                float(po_line.received_quantity) + float(grn_line.received_quantity)
            )
            po_line.save()

        # Confirm the GRN
        grn.status = 'confirmed'
        grn.save()

        # Update PO status
        po = grn.purchase_order
        po_lines = po.lines.all()
        all_received = all(
            round(float(l.received_quantity), 3) >= round(float(l.ordered_quantity), 3)
            for l in po_lines
        )
        po.status = 'received' if all_received else 'partial'
        po.save()

    return JsonResponse({
        'success': True,
        'message': f'{len(created_lots)} lot(s) created. GRN confirmed.',
        'lots': created_lots,
        'grn_status': grn.status,
        'po_status': po.status,
    })


# ── Lot List (Stock View) ─────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET'])
def lot_list(request):
    company = get_active_company(request)
    qs = Lot.objects.filter(company=company).select_related('yarn', 'item', 'uom', 'location', 'grn')

    status_filter = request.GET.get('status')
    material_type = request.GET.get('material_type')
    location_id = request.GET.get('location_id')
    yarn_id = request.GET.get('yarn_id')
    search = request.GET.get('search', '').strip()

    if status_filter:
        qs = qs.filter(status=status_filter)
    if material_type:
        qs = qs.filter(material_type=material_type)
    if location_id:
        qs = qs.filter(location_id=location_id)
    if yarn_id:
        qs = qs.filter(yarn_id=yarn_id)
    if search:
        qs = qs.filter(
            Q(lot_number__icontains=search) |
            Q(color_code__icontains=search) |
            Q(color_name__icontains=search) |
            Q(vendor_lot_ref__icontains=search) |
            Q(yarn__item_name__icontains=search) |
            Q(item__item_name__icontains=search)
        )

    return JsonResponse({'lots': [lot_dict(l) for l in qs]})


# ── Lot Detail ────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET'])
def lot_detail(request, pk):
    try:
        lot = Lot.objects.get(pk=pk)
    except Lot.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    return JsonResponse({'lot': lot_dict(lot)})


# ── Purchase Invoice List / Create ───────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def invoice_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = PurchaseInvoice.objects.filter(company=company).select_related('vendor', 'grn')
        status_filter = request.GET.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return JsonResponse({'invoices': [invoice_dict(i) for i in qs]})

    data = json.loads(request.body)
    grn_id = data.get('grn_id')
    try:
        grn = GRN.objects.get(pk=grn_id, company=company)
    except GRN.DoesNotExist:
        return JsonResponse({'error': 'GRN not found'}, status=404)

    if grn.status != 'confirmed':
        return JsonResponse({'error': 'GRN must be confirmed before creating invoice'}, status=400)

    inv = PurchaseInvoice.objects.create(
        company=company,
        invoice_number=next_invoice_number(),
        grn=grn,
        vendor=grn.purchase_order.vendor,
        invoice_date=data.get('invoice_date', str(datetime.date.today())),
        due_date=data.get('due_date') or None,
        total_amount=data.get('total_amount', 0),
        tax_amount=data.get('tax_amount', 0),
        notes=data.get('notes', ''),
    )
    return JsonResponse({'success': True, 'invoice': invoice_dict(inv)}, status=201)


# ── Invoice Detail / Post / Mark Paid ───────────────────────

@csrf_exempt
@require_http_methods(['GET', 'PUT'])
def invoice_detail(request, pk):
    try:
        inv = PurchaseInvoice.objects.get(pk=pk)
    except PurchaseInvoice.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'invoice': invoice_dict(inv)})

    data = json.loads(request.body)
    action = data.get('action')
    if action == 'post':
        inv.status = 'posted'
        inv.save()
    elif action == 'mark_paid':
        inv.status = 'paid'
        inv.save()
    else:
        inv.invoice_date = data.get('invoice_date', inv.invoice_date)
        inv.due_date = data.get('due_date', inv.due_date)
        inv.total_amount = data.get('total_amount', inv.total_amount)
        inv.tax_amount = data.get('tax_amount', inv.tax_amount)
        inv.notes = data.get('notes', inv.notes)
        inv.save()
    return JsonResponse({'success': True, 'invoice': invoice_dict(inv)})
