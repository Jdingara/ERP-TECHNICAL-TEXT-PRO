# ============================================================
# FILE: planning/views.py
# PURPOSE: Sales Orders, Production Orders, Daily Planning APIs
#          SO → Production Order → Daily Plan → Machine assignment
# ============================================================

import json
import datetime
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db import transaction
from django.db.models import Q

from django.db.models import Sum

from master_data.company_utils import get_active_company
from .models import SalesOrder, SalesOrderLine, ProductionOrder, DailyPlan, CustomerForecast, ForecastLine
from masters.models import ProductDesign, Customer, Machine, Process, BOM, BOMLine
from purchase.models import Lot


# ── Serializers ───────────────────────────────────────────────

def so_line_dict(line):
    return {
        'id': line.id,
        'product_id': line.product_id,
        'product_code': line.product.design_code if line.product else '',
        'product_name': line.product.design_name if line.product else '',
        'quantity': str(line.quantity),
        'unit_price': str(line.unit_price),
        'total_price': str(line.total_price),
        'delivery_date': str(line.delivery_date) if line.delivery_date else '',
        'notes': line.notes,
    }


def so_dict(so, include_lines=False):
    c = so.customer
    d = {
        'id': so.id,
        'so_number': so.so_number,
        'customer_id': so.customer_id,
        'customer_name': c.customer_name if c else '',
        'customer_code': c.customer_code if c else '',
        'customer_phone': c.phone if c else '',
        'customer_email': c.email if c else '',
        'customer_address': c.address if c else '',
        'customer_city': c.city if c else '',
        'customer_state': c.state if c else '',
        'customer_gstin': c.gstin if c else '',
        'customer_contact': c.contact_person if c else '',
        'order_date': str(so.order_date),
        'delivery_date': str(so.delivery_date) if so.delivery_date else '',
        'status': so.status,
        'notes': so.notes,
        'total_amount': str(so.total_amount),
        'created_at': so.created_at.strftime('%Y-%m-%d %H:%M'),
    }
    if include_lines:
        d['lines'] = [so_line_dict(l) for l in so.lines.all()]
    return d


def prod_order_dict(po):
    return {
        'id': po.id,
        'po_number': po.po_number,
        'sales_order_id': po.sales_order_id,
        'so_number': po.sales_order.so_number if po.sales_order else '',
        'product_id': po.product_id,
        'product_code': po.product.design_code if po.product else '',
        'product_name': po.product.design_name if po.product else '',
        'planned_qty': str(po.planned_qty),
        'produced_qty': str(po.produced_qty),
        'pending_qty': str(po.pending_qty),
        'completion_pct': po.completion_pct,
        'start_date': str(po.start_date) if po.start_date else '',
        'delivery_date': str(po.delivery_date) if po.delivery_date else '',
        'priority': po.priority,
        'status': po.status,
        'notes': po.notes,
        'created_at': po.created_at.strftime('%Y-%m-%d %H:%M'),
    }


def daily_plan_dict(dp):
    return {
        'id': dp.id,
        'plan_date': str(dp.plan_date),
        'production_order_id': dp.production_order_id,
        'po_number': dp.production_order.po_number if dp.production_order else '',
        'product_name': dp.production_order.product.design_name if dp.production_order and dp.production_order.product else '',
        'machine_id': dp.machine_id,
        'machine_code': dp.machine.machine_code if dp.machine else '',
        'machine_name': dp.machine.machine_name if dp.machine else '',
        'process_stage_id': dp.process_stage_id,
        'process_name': dp.process_stage.process_name if dp.process_stage else '',
        'planned_qty': str(dp.planned_qty),
        'actual_qty': str(dp.actual_qty),
        'status': dp.status,
        'notes': dp.notes,
    }


# ── Auto-number helpers ───────────────────────────────────────

def next_so_number():
    today = datetime.date.today().strftime('%Y%m%d')
    count = SalesOrder.objects.filter(so_number__startswith=f'SO-{today}').count()
    return f"SO-{today}-{str(count + 1).zfill(3)}"


def next_prod_order_number():
    today = datetime.date.today().strftime('%Y%m%d')
    count = ProductionOrder.objects.filter(po_number__startswith=f'PRO-{today}').count()
    return f"PRO-{today}-{str(count + 1).zfill(3)}"


# ── Sales Order List / Create ─────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def so_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = SalesOrder.objects.filter(company=company).select_related('customer')
        status_filter = request.GET.get('status')
        search = request.GET.get('search', '').strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(
                Q(so_number__icontains=search) |
                Q(customer__customer_name__icontains=search)
            )
        return JsonResponse({'sales_orders': [so_dict(s) for s in qs]})

    data = json.loads(request.body)
    with transaction.atomic():
        so = SalesOrder.objects.create(
            company=company,
            so_number=next_so_number(),
            customer_id=data['customer_id'],
            order_date=data['order_date'],
            delivery_date=data.get('delivery_date') or None,
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        total = 0
        for line_data in data.get('lines', []):
            qty = float(line_data.get('quantity', 0))
            price = float(line_data.get('unit_price', 0))
            line_total = qty * price
            total += line_total
            SalesOrderLine.objects.create(
                sales_order=so,
                product_id=line_data['product_id'],
                quantity=qty,
                unit_price=price,
                total_price=line_total,
                delivery_date=line_data.get('delivery_date') or None,
                notes=line_data.get('notes', ''),
            )
        so.total_amount = total
        so.save()
    return JsonResponse({'success': True, 'sales_order': so_dict(so, include_lines=True)}, status=201)


# ── Sales Order Detail ────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'PUT'])
def so_detail(request, pk):
    try:
        so = SalesOrder.objects.get(pk=pk)
    except SalesOrder.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'sales_order': so_dict(so, include_lines=True)})

    data = json.loads(request.body)
    action = data.get('action')

    if action == 'confirm':
        if so.status != 'draft':
            return JsonResponse({'error': 'Only draft SOs can be confirmed'}, status=400)
        so.status = 'confirmed'
        so.save()
        return JsonResponse({'success': True, 'status': so.status})

    if action == 'cancel':
        if so.status in ('dispatched', 'cancelled'):
            return JsonResponse({'error': 'Cannot cancel this SO'}, status=400)
        so.status = 'cancelled'
        so.save()
        return JsonResponse({'success': True, 'status': so.status})

    if so.status != 'draft':
        return JsonResponse({'error': 'Only draft SOs can be edited'}, status=400)

    with transaction.atomic():
        so.customer_id = data.get('customer_id', so.customer_id)
        so.order_date = data.get('order_date', so.order_date)
        so.delivery_date = data.get('delivery_date') or so.delivery_date
        so.notes = data.get('notes', so.notes)

        if 'lines' in data:
            so.lines.all().delete()
            total = 0
            for line_data in data['lines']:
                qty = float(line_data.get('quantity', 0))
                price = float(line_data.get('unit_price', 0))
                line_total = qty * price
                total += line_total
                SalesOrderLine.objects.create(
                    sales_order=so,
                    product_id=line_data['product_id'],
                    quantity=qty,
                    unit_price=price,
                    total_price=line_total,
                    delivery_date=line_data.get('delivery_date') or None,
                    notes=line_data.get('notes', ''),
                )
            so.total_amount = total
        so.save()
    return JsonResponse({'success': True, 'sales_order': so_dict(so, include_lines=True)})


# ── Production Order List / Create ───────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def prod_order_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = ProductionOrder.objects.filter(company=company).select_related('product', 'sales_order__customer')
        status_filter = request.GET.get('status')
        priority = request.GET.get('priority')
        product_id = request.GET.get('product_id')
        search = request.GET.get('search', '').strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        if priority:
            qs = qs.filter(priority=priority)
        if product_id:
            qs = qs.filter(product_id=product_id)
        if search:
            qs = qs.filter(
                Q(po_number__icontains=search) |
                Q(product__design_name__icontains=search)
            )
        return JsonResponse({'production_orders': [prod_order_dict(p) for p in qs]})

    data = json.loads(request.body)
    prod_order = ProductionOrder.objects.create(
        company=company,
        po_number=next_prod_order_number(),
        sales_order_id=data.get('sales_order_id') or None,
        sales_order_line_id=data.get('sales_order_line_id') or None,
        product_id=data['product_id'],
        planned_qty=data['planned_qty'],
        start_date=data.get('start_date') or None,
        delivery_date=data.get('delivery_date') or None,
        priority=data.get('priority', 'normal'),
        notes=data.get('notes', ''),
        created_by=request.user if request.user.is_authenticated else None,
    )
    return JsonResponse({'success': True, 'production_order': prod_order_dict(prod_order)}, status=201)


# ── Production Order Detail ───────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'PUT'])
def prod_order_detail(request, pk):
    try:
        prod_order = ProductionOrder.objects.get(pk=pk)
    except ProductionOrder.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'production_order': prod_order_dict(prod_order)})

    data = json.loads(request.body)
    action = data.get('action')

    if action == 'release':
        if prod_order.status != 'draft':
            return JsonResponse({'error': 'Only draft production orders can be released'}, status=400)
        prod_order.status = 'planned'
        prod_order.save()
        return JsonResponse({'success': True, 'status': prod_order.status})

    if action == 'cancel':
        if prod_order.status == 'completed':
            return JsonResponse({'error': 'Completed orders cannot be cancelled'}, status=400)
        prod_order.status = 'cancelled'
        prod_order.save()
        return JsonResponse({'success': True, 'status': prod_order.status})

    # Edit
    prod_order.product_id = data.get('product_id', prod_order.product_id)
    prod_order.planned_qty = data.get('planned_qty', prod_order.planned_qty)
    prod_order.start_date = data.get('start_date') or prod_order.start_date
    prod_order.delivery_date = data.get('delivery_date') or prod_order.delivery_date
    prod_order.priority = data.get('priority', prod_order.priority)
    prod_order.notes = data.get('notes', prod_order.notes)
    prod_order.save()
    return JsonResponse({'success': True, 'production_order': prod_order_dict(prod_order)})


# ── Daily Plan List / Create ──────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def daily_plan_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = DailyPlan.objects.filter(company=company).select_related(
            'production_order__product', 'machine', 'process_stage'
        )
        plan_date = request.GET.get('plan_date')
        machine_id = request.GET.get('machine_id')
        prod_order_id = request.GET.get('production_order_id')
        if plan_date:
            qs = qs.filter(plan_date=plan_date)
        if machine_id:
            qs = qs.filter(machine_id=machine_id)
        if prod_order_id:
            qs = qs.filter(production_order_id=prod_order_id)
        return JsonResponse({'daily_plans': [daily_plan_dict(dp) for dp in qs]})

    data = json.loads(request.body)
    dp = DailyPlan.objects.create(
        company=company,
        plan_date=data['plan_date'],
        production_order_id=data['production_order_id'],
        machine_id=data['machine_id'],
        process_stage_id=data['process_stage_id'],
        planned_qty=data['planned_qty'],
        notes=data.get('notes', ''),
        created_by=request.user if request.user.is_authenticated else None,
    )
    return JsonResponse({'success': True, 'daily_plan': daily_plan_dict(dp)}, status=201)


# ── Daily Plan Detail / Update ────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def daily_plan_detail(request, pk):
    try:
        dp = DailyPlan.objects.get(pk=pk)
    except DailyPlan.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'daily_plan': daily_plan_dict(dp)})

    if request.method == 'DELETE':
        if dp.status != 'planned':
            return JsonResponse({'error': 'Only planned entries can be deleted'}, status=400)
        dp.delete()
        return JsonResponse({'success': True})

    data = json.loads(request.body)
    dp.planned_qty = data.get('planned_qty', dp.planned_qty)
    dp.actual_qty = data.get('actual_qty', dp.actual_qty)
    dp.machine_id = data.get('machine_id', dp.machine_id)
    dp.process_stage_id = data.get('process_stage_id', dp.process_stage_id)
    dp.status = data.get('status', dp.status)
    dp.notes = data.get('notes', dp.notes)
    dp.save()
    return JsonResponse({'success': True, 'daily_plan': daily_plan_dict(dp)})


# ── Customer Forecast ─────────────────────────────────────────

def forecast_line_dict(ln):
    return {
        'id': ln.id,
        'product_id': ln.product_id,
        'product_code': ln.product.design_code if ln.product else '',
        'product_name': ln.product.design_name if ln.product else '',
        'process_route': ln.product.process_route if ln.product else '',
        'month_1_qty': str(ln.month_1_qty),
        'month_2_qty': str(ln.month_2_qty),
        'month_3_qty': str(ln.month_3_qty),
        'total_qty': ln.total_qty,
        'uom': ln.uom,
        'notes': ln.notes,
    }


def forecast_dict(fc, include_lines=False):
    d = {
        'id': fc.id,
        'customer_id': fc.customer_id,
        'customer_name': fc.customer.customer_name if fc.customer else '',
        'customer_code': fc.customer.customer_code if fc.customer else '',
        'title': fc.title,
        'period_from': str(fc.period_from),
        'period_to': str(fc.period_to),
        'month_1_label': fc.month_1_label,
        'month_2_label': fc.month_2_label,
        'month_3_label': fc.month_3_label,
        'status': fc.status,
        'notes': fc.notes,
        'created_at': fc.created_at.strftime('%Y-%m-%d %H:%M'),
    }
    if include_lines:
        d['lines'] = [forecast_line_dict(ln) for ln in fc.lines.select_related('product').all()]
    return d


@csrf_exempt
@require_http_methods(['GET', 'POST'])
def forecast_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = CustomerForecast.objects.filter(company=company).select_related('customer')
        customer_id = request.GET.get('customer_id')
        status_filter = request.GET.get('status')
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return JsonResponse({'forecasts': [forecast_dict(fc) for fc in qs]})

    data = json.loads(request.body)
    with transaction.atomic():
        fc = CustomerForecast.objects.create(
            company=company,
            customer_id=data['customer_id'],
            title=data['title'],
            period_from=data['period_from'],
            period_to=data['period_to'],
            month_1_label=data.get('month_1_label', ''),
            month_2_label=data.get('month_2_label', ''),
            month_3_label=data.get('month_3_label', ''),
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        for ln_data in data.get('lines', []):
            ForecastLine.objects.create(
                forecast=fc,
                product_id=ln_data['product_id'],
                month_1_qty=ln_data.get('month_1_qty', 0),
                month_2_qty=ln_data.get('month_2_qty', 0),
                month_3_qty=ln_data.get('month_3_qty', 0),
                uom=ln_data.get('uom', 'kg'),
                notes=ln_data.get('notes', ''),
            )
    return JsonResponse({'success': True, 'forecast': forecast_dict(fc, include_lines=True)}, status=201)


@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def forecast_detail(request, pk):
    try:
        fc = CustomerForecast.objects.get(pk=pk)
    except CustomerForecast.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'forecast': forecast_dict(fc, include_lines=True)})

    if request.method == 'DELETE':
        if fc.status == 'confirmed':
            return JsonResponse({'error': 'Cannot delete a confirmed forecast'}, status=400)
        fc.delete()
        return JsonResponse({'success': True})

    data = json.loads(request.body)
    action = data.get('action')

    if action == 'confirm':
        if fc.status != 'draft':
            return JsonResponse({'error': 'Already confirmed'}, status=400)
        fc.status = 'confirmed'
        fc.save()
        return JsonResponse({'success': True, 'status': fc.status})

    if fc.status == 'confirmed':
        return JsonResponse({'error': 'Confirmed forecasts cannot be edited'}, status=400)

    with transaction.atomic():
        fc.title = data.get('title', fc.title)
        fc.period_from = data.get('period_from', fc.period_from)
        fc.period_to = data.get('period_to', fc.period_to)
        fc.month_1_label = data.get('month_1_label', fc.month_1_label)
        fc.month_2_label = data.get('month_2_label', fc.month_2_label)
        fc.month_3_label = data.get('month_3_label', fc.month_3_label)
        fc.notes = data.get('notes', fc.notes)
        if 'lines' in data:
            fc.lines.all().delete()
            for ln_data in data['lines']:
                ForecastLine.objects.create(
                    forecast=fc,
                    product_id=ln_data['product_id'],
                    month_1_qty=ln_data.get('month_1_qty', 0),
                    month_2_qty=ln_data.get('month_2_qty', 0),
                    month_3_qty=ln_data.get('month_3_qty', 0),
                    uom=ln_data.get('uom', 'kg'),
                    notes=ln_data.get('notes', ''),
                )
        fc.save()
    return JsonResponse({'success': True, 'forecast': forecast_dict(fc, include_lines=True)})


# ── Procurement Plan (BOM explosion vs Stock) ─────────────────

@csrf_exempt
@require_http_methods(['GET'])
def procurement_plan(request, pk):
    company = get_active_company(request)
    try:
        fc = CustomerForecast.objects.get(pk=pk)
    except CustomerForecast.DoesNotExist:
        return JsonResponse({'error': 'Forecast not found'}, status=404)

    rows = []
    for ln in fc.lines.select_related('product').all():
        total_qty = float(ln.total_qty)
        if total_qty == 0:
            continue
        try:
            bom = ln.product.bom
        except BOM.DoesNotExist:
            rows.append({
                'product_code': ln.product.design_code,
                'product_name': ln.product.design_name,
                'process_route': ln.product.process_route,
                'forecast_qty': total_qty,
                'bom_available': False,
                'materials': [],
            })
            continue

        materials = []
        for bl in bom.lines.select_related('yarn', 'item', 'uom', 'process_stage').all():
            required = float(bl.quantity) * total_qty
            mat_name = ''
            mat_code = ''
            mat_type = bl.material_type

            if mat_type == 'yarn' and bl.yarn:
                mat_name = bl.yarn.item_name
                mat_code = bl.yarn.item_code
                stock_agg = Lot.objects.filter(
                    company=company,
                    yarn=bl.yarn,
                    status__in=['available', 'in_use']
                ).aggregate(s=Sum('balance_qty'))
                stock_qty = float(stock_agg['s'] or 0)
            elif bl.item:
                mat_name = bl.item.item_name
                mat_code = bl.item.item_code
                stock_agg = Lot.objects.filter(
                    company=company,
                    item=bl.item,
                    status__in=['available', 'in_use']
                ).aggregate(s=Sum('balance_qty'))
                stock_qty = float(stock_agg['s'] or 0)
            else:
                mat_name = '(unlinked)'
                mat_code = ''
                stock_qty = 0

            shortfall = max(0.0, required - stock_qty)
            materials.append({
                'material_type': mat_type,
                'material_code': mat_code,
                'material_name': mat_name,
                'process_stage': bl.process_stage.process_name if bl.process_stage else '',
                'uom': bl.uom.short_name if bl.uom else '',
                'required_qty': round(required, 3),
                'stock_qty': round(stock_qty, 3),
                'shortfall_qty': round(shortfall, 3),
            })

        rows.append({
            'product_code': ln.product.design_code,
            'product_name': ln.product.design_name,
            'process_route': ln.product.process_route,
            'forecast_qty': total_qty,
            'bom_available': True,
            'materials': materials,
        })

    return JsonResponse({
        'forecast_id': fc.id,
        'forecast_title': fc.title,
        'customer_name': fc.customer.customer_name if fc.customer else '',
        'period_from': str(fc.period_from),
        'period_to': str(fc.period_to),
        'rows': rows,
    })
