# ============================================================
# FILE: chatbot/views.py
# PURPOSE: ERP Chatbot API.
#          Answers natural language questions about the ERP.
#          Strategy:
#            1. Try to match question against known patterns → instant ORM query
#            2. If ANTHROPIC_API_KEY is set, fall back to Claude with a live
#               data snapshot for any question that doesn't match a pattern.
#            3. If no API key and no pattern match, return a helpful fallback.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, Count, Q, Avg
from django.db.models.functions import TruncMonth
from django.conf import settings
from datetime import date, timedelta
import json, os, re

from sales.models      import SalesOrder, SalesOrderLine, Invoice
from inventory.models  import Stock
from master_data.models import Customer, Item
from production.models import Machine, WorkOrder

# ── helpers ──────────────────────────────────────────────────

def _sf(v):
    try: return float(v)
    except: return 0.0

def _fmt(n):
    n = float(n or 0)
    if n >= 10_000_000: return f'₹{n/10_000_000:.2f} Cr'
    if n >= 100_000:    return f'₹{n/100_000:.2f} L'
    return f'₹{n:,.0f}'

ACTIVE = ['confirmed', 'partial', 'delivered']

# ── Date range parser ─────────────────────────────────────────

def _parse_date_range(msg):
    """
    Extract a (start_date, end_date, label) from natural language.
    Examples:
      "last 10 days"  → (today-10, today, "last 10 days")
      "last 2 weeks"  → (today-14, today, "last 2 weeks")
      "last week"     → (today-7,  today, "last 7 days")
      "yesterday"     → (yesterday, yesterday, "yesterday")
      "this week"     → (monday,   today, "this week")
      "this month"    → (month_start, today, "this month")
      "last month"    → (prev_month_start, prev_month_end, "last month")
      "last 3 months" → (today-90, today, "last 3 months")
      None if no date range found.
    """
    today = date.today()
    m = msg.lower()

    # "last N days / weeks / months"
    match = re.search(r'last\s+(\d+)\s*(day|days|week|weeks|month|months)', m)
    if match:
        n    = int(match.group(1))
        unit = match.group(2)
        if 'month' in unit:
            delta = n * 30
            label = f'last {n} month{"s" if n > 1 else ""}'
        elif 'week' in unit:
            delta = n * 7
            label = f'last {n} week{"s" if n > 1 else ""}'
        else:
            delta = n
            label = f'last {n} day{"s" if n > 1 else ""}'
        return today - timedelta(days=delta), today, label

    # "past N days / weeks"
    match = re.search(r'past\s+(\d+)\s*(day|days|week|weeks)', m)
    if match:
        n    = int(match.group(1))
        unit = match.group(2)
        delta = n * 7 if 'week' in unit else n
        label = f'past {n} {"week" if "week" in unit else "day"}{"s" if n > 1 else ""}'
        return today - timedelta(days=delta), today, label

    # "N days / weeks summary / report"
    match = re.search(r'(\d+)\s*(day|days|week|weeks)\s*(summary|report|data|revenue|orders|sales)?', m)
    if match:
        n    = int(match.group(1))
        unit = match.group(2)
        delta = n * 7 if 'week' in unit else n
        label = f'last {n} {"week" if "week" in unit else "day"}{"s" if n > 1 else ""}'
        return today - timedelta(days=delta), today, label

    # Fixed keywords
    if 'yesterday' in m:
        y = today - timedelta(days=1)
        return y, y, 'yesterday'
    if 'this week' in m:
        monday = today - timedelta(days=today.weekday())
        return monday, today, 'this week'
    if 'last week' in m:
        last_mon = today - timedelta(days=today.weekday() + 7)
        last_sun = last_mon + timedelta(days=6)
        return last_mon, last_sun, 'last week'
    if 'last month' in m:
        first_this = date(today.year, today.month, 1)
        last_prev  = first_this - timedelta(days=1)
        first_prev = date(last_prev.year, last_prev.month, 1)
        return first_prev, last_prev, 'last month'
    if 'this month' in m or 'current month' in m:
        return date(today.year, today.month, 1), today, 'this month'
    if 'this year' in m or 'this fy' in m or 'financial year' in m:
        fy_start = date(today.year, 4, 1) if today.month >= 4 else date(today.year - 1, 4, 1)
        return fy_start, today, 'this financial year'

    return None


def _range_summary(start, end, label):
    """Generate a comprehensive summary for any date range."""
    today = date.today()
    qs = SalesOrder.objects.filter(order_date__gte=start, order_date__lte=end)

    so_all   = qs.count()
    so_conf  = qs.filter(status__in=ACTIVE)
    revenue  = _sf(so_conf.aggregate(t=Sum('total_amount'))['t'])
    invoices = Invoice.objects.filter(invoice_date__gte=start, invoice_date__lte=end).count()

    # Top customer in range
    top = (
        so_conf.values('customer__customer_name')
        .annotate(rev=Sum('total_amount'))
        .order_by('-rev')
        .first()
    )
    top_str = f'\n• Top customer: **{top["customer__customer_name"]}** ({_fmt(top["rev"])})' if top else ''

    # Unique customers
    unique_custs = so_conf.values('customer_id').distinct().count()

    date_str = (f'{start.strftime("%d %b")} – {end.strftime("%d %b %Y")}'
                if start != end else start.strftime('%d %b %Y'))

    lines = [
        f'📊 **Summary: {label}** ({date_str})',
        f'• Sales orders: **{so_all}** total, **{so_conf.count()}** confirmed',
        f'• Revenue: **{_fmt(revenue)}**',
        f'• Invoices raised: **{invoices}**',
        f'• Unique customers: **{unique_custs}**',
    ]
    if top_str:
        lines.append(top_str)

    return '\n'.join(lines)


def _today():
    return date.today()

# ── ERP data snapshot (used by Claude) ───────────────────────

def _build_snapshot():
    """Compact JSON snapshot of today's ERP state for Claude."""
    TODAY   = _today()
    m_start = date(TODAY.year, TODAY.month, 1)

    today_so  = SalesOrder.objects.filter(order_date=TODAY)
    today_inv = Invoice.objects.filter(invoice_date=TODAY)
    month_so  = SalesOrder.objects.filter(order_date__gte=m_start, status__in=ACTIVE)
    overdue   = Invoice.objects.filter(status__in=['sent','overdue'], due_date__lt=TODAY)
    machines  = Machine.objects.all()
    low_stock = list(
        Stock.objects.filter(quantity__lt=0.1, item__is_active=True)
        .select_related('item').values_list('item__item_name', flat=True)[:5]
    )
    top_custs = list(
        SalesOrder.objects.filter(status__in=ACTIVE, order_date__gte=m_start)
        .values('customer__customer_name')
        .annotate(rev=Sum('total_amount'))
        .order_by('-rev')[:3]
        .values_list('customer__customer_name', 'rev')
    )

    return {
        'date': str(TODAY),
        'sales_orders_today': today_so.count(),
        'sales_orders_today_revenue': _fmt(today_so.filter(status__in=ACTIVE).aggregate(t=Sum('total_amount'))['t']),
        'invoices_today': today_inv.count(),
        'month_revenue': _fmt(month_so.aggregate(t=Sum('total_amount'))['t']),
        'month_order_count': month_so.count(),
        'overdue_invoices': overdue.count(),
        'overdue_amount': _fmt(overdue.aggregate(t=Sum('total_amount'))['t']),
        'machines_total': machines.count(),
        'machines_active': machines.filter(status='active').count(),
        'machines_breakdown': machines.filter(status='breakdown').count(),
        'machines_breakdown_names': list(machines.filter(status='breakdown').values_list('machine_name', flat=True)[:5]),
        'machines_maintenance': machines.filter(status='maintenance').count(),
        'total_active_customers': Customer.objects.filter(is_active=True).count(),
        'low_stock_items': low_stock,
        'draft_orders': SalesOrder.objects.filter(status='draft').count(),
        'top_customers_this_month': [{'name': n, 'revenue': _fmt(r)} for n, r in top_custs],
    }

# ── Pattern-based answerers ───────────────────────────────────

def _match(text, *keywords):
    """True if any keyword found in lowercased text."""
    t = text.lower()
    return any(k in t for k in keywords)

def _answer_pattern(msg):
    """
    Try to answer from patterns. Returns answer string or None.
    Date-range queries are detected first and handled for any period.
    """
    m     = msg.lower()
    today = _today()

    # ── Date range summary (handles any N-day/week/month range) ──
    date_range = _parse_date_range(m)
    if date_range and _match(m, 'summary', 'report', 'overview', 'data',
                             'revenue', 'sales', 'orders', 'how many',
                             'what', 'show', 'give', 'tell'):
        start, end, label = date_range
        return _range_summary(start, end, label)

    # ── Revenue for a specific range ──────────────────────────
    if date_range and _match(m, 'revenue', 'income', 'earning', 'money'):
        start, end, label = date_range
        rev = _sf(
            SalesOrder.objects.filter(status__in=ACTIVE, order_date__gte=start, order_date__lte=end)
            .aggregate(t=Sum('total_amount'))['t']
        )
        cnt = SalesOrder.objects.filter(status__in=ACTIVE, order_date__gte=start, order_date__lte=end).count()
        return f'Revenue for **{label}**: **{_fmt(rev)}** across **{cnt}** confirmed orders.'

    # ── Orders for a specific range ───────────────────────────
    if date_range and _match(m, 'order', 'so', 'invoice'):
        start, end, label = date_range
        return _range_summary(start, end, label)

    # ── Today sales orders ────────────────────────────────────
    if _match(m, 'sales order', 'so') and _match(m, 'today', 'this day'):
        qs  = SalesOrder.objects.filter(order_date=today)
        cnt = qs.count()
        rev = _sf(qs.filter(status__in=ACTIVE).aggregate(t=Sum('total_amount'))['t'])
        if cnt == 0:
            return 'No sales orders have been created today yet.'
        return f'**{cnt}** sales order{"s" if cnt > 1 else ""} created today. Confirmed revenue: **{_fmt(rev)}**.'

    # ── Today invoices ────────────────────────────────────────
    if _match(m, 'invoice') and _match(m, 'today', 'this day'):
        cnt = Invoice.objects.filter(invoice_date=today).count()
        return f'**{cnt}** invoice{"s" if cnt > 1 else ""} created today.' if cnt else 'No invoices raised today yet.'

    # ── Overdue invoices ──────────────────────────────────────
    if _match(m, 'overdue', 'unpaid', 'pending payment', 'outstanding'):
        qs  = Invoice.objects.filter(status__in=['sent','overdue'], due_date__lt=today)
        cnt = qs.count()
        amt = _sf(qs.aggregate(t=Sum('total_amount'))['t'])
        if cnt == 0:
            return 'Great news — no overdue invoices at the moment! 🎉'
        return f'**{cnt}** overdue invoice{"s" if cnt > 1 else ""}. Total outstanding: **{_fmt(amt)}**. Follow up with customers immediately.'

    # ── Machine breakdown ─────────────────────────────────────
    if _match(m, 'machine', 'breakdown', 'broke down', 'broken', 'not working', 'down'):
        breakdown = Machine.objects.filter(status='breakdown')
        maint     = Machine.objects.filter(status='maintenance')
        names     = list(breakdown.values_list('machine_name', flat=True))
        if not names:
            if maint.count():
                mn = list(maint.values_list('machine_name', flat=True))
                return f'No machines are in breakdown. **{maint.count()}** in maintenance: {", ".join(mn)}.'
            return 'All machines are currently active. No breakdowns reported. ✅'
        return (f'**{len(names)}** machine{"s" if len(names)>1 else ""} in breakdown: **{", ".join(names)}**. '
                f'{"Also, " + str(maint.count()) + " in maintenance." if maint.count() else ""}')

    # ── Machine status / count ────────────────────────────────
    if _match(m, 'machine') and _match(m, 'status', 'how many', 'total', 'list', 'all'):
        machines = Machine.objects.all()
        total    = machines.count()
        active   = machines.filter(status='active').count()
        breakdown= machines.filter(status='breakdown').count()
        maint    = machines.filter(status='maintenance').count()
        return f'**{total}** machines total: **{active}** active, **{breakdown}** in breakdown, **{maint}** in maintenance.'

    # ── This month revenue ────────────────────────────────────
    if _match(m, 'revenue', 'income', 'earning') and _match(m, 'month', 'this month', 'monthly'):
        m_start = date(today.year, today.month, 1)
        rev = _sf(SalesOrder.objects.filter(status__in=ACTIVE, order_date__gte=m_start).aggregate(t=Sum('total_amount'))['t'])
        cnt = SalesOrder.objects.filter(status__in=ACTIVE, order_date__gte=m_start).count()
        return f'This month\'s revenue (confirmed orders): **{_fmt(rev)}** across **{cnt}** orders.'

    # ── Top customers ─────────────────────────────────────────
    if _match(m, 'top customer', 'best customer', 'biggest customer', 'largest customer'):
        m_start = date(today.year, today.month, 1)
        qs = (
            SalesOrder.objects.filter(status__in=ACTIVE, order_date__gte=m_start)
            .values('customer__customer_name')
            .annotate(rev=Sum('total_amount'))
            .order_by('-rev')[:5]
        )
        if not qs:
            return 'No confirmed orders this month yet.'
        lines = [f'{i+1}. **{r["customer__customer_name"]}** — {_fmt(r["rev"])}' for i, r in enumerate(qs)]
        return 'Top customers this month:\n' + '\n'.join(lines)

    # ── Total customers ───────────────────────────────────────
    if _match(m, 'customer') and _match(m, 'how many', 'total', 'count', 'number of'):
        total  = Customer.objects.filter(is_active=True).count()
        m_start = date(today.year, today.month, 1)
        active = set(SalesOrder.objects.filter(status__in=ACTIVE, order_date__gte=m_start).values_list('customer_id', flat=True))
        return f'**{total}** active customers in the system. **{len(active)}** placed orders this month.'

    # ── Stock / inventory ─────────────────────────────────────
    if _match(m, 'stock', 'inventory', 'low stock', 'out of stock'):
        low = list(
            Stock.objects.filter(quantity__lt=0.1, item__is_active=True)
            .select_related('item').values_list('item__item_name', flat=True)[:5]
        )
        if not low:
            return 'No items are completely out of stock right now. ✅'
        return f'**{len(low)}** item{"s" if len(low)>1 else ""} with near-zero stock: **{", ".join(low)}**. Consider raising purchase orders.'

    # ── Work orders ───────────────────────────────────────────
    if _match(m, 'work order', 'production order', 'wo'):
        qs      = WorkOrder.objects.all()
        draft   = qs.filter(status='draft').count()
        running = qs.filter(status__in=['in_progress', 'confirmed']).count()
        done    = qs.filter(status='completed').count()
        return f'Work orders — **{running}** in progress, **{draft}** draft, **{done}** completed.'

    # ── Pending / draft orders ────────────────────────────────
    if _match(m, 'draft', 'pending', 'unconfirmed') and _match(m, 'order', 'so'):
        cnt = SalesOrder.objects.filter(status='draft').count()
        return (f'**{cnt}** sales order{"s" if cnt>1 else ""} still in draft — not yet confirmed.'
                if cnt else 'No draft sales orders. All are confirmed. ✅')

    # ── Today / general summary ───────────────────────────────
    if _match(m, 'today', "what's happening", 'daily', 'morning', 'overview') or \
       (m.strip() in ('summary', 'report')):
        so_today  = SalesOrder.objects.filter(order_date=today).count()
        inv_today = Invoice.objects.filter(invoice_date=today).count()
        breakdown = Machine.objects.filter(status='breakdown').count()
        overdue_c = Invoice.objects.filter(status__in=['sent','overdue'], due_date__lt=today).count()
        rev_today = _sf(
            SalesOrder.objects.filter(order_date=today, status__in=ACTIVE).aggregate(t=Sum('total_amount'))['t']
        )
        lines = [
            f'📅 **Today ({today.strftime("%d %b %Y")})**',
            f'• Sales orders: **{so_today}** (confirmed revenue: {_fmt(rev_today)})',
            f'• Invoices raised: **{inv_today}**',
            f'• Machines in breakdown: **{breakdown}**',
            f'• Overdue invoices: **{overdue_c}**',
        ]
        return '\n'.join(lines)

    # ── Greetings ─────────────────────────────────────────────
    if _match(m, 'hello', 'hi ', 'hey', 'good morning', 'good afternoon', 'namaste'):
        return ('Hello! 👋 I\'m your SASI ERP assistant. Ask me anything:\n'
                '• *Last 10 days summary*\n'
                '• *Revenue last 2 weeks*\n'
                '• *This month\'s orders*\n'
                '• *Which machines broke down?*\n'
                '• *Overdue invoices*\n'
                '• *Open sales orders* (navigates to the page)')

    # ── Help ──────────────────────────────────────────────────
    if _match(m, 'help', 'what can you', 'what do you', 'capabilities'):
        return ('I understand natural date ranges — try:\n'
                '• *Last 7 days revenue*\n'
                '• *Last 10 days summary*\n'
                '• *Last 2 weeks orders*\n'
                '• *Yesterday\'s summary*\n'
                '• *This week\'s sales*\n'
                '• *Last month report*\n\n'
                'And live ERP data:\n'
                '**Sales** · **Invoices** · **Machines** · **Inventory** · **Customers** · **Work Orders**')

    return None


# ── Claude AI fallback ────────────────────────────────────────

def _answer_claude(question):
    """Use Claude with live ERP snapshot to answer any question."""
    api_key = os.environ.get('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', '')
    if not api_key:
        return None

    try:
        import anthropic
        snapshot = _build_snapshot()
        system_prompt = f"""You are the AI assistant for SASI ERP, a textile manufacturing ERP system.
Today is {_today()}. Here is a live snapshot of the business data:

{json.dumps(snapshot, indent=2)}

Answer the user's question using ONLY this data. Be concise and direct.
Use **bold** for important numbers. Use bullet points when listing multiple items.
If the data doesn't have what they need, say so clearly.
Do NOT make up numbers. Do NOT mention being an AI — just answer like a knowledgeable assistant."""

        client  = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=300,
            system=system_prompt,
            messages=[{'role': 'user', 'content': question}],
        )
        return message.content[0].text.strip()
    except Exception as e:
        return None


# ── Main chat endpoint ────────────────────────────────────────

@csrf_exempt
def chat(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    try:
        data     = json.loads(request.body)
        question = (data.get('message') or '').strip()
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    if not question:
        return JsonResponse({'reply': 'Please type a question.'})

    # 1. Try pattern match first (instant, no API cost)
    reply = _answer_pattern(question)

    # 2. If no pattern, try Claude
    if not reply:
        reply = _answer_claude(question)

    # 3. Fallback
    if not reply:
        reply = ("I'm not sure about that yet. Try asking about:\n"
                 "• Sales orders or invoices today\n"
                 "• This month's revenue\n"
                 "• Machine status or breakdowns\n"
                 "• Overdue invoices or top customers\n\n"
                 "*(Tip: Add ANTHROPIC_API_KEY to .env for unlimited question answering)*")

    return JsonResponse({'reply': reply})


@csrf_exempt
def chat_status(request):
    """Returns whether AI is enabled and what topics are supported."""
    api_key = os.environ.get('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', '')
    return JsonResponse({
        'ai_enabled': bool(api_key),
        'topics': ['sales orders', 'invoices', 'revenue', 'machines', 'inventory', 'customers', 'work orders'],
    })
