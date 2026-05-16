from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import json

from master_data.company_utils import get_active_company
from .models import (
    PDRequest, PDTechnicalSpec, PDSpecTestingParam,
    PDVendorAssignment, PDSampleShipment, PDSampleInvoice,
)


# ── Serializers ───────────────────────────────────────────────

def pd_request_dict(o, include_related=False):
    d = {
        'id': o.id,
        'pd_number': o.pd_number,
        'title': o.title,
        'customer_id': o.customer_id,
        'customer_name': o.customer.customer_name if o.customer else '',
        'brand_id': o.brand_id,
        'brand_name': o.brand.brand_name if o.brand else '',
        'category_id': o.category_id,
        'category_name': o.category.category_name if o.category else '',
        'request_date': str(o.request_date),
        'required_by': str(o.required_by) if o.required_by else '',
        'status': o.status,
        'notes': o.notes,
        'created_by': o.created_by.get_full_name() or o.created_by.username if o.created_by else '',
        'created_at': o.created_at.strftime('%Y-%m-%d'),
        'updated_at': o.updated_at.strftime('%Y-%m-%d'),
    }
    if include_related:
        d['has_tech_spec'] = hasattr(o, 'tech_spec')
        d['vendor_count'] = o.vendor_assignments.count()
        d['shipment_count'] = o.sample_shipments.count()
        d['invoice_count'] = o.sample_invoices.count()
    return d

def tech_spec_dict(o):
    return {
        'id': o.id,
        'pd_request_id': o.pd_request_id,
        'fabric_type_id': o.fabric_type_id,
        'fabric_type_name': o.fabric_type.fabric_name if o.fabric_type else '',
        'construction': o.construction,
        'size_dimension_variants': o.size_dimension_variants,
        'design_file': o.design_file.url if o.design_file else '',
        'packaging_specs': o.packaging_specs,
        'additional_notes': o.additional_notes,
        'testing_params': [testing_param_line_dict(p) for p in o.testing_params.select_related('parameter').all()],
        'updated_at': o.updated_at.strftime('%Y-%m-%d %H:%M'),
    }

def testing_param_line_dict(o):
    return {
        'id': o.id,
        'parameter_id': o.parameter_id,
        'parameter_name': o.parameter.parameter_name if o.parameter else '',
        'parameter_code': o.parameter.parameter_code if o.parameter else '',
        'test_standard': o.parameter.test_standard if o.parameter else '',
        'acceptance_criteria': o.parameter.acceptance_criteria if o.parameter else '',
        'acceptance_override': o.acceptance_override,
        'unit': o.parameter.unit if o.parameter else '',
    }

def vendor_assignment_dict(o):
    return {
        'id': o.id,
        'pd_request_id': o.pd_request_id,
        'vendor_id': o.vendor_id,
        'vendor_name': o.vendor.vendor_name if o.vendor else '',
        'vendor_type': o.vendor.vendor_type if o.vendor else '',
        'assigned_date': str(o.assigned_date),
        'status': o.status,
        'rejection_reason': o.rejection_reason,
        'sample_dev_cost': str(o.sample_dev_cost) if o.sample_dev_cost is not None else '',
        'currency': o.currency,
        'ta_notes': o.ta_notes,
        'accepted_date': str(o.accepted_date) if o.accepted_date else '',
    }

def shipment_dict(o):
    return {
        'id': o.id,
        'pd_request_id': o.pd_request_id,
        'vendor_assignment_id': o.vendor_assignment_id,
        'vendor_name': o.vendor_assignment.vendor.vendor_name if o.vendor_assignment and o.vendor_assignment.vendor else '',
        'shipment_date': str(o.shipment_date),
        'lr_number': o.lr_number,
        'tracking_number': o.tracking_number,
        'courier_name': o.courier_name,
        'expected_arrival': str(o.expected_arrival) if o.expected_arrival else '',
        'received_date': str(o.received_date) if o.received_date else '',
        'notes': o.notes,
        'created_at': o.created_at.strftime('%Y-%m-%d'),
    }

def invoice_dict(o):
    return {
        'id': o.id,
        'pd_request_id': o.pd_request_id,
        'vendor_assignment_id': o.vendor_assignment_id,
        'vendor_name': o.vendor_assignment.vendor.vendor_name if o.vendor_assignment and o.vendor_assignment.vendor else '',
        'invoice_number': o.invoice_number,
        'invoice_date': str(o.invoice_date),
        'amount': str(o.amount),
        'currency': o.currency,
        'invoice_file': o.invoice_file.url if o.invoice_file else '',
        'notes': o.notes,
        'created_at': o.created_at.strftime('%Y-%m-%d'),
    }


# ── PD Request ────────────────────────────────────────────────

@csrf_exempt
def pd_request_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = PDRequest.objects.select_related('customer', 'brand', 'category', 'created_by').all()
        if company: qs = qs.filter(company=company)
        status = request.GET.get('status', '')
        if status: qs = qs.filter(status=status)
        search = request.GET.get('search', '')
        if search:
            qs = qs.filter(title__icontains=search) | qs.filter(pd_number__icontains=search) | qs.filter(customer__customer_name__icontains=search)
        return JsonResponse({'pd_requests': [pd_request_dict(o, include_related=True) for o in qs], 'total': qs.count()})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = PDRequest.objects.create(
                company=company,
                title=data['title'],
                customer_id=data.get('customer_id') or None,
                brand_id=data.get('brand_id') or None,
                category_id=data.get('category_id') or None,
                request_date=data.get('request_date') or timezone.now().date(),
                required_by=data.get('required_by') or None,
                status=data.get('status', 'open'),
                notes=data.get('notes', ''),
                created_by=request.user if request.user.is_authenticated else None,
            )
            return JsonResponse({'message': 'PD Request created.', 'pd_request': pd_request_dict(o, include_related=True)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def pd_request_detail(request, pk):
    try:
        o = PDRequest.objects.select_related('customer', 'brand', 'category', 'created_by').get(pk=pk)
    except PDRequest.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        data = pd_request_dict(o, include_related=True)
        try:
            data['tech_spec'] = tech_spec_dict(o.tech_spec)
        except PDTechnicalSpec.DoesNotExist:
            data['tech_spec'] = None
        data['vendors'] = [vendor_assignment_dict(v) for v in o.vendor_assignments.select_related('vendor').all()]
        data['shipments'] = [shipment_dict(s) for s in o.sample_shipments.select_related('vendor_assignment__vendor').all()]
        data['invoices'] = [invoice_dict(i) for i in o.sample_invoices.select_related('vendor_assignment__vendor').all()]
        return JsonResponse({'pd_request': data})
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['title', 'status', 'notes', 'required_by']:
            if f in data: setattr(o, f, data[f] or None if f == 'required_by' else data[f])
        for f in ['customer_id', 'brand_id', 'category_id']:
            if f in data: setattr(o, f, data[f] or None)
        o.save()
        return JsonResponse({'message': 'Updated.', 'pd_request': pd_request_dict(o, include_related=True)})
    if request.method == 'DELETE':
        o.status = 'cancelled'; o.save()
        return JsonResponse({'message': 'Cancelled.'})


# ── Technical Spec ────────────────────────────────────────────

@csrf_exempt
def tech_spec_save(request, pd_pk):
    try:
        pd = PDRequest.objects.get(pk=pd_pk)
    except PDRequest.DoesNotExist:
        return JsonResponse({'error': 'PD Request not found'}, status=404)
    if request.method in ('POST', 'PUT'):
        data = json.loads(request.body)
        spec, _ = PDTechnicalSpec.objects.get_or_create(pd_request=pd)
        spec.fabric_type_id       = data.get('fabric_type_id') or None
        spec.construction         = data.get('construction', '')
        spec.size_dimension_variants = data.get('size_dimension_variants', '')
        spec.packaging_specs      = data.get('packaging_specs', '')
        spec.additional_notes     = data.get('additional_notes', '')
        spec.save()
        spec.testing_params.all().delete()
        for tp in data.get('testing_params', []):
            PDSpecTestingParam.objects.create(
                spec=spec,
                parameter_id=tp.get('parameter_id') or None,
                acceptance_override=tp.get('acceptance_override', ''),
            )
        return JsonResponse({'message': 'Tech spec saved.', 'tech_spec': tech_spec_dict(spec)})
    if request.method == 'GET':
        try:
            return JsonResponse({'tech_spec': tech_spec_dict(pd.tech_spec)})
        except PDTechnicalSpec.DoesNotExist:
            return JsonResponse({'tech_spec': None})


# ── Vendor Assignments ────────────────────────────────────────

@csrf_exempt
def vendor_assignment_list(request, pd_pk):
    try:
        pd = PDRequest.objects.get(pk=pd_pk)
    except PDRequest.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        qs = pd.vendor_assignments.select_related('vendor').all()
        return JsonResponse({'vendors': [vendor_assignment_dict(v) for v in qs]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            va = PDVendorAssignment.objects.create(
                pd_request=pd,
                vendor_id=data['vendor_id'],
                currency=data.get('currency', 'INR'),
            )
            if pd.status == 'open':
                pd.status = 'vendor_assigned'; pd.save()
            return JsonResponse({'message': 'Vendor assigned.', 'vendor': vendor_assignment_dict(va)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def vendor_assignment_detail(request, pk):
    try:
        va = PDVendorAssignment.objects.select_related('vendor', 'pd_request').get(pk=pk)
    except PDVendorAssignment.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['status', 'rejection_reason', 'sample_dev_cost', 'currency', 'ta_notes']:
            if f in data: setattr(va, f, data[f] if data[f] != '' else (None if f == 'sample_dev_cost' else ''))
        if data.get('status') == 'accepted' and not va.accepted_date:
            from datetime import date
            va.accepted_date = date.today()
            pd = va.pd_request
            pd.status = 'sample_in_progress'; pd.save()
        va.save()
        return JsonResponse({'message': 'Updated.', 'vendor': vendor_assignment_dict(va)})
    if request.method == 'DELETE':
        va.delete()
        return JsonResponse({'message': 'Removed.'})


# ── Sample Shipments ──────────────────────────────────────────

@csrf_exempt
def shipment_list(request, pd_pk):
    try:
        pd = PDRequest.objects.get(pk=pd_pk)
    except PDRequest.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        qs = pd.sample_shipments.select_related('vendor_assignment__vendor').all()
        return JsonResponse({'shipments': [shipment_dict(s) for s in qs]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            s = PDSampleShipment.objects.create(
                pd_request=pd,
                vendor_assignment_id=data.get('vendor_assignment_id') or None,
                shipment_date=data['shipment_date'],
                lr_number=data.get('lr_number', ''),
                tracking_number=data.get('tracking_number', ''),
                courier_name=data.get('courier_name', ''),
                expected_arrival=data.get('expected_arrival') or None,
                notes=data.get('notes', ''),
            )
            return JsonResponse({'message': 'Shipment added.', 'shipment': shipment_dict(s)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def shipment_detail(request, pk):
    try:
        s = PDSampleShipment.objects.select_related('vendor_assignment__vendor').get(pk=pk)
    except PDSampleShipment.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['lr_number', 'tracking_number', 'courier_name', 'notes']:
            if f in data: setattr(s, f, data[f])
        for f in ['expected_arrival', 'received_date']:
            if f in data: setattr(s, f, data[f] or None)
        s.save()
        if s.received_date:
            pd = s.pd_request
            if pd.status == 'sample_in_progress':
                pd.status = 'sample_received'; pd.save()
        return JsonResponse({'message': 'Updated.', 'shipment': shipment_dict(s)})
    if request.method == 'DELETE':
        s.delete()
        return JsonResponse({'message': 'Deleted.'})


# ── Sample Invoices ───────────────────────────────────────────

@csrf_exempt
def invoice_list(request, pd_pk):
    try:
        pd = PDRequest.objects.get(pk=pd_pk)
    except PDRequest.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        qs = pd.sample_invoices.select_related('vendor_assignment__vendor').all()
        return JsonResponse({'invoices': [invoice_dict(i) for i in qs]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            inv = PDSampleInvoice.objects.create(
                pd_request=pd,
                vendor_assignment_id=data.get('vendor_assignment_id') or None,
                invoice_number=data['invoice_number'],
                invoice_date=data['invoice_date'],
                amount=data['amount'],
                currency=data.get('currency', 'INR'),
                notes=data.get('notes', ''),
            )
            return JsonResponse({'message': 'Invoice saved.', 'invoice': invoice_dict(inv)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def invoice_detail(request, pk):
    try:
        inv = PDSampleInvoice.objects.select_related('vendor_assignment__vendor').get(pk=pk)
    except PDSampleInvoice.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['invoice_number', 'invoice_date', 'amount', 'currency', 'notes']:
            if f in data: setattr(inv, f, data[f])
        inv.save()
        return JsonResponse({'message': 'Updated.', 'invoice': invoice_dict(inv)})
    if request.method == 'DELETE':
        inv.delete()
        return JsonResponse({'message': 'Deleted.'})
