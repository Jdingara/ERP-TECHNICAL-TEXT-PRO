# ============================================================
# FILE: authentication/views.py
# PURPOSE: Login, logout, dashboard summary, user management,
#          role management, and permission APIs.
# ============================================================

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from datetime import timedelta, date
from django.db.models import Sum
import json
import calendar
import csv
import io

# Module model imports for dashboard
from purchase.models import Lot, PurchaseOrder
from planning.models import ProductionOrder, SalesOrder
from production_exec.models import Batch, ProcessEntry
from quality.models import Inspection
from dispatch.models import DispatchEntry, SalesInvoice
from .models import Role, UserProfile, AuditLog
from master_data.company_utils import get_active_company


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
        company   = get_active_company(request)
        co_filter = {'company': company} if company else {}
        today     = timezone.now().date()

        # ── Lot inventory ─────────────────────────────────────
        available_lots   = Lot.objects.filter(status='available', **co_filter).count()
        low_stock_lots   = Lot.objects.filter(status='available', balance_qty__lte=10, **co_filter).count()

        # ── Purchase ──────────────────────────────────────────
        open_pos = PurchaseOrder.objects.filter(status__in=['draft', 'confirmed', 'partial'], **co_filter).count()

        # ── Production ────────────────────────────────────────
        open_prod_orders  = ProductionOrder.objects.filter(status__in=['planned', 'in_progress'], **co_filter).count()
        open_sales_orders = SalesOrder.objects.filter(status__in=['draft', 'confirmed', 'in_production'], **co_filter).count()

        # ── WIP Batches ───────────────────────────────────────
        wip_batches  = Batch.objects.filter(status__in=['in_process', 'qc_pending'], **co_filter).count()
        qc_pending   = Batch.objects.filter(status='qc_pending', **co_filter).count()

        # ── Quality ───────────────────────────────────────────
        inspections_today = Inspection.objects.filter(inspection_date=today, **co_filter).count()
        rejected_today    = Inspection.objects.filter(inspection_date=today, result='fail', **co_filter).count()

        # ── Dispatch ─────────────────────────────────────────
        dispatched_today  = DispatchEntry.objects.filter(dispatch_date=today, status='confirmed', **co_filter).count()

        # ── Monthly production trend (last 6 months) ──────────
        monthly_production = []
        for i in range(5, -1, -1):
            mo, yr = today.month - i, today.year
            while mo <= 0:
                mo += 12
                yr -= 1
            m_start = date(yr, mo, 1)
            m_end   = date(yr, mo, calendar.monthrange(yr, mo)[1])
            prod_qty = ProcessEntry.objects.filter(
                entry_date__gte=m_start, entry_date__lte=m_end,
                status='confirmed', **co_filter
            ).aggregate(s=Sum('output_quantity'))['s'] or 0
            orders   = ProductionOrder.objects.filter(
                created_at__date__gte=m_start, created_at__date__lte=m_end, **co_filter
            ).count()
            monthly_production.append({
                'month':      m_start.strftime('%b %y'),
                'output_qty': float(prod_qty),
                'orders':     orders,
            })

        # ── Production order status breakdown ─────────────────
        prod_status = {s: ProductionOrder.objects.filter(status=s, **co_filter).count()
                       for s in ['draft', 'planned', 'in_progress', 'completed', 'cancelled']}

        return JsonResponse({
            'available_lots':     available_lots,
            'low_stock_lots':     low_stock_lots,
            'open_purchase_orders': open_pos,
            'open_production_orders': open_prod_orders,
            'open_sales_orders':  open_sales_orders,
            'wip_batches':        wip_batches,
            'qc_pending':         qc_pending,
            'inspections_today':  inspections_today,
            'rejected_today':     rejected_today,
            'dispatched_today':   dispatched_today,
            'monthly_production': monthly_production,
            'prod_status':        prod_status,
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
@require_http_methods(["GET", "PUT"])
def my_profile_view(request):
    """GET/PUT the logged-in user's own profile."""
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not logged in.'}, status=401)

    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if request.method == 'GET':
        return JsonResponse({
            'id':             user.id,
            'username':       user.username,
            'email':          user.email,
            'first_name':     user.first_name,
            'last_name':      user.last_name,
            'is_staff':       user.is_staff,
            'role':           profile.role.name if profile.role else '',
            'designation':    profile.designation,
            'department':     profile.department,
            'phone':          profile.phone,
            'employee_id':    profile.employee_id,
            'date_of_joining': profile.date_of_joining.strftime('%Y-%m-%d') if profile.date_of_joining else '',
            'bio':            profile.bio,
            'avatar':         profile.avatar,
        })

    # PUT — update profile
    data = json.loads(request.body)

    # Update User fields
    user.first_name = data.get('first_name', user.first_name).strip()
    user.last_name  = data.get('last_name',  user.last_name).strip()
    user.email      = data.get('email',      user.email).strip()
    new_password    = data.get('password', '').strip()
    if new_password:
        user.set_password(new_password)
    user.save()

    # Update Profile fields
    profile.designation    = data.get('designation',    profile.designation)
    profile.department     = data.get('department',     profile.department)
    profile.phone          = data.get('phone',          profile.phone)
    profile.employee_id    = data.get('employee_id',    profile.employee_id)
    doj = data.get('date_of_joining', '')
    profile.date_of_joining = doj if doj else None
    profile.bio            = data.get('bio',            profile.bio)
    avatar = data.get('avatar', '')
    if avatar:  # only overwrite if a new image was sent
        profile.avatar = avatar
    profile.save()

    return JsonResponse({'message': 'Profile updated successfully.'})


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


# ============================================================
# AUDIT LOG VIEW
# ============================================================

@require_http_methods(["GET"])
def audit_log_list(request):
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not logged in.'}, status=401)

    logs = AuditLog.objects.select_related('user').all()

    # Non-admins only see their own logs
    if not (request.user.is_staff or request.user.is_superuser):
        logs = logs.filter(user=request.user)

    # Filters
    module    = request.GET.get('module', '').strip()
    action    = request.GET.get('action', '').strip()
    user_id   = request.GET.get('user_id', '').strip()
    from_date = request.GET.get('from_date', '').strip()
    to_date   = request.GET.get('to_date', '').strip()
    search    = request.GET.get('search', '').strip()

    if module:
        logs = logs.filter(module=module)
    if action:
        logs = logs.filter(action=action)
    if user_id:
        logs = logs.filter(user_id=user_id)
    if from_date:
        logs = logs.filter(timestamp__date__gte=from_date)
    if to_date:
        logs = logs.filter(timestamp__date__lte=to_date)
    if search:
        logs = logs.filter(object_repr__icontains=search)

    # Cap at 1000 rows
    logs = logs[:1000]

    result = [{
        'id':           log.id,
        'user':         log.user.username if log.user else 'System',
        'timestamp':    log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        'module':       log.module,
        'action':       log.action,
        'object_repr':  log.object_repr,
        'changes':      log.changes,
    } for log in logs]

    # Distinct module and action lists for filter dropdowns
    all_modules = list(AuditLog.objects.values_list('module', flat=True).distinct().order_by('module'))
    all_actions = list(AuditLog.objects.values_list('action', flat=True).distinct().order_by('action'))
    all_users   = [{'id': u.id, 'username': u.username}
                   for u in User.objects.filter(audit_logs__isnull=False).distinct().order_by('username')]

    return JsonResponse({
        'logs':    result,
        'total':   len(result),
        'modules': all_modules,
        'actions': all_actions,
        'users':   all_users,
    })


# ============================================================
# SUPPORT LOG DOWNLOAD
# ============================================================

@require_http_methods(["GET"])
def support_log_download(request):
    """
    Download a support log CSV containing the last 200 activity
    log entries. Customers send this to the support team so the
    developer can diagnose the issue without guessing.
    """
    if not request.user.is_authenticated:
        return JsonResponse({'message': 'Not logged in.'}, status=401)

    logs = AuditLog.objects.select_related('user').order_by('-timestamp')[:200]

    output   = io.StringIO()
    writer   = csv.writer(output)

    # Header section — system info
    writer.writerow(['SASI ERP — Support Log'])
    writer.writerow(['Generated at', timezone.now().strftime('%Y-%m-%d %H:%M:%S %Z')])
    writer.writerow(['Generated by', request.user.username])
    writer.writerow(['Total entries', logs.count()])
    writer.writerow([])  # blank separator

    # Column headers
    writer.writerow([
        'Timestamp', 'User', 'Module', 'Action',
        'Record', 'Fields Changed', 'Change Detail',
    ])

    for log in logs:
        changes     = log.changes or {}
        change_list = changes.get('changes', [])
        fields_changed = ', '.join(c.get('field', '') for c in change_list) if change_list else ''
        change_detail  = ' | '.join(
            f"{c.get('field','')}: [{c.get('before','')}] → [{c.get('after','')}]"
            for c in change_list
        ) if change_list else ''

        writer.writerow([
            log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            log.user.username if log.user else '(system)',
            log.module,
            log.action,
            log.object_repr,
            fields_changed,
            change_detail,
        ])

    filename = f"SASI_ERP_Support_Log_{timezone.now().strftime('%Y%m%d_%H%M')}.csv"
    response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response['X-Content-Type-Options'] = 'nosniff'
    return response
