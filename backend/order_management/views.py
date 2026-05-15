from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import json

from master_data.company_utils import get_active_company
from .models import (CustomerOrder, CustomerOrderItem, FactoryOrder, FactoryOrderItem, TAMilestone,
                     BuyerInquiry, InquiryItem, InquiryCostSheet, VendorQuotation)


# ── Serializers ───────────────────────────────────────────────

def co_item_dict(o):
    return {
        'id': o.id, 'style_ref': o.style_ref, 'description': o.description,
        'color': o.color, 'size': o.size,
        'quantity': str(o.quantity),
        'unit_price': str(o.unit_price) if o.unit_price is not None else '',
        'line_total': str(o.line_total()),
    }

def co_dict(o, detail=False):
    d = {
        'id': o.id, 'co_number': o.co_number,
        'customer_id': o.customer_id,
        'customer_name': o.customer.customer_name if o.customer else '',
        'brand_id': o.brand_id,
        'brand_name': o.brand.brand_name if o.brand else '',
        'category_id': o.category_id,
        'category_name': o.category.category_name if o.category else '',
        'pd_request_id': o.pd_request_id,
        'pd_number': o.pd_request.pd_number if o.pd_request else '',
        'customer_po_ref': o.customer_po_ref,
        'order_date': str(o.order_date),
        'ship_by_date': str(o.ship_by_date) if o.ship_by_date else '',
        'ex_factory_date': str(o.ex_factory_date) if o.ex_factory_date else '',
        'status': o.status,
        'currency': o.currency,
        'notes': o.notes,
        'total_qty': str(o.total_qty()),
        'total_value': str(o.total_value()),
        'created_at': o.created_at.strftime('%Y-%m-%d'),
    }
    if detail:
        d['items'] = [co_item_dict(i) for i in o.items.all()]
        d['factory_orders'] = [fo_dict(fo) for fo in o.factory_orders.select_related('vendor').all()]
        d['ta_milestones'] = [ta_dict(m) for m in o.ta_milestones.all()]
    return d

def fo_item_dict(o):
    return {
        'id': o.id, 'style_ref': o.style_ref, 'description': o.description,
        'color': o.color, 'size': o.size,
        'quantity': str(o.quantity),
        'unit_cost': str(o.unit_cost) if o.unit_cost is not None else '',
        'line_total': str(o.line_total()),
        'co_item_id': o.co_item_id,
    }

def fo_dict(o, detail=False):
    d = {
        'id': o.id, 'fo_number': o.fo_number,
        'customer_order_id': o.customer_order_id,
        'co_number': o.customer_order.co_number if o.customer_order else '',
        'vendor_id': o.vendor_id,
        'vendor_name': o.vendor.vendor_name if o.vendor else '',
        'order_date': str(o.order_date),
        'ex_factory_date': str(o.ex_factory_date) if o.ex_factory_date else '',
        'status': o.status,
        'currency': o.currency,
        'notes': o.notes,
        'total_qty': str(o.total_qty()),
        'total_cost': str(o.total_cost()),
        'created_at': o.created_at.strftime('%Y-%m-%d'),
    }
    if detail:
        d['items'] = [fo_item_dict(i) for i in o.items.all()]
        d['ta_milestones'] = [ta_dict(m) for m in o.ta_milestones.all()]
    return d

def ta_dict(o):
    return {
        'id': o.id,
        'milestone_name': o.milestone_name,
        'planned_date': str(o.planned_date),
        'actual_date': str(o.actual_date) if o.actual_date else '',
        'status': o.status,
        'responsible': o.responsible,
        'notes': o.notes,
        'customer_order_id': o.customer_order_id,
        'factory_order_id': o.factory_order_id,
    }


# ── Customer Orders ───────────────────────────────────────────

@csrf_exempt
def co_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = CustomerOrder.objects.select_related('customer', 'brand', 'category', 'pd_request').all()
        if company: qs = qs.filter(company=company)
        status = request.GET.get('status', '')
        if status: qs = qs.filter(status=status)
        search = request.GET.get('search', '')
        if search:
            qs = qs.filter(co_number__icontains=search) | qs.filter(customer__customer_name__icontains=search) | qs.filter(customer_po_ref__icontains=search)
        return JsonResponse({'customer_orders': [co_dict(o) for o in qs], 'total': qs.count()})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = CustomerOrder.objects.create(
                company=company,
                customer_id=data.get('customer_id') or None,
                brand_id=data.get('brand_id') or None,
                category_id=data.get('category_id') or None,
                pd_request_id=data.get('pd_request_id') or None,
                customer_po_ref=data.get('customer_po_ref', ''),
                order_date=data.get('order_date') or timezone.now().date(),
                ship_by_date=data.get('ship_by_date') or None,
                ex_factory_date=data.get('ex_factory_date') or None,
                status=data.get('status', 'confirmed'),
                currency=data.get('currency', 'USD'),
                notes=data.get('notes', ''),
                created_by=request.user if request.user.is_authenticated else None,
            )
            for item in data.get('items', []):
                CustomerOrderItem.objects.create(
                    customer_order=o,
                    style_ref=item.get('style_ref', ''),
                    description=item['description'],
                    color=item.get('color', ''),
                    size=item.get('size', ''),
                    quantity=item['quantity'],
                    unit_price=item.get('unit_price') or None,
                )
            return JsonResponse({'message': 'Customer order created.', 'customer_order': co_dict(o, detail=True)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def co_detail(request, pk):
    try:
        o = CustomerOrder.objects.select_related('customer', 'brand', 'category', 'pd_request').get(pk=pk)
    except CustomerOrder.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'customer_order': co_dict(o, detail=True)})
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['customer_po_ref', 'status', 'currency', 'notes']:
            if f in data: setattr(o, f, data[f])
        for f in ['ship_by_date', 'ex_factory_date']:
            if f in data: setattr(o, f, data[f] or None)
        for f in ['customer_id', 'brand_id', 'category_id', 'pd_request_id']:
            if f in data: setattr(o, f, data[f] or None)
        o.save()
        return JsonResponse({'message': 'Updated.', 'customer_order': co_dict(o, detail=True)})
    if request.method == 'DELETE':
        o.status = 'cancelled'; o.save()
        return JsonResponse({'message': 'Cancelled.'})


@csrf_exempt
def co_items(request, co_pk):
    try:
        co = CustomerOrder.objects.get(pk=co_pk)
    except CustomerOrder.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'items': [co_item_dict(i) for i in co.items.all()]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            item = CustomerOrderItem.objects.create(
                customer_order=co,
                style_ref=data.get('style_ref', ''),
                description=data['description'],
                color=data.get('color', ''),
                size=data.get('size', ''),
                quantity=data['quantity'],
                unit_price=data.get('unit_price') or None,
            )
            return JsonResponse({'item': co_item_dict(item)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def co_item_detail(request, pk):
    try:
        item = CustomerOrderItem.objects.get(pk=pk)
    except CustomerOrderItem.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['style_ref', 'description', 'color', 'size', 'quantity', 'unit_price']:
            if f in data: setattr(item, f, data[f] or None if f == 'unit_price' else data[f])
        item.save()
        return JsonResponse({'item': co_item_dict(item)})
    if request.method == 'DELETE':
        item.delete()
        return JsonResponse({'message': 'Deleted.'})


# ── Factory Orders ────────────────────────────────────────────

@csrf_exempt
def fo_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = FactoryOrder.objects.select_related('vendor', 'customer_order').all()
        if company: qs = qs.filter(company=company)
        status = request.GET.get('status', '')
        if status: qs = qs.filter(status=status)
        co_id = request.GET.get('co_id', '')
        if co_id: qs = qs.filter(customer_order_id=co_id)
        search = request.GET.get('search', '')
        if search:
            qs = qs.filter(fo_number__icontains=search) | qs.filter(vendor__vendor_name__icontains=search)
        return JsonResponse({'factory_orders': [fo_dict(o) for o in qs], 'total': qs.count()})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = FactoryOrder.objects.create(
                company=company,
                customer_order_id=data.get('customer_order_id') or None,
                vendor_id=data.get('vendor_id') or None,
                order_date=data.get('order_date') or timezone.now().date(),
                ex_factory_date=data.get('ex_factory_date') or None,
                status=data.get('status', 'sent'),
                currency=data.get('currency', 'INR'),
                notes=data.get('notes', ''),
                created_by=request.user if request.user.is_authenticated else None,
            )
            for item in data.get('items', []):
                FactoryOrderItem.objects.create(
                    factory_order=o,
                    co_item_id=item.get('co_item_id') or None,
                    style_ref=item.get('style_ref', ''),
                    description=item['description'],
                    color=item.get('color', ''),
                    size=item.get('size', ''),
                    quantity=item['quantity'],
                    unit_cost=item.get('unit_cost') or None,
                )
            return JsonResponse({'message': 'Factory order created.', 'factory_order': fo_dict(o, detail=True)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def fo_detail(request, pk):
    try:
        o = FactoryOrder.objects.select_related('vendor', 'customer_order').get(pk=pk)
    except FactoryOrder.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'factory_order': fo_dict(o, detail=True)})
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['status', 'currency', 'notes']:
            if f in data: setattr(o, f, data[f])
        for f in ['ex_factory_date']:
            if f in data: setattr(o, f, data[f] or None)
        for f in ['vendor_id', 'customer_order_id']:
            if f in data: setattr(o, f, data[f] or None)
        o.save()
        return JsonResponse({'message': 'Updated.', 'factory_order': fo_dict(o, detail=True)})
    if request.method == 'DELETE':
        o.status = 'cancelled'; o.save()
        return JsonResponse({'message': 'Cancelled.'})


@csrf_exempt
def fo_items(request, fo_pk):
    try:
        fo = FactoryOrder.objects.get(pk=fo_pk)
    except FactoryOrder.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            item = FactoryOrderItem.objects.create(
                factory_order=fo,
                co_item_id=data.get('co_item_id') or None,
                style_ref=data.get('style_ref', ''),
                description=data['description'],
                color=data.get('color', ''),
                size=data.get('size', ''),
                quantity=data['quantity'],
                unit_cost=data.get('unit_cost') or None,
            )
            return JsonResponse({'item': fo_item_dict(item)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def fo_item_detail(request, pk):
    try:
        item = FactoryOrderItem.objects.get(pk=pk)
    except FactoryOrderItem.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['style_ref', 'description', 'color', 'size', 'quantity', 'unit_cost']:
            if f in data: setattr(item, f, data[f] or None if f == 'unit_cost' else data[f])
        item.save()
        return JsonResponse({'item': fo_item_dict(item)})
    if request.method == 'DELETE':
        item.delete()
        return JsonResponse({'message': 'Deleted.'})


# ── T&A Milestones ────────────────────────────────────────────

@csrf_exempt
def ta_milestone_list(request):
    co_id = request.GET.get('co_id')
    fo_id = request.GET.get('fo_id')
    if request.method == 'GET':
        qs = TAMilestone.objects.all()
        if co_id: qs = qs.filter(customer_order_id=co_id)
        if fo_id: qs = qs.filter(factory_order_id=fo_id)
        return JsonResponse({'milestones': [ta_dict(m) for m in qs]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            m = TAMilestone.objects.create(
                customer_order_id=data.get('customer_order_id') or None,
                factory_order_id=data.get('factory_order_id') or None,
                milestone_name=data['milestone_name'],
                planned_date=data['planned_date'],
                actual_date=data.get('actual_date') or None,
                status=data.get('status', 'pending'),
                responsible=data.get('responsible', ''),
                notes=data.get('notes', ''),
            )
            return JsonResponse({'milestone': ta_dict(m)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def ta_milestone_detail(request, pk):
    try:
        m = TAMilestone.objects.get(pk=pk)
    except TAMilestone.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['milestone_name', 'status', 'responsible', 'notes']:
            if f in data: setattr(m, f, data[f])
        for f in ['planned_date', 'actual_date']:
            if f in data: setattr(m, f, data[f] or None)
        m.save()
        return JsonResponse({'milestone': ta_dict(m)})
    if request.method == 'DELETE':
        m.delete()
        return JsonResponse({'message': 'Deleted.'})


# ── Buyer Inquiries ───────────────────────────────────────────

def inq_item_dict(o):
    return {
        'id': o.id, 'style_ref': o.style_ref, 'description': o.description,
        'color': o.color, 'size_range': o.size_range,
        'quantity': str(o.quantity),
        'target_price': str(o.target_price) if o.target_price is not None else '',
    }

def cost_sheet_dict(cs):
    return {
        'id': cs.id,
        'fabric_cost': str(cs.fabric_cost), 'trims_cost': str(cs.trims_cost),
        'cm_cost': str(cs.cm_cost), 'washing_cost': str(cs.washing_cost),
        'testing_cost': str(cs.testing_cost), 'freight_cost': str(cs.freight_cost),
        'overhead_pct': str(cs.overhead_pct), 'margin_pct': str(cs.margin_pct),
        'currency': cs.currency, 'selling_price': str(cs.selling_price),
        'total_cost': str(cs.total_cost), 'base_cost': str(cs.base_cost),
        'notes': cs.notes,
    }

def quotation_dict(q):
    return {
        'id': q.id,
        'vendor_id': q.vendor_id,
        'vendor_name': q.vendor.vendor_name if q.vendor else '',
        'rfq_date': str(q.rfq_date),
        'response_date': str(q.response_date) if q.response_date else '',
        'lead_time_days': q.lead_time_days,
        'currency': q.currency,
        'unit_quoted': str(q.unit_quoted),
        'total_quoted': str(q.total_quoted),
        'status': q.status,
        'notes': q.notes,
        'created_at': q.created_at.strftime('%Y-%m-%d'),
    }

def inq_dict(o, detail=False):
    d = {
        'id': o.id, 'inquiry_number': o.inquiry_number,
        'customer_id': o.customer_id,
        'customer_name': o.customer.customer_name if o.customer else '',
        'brand_id': o.brand_id,
        'brand_name': o.brand.brand_name if o.brand else '',
        'category_id': o.category_id,
        'category_name': o.category.category_name if o.category else '',
        'inquiry_date': str(o.inquiry_date),
        'required_delivery': str(o.required_delivery) if o.required_delivery else '',
        'destination': o.destination,
        'target_fob_price': str(o.target_fob_price) if o.target_fob_price is not None else '',
        'currency': o.currency,
        'description': o.description,
        'status': o.status,
        'notes': o.notes,
        'customer_order_id': o.customer_order_id,
        'co_number': o.customer_order.co_number if o.customer_order else '',
        'total_qty': str(o.total_qty()),
        'created_at': o.created_at.strftime('%Y-%m-%d'),
        'quotation_count': o.quotations.count(),
        'selected_vendor': '',
    }
    sel = o.quotations.filter(status='selected').select_related('vendor').first()
    if sel and sel.vendor:
        d['selected_vendor'] = sel.vendor.vendor_name
    if detail:
        d['items'] = [inq_item_dict(i) for i in o.items.all()]
        d['quotations'] = [quotation_dict(q) for q in o.quotations.select_related('vendor').all()]
        try:
            d['cost_sheet'] = cost_sheet_dict(o.cost_sheet)
        except InquiryCostSheet.DoesNotExist:
            d['cost_sheet'] = None
    return d


@csrf_exempt
def inquiry_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = BuyerInquiry.objects.select_related('customer', 'brand', 'category').all()
        if company: qs = qs.filter(company=company)
        status = request.GET.get('status', '')
        if status: qs = qs.filter(status=status)
        search = request.GET.get('search', '')
        if search:
            qs = (qs.filter(inquiry_number__icontains=search) |
                  qs.filter(customer__customer_name__icontains=search) |
                  qs.filter(description__icontains=search))
        return JsonResponse({'inquiries': [inq_dict(o) for o in qs], 'total': qs.count()})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = BuyerInquiry.objects.create(
                company=company,
                customer_id=data.get('customer_id') or None,
                brand_id=data.get('brand_id') or None,
                category_id=data.get('category_id') or None,
                inquiry_date=data.get('inquiry_date') or timezone.now().date(),
                required_delivery=data.get('required_delivery') or None,
                destination=data.get('destination', ''),
                target_fob_price=data.get('target_fob_price') or None,
                currency=data.get('currency', 'USD'),
                description=data.get('description', ''),
                status=data.get('status', 'open'),
                notes=data.get('notes', ''),
                created_by=request.user if request.user.is_authenticated else None,
            )
            for item in data.get('items', []):
                InquiryItem.objects.create(
                    inquiry=o,
                    style_ref=item.get('style_ref', ''),
                    description=item['description'],
                    color=item.get('color', ''),
                    size_range=item.get('size_range', ''),
                    quantity=item.get('quantity', 0),
                    target_price=item.get('target_price') or None,
                )
            return JsonResponse({'message': 'Inquiry created.', 'inquiry': inq_dict(o, detail=True)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def inquiry_detail(request, pk):
    try:
        o = BuyerInquiry.objects.select_related('customer', 'brand', 'category', 'customer_order').get(pk=pk)
    except BuyerInquiry.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'inquiry': inq_dict(o, detail=True)})
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['destination', 'currency', 'description', 'status', 'notes']:
            if f in data: setattr(o, f, data[f])
        for f in ['required_delivery']:
            if f in data: setattr(o, f, data[f] or None)
        for f in ['customer_id', 'brand_id', 'category_id']:
            if f in data: setattr(o, f, data[f] or None)
        if 'target_fob_price' in data:
            o.target_fob_price = data['target_fob_price'] or None
        o.save()
        return JsonResponse({'message': 'Updated.', 'inquiry': inq_dict(o, detail=True)})
    if request.method == 'DELETE':
        o.status = 'dropped'; o.save()
        return JsonResponse({'message': 'Dropped.'})


@csrf_exempt
def inquiry_items(request, inq_pk):
    try:
        inq = BuyerInquiry.objects.get(pk=inq_pk)
    except BuyerInquiry.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'items': [inq_item_dict(i) for i in inq.items.all()]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            item = InquiryItem.objects.create(
                inquiry=inq,
                style_ref=data.get('style_ref', ''),
                description=data['description'],
                color=data.get('color', ''),
                size_range=data.get('size_range', ''),
                quantity=data.get('quantity', 0),
                target_price=data.get('target_price') or None,
            )
            return JsonResponse({'item': inq_item_dict(item)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def inquiry_item_detail(request, pk):
    try:
        item = InquiryItem.objects.get(pk=pk)
    except InquiryItem.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['style_ref', 'description', 'color', 'size_range', 'quantity']:
            if f in data: setattr(item, f, data[f])
        if 'target_price' in data:
            item.target_price = data['target_price'] or None
        item.save()
        return JsonResponse({'item': inq_item_dict(item)})
    if request.method == 'DELETE':
        item.delete()
        return JsonResponse({'message': 'Deleted.'})


@csrf_exempt
def inquiry_cost_sheet(request, inq_pk):
    try:
        inq = BuyerInquiry.objects.get(pk=inq_pk)
    except BuyerInquiry.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        try:
            return JsonResponse({'cost_sheet': cost_sheet_dict(inq.cost_sheet)})
        except InquiryCostSheet.DoesNotExist:
            return JsonResponse({'cost_sheet': None})
    if request.method in ('POST', 'PUT'):
        data = json.loads(request.body)
        cs, _ = InquiryCostSheet.objects.get_or_create(inquiry=inq)
        for f in ['fabric_cost', 'trims_cost', 'cm_cost', 'washing_cost', 'testing_cost',
                  'freight_cost', 'overhead_pct', 'margin_pct', 'selling_price', 'currency', 'notes']:
            if f in data: setattr(cs, f, data[f])
        cs.save()
        if inq.status == 'open':
            inq.status = 'costing_done'; inq.save()
        return JsonResponse({'cost_sheet': cost_sheet_dict(cs)})


@csrf_exempt
def inquiry_quotations(request, inq_pk):
    try:
        inq = BuyerInquiry.objects.get(pk=inq_pk)
    except BuyerInquiry.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'quotations': [quotation_dict(q) for q in inq.quotations.select_related('vendor').all()]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            q = VendorQuotation.objects.create(
                inquiry=inq,
                vendor_id=data.get('vendor_id') or None,
                rfq_date=data.get('rfq_date') or timezone.now().date(),
                response_date=data.get('response_date') or None,
                lead_time_days=data.get('lead_time_days') or None,
                currency=data.get('currency', 'INR'),
                unit_quoted=data.get('unit_quoted', 0),
                total_quoted=data.get('total_quoted', 0),
                status=data.get('status', 'sent'),
                notes=data.get('notes', ''),
            )
            if inq.status in ('open', 'costing_done'):
                inq.status = 'rfq_sent'; inq.save()
            return JsonResponse({'quotation': quotation_dict(q)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def inquiry_quotation_detail(request, pk):
    try:
        q = VendorQuotation.objects.select_related('vendor').get(pk=pk)
    except VendorQuotation.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['currency', 'unit_quoted', 'total_quoted', 'lead_time_days', 'status', 'notes']:
            if f in data: setattr(q, f, data[f])
        for f in ['response_date']:
            if f in data: setattr(q, f, data[f] or None)
        if 'vendor_id' in data:
            q.vendor_id = data['vendor_id'] or None
        q.save()
        # When a vendor is selected, reject others
        if q.status == 'selected':
            q.inquiry.quotations.exclude(pk=q.pk).update(status='rejected')
            q.inquiry.status = 'quoted'; q.inquiry.save()
        return JsonResponse({'quotation': quotation_dict(q)})
    if request.method == 'DELETE':
        q.delete()
        return JsonResponse({'message': 'Deleted.'})


@csrf_exempt
def inquiry_convert_to_co(request, inq_pk):
    """Convert a confirmed inquiry into a Customer Order."""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    try:
        inq = BuyerInquiry.objects.select_related('customer', 'brand', 'category').get(pk=inq_pk)
    except BuyerInquiry.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if inq.customer_order_id:
        return JsonResponse({'error': 'Already converted.', 'co_id': inq.customer_order_id}, status=400)
    data = json.loads(request.body) if request.body else {}
    company = get_active_company(request)
    try:
        co = CustomerOrder.objects.create(
            company=company,
            customer=inq.customer,
            brand=inq.brand,
            category=inq.category,
            order_date=timezone.now().date(),
            ship_by_date=inq.required_delivery,
            currency=inq.currency,
            notes=f'Created from inquiry {inq.inquiry_number}. {data.get("notes", "")}',
            status='confirmed',
            created_by=request.user if request.user.is_authenticated else None,
        )
        for ii in inq.items.all():
            CustomerOrderItem.objects.create(
                customer_order=co,
                style_ref=ii.style_ref,
                description=ii.description,
                color=ii.color,
                size=ii.size_range,
                quantity=ii.quantity,
                unit_price=ii.target_price,
            )
        inq.customer_order = co
        inq.status = 'confirmed'
        inq.save()
        return JsonResponse({'message': 'Customer Order created.', 'co_id': co.id, 'co_number': co.co_number}, status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
