# ============================================================
# FILE: gst/views.py
# PURPOSE: API endpoints for GST module.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.db.models import Sum, Q
import json

from .models import GSTRate, HSNCode, SACCode, GSTLedger, GSTR1Summary, GSTR3BSummary, EInvoice, EWayBill, GSTChallan
from master_data.company_utils import get_active_company


# ── Helpers ──────────────────────────────────────────────────

def rate_to_dict(r):
    return {'id': r.id, 'rate_name': r.rate_name, 'total_rate': str(r.total_rate),
            'cgst_rate': str(r.cgst_rate), 'sgst_rate': str(r.sgst_rate),
            'igst_rate': str(r.igst_rate), 'cess_rate': str(r.cess_rate), 'is_active': r.is_active}

def hsn_to_dict(h):
    return {'id': h.id, 'hsn_code': h.hsn_code, 'description': h.description,
            'gst_rate_id': h.gst_rate_id, 'gst_rate': h.gst_rate.rate_name if h.gst_rate else None,
            'is_active': h.is_active}

def sac_to_dict(s):
    return {'id': s.id, 'sac_code': s.sac_code, 'description': s.description,
            'gst_rate_id': s.gst_rate_id, 'gst_rate': s.gst_rate.rate_name if s.gst_rate else None,
            'is_active': s.is_active}

def ledger_to_dict(l):
    return {
        'id': l.id, 'transaction_type': l.transaction_type, 'transaction_date': str(l.transaction_date),
        'document_number': l.document_number, 'party_gstin': l.party_gstin, 'party_name': l.party_name,
        'supply_type': l.supply_type, 'hsn_code': l.hsn_code,
        'taxable_amount': str(l.taxable_amount), 'cgst_amount': str(l.cgst_amount),
        'sgst_amount': str(l.sgst_amount), 'igst_amount': str(l.igst_amount),
        'cess_amount': str(l.cess_amount), 'total_tax_amount': str(l.total_tax_amount),
        'total_amount': str(l.total_amount), 'is_reverse_charge': l.is_reverse_charge,
    }


# ── GST Rate Master ───────────────────────────────────────────

@csrf_exempt
def gst_rate_list(request):
    if request.method == 'GET':
        rates = GSTRate.objects.filter(is_active=True)
        return JsonResponse({'gst_rates': [rate_to_dict(r) for r in rates]})

    if request.method == 'POST':
        data = json.loads(request.body)
        r = GSTRate.objects.create(
            rate_name=data['rate_name'], total_rate=data['total_rate'],
            cgst_rate=data['cgst_rate'], sgst_rate=data['sgst_rate'],
            igst_rate=data['igst_rate'], cess_rate=data.get('cess_rate', 0),
        )
        return JsonResponse({'message': 'GST rate created.', 'gst_rate': rate_to_dict(r)}, status=201)


@csrf_exempt
def gst_rate_detail(request, pk):
    try:
        r = GSTRate.objects.get(id=pk)
    except GSTRate.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'gst_rate': rate_to_dict(r)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['rate_name', 'total_rate', 'cgst_rate', 'sgst_rate', 'igst_rate', 'cess_rate', 'is_active']:
            if f in data:
                setattr(r, f, data[f])
        r.save()
        return JsonResponse({'message': 'Updated.', 'gst_rate': rate_to_dict(r)})

    if request.method == 'DELETE':
        r.is_active = False
        r.save()
        return JsonResponse({'message': 'Deactivated.'})


# ── HSN Code ──────────────────────────────────────────────────

@csrf_exempt
def hsn_list(request):
    if request.method == 'GET':
        q = request.GET.get('q', '')
        qs = HSNCode.objects.filter(is_active=True)
        if q:
            qs = qs.filter(Q(hsn_code__icontains=q) | Q(description__icontains=q))
        return JsonResponse({'hsn_codes': [hsn_to_dict(h) for h in qs[:100]]})

    if request.method == 'POST':
        data = json.loads(request.body)
        h = HSNCode.objects.create(
            hsn_code=data['hsn_code'], description=data['description'],
            gst_rate_id=data.get('gst_rate_id'),
        )
        return JsonResponse({'message': 'HSN code created.', 'hsn_code': hsn_to_dict(h)}, status=201)


@csrf_exempt
def hsn_detail(request, pk):
    try:
        h = HSNCode.objects.get(id=pk)
    except HSNCode.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'hsn_code': hsn_to_dict(h)})
    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['hsn_code', 'description', 'gst_rate_id', 'is_active']:
            if f in data:
                setattr(h, f, data[f])
        h.save()
        return JsonResponse({'message': 'Updated.', 'hsn_code': hsn_to_dict(h)})


# ── SAC Code ──────────────────────────────────────────────────

@csrf_exempt
def sac_list(request):
    if request.method == 'GET':
        q = request.GET.get('q', '')
        qs = SACCode.objects.filter(is_active=True)
        if q:
            qs = qs.filter(Q(sac_code__icontains=q) | Q(description__icontains=q))
        return JsonResponse({'sac_codes': [sac_to_dict(s) for s in qs[:100]]})

    if request.method == 'POST':
        data = json.loads(request.body)
        s = SACCode.objects.create(
            sac_code=data['sac_code'], description=data['description'],
            gst_rate_id=data.get('gst_rate_id'),
        )
        return JsonResponse({'message': 'SAC code created.', 'sac_code': sac_to_dict(s)}, status=201)


# ── GST Ledger ────────────────────────────────────────────────

def gst_ledger_list(request):
    company = get_active_company(request)
    qs = GSTLedger.objects.filter(company=company) if company else GSTLedger.objects.all()

    tx_type = request.GET.get('type', '')
    period_id = request.GET.get('period', '')
    from_date = request.GET.get('from_date', '')
    to_date   = request.GET.get('to_date', '')

    if tx_type:
        qs = qs.filter(transaction_type=tx_type)
    if period_id:
        qs = qs.filter(accounting_period_id=period_id)
    if from_date:
        qs = qs.filter(transaction_date__gte=from_date)
    if to_date:
        qs = qs.filter(transaction_date__lte=to_date)

    totals = qs.aggregate(
        total_taxable=Sum('taxable_amount'), total_cgst=Sum('cgst_amount'),
        total_sgst=Sum('sgst_amount'), total_igst=Sum('igst_amount'),
        total_cess=Sum('cess_amount'), total_tax=Sum('total_tax_amount'),
        total_amount=Sum('total_amount'),
    )
    return JsonResponse({
        'entries': [ledger_to_dict(l) for l in qs.order_by('-transaction_date')[:500]],
        'totals': {k: str(v or 0) for k, v in totals.items()},
        'count': qs.count(),
    })


# ── GSTR-1 Summary ────────────────────────────────────────────

def gstr1_list(request):
    company = get_active_company(request)
    qs = GSTR1Summary.objects.filter(company=company) if company else GSTR1Summary.objects.all()
    return JsonResponse({'gstr1_list': [
        {'id': g.id, 'period': g.accounting_period.period_name, 'status': g.status,
         'total_taxable_value': str(g.total_taxable_value), 'total_invoice_value': str(g.total_invoice_value),
         'filed_date': str(g.filed_date) if g.filed_date else None, 'arn_number': g.arn_number}
        for g in qs.select_related('accounting_period')
    ]})


@csrf_exempt
def gstr1_generate(request, period_id):
    """Aggregate GST ledger sales entries for a period into GSTR-1 summary."""
    company = get_active_company(request)
    from finance.models import AccountingPeriod, FiscalYear
    try:
        period = AccountingPeriod.objects.get(id=period_id)
    except AccountingPeriod.DoesNotExist:
        return JsonResponse({'message': 'Period not found.'}, status=404)

    entries = GSTLedger.objects.filter(
        company=company, accounting_period=period,
        transaction_type__in=['sale', 'credit_note'],
    )
    agg = entries.aggregate(
        taxable=Sum('taxable_amount'), igst=Sum('igst_amount'),
        cgst=Sum('cgst_amount'), sgst=Sum('sgst_amount'),
        cess=Sum('cess_amount'), total=Sum('total_amount'),
    )

    summary, _ = GSTR1Summary.objects.update_or_create(
        company=company, fiscal_year=period.fiscal_year, accounting_period=period,
        defaults={
            'total_taxable_value': agg['taxable'] or 0,
            'total_igst': agg['igst'] or 0, 'total_cgst': agg['cgst'] or 0,
            'total_sgst': agg['sgst'] or 0, 'total_cess': agg['cess'] or 0,
            'total_invoice_value': agg['total'] or 0, 'status': 'draft',
        }
    )
    return JsonResponse({'message': 'GSTR-1 summary generated.', 'gstr1_id': summary.id})


# ── GSTR-3B ───────────────────────────────────────────────────

def gstr3b_list(request):
    company = get_active_company(request)
    qs = GSTR3BSummary.objects.filter(company=company) if company else GSTR3BSummary.objects.all()
    return JsonResponse({'gstr3b_list': [
        {'id': g.id, 'period': g.accounting_period.period_name, 'status': g.status,
         'tax_payable_igst': str(g.tax_payable_igst), 'tax_payable_cgst': str(g.tax_payable_cgst),
         'tax_payable_sgst': str(g.tax_payable_sgst), 'filed_date': str(g.filed_date) if g.filed_date else None}
        for g in qs.select_related('accounting_period')
    ]})


# ── e-Invoice (stub) ──────────────────────────────────────────

def einvoice_detail(request, invoice_id):
    """Returns e-Invoice stub status for a sales invoice."""
    try:
        ei = EInvoice.objects.get(sales_invoice_id=invoice_id)
    except EInvoice.DoesNotExist:
        return JsonResponse({'e_invoice': None, 'integration_enabled': False})
    return JsonResponse({'e_invoice': {
        'id': ei.id, 'irn': ei.irn, 'ack_number': ei.ack_number,
        'status': ei.status, 'integration_enabled': ei.integration_enabled,
        'qr_code': ei.qr_code, 'error_message': ei.error_message,
    }})


@csrf_exempt
def einvoice_generate(request, invoice_id):
    """
    Stub endpoint for e-Invoice IRN generation.
    When integration_enabled=True, will call configured GSP API.
    Until then, returns a stub response.
    """
    company = get_active_company(request)
    from dispatch.models import SalesInvoice
    try:
        invoice = SalesInvoice.objects.get(id=invoice_id)
    except SalesInvoice.DoesNotExist:
        return JsonResponse({'message': 'Invoice not found.'}, status=404)

    ei, _ = EInvoice.objects.get_or_create(
        company=company, sales_invoice=invoice,
        defaults={'status': 'pending', 'integration_enabled': False}
    )

    if not ei.integration_enabled:
        return JsonResponse({
            'message': 'e-Invoice integration is not enabled. Configure GSP API credentials in Company Settings to activate.',
            'status': 'pending', 'integration_enabled': False,
        })

    # Placeholder — actual GSP API call will be implemented here
    return JsonResponse({'message': 'GSP API call would happen here.', 'irn': '', 'status': 'pending'})


# ── e-Way Bill (stub) ─────────────────────────────────────────

def ewaybill_detail(request, dispatch_id):
    try:
        ewb = EWayBill.objects.get(dispatch_id=dispatch_id)
    except EWayBill.DoesNotExist:
        return JsonResponse({'e_way_bill': None, 'integration_enabled': False})
    return JsonResponse({'e_way_bill': {
        'id': ewb.id, 'ewb_number': ewb.ewb_number, 'status': ewb.status,
        'valid_upto': str(ewb.valid_upto) if ewb.valid_upto else None,
        'integration_enabled': ewb.integration_enabled,
    }})


@csrf_exempt
def ewaybill_generate(request, dispatch_id):
    """Stub for e-Way Bill generation via NIC API."""
    company = get_active_company(request)
    from dispatch.models import DispatchEntry
    try:
        dispatch = DispatchEntry.objects.get(id=dispatch_id)
    except DispatchEntry.DoesNotExist:
        return JsonResponse({'message': 'Dispatch not found.'}, status=404)

    ewb, _ = EWayBill.objects.get_or_create(
        company=company, dispatch=dispatch,
        defaults={'status': 'pending', 'integration_enabled': False}
    )

    if not ewb.integration_enabled:
        return JsonResponse({
            'message': 'e-Way Bill integration not enabled. Configure NIC API credentials to activate.',
            'status': 'pending', 'integration_enabled': False,
        })

    return JsonResponse({'message': 'NIC API call would happen here.', 'ewb_number': '', 'status': 'pending'})
