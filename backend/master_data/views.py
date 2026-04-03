# ============================================================
# FILE: master_data/views.py
# PURPOSE: API endpoints for all master data.
#          React pages call these to get/create/update/delete
#          items, suppliers, customers, warehouses.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from .models import Item, ItemCategory, UnitOfMeasure, Supplier, Customer, Warehouse


# ============================================================
# HELPER FUNCTIONS - Convert model objects to dictionaries
# ============================================================

def unit_to_dict(unit):
    return {'id': unit.id, 'name': unit.name, 'short_name': unit.short_name, 'is_active': unit.is_active}

def category_to_dict(cat):
    return {'id': cat.id, 'name': cat.name, 'description': cat.description, 'is_active': cat.is_active}

def item_to_dict(item):
    return {
        'id':               item.id,
        'item_code':        item.item_code,
        'item_name':        item.item_name,
        'item_type':        item.item_type,
        'category':         item.category.name if item.category else '',
        'category_id':      item.category_id,
        'unit_of_measure':  item.unit_of_measure.short_name if item.unit_of_measure else '',
        'unit_id':          item.unit_of_measure_id,
        'description':      item.description,
        'hsn_code':         item.hsn_code,
        'yarn_count':       item.yarn_count,
        'composition':      item.composition,
        'minimum_stock':    str(item.minimum_stock),
        'standard_price':   str(item.standard_price),
        'is_active':        item.is_active,
        'created_at':       item.created_at.strftime('%Y-%m-%d'),
    }

def supplier_to_dict(s):
    return {
        'id':               s.id,
        'supplier_code':    s.supplier_code,
        'supplier_name':    s.supplier_name,
        'supplier_type':    s.supplier_type,
        'contact_person':   s.contact_person,
        'phone':            s.phone,
        'email':            s.email,
        'address':          s.address,
        'city':             s.city,
        'state':            s.state,
        'country':          s.country,
        'gstin':            s.gstin,
        'payment_days':     s.payment_days,
        'is_active':        s.is_active,
    }

def customer_to_dict(c):
    return {
        'id':               c.id,
        'customer_code':    c.customer_code,
        'customer_name':    c.customer_name,
        'customer_type':    c.customer_type,
        'contact_person':   c.contact_person,
        'phone':            c.phone,
        'email':            c.email,
        'address':          c.address,
        'city':             c.city,
        'state':            c.state,
        'country':          c.country,
        'gstin':            c.gstin,
        'credit_days':      c.credit_days,
        'credit_limit':     str(c.credit_limit),
        'is_active':        c.is_active,
    }

def warehouse_to_dict(w):
    return {'id': w.id, 'code': w.code, 'name': w.name, 'address': w.address, 'is_active': w.is_active}


# ============================================================
# UNIT OF MEASURE
# ============================================================

@csrf_exempt
def unit_of_measure_list_and_create(request):
    """ GET = list all units | POST = create new unit """
    if request.method == 'GET':
        units = UnitOfMeasure.objects.filter(is_active=True)
        return JsonResponse({'units': [unit_to_dict(u) for u in units]})

    if request.method == 'POST':
        data = json.loads(request.body)
        unit = UnitOfMeasure.objects.create(name=data['name'], short_name=data['short_name'])
        return JsonResponse({'message': 'Unit created.', 'unit': unit_to_dict(unit)}, status=201)


# ============================================================
# ITEM CATEGORY
# ============================================================

@csrf_exempt
def item_category_list_and_create(request):
    """ GET = list all categories | POST = create new category """
    if request.method == 'GET':
        categories = ItemCategory.objects.filter(is_active=True)
        return JsonResponse({'categories': [category_to_dict(c) for c in categories]})

    if request.method == 'POST':
        data = json.loads(request.body)
        category = ItemCategory.objects.create(name=data['name'], description=data.get('description', ''))
        return JsonResponse({'message': 'Category created.', 'category': category_to_dict(category)}, status=201)


# ============================================================
# ITEMS
# ============================================================

@csrf_exempt
def item_list_and_create(request):
    """ GET = list all items | POST = create new item """

    if request.method == 'GET':
        items = Item.objects.select_related('category', 'unit_of_measure').filter(is_active=True)
        search = request.GET.get('search', '')
        if search:
            items = items.filter(item_name__icontains=search) | \
                    Item.objects.filter(item_code__icontains=search, is_active=True)
        item_type = request.GET.get('item_type', '')
        if item_type:
            items = items.filter(item_type=item_type)
        return JsonResponse({'items': [item_to_dict(i) for i in items], 'total': items.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            item = Item.objects.create(
                item_code           = data['item_code'],
                item_name           = data['item_name'],
                item_type           = data['item_type'],
                category_id         = data.get('category_id'),
                unit_of_measure_id  = data.get('unit_id'),
                description         = data.get('description', ''),
                hsn_code            = data.get('hsn_code', ''),
                yarn_count          = data.get('yarn_count', ''),
                composition         = data.get('composition', ''),
                minimum_stock       = data.get('minimum_stock', 0),
                standard_price      = data.get('standard_price', 0),
            )
            return JsonResponse({'message': 'Item created.', 'item': item_to_dict(item)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def item_detail_update_delete(request, item_id):
    """ GET = get one item | PUT = update | DELETE = deactivate """
    try:
        item = Item.objects.get(id=item_id)
    except Item.DoesNotExist:
        return JsonResponse({'message': 'Item not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'item': item_to_dict(item)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        for field in ['item_name', 'item_type', 'description', 'hsn_code',
                      'yarn_count', 'composition', 'minimum_stock', 'standard_price']:
            if field in data:
                setattr(item, field, data[field])
        if 'category_id' in data:
            item.category_id = data['category_id']
        if 'unit_id' in data:
            item.unit_of_measure_id = data['unit_id']
        item.save()
        return JsonResponse({'message': 'Item updated.', 'item': item_to_dict(item)})

    if request.method == 'DELETE':
        item.is_active = False
        item.save()
        return JsonResponse({'message': 'Item deactivated.'})


# ============================================================
# SUPPLIERS
# ============================================================

@csrf_exempt
def supplier_list_and_create(request):
    """ GET = list all suppliers | POST = create new supplier """

    if request.method == 'GET':
        suppliers = Supplier.objects.filter(is_active=True)
        search = request.GET.get('search', '')
        if search:
            suppliers = suppliers.filter(supplier_name__icontains=search)
        return JsonResponse({'suppliers': [supplier_to_dict(s) for s in suppliers], 'total': suppliers.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            supplier = Supplier.objects.create(
                supplier_code   = data['supplier_code'],
                supplier_name   = data['supplier_name'],
                supplier_type   = data.get('supplier_type', 'other'),
                contact_person  = data.get('contact_person', ''),
                phone           = data.get('phone', ''),
                email           = data.get('email', ''),
                address         = data.get('address', ''),
                city            = data.get('city', ''),
                state           = data.get('state', ''),
                country         = data.get('country', 'India'),
                pincode         = data.get('pincode', ''),
                gstin           = data.get('gstin', ''),
                pan_number      = data.get('pan_number', ''),
                payment_days    = data.get('payment_days', 30),
            )
            return JsonResponse({'message': 'Supplier created.', 'supplier': supplier_to_dict(supplier)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def supplier_detail_update_delete(request, supplier_id):
    """ GET = get one supplier | PUT = update | DELETE = deactivate """
    try:
        supplier = Supplier.objects.get(id=supplier_id)
    except Supplier.DoesNotExist:
        return JsonResponse({'message': 'Supplier not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'supplier': supplier_to_dict(supplier)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        for field in ['supplier_name', 'supplier_type', 'contact_person', 'phone',
                      'email', 'address', 'city', 'state', 'country', 'gstin', 'payment_days']:
            if field in data:
                setattr(supplier, field, data[field])
        supplier.save()
        return JsonResponse({'message': 'Supplier updated.', 'supplier': supplier_to_dict(supplier)})

    if request.method == 'DELETE':
        supplier.is_active = False
        supplier.save()
        return JsonResponse({'message': 'Supplier deactivated.'})


# ============================================================
# CUSTOMERS
# ============================================================

@csrf_exempt
def customer_list_and_create(request):
    """ GET = list all customers | POST = create new customer """

    if request.method == 'GET':
        customers = Customer.objects.filter(is_active=True)
        search = request.GET.get('search', '')
        if search:
            customers = customers.filter(customer_name__icontains=search)
        return JsonResponse({'customers': [customer_to_dict(c) for c in customers], 'total': customers.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            customer = Customer.objects.create(
                customer_code   = data['customer_code'],
                customer_name   = data['customer_name'],
                customer_type   = data.get('customer_type', 'domestic'),
                contact_person  = data.get('contact_person', ''),
                phone           = data.get('phone', ''),
                email           = data.get('email', ''),
                address         = data.get('address', ''),
                city            = data.get('city', ''),
                state           = data.get('state', ''),
                country         = data.get('country', 'India'),
                pincode         = data.get('pincode', ''),
                gstin           = data.get('gstin', ''),
                pan_number      = data.get('pan_number', ''),
                credit_days     = data.get('credit_days', 30),
                credit_limit    = data.get('credit_limit', 0),
            )
            return JsonResponse({'message': 'Customer created.', 'customer': customer_to_dict(customer)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def customer_detail_update_delete(request, customer_id):
    """ GET = get one customer | PUT = update | DELETE = deactivate """
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return JsonResponse({'message': 'Customer not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'customer': customer_to_dict(customer)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        for field in ['customer_name', 'customer_type', 'contact_person', 'phone',
                      'email', 'address', 'city', 'state', 'country', 'gstin',
                      'credit_days', 'credit_limit']:
            if field in data:
                setattr(customer, field, data[field])
        customer.save()
        return JsonResponse({'message': 'Customer updated.', 'customer': customer_to_dict(customer)})

    if request.method == 'DELETE':
        customer.is_active = False
        customer.save()
        return JsonResponse({'message': 'Customer deactivated.'})


# ============================================================
# WAREHOUSES
# ============================================================

@csrf_exempt
def warehouse_list_and_create(request):
    """ GET = list all warehouses | POST = create new warehouse """

    if request.method == 'GET':
        warehouses = Warehouse.objects.filter(is_active=True)
        return JsonResponse({'warehouses': [warehouse_to_dict(w) for w in warehouses]})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            warehouse = Warehouse.objects.create(
                name    = data['name'],
                code    = data['code'],
                address = data.get('address', ''),
            )
            return JsonResponse({'message': 'Warehouse created.', 'warehouse': warehouse_to_dict(warehouse)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def warehouse_detail_update(request, warehouse_id):
    """ GET = get one warehouse | PUT = update """
    try:
        warehouse = Warehouse.objects.get(id=warehouse_id)
    except Warehouse.DoesNotExist:
        return JsonResponse({'message': 'Warehouse not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'warehouse': warehouse_to_dict(warehouse)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        warehouse.name    = data.get('name', warehouse.name)
        warehouse.address = data.get('address', warehouse.address)
        warehouse.save()
        return JsonResponse({'message': 'Warehouse updated.', 'warehouse': warehouse_to_dict(warehouse)})
