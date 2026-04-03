# ============================================================
# FILE: inventory/views.py
# PURPOSE: API endpoints for inventory management.
#          Handles stock list, stock movements, adjustments.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
import json

from .models import Stock, StockMovement, StockAdjustment, StockAdjustmentLine
from master_data.models import Item, Warehouse


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def stock_to_dict(stock):
    return {
        'id':               stock.id,
        'item_id':          stock.item_id,
        'item_code':        stock.item.item_code,
        'item_name':        stock.item.item_name,
        'item_type':        stock.item.item_type,
        'yarn_count':       stock.item.yarn_count,
        'composition':      stock.item.composition,
        'unit':             stock.item.unit_of_measure.short_name if stock.item.unit_of_measure else '',
        'warehouse_id':     stock.warehouse_id,
        'warehouse':        stock.warehouse.name,
        'quantity':         str(stock.quantity),
        'minimum_stock':    str(stock.item.minimum_stock),
        'is_low_stock':     stock.quantity <= stock.item.minimum_stock,
        'updated_at':       stock.updated_at.strftime('%Y-%m-%d %H:%M'),
    }

def movement_to_dict(m):
    return {
        'id':               m.id,
        'item_code':        m.item.item_code,
        'item_name':        m.item.item_name,
        'warehouse':        m.warehouse.name,
        'movement_type':    m.movement_type,
        'quantity':         str(m.quantity),
        'reference_number': m.reference_number,
        'notes':            m.notes,
        'created_by':       m.created_by.username if m.created_by else '',
        'created_at':       m.created_at.strftime('%Y-%m-%d %H:%M'),
    }


# ============================================================
# STOCK LIST
# Shows current stock of all items
# ============================================================

@csrf_exempt
def stock_list(request):
    """
    GET /api/inventory/stock/
    Returns current stock levels for all items.
    Optional filter: ?warehouse_id=1 or ?search=cotton
    """
    stocks = Stock.objects.select_related('item', 'item__unit_of_measure', 'warehouse').all()

    search = request.GET.get('search', '')
    if search:
        stocks = stocks.filter(item__item_name__icontains=search) | \
                 Stock.objects.filter(item__item_code__icontains=search)

    warehouse_id = request.GET.get('warehouse_id', '')
    if warehouse_id:
        stocks = stocks.filter(warehouse_id=warehouse_id)

    low_stock_only = request.GET.get('low_stock', '')
    result = [stock_to_dict(s) for s in stocks]
    if low_stock_only:
        result = [s for s in result if s['is_low_stock']]

    return JsonResponse({'stocks': result, 'total': len(result)})


# ============================================================
# STOCK MOVEMENT - Add stock in or out manually
# ============================================================

@csrf_exempt
def stock_movement_list_and_create(request):
    """
    GET  /api/inventory/movements/   - List all stock movements
    POST /api/inventory/movements/   - Add a new stock movement
    """

    if request.method == 'GET':
        movements = StockMovement.objects.select_related('item', 'warehouse', 'created_by').all()[:100]
        return JsonResponse({'movements': [movement_to_dict(m) for m in movements]})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            item_id      = data['item_id']
            warehouse_id = data['warehouse_id']
            movement_type = data['movement_type']
            quantity     = float(data['quantity'])

            if quantity <= 0:
                return JsonResponse({'message': 'Quantity must be greater than zero.'}, status=400)

            with transaction.atomic():
                # Create the movement record
                movement = StockMovement.objects.create(
                    item_id         = item_id,
                    warehouse_id    = warehouse_id,
                    movement_type   = movement_type,
                    quantity        = quantity,
                    reference_number = data.get('reference_number', ''),
                    notes           = data.get('notes', ''),
                    created_by      = request.user if request.user.is_authenticated else None,
                )

                # Update stock balance
                stock, created = Stock.objects.get_or_create(
                    item_id=item_id,
                    warehouse_id=warehouse_id,
                    defaults={'quantity': 0}
                )

                # Stock IN movements increase quantity
                if movement_type in ('stock_in', 'adjustment_in', 'transfer_in', 'production_in'):
                    stock.quantity += quantity
                # Stock OUT movements decrease quantity
                elif movement_type in ('stock_out', 'adjustment_out', 'transfer_out', 'production_out'):
                    if stock.quantity < quantity:
                        raise ValueError(f'Insufficient stock. Available: {stock.quantity}')
                    stock.quantity -= quantity

                stock.save()

            return JsonResponse({'message': 'Stock movement saved.', 'movement': movement_to_dict(movement)}, status=201)

        except ValueError as e:
            return JsonResponse({'message': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


# ============================================================
# STOCK SUMMARY FOR DASHBOARD
# ============================================================

def stock_summary(request):
    """
    GET /api/inventory/summary/
    Returns total items, total stock value, low stock count.
    Used by the dashboard.
    """
    total_items     = Stock.objects.count()
    low_stock_items = [s for s in Stock.objects.select_related('item') if s.quantity <= s.item.minimum_stock]

    return JsonResponse({
        'total_stock_items':    total_items,
        'low_stock_count':      len(low_stock_items),
    })
