# ============================================================
# FILE: sales/views.py
# PURPOSE: API endpoints for sales module.
#          Sales Orders, Invoices, Delivery (reduces stock).
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
import json

from .models import SalesOrder, SalesOrderLine, Invoice, CustomerInquiry, Quotation
from datetime import date
from inventory.models import Stock, StockMovement


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def so_line_to_dict(line):
    return {
        'id':                   line.id,
        'item_id':              line.item_id,
        'item_code':            line.item.item_code,
        'item_name':            line.item.item_name,
        'unit':                 line.item.unit_of_measure.short_name if line.item.unit_of_measure else '',
        'ordered_quantity':     str(line.ordered_quantity),
        'delivered_quantity':   str(line.delivered_quantity),
        'unit_price':           str(line.unit_price),
        'total_price':          str(line.total_price),
        'notes':                line.notes,
    }

def so_to_dict(so, include_lines=False):
    data = {
        'id':               so.id,
        'so_number':        so.so_number,
        'customer_id':      so.customer_id,
        'customer_name':    so.customer.customer_name,
        'customer_address': ', '.join(filter(None, [so.customer.address, so.customer.city, so.customer.state])),
        'customer_gstin':   so.customer.gstin,
        'customer_phone':   so.customer.phone,
        'warehouse_id':     so.warehouse_id,
        'warehouse_name':   so.warehouse.name,
        'order_date':       str(so.order_date),
        'delivery_date':    str(so.delivery_date) if so.delivery_date else '',
        'status':           so.status,
        'notes':            so.notes,
        'total_amount':     str(so.total_amount),
        'created_at':       so.created_at.strftime('%Y-%m-%d'),
    }
    if include_lines:
        data['lines'] = [so_line_to_dict(l) for l in so.lines.select_related('item', 'item__unit_of_measure').all()]
    return data

def invoice_to_dict(inv):
    return {
        'id':               inv.id,
        'invoice_number':   inv.invoice_number,
        'so_number':        inv.sales_order.so_number,
        'sales_order_id':   inv.sales_order_id,
        'customer_name':    inv.customer.customer_name,
        'customer_address': ', '.join(filter(None, [inv.customer.address, inv.customer.city, inv.customer.state])),
        'customer_gstin':   inv.customer.gstin,
        'customer_phone':   inv.customer.phone,
        'invoice_date':     str(inv.invoice_date),
        'due_date':         str(inv.due_date),
        'subtotal':         str(inv.subtotal),
        'tax_amount':       str(inv.tax_amount),
        'total_amount':     str(inv.total_amount),
        'paid_amount':      str(inv.paid_amount),
        'balance_due':      str(inv.balance_due),
        'status':           inv.status,
        'notes':            inv.notes,
    }


# ============================================================
# SALES ORDERS
# ============================================================

@csrf_exempt
def sales_order_list_and_create(request):
    """ GET = list all SOs | POST = create new SO """

    if request.method == 'GET':
        orders = SalesOrder.objects.select_related('customer', 'warehouse').all()
        status_filter = request.GET.get('status', '')
        if status_filter:
            orders = orders.filter(status=status_filter)
        return JsonResponse({'sales_orders': [so_to_dict(o) for o in orders], 'total': orders.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            with transaction.atomic():
                so = SalesOrder.objects.create(
                    so_number       = data['so_number'],
                    customer_id     = data['customer_id'],
                    warehouse_id    = data['warehouse_id'],
                    order_date      = data['order_date'],
                    delivery_date   = data.get('delivery_date') or None,
                    status          = 'draft',
                    notes           = data.get('notes', ''),
                    created_by      = request.user if request.user.is_authenticated else None,
                )

                total = 0
                for line_data in data.get('lines', []):
                    qty         = float(line_data['ordered_quantity'])
                    price       = float(line_data.get('unit_price', 0))
                    line_total  = qty * price
                    SalesOrderLine.objects.create(
                        sales_order         = so,
                        item_id             = line_data['item_id'],
                        ordered_quantity    = qty,
                        unit_price          = price,
                        total_price         = line_total,
                        notes               = line_data.get('notes', ''),
                    )
                    total += line_total

                so.total_amount = total
                so.save()

            return JsonResponse({'message': 'Sales order created.', 'sales_order': so_to_dict(so, include_lines=True)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def sales_order_detail(request, so_id):
    """ GET = get SO with lines | PUT = update status """
    try:
        so = SalesOrder.objects.get(id=so_id)
    except SalesOrder.DoesNotExist:
        return JsonResponse({'message': 'Sales order not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'sales_order': so_to_dict(so, include_lines=True)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        # Lock: delivered or cancelled SO cannot be edited
        if so.status in ('delivered', 'cancelled') and data.get('status') not in ('delivered', 'cancelled'):
            return JsonResponse({'message': f'Cannot edit a {so.status} sales order. It is locked.'}, status=400)
        if 'status' in data:
            so.status = data['status']
        if 'delivery_date' in data:
            so.delivery_date = data['delivery_date'] or None
        if 'notes' in data:
            so.notes = data['notes']
        so.save()
        return JsonResponse({'message': 'Sales order updated.', 'sales_order': so_to_dict(so)})

    if request.method == 'DELETE':
        if so.status != 'draft':
            return JsonResponse({'message': f'Only draft sales orders can be deleted. This SO is {so.status}.'}, status=400)
        so.delete()
        return JsonResponse({'message': 'Sales order deleted.'})


@csrf_exempt
def sales_order_deliver(request, so_id):
    """
    POST /api/sales/orders/<id>/deliver/
    Confirms delivery — automatically reduces stock.
    """
    try:
        so = SalesOrder.objects.select_related('warehouse').get(id=so_id)
    except SalesOrder.DoesNotExist:
        return JsonResponse({'message': 'Sales order not found.'}, status=404)

    if so.status == 'delivered':
        return JsonResponse({'message': 'Already delivered.'}, status=400)

    try:
        with transaction.atomic():
            for line in so.lines.select_related('item').all():
                remaining = line.ordered_quantity - line.delivered_quantity
                if remaining <= 0:
                    continue

                # Check stock
                try:
                    stock = Stock.objects.get(item=line.item, warehouse=so.warehouse)
                except Stock.DoesNotExist:
                    raise ValueError(f'No stock found for {line.item.item_code} in {so.warehouse.name}')

                if stock.quantity < remaining:
                    raise ValueError(f'Insufficient stock for {line.item.item_code}. Available: {stock.quantity}, Required: {remaining}')

                # Reduce stock
                stock.quantity -= remaining
                stock.save()

                # Record movement
                StockMovement.objects.create(
                    item            = line.item,
                    warehouse       = so.warehouse,
                    movement_type   = 'stock_out',
                    quantity        = remaining,
                    reference_number = so.so_number,
                    reference_type  = 'sales_order',
                    notes           = f'Delivery for SO: {so.so_number}',
                    created_by      = request.user if request.user.is_authenticated else None,
                )

                line.delivered_quantity = line.ordered_quantity
                line.save()

            so.status = 'delivered'
            so.save()

        return JsonResponse({'message': 'Delivery confirmed. Stock updated.'})
    except ValueError as e:
        return JsonResponse({'message': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=400)


# ============================================================
# INVOICES
# ============================================================

@csrf_exempt
def invoice_list_and_create(request):
    """ GET = list all invoices | POST = create invoice from SO """

    if request.method == 'GET':
        invoices = Invoice.objects.select_related('customer', 'sales_order').all()
        return JsonResponse({'invoices': [invoice_to_dict(i) for i in invoices], 'total': invoices.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            so = SalesOrder.objects.get(id=data['sales_order_id'])
            invoice = Invoice.objects.create(
                invoice_number  = data['invoice_number'],
                sales_order     = so,
                customer        = so.customer,
                invoice_date    = data['invoice_date'],
                due_date        = data['due_date'],
                subtotal        = data.get('subtotal', so.total_amount),
                tax_amount      = data.get('tax_amount', 0),
                total_amount    = data.get('total_amount', so.total_amount),
                notes           = data.get('notes', ''),
                created_by      = request.user if request.user.is_authenticated else None,
            )
            return JsonResponse({'message': 'Invoice created.', 'invoice': invoice_to_dict(invoice)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


# ============================================================
# CUSTOMER INQUIRY
# ============================================================

def inquiry_to_dict(inq):
    return {
        'id':                   inq.id,
        'inquiry_number':       inq.inquiry_number,
        'customer_id':          inq.customer_id,
        'customer_name':        inq.customer.customer_name,
        'received_date':        str(inq.received_date),
        'product_description':  inq.product_description,
        'end_use':              inq.end_use,
        'gsm_required':         str(inq.gsm_required) if inq.gsm_required else '',
        'width_cm':             str(inq.width_cm) if inq.width_cm else '',
        'tensile_requirement':  inq.tensile_requirement,
        'coating_required':     inq.coating_required,
        'coating_type':         inq.coating_type,
        'color':                inq.color,
        'quantity_required':    str(inq.quantity_required),
        'unit':                 inq.unit,
        'target_price':         str(inq.target_price) if inq.target_price else '',
        'required_by_date':     str(inq.required_by_date) if inq.required_by_date else '',
        'status':               inq.status,
        'assigned_to':          inq.assigned_to,
        'notes':                inq.notes,
        'created_at':           inq.created_at.strftime('%Y-%m-%d'),
    }

@csrf_exempt
def inquiry_list_and_create(request):
    if request.method == 'GET':
        inquiries = CustomerInquiry.objects.select_related('customer').all()
        status_filter = request.GET.get('status', '')
        if status_filter:
            inquiries = inquiries.filter(status=status_filter)
        return JsonResponse({'inquiries': [inquiry_to_dict(i) for i in inquiries], 'total': inquiries.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            # Auto-generate inquiry number: INQ-YYYYMMDD-001
            today_str = date.today().strftime('%Y%m%d')
            prefix = f'INQ-{today_str}-'
            last = CustomerInquiry.objects.filter(inquiry_number__startswith=prefix).order_by('-inquiry_number').first()
            next_num = int(last.inquiry_number.split('-')[-1]) + 1 if last else 1
            inq_number = f'{prefix}{str(next_num).zfill(3)}'

            inq = CustomerInquiry.objects.create(
                inquiry_number      = inq_number,
                customer_id         = data['customer_id'],
                received_date       = data['received_date'],
                product_description = data['product_description'],
                end_use             = data.get('end_use', 'other'),
                gsm_required        = data.get('gsm_required') or None,
                width_cm            = data.get('width_cm') or None,
                tensile_requirement = data.get('tensile_requirement', ''),
                coating_required    = data.get('coating_required', False),
                coating_type        = data.get('coating_type', ''),
                color               = data.get('color', ''),
                quantity_required   = data['quantity_required'],
                unit                = data.get('unit', 'meters'),
                target_price        = data.get('target_price') or None,
                required_by_date    = data.get('required_by_date') or None,
                status              = 'new',
                assigned_to         = data.get('assigned_to', ''),
                notes               = data.get('notes', ''),
                created_by          = request.user if request.user.is_authenticated else None,
            )
            return JsonResponse({'message': 'Inquiry created.', 'inquiry': inquiry_to_dict(inq)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def inquiry_detail(request, inquiry_id):
    try:
        inq = CustomerInquiry.objects.select_related('customer').get(id=inquiry_id)
    except CustomerInquiry.DoesNotExist:
        return JsonResponse({'message': 'Inquiry not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'inquiry': inquiry_to_dict(inq)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        for field in ['product_description', 'end_use', 'tensile_requirement', 'coating_required',
                      'coating_type', 'color', 'unit', 'assigned_to', 'notes', 'status']:
            if field in data:
                setattr(inq, field, data[field])
        for field in ['gsm_required', 'width_cm', 'quantity_required', 'target_price']:
            if field in data:
                setattr(inq, field, data[field] or None)
        if 'required_by_date' in data:
            inq.required_by_date = data['required_by_date'] or None
        inq.save()
        return JsonResponse({'message': 'Inquiry updated.', 'inquiry': inquiry_to_dict(inq)})


# ============================================================
# QUOTATION
# ============================================================

def quotation_to_dict(qt):
    return {
        'id':                   qt.id,
        'quotation_number':     qt.quotation_number,
        'inquiry_id':           qt.inquiry_id,
        'inquiry_number':       qt.inquiry.inquiry_number if qt.inquiry else '',
        'customer_id':          qt.customer_id,
        'customer_name':        qt.customer.customer_name,
        'customer_address':     ', '.join(filter(None, [qt.customer.address, qt.customer.city, qt.customer.state])),
        'customer_gstin':       qt.customer.gstin,
        'customer_phone':       qt.customer.phone,
        'date':                 str(qt.date),
        'valid_until':          str(qt.valid_until),
        'product_description':  qt.product_description,
        'gsm':                  str(qt.gsm) if qt.gsm else '',
        'width_cm':             str(qt.width_cm) if qt.width_cm else '',
        'quantity':             str(qt.quantity),
        'unit':                 qt.unit,
        'unit_price':           str(qt.unit_price),
        'total_amount':         str(qt.total_amount),
        'lead_time_days':       qt.lead_time_days,
        'spec_notes':           qt.spec_notes,
        'payment_terms':        qt.payment_terms,
        'delivery_terms':       qt.delivery_terms,
        'status':               qt.status,
        'created_at':           qt.created_at.strftime('%Y-%m-%d'),
    }

@csrf_exempt
def quotation_list_and_create(request):
    if request.method == 'GET':
        quotations = Quotation.objects.select_related('customer', 'inquiry').all()
        status_filter = request.GET.get('status', '')
        if status_filter:
            quotations = quotations.filter(status=status_filter)
        return JsonResponse({'quotations': [quotation_to_dict(q) for q in quotations], 'total': quotations.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            # Auto-generate quotation number: QT-YYYYMMDD-001
            today_str = date.today().strftime('%Y%m%d')
            prefix = f'QT-{today_str}-'
            last = Quotation.objects.filter(quotation_number__startswith=prefix).order_by('-quotation_number').first()
            next_num = int(last.quotation_number.split('-')[-1]) + 1 if last else 1
            qt_number = f'{prefix}{str(next_num).zfill(3)}'

            qty   = float(data['quantity'])
            price = float(data['unit_price'])

            # Determine customer: from inquiry if linked, else from data
            inquiry = None
            customer_id = data.get('customer_id')
            if data.get('inquiry_id'):
                inquiry = CustomerInquiry.objects.get(id=data['inquiry_id'])
                if not customer_id:
                    customer_id = inquiry.customer_id

            qt = Quotation.objects.create(
                quotation_number    = qt_number,
                inquiry             = inquiry,
                customer_id         = customer_id,
                date                = data['date'],
                valid_until         = data['valid_until'],
                product_description = data['product_description'],
                gsm                 = data.get('gsm') or None,
                width_cm            = data.get('width_cm') or None,
                quantity            = qty,
                unit                = data.get('unit', 'meters'),
                unit_price          = price,
                total_amount        = round(qty * price, 2),
                lead_time_days      = data.get('lead_time_days', 30),
                spec_notes          = data.get('spec_notes', ''),
                payment_terms       = data.get('payment_terms', ''),
                delivery_terms      = data.get('delivery_terms', ''),
                status              = 'draft',
                created_by          = request.user if request.user.is_authenticated else None,
            )

            # Update inquiry status to 'quoted' if linked
            if inquiry and inquiry.status not in ('won', 'lost'):
                inquiry.status = 'quoted'
                inquiry.save()

            return JsonResponse({'message': 'Quotation created.', 'quotation': quotation_to_dict(qt)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def quotation_detail(request, qt_id):
    try:
        qt = Quotation.objects.select_related('customer', 'inquiry').get(id=qt_id)
    except Quotation.DoesNotExist:
        return JsonResponse({'message': 'Quotation not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'quotation': quotation_to_dict(qt)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        # Lock: accepted quotations cannot be edited (SO has been raised against it)
        if qt.status == 'accepted':
            return JsonResponse({'message': 'Cannot edit an accepted quotation. A sales order has been raised.'}, status=400)
        for field in ['product_description', 'unit', 'spec_notes', 'payment_terms', 'delivery_terms', 'status']:
            if field in data:
                setattr(qt, field, data[field])
        for field in ['gsm', 'width_cm']:
            if field in data:
                setattr(qt, field, data[field] or None)
        if 'lead_time_days' in data:
            qt.lead_time_days = data['lead_time_days']
        # Prices/qty locked if status is sent/accepted
        if qt.status not in ('sent', 'accepted'):
            if 'quantity' in data or 'unit_price' in data:
                qty   = float(data.get('quantity', qt.quantity))
                price = float(data.get('unit_price', qt.unit_price))
                qt.quantity     = qty
                qt.unit_price   = price
                qt.total_amount = round(qty * price, 2)
        if 'valid_until' in data:
            qt.valid_until = data['valid_until']
        qt.save()
        return JsonResponse({'message': 'Quotation updated.', 'quotation': quotation_to_dict(qt)})

    if request.method == 'DELETE':
        if qt.status != 'draft':
            return JsonResponse({'message': f'Only draft quotations can be deleted. This quotation is {qt.status}.'}, status=400)
        qt.delete()
        return JsonResponse({'message': 'Quotation deleted.'})


# ============================================================
# INVOICES
# ============================================================

@csrf_exempt
def invoice_mark_paid(request, invoice_id):
    """ POST - mark invoice as paid """
    try:
        invoice = Invoice.objects.get(id=invoice_id)
        data = json.loads(request.body)
        invoice.paid_amount = invoice.total_amount
        invoice.status = 'paid'
        invoice.save()
        return JsonResponse({'message': 'Invoice marked as paid.', 'invoice': invoice_to_dict(invoice)})
    except Invoice.DoesNotExist:
        return JsonResponse({'message': 'Invoice not found.'}, status=404)
