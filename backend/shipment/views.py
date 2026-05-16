# ============================================================
# FILE: shipment/views.py
# PURPOSE: API views for PSI, Shipment, and CostingSheet
# ============================================================

import json
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .models import PreShipmentInspection, PSIChecklistItem, Shipment, CostingSheet
from order_management.models import CustomerOrder, FactoryOrder
from authentication.views import get_active_company


# ── Helpers ──────────────────────────────────────────────────

def psi_dict(p):
    return {
        'id': p.id,
        'psi_number': p.psi_number,
        'customer_order_id': p.customer_order_id,
        'co_number': p.customer_order.co_number,
        'customer_name': p.customer_order.customer.customer_name if p.customer_order.customer else '',
        'factory_order_id': p.factory_order_id,
        'fo_number': p.factory_order.fo_number if p.factory_order else None,
        'inspection_date': str(p.inspection_date),
        'inspector_name': p.inspector_name,
        'inspection_agency': p.inspection_agency,
        'result': p.result,
        'quantity_inspected': p.quantity_inspected,
        'quantity_passed': p.quantity_passed,
        'aql_level': p.aql_level,
        'critical_defects': p.critical_defects,
        'major_defects': p.major_defects,
        'minor_defects': p.minor_defects,
        'remarks': p.remarks,
        'report_file_url': p.report_file_url,
        'created_at': p.created_at.isoformat(),
    }


def checklist_dict(c):
    return {
        'id': c.id,
        'section': c.section,
        'description': c.description,
        'result': c.result,
        'remarks': c.remarks,
        'sort_order': c.sort_order,
    }


def shipment_dict(s):
    return {
        'id': s.id,
        'shipment_number': s.shipment_number,
        'customer_order_id': s.customer_order_id,
        'co_number': s.customer_order.co_number,
        'customer_name': s.customer_order.customer.customer_name if s.customer_order.customer else '',
        'factory_order_id': s.factory_order_id,
        'fo_number': s.factory_order.fo_number if s.factory_order else None,
        'psi_id': s.psi_id,
        'psi_number': s.psi.psi_number if s.psi else None,
        'mode': s.mode,
        'status': s.status,
        'shipper': s.shipper,
        'consignee': s.consignee,
        'forwarder': s.forwarder,
        'port_of_loading': s.port_of_loading,
        'port_of_discharge': s.port_of_discharge,
        'etd': str(s.etd) if s.etd else None,
        'eta': str(s.eta) if s.eta else None,
        'actual_departure': str(s.actual_departure) if s.actual_departure else None,
        'actual_arrival': str(s.actual_arrival) if s.actual_arrival else None,
        'bl_number': s.bl_number,
        'container_number': s.container_number,
        'total_cartons': s.total_cartons,
        'total_qty': s.total_qty,
        'gross_weight_kg': float(s.gross_weight_kg),
        'cbm': float(s.cbm),
        'invoice_value': float(s.invoice_value),
        'currency': s.currency,
        'notes': s.notes,
        'created_at': s.created_at.isoformat(),
    }


def costing_dict(c):
    fob = float(c.fob_price_per_pc)
    qty = c.total_quantity
    total_cost_pp = (
        float(c.fabric_cost) + float(c.trim_cost) + float(c.embroidery_print) +
        float(c.washing_finishing) + float(c.cm_cost) + float(c.testing_cost) +
        float(c.inspection_cost) + float(c.freight_cost) + float(c.other_cost)
    )
    commission_pp = fob * float(c.commission_pct) / 100
    total_cost_with_comm = total_cost_pp + commission_pp
    margin_pp = fob - total_cost_with_comm
    margin_pct = (margin_pp / fob * 100) if fob else 0
    return {
        'id': c.id,
        'customer_order_id': c.customer_order_id,
        'co_number': c.customer_order.co_number,
        'currency': c.currency,
        'fob_price_per_pc': float(c.fob_price_per_pc),
        'total_quantity': c.total_quantity,
        'fabric_cost': float(c.fabric_cost),
        'trim_cost': float(c.trim_cost),
        'embroidery_print': float(c.embroidery_print),
        'washing_finishing': float(c.washing_finishing),
        'cm_cost': float(c.cm_cost),
        'testing_cost': float(c.testing_cost),
        'inspection_cost': float(c.inspection_cost),
        'freight_cost': float(c.freight_cost),
        'other_cost': float(c.other_cost),
        'commission_pct': float(c.commission_pct),
        'notes': c.notes,
        # Calculated
        'total_cost_per_pc': round(total_cost_pp, 4),
        'commission_per_pc': round(commission_pp, 4),
        'margin_per_pc': round(margin_pp, 4),
        'margin_pct': round(margin_pct, 2),
        'total_revenue': round(fob * qty, 2),
        'total_cost': round(total_cost_with_comm * qty, 2),
        'total_margin': round(margin_pp * qty, 2),
        'updated_at': c.updated_at.isoformat(),
    }


# ── PSI ──────────────────────────────────────────────────────

@csrf_exempt
@login_required
def psi_list(request):
    company = get_active_company(request)
    if not company:
        return JsonResponse({'error': 'No active company'}, status=400)

    if request.method == 'GET':
        qs = PreShipmentInspection.objects.filter(company=company).select_related(
            'customer_order', 'customer_order__customer', 'factory_order'
        )
        co_id = request.GET.get('co')
        result = request.GET.get('result')
        if co_id:
            qs = qs.filter(customer_order_id=co_id)
        if result:
            qs = qs.filter(result=result)
        return JsonResponse({'psi_list': [psi_dict(p) for p in qs]})

    if request.method == 'POST':
        d = json.loads(request.body)
        co = CustomerOrder.objects.get(id=d['customer_order_id'], company=company)
        fo = None
        if d.get('factory_order_id'):
            fo = FactoryOrder.objects.get(id=d['factory_order_id'], company=company)
        p = PreShipmentInspection.objects.create(
            company=company,
            customer_order=co,
            factory_order=fo,
            inspection_date=d['inspection_date'],
            inspector_name=d.get('inspector_name', ''),
            inspection_agency=d.get('inspection_agency', ''),
            result=d.get('result', 'pending'),
            quantity_inspected=d.get('quantity_inspected', 0),
            quantity_passed=d.get('quantity_passed', 0),
            aql_level=d.get('aql_level', '2.5'),
            critical_defects=d.get('critical_defects', 0),
            major_defects=d.get('major_defects', 0),
            minor_defects=d.get('minor_defects', 0),
            remarks=d.get('remarks', ''),
            report_file_url=d.get('report_file_url', ''),
            created_by=request.user,
        )
        # Create default checklist items if requested
        if d.get('default_checklist'):
            DEFAULT_CHECKLIST = [
                ('Workmanship', 'Stitching quality and thread tension'),
                ('Workmanship', 'Seam strength and alignment'),
                ('Measurements', 'Size measurements per spec sheet'),
                ('Measurements', 'Tolerances within ±1cm'),
                ('Appearance', 'Fabric shade and color consistency'),
                ('Appearance', 'No fabric defects (holes, stains, pulls)'),
                ('Labels & Trims', 'Care label content and placement'),
                ('Labels & Trims', 'Brand/size label correct'),
                ('Labels & Trims', 'Hangtag and price ticket'),
                ('Packing', 'Carton marking and labeling'),
                ('Packing', 'Polybag and folding per requirement'),
                ('Packing', 'Quantity per carton correct'),
                ('Accessories', 'Buttons, zippers, rivets secure'),
                ('Safety', 'Sharp edge / needle check'),
            ]
            for i, (section, desc) in enumerate(DEFAULT_CHECKLIST):
                PSIChecklistItem.objects.create(psi=p, section=section, description=desc, sort_order=i)
        return JsonResponse({'psi': psi_dict(p)}, status=201)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def psi_detail(request, pk):
    company = get_active_company(request)
    try:
        p = PreShipmentInspection.objects.select_related(
            'customer_order', 'customer_order__customer', 'factory_order'
        ).get(pk=pk, company=company)
    except PreShipmentInspection.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        data = psi_dict(p)
        data['checklist_items'] = [checklist_dict(c) for c in p.checklist_items.all()]
        return JsonResponse({'psi': data})

    if request.method == 'PUT':
        d = json.loads(request.body)
        for f in ['inspection_date', 'inspector_name', 'inspection_agency', 'result',
                  'quantity_inspected', 'quantity_passed', 'aql_level',
                  'critical_defects', 'major_defects', 'minor_defects',
                  'remarks', 'report_file_url']:
            if f in d:
                setattr(p, f, d[f])
        if 'factory_order_id' in d:
            p.factory_order = FactoryOrder.objects.get(id=d['factory_order_id'], company=company) if d['factory_order_id'] else None
        p.save()
        return JsonResponse({'psi': psi_dict(p)})

    if request.method == 'DELETE':
        p.delete()
        return JsonResponse({'ok': True})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def psi_checklist(request, psi_pk):
    company = get_active_company(request)
    try:
        p = PreShipmentInspection.objects.get(pk=psi_pk, company=company)
    except PreShipmentInspection.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'checklist_items': [checklist_dict(c) for c in p.checklist_items.all()]})

    if request.method == 'POST':
        d = json.loads(request.body)
        c = PSIChecklistItem.objects.create(
            psi=p,
            section=d.get('section', ''),
            description=d['description'],
            result=d.get('result', 'na'),
            remarks=d.get('remarks', ''),
            sort_order=d.get('sort_order', 0),
        )
        return JsonResponse({'checklist_item': checklist_dict(c)}, status=201)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def checklist_item_detail(request, pk):
    try:
        c = PSIChecklistItem.objects.select_related('psi').get(pk=pk)
    except PSIChecklistItem.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'PUT':
        d = json.loads(request.body)
        for f in ['section', 'description', 'result', 'remarks', 'sort_order']:
            if f in d:
                setattr(c, f, d[f])
        c.save()
        return JsonResponse({'checklist_item': checklist_dict(c)})

    if request.method == 'DELETE':
        c.delete()
        return JsonResponse({'ok': True})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ── Shipments ────────────────────────────────────────────────

@csrf_exempt
@login_required
def shipment_list(request):
    company = get_active_company(request)
    if not company:
        return JsonResponse({'error': 'No active company'}, status=400)

    if request.method == 'GET':
        qs = Shipment.objects.filter(company=company).select_related(
            'customer_order', 'customer_order__customer', 'factory_order', 'psi'
        )
        co_id = request.GET.get('co')
        status = request.GET.get('status')
        if co_id:
            qs = qs.filter(customer_order_id=co_id)
        if status:
            qs = qs.filter(status=status)
        return JsonResponse({'shipments': [shipment_dict(s) for s in qs]})

    if request.method == 'POST':
        d = json.loads(request.body)
        co = CustomerOrder.objects.get(id=d['customer_order_id'], company=company)
        fo = None
        if d.get('factory_order_id'):
            fo = FactoryOrder.objects.get(id=d['factory_order_id'], company=company)
        psi = None
        if d.get('psi_id'):
            psi = PreShipmentInspection.objects.get(id=d['psi_id'], company=company)
        s = Shipment.objects.create(
            company=company,
            customer_order=co,
            factory_order=fo,
            psi=psi,
            mode=d.get('mode', 'sea'),
            status=d.get('status', 'draft'),
            shipper=d.get('shipper', ''),
            consignee=d.get('consignee', ''),
            forwarder=d.get('forwarder', ''),
            port_of_loading=d.get('port_of_loading', ''),
            port_of_discharge=d.get('port_of_discharge', ''),
            etd=d.get('etd') or None,
            eta=d.get('eta') or None,
            actual_departure=d.get('actual_departure') or None,
            actual_arrival=d.get('actual_arrival') or None,
            bl_number=d.get('bl_number', ''),
            container_number=d.get('container_number', ''),
            total_cartons=d.get('total_cartons', 0),
            total_qty=d.get('total_qty', 0),
            gross_weight_kg=d.get('gross_weight_kg', 0),
            cbm=d.get('cbm', 0),
            invoice_value=d.get('invoice_value', 0),
            currency=d.get('currency', 'USD'),
            notes=d.get('notes', ''),
            created_by=request.user,
        )
        return JsonResponse({'shipment': shipment_dict(s)}, status=201)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def shipment_detail(request, pk):
    company = get_active_company(request)
    try:
        s = Shipment.objects.select_related(
            'customer_order', 'customer_order__customer', 'factory_order', 'psi'
        ).get(pk=pk, company=company)
    except Shipment.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'shipment': shipment_dict(s)})

    if request.method == 'PUT':
        d = json.loads(request.body)
        for f in ['mode', 'status', 'shipper', 'consignee', 'forwarder',
                  'port_of_loading', 'port_of_discharge', 'bl_number', 'container_number',
                  'total_cartons', 'total_qty', 'gross_weight_kg', 'cbm',
                  'invoice_value', 'currency', 'notes']:
            if f in d:
                setattr(s, f, d[f])
        for f in ['etd', 'eta', 'actual_departure', 'actual_arrival']:
            if f in d:
                setattr(s, f, d[f] or None)
        if 'factory_order_id' in d:
            s.factory_order = FactoryOrder.objects.get(id=d['factory_order_id'], company=company) if d['factory_order_id'] else None
        if 'psi_id' in d:
            s.psi = PreShipmentInspection.objects.get(id=d['psi_id'], company=company) if d['psi_id'] else None
        s.save()
        return JsonResponse({'shipment': shipment_dict(s)})

    if request.method == 'DELETE':
        s.delete()
        return JsonResponse({'ok': True})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ── Costing Sheet ────────────────────────────────────────────

@csrf_exempt
@login_required
def costing_sheet(request, co_pk):
    company = get_active_company(request)
    try:
        co = CustomerOrder.objects.get(pk=co_pk, company=company)
    except CustomerOrder.DoesNotExist:
        return JsonResponse({'error': 'Order not found'}, status=404)

    if request.method == 'GET':
        try:
            c = CostingSheet.objects.get(customer_order=co)
            return JsonResponse({'costing_sheet': costing_dict(c)})
        except CostingSheet.DoesNotExist:
            return JsonResponse({'costing_sheet': None})

    if request.method in ('POST', 'PUT'):
        d = json.loads(request.body)
        c, _ = CostingSheet.objects.get_or_create(customer_order=co)
        for f in ['currency', 'fob_price_per_pc', 'total_quantity',
                  'fabric_cost', 'trim_cost', 'embroidery_print', 'washing_finishing',
                  'cm_cost', 'testing_cost', 'inspection_cost', 'freight_cost',
                  'other_cost', 'commission_pct', 'notes']:
            if f in d:
                setattr(c, f, d[f])
        c.save()
        return JsonResponse({'costing_sheet': costing_dict(c)})

    return JsonResponse({'error': 'Method not allowed'}, status=405)
