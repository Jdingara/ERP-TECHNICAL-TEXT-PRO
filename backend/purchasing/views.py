# ============================================================
# FILE: purchasing/views.py
# PURPOSE: API endpoints for purchasing module.
#          Purchase Orders, Goods Receipt (GRN).
#          Confirming GRN automatically updates stock.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.utils import timezone
import json

from .models import PurchaseOrder, PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine
from inventory.models import Stock, StockMovement
from master_data.doc_series_utils import generate_next_number
from authentication.audit import log_action, field_diff


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def po_line_to_dict(line):
    return {
        'id':                   line.id,
        'item_id':              line.item_id,
        'item_code':            line.item.item_code,
        'item_name':            line.item.item_name,
        'unit':                 line.item.unit_of_measure.short_name if line.item.unit_of_measure else '',
        'ordered_quantity':     str(line.ordered_quantity),
        'received_quantity':    str(line.received_quantity),
        'unit_price':           str(line.unit_price),
        'total_price':          str(line.total_price),
        'notes':                line.notes,
    }

def po_to_dict(po, include_lines=False):
    data = {
        'id':                   po.id,
        'po_number':            po.po_number,
        'supplier_id':          po.supplier_id,
        'supplier_name':        po.supplier.supplier_name,
        'supplier_address':     ', '.join(filter(None, [po.supplier.address, po.supplier.city, po.supplier.state])),
        'supplier_phone':       po.supplier.phone,
        'supplier_gstin':       po.supplier.gstin,
        'supplier_contact':     po.supplier.contact_person,
        'warehouse_id':         po.warehouse_id,
        'warehouse_name':       po.warehouse.name,
        'delivery_address':     po.warehouse.address,
        'order_date':           str(po.order_date),
        'expected_date':        str(po.expected_date) if po.expected_date else '',
        'status':               po.status,
        'notes':                po.notes,
        'total_amount':         str(po.total_amount),
        'created_at':           po.created_at.strftime('%Y-%m-%d'),
    }
    if include_lines:
        data['lines'] = [po_line_to_dict(l) for l in po.lines.select_related('item', 'item__unit_of_measure').all()]
    return data

def grn_to_dict(grn, include_lines=False):
    data = {
        'id':                       grn.id,
        'grn_number':               grn.grn_number,
        'po_number':                grn.purchase_order.po_number,
        'purchase_order_id':        grn.purchase_order_id,
        'supplier_name':            grn.purchase_order.supplier.supplier_name,
        'supplier_address':         ', '.join(filter(None, [grn.purchase_order.supplier.address, grn.purchase_order.supplier.city, grn.purchase_order.supplier.state])),
        'warehouse_name':           grn.purchase_order.warehouse.name,
        'receipt_date':             str(grn.receipt_date),
        'supplier_invoice_number':  grn.supplier_invoice_number,
        'status':                   grn.status,
        'notes':                    grn.notes,
        'created_at':               grn.created_at.strftime('%Y-%m-%d'),
    }
    if include_lines:
        data['lines'] = [{
            'id':               l.id,
            'item_code':        l.item.item_code,
            'item_name':        l.item.item_name,
            'received_quantity': str(l.received_quantity),
        } for l in grn.lines.select_related('item').all()]
    return data


# ============================================================
# PURCHASE ORDERS
# ============================================================

@csrf_exempt
def purchase_order_list_and_create(request):
    """ GET = list all POs | POST = create new PO with lines """

    if request.method == 'GET':
        pos = PurchaseOrder.objects.select_related('supplier', 'warehouse').all()
        status_filter = request.GET.get('status', '')
        if status_filter:
            pos = pos.filter(status=status_filter)
        return JsonResponse({'purchase_orders': [po_to_dict(p) for p in pos], 'total': pos.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            with transaction.atomic():
                po_number = generate_next_number('purchase_order') or data.get('po_number', '').strip()
                if not po_number:
                    return JsonResponse({'message': 'PO number required or enable auto-numbering in Format Panel.'}, status=400)
                po = PurchaseOrder.objects.create(
                    po_number       = po_number,
                    supplier_id     = data['supplier_id'],
                    warehouse_id    = data['warehouse_id'],
                    order_date      = data['order_date'],
                    expected_date   = data.get('expected_date') or None,
                    status          = 'draft',
                    notes           = data.get('notes', ''),
                )

                total = 0
                for line_data in data.get('lines', []):
                    qty     = float(line_data['ordered_quantity'])
                    price   = float(line_data.get('unit_price', 0))
                    line_total = qty * price
                    PurchaseOrderLine.objects.create(
                        purchase_order  = po,
                        item_id         = line_data['item_id'],
                        ordered_quantity = qty,
                        unit_price      = price,
                        total_price     = line_total,
                        notes           = line_data.get('notes', ''),
                    )
                    total += line_total

                po.total_amount = total
                po.save()

            log_action(request, 'Purchase Order', 'Created', po.po_number,
                       {'supplier': po.supplier.supplier_name, 'total': str(po.total_amount)})
            return JsonResponse({'message': 'Purchase order created.', 'purchase_order': po_to_dict(po, include_lines=True)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def purchase_order_detail(request, po_id):
    """ GET = get PO with lines | PUT = update status """
    try:
        po = PurchaseOrder.objects.get(id=po_id)
    except PurchaseOrder.DoesNotExist:
        return JsonResponse({'message': 'Purchase order not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'purchase_order': po_to_dict(po, include_lines=True)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        # Lock: received PO cannot be edited
        if po.status == 'received':
            return JsonResponse({'message': 'Cannot edit a received purchase order. GRN has been confirmed.'}, status=400)
        before = {'status': po.status, 'expected_date': str(po.expected_date or ''), 'notes': po.notes}
        if 'status' in data:
            po.status = data['status']
        if 'notes' in data:
            po.notes = data['notes']
        if 'expected_date' in data:
            po.expected_date = data['expected_date'] or None
        po.save()
        after = {'status': po.status, 'expected_date': str(po.expected_date or ''), 'notes': po.notes}
        diff = field_diff(before, after)
        if diff:
            log_action(request, 'Purchase Order', 'Updated', po.po_number, {'changes': diff})
        return JsonResponse({'message': 'Purchase order updated.', 'purchase_order': po_to_dict(po)})

    if request.method == 'DELETE':
        if po.status != 'draft':
            return JsonResponse({'message': f'Only draft purchase orders can be deleted. This PO is {po.status}.'}, status=400)
        log_action(request, 'Purchase Order', 'Deleted', po.po_number, {'supplier': po.supplier.supplier_name})
        po.delete()
        return JsonResponse({'message': 'Purchase order deleted.'})


# ============================================================
# GOODS RECEIPT (GRN)
# ============================================================

@csrf_exempt
def goods_receipt_list_and_create(request):
    """ GET = list all GRNs | POST = create new GRN """

    if request.method == 'GET':
        grns = GoodsReceipt.objects.select_related('purchase_order', 'purchase_order__supplier').all()
        return JsonResponse({'goods_receipts': [grn_to_dict(g) for g in grns]})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            with transaction.atomic():
                po = PurchaseOrder.objects.get(id=data['purchase_order_id'])

                grn_number = generate_next_number('grn') or data.get('grn_number', '').strip()
                if not grn_number:
                    return JsonResponse({'message': 'GRN number required or enable auto-numbering in Format Panel.'}, status=400)
                grn = GoodsReceipt.objects.create(
                    grn_number              = grn_number,
                    purchase_order          = po,
                    receipt_date            = data['receipt_date'],
                    supplier_invoice_number = data.get('supplier_invoice_number', ''),
                    status                  = 'draft',
                    notes                   = data.get('notes', ''),
                    created_by              = request.user if request.user.is_authenticated else None,
                )

                for line_data in data.get('lines', []):
                    po_line = PurchaseOrderLine.objects.get(id=line_data['po_line_id'])
                    GoodsReceiptLine.objects.create(
                        goods_receipt       = grn,
                        purchase_order_line = po_line,
                        item                = po_line.item,
                        received_quantity   = line_data['received_quantity'],
                    )

            log_action(request, 'Goods Receipt', 'Created', grn.grn_number,
                       {'po': po.po_number, 'supplier': po.supplier.supplier_name})
            return JsonResponse({'message': 'GRN created.', 'grn': grn_to_dict(grn, include_lines=True)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def goods_receipt_confirm(request, grn_id):
    """
    POST /api/purchasing/grn/<id>/confirm/
    Confirms the GRN — automatically adds received items to stock.
    """
    try:
        grn = GoodsReceipt.objects.select_related('purchase_order__warehouse').get(id=grn_id)
    except GoodsReceipt.DoesNotExist:
        return JsonResponse({'message': 'GRN not found.'}, status=404)

    if grn.status == 'confirmed':
        return JsonResponse({'message': 'GRN already confirmed.'}, status=400)

    try:
        with transaction.atomic():
            warehouse = grn.purchase_order.warehouse

            for line in grn.lines.select_related('item', 'purchase_order_line').all():
                # Add stock
                stock, _ = Stock.objects.get_or_create(
                    item=line.item, warehouse=warehouse,
                    defaults={'quantity': 0}
                )
                stock.quantity += line.received_quantity
                stock.save()

                # Record stock movement
                StockMovement.objects.create(
                    item        = line.item,
                    warehouse   = warehouse,
                    movement_type = 'stock_in',
                    quantity    = line.received_quantity,
                    reference_number = grn.grn_number,
                    reference_type   = 'goods_receipt',
                    notes       = f'GRN: {grn.grn_number} | PO: {grn.purchase_order.po_number}',
                    created_by  = request.user if request.user.is_authenticated else None,
                )

                # Update PO line received quantity
                po_line = line.purchase_order_line
                po_line.received_quantity += line.received_quantity
                po_line.save()

            # Update GRN status
            grn.status = 'confirmed'
            grn.save()

            # Update PO status
            po = grn.purchase_order
            all_lines = po.lines.all()
            all_received = all(l.received_quantity >= l.ordered_quantity for l in all_lines)
            po.status = 'received' if all_received else 'partial'
            po.save()

        log_action(request, 'Goods Receipt', 'Confirmed', grn.grn_number,
                   {'po': grn.purchase_order.po_number, 'supplier': grn.purchase_order.supplier.supplier_name})
        return JsonResponse({'message': 'GRN confirmed. Stock updated successfully.'})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def grn_detail(request, grn_id):
    """ GET = get GRN with lines | DELETE = delete draft GRN """
    try:
        grn = GoodsReceipt.objects.select_related(
            'purchase_order__supplier', 'purchase_order__warehouse'
        ).get(id=grn_id)
    except GoodsReceipt.DoesNotExist:
        return JsonResponse({'message': 'GRN not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'grn': grn_to_dict(grn, include_lines=True)})

    if request.method == 'DELETE':
        if grn.status == 'confirmed':
            return JsonResponse({'message': 'Cannot delete a confirmed GRN. Stock has already been updated.'}, status=400)
        grn.delete()
        return JsonResponse({'message': 'GRN deleted.'})
