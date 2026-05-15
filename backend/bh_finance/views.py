# ============================================================
# FILE: bh_finance/views.py
# PURPOSE: API views for Sales Invoices, Purchase Invoices, Payments
# ============================================================

import json
from collections import defaultdict
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Q, Count
from django.utils import timezone
from datetime import timedelta
from .models import SalesInvoice, SalesInvoiceItem, PurchaseInvoice, PurchaseInvoiceItem, Payment
from order_management.models import CustomerOrder, FactoryOrder, TAMilestone
from product_development.models import PDRequest
from masters.models import Customer, Vendor
from shipment.models import Shipment, PreShipmentInspection
from authentication.views import get_active_company


# ── Serializers ──────────────────────────────────────────────

def si_item_dict(i):
    return {'id': i.id, 'description': i.description, 'quantity': float(i.quantity), 'unit_price': float(i.unit_price), 'amount': float(i.amount)}

def si_dict(inv, include_items=False):
    d = {
        'id': inv.id,
        'invoice_number': inv.invoice_number,
        'customer_order_id': inv.customer_order_id,
        'co_number': inv.customer_order.co_number if inv.customer_order else None,
        'shipment_id': inv.shipment_id,
        'shipment_number': inv.shipment.shipment_number if inv.shipment else None,
        'customer_id': inv.customer_id,
        'customer_name': inv.customer.customer_name if inv.customer else None,
        'invoice_date': str(inv.invoice_date),
        'due_date': str(inv.due_date) if inv.due_date else None,
        'currency': inv.currency,
        'subtotal': float(inv.subtotal),
        'tax_amount': float(inv.tax_amount),
        'total_amount': float(inv.total_amount),
        'amount_paid': float(inv.amount_paid),
        'balance_due': inv.balance_due,
        'status': inv.status,
        'bank_details': inv.bank_details,
        'notes': inv.notes,
        'created_at': inv.created_at.isoformat(),
    }
    if include_items:
        d['items'] = [si_item_dict(i) for i in inv.items.all()]
    return d


def pi_item_dict(i):
    return {'id': i.id, 'description': i.description, 'quantity': float(i.quantity), 'unit_price': float(i.unit_price), 'amount': float(i.amount)}

def pi_dict(inv, include_items=False):
    d = {
        'id': inv.id,
        'invoice_number': inv.invoice_number,
        'factory_order_id': inv.factory_order_id,
        'fo_number': inv.factory_order.fo_number if inv.factory_order else None,
        'vendor_id': inv.vendor_id,
        'vendor_name': inv.vendor.vendor_name if inv.vendor else None,
        'vendor_invoice_ref': inv.vendor_invoice_ref,
        'invoice_date': str(inv.invoice_date),
        'due_date': str(inv.due_date) if inv.due_date else None,
        'currency': inv.currency,
        'subtotal': float(inv.subtotal),
        'tax_amount': float(inv.tax_amount),
        'total_amount': float(inv.total_amount),
        'amount_paid': float(inv.amount_paid),
        'balance_due': inv.balance_due,
        'status': inv.status,
        'notes': inv.notes,
        'created_at': inv.created_at.isoformat(),
    }
    if include_items:
        d['items'] = [pi_item_dict(i) for i in inv.items.all()]
    return d


def payment_dict(p):
    return {
        'id': p.id,
        'payment_number': p.payment_number,
        'payment_type': p.payment_type,
        'payment_date': str(p.payment_date),
        'amount': float(p.amount),
        'currency': p.currency,
        'payment_method': p.payment_method,
        'reference': p.reference,
        'sales_invoice_id': p.sales_invoice_id,
        'si_number': p.sales_invoice.invoice_number if p.sales_invoice else None,
        'purchase_invoice_id': p.purchase_invoice_id,
        'pi_number': p.purchase_invoice.invoice_number if p.purchase_invoice else None,
        'notes': p.notes,
        'created_at': p.created_at.isoformat(),
    }


# ── Sales Invoices ───────────────────────────────────────────

@csrf_exempt
@login_required
def si_list(request):
    company = get_active_company(request)
    if not company:
        return JsonResponse({'error': 'No active company'}, status=400)

    if request.method == 'GET':
        qs = SalesInvoice.objects.filter(company=company).select_related(
            'customer_order', 'shipment', 'customer'
        )
        status = request.GET.get('status')
        customer = request.GET.get('customer')
        if status:
            qs = qs.filter(status=status)
        if customer:
            qs = qs.filter(customer_id=customer)
        return JsonResponse({'sales_invoices': [si_dict(i) for i in qs]})

    if request.method == 'POST':
        d = json.loads(request.body)
        inv = SalesInvoice(
            company=company,
            invoice_date=d['invoice_date'],
            due_date=d.get('due_date') or None,
            currency=d.get('currency', 'USD'),
            subtotal=d.get('subtotal', 0),
            tax_amount=d.get('tax_amount', 0),
            status=d.get('status', 'draft'),
            bank_details=d.get('bank_details', ''),
            notes=d.get('notes', ''),
            created_by=request.user,
        )
        if d.get('customer_order_id'):
            inv.customer_order = CustomerOrder.objects.get(id=d['customer_order_id'], company=company)
        if d.get('shipment_id'):
            inv.shipment = Shipment.objects.get(id=d['shipment_id'], company=company)
        if d.get('customer_id'):
            inv.customer = Customer.objects.get(id=d['customer_id'], company=company)
        inv.save()
        # Create line items
        for item in d.get('items', []):
            SalesInvoiceItem.objects.create(
                invoice=inv,
                description=item['description'],
                quantity=item.get('quantity', 1),
                unit_price=item.get('unit_price', 0),
            )
        # Recalculate subtotal from items if items provided
        if d.get('items'):
            inv.subtotal = sum(float(i.amount) for i in inv.items.all())
            inv.save()
        return JsonResponse({'sales_invoice': si_dict(inv, include_items=True)}, status=201)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def si_detail(request, pk):
    company = get_active_company(request)
    try:
        inv = SalesInvoice.objects.select_related(
            'customer_order', 'shipment', 'customer'
        ).get(pk=pk, company=company)
    except SalesInvoice.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'sales_invoice': si_dict(inv, include_items=True)})

    if request.method == 'PUT':
        d = json.loads(request.body)
        for f in ['invoice_date', 'due_date', 'currency', 'subtotal', 'tax_amount', 'status', 'bank_details', 'notes']:
            if f in d:
                setattr(inv, f, d[f] if d[f] != '' else None if f in ['due_date'] else d[f])
        if 'customer_id' in d:
            inv.customer = Customer.objects.get(id=d['customer_id'], company=company) if d['customer_id'] else None
        if 'shipment_id' in d:
            inv.shipment = Shipment.objects.get(id=d['shipment_id'], company=company) if d['shipment_id'] else None
        inv.save()
        return JsonResponse({'sales_invoice': si_dict(inv, include_items=True)})

    if request.method == 'DELETE':
        inv.delete()
        return JsonResponse({'ok': True})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ── Purchase Invoices ─────────────────────────────────────────

@csrf_exempt
@login_required
def pi_list(request):
    company = get_active_company(request)
    if not company:
        return JsonResponse({'error': 'No active company'}, status=400)

    if request.method == 'GET':
        qs = PurchaseInvoice.objects.filter(company=company).select_related(
            'factory_order', 'vendor'
        )
        status = request.GET.get('status')
        vendor = request.GET.get('vendor')
        if status:
            qs = qs.filter(status=status)
        if vendor:
            qs = qs.filter(vendor_id=vendor)
        return JsonResponse({'purchase_invoices': [pi_dict(i) for i in qs]})

    if request.method == 'POST':
        d = json.loads(request.body)
        inv = PurchaseInvoice(
            company=company,
            vendor_invoice_ref=d.get('vendor_invoice_ref', ''),
            invoice_date=d['invoice_date'],
            due_date=d.get('due_date') or None,
            currency=d.get('currency', 'INR'),
            subtotal=d.get('subtotal', 0),
            tax_amount=d.get('tax_amount', 0),
            status=d.get('status', 'received'),
            notes=d.get('notes', ''),
            created_by=request.user,
        )
        if d.get('factory_order_id'):
            inv.factory_order = FactoryOrder.objects.get(id=d['factory_order_id'], company=company)
        if d.get('vendor_id'):
            inv.vendor = Vendor.objects.get(id=d['vendor_id'], company=company)
        inv.save()
        for item in d.get('items', []):
            PurchaseInvoiceItem.objects.create(
                invoice=inv,
                description=item['description'],
                quantity=item.get('quantity', 1),
                unit_price=item.get('unit_price', 0),
            )
        if d.get('items'):
            inv.subtotal = sum(float(i.amount) for i in inv.items.all())
            inv.save()
        return JsonResponse({'purchase_invoice': pi_dict(inv, include_items=True)}, status=201)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def pi_detail(request, pk):
    company = get_active_company(request)
    try:
        inv = PurchaseInvoice.objects.select_related('factory_order', 'vendor').get(pk=pk, company=company)
    except PurchaseInvoice.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'purchase_invoice': pi_dict(inv, include_items=True)})

    if request.method == 'PUT':
        d = json.loads(request.body)
        for f in ['vendor_invoice_ref', 'invoice_date', 'due_date', 'currency', 'subtotal', 'tax_amount', 'status', 'notes']:
            if f in d:
                setattr(inv, f, d[f] if d[f] != '' else None if f in ['due_date'] else d[f])
        if 'vendor_id' in d:
            inv.vendor = Vendor.objects.get(id=d['vendor_id'], company=company) if d['vendor_id'] else None
        inv.save()
        return JsonResponse({'purchase_invoice': pi_dict(inv, include_items=True)})

    if request.method == 'DELETE':
        inv.delete()
        return JsonResponse({'ok': True})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ── Payments ──────────────────────────────────────────────────

@csrf_exempt
@login_required
def payment_list(request):
    company = get_active_company(request)
    if not company:
        return JsonResponse({'error': 'No active company'}, status=400)

    if request.method == 'GET':
        qs = Payment.objects.filter(company=company).select_related('sales_invoice', 'purchase_invoice')
        ptype = request.GET.get('type')
        if ptype:
            qs = qs.filter(payment_type=ptype)
        return JsonResponse({'payments': [payment_dict(p) for p in qs]})

    if request.method == 'POST':
        d = json.loads(request.body)
        p = Payment(
            company=company,
            payment_type=d['payment_type'],
            payment_date=d['payment_date'],
            amount=d['amount'],
            currency=d.get('currency', 'USD'),
            payment_method=d.get('payment_method', 'bank_transfer'),
            reference=d.get('reference', ''),
            notes=d.get('notes', ''),
            created_by=request.user,
        )
        if d.get('sales_invoice_id'):
            p.sales_invoice = SalesInvoice.objects.get(id=d['sales_invoice_id'], company=company)
        if d.get('purchase_invoice_id'):
            p.purchase_invoice = PurchaseInvoice.objects.get(id=d['purchase_invoice_id'], company=company)
        p.save()
        return JsonResponse({'payment': payment_dict(p)}, status=201)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def payment_detail(request, pk):
    company = get_active_company(request)
    try:
        p = Payment.objects.select_related('sales_invoice', 'purchase_invoice').get(pk=pk, company=company)
    except Payment.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'payment': payment_dict(p)})

    if request.method == 'DELETE':
        p.delete()
        return JsonResponse({'ok': True})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# ── Finance Summary ───────────────────────────────────────────

@csrf_exempt
@login_required
def finance_summary(request):
    """Dashboard-level receivables / payables summary."""
    company = get_active_company(request)
    if not company:
        return JsonResponse({'error': 'No active company'}, status=400)

    today = timezone.now().date()

    si_qs = SalesInvoice.objects.filter(company=company).exclude(status='cancelled')
    pi_qs = PurchaseInvoice.objects.filter(company=company).exclude(status='cancelled')

    total_receivable   = sum(i.balance_due for i in si_qs if i.balance_due > 0)
    total_payable      = sum(i.balance_due for i in pi_qs if i.balance_due > 0)
    overdue_receivable = sum(i.balance_due for i in si_qs if i.balance_due > 0 and i.due_date and i.due_date < today)
    overdue_payable    = sum(i.balance_due for i in pi_qs if i.balance_due > 0 and i.due_date and i.due_date < today)

    return JsonResponse({
        'summary': {
            'total_receivable':   round(total_receivable, 2),
            'total_payable':      round(total_payable, 2),
            'overdue_receivable': round(overdue_receivable, 2),
            'overdue_payable':    round(overdue_payable, 2),
            'net_position':       round(total_receivable - total_payable, 2),
        }
    })


# ── BH Dashboard Stats ────────────────────────────────────────

@csrf_exempt
@login_required
def bh_dashboard(request):
    company = get_active_company(request)
    if not company:
        return JsonResponse({'error': 'No active company'}, status=400)

    today = timezone.now().date()
    in_30 = today + timedelta(days=30)

    # PD stats
    pd_qs = PDRequest.objects.filter(company=company)
    pd_by_status = dict(pd_qs.values_list('status').annotate(c=Count('id')).values_list('status', 'c'))

    # CO stats
    co_qs = CustomerOrder.objects.filter(company=company)
    co_by_status = dict(co_qs.values_list('status').annotate(c=Count('id')).values_list('status', 'c'))
    from django.db.models import F, ExpressionWrapper, DecimalField
    co_total_value = float(
        co_qs.exclude(status='cancelled')
        .annotate(line_val=ExpressionWrapper(F('items__quantity') * F('items__unit_price'), output_field=DecimalField()))
        .aggregate(v=Sum('line_val'))['v'] or 0
    )

    # FO stats
    fo_qs = FactoryOrder.objects.filter(company=company)
    fo_by_status = dict(fo_qs.values_list('status').annotate(c=Count('id')).values_list('status', 'c'))

    # Shipments
    shp_qs = Shipment.objects.filter(company=company)
    shp_in_transit = shp_qs.filter(status='in_transit').count()
    shp_due_soon   = shp_qs.filter(status__in=['booked','loaded','in_transit'], eta__lte=in_30, eta__gte=today).count()

    # PSI pass rate
    psi_qs = PreShipmentInspection.objects.filter(company=company)
    psi_total = psi_qs.exclude(result='pending').count()
    psi_pass  = psi_qs.filter(result__in=['pass','pass_remarks']).count()
    psi_pass_rate = round(psi_pass / psi_total * 100, 1) if psi_total else None

    # Finance
    si_qs = SalesInvoice.objects.filter(company=company).exclude(status='cancelled')
    pi_qs = PurchaseInvoice.objects.filter(company=company).exclude(status='cancelled')
    total_receivable   = sum(i.balance_due for i in si_qs if i.balance_due > 0)
    total_payable      = sum(i.balance_due for i in pi_qs if i.balance_due > 0)
    overdue_receivable = sum(i.balance_due for i in si_qs if i.balance_due > 0 and i.due_date and i.due_date < today)

    # T&A overdue milestones
    ta_overdue = TAMilestone.objects.filter(
        customer_order__company=company,
        status__in=['pending', 'in_progress'],
        planned_date__lt=today,
    ).count()

    # Recent COs (last 5)
    recent_cos = list(co_qs.order_by('-created_at')[:5].values(
        'id', 'co_number', 'status', 'customer__customer_name', 'order_date'
    ))
    for r in recent_cos:
        r['customer_name'] = r.pop('customer__customer_name') or ''

    # Monthly order value (last 6 months)
    monthly = []
    for i in range(5, -1, -1):
        month_start = (today.replace(day=1) - timedelta(days=i*30)).replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1, day=1)
        val = float(
            co_qs.filter(order_date__gte=month_start, order_date__lt=month_end)
            .exclude(status='cancelled')
            .annotate(line_val=ExpressionWrapper(F('items__quantity') * F('items__unit_price'), output_field=DecimalField()))
            .aggregate(v=Sum('line_val'))['v'] or 0
        )
        cnt = co_qs.filter(order_date__gte=month_start, order_date__lt=month_end).count()
        monthly.append({
            'month': month_start.strftime('%b %Y'),
            'value': round(val, 2),
            'orders': cnt,
        })

    return JsonResponse({
        'pd': {'by_status': pd_by_status, 'total': pd_qs.count(), 'active': sum(pd_by_status.get(s, 0) for s in ['open','vendor_assigned','sample_in_progress','sample_received','testing'])},
        'co': {'by_status': co_by_status, 'total': co_qs.count(), 'total_value': co_total_value},
        'fo': {'by_status': fo_by_status, 'total': fo_qs.count()},
        'shipment': {'in_transit': shp_in_transit, 'due_in_30_days': shp_due_soon, 'total': shp_qs.count()},
        'psi': {'pass_rate': psi_pass_rate, 'total_inspected': psi_total},
        'finance': {
            'total_receivable': round(total_receivable, 2),
            'total_payable': round(total_payable, 2),
            'overdue_receivable': round(overdue_receivable, 2),
            'net_position': round(total_receivable - total_payable, 2),
        },
        'ta_overdue': ta_overdue,
        'recent_cos': recent_cos,
        'monthly': monthly,
    })


# ── Reports ───────────────────────────────────────────────────

@csrf_exempt
@login_required
def report_order_summary(request):
    company = get_active_company(request)
    if not company:
        return JsonResponse({'error': 'No active company'}, status=400)

    cos = CustomerOrder.objects.filter(company=company).select_related(
        'customer', 'brand', 'category'
    ).prefetch_related('items', 'factory_orders')

    # Filters
    status  = request.GET.get('status')
    from_dt = request.GET.get('from')
    to_dt   = request.GET.get('to')
    if status:  cos = cos.filter(status=status)
    if from_dt: cos = cos.filter(order_date__gte=from_dt)
    if to_dt:   cos = cos.filter(order_date__lte=to_dt)

    rows = []
    for co in cos.order_by('-order_date'):
        total_qty = sum(float(i.quantity or 0) for i in co.items.all())
        total_val = sum(float(i.quantity or 0) * float(i.unit_price or 0) for i in co.items.all())
        fo_count  = co.factory_orders.count()
        rows.append({
            'id': co.id,
            'co_number': co.co_number,
            'customer': co.customer.customer_name if co.customer else '',
            'brand': co.brand.brand_name if co.brand else '',
            'category': co.category.category_name if co.category else '',
            'order_date': str(co.order_date),
            'ship_by_date': str(co.ship_by_date) if co.ship_by_date else None,
            'ex_factory_date': str(co.ex_factory_date) if co.ex_factory_date else None,
            'status': co.status,
            'currency': co.currency,
            'total_qty': total_qty,
            'total_value': round(total_val, 2),
            'fo_count': fo_count,
            'customer_po_ref': co.customer_po_ref,
        })

    # Summary
    total_value = sum(r['total_value'] for r in rows)
    by_status   = defaultdict(int)
    for r in rows:
        by_status[r['status']] += 1

    return JsonResponse({'orders': rows, 'total_value': round(total_value, 2), 'by_status': dict(by_status)})


@csrf_exempt
@login_required
def report_pd_pipeline(request):
    company = get_active_company(request)
    if not company:
        return JsonResponse({'error': 'No active company'}, status=400)

    pds = PDRequest.objects.filter(company=company).select_related(
        'customer', 'brand', 'category'
    ).prefetch_related('vendor_assignments__vendor', 'sample_shipments')

    rows = []
    for pd in pds.order_by('-request_date'):
        vendors = [va.vendor.vendor_name for va in pd.vendor_assignments.all() if va.vendor]
        rows.append({
            'id': pd.id,
            'pd_number': pd.pd_number,
            'title': pd.title,
            'customer': pd.customer.customer_name if pd.customer else '',
            'brand': pd.brand.brand_name if pd.brand else '',
            'category': pd.category.category_name if pd.category else '',
            'request_date': str(pd.request_date),
            'required_by': str(pd.required_by) if pd.required_by else None,
            'status': pd.status,
            'vendors': vendors,
            'sample_count': pd.sample_shipments.count(),
        })

    by_status = defaultdict(int)
    for r in rows:
        by_status[r['status']] += 1

    return JsonResponse({'pd_requests': rows, 'total': len(rows), 'by_status': dict(by_status)})


@csrf_exempt
@login_required
def report_vendor_performance(request):
    company = get_active_company(request)
    if not company:
        return JsonResponse({'error': 'No active company'}, status=400)

    vendors = Vendor.objects.filter(company=company)
    today   = timezone.now().date()
    rows    = []

    for v in vendors:
        fos = FactoryOrder.objects.filter(company=company, vendor=v)
        fo_total  = fos.count()
        if fo_total == 0:
            continue
        fo_completed = fos.filter(status__in=['shipped', 'ready_to_ship']).count()
        fo_active    = fos.exclude(status__in=['cancelled', 'shipped']).count()

        # On-time: ex_factory_date met (actual_departure <= ex_factory_date for linked shipments)
        # Simplified: count FOs where status=shipped and ex_factory_date is not in the past by >7 days
        late_count = fos.filter(
            status__in=['cutting', 'sewing', 'finishing', 'qc_passed', 'ready_to_ship'],
            ex_factory_date__lt=today,
        ).count()

        # PSI defect rate for this vendor's FOs
        psi_qs = PreShipmentInspection.objects.filter(company=company, factory_order__vendor=v)
        psi_total = psi_qs.count()
        psi_fail  = psi_qs.filter(result='fail').count()
        fail_rate = round(psi_fail / psi_total * 100, 1) if psi_total else None

        rows.append({
            'vendor_id': v.id,
            'vendor_name': v.vendor_name,
            'vendor_type': v.vendor_type,
            'country': v.country,
            'fo_total': fo_total,
            'fo_active': fo_active,
            'fo_completed': fo_completed,
            'fo_late': late_count,
            'psi_total': psi_total,
            'psi_fail_rate': fail_rate,
        })

    rows.sort(key=lambda x: x['fo_total'], reverse=True)
    return JsonResponse({'vendors': rows, 'total_vendors': len(rows)})


@csrf_exempt
@login_required
def report_shipment_tracker(request):
    company = get_active_company(request)
    if not company:
        return JsonResponse({'error': 'No active company'}, status=400)

    today  = timezone.now().date()
    in_30  = today + timedelta(days=30)

    shps = Shipment.objects.filter(company=company).select_related(
        'customer_order', 'customer_order__customer', 'factory_order', 'psi'
    ).exclude(status__in=['delivered', 'cancelled'])

    rows = []
    for s in shps.order_by('eta'):
        eta_days = (s.eta - today).days if s.eta else None
        rows.append({
            'id': s.id,
            'shipment_number': s.shipment_number,
            'co_number': s.customer_order.co_number if s.customer_order else '',
            'customer': s.customer_order.customer.customer_name if s.customer_order and s.customer_order.customer else '',
            'mode': s.mode,
            'status': s.status,
            'port_of_loading': s.port_of_loading,
            'port_of_discharge': s.port_of_discharge,
            'etd': str(s.etd) if s.etd else None,
            'eta': str(s.eta) if s.eta else None,
            'eta_days': eta_days,
            'bl_number': s.bl_number,
            'total_qty': s.total_qty,
            'invoice_value': float(s.invoice_value),
            'currency': s.currency,
            'psi_result': s.psi.result if s.psi else None,
        })

    overdue = [r for r in rows if r['eta_days'] is not None and r['eta_days'] < 0]
    due_soon = [r for r in rows if r['eta_days'] is not None and 0 <= r['eta_days'] <= 7]

    return JsonResponse({
        'shipments': rows,
        'total_active': len(rows),
        'overdue_count': len(overdue),
        'due_this_week': len(due_soon),
    })
