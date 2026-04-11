# ============================================================
# FILE: analytics/views.py
# PURPOSE: Customer Intelligence analytics API.
#          RFM Segmentation, Churn Prediction, Sales Forecast,
#          Product Intelligence, and Summary KPIs.
#          Uses only Python stdlib + Django ORM — no extra packages.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, Count, Max, Min, Avg, Q
from django.db.models.functions import TruncMonth
from datetime import date, timedelta
from collections import defaultdict
import json
import math

from sales.models import SalesOrder, SalesOrderLine, Invoice
from master_data.models import Customer, Item


# ── Helpers ──────────────────────────────────────────────────

def _safe_float(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _linear_regression(points):
    """
    Simple least-squares linear regression.
    points = [(x, y), ...]  where x is 0-indexed month offset
    Returns (slope, intercept)
    """
    n = len(points)
    if n < 2:
        return 0, points[0][1] if points else 0
    sx  = sum(p[0] for p in points)
    sy  = sum(p[1] for p in points)
    sxy = sum(p[0] * p[1] for p in points)
    sxx = sum(p[0] ** 2 for p in points)
    denom = n * sxx - sx * sx
    if denom == 0:
        return 0, sy / n
    slope     = (n * sxy - sx * sy) / denom
    intercept = (sy - slope * sx) / n
    return slope, intercept


def _score_quintile(value, sorted_values):
    """Return 1-5 score based on where value falls in sorted_values list."""
    n = len(sorted_values)
    if n == 0:
        return 3
    rank = sorted_values.index(value) if value in sorted_values else 0
    pct = rank / max(n - 1, 1)
    return max(1, min(5, math.ceil(pct * 5) or 1))


def _rfm_segment(r_score, f_score, m_score):
    """Map RFM scores to a human-readable segment label + color."""
    # Champions — recent, frequent, high spend
    if r_score >= 4 and f_score >= 4 and m_score >= 4:
        return 'Champion', '#1b5e20'

    # Loyal
    if r_score >= 3 and f_score >= 3:
        return 'Loyal', '#2e7d32'

    # Promising — recent but not yet frequent
    if r_score >= 4 and f_score <= 2:
        return 'Promising', '#1565c0'

    # New Customers — very recent, only 1 order
    if r_score == 5 and f_score == 1:
        return 'New Customer', '#0277bd'

    # Need Attention — above average but fading
    if r_score == 3 and f_score >= 2:
        return 'Need Attention', '#e65100'

    # At Risk — used to be active, now quiet
    if r_score <= 2 and f_score >= 3:
        return 'At Risk', '#b71c1c'

    # About to Churn
    if r_score == 2 and f_score <= 2:
        return 'About to Churn', '#c62828'

    # Lost — haven't bought in a long time
    if r_score == 1:
        return 'Lost', '#4a148c'

    return 'Occasional', '#546e7a'


# ── 1. SUMMARY KPIs ──────────────────────────────────────────

@csrf_exempt
def summary(request):
    """Top-level KPIs for the Customer Intelligence page header."""
    today = date.today()
    year_start = date(today.year, 4, 1) if today.month >= 4 else date(today.year - 1, 4, 1)
    prev_start = date(year_start.year - 1, 4, 1)
    quarter_month = ((today.month - 1) // 3) * 3 + 1
    quarter_start = date(today.year, quarter_month, 1)

    active_statuses = ['confirmed', 'partial', 'delivered']
    all_orders = SalesOrder.objects.filter(status__in=active_statuses)

    fy_orders    = all_orders.filter(order_date__gte=year_start)
    prev_orders  = all_orders.filter(order_date__gte=prev_start, order_date__lt=year_start)

    fy_revenue   = _safe_float(fy_orders.aggregate(t=Sum('total_amount'))['t'])
    prev_revenue = _safe_float(prev_orders.aggregate(t=Sum('total_amount'))['t'])

    total_customers      = Customer.objects.filter(is_active=True).count()
    active_customer_ids  = set(fy_orders.values_list('customer_id', flat=True))
    new_this_quarter     = (
        SalesOrder.objects
        .filter(order_date__gte=quarter_start, status__in=active_statuses)
        .values('customer_id').distinct().count()
    )

    order_counts   = all_orders.values('customer_id').annotate(cnt=Count('id'))
    repeat_count   = sum(1 for x in order_counts if x['cnt'] > 1)
    total_with_orders = order_counts.count()
    repeat_rate    = round(repeat_count / total_with_orders * 100, 1) if total_with_orders else 0

    total_all_revenue = _safe_float(all_orders.aggregate(t=Sum('total_amount'))['t'])
    total_order_count = all_orders.count()
    aov = round(total_all_revenue / total_order_count, 2) if total_order_count else 0

    growth = 0
    if prev_revenue > 0:
        growth = round((fy_revenue - prev_revenue) / prev_revenue * 100, 1)

    return JsonResponse({
        'total_customers':      total_customers,
        'active_this_fy':       len(active_customer_ids),
        'new_this_quarter':     new_this_quarter,
        'fy_revenue':           round(fy_revenue, 2),
        'prev_fy_revenue':      round(prev_revenue, 2),
        'yoy_growth_pct':       growth,
        'repeat_customer_rate': repeat_rate,
        'average_order_value':  aov,
        'total_orders':         total_order_count,
    })


# ── 2. RFM SEGMENTATION ───────────────────────────────────────

@csrf_exempt
def rfm(request):
    """Compute RFM for every customer with at least one order."""
    today = date.today()
    active_statuses = ['confirmed', 'partial', 'delivered']

    orders = SalesOrder.objects.filter(status__in=active_statuses).select_related('customer')

    cust_data = {}
    for so in orders:
        cid = so.customer_id
        if cid not in cust_data:
            cust_data[cid] = {
                'customer_id':   cid,
                'customer_name': so.customer.customer_name,
                'customer_code': so.customer.customer_code,
                'city':          so.customer.city,
                'last_order':    so.order_date,
                'order_count':   0,
                'total_spend':   0.0,
                'order_dates':   [],
            }
        d = cust_data[cid]
        if so.order_date > d['last_order']:
            d['last_order'] = so.order_date
        d['order_count'] += 1
        d['total_spend']  += _safe_float(so.total_amount)
        d['order_dates'].append(so.order_date)

    if not cust_data:
        return JsonResponse({'customers': [], 'segments': {}})

    rows = list(cust_data.values())
    for r in rows:
        r['recency_days'] = (today - r['last_order']).days

    recency_sorted_inv = list(reversed(sorted(r['recency_days'] for r in rows)))
    frequency_sorted   = sorted(r['order_count']  for r in rows)
    monetary_sorted    = sorted(r['total_spend']   for r in rows)

    for r in rows:
        r_score = _score_quintile(r['recency_days'], recency_sorted_inv)
        f_score = _score_quintile(r['order_count'],  frequency_sorted)
        m_score = _score_quintile(r['total_spend'],  monetary_sorted)

        r['r_score'] = r_score
        r['f_score'] = f_score
        r['m_score'] = m_score
        r['rfm_score'] = f'{r_score}{f_score}{m_score}'

        segment, color = _rfm_segment(r_score, f_score, m_score)
        r['segment']       = segment
        r['segment_color'] = color

        dates = sorted(r['order_dates'])
        if len(dates) >= 2:
            gaps = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            r['avg_order_gap_days'] = round(sum(gaps) / len(gaps))
        else:
            r['avg_order_gap_days'] = None

        del r['order_dates']
        r['last_order']  = str(r['last_order'])
        r['total_spend'] = round(r['total_spend'], 2)

    rows.sort(key=lambda x: x['total_spend'], reverse=True)

    seg_counts  = defaultdict(int)
    seg_revenue = defaultdict(float)
    for r in rows:
        seg_counts[r['segment']]  += 1
        seg_revenue[r['segment']] += r['total_spend']

    segments = {
        seg: {'count': seg_counts[seg], 'revenue': round(seg_revenue[seg], 2)}
        for seg in seg_counts
    }

    return JsonResponse({'customers': rows, 'segments': segments})


# ── 3. CHURN PREDICTION ───────────────────────────────────────

@csrf_exempt
def churn(request):
    """Churn risk per customer with revenue-at-risk estimate."""
    today = date.today()
    active_statuses = ['confirmed', 'partial', 'delivered']
    orders = SalesOrder.objects.filter(status__in=active_statuses).select_related('customer')

    cust_data = {}
    for so in orders:
        cid = so.customer_id
        if cid not in cust_data:
            cust_data[cid] = {
                'customer_id':   cid,
                'customer_name': so.customer.customer_name,
                'customer_code': so.customer.customer_code,
                'city':          so.customer.city,
                'order_dates':   [],
                'total_spend':   0.0,
            }
        cust_data[cid]['order_dates'].append(so.order_date)
        cust_data[cid]['total_spend'] += _safe_float(so.total_amount)

    result = []
    for d in cust_data.values():
        dates   = sorted(d['order_dates'])
        last    = dates[-1]
        recency = (today - last).days

        if len(dates) >= 2:
            gaps    = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            avg_gap = sum(gaps) / len(gaps)
        else:
            avg_gap = 90

        overdue = recency - avg_gap

        if overdue < 0:
            risk, risk_color, risk_pct = 'Low',      '#2e7d32', max(5, round(recency / avg_gap * 40))
        elif overdue < avg_gap * 0.5:
            risk, risk_color, risk_pct = 'Medium',   '#f57f17', 50
        elif overdue < avg_gap:
            risk, risk_color, risk_pct = 'High',     '#e65100', 75
        else:
            risk, risk_color, risk_pct = 'Critical', '#b71c1c', 95

        months_active   = max((last - dates[0]).days / 30, 1)
        monthly_revenue = d['total_spend'] / months_active

        result.append({
            'customer_id':      d['customer_id'],
            'customer_name':    d['customer_name'],
            'customer_code':    d['customer_code'],
            'city':             d['city'],
            'order_count':      len(dates),
            'last_order':       str(last),
            'recency_days':     recency,
            'avg_cycle_days':   round(avg_gap),
            'days_overdue':     round(max(overdue, 0)),
            'churn_risk':       risk,
            'churn_risk_color': risk_color,
            'churn_risk_pct':   risk_pct,
            'total_spend':      round(d['total_spend'], 2),
            'monthly_revenue':  round(monthly_revenue, 2),
            'revenue_at_risk':  round(monthly_revenue * 3, 2),
        })

    order_map = {'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3}
    result.sort(key=lambda x: (order_map.get(x['churn_risk'], 9), -x['total_spend']))

    risk_counts  = defaultdict(int)
    risk_revenue = defaultdict(float)
    for r in result:
        risk_counts[r['churn_risk']]  += 1
        risk_revenue[r['churn_risk']] += r['revenue_at_risk']

    return JsonResponse({
        'customers': result,
        'summary': {
            risk: {'count': risk_counts[risk], 'revenue_at_risk': round(risk_revenue[risk], 2)}
            for risk in ['Critical', 'High', 'Medium', 'Low']
        },
    })


# ── 4. SALES FORECAST ────────────────────────────────────────

@csrf_exempt
def forecast(request):
    """Monthly sales history + 3-month linear regression forecast."""
    customer_id     = request.GET.get('customer_id')
    active_statuses = ['confirmed', 'partial', 'delivered']

    qs = SalesOrder.objects.filter(status__in=active_statuses)
    if customer_id:
        qs = qs.filter(customer_id=customer_id)

    monthly = (
        qs
        .annotate(month=TruncMonth('order_date'))
        .values('month')
        .annotate(revenue=Sum('total_amount'), orders=Count('id'))
        .order_by('month')
    )

    history = [
        {
            'month':   m['month'].strftime('%Y-%m'),
            'label':   m['month'].strftime('%b %Y'),
            'revenue': round(_safe_float(m['revenue']), 2),
            'orders':  m['orders'],
        }
        for m in monthly
    ]

    last12 = history[-12:] if len(history) > 12 else history
    if last12:
        pts = [(i, h['revenue']) for i, h in enumerate(last12)]
        slope, intercept = _linear_regression(pts)
        base_x = len(last12)
    else:
        slope, intercept, base_x = 0, 0, 0

    today = date.today()
    forecast_out = []
    for i in range(1, 4):
        y_val        = slope * (base_x - 1 + i) + intercept
        month_offset = today.month - 1 + i
        year_val     = today.year + month_offset // 12
        month_val    = month_offset % 12 + 1
        fm           = date(year_val, month_val, 1)
        forecast_out.append({
            'month':      fm.strftime('%Y-%m'),
            'label':      fm.strftime('%b %Y'),
            'revenue':    round(max(y_val, 0), 2),
            'orders':     None,
            'forecasted': True,
        })

    cust_qs = (
        SalesOrder.objects
        .filter(status__in=active_statuses)
        .values('customer_id', 'customer__customer_name', 'customer__customer_code')
        .annotate(revenue=Sum('total_amount'), orders=Count('id'))
        .order_by('-revenue')[:15]
    )
    top_customers = [
        {
            'customer_id':   c['customer_id'],
            'customer_name': c['customer__customer_name'],
            'customer_code': c['customer__customer_code'],
            'revenue':       round(_safe_float(c['revenue']), 2),
            'orders':        c['orders'],
        }
        for c in cust_qs
    ]

    trend = 'stable'
    if len(last12) >= 4:
        half        = len(last12) // 2
        first_half  = sum(h['revenue'] for h in last12[:half])
        second_half = sum(h['revenue'] for h in last12[half:])
        if second_half > first_half * 1.05:
            trend = 'growing'
        elif second_half < first_half * 0.95:
            trend = 'declining'

    return JsonResponse({
        'history':       history,
        'forecast':      forecast_out,
        'top_customers': top_customers,
        'trend':         trend,
        'slope':         round(slope, 2),
    })


# ── 5. PRODUCT INTELLIGENCE ───────────────────────────────────

@csrf_exempt
def products(request):
    """Per-product analytics: revenue, repeat rate, trend."""
    active_statuses = ['confirmed', 'partial', 'delivered']

    lines = (
        SalesOrderLine.objects
        .filter(sales_order__status__in=active_statuses)
        .select_related('item', 'sales_order')
    )

    prod_data = {}
    for line in lines:
        iid = line.item_id
        if iid not in prod_data:
            prod_data[iid] = {
                'item_id':      iid,
                'item_code':    line.item.item_code,
                'item_name':    line.item.item_name,
                'item_type':    line.item.item_type,
                'revenue':      0.0,
                'quantity':     0.0,
                'customer_ids': set(),
                'order_months': defaultdict(float),
                'order_count':  0,
                'cust_orders':  defaultdict(int),
            }
        d = prod_data[iid]
        d['revenue']   += _safe_float(line.total_price)
        d['quantity']  += _safe_float(line.ordered_quantity)
        d['order_count'] += 1
        d['customer_ids'].add(line.sales_order.customer_id)
        d['order_months'][line.sales_order.order_date.strftime('%Y-%m')] += _safe_float(line.total_price)
        d['cust_orders'][line.sales_order.customer_id] += 1

    result = []
    for d in prod_data.values():
        customer_count   = len(d['customer_ids'])
        repeat_customers = sum(1 for cnt in d['cust_orders'].values() if cnt > 1)
        repeat_rate      = round(repeat_customers / customer_count * 100, 1) if customer_count else 0

        months_sorted = sorted(d['order_months'].keys())
        if len(months_sorted) >= 6:
            half        = len(months_sorted) // 2
            first_half  = sum(d['order_months'][m] for m in months_sorted[:half])
            second_half = sum(d['order_months'][m] for m in months_sorted[half:])
            if second_half > first_half * 1.1:
                trend = 'growing'
            elif second_half < first_half * 0.9:
                trend = 'declining'
            else:
                trend = 'stable'
        else:
            trend = 'new' if len(months_sorted) <= 2 else 'stable'

        monthly = [
            {'month': m, 'revenue': round(d['order_months'][m], 2)}
            for m in sorted(d['order_months'].keys())[-12:]
        ]

        result.append({
            'item_id':        d['item_id'],
            'item_code':      d['item_code'],
            'item_name':      d['item_name'],
            'item_type':      d['item_type'],
            'revenue':        round(d['revenue'], 2),
            'quantity':       round(d['quantity'], 2),
            'customer_count': customer_count,
            'repeat_rate':    repeat_rate,
            'order_count':    d['order_count'],
            'trend':          trend,
            'monthly':        monthly,
        })

    result.sort(key=lambda x: x['revenue'], reverse=True)
    return JsonResponse({'products': result})


# ── 6. WHAT-IF SIMULATION ─────────────────────────────────────

@csrf_exempt
def whatif(request):
    """
    POST scenarios:
      lose_customers  { customer_ids: [..] }
      price_change    { change_pct: 10 }
      upsell          { customer_ids: [..], target_amount: 50000 }
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    data     = json.loads(request.body)
    scenario = data.get('scenario')
    today    = date.today()
    year_ago = today - timedelta(days=365)

    active_statuses = ['confirmed', 'partial', 'delivered']
    fy_orders = SalesOrder.objects.filter(status__in=active_statuses, order_date__gte=year_ago)
    total_fy  = _safe_float(fy_orders.aggregate(t=Sum('total_amount'))['t'])

    if scenario == 'lose_customers':
        ids          = data.get('customer_ids', [])
        lost_revenue = _safe_float(
            fy_orders.filter(customer_id__in=ids).aggregate(t=Sum('total_amount'))['t']
        )
        projected  = total_fy - lost_revenue
        lost_pct   = round(lost_revenue / total_fy * 100, 1) if total_fy else 0
        names = list(
            SalesOrder.objects.filter(customer_id__in=ids)
            .values_list('customer__customer_name', flat=True).distinct()
        )
        return JsonResponse({
            'scenario':          scenario,
            'current_revenue':   round(total_fy, 2),
            'lost_revenue':      round(lost_revenue, 2),
            'projected_revenue': round(projected, 2),
            'lost_pct':          lost_pct,
            'customer_names':    names,
        })

    elif scenario == 'price_change':
        change_pct = _safe_float(data.get('change_pct', 0))
        projected  = total_fy * (1 + change_pct / 100)
        return JsonResponse({
            'scenario':          scenario,
            'current_revenue':   round(total_fy, 2),
            'projected_revenue': round(projected, 2),
            'change_pct':        change_pct,
            'impact':            round(projected - total_fy, 2),
        })

    elif scenario == 'upsell':
        ids            = data.get('customer_ids', [])
        target_amount  = _safe_float(data.get('target_amount', 0))
        current_from   = _safe_float(
            fy_orders.filter(customer_id__in=ids).aggregate(t=Sum('total_amount'))['t']
        )
        upsell_total = target_amount * len(ids)
        projected    = total_fy - current_from + upsell_total
        return JsonResponse({
            'scenario':             scenario,
            'current_revenue':      round(total_fy, 2),
            'current_from_targets': round(current_from, 2),
            'upsell_total':         round(upsell_total, 2),
            'projected_revenue':    round(projected, 2),
            'impact':               round(upsell_total - current_from, 2),
        })

    return JsonResponse({'error': 'Unknown scenario'}, status=400)
