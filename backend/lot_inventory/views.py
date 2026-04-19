# ============================================================
# FILE: lot_inventory/views.py
# PURPOSE: Lot-wise stock dashboard, movements, adjustments
# ============================================================

import json
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db import transaction
from django.db.models import Q, Sum

from master_data.company_utils import get_active_company
from .models import LotMovement, StockAdjustment
from purchase.models import Lot


# ── Serializers ───────────────────────────────────────────────

def movement_dict(m):
    return {
        'id': m.id,
        'lot_id': m.lot_id,
        'lot_number': m.lot.lot_number if m.lot else '',
        'movement_type': m.movement_type,
        'quantity': str(m.quantity),
        'from_location': m.from_location.name if m.from_location else '',
        'to_location': m.to_location.name if m.to_location else '',
        'reference': m.reference,
        'notes': m.notes,
        'created_at': m.created_at.strftime('%Y-%m-%d %H:%M'),
    }


def adjustment_dict(a):
    return {
        'id': a.id,
        'lot_id': a.lot_id,
        'lot_number': a.lot.lot_number if a.lot else '',
        'reason': a.reason,
        'adjustment_qty': str(a.adjustment_qty),
        'notes': a.notes,
        'created_at': a.created_at.strftime('%Y-%m-%d %H:%M'),
    }


# ── Lot Stock Dashboard ───────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET'])
def lot_stock_dashboard(request):
    """
    Summary of lot inventory by status and location.
    """
    company = get_active_company(request)
    lots = Lot.objects.filter(company=company)

    total_lots = lots.count()
    available = lots.filter(status='available').count()
    in_use = lots.filter(status='in_use').count()
    consumed = lots.filter(status='consumed').count()
    rejected = lots.filter(status='rejected').count()

    available_qty = lots.filter(status='available').aggregate(t=Sum('balance_qty'))['t'] or 0
    in_use_qty = lots.filter(status='in_use').aggregate(t=Sum('balance_qty'))['t'] or 0

    # By location
    from masters.models import Location
    location_summary = []
    for loc in Location.objects.filter(company=company, is_active=True, location_type='raw_material'):
        loc_lots = lots.filter(location=loc, status__in=['available', 'in_use'])
        location_summary.append({
            'location': loc.name,
            'lot_count': loc_lots.count(),
            'total_balance': str(loc_lots.aggregate(t=Sum('balance_qty'))['t'] or 0),
        })

    return JsonResponse({
        'summary': {
            'total_lots': total_lots,
            'available': available,
            'in_use': in_use,
            'consumed': consumed,
            'rejected': rejected,
            'available_qty': str(available_qty),
            'in_use_qty': str(in_use_qty),
        },
        'by_location': location_summary,
    })


# ── Lot Movements ─────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET'])
def lot_movements(request):
    company = get_active_company(request)
    qs = LotMovement.objects.filter(company=company).select_related('lot', 'from_location', 'to_location')

    lot_id = request.GET.get('lot_id')
    movement_type = request.GET.get('movement_type')
    if lot_id:
        qs = qs.filter(lot_id=lot_id)
    if movement_type:
        qs = qs.filter(movement_type=movement_type)

    return JsonResponse({'movements': [movement_dict(m) for m in qs[:200]]})


# ── Stock Adjustment ──────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def stock_adjustment_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = StockAdjustment.objects.filter(company=company).select_related('lot')
        return JsonResponse({'adjustments': [adjustment_dict(a) for a in qs]})

    data = json.loads(request.body)
    lot_id = data.get('lot_id')
    try:
        lot = Lot.objects.get(pk=lot_id, company=company)
    except Lot.DoesNotExist:
        return JsonResponse({'error': 'Lot not found'}, status=404)

    adj_qty = float(data.get('adjustment_qty', 0))
    if adj_qty == 0:
        return JsonResponse({'error': 'Adjustment quantity cannot be zero'}, status=400)

    new_balance = float(lot.balance_qty) + adj_qty
    if new_balance < 0:
        return JsonResponse({'error': f'Adjustment would make balance negative ({new_balance})'}, status=400)

    with transaction.atomic():
        adj = StockAdjustment.objects.create(
            company=company,
            lot=lot,
            reason=data.get('reason', 'other'),
            adjustment_qty=adj_qty,
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )
        lot.balance_qty = new_balance
        if new_balance <= 0:
            lot.status = 'consumed'
        elif lot.status == 'consumed':
            lot.status = 'available'
        lot.save()

        # Record movement
        LotMovement.objects.create(
            company=company,
            lot=lot,
            movement_type='adjustment',
            quantity=abs(adj_qty),
            reference=f'ADJ-{adj.id}',
            notes=data.get('notes', ''),
            created_by=request.user if request.user.is_authenticated else None,
        )

    return JsonResponse({'success': True, 'adjustment': adjustment_dict(adj), 'new_balance': str(lot.balance_qty)}, status=201)
