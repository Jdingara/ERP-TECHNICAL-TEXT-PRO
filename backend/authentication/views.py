# ============================================================
# FILE: authentication/views.py
# PURPOSE: Login, logout, dashboard summary, user management,
#          role management, and permission APIs.
# ============================================================

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from datetime import timedelta, date
from django.db.models import Sum
import json
import calendar

# Module model imports for dashboard
from inventory.models import Stock
from purchasing.models import PurchaseOrder
from sales.models import SalesOrder, Invoice
from production.models import WorkOrder
from hr_payroll.models import Employee
from medical_textile.models import CAPA, RegulatoryCompliance, ShelfLifeRecord
from technical_textile.models import Sample, RDProject
from finance.models import Account
from .models import Role, UserProfile


# ============================================================
# AUTH VIEWS
# ============================================================

@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    try:
        data     = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        if not username or not password:
            return JsonResponse({'message': 'Username and password are required.'}, status=400)
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({
                'message': 'Login successful.',
                'user': {
                    'id':         user.id,
                    'username':   user.username,
                    'email':      user.email,
                    'first_name': user.first_name,
                    'last_name':  user.last_name,
                    'is_staff':   user.is_staff,
                }
            }, status=200)
        else:
            return JsonResponse({'message': 'Invalid username or password.'}, status=401)
    except Exception as e:
        return JsonResponse({'message': f'Server error: {str(e)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({'message': 'Logged out successfully.'}, status=200)


@require_http_methods(["GET"])
def current_user_view(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'user': {
                'id':         request.user.id,
                'username':   request.user.username,
                'email':      request.user.email,
                'first_name': request.user.first_name,
                'last_name':  request.user.last_name,
                'is_staff':   request.user.is_staff,
            }
        }, status=200)
    return JsonResponse({'message': 'Not logged in.'}, status=401)


# ============================================================
# MY PERMISSIONS VIEW
# Called right after login to get what pages this user can see
# ============================================================

@require_http_methods(["GET"])
def my_permissions_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not logged in.'}, status=401)

    # Staff / superuser — full access
    if request.user.is_staff or request.user.is_superuser:
        return JsonResponse({'is_admin': True, 'permissions': 'all', 'role': 'Administrator'})

    try:
        role = request.user.profile.role
    except Exception:
        return JsonResponse({'is_admin': False, 'permissions': [], 'role': None})

    if not role:
        return JsonResponse({'is_admin': False, 'permissions': [], 'role': None})

    return JsonResponse({
        'is_admin':    False,
        'permissions': role.allowed_pages,
        'role':        role.name,
    })


# ============================================================
# DASHBOARD SUMMARY VIEW
# ============================================================

@require_http_methods(["GET"])
def dashboard_summary_view(request):
    try:
        total_stock_items = Stock.objects.filter(quantity__gt=0).count()
        low_stock_qs      = list(Stock.objects.filter(
            quantity__gt=0, quantity__lte=10
        ).select_related('item', 'warehouse').order_by('quantity')[:5])
        low_stock_count   = len(low_stock_qs)

        open_pos  = PurchaseOrder.objects.filter(status__in=['draft', 'confirmed', 'partial']).count()
        open_sos  = SalesOrder.objects.filter(status__in=['draft', 'confirmed']).count()
        active_wos = WorkOrder.objects.filter(status__in=['confirmed', 'in_progress']).count()
        total_employees = Employee.objects.filter(status='active').count()

        open_capas    = CAPA.objects.filter(status__in=['open', 'in_progress', 'overdue']).count()
        today         = timezone.now().date()
        expiry_cutoff = today + timedelta(days=90)
        expiring_certs     = RegulatoryCompliance.objects.filter(
            expiry_date__gte=today, expiry_date__lte=expiry_cutoff
        ).count()
        near_expiry_batches = ShelfLifeRecord.objects.filter(
            status__in=['near_expiry', 'expired']
        ).count()
        pending_samples = Sample.objects.filter(status__in=['prepared', 'sent']).count()
        active_rd       = RDProject.objects.filter(status__in=['active', 'testing']).count()

        low_stock_list = [{
            'item_code':     s.item.item_code,
            'item_name':     s.item.item_name,
            'quantity':      str(s.quantity),
            'warehouse':     s.warehouse.name,
            'reorder_level': '10',
        } for s in low_stock_qs]

        # ── Invoice / AR summary ──────────────────────────────
        total_invoiced  = float(Invoice.objects.aggregate(s=Sum('total_amount'))['s'] or 0)
        total_paid_amt  = float(Invoice.objects.filter(status='paid').aggregate(s=Sum('total_amount'))['s'] or 0)
        outstanding_ar  = float(Invoice.objects.exclude(status__in=['paid', 'draft']).aggregate(s=Sum('balance_due'))['s'] or 0)
        overdue_invoices = Invoice.objects.filter(status='overdue').count()

        # ── AR Aging buckets ──────────────────────────────────
        unpaid_inv = Invoice.objects.exclude(status__in=['paid', 'draft'])
        ar_current = float(unpaid_inv.filter(due_date__gte=today).aggregate(s=Sum('balance_due'))['s'] or 0)
        ar_30      = float(unpaid_inv.filter(due_date__lt=today, due_date__gte=today - timedelta(days=30)).aggregate(s=Sum('balance_due'))['s'] or 0)
        ar_60      = float(unpaid_inv.filter(due_date__lt=today - timedelta(days=30), due_date__gte=today - timedelta(days=60)).aggregate(s=Sum('balance_due'))['s'] or 0)
        ar_90plus  = float(unpaid_inv.filter(due_date__lt=today - timedelta(days=60)).aggregate(s=Sum('balance_due'))['s'] or 0)

        # ── Monthly revenue trend (last 6 months) ─────────────
        monthly_revenue = []
        for i in range(5, -1, -1):
            mo, yr = today.month - i, today.year
            while mo <= 0:
                mo += 12
                yr -= 1
            m_start = date(yr, mo, 1)
            m_end   = date(yr, mo, calendar.monthrange(yr, mo)[1])
            rev = float(SalesOrder.objects.filter(
                order_date__gte=m_start, order_date__lte=m_end,
                status__in=['confirmed', 'partial', 'delivered']
            ).aggregate(s=Sum('total_amount'))['s'] or 0)
            cnt = SalesOrder.objects.filter(order_date__gte=m_start, order_date__lte=m_end).count()
            monthly_revenue.append({'month': m_start.strftime('%b %y'), 'revenue': rev, 'orders': cnt})

        # ── SO status breakdown ───────────────────────────────
        so_status = {s: SalesOrder.objects.filter(status=s).count()
                     for s in ['draft', 'confirmed', 'partial', 'delivered', 'cancelled']}

        # ── P&L from finance (posted journal entries) ─────────
        try:
            income_accounts  = list(Account.objects.filter(account_category='income', is_active=True))
            expense_accounts = list(Account.objects.filter(account_category='expense', is_active=True))
            pl_income  = float(sum(a.get_balance() for a in income_accounts))
            pl_expense = float(sum(a.get_balance() for a in expense_accounts))
        except Exception:
            pl_income, pl_expense = 0.0, 0.0
        pl_net = pl_income - pl_expense

        return JsonResponse({
            'total_stock_items':    total_stock_items,
            'low_stock_count':      low_stock_count,
            'open_purchase_orders': open_pos,
            'open_sales_orders':    open_sos,
            'active_work_orders':   active_wos,
            'total_employees':      total_employees,
            'open_capas':           open_capas,
            'expiring_certs':       expiring_certs,
            'near_expiry_batches':  near_expiry_batches,
            'pending_samples':      pending_samples,
            'active_rd_projects':   active_rd,
            'low_stock_items':      low_stock_list,
            # Finance / AR
            'total_invoiced':       total_invoiced,
            'total_paid':           total_paid_amt,
            'outstanding_ar':       outstanding_ar,
            'overdue_invoices':     overdue_invoices,
            'ar_aging': {
                'current':  ar_current,
                'days_30':  ar_30,
                'days_60':  ar_60,
                'days_90p': ar_90plus,
            },
            'monthly_revenue':  monthly_revenue,
            'so_status':        so_status,
            'pl_income':        pl_income,
            'pl_expense':       pl_expense,
            'pl_net':           pl_net,
        })
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


# ============================================================
# ROLE MANAGEMENT VIEWS (admin only)
# ============================================================

def _require_admin(request):
    """Returns error response if user is not staff. Returns None if OK."""
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not logged in.'}, status=401)
    if not (request.user.is_staff or request.user.is_superuser):
        return JsonResponse({'message': 'Admin access required.'}, status=403)
    return None


@csrf_exempt
@require_http_methods(["GET", "POST"])
def role_list_view(request):
    err = _require_admin(request)
    if err:
        return err

    if request.method == 'GET':
        roles = Role.objects.all().order_by('name')
        return JsonResponse([{
            'id':            r.id,
            'name':          r.name,
            'description':   r.description,
            'allowed_pages': r.allowed_pages,
            'user_count':    UserProfile.objects.filter(role=r).count(),
        } for r in roles], safe=False)

    # POST — create role
    data = json.loads(request.body)
    name = data.get('name', '').strip()
    if not name:
        return JsonResponse({'message': 'Role name is required.'}, status=400)
    if Role.objects.filter(name__iexact=name).exists():
        return JsonResponse({'message': 'A role with this name already exists.'}, status=400)
    role = Role.objects.create(
        name          = name,
        description   = data.get('description', ''),
        allowed_pages = data.get('allowed_pages', []),
    )
    return JsonResponse({'message': 'Role created.', 'id': role.id}, status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def role_detail_view(request, role_id):
    err = _require_admin(request)
    if err:
        return err

    try:
        role = Role.objects.get(id=role_id)
    except Role.DoesNotExist:
        return JsonResponse({'message': 'Role not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({
            'id':            role.id,
            'name':          role.name,
            'description':   role.description,
            'allowed_pages': role.allowed_pages,
        })

    if request.method == 'PUT':
        data = json.loads(request.body)
        role.name          = data.get('name', role.name).strip()
        role.description   = data.get('description', role.description)
        role.allowed_pages = data.get('allowed_pages', role.allowed_pages)
        role.save()
        return JsonResponse({'message': 'Role updated.'})

    if request.method == 'DELETE':
        if UserProfile.objects.filter(role=role).exists():
            return JsonResponse(
                {'message': 'Cannot delete — users are assigned to this role.'},
                status=400
            )
        role.delete()
        return JsonResponse({'message': 'Role deleted.'})


# ============================================================
# USER MANAGEMENT VIEWS (admin only)
# ============================================================

@csrf_exempt
@require_http_methods(["GET", "POST"])
def user_list_view(request):
    err = _require_admin(request)
    if err:
        return err

    if request.method == 'GET':
        users = User.objects.all().order_by('username').select_related('profile__role')
        result = []
        for u in users:
            try:
                role = u.profile.role
                role_data = {'id': role.id, 'name': role.name} if role else None
            except Exception:
                role_data = None
            result.append({
                'id':         u.id,
                'username':   u.username,
                'email':      u.email,
                'first_name': u.first_name,
                'last_name':  u.last_name,
                'is_staff':   u.is_staff,
                'is_active':  u.is_active,
                'role':       role_data,
                'date_joined': u.date_joined.strftime('%Y-%m-%d'),
            })
        return JsonResponse(result, safe=False)

    # POST — create user
    data     = json.loads(request.body)
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    if not username or not password:
        return JsonResponse({'message': 'Username and password are required.'}, status=400)
    if User.objects.filter(username=username).exists():
        return JsonResponse({'message': 'Username already taken.'}, status=400)

    user = User.objects.create_user(
        username   = username,
        password   = password,
        email      = data.get('email', ''),
        first_name = data.get('first_name', ''),
        last_name  = data.get('last_name', ''),
        is_staff   = data.get('is_staff', False),
    )

    # Create profile and assign role
    role_id = data.get('role_id')
    role    = Role.objects.filter(id=role_id).first() if role_id else None
    UserProfile.objects.create(user=user, role=role)

    return JsonResponse({'message': f'User "{username}" created successfully.', 'id': user.id}, status=201)


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def user_detail_view(request, user_id):
    err = _require_admin(request)
    if err:
        return err

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({'message': 'User not found.'}, status=404)

    if request.method == 'DELETE':
        if user == request.user:
            return JsonResponse({'message': 'Cannot delete your own account.'}, status=400)
        user.delete()
        return JsonResponse({'message': 'User deleted.'})

    # PUT — update user
    data = json.loads(request.body)
    user.email      = data.get('email',      user.email)
    user.first_name = data.get('first_name', user.first_name)
    user.last_name  = data.get('last_name',  user.last_name)
    user.is_staff   = data.get('is_staff',   user.is_staff)
    user.is_active  = data.get('is_active',  user.is_active)

    # Reset password if provided
    new_password = data.get('password', '').strip()
    if new_password:
        user.set_password(new_password)

    user.save()

    # Update role
    if 'role_id' in data:
        role_id = data['role_id']
        role    = Role.objects.filter(id=role_id).first() if role_id else None
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = role
        profile.save()

    return JsonResponse({'message': f'User "{user.username}" updated.'})
