# ============================================================
# FILE: feed/views.py
# PURPOSE: Smart Business Feed API.
#          Generates a personalised daily feed of:
#          1. Data-driven alerts & insights from ERP data
#          2. Curated tips, books, courses, market news
#          3. Optional AI insight card (if ANTHROPIC_API_KEY set)
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, Count, Q
from django.conf import settings
from datetime import date, timedelta
from collections import defaultdict
import json
import random
import uuid
import os

from sales.models import SalesOrder, SalesOrderLine, Invoice
from inventory.models import StockItem
from master_data.models import Customer
from .content_library import BOOKS, COURSES, TIPS, MARKET_INSIGHTS


# ── Helper ───────────────────────────────────────────────────

def _sf(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _card(type_, priority, icon, color, title, body, metric=None, action_label=None, action_path=None, source='data'):
    return {
        'id':           str(uuid.uuid4()),
        'type':         type_,
        'source':       source,
        'priority':     priority,   # high / medium / low
        'icon':         icon,
        'color':        color,
        'title':        title,
        'body':         body,
        'metric':       metric,     # {'label': '...', 'value': '...'}
        'action_label': action_label,
        'action_path':  action_path,
    }


# ── Data-driven insight generators ───────────────────────────

def _churn_cards():
    """Cards for customers at critical/high churn risk."""
    cards = []
    today = date.today()
    active = ['confirmed', 'partial', 'delivered']
    orders = SalesOrder.objects.filter(status__in=active).select_related('customer')

    cust_data = {}
    for so in orders:
        cid = so.customer_id
        if cid not in cust_data:
            cust_data[cid] = {
                'name':    so.customer.customer_name,
                'dates':   [],
                'spend':   0.0,
            }
        cust_data[cid]['dates'].append(so.order_date)
        cust_data[cid]['spend'] += _sf(so.total_amount)

    critical, high = [], []
    for d in cust_data.values():
        dates   = sorted(d['dates'])
        recency = (today - dates[-1]).days
        if len(dates) >= 2:
            gaps    = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            avg_gap = sum(gaps) / len(gaps)
        else:
            avg_gap = 90
        overdue = recency - avg_gap
        if overdue >= avg_gap:
            critical.append((d['name'], d['spend'], round(overdue)))
        elif overdue >= avg_gap * 0.5:
            high.append((d['name'], d['spend'], round(overdue)))

    if critical:
        names = ', '.join(c[0] for c in critical[:3])
        rev   = sum(c[1] for c in critical)
        cards.append(_card(
            'alert', 'high', 'warning', '#b71c1c',
            f'🚨 {len(critical)} customer{"s" if len(critical) > 1 else ""} at critical churn risk',
            f'{names}{"..." if len(critical) > 3 else ""} — these customers have gone significantly past their normal purchase cycle. Without contact, they may not return.',
            metric={'label': 'Revenue at risk (est. 3-mo)', 'value': f'₹{rev/100000:.1f}L'},
            action_label='View Churn Analysis',
            action_path='/analytics/customer-intelligence',
        ))

    if high:
        names = ', '.join(h[0] for h in high[:3])
        cards.append(_card(
            'alert', 'medium', 'warning_amber', '#e65100',
            f'⚠️ {len(high)} customer{"s" if len(high) > 1 else ""} showing high churn risk',
            f'{names}{"..." if len(high) > 3 else ""} — they are overdue on their typical ordering cycle. A quick call or WhatsApp message now can prevent loss.',
            action_label='View Churn Analysis',
            action_path='/analytics/customer-intelligence',
        ))

    return cards


def _revenue_trend_card():
    """Card comparing this month vs last month revenue."""
    today   = date.today()
    m_start = date(today.year, today.month, 1)
    lm_end  = m_start - timedelta(days=1)
    lm_start = date(lm_end.year, lm_end.month, 1)

    active = ['confirmed', 'partial', 'delivered']
    this_mo = _sf(
        SalesOrder.objects.filter(status__in=active, order_date__gte=m_start)
        .aggregate(t=Sum('total_amount'))['t']
    )
    last_mo = _sf(
        SalesOrder.objects.filter(status__in=active, order_date__gte=lm_start, order_date__lte=lm_end)
        .aggregate(t=Sum('total_amount'))['t']
    )

    # Annualise this_mo (divide by days elapsed, multiply by 30)
    days_elapsed = max(today.day, 1)
    projected_mo = this_mo / days_elapsed * 30

    if last_mo == 0:
        return None

    pct = round((projected_mo - last_mo) / last_mo * 100, 1)

    if pct >= 10:
        return _card(
            'insight', 'medium', 'trending_up', '#2e7d32',
            f'📈 Revenue on track to be +{pct}% this month',
            f'Based on {days_elapsed} days of data, this month is projecting ₹{projected_mo/100000:.1f}L vs ₹{last_mo/100000:.1f}L last month. Strong momentum — make sure you have enough stock to fulfil orders.',
            metric={'label': 'Projected month revenue', 'value': f'₹{projected_mo/100000:.1f}L'},
            action_label='View Forecast',
            action_path='/analytics/customer-intelligence',
        )
    elif pct <= -10:
        return _card(
            'alert', 'high', 'trending_down', '#b71c1c',
            f'📉 Revenue projecting {pct}% below last month',
            f'At current pace, this month will end at ₹{projected_mo/100000:.1f}L vs ₹{last_mo/100000:.1f}L last month. Check if there are pending orders to confirm or customers to follow up with.',
            metric={'label': 'Gap to close', 'value': f'₹{abs(last_mo - projected_mo)/100000:.1f}L'},
            action_label='View Forecast',
            action_path='/analytics/customer-intelligence',
        )
    return None


def _stock_alert_cards():
    """Cards for items below minimum stock level."""
    cards = []
    try:
        low = StockItem.objects.filter(
            quantity__lt=models.F('item__minimum_stock'),
            item__is_active=True,
        ).select_related('item')[:10]

        if low.count() > 0:
            names = ', '.join(s.item.item_name for s in low[:3])
            cards.append(_card(
                'alert', 'high', 'inventory_2', '#e65100',
                f'🔴 {low.count()} item{"s" if low.count() > 1 else ""} below minimum stock',
                f'{names}{"..." if low.count() > 3 else ""} — these items are running low. Raise purchase orders before production is affected.',
                action_label='View Inventory',
                action_path='/inventory/stock-list',
            ))
    except Exception:
        # StockItem model or F() import may vary — graceful skip
        pass
    return cards


def _overdue_invoice_card():
    """Card for overdue invoices."""
    today   = date.today()
    overdue = Invoice.objects.filter(
        status__in=['sent', 'overdue'],
        due_date__lt=today,
    ).aggregate(cnt=Count('id'), total=Sum('total_amount'))

    cnt = overdue['cnt'] or 0
    amt = _sf(overdue['total'])

    if cnt > 0:
        return _card(
            'alert', 'high', 'receipt_long', '#7b1fa2',
            f'💰 {cnt} invoice{"s" if cnt > 1 else ""} overdue — ₹{amt/100000:.1f}L uncollected',
            f'Overdue invoices strain your cash flow. Follow up immediately — send reminders via WhatsApp and email. Consider offering a small early payment discount to accelerate collection.',
            metric={'label': 'Overdue amount', 'value': f'₹{amt/100000:.1f}L'},
            action_label='View Invoices',
            action_path='/sales/invoices',
        )
    return None


def _top_product_card():
    """Highlight the top performing product this month."""
    today   = date.today()
    m_start = date(today.year, today.month, 1)
    active  = ['confirmed', 'partial', 'delivered']

    top = (
        SalesOrderLine.objects
        .filter(sales_order__status__in=active, sales_order__order_date__gte=m_start)
        .values('item__item_name', 'item__item_code')
        .annotate(rev=Sum('total_price'))
        .order_by('-rev')
        .first()
    )

    if top and top['rev']:
        return _card(
            'insight', 'low', 'star', '#1565c0',
            f'⭐ Top product this month: {top["item__item_name"]}',
            f'Revenue: ₹{_sf(top["rev"])/100000:.1f}L this month. If stock is available, prioritise this item in your sales conversations — your customers are already buying it.',
            metric={'label': 'This month revenue', 'value': f'₹{_sf(top["rev"])/100000:.1f}L'},
            action_label='View Product Analytics',
            action_path='/analytics/customer-intelligence',
        )
    return None


def _new_customer_card():
    """Celebrate new customers in the last 30 days."""
    thirty_ago = date.today() - timedelta(days=30)
    new_custs  = (
        SalesOrder.objects
        .filter(order_date__gte=thirty_ago, status__in=['confirmed', 'partial', 'delivered'])
        .values('customer_id')
        .distinct()
    )
    # Customers whose first ever order is within last 30 days
    truly_new = []
    for nc in new_custs:
        cid       = nc['customer_id']
        first_ord = SalesOrder.objects.filter(customer_id=cid, status__in=['confirmed','partial','delivered']).order_by('order_date').first()
        if first_ord and first_ord.order_date >= thirty_ago:
            truly_new.append(cid)

    if truly_new:
        names = ', '.join(
            SalesOrder.objects.filter(customer_id=truly_new[0]).first().customer.customer_name
            for cid in truly_new[:2]
        ) if truly_new else ''
        return _card(
            'insight', 'low', 'person_add', '#2e7d32',
            f'🎉 {len(truly_new)} new customer{"s" if len(truly_new) > 1 else ""} in the last 30 days',
            f'New customers need extra attention in the first 90 days. Follow up after their first delivery, ask for feedback, and offer to send a product catalogue. First impressions create loyal buyers.',
            action_label='View Customers',
            action_path='/master-data/customers',
        )
    return None


def _repeat_rate_card():
    """Insight card about the company's repeat customer rate."""
    active = ['confirmed', 'partial', 'delivered']
    order_counts = (
        SalesOrder.objects
        .filter(status__in=active)
        .values('customer_id')
        .annotate(cnt=Count('id'))
    )
    total = order_counts.count()
    repeat = sum(1 for x in order_counts if x['cnt'] > 1)
    rate   = round(repeat / total * 100, 1) if total else 0

    if rate >= 60:
        return _card(
            'insight', 'low', 'loyalty', '#1565c0',
            f'👏 Your repeat customer rate is {rate}% — excellent',
            'A repeat rate above 60% means your customers are happy and trust your product. Focus on deepening these relationships — they are your most profitable growth engine.',
            metric={'label': 'Repeat rate', 'value': f'{rate}%'},
        )
    elif rate < 40 and total > 3:
        return _card(
            'alert', 'medium', 'loyalty', '#e65100',
            f'🔁 Repeat rate is only {rate}% — room to improve',
            'Less than 40% of your customers have placed a second order. Focus on post-delivery follow-up, quality consistency, and loyalty incentives to bring them back.',
            metric={'label': 'Repeat rate', 'value': f'{rate}%'},
            action_label='View RFM Analysis',
            action_path='/analytics/customer-intelligence',
        )
    return None


def _generate_data_cards():
    """Collect all data-driven insight cards."""
    cards = []
    cards += _churn_cards()

    for fn in [_revenue_trend_card, _overdue_invoice_card, _top_product_card, _new_customer_card, _repeat_rate_card]:
        try:
            c = fn()
            if c:
                cards.append(c)
        except Exception:
            pass

    try:
        cards += _stock_alert_cards()
    except Exception:
        pass

    return cards


# ── Curated content cards ─────────────────────────────────────

def _curated_cards(count=8):
    """Pick a daily-rotated selection from books, courses, tips, market insights."""
    today_seed = int(date.today().strftime('%Y%m%d'))
    rng = random.Random(today_seed)

    cards = []

    # 2 books
    for book in rng.sample(BOOKS, min(2, len(BOOKS))):
        cards.append(_card(
            'book', 'low', 'menu_book', '#1565c0',
            f'📚 {book["title"]}',
            f'by {book["author"]} · {book["category"]}\n\n{book["why"]}',
            source='curated',
        ))

    # 1 course
    course = rng.choice(COURSES)
    cards.append(_card(
        'course', 'low', 'school', '#7b1fa2',
        f'🎓 {course["title"]}',
        f'{course["platform"]} · {course["level"]}\n\n{course["why"]}',
        source='curated',
    ))

    # 3 tips
    for tip in rng.sample(TIPS, min(3, len(TIPS))):
        cards.append(_card(
            'tip', 'low', 'lightbulb', '#f57f17',
            f'💡 {tip["title"]}',
            tip['body'],
            source='curated',
        ))

    # 2 market insights
    for mi in rng.sample(MARKET_INSIGHTS, min(2, len(MARKET_INSIGHTS))):
        cards.append(_card(
            'market', 'low', mi['icon'], '#0277bd',
            f'🌐 {mi["title"]}',
            mi['body'],
            source='curated',
        ))

    return cards


# ── Optional AI card ──────────────────────────────────────────

def _ai_insight_card():
    """
    If ANTHROPIC_API_KEY is set, call Claude to generate one
    personalised business insight based on a snapshot of ERP data.
    Returns None gracefully if key not set or call fails.
    """
    api_key = os.environ.get('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', '')
    if not api_key:
        return None

    try:
        import anthropic

        # Build a compact ERP snapshot
        today   = date.today()
        active  = ['confirmed', 'partial', 'delivered']
        m_start = date(today.year, today.month, 1)

        mo_rev = _sf(
            SalesOrder.objects.filter(status__in=active, order_date__gte=m_start)
            .aggregate(t=Sum('total_amount'))['t']
        )
        total_custs = Customer.objects.filter(is_active=True).count()
        overdue_cnt = Invoice.objects.filter(status__in=['sent', 'overdue'], due_date__lt=today).count()
        top_prod = (
            SalesOrderLine.objects
            .filter(sales_order__status__in=active, sales_order__order_date__gte=m_start)
            .values('item__item_name')
            .annotate(rev=Sum('total_price'))
            .order_by('-rev')
            .first()
        )
        top_prod_name = top_prod['item__item_name'] if top_prod else 'N/A'

        prompt = f"""You are a business advisor for a technical textile manufacturing company in India.
Here is a quick snapshot of the business today ({today}):
- This month's confirmed sales revenue: ₹{mo_rev/100000:.1f} lakhs
- Total active customers: {total_custs}
- Overdue invoices: {overdue_cnt}
- Top selling product this month: {top_prod_name}

In 3-4 sentences, give ONE specific, actionable business improvement suggestion for this company.
Be direct, practical, and focused on a single thing they can do this week.
Do not introduce yourself. Just give the advice directly."""

        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=200,
            messages=[{'role': 'user', 'content': prompt}],
        )
        advice = message.content[0].text.strip()

        return _card(
            'ai', 'medium', 'psychology', '#6a1b9a',
            '🤖 AI Business Insight — personalised for your data today',
            advice,
            source='ai',
        )

    except Exception:
        return None


# ── Feed assembly ─────────────────────────────────────────────

@csrf_exempt
def feed(request):
    """
    Returns the daily Smart Business Feed.
    Mixes: data alerts (top) → AI insight → curated content (interspersed)
    """
    data_cards    = _generate_data_cards()
    curated_cards = _curated_cards()
    ai_card       = _ai_insight_card()

    # Sort data cards: high priority first
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    data_cards.sort(key=lambda c: priority_order.get(c['priority'], 9))

    # Interleave: data cards first, then AI card, then curated (shuffled by daily seed)
    today_seed = int(date.today().strftime('%Y%m%d'))
    rng = random.Random(today_seed + 1)
    rng.shuffle(curated_cards)

    final_feed = data_cards[:]
    if ai_card:
        # Insert AI card after the 2nd card (or at end if fewer)
        pos = min(2, len(final_feed))
        final_feed.insert(pos, ai_card)

    final_feed += curated_cards

    return JsonResponse({
        'feed':        final_feed,
        'data_count':  len(data_cards),
        'has_ai':      ai_card is not None,
        'generated':   str(date.today()),
    })


@csrf_exempt
def ai_status(request):
    """Quick check: is the AI insight feature configured?"""
    api_key = os.environ.get('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', '')
    return JsonResponse({'ai_enabled': bool(api_key)})
