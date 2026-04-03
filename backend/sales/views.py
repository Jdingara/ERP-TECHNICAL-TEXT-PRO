# ============================================================
# FILE: sales/views.py
# PURPOSE: API endpoints for sales module.
#          Sales Orders, Invoices, Delivery (reduces stock).
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
import json

from .models import SalesOrder, SalesOrderLine, Invoice
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
        if 'status' in data:
            so.status = data['status']
        so.save()
        return JsonResponse({'message': 'Sales order updated.', 'sales_order': so_to_dict(so)})


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
