# ============================================================
# FILE: traceability/views.py
# PURPOSE: Traceability Search — USP screen
#          Search by: lot number, batch number, dispatch number,
#          customer name, or product. Returns full chain.
# ============================================================

from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db.models import Q

from master_data.company_utils import get_active_company
from .models import TraceabilityRecord


# ── Serializer ────────────────────────────────────────────────

def trace_dict(record):
    lot = record.lot
    batch = record.batch
    process_entry = record.process_entry
    dispatch = record.dispatch

    return {
        'id': record.id,

        # Raw Material
        'lot_number': record.lot_number,
        'material_name': lot.material_name if lot else record.material_name,
        'lot_color_code': lot.color_code if lot else '',
        'lot_color_name': lot.color_name if lot else '',
        'lot_vendor_ref': lot.vendor_lot_ref if lot else '',
        'lot_received_date': str(lot.received_date) if lot and lot.received_date else '',
        'grn_number': lot.grn.grn_number if lot and lot.grn else '',
        'vendor_name': lot.grn.purchase_order.vendor.vendor_name
            if lot and lot.grn and lot.grn.purchase_order and lot.grn.purchase_order.vendor
            else '',

        # Production
        'batch_number': record.batch_number,
        'process_stage': process_entry.process_stage.process_name if process_entry and process_entry.process_stage else record.process_stage,
        'machine_used': process_entry.machine.machine_code if process_entry and process_entry.machine else record.machine_used,
        'operator_name': process_entry.operator_name if process_entry else '',
        'production_date': str(process_entry.entry_date) if process_entry else (str(record.production_date) if record.production_date else ''),
        'batch_status': batch.status if batch else '',
        'product_name': batch.production_order.product.design_name
            if batch and batch.production_order and batch.production_order.product
            else '',
        'prod_order_number': batch.production_order.po_number if batch and batch.production_order else '',

        # Dispatch
        'dispatch_number': record.dispatch_number,
        'customer_name': dispatch.customer.customer_name if dispatch and dispatch.customer else record.customer_name,
        'dispatch_date': str(dispatch.dispatch_date) if dispatch else (str(record.dispatch_date) if record.dispatch_date else ''),
        'vehicle_number': dispatch.vehicle_number if dispatch else '',
        'lr_number': dispatch.lr_number if dispatch else '',
        'transporter': dispatch.transporter if dispatch else '',
    }


# ── Traceability Search ───────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET'])
def traceability_search(request):
    """
    Search traceability by any identifier.
    Query params:
      - q: search term (lot number / batch number / dispatch number / customer / product)
      - lot_number: exact lot search
      - batch_number: exact batch search
      - dispatch_number: exact dispatch search
      - customer_name: customer search
    """
    company = get_active_company(request)

    qs = TraceabilityRecord.objects.filter(company=company).select_related(
        'lot__grn__purchase_order__vendor',
        'batch__production_order__product',
        'process_entry__process_stage',
        'process_entry__machine',
        'dispatch__customer',
    )

    q = request.GET.get('q', '').strip()
    lot_number = request.GET.get('lot_number', '').strip()
    batch_number = request.GET.get('batch_number', '').strip()
    dispatch_number = request.GET.get('dispatch_number', '').strip()
    customer_name = request.GET.get('customer_name', '').strip()

    if q:
        qs = qs.filter(
            Q(lot_number__icontains=q) |
            Q(batch_number__icontains=q) |
            Q(dispatch_number__icontains=q) |
            Q(customer_name__icontains=q) |
            Q(material_name__icontains=q)
        )
    if lot_number:
        qs = qs.filter(lot_number__icontains=lot_number)
    if batch_number:
        qs = qs.filter(batch_number__icontains=batch_number)
    if dispatch_number:
        qs = qs.filter(dispatch_number__icontains=dispatch_number)
    if customer_name:
        qs = qs.filter(customer_name__icontains=customer_name)

    if not any([q, lot_number, batch_number, dispatch_number, customer_name]):
        return JsonResponse({'results': [], 'message': 'Please provide a search term'})

    results = [trace_dict(r) for r in qs[:100]]

    return JsonResponse({
        'results': results,
        'count': len(results),
    })


# ── Full Chain for a Single Batch ─────────────────────────────

@csrf_exempt
@require_http_methods(['GET'])
def batch_chain(request, batch_number):
    """
    Return the complete lot-to-customer chain for a specific batch number.
    Used in the Traceability Detail screen.
    """
    company = get_active_company(request)
    records = TraceabilityRecord.objects.filter(
        company=company, batch_number=batch_number
    ).select_related(
        'lot__grn__purchase_order__vendor',
        'batch__production_order__product',
        'process_entry__process_stage',
        'process_entry__machine',
        'dispatch__customer',
    )

    if not records.exists():
        return JsonResponse({'error': f'No traceability records found for batch {batch_number}'}, status=404)

    chain = {
        'batch_number': batch_number,
        'raw_materials': [],
        'production': None,
        'dispatch': None,
    }

    for r in records:
        lot = r.lot
        process_entry = r.process_entry
        batch = r.batch
        dispatch = r.dispatch

        # Raw material info per lot
        chain['raw_materials'].append({
            'lot_number': r.lot_number,
            'material_name': lot.material_name if lot else '',
            'color_code': lot.color_code if lot else '',
            'color_name': lot.color_name if lot else '',
            'vendor_name': lot.grn.purchase_order.vendor.vendor_name
                if lot and lot.grn and lot.grn.purchase_order and lot.grn.purchase_order.vendor
                else '',
            'vendor_lot_ref': lot.vendor_lot_ref if lot else '',
            'received_date': str(lot.received_date) if lot and lot.received_date else '',
            'grn_number': lot.grn.grn_number if lot and lot.grn else '',
        })

        # Production info (same for all rows in this batch)
        if chain['production'] is None and process_entry:
            chain['production'] = {
                'process_entry_number': process_entry.entry_number,
                'process_stage': process_entry.process_stage.process_name if process_entry.process_stage else '',
                'machine': process_entry.machine.machine_code if process_entry.machine else '',
                'machine_name': process_entry.machine.machine_name if process_entry.machine else '',
                'operator': process_entry.operator_name,
                'shift': process_entry.shift,
                'production_date': str(process_entry.entry_date),
                'product': batch.production_order.product.design_name if batch and batch.production_order and batch.production_order.product else '',
                'prod_order': batch.production_order.po_number if batch and batch.production_order else '',
                'output_qty': str(process_entry.output_quantity),
                'rejection_qty': str(process_entry.rejection_qty),
            }

        # Dispatch info
        if chain['dispatch'] is None and dispatch:
            chain['dispatch'] = {
                'dispatch_number': dispatch.dispatch_number,
                'dispatch_date': str(dispatch.dispatch_date),
                'customer': dispatch.customer.customer_name if dispatch.customer else '',
                'vehicle_number': dispatch.vehicle_number,
                'driver_name': dispatch.driver_name,
                'lr_number': dispatch.lr_number,
                'transporter': dispatch.transporter,
            }

    return JsonResponse({'chain': chain})


# ── Lot Trace (forward trace from lot) ───────────────────────

@csrf_exempt
@require_http_methods(['GET'])
def lot_trace(request, lot_number):
    """
    Forward trace: given a lot number, show what it was used for.
    """
    company = get_active_company(request)
    records = TraceabilityRecord.objects.filter(
        company=company, lot_number=lot_number
    ).select_related(
        'batch__production_order__product',
        'process_entry',
        'dispatch__customer',
    )

    if not records.exists():
        return JsonResponse({'error': f'No records found for lot {lot_number}'}, status=404)

    return JsonResponse({
        'lot_number': lot_number,
        'used_in': [trace_dict(r) for r in records],
    })
