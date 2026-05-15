# ============================================================
# FILE: masters/views.py
# PURPOSE: API endpoints for all master data
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import (
    UOM, Location, YarnMaster, ItemMaster, Machine,
    Process, ProductDesign, BOM, BOMLine, Vendor, Customer,
    Brand, Category, FabricType, TestingParameter,
)
from master_data.company_utils import get_active_company


# ── Serializers ───────────────────────────────────────────────
def uom_dict(o):
    return {'id': o.id, 'name': o.name, 'short_name': o.short_name, 'is_active': o.is_active}

def location_dict(o):
    return {'id': o.id, 'name': o.name, 'code': o.code,
            'location_type': o.location_type, 'is_active': o.is_active}

def yarn_dict(o):
    return {
        'id': o.id, 'item_code': o.item_code, 'item_name': o.item_name,
        'yarn_type': o.yarn_type, 'count': o.count, 'composition': o.composition,
        'color_code': o.color_code, 'color_name': o.color_name,
        'uom_id': o.uom_id, 'uom': o.uom.short_name if o.uom else '',
        'reorder_level': str(o.reorder_level), 'is_active': o.is_active,
    }

def item_dict(o):
    return {
        'id': o.id, 'item_code': o.item_code, 'item_name': o.item_name,
        'item_type': o.item_type,
        'uom_id': o.uom_id, 'uom': o.uom.short_name if o.uom else '',
        'reorder_level': str(o.reorder_level), 'is_active': o.is_active,
    }

def machine_dict(o):
    return {
        'id': o.id, 'machine_code': o.machine_code, 'machine_name': o.machine_name,
        'machine_type': o.machine_type,
        'location_id': o.location_id,
        'location': o.location.name if o.location else '',
        'capacity_per_day': str(o.capacity_per_day),
        'uom': o.uom.short_name if o.uom else '',
        'is_active': o.is_active,
    }

def process_dict(o):
    return {
        'id': o.id, 'process_code': o.process_code, 'process_name': o.process_name,
        'sequence': o.sequence, 'machine_type': o.machine_type,
        'description': o.description, 'is_active': o.is_active,
    }

def product_dict(o):
    return {
        'id': o.id, 'design_code': o.design_code, 'design_name': o.design_name,
        'category': o.category,
        'gsm': str(o.gsm) if o.gsm else '',
        'width_cm': str(o.width_cm) if o.width_cm else '',
        'composition': o.composition, 'customer_ref': o.customer_ref,
        'has_bom': hasattr(o, 'bom'), 'is_active': o.is_active,
    }

def bom_dict(o, include_lines=False):
    d = {
        'id': o.id, 'product_id': o.product_id,
        'product_code': o.product.design_code,
        'product_name': o.product.design_name,
        'version': o.version, 'is_active': o.is_active,
    }
    if include_lines:
        d['lines'] = [{
            'id': l.id,
            'material_type': l.material_type,
            'yarn_id': l.yarn_id,
            'yarn_name': l.yarn.item_name if l.yarn else '',
            'item_id': l.item_id,
            'item_name': l.item.item_name if l.item else '',
            'quantity': str(l.quantity),
            'uom': l.uom.short_name if l.uom else '',
            'process_stage': l.process_stage.process_name if l.process_stage else '',
            'notes': l.notes,
        } for l in o.lines.select_related('yarn', 'item', 'uom', 'process_stage').all()]
    return d

def vendor_dict(o):
    return {
        'id': o.id, 'vendor_code': o.vendor_code, 'vendor_name': o.vendor_name,
        'vendor_type': o.vendor_type, 'contact_person': o.contact_person,
        'phone': o.phone, 'email': o.email, 'address': o.address,
        'city': o.city, 'state': o.state, 'country': o.country,
        'currency': o.currency, 'gstin': o.gstin,
        'pan_number': o.pan_number, 'credit_days': o.credit_days, 'is_active': o.is_active,
    }

def customer_dict(o):
    return {
        'id': o.id, 'customer_code': o.customer_code, 'customer_name': o.customer_name,
        'customer_type': o.customer_type,
        'contact_person': o.contact_person, 'phone': o.phone, 'email': o.email,
        'address': o.address, 'city': o.city, 'state': o.state,
        'country': o.country, 'currency': o.currency,
        'gstin': o.gstin, 'credit_days': o.credit_days,
        'credit_limit': str(o.credit_limit), 'is_active': o.is_active,
    }

def brand_dict(o):
    return {
        'id': o.id, 'brand_code': o.brand_code, 'brand_name': o.brand_name,
        'customer_id': o.customer_id,
        'customer_name': o.customer.customer_name if o.customer else '',
        'description': o.description, 'is_active': o.is_active,
    }

def category_dict(o):
    return {
        'id': o.id, 'category_code': o.category_code, 'category_name': o.category_name,
        'parent_id': o.parent_id,
        'parent_name': o.parent.category_name if o.parent else '',
        'description': o.description, 'is_active': o.is_active,
    }

def fabric_dict(o):
    return {
        'id': o.id, 'fabric_code': o.fabric_code, 'fabric_name': o.fabric_name,
        'construction': o.construction, 'fiber_content': o.fiber_content, 'is_active': o.is_active,
    }

def testing_param_dict(o):
    return {
        'id': o.id, 'parameter_code': o.parameter_code, 'parameter_name': o.parameter_name,
        'test_standard': o.test_standard, 'acceptance_criteria': o.acceptance_criteria,
        'unit': o.unit, 'is_active': o.is_active,
    }


# ── UOM ───────────────────────────────────────────────────────
@csrf_exempt
def uom_list(request):
    if request.method == 'GET':
        return JsonResponse({'uoms': [uom_dict(o) for o in UOM.objects.filter(is_active=True)]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = UOM.objects.create(name=data['name'], short_name=data['short_name'])
            return JsonResponse({'message': 'UOM created.', 'uom': uom_dict(o)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def uom_detail(request, pk):
    try:
        o = UOM.objects.get(pk=pk)
    except UOM.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        return JsonResponse(uom_dict(o))
    if request.method == 'PUT':
        data = json.loads(request.body)
        o.name       = data.get('name', o.name)
        o.short_name = data.get('short_name', o.short_name)
        o.save()
        return JsonResponse({'message': 'Updated.', 'uom': uom_dict(o)})
    if request.method == 'DELETE':
        o.is_active = False
        o.save()
        return JsonResponse({'message': 'Deleted.'})


# ── Location ──────────────────────────────────────────────────
@csrf_exempt
def location_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = Location.objects.filter(is_active=True)
        if company: qs = qs.filter(company=company)
        return JsonResponse({'locations': [location_dict(o) for o in qs]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = Location.objects.create(
                company=company, name=data['name'], code=data['code'],
                location_type=data.get('location_type', 'raw_material'),
            )
            return JsonResponse({'message': 'Location created.', 'location': location_dict(o)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def location_detail(request, pk):
    try:
        o = Location.objects.get(pk=pk)
    except Location.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'GET':
        return JsonResponse(location_dict(o))
    if request.method == 'PUT':
        data = json.loads(request.body)
        o.name          = data.get('name', o.name)
        o.code          = data.get('code', o.code)
        o.location_type = data.get('location_type', o.location_type)
        o.save()
        return JsonResponse({'message': 'Updated.', 'location': location_dict(o)})
    if request.method == 'DELETE':
        o.is_active = False
        o.save()
        return JsonResponse({'message': 'Deleted.'})


# ── Yarn Master ───────────────────────────────────────────────
@csrf_exempt
def yarn_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = YarnMaster.objects.select_related('uom').filter(is_active=True)
        if company: qs = qs.filter(company=company)
        yarn_type = request.GET.get('yarn_type', '')
        if yarn_type: qs = qs.filter(yarn_type=yarn_type)
        search = request.GET.get('search', '')
        if search: qs = qs.filter(item_name__icontains=search) | qs.filter(item_code__icontains=search)
        return JsonResponse({'yarns': [yarn_dict(o) for o in qs], 'total': qs.count()})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = YarnMaster.objects.create(
                company=company,
                item_code=data['item_code'], item_name=data['item_name'],
                yarn_type=data.get('yarn_type', 'warp'),
                count=data.get('count', ''), composition=data.get('composition', ''),
                color_code=data.get('color_code', ''), color_name=data.get('color_name', ''),
                uom_id=data.get('uom_id') or None,
                reorder_level=data.get('reorder_level', 0),
            )
            return JsonResponse({'message': 'Yarn created.', 'yarn': yarn_dict(o)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def yarn_detail(request, pk):
    try:
        o = YarnMaster.objects.select_related('uom').get(id=pk)
    except YarnMaster.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'yarn': yarn_dict(o)})
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['item_name', 'yarn_type', 'count', 'composition', 'color_code', 'color_name', 'reorder_level']:
            if f in data: setattr(o, f, data[f])
        if 'uom_id' in data: o.uom_id = data['uom_id'] or None
        o.save()
        return JsonResponse({'message': 'Updated.', 'yarn': yarn_dict(o)})
    if request.method == 'DELETE':
        o.is_active = False; o.save()
        return JsonResponse({'message': 'Deleted.'})


# ── Item Master ───────────────────────────────────────────────
@csrf_exempt
def item_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = ItemMaster.objects.select_related('uom').filter(is_active=True)
        if company: qs = qs.filter(company=company)
        item_type = request.GET.get('item_type', '')
        if item_type: qs = qs.filter(item_type=item_type)
        return JsonResponse({'items': [item_dict(o) for o in qs], 'total': qs.count()})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = ItemMaster.objects.create(
                company=company,
                item_code=data['item_code'], item_name=data['item_name'],
                item_type=data['item_type'], uom_id=data.get('uom_id') or None,
                reorder_level=data.get('reorder_level', 0),
            )
            return JsonResponse({'message': 'Item created.', 'item': item_dict(o)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def item_detail(request, pk):
    try:
        o = ItemMaster.objects.get(id=pk)
    except ItemMaster.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['item_name', 'item_type', 'reorder_level']:
            if f in data: setattr(o, f, data[f])
        if 'uom_id' in data: o.uom_id = data['uom_id'] or None
        o.save()
        return JsonResponse({'message': 'Updated.', 'item': item_dict(o)})
    if request.method == 'DELETE':
        o.is_active = False; o.save()
        return JsonResponse({'message': 'Deleted.'})


# ── Machine ───────────────────────────────────────────────────
@csrf_exempt
def machine_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = Machine.objects.select_related('location', 'uom').filter(is_active=True)
        if company: qs = qs.filter(company=company)
        mtype = request.GET.get('machine_type', '')
        if mtype: qs = qs.filter(machine_type=mtype)
        return JsonResponse({'machines': [machine_dict(o) for o in qs]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = Machine.objects.create(
                company=company,
                machine_code=data['machine_code'], machine_name=data['machine_name'],
                machine_type=data['machine_type'],
                location_id=data.get('location_id') or None,
                capacity_per_day=data.get('capacity_per_day', 0),
                uom_id=data.get('uom_id') or None,
            )
            return JsonResponse({'message': 'Machine created.', 'machine': machine_dict(o)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def machine_detail(request, pk):
    try:
        o = Machine.objects.get(id=pk)
    except Machine.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['machine_name', 'machine_type', 'capacity_per_day']:
            if f in data: setattr(o, f, data[f])
        if 'location_id' in data: o.location_id = data['location_id'] or None
        o.save()
        return JsonResponse({'message': 'Updated.', 'machine': machine_dict(o)})
    if request.method == 'DELETE':
        o.is_active = False; o.save()
        return JsonResponse({'message': 'Deleted.'})


# ── Process ───────────────────────────────────────────────────
@csrf_exempt
def process_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = Process.objects.filter(is_active=True)
        if company: qs = qs.filter(company=company)
        return JsonResponse({'processes': [process_dict(o) for o in qs]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = Process.objects.create(
                company=company,
                process_code=data['process_code'], process_name=data['process_name'],
                sequence=data.get('sequence', 1), machine_type=data.get('machine_type', ''),
                description=data.get('description', ''),
            )
            return JsonResponse({'message': 'Process created.', 'process': process_dict(o)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def process_detail(request, pk):
    try:
        o = Process.objects.get(id=pk)
    except Process.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['process_name', 'sequence', 'machine_type', 'description']:
            if f in data: setattr(o, f, data[f])
        o.save()
        return JsonResponse({'message': 'Updated.', 'process': process_dict(o)})
    if request.method == 'DELETE':
        o.is_active = False; o.save()
        return JsonResponse({'message': 'Deleted.'})


# ── Product / Design Master ───────────────────────────────────
@csrf_exempt
def product_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = ProductDesign.objects.filter(is_active=True)
        if company: qs = qs.filter(company=company)
        search = request.GET.get('search', '')
        if search: qs = qs.filter(design_name__icontains=search) | qs.filter(design_code__icontains=search)
        return JsonResponse({'products': [product_dict(o) for o in qs], 'total': qs.count()})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = ProductDesign.objects.create(
                company=company,
                design_code=data['design_code'], design_name=data['design_name'],
                category=data.get('category', ''),
                gsm=data.get('gsm') or None, width_cm=data.get('width_cm') or None,
                composition=data.get('composition', ''), customer_ref=data.get('customer_ref', ''),
            )
            return JsonResponse({'message': 'Product created.', 'product': product_dict(o)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def product_detail(request, pk):
    try:
        o = ProductDesign.objects.get(id=pk)
    except ProductDesign.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'product': product_dict(o)})
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['design_name', 'category', 'gsm', 'width_cm', 'composition', 'customer_ref']:
            if f in data: setattr(o, f, data[f] or None if f in ['gsm', 'width_cm'] else data[f])
        o.save()
        return JsonResponse({'message': 'Updated.', 'product': product_dict(o)})
    if request.method == 'DELETE':
        o.is_active = False; o.save()
        return JsonResponse({'message': 'Deleted.'})


# ── BOM ───────────────────────────────────────────────────────
@csrf_exempt
def bom_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = BOM.objects.select_related('product').filter(is_active=True)
        if company: qs = qs.filter(company=company)
        return JsonResponse({'boms': [bom_dict(o) for o in qs]})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            bom, _ = BOM.objects.get_or_create(
                product_id=data['product_id'],
                defaults={'company': company, 'version': data.get('version', 'v1.0'),
                          'created_by': request.user if request.user.is_authenticated else None}
            )
            bom.lines.all().delete()
            for line in data.get('lines', []):
                BOMLine.objects.create(
                    bom=bom,
                    material_type=line['material_type'],
                    yarn_id=line.get('yarn_id') or None,
                    item_id=line.get('item_id') or None,
                    quantity=line['quantity'],
                    uom_id=line.get('uom_id') or None,
                    process_stage_id=line.get('process_stage_id') or None,
                    notes=line.get('notes', ''),
                )
            return JsonResponse({'message': 'BOM saved.', 'bom': bom_dict(bom, include_lines=True)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def bom_detail(request, pk):
    try:
        o = BOM.objects.select_related('product').get(id=pk)
    except BOM.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'bom': bom_dict(o, include_lines=True)})


# ── Vendor ────────────────────────────────────────────────────
@csrf_exempt
def vendor_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = Vendor.objects.filter(is_active=True)
        if company: qs = qs.filter(company=company)
        search = request.GET.get('search', '')
        if search: qs = qs.filter(vendor_name__icontains=search) | qs.filter(vendor_code__icontains=search)
        return JsonResponse({'vendors': [vendor_dict(o) for o in qs], 'total': qs.count()})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = Vendor.objects.create(
                company=company,
                vendor_code=data['vendor_code'], vendor_name=data['vendor_name'],
                vendor_type=data.get('vendor_type', 'manufacturer'),
                contact_person=data.get('contact_person', ''), phone=data.get('phone', ''),
                email=data.get('email', ''), address=data.get('address', ''),
                city=data.get('city', ''), state=data.get('state', ''),
                country=data.get('country', ''), currency=data.get('currency', 'INR'),
                gstin=data.get('gstin', ''), pan_number=data.get('pan_number', ''),
                credit_days=data.get('credit_days', 30),
            )
            return JsonResponse({'message': 'Vendor created.', 'vendor': vendor_dict(o)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def vendor_detail(request, pk):
    try:
        o = Vendor.objects.get(id=pk)
    except Vendor.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'vendor': vendor_dict(o)})
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['vendor_name', 'vendor_type', 'contact_person', 'phone', 'email',
                  'address', 'city', 'state', 'country', 'currency', 'gstin', 'pan_number', 'credit_days']:
            if f in data: setattr(o, f, data[f])
        o.save()
        return JsonResponse({'message': 'Updated.', 'vendor': vendor_dict(o)})
    if request.method == 'DELETE':
        o.is_active = False; o.save()
        return JsonResponse({'message': 'Deleted.'})


# ── Customer ──────────────────────────────────────────────────
@csrf_exempt
def customer_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = Customer.objects.filter(is_active=True)
        if company: qs = qs.filter(company=company)
        search = request.GET.get('search', '')
        if search: qs = qs.filter(customer_name__icontains=search) | qs.filter(customer_code__icontains=search)
        return JsonResponse({'customers': [customer_dict(o) for o in qs], 'total': qs.count()})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = Customer.objects.create(
                company=company,
                customer_code=data['customer_code'], customer_name=data['customer_name'],
                customer_type=data.get('customer_type', 'brand'),
                contact_person=data.get('contact_person', ''), phone=data.get('phone', ''),
                email=data.get('email', ''), address=data.get('address', ''),
                city=data.get('city', ''), state=data.get('state', ''),
                country=data.get('country', ''), currency=data.get('currency', 'USD'),
                gstin=data.get('gstin', ''), credit_days=data.get('credit_days', 30),
                credit_limit=data.get('credit_limit', 0),
            )
            return JsonResponse({'message': 'Customer created.', 'customer': customer_dict(o)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
def customer_detail(request, pk):
    try:
        o = Customer.objects.get(id=pk)
    except Customer.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'customer': customer_dict(o)})
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['customer_name', 'customer_type', 'contact_person', 'phone', 'email',
                  'address', 'city', 'state', 'country', 'currency',
                  'gstin', 'credit_days', 'credit_limit']:
            if f in data: setattr(o, f, data[f])
        o.save()
        return JsonResponse({'message': 'Updated.', 'customer': customer_dict(o)})
    if request.method == 'DELETE':
        o.is_active = False; o.save()
        return JsonResponse({'message': 'Deleted.'})


# ── Brand ─────────────────────────────────────────────────────
@csrf_exempt
def brand_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = Brand.objects.select_related('customer').filter(is_active=True)
        if company: qs = qs.filter(company=company)
        search = request.GET.get('search', '')
        if search: qs = qs.filter(brand_name__icontains=search) | qs.filter(brand_code__icontains=search)
        return JsonResponse({'brands': [brand_dict(o) for o in qs], 'total': qs.count()})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = Brand.objects.create(
                company=company,
                brand_code=data['brand_code'], brand_name=data['brand_name'],
                customer_id=data.get('customer_id') or None,
                description=data.get('description', ''),
            )
            return JsonResponse({'message': 'Brand created.', 'brand': brand_dict(o)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def brand_detail(request, pk):
    try:
        o = Brand.objects.select_related('customer').get(pk=pk)
    except Brand.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['brand_name', 'description']:
            if f in data: setattr(o, f, data[f])
        if 'customer_id' in data: o.customer_id = data['customer_id'] or None
        o.save()
        return JsonResponse({'message': 'Updated.', 'brand': brand_dict(o)})
    if request.method == 'DELETE':
        o.is_active = False; o.save()
        return JsonResponse({'message': 'Deleted.'})


# ── Category ──────────────────────────────────────────────────
@csrf_exempt
def category_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = Category.objects.select_related('parent').filter(is_active=True)
        if company: qs = qs.filter(company=company)
        search = request.GET.get('search', '')
        if search: qs = qs.filter(category_name__icontains=search) | qs.filter(category_code__icontains=search)
        return JsonResponse({'categories': [category_dict(o) for o in qs], 'total': qs.count()})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = Category.objects.create(
                company=company,
                category_code=data['category_code'], category_name=data['category_name'],
                parent_id=data.get('parent_id') or None,
                description=data.get('description', ''),
            )
            return JsonResponse({'message': 'Category created.', 'category': category_dict(o)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def category_detail(request, pk):
    try:
        o = Category.objects.select_related('parent').get(pk=pk)
    except Category.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['category_name', 'description']:
            if f in data: setattr(o, f, data[f])
        if 'parent_id' in data: o.parent_id = data['parent_id'] or None
        o.save()
        return JsonResponse({'message': 'Updated.', 'category': category_dict(o)})
    if request.method == 'DELETE':
        o.is_active = False; o.save()
        return JsonResponse({'message': 'Deleted.'})


# ── Fabric Type ───────────────────────────────────────────────
@csrf_exempt
def fabric_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = FabricType.objects.filter(is_active=True)
        if company: qs = qs.filter(company=company)
        search = request.GET.get('search', '')
        if search: qs = qs.filter(fabric_name__icontains=search) | qs.filter(fabric_code__icontains=search)
        return JsonResponse({'fabrics': [fabric_dict(o) for o in qs], 'total': qs.count()})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = FabricType.objects.create(
                company=company,
                fabric_code=data['fabric_code'], fabric_name=data['fabric_name'],
                construction=data.get('construction', ''),
                fiber_content=data.get('fiber_content', ''),
            )
            return JsonResponse({'message': 'Fabric type created.', 'fabric': fabric_dict(o)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def fabric_detail(request, pk):
    try:
        o = FabricType.objects.get(pk=pk)
    except FabricType.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['fabric_name', 'construction', 'fiber_content']:
            if f in data: setattr(o, f, data[f])
        o.save()
        return JsonResponse({'message': 'Updated.', 'fabric': fabric_dict(o)})
    if request.method == 'DELETE':
        o.is_active = False; o.save()
        return JsonResponse({'message': 'Deleted.'})


# ── Testing Parameters ────────────────────────────────────────
@csrf_exempt
def testing_param_list(request):
    company = get_active_company(request)
    if request.method == 'GET':
        qs = TestingParameter.objects.filter(is_active=True)
        if company: qs = qs.filter(company=company)
        search = request.GET.get('search', '')
        if search: qs = qs.filter(parameter_name__icontains=search) | qs.filter(parameter_code__icontains=search)
        return JsonResponse({'parameters': [testing_param_dict(o) for o in qs], 'total': qs.count()})
    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            o = TestingParameter.objects.create(
                company=company,
                parameter_code=data['parameter_code'], parameter_name=data['parameter_name'],
                test_standard=data.get('test_standard', ''),
                acceptance_criteria=data.get('acceptance_criteria', ''),
                unit=data.get('unit', ''),
            )
            return JsonResponse({'message': 'Parameter created.', 'parameter': testing_param_dict(o)}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def testing_param_detail(request, pk):
    try:
        o = TestingParameter.objects.get(pk=pk)
    except TestingParameter.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['parameter_name', 'test_standard', 'acceptance_criteria', 'unit']:
            if f in data: setattr(o, f, data[f])
        o.save()
        return JsonResponse({'message': 'Updated.', 'parameter': testing_param_dict(o)})
    if request.method == 'DELETE':
        o.is_active = False; o.save()
        return JsonResponse({'message': 'Deleted.'})
