# ============================================================
# FILE: reports/views.py
# PURPOSE: Production, Lot Stock, Quality, and Reconciliation reports
#          All data from the new Technical Textile modules only
# ============================================================

import datetime
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse
from django.db.models import Sum, Q, Count, Avg

from master_data.company_utils import get_active_company
from production_exec.models import ProcessEntry, YarnIssue, Batch
from purchase.models import Lot, PurchaseInvoice, GRN
from dispatch.models import DispatchEntry, SalesInvoice
from quality.models import Inspection
from planning.models import ProductionOrder


def parse_dates(request):
    today     = datetime.date.today()
    from_date = request.GET.get('from_date') or today.replace(day=1).isoformat()
    to_date   = request.GET.get('to_date')   or today.isoformat()
    return from_date, to_date


# ── Production Report ─────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET'])
def production_report(request):
    company = get_active_company(request)
    from_date, to_date = parse_dates(request)

    qs = ProcessEntry.objects.filter(
        company=company, status='confirmed',
        entry_date__gte=from_date, entry_date__lte=to_date,
    ).select_related('production_order__product', 'process_stage', 'machine')

    entries = []
    total_output = total_rejection = 0

    for e in qs:
        total_output    += float(e.output_quantity)
        total_rejection += float(e.rejection_qty)
        batch = e.batches.first()
        entries.append({
            'process_entry_number': e.entry_number,
            'entry_date':      str(e.entry_date),
            'prod_order_number': e.production_order.po_number if e.production_order else '',
            'product_name':    (e.production_order.product.design_name
                                if e.production_order and e.production_order.product else ''),
            'process_name':    e.process_stage.process_name if e.process_stage else '',
            'machine_code':    e.machine.machine_code if e.machine else '',
            'operator':        e.operator_name,
            'shift':           e.shift,
            'output_qty':      str(e.output_quantity),
            'rejection_qty':   str(e.rejection_qty),
            'batch_number':    batch.batch_number if batch else '',
        })

    total         = total_output + total_rejection
    rejection_pct = round(total_rejection / total * 100, 1) if total > 0 else 0

    return JsonResponse({
        'entries': entries,
        'summary': {
            'total_entries':   len(entries),
            'total_output':    round(total_output, 3),
            'total_rejection': round(total_rejection, 3),
            'rejection_pct':   rejection_pct,
        }
    })


# ── Lot Stock Report ──────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET'])
def lot_stock_report(request):
    company = get_active_company(request)
    qs      = Lot.objects.filter(company=company)
    status  = request.GET.get('status')
    search  = request.GET.get('search', '').strip()

    if status:
        qs = qs.filter(status=status)
    if search:
        qs = qs.filter(
            Q(lot_number__icontains=search) |
            Q(material_name__icontains=search) |
            Q(color_code__icontains=search)
        )

    lots = []
    total_received = total_balance = 0
    for l in qs.select_related('grn__purchase_order__vendor', 'location'):
        total_received += float(l.quantity)
        total_balance  += float(l.balance_qty)
        lots.append({
            'lot_number':    l.lot_number,
            'material_name': l.material_name,
            'color_code':    l.color_code or '',
            'color_name':    l.color_name or '',
            'vendor_name':   (l.grn.purchase_order.vendor.vendor_name
                              if l.grn and l.grn.purchase_order and l.grn.purchase_order.vendor else ''),
            'grn_number':    l.grn.grn_number if l.grn else '',
            'received_qty':  str(l.quantity),
            'balance_qty':   str(l.balance_qty),
            'uom':           l.uom.short_name if l.uom else '',
            'location_name': l.location.name if l.location else '',
            'status':        l.status,
        })

    return JsonResponse({
        'lots': lots,
        'summary': {
            'total_lots':     len(lots),
            'available_lots': sum(1 for l in lots if l['status'] == 'available'),
            'total_received': round(total_received, 3),
            'total_balance':  round(total_balance, 3),
        }
    })


# ── Quality Report ────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET'])
def quality_report(request):
    company = get_active_company(request)
    from_date, to_date = parse_dates(request)

    qs = Inspection.objects.filter(
        company=company,
        inspection_date__gte=from_date,
        inspection_date__lte=to_date,
    ).select_related('batch__production_order__product')

    inspections = []
    passed = failed = rework = 0
    for insp in qs:
        if insp.result == 'pass':     passed += 1
        elif insp.result == 'fail':   failed += 1
        elif insp.result == 'rework': rework += 1
        inspections.append({
            'inspection_date': str(insp.inspection_date),
            'batch_number':    insp.batch.batch_number if insp.batch else '',
            'product_name':    (insp.batch.production_order.product.design_name
                                if insp.batch and insp.batch.production_order
                                and insp.batch.production_order.product else ''),
            'inspector':       insp.inspected_by,
            'result':          insp.result,
            'defect_name':     insp.defect_category or '',
            'defect_count':    '',
            'remarks':         insp.remarks,
        })

    total     = len(inspections)
    pass_rate = round(passed / total * 100, 1) if total > 0 else 0

    return JsonResponse({
        'inspections': inspections,
        'summary': {
            'total_inspected': total,
            'passed': passed, 'failed': failed, 'rework': rework,
            'pass_rate': pass_rate,
        }
    })


# ── Reconciliation Report ─────────────────────────────────────
# Production Order × Yarn Issued × Output × Rejection × Variance

@csrf_exempt
@require_http_methods(['GET'])
def reconciliation_report(request):
    company = get_active_company(request)
    from_date, to_date = parse_dates(request)

    from planning.models import ProductionOrder
    orders = ProductionOrder.objects.filter(
        company=company,
        created_at__date__gte=from_date,
        created_at__date__lte=to_date,
    ).select_related('product')

    rows = []
    for po in orders:
        issued   = YarnIssue.objects.filter(
            company=company, production_order=po, status='confirmed'
        ).aggregate(t=Sum('issued_qty'))['t'] or 0

        output   = ProcessEntry.objects.filter(
            company=company, production_order=po, status='confirmed'
        ).aggregate(t=Sum('output_quantity'))['t'] or 0

        reject   = ProcessEntry.objects.filter(
            company=company, production_order=po, status='confirmed'
        ).aggregate(t=Sum('rejection_qty'))['t'] or 0

        variance = float(issued) - float(output) - float(reject)

        rows.append({
            'prod_order_number': po.po_number,
            'product_name':      po.product.design_name if po.product else '',
            'planned_qty':       str(po.planned_quantity),
            'produced_qty':      str(po.produced_qty),
            'issued_qty':        str(issued),
            'output_qty':        str(output),
            'rejection_qty':     str(reject),
            'variance':          round(variance, 3),
            'status':            po.status,
        })

    return JsonResponse({'rows': rows, 'from_date': from_date, 'to_date': to_date})


# ── Tally Export ──────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['GET'])
def tally_export(request):
    company      = get_active_company(request)
    export_type  = request.GET.get('type', 'purchase')
    from_date, to_date = parse_dates(request)
    fmt          = request.GET.get('format', 'json')

    if export_type == 'purchase':
        qs = PurchaseInvoice.objects.filter(
            company=company,
            invoice_date__gte=from_date,
            invoice_date__lte=to_date,
        ).select_related('vendor')
        vouchers = [{
            'voucher_type': 'Purchase',
            'date':         str(inv.invoice_date),
            'reference':    inv.invoice_number,
            'party_name':   inv.vendor.vendor_name if inv.vendor else '',
            'amount':       str(inv.total_amount),
            'narration':    inv.notes or '',
        } for inv in qs]
    else:
        qs = SalesInvoice.objects.filter(
            company=company,
            invoice_date__gte=from_date,
            invoice_date__lte=to_date,
        ).select_related('customer')
        vouchers = [{
            'voucher_type': 'Sales',
            'date':         str(inv.invoice_date),
            'reference':    inv.invoice_number,
            'party_name':   inv.customer.customer_name if inv.customer else '',
            'amount':       str(inv.total_amount),
            'narration':    inv.notes or '',
        } for inv in qs]

    if fmt == 'xml':
        lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<ENVELOPE><BODY><IMPORTDATA>',
                 '<REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA>']
        for v in vouchers:
            lines += [
                '<TALLYMESSAGE xmlns:UDF="TallyUDF">',
                f'<VOUCHER VCHTYPE="{v["voucher_type"]}" ACTION="Create">',
                f'<DATE>{v["date"].replace("-","")}</DATE>',
                f'<VOUCHERNUMBER>{v["reference"]}</VOUCHERNUMBER>',
                f'<PARTYLEDGERNAME>{v["party_name"]}</PARTYLEDGERNAME>',
                f'<AMOUNT>{v["amount"]}</AMOUNT>',
                f'<NARRATION>{v["narration"]}</NARRATION>',
                '</VOUCHER></TALLYMESSAGE>',
            ]
        lines += ['</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>']
        return HttpResponse('\n'.join(lines), content_type='application/xml',
            headers={'Content-Disposition': f'attachment; filename="tally_{export_type}_{from_date}.xml"'})

    return JsonResponse({'vouchers': vouchers, 'count': len(vouchers),
                         'export_type': export_type, 'from_date': from_date, 'to_date': to_date})


# ══════════════════════════════════════════════════════════════
# ANALYTICS VIEWS
# ══════════════════════════════════════════════════════════════

def _month_key(dt):
    return dt.strftime('%b %y') if dt else '?'


# ── 1. Production Efficiency ──────────────────────────────────
@csrf_exempt
@require_http_methods(['GET'])
def analytics_production_efficiency(request):
    company = get_active_company(request)
    from_date, to_date = parse_dates(request)

    orders = ProductionOrder.objects.filter(
        company=company,
        created_at__date__gte=from_date,
        created_at__date__lte=to_date,
    ).select_related('product')

    rows = []
    total_planned = total_output = total_rejection = 0

    for po in orders:
        planned = float(po.planned_qty or 0)
        output  = float(ProcessEntry.objects.filter(
            company=company, production_order=po, status='confirmed'
        ).aggregate(t=Sum('output_quantity'))['t'] or 0)
        reject  = float(ProcessEntry.objects.filter(
            company=company, production_order=po, status='confirmed'
        ).aggregate(t=Sum('rejection_qty'))['t'] or 0)

        efficiency = round(output / planned * 100, 1) if planned > 0 else 0
        rej_pct    = round(reject / (output + reject) * 100, 1) if (output + reject) > 0 else 0

        total_planned   += planned
        total_output    += output
        total_rejection += reject

        rows.append({
            'po_number':    po.po_number,
            'product':      po.product.design_name if po.product else '',
            'status':       po.status,
            'planned_qty':  planned,
            'output_qty':   output,
            'rejection_qty': reject,
            'efficiency_pct': efficiency,
            'rejection_pct':  rej_pct,
        })

    # Monthly chart data
    monthly = {}
    for pe in ProcessEntry.objects.filter(
        company=company, status='confirmed',
        entry_date__gte=from_date, entry_date__lte=to_date,
    ):
        key = _month_key(pe.entry_date)
        if key not in monthly:
            monthly[key] = {'month': key, 'output': 0, 'rejection': 0}
        monthly[key]['output']    += float(pe.output_quantity)
        monthly[key]['rejection'] += float(pe.rejection_qty)

    overall_eff = round(total_output / total_planned * 100, 1) if total_planned > 0 else 0

    return JsonResponse({
        'rows': rows,
        'monthly': list(monthly.values()),
        'summary': {
            'total_planned': round(total_planned, 2),
            'total_output':  round(total_output, 2),
            'total_rejection': round(total_rejection, 2),
            'overall_efficiency_pct': overall_eff,
        }
    })


# ── 2. Lot Utilization ────────────────────────────────────────
@csrf_exempt
@require_http_methods(['GET'])
def analytics_lot_utilization(request):
    company = get_active_company(request)

    lots = Lot.objects.filter(company=company).select_related('grn__purchase_order__vendor')
    rows = []
    by_material = {}

    for l in lots:
        received = float(l.quantity)
        balance  = float(l.balance_qty)
        consumed = received - balance
        util_pct = round(consumed / received * 100, 1) if received > 0 else 0
        vendor   = (l.grn.purchase_order.vendor.vendor_name
                    if l.grn and l.grn.purchase_order and l.grn.purchase_order.vendor else '')

        rows.append({
            'lot_number':    l.lot_number,
            'material_name': l.material_name,
            'vendor':        vendor,
            'status':        l.status,
            'received_qty':  received,
            'consumed_qty':  round(consumed, 3),
            'balance_qty':   round(balance, 3),
            'utilization_pct': util_pct,
        })

        mat = l.material_name or 'Unknown'
        if mat not in by_material:
            by_material[mat] = {'material': mat, 'received': 0, 'consumed': 0, 'lots': 0}
        by_material[mat]['received'] += received
        by_material[mat]['consumed'] += consumed
        by_material[mat]['lots']     += 1

    chart = [{'material': k, 'received': round(v['received'], 2),
               'consumed': round(v['consumed'], 2),
               'utilization_pct': round(v['consumed'] / v['received'] * 100, 1) if v['received'] > 0 else 0,
               'lots': v['lots']} for k, v in by_material.items()]

    total_received = sum(r['received_qty'] for r in rows)
    total_consumed = sum(r['consumed_qty'] for r in rows)

    return JsonResponse({
        'rows': rows,
        'by_material': chart,
        'summary': {
            'total_lots':     len(rows),
            'total_received': round(total_received, 2),
            'total_consumed': round(total_consumed, 2),
            'avg_utilization_pct': round(total_consumed / total_received * 100, 1) if total_received > 0 else 0,
        }
    })


# ── 3. Quality Trends ─────────────────────────────────────────
@csrf_exempt
@require_http_methods(['GET'])
def analytics_quality_trends(request):
    company = get_active_company(request)
    from_date, to_date = parse_dates(request)

    inspections = Inspection.objects.filter(
        company=company,
        inspection_date__gte=from_date,
        inspection_date__lte=to_date,
    ).select_related('batch__production_order__product', 'batch__production_order__process_entries')

    monthly = {}
    by_product = {}
    rows = []
    total_pass = total_fail = total_rework = 0

    for insp in inspections:
        product = (insp.batch.production_order.product.design_name
                   if insp.batch and insp.batch.production_order and insp.batch.production_order.product else 'Unknown')
        month   = _month_key(insp.inspection_date)
        result  = insp.result

        if result == 'pass':    total_pass += 1
        elif result == 'fail':  total_fail += 1
        elif result == 'rework': total_rework += 1

        # Monthly
        if month not in monthly:
            monthly[month] = {'month': month, 'pass': 0, 'fail': 0, 'rework': 0, 'total': 0}
        monthly[month][result if result in ('pass','fail','rework') else 'pass'] += 1
        monthly[month]['total'] += 1

        # By product
        if product not in by_product:
            by_product[product] = {'product': product, 'pass': 0, 'fail': 0, 'rework': 0, 'total': 0}
        by_product[product][result if result in ('pass','fail','rework') else 'pass'] += 1
        by_product[product]['total'] += 1

        rows.append({
            'date':       str(insp.inspection_date),
            'batch':      insp.batch.batch_number if insp.batch else '',
            'product':    product,
            'inspector':  insp.inspected_by,
            'result':     result,
            'defect':     insp.defect_category or '',
        })

    total = total_pass + total_fail + total_rework
    for m in monthly.values():
        m['pass_rate'] = round(m['pass'] / m['total'] * 100, 1) if m['total'] > 0 else 0
    for p in by_product.values():
        p['pass_rate'] = round(p['pass'] / p['total'] * 100, 1) if p['total'] > 0 else 0

    return JsonResponse({
        'rows': rows,
        'monthly': list(monthly.values()),
        'by_product': list(by_product.values()),
        'summary': {
            'total_inspected': total,
            'total_pass':   total_pass,
            'total_fail':   total_fail,
            'total_rework': total_rework,
            'overall_pass_rate': round(total_pass / total * 100, 1) if total > 0 else 0,
        }
    })


# ── 4. Vendor Performance ─────────────────────────────────────
@csrf_exempt
@require_http_methods(['GET'])
def analytics_vendor_performance(request):
    company = get_active_company(request)
    from_date, to_date = parse_dates(request)

    grns = GRN.objects.filter(
        company=company,
        receipt_date__gte=from_date,
        receipt_date__lte=to_date,
    ).select_related('purchase_order__vendor')

    by_vendor = {}
    for grn in grns:
        vendor = grn.purchase_order.vendor.vendor_name if grn.purchase_order and grn.purchase_order.vendor else 'Unknown'
        vendor_id = grn.purchase_order.vendor_id if grn.purchase_order else None

        lots = Lot.objects.filter(company=company, grn=grn)
        total_recv  = float(lots.aggregate(t=Sum('quantity'))['t'] or 0)
        total_bal   = float(lots.aggregate(t=Sum('balance_qty'))['t'] or 0)
        rejected    = lots.filter(status='rejected').count()
        lot_count   = lots.count()

        if vendor not in by_vendor:
            by_vendor[vendor] = {'vendor': vendor, 'grn_count': 0, 'lot_count': 0,
                                  'received_qty': 0, 'consumed_qty': 0, 'rejected_lots': 0}
        by_vendor[vendor]['grn_count']     += 1
        by_vendor[vendor]['lot_count']     += lot_count
        by_vendor[vendor]['received_qty']  += total_recv
        by_vendor[vendor]['consumed_qty']  += (total_recv - total_bal)
        by_vendor[vendor]['rejected_lots'] += rejected

    rows = []
    for v in by_vendor.values():
        recv = v['received_qty']
        v['consumed_qty']    = round(v['consumed_qty'], 2)
        v['received_qty']    = round(recv, 2)
        v['utilization_pct'] = round(v['consumed_qty'] / recv * 100, 1) if recv > 0 else 0
        v['rejection_rate']  = round(v['rejected_lots'] / v['lot_count'] * 100, 1) if v['lot_count'] > 0 else 0
        rows.append(v)

    return JsonResponse({'rows': rows, 'from_date': from_date, 'to_date': to_date})


# ── 5. Dispatch Analysis ──────────────────────────────────────
@csrf_exempt
@require_http_methods(['GET'])
def analytics_dispatch(request):
    company = get_active_company(request)
    from_date, to_date = parse_dates(request)

    dispatches = DispatchEntry.objects.filter(
        company=company,
        dispatch_date__gte=from_date,
        dispatch_date__lte=to_date,
    ).select_related('customer')

    by_customer = {}
    monthly     = {}
    rows        = []

    for de in dispatches:
        customer = de.customer.customer_name if de.customer else 'Unknown'
        month    = _month_key(de.dispatch_date)
        qty      = float(de.dispatch_qty or 0)

        # by customer
        if customer not in by_customer:
            by_customer[customer] = {'customer': customer, 'dispatches': 0, 'total_qty': 0}
        by_customer[customer]['dispatches'] += 1
        by_customer[customer]['total_qty']  += qty

        # monthly
        if month not in monthly:
            monthly[month] = {'month': month, 'qty': 0, 'dispatches': 0}
        monthly[month]['qty']       += qty
        monthly[month]['dispatches'] += 1

        rows.append({
            'date':            str(de.dispatch_date),
            'dispatch_number': de.dispatch_number,
            'customer':        customer,
            'qty':             qty,
            'vehicle':         de.vehicle_number or '',
        })

    for c in by_customer.values():
        c['total_qty'] = round(c['total_qty'], 2)
    for m in monthly.values():
        m['qty'] = round(m['qty'], 2)

    return JsonResponse({
        'rows': rows,
        'by_customer': list(by_customer.values()),
        'monthly':     list(monthly.values()),
        'summary': {
            'total_dispatches': len(rows),
            'total_qty':        round(sum(r['qty'] for r in rows), 2),
            'unique_customers': len(by_customer),
        }
    })


# ══════════════════════════════════════════════════════════════
# FEED — Alerts + Daily Summary
# ══════════════════════════════════════════════════════════════
@csrf_exempt
@require_http_methods(['GET'])
def feed(request):
    company = get_active_company(request)
    today   = datetime.date.today()

    # ── Alerts ────────────────────────────────────────────────
    alerts = []

    # Low stock lots (balance < 20% of received)
    for lot in Lot.objects.filter(company=company, status='available'):
        if lot.quantity > 0 and lot.balance_qty / lot.quantity < 0.2:
            alerts.append({
                'type':     'warning',
                'category': 'Low Stock',
                'message':  f"LOT {lot.lot_number} ({lot.material_name}) — only {round(float(lot.balance_qty), 2)} {lot.uom.short_name if lot.uom else 'units'} remaining ({round(float(lot.balance_qty)/float(lot.quantity)*100,1)}%)",
                'link':     '/lot-inventory/dashboard',
            })

    # QC pending batches
    qc_pending = Batch.objects.filter(company=company, status='qc_pending').count()
    if qc_pending:
        alerts.append({
            'type':     'error',
            'category': 'QC Pending',
            'message':  f"{qc_pending} batch{'es' if qc_pending > 1 else ''} waiting for quality inspection",
            'link':     '/quality/inspections',
        })

    # Overdue production orders (in_production > 7 days)
    overdue_cutoff = today - datetime.timedelta(days=7)
    overdue = ProductionOrder.objects.filter(
        company=company,
        status='in_production',
        created_at__date__lte=overdue_cutoff,
    )
    for po in overdue:
        alerts.append({
            'type':     'warning',
            'category': 'Overdue',
            'message':  f"Production Order {po.po_number} ({po.product.design_name if po.product else ''}) in production for over 7 days",
            'link':     '/planning/production-orders',
        })

    # Draft production orders not released
    draft_po = ProductionOrder.objects.filter(company=company, status='draft').count()
    if draft_po:
        alerts.append({
            'type':     'info',
            'category': 'Pending Release',
            'message':  f"{draft_po} production order{'s' if draft_po > 1 else ''} still in Draft — not yet released to floor",
            'link':     '/planning/production-orders',
        })

    # ── Daily Summary ─────────────────────────────────────────
    produced_today   = float(ProcessEntry.objects.filter(
        company=company, status='confirmed', entry_date=today
    ).aggregate(t=Sum('output_quantity'))['t'] or 0)

    rejected_today   = float(ProcessEntry.objects.filter(
        company=company, status='confirmed', entry_date=today
    ).aggregate(t=Sum('rejection_qty'))['t'] or 0)

    dispatched_today = DispatchEntry.objects.filter(company=company, dispatch_date=today).count()

    inspected_today  = Inspection.objects.filter(company=company, inspection_date=today).count()
    passed_today     = Inspection.objects.filter(company=company, inspection_date=today, result='pass').count()
    failed_today     = Inspection.objects.filter(company=company, inspection_date=today, result='fail').count()

    issued_today     = YarnIssue.objects.filter(
        company=company, status='confirmed', issue_date=today
    ).count()

    # Weekly production trend (last 7 days)
    trend = []
    for i in range(6, -1, -1):
        d = today - datetime.timedelta(days=i)
        out = float(ProcessEntry.objects.filter(
            company=company, status='confirmed', entry_date=d
        ).aggregate(t=Sum('output_quantity'))['t'] or 0)
        trend.append({'date': str(d), 'day': d.strftime('%a'), 'output': round(out, 2)})

    return JsonResponse({
        'alerts': alerts,
        'daily_summary': {
            'date':             str(today),
            'produced_qty':     round(produced_today, 2),
            'rejected_qty':     round(rejected_today, 2),
            'yarn_issues':      issued_today,
            'dispatched_count': dispatched_today,
            'inspected_count':  inspected_today,
            'passed_count':     passed_today,
            'failed_count':     failed_today,
        },
        'weekly_trend': trend,
    })


# ══════════════════════════════════════════════════════════════
# FINISHED GOODS INVENTORY
# ══════════════════════════════════════════════════════════════
@csrf_exempt
@require_http_methods(['GET'])
def finished_goods_inventory(request):
    company = get_active_company(request)
    status_filter = request.GET.get('status', '')
    search        = request.GET.get('search', '').strip()

    qs = Batch.objects.filter(company=company).select_related(
        'production_order__product', 'production_order__sales_order__customer'
    )
    if status_filter:
        qs = qs.filter(status=status_filter)
    if search:
        qs = qs.filter(
            Q(batch_number__icontains=search) |
            Q(production_order__product__design_name__icontains=search)
        )

    batches = []
    by_status = {}
    total_qty = 0

    for b in qs:
        product  = b.production_order.product.design_name if b.production_order and b.production_order.product else ''
        customer = ''
        if b.production_order and b.production_order.sales_order and b.production_order.sales_order.customer:
            customer = b.production_order.sales_order.customer.customer_name
        qty = float(b.quantity)
        total_qty += qty

        by_status[b.status] = by_status.get(b.status, 0) + 1

        batches.append({
            'batch_number': b.batch_number,
            'product':      product,
            'customer':     customer,
            'quantity':     qty,
            'status':       b.status,
            'created_at':   b.created_at.strftime('%Y-%m-%d') if b.created_at else '',
        })

    return JsonResponse({
        'batches':  batches,
        'by_status': by_status,
        'summary': {
            'total_batches':   len(batches),
            'total_qty':       round(total_qty, 2),
            'qc_passed':       by_status.get('qc_passed', 0),
            'qc_pending':      by_status.get('qc_pending', 0),
            'in_process':      by_status.get('in_process', 0),
            'dispatched':      by_status.get('dispatched', 0),
        }
    })
