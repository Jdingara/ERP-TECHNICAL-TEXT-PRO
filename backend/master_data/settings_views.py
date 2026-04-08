# ============================================================
# FILE: master_data/settings_views.py
# PURPOSE: API views for Financial Year and Document Series
#          settings — accessible via /api/master-data/settings/
# ============================================================

import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import FinancialYear, DocumentSeries


def _require_admin(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not logged in.'}, status=401)
    if not (request.user.is_staff or request.user.is_superuser):
        return JsonResponse({'message': 'Admin access required.'}, status=403)
    return None


def _fy_to_dict(fy):
    return {
        'id':         fy.id,
        'label':      fy.label,
        'start_date': str(fy.start_date),
        'end_date':   str(fy.end_date),
        'is_active':  fy.is_active,
        'created_at': fy.created_at.strftime('%Y-%m-%d'),
    }


def _series_to_dict(s):
    return {
        'id':              s.id,
        'document_type':   s.document_type,
        'label':           s.get_document_type_display(),
        'prefix':          s.prefix,
        'include_fy':      s.include_fy,
        'separator':       s.separator,
        'padding':         s.padding,
        'starting_number': s.starting_number,
        'current_number':  s.current_number,
        'is_enabled':      s.is_enabled,
        'preview':         s.preview(),
    }


# ─── Financial Year ──────────────────────────────────────────

@csrf_exempt
@require_http_methods(["GET", "POST"])
def financial_year_list_create(request):
    err = _require_admin(request)
    if err:
        return err

    if request.method == 'GET':
        return JsonResponse([_fy_to_dict(f) for f in FinancialYear.objects.all()], safe=False)

    data = json.loads(request.body)
    label = data.get('label', '').strip()
    if not label:
        return JsonResponse({'message': 'Label is required (e.g., 2025-26).'}, status=400)
    if FinancialYear.objects.filter(label=label).exists():
        return JsonResponse({'message': f'Financial year "{label}" already exists.'}, status=400)

    try:
        fy = FinancialYear.objects.create(
            label      = label,
            start_date = data['start_date'],
            end_date   = data['end_date'],
            is_active  = False,
        )
        return JsonResponse({'message': f'Financial year "{label}" created.', 'fy': _fy_to_dict(fy)}, status=201)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def financial_year_activate(request, fy_id):
    """Activate a financial year — deactivates all others and resets counters."""
    err = _require_admin(request)
    if err:
        return err

    try:
        fy = FinancialYear.objects.get(id=fy_id)
    except FinancialYear.DoesNotExist:
        return JsonResponse({'message': 'Financial year not found.'}, status=404)

    # Deactivate all others
    FinancialYear.objects.exclude(id=fy_id).update(is_active=False)
    fy.is_active = True
    fy.save()

    # Reset all series counters to (starting_number - 1) so next issued = starting_number
    DocumentSeries.objects.update(current_number=0)
    # Respect each series' own starting_number on next call (generate_next_number handles this)

    return JsonResponse({'message': f'Financial year "{fy.label}" activated. All document counters reset.'})


@csrf_exempt
@require_http_methods(["DELETE"])
def financial_year_delete(request, fy_id):
    err = _require_admin(request)
    if err:
        return err
    try:
        fy = FinancialYear.objects.get(id=fy_id)
    except FinancialYear.DoesNotExist:
        return JsonResponse({'message': 'Financial year not found.'}, status=404)
    if fy.is_active:
        return JsonResponse({'message': 'Cannot delete the active financial year.'}, status=400)
    fy.delete()
    return JsonResponse({'message': 'Financial year deleted.'})


# ─── Document Series ─────────────────────────────────────────

@require_http_methods(["GET"])
def document_series_list(request):
    err = _require_admin(request)
    if err:
        return err
    return JsonResponse([_series_to_dict(s) for s in DocumentSeries.objects.all()], safe=False)


@csrf_exempt
@require_http_methods(["PUT"])
def document_series_update(request, series_id):
    err = _require_admin(request)
    if err:
        return err

    try:
        series = DocumentSeries.objects.get(id=series_id)
    except DocumentSeries.DoesNotExist:
        return JsonResponse({'message': 'Series not found.'}, status=404)

    data = json.loads(request.body)
    series.prefix          = data.get('prefix',          series.prefix).strip()
    series.include_fy      = data.get('include_fy',      series.include_fy)
    series.separator       = data.get('separator',       series.separator)
    series.padding         = int(data.get('padding',     series.padding))
    series.starting_number = int(data.get('starting_number', series.starting_number))
    series.is_enabled      = data.get('is_enabled',      series.is_enabled)
    series.save()
    return JsonResponse({'message': 'Series updated.', 'series': _series_to_dict(series)})


@csrf_exempt
@require_http_methods(["POST"])
def document_series_reset(request, series_id):
    """Reset counter back to 0 (next issued = starting_number)."""
    err = _require_admin(request)
    if err:
        return err
    try:
        series = DocumentSeries.objects.get(id=series_id)
    except DocumentSeries.DoesNotExist:
        return JsonResponse({'message': 'Series not found.'}, status=404)
    series.current_number = 0
    series.save(update_fields=['current_number', 'updated_at'])
    return JsonResponse({'message': f'Counter for "{series.get_document_type_display()}" reset.'})


@require_http_methods(["GET"])
def series_enabled_map(request):
    """
    Returns a simple dict of {document_type: is_enabled}.
    Used by frontend forms to know which code fields to auto-generate.
    No admin restriction — any logged-in user can call this.
    """
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not logged in.'}, status=401)
    result = {s.document_type: s.is_enabled for s in DocumentSeries.objects.all()}
    return JsonResponse(result)
