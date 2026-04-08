# ============================================================
# FILE: reports/views.py
# PURPOSE: API endpoints for all report pages.
#          Aggregates data from all modules for reporting.
#          Reports: Production, Inventory, Sales, Finance, HR
# ============================================================

from django.http import JsonResponse
from django.db.models import Sum, Count, Q, Avg
from django.db.models.functions import TruncMonth
from django.utils import timezone
import datetime

from production.models import WorkOrder, Batch
from inventory.models import Stock, StockMovement
from purchasing.models import PurchaseOrder, GoodsReceipt
from sales.models import SalesOrder, Invoice
from finance.models import Account, JournalEntry
from hr_payroll.models import Employee, SalaryRecord, Attendance
from master_data.models import Item


# ============================================================
# PRODUCTION REPORT
# ============================================================
def production_report(request):
    # Work order summary by status
    wo_by_status = list(
        WorkOrder.objects.values('status')
        .annotate(count=Count('id'))
        .order_by('status')
    )

    # Monthly production (last 6 months)
    six_months_ago = datetime.date.today() - datetime.timedelta(days=180)
    monthly_production = list(
        Batch.objects.filter(production_date__gte=six_months_ago)
        .annotate(month=TruncMonth('production_date'))
        .values('month')
        .annotate(total_qty=Sum('quantity_produced'), batch_count=Count('id'))
        .order_by('month')
    )

    # Top 5 produced items
    top_items = list(
        Batch.objects.values('item__item_code', 'item__item_name')
        .annotate(total_produced=Sum('quantity_produced'))
        .order_by('-total_produced')[:5]
    )

    # Recent batches
    recent_batches = list(
        Batch.objects.select_related('item', 'work_order')
        .order_by('-production_date')[:10]
        .values('batch_number', 'item__item_code', 'item__item_name',
                'quantity_produced', 'production_date')
    )

    return JsonResponse({
        'wo_by_status':       wo_by_status,
        'monthly_production': [
            {
                'month':       m['month'].strftime('%b %Y'),
                'total_qty':   float(m['total_qty'] or 0),
                'batch_count': m['batch_count'],
            } for m in monthly_production
        ],
        'top_items': [
            {
                'item_code':      t['item__item_code'],
                'item_name':      t['item__item_name'],
                'total_produced': float(t['total_produced'] or 0),
            } for t in top_items
        ],
        'recent_batches': [
            {
                'batch_number':    b['batch_number'],
                'item_code':       b['item__item_code'],
                'item_name':       b['item__item_name'],
                'quantity_produced': float(b['quantity_produced'] or 0),
                'production_date': str(b['production_date']),
            } for b in recent_batches
        ],
        'total_work_orders':    WorkOrder.objects.count(),
        'completed_work_orders': WorkOrder.objects.filter(status='completed').count(),
        'total_batches':        Batch.objects.count(),
    })


# ============================================================
# INVENTORY REPORT
# ============================================================
def inventory_report(request):
    # Stock by item type
    stock_summary = list(
        Stock.objects.filter(quantity__gt=0)
        .select_related('item', 'warehouse')
        .values('item__item_type')
        .annotate(total_items=Count('id'), total_qty=Sum('quantity'))
        .order_by('item__item_type')
    )

    # Low stock items (qty <= 10)
    low_stock = list(
        Stock.objects.filter(quantity__gt=0, quantity__lte=10)
        .select_related('item', 'warehouse')
        .values('item__item_code', 'item__item_name', 'warehouse__name', 'quantity')
        .order_by('quantity')[:20]
    )

    # Stock movements last 30 days by type
    thirty_days_ago = datetime.date.today() - datetime.timedelta(days=30)
    movement_summary = list(
        StockMovement.objects.filter(created_at__date__gte=thirty_days_ago)
        .values('movement_type')
        .annotate(count=Count('id'), total_qty=Sum('quantity'))
        .order_by('movement_type')
    )

    # Top 10 items by stock value (qty only — no price in Stock model)
    top_stock_items = list(
        Stock.objects.filter(quantity__gt=0)
        .select_related('item')
        .values('item__item_code', 'item__item_name', 'item__item_type')
        .annotate(total_qty=Sum('quantity'))
        .order_by('-total_qty')[:10]
    )

    return JsonResponse({
        'total_stock_items':  Stock.objects.filter(quantity__gt=0).count(),
        'low_stock_count':    Stock.objects.filter(quantity__gt=0, quantity__lte=10).count(),
        'stock_by_type': [
            {
                'item_type': s['item__item_type'],
                'total_items': s['total_items'],
                'total_qty':   float(s['total_qty'] or 0),
            } for s in stock_summary
        ],
        'low_stock_items': [
            {
                'item_code':  l['item__item_code'],
                'item_name':  l['item__item_name'],
                'warehouse':  l['warehouse__name'],
                'quantity':   float(l['quantity']),
            } for l in low_stock
        ],
        'movement_summary': [
            {
                'movement_type': m['movement_type'],
                'count':         m['count'],
                'total_qty':     float(m['total_qty'] or 0),
            } for m in movement_summary
        ],
        'top_stock_items': [
            {
                'item_code': t['item__item_code'],
                'item_name': t['item__item_name'],
                'item_type': t['item__item_type'],
                'total_qty': float(t['total_qty'] or 0),
            } for t in top_stock_items
        ],
    })


# ============================================================
# SALES REPORT
# ============================================================
def sales_report(request):
    # Monthly sales value (last 6 months)
    six_months_ago = datetime.date.today() - datetime.timedelta(days=180)
    monthly_sales = list(
        SalesOrder.objects.filter(
            order_date__gte=six_months_ago,
            status__in=['confirmed', 'partial', 'delivered']
        )
        .annotate(month=TruncMonth('order_date'))
        .values('month')
        .annotate(total_value=Sum('total_amount'), order_count=Count('id'))
        .order_by('month')
    )

    # Sales by status
    sales_by_status = list(
        SalesOrder.objects.values('status')
        .annotate(count=Count('id'), total=Sum('total_amount'))
        .order_by('status')
    )

    # Top 5 customers by order value
    top_customers = list(
        SalesOrder.objects.filter(status__in=['confirmed','partial','delivered'])
        .values('customer__customer_name')
        .annotate(total_value=Sum('total_amount'), order_count=Count('id'))
        .order_by('-total_value')[:5]
    )

    # Recent sales orders
    recent_orders = list(
        SalesOrder.objects.select_related('customer')
        .order_by('-order_date')[:10]
        .values('so_number', 'customer__customer_name', 'order_date',
                'total_amount', 'status')
    )

    # Invoice summary
    paid_invoices    = Invoice.objects.filter(status='paid').count()
    pending_invoices = Invoice.objects.filter(status__in=['sent','draft','overdue']).count()

    return JsonResponse({
        'total_sales_orders':  SalesOrder.objects.count(),
        'delivered_orders':    SalesOrder.objects.filter(status='delivered').count(),
        'pending_invoices':    pending_invoices,
        'paid_invoices':       paid_invoices,
        'monthly_sales': [
            {
                'month':       m['month'].strftime('%b %Y'),
                'total_value': float(m['total_value'] or 0),
                'order_count': m['order_count'],
            } for m in monthly_sales
        ],
        'sales_by_status': [
            {
                'status': s['status'],
                'count':  s['count'],
                'total':  float(s['total'] or 0),
            } for s in sales_by_status
        ],
        'top_customers': [
            {
                'customer':    t['customer__customer_name'],
                'total_value': float(t['total_value'] or 0),
                'order_count': t['order_count'],
            } for t in top_customers
        ],
        'recent_orders': [
            {
                'so_number':    o['so_number'],
                'customer':     o['customer__customer_name'],
                'order_date':   str(o['order_date']),
                'total_amount': float(o['total_amount'] or 0),
                'status':       o['status'],
            } for o in recent_orders
        ],
    })


# ============================================================
# FINANCE REPORT
# ============================================================
def finance_report(request):
    # Account balances by category (use account_category field on Account)
    accounts = Account.objects.all()
    by_category = {}
    for acc in accounts:
        cat = acc.account_category
        balance = float(acc.get_balance())
        if cat not in by_category:
            by_category[cat] = {'category': cat, 'total_balance': 0, 'account_count': 0}
        by_category[cat]['total_balance'] += balance
        by_category[cat]['account_count'] += 1

    # Journal entries last 30 days (total_debit is a method, not a field — fetch entries then compute)
    thirty_days_ago = datetime.date.today() - datetime.timedelta(days=30)
    recent_entries_qs = (
        JournalEntry.objects.filter(entry_date__gte=thirty_days_ago)
        .order_by('-entry_date')[:15]
    )

    # Monthly journal entries count (last 6 months) — annotate debit from lines
    from django.db.models import Sum as DSum
    six_months_ago = datetime.date.today() - datetime.timedelta(days=180)
    monthly_entries = list(
        JournalEntry.objects.filter(entry_date__gte=six_months_ago)
        .annotate(month=TruncMonth('entry_date'))
        .values('month')
        .annotate(count=Count('id'), total_debit=DSum('lines__debit_amount'))
        .order_by('month')
    )

    return JsonResponse({
        'total_accounts':        Account.objects.count(),
        'total_journal_entries': JournalEntry.objects.count(),
        'posted_entries':        JournalEntry.objects.filter(status='posted').count(),
        'accounts_by_category':  list(by_category.values()),
        'recent_entries': [
            {
                'entry_number': e.entry_number,
                'entry_date':   str(e.entry_date),
                'description':  e.description,
                'status':       e.status,
                'total_debit':  float(e.total_debits()),
            } for e in recent_entries_qs
        ],
        'monthly_entries': [
            {
                'month':       m['month'].strftime('%b %Y'),
                'count':       m['count'],
                'total_debit': float(m['total_debit'] or 0),
            } for m in monthly_entries
        ],
    })


# ============================================================
# HR REPORT
# ============================================================
def hr_report(request):
    # Employee count by department
    by_dept = list(
        Employee.objects.filter(status='active')
        .values('department__name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Employee count by employment type
    by_type = list(
        Employee.objects.filter(status='active')
        .values('employment_type')
        .annotate(count=Count('id'))
    )

    # Salary summary (latest month processed)
    salary_summary = list(
        SalaryRecord.objects.values('month', 'year')
        .annotate(
            total_gross=Sum('gross_earnings'),
            total_net=Sum('net_salary'),
            total_pf=Sum('pf_deduction'),
            total_esi=Sum('esi_deduction'),
            employee_count=Count('id'),
        )
        .order_by('-year', '-month')[:6]
    )

    # Attendance summary current month
    today = datetime.date.today()
    attendance_this_month = Attendance.objects.filter(
        date__year=today.year, date__month=today.month
    ).values('status').annotate(count=Count('id'))

    # Recent salary records
    recent_salary = list(
        SalaryRecord.objects.select_related('employee')
        .order_by('-year', '-month')[:10]
        .values('employee__first_name', 'employee__last_name',
                'employee__employee_code', 'month', 'year',
                'gross_earnings', 'net_salary', 'status')
    )

    return JsonResponse({
        'total_employees':  Employee.objects.filter(status='active').count(),
        'total_departments': Employee.objects.values('department').distinct().count(),
        'employees_by_dept': [
            {'department': d['department__name'] or 'No Dept', 'count': d['count']}
            for d in by_dept
        ],
        'employees_by_type': [
            {'type': t['employment_type'], 'count': t['count']}
            for t in by_type
        ],
        'salary_summary': [
            {
                'period':         f"{s['month']}/{s['year']}",
                'total_gross':    float(s['total_gross'] or 0),
                'total_net':      float(s['total_net'] or 0),
                'total_pf':       float(s['total_pf'] or 0),
                'total_esi':      float(s['total_esi'] or 0),
                'employee_count': s['employee_count'],
            } for s in salary_summary
        ],
        'attendance_this_month': [
            {'status': a['status'], 'count': a['count']}
            for a in attendance_this_month
        ],
        'recent_salary': [
            {
                'employee':     f"{s['employee__first_name']} {s['employee__last_name']}",
                'emp_code':     s['employee__employee_code'],
                'period':       f"{s['month']}/{s['year']}",
                'gross':        float(s['gross_earnings'] or 0),
                'net':          float(s['net_salary'] or 0),
                'status':       s['status'],
            } for s in recent_salary
        ],
    })
