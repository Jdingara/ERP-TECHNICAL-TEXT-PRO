# ============================================================
# FILE: tds_tcs/views.py
# PURPOSE: API endpoints for TDS and TCS module.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, Q
import json

from .models import TDSSection, VendorTDSConfig, TDSDeduction, TDSReturn, TCSSection, TCSCollection
from master_data.company_utils import get_active_company


# ── Helpers ──────────────────────────────────────────────────

def section_to_dict(s):
    return {
        'id': s.id, 'section_code': s.section_code, 'description': s.description,
        'nature_of_payment': s.nature_of_payment,
        'rate_individual_huf': str(s.rate_individual_huf), 'rate_company': str(s.rate_company),
        'rate_no_pan': str(s.rate_no_pan), 'annual_threshold': str(s.annual_threshold),
        'single_payment_threshold': str(s.single_payment_threshold),
        'is_salary_section': s.is_salary_section, 'is_active': s.is_active,
    }

def deduction_to_dict(d):
    return {
        'id': d.id, 'deduction_date': str(d.deduction_date),
        'section': d.section.section_code, 'section_id': d.section_id,
        'party_type': d.party_type, 'party_name': d.party_name, 'party_pan': d.party_pan,
        'transaction_amount': str(d.transaction_amount), 'tds_rate': str(d.tds_rate),
        'tds_amount': str(d.tds_amount), 'total_tds': str(d.total_tds),
        'status': d.status, 'deposit_date': str(d.deposit_date) if d.deposit_date else None,
        'challan_number': d.challan_number,
    }

def collection_to_dict(c):
    return {
        'id': c.id, 'collection_date': str(c.collection_date),
        'section': c.section.section_code, 'section_id': c.section_id,
        'customer_name': c.customer_name, 'customer_pan': c.customer_pan,
        'transaction_amount': str(c.transaction_amount), 'tcs_rate': str(c.tcs_rate),
        'tcs_amount': str(c.tcs_amount), 'status': c.status,
        'deposit_date': str(c.deposit_date) if c.deposit_date else None,
        'challan_number': c.challan_number,
    }


# ── TDS Section Master ────────────────────────────────────────

def tds_section_list(request):
    qs = TDSSection.objects.filter(is_active=True)
    salary_only = request.GET.get('salary', '')
    if salary_only:
        qs = qs.filter(is_salary_section=(salary_only == 'true'))
    return JsonResponse({'tds_sections': [section_to_dict(s) for s in qs]})


@csrf_exempt
def tds_section_detail(request, pk):
    try:
        s = TDSSection.objects.get(id=pk)
    except TDSSection.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'tds_section': section_to_dict(s)})
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['rate_individual_huf', 'rate_company', 'annual_threshold', 'single_payment_threshold', 'is_active']:
            if f in data:
                setattr(s, f, data[f])
        s.save()
        return JsonResponse({'message': 'Updated.', 'tds_section': section_to_dict(s)})


# ── Vendor TDS Config ─────────────────────────────────────────

@csrf_exempt
def vendor_tds_config(request, vendor_id):
    try:
        cfg = VendorTDSConfig.objects.get(vendor_id=vendor_id)
        if request.method == 'GET':
            return JsonResponse({'config': {
                'vendor_id': cfg.vendor_id, 'section_id': cfg.section_id,
                'section': cfg.section.section_code if cfg.section else None,
                'deductee_type': cfg.deductee_type, 'tds_exempt': cfg.tds_exempt,
                'lower_deduction_rate': str(cfg.lower_deduction_rate) if cfg.lower_deduction_rate else None,
                'lower_deduction_cert': cfg.lower_deduction_cert,
                'cert_valid_from': str(cfg.cert_valid_from) if cfg.cert_valid_from else None,
                'cert_valid_to': str(cfg.cert_valid_to) if cfg.cert_valid_to else None,
            }})
    except VendorTDSConfig.DoesNotExist:
        if request.method == 'GET':
            return JsonResponse({'config': None})

    if request.method in ('POST', 'PUT'):
        data = json.loads(request.body)
        cfg, _ = VendorTDSConfig.objects.update_or_create(
            vendor_id=vendor_id,
            defaults={
                'section_id': data.get('section_id'),
                'deductee_type': data.get('deductee_type', 'company'),
                'tds_exempt': data.get('tds_exempt', False),
                'lower_deduction_rate': data.get('lower_deduction_rate') or None,
                'lower_deduction_cert': data.get('lower_deduction_cert', ''),
                'cert_valid_from': data.get('cert_valid_from') or None,
                'cert_valid_to': data.get('cert_valid_to') or None,
            }
        )
        return JsonResponse({'message': 'TDS config saved.'})


# ── TDS Deductions ────────────────────────────────────────────

@csrf_exempt
def tds_deduction_list(request):
    company = get_active_company(request)
    qs = TDSDeduction.objects.filter(company=company).select_related('section') if company else TDSDeduction.objects.select_related('section').all()

    status_filter = request.GET.get('status', '')
    section_filter = request.GET.get('section', '')
    from_date = request.GET.get('from_date', '')
    to_date   = request.GET.get('to_date', '')

    if status_filter:
        qs = qs.filter(status=status_filter)
    if section_filter:
        qs = qs.filter(section__section_code=section_filter)
    if from_date:
        qs = qs.filter(deduction_date__gte=from_date)
    if to_date:
        qs = qs.filter(deduction_date__lte=to_date)

    totals = qs.aggregate(total_tds=Sum('total_tds'), total_deposited=Sum('total_tds', filter=Q(status='deposited')))
    return JsonResponse({
        'deductions': [deduction_to_dict(d) for d in qs.order_by('-deduction_date')[:500]],
        'total_tds': str(totals['total_tds'] or 0),
        'total_deposited': str(totals['total_deposited'] or 0),
        'count': qs.count(),
    })


@csrf_exempt
def tds_mark_deposited(request, pk):
    try:
        d = TDSDeduction.objects.get(id=pk)
    except TDSDeduction.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)

    if request.method == 'PUT':
        data = json.loads(request.body)
        d.status = 'deposited'
        d.deposit_date = data.get('deposit_date')
        d.challan_number = data.get('challan_number', '')
        d.bsr_code = data.get('bsr_code', '')
        d.challan_date = data.get('challan_date') or None
        d.save()
        return JsonResponse({'message': 'TDS marked as deposited.', 'deduction': deduction_to_dict(d)})


# ── TDS Return ────────────────────────────────────────────────

def tds_return_list(request):
    company = get_active_company(request)
    qs = TDSReturn.objects.filter(company=company).select_related('fiscal_year') if company else TDSReturn.objects.select_related('fiscal_year').all()
    return JsonResponse({'tds_returns': [
        {'id': r.id, 'form_type': r.form_type, 'quarter': r.quarter,
         'fiscal_year': r.fiscal_year.year_name, 'status': r.status,
         'total_tds_deposited': str(r.total_tds_deposited),
         'filed_date': str(r.filed_date) if r.filed_date else None, 'ack_number': r.ack_number}
        for r in qs
    ]})


# ── TCS Section Master ────────────────────────────────────────

def tcs_section_list(request):
    qs = TCSSection.objects.filter(is_active=True)
    return JsonResponse({'tcs_sections': [
        {'id': s.id, 'section_code': s.section_code, 'goods_description': s.goods_description,
         'rate_percentage': str(s.rate_percentage), 'threshold_amount': str(s.threshold_amount)}
        for s in qs
    ]})


# ── TCS Collections ───────────────────────────────────────────

@csrf_exempt
def tcs_collection_list(request):
    company = get_active_company(request)
    qs = TCSCollection.objects.filter(company=company).select_related('section') if company else TCSCollection.objects.select_related('section').all()

    status_filter = request.GET.get('status', '')
    if status_filter:
        qs = qs.filter(status=status_filter)

    totals = qs.aggregate(total_tcs=Sum('tcs_amount'))
    return JsonResponse({
        'collections': [collection_to_dict(c) for c in qs.order_by('-collection_date')[:500]],
        'total_tcs': str(totals['total_tcs'] or 0),
        'count': qs.count(),
    })


@csrf_exempt
def tcs_mark_deposited(request, pk):
    try:
        c = TCSCollection.objects.get(id=pk)
    except TCSCollection.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)

    if request.method == 'PUT':
        data = json.loads(request.body)
        c.status = 'deposited'
        c.deposit_date = data.get('deposit_date')
        c.challan_number = data.get('challan_number', '')
        c.bsr_code = data.get('bsr_code', '')
        c.save()
        return JsonResponse({'message': 'TCS marked as deposited.', 'collection': collection_to_dict(c)})


# ── TDS/TCS Dashboard Summary ─────────────────────────────────

def tds_tcs_dashboard(request):
    company = get_active_company(request)
    tds_qs = TDSDeduction.objects.filter(company=company) if company else TDSDeduction.objects.all()
    tcs_qs = TCSCollection.objects.filter(company=company) if company else TCSCollection.objects.all()

    return JsonResponse({
        'tds_pending_deposit': str(tds_qs.filter(status='deducted').aggregate(Sum('total_tds'))['total_tds__sum'] or 0),
        'tds_deposited_ytd': str(tds_qs.filter(status='deposited').aggregate(Sum('total_tds'))['total_tds__sum'] or 0),
        'tcs_pending_deposit': str(tcs_qs.filter(status='collected').aggregate(Sum('tcs_amount'))['tcs_amount__sum'] or 0),
        'tcs_deposited_ytd': str(tcs_qs.filter(status='deposited').aggregate(Sum('tcs_amount'))['tcs_amount__sum'] or 0),
        'tds_deductions_count': tds_qs.count(),
        'tcs_collections_count': tcs_qs.count(),
    })
