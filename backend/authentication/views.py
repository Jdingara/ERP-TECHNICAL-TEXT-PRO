# ============================================================
# FILE: authentication/views.py
# PURPOSE: Handles login and logout API requests.
#          React frontend calls these to log in/out users.
# ============================================================

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

# These imports pull live counts from each module for the dashboard
from inventory.models import Stock
from purchasing.models import PurchaseOrder
from sales.models import SalesOrder
from production.models import WorkOrder
from hr_payroll.models import Employee
from medical_textile.models import CAPA, RegulatoryCompliance, ShelfLifeRecord
from technical_textile.models import Sample, RDProject
from django.utils import timezone
from datetime import timedelta


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    """
    API endpoint: POST /api/authentication/login/
    Receives username and password from React login page.
    Returns user info if correct, error if wrong.
    """
    try:
        # Read username and password from request
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return JsonResponse({'message': 'Username and password are required.'}, status=400)

        # Check if username and password are correct
        user = authenticate(request, username=username, password=password)

        if user is not None:
            # Login successful
            login(request, user)
            return JsonResponse({
                'message': 'Login successful.',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_staff': user.is_staff,
                }
            }, status=200)
        else:
            # Wrong username or password
            return JsonResponse({'message': 'Invalid username or password.'}, status=401)

    except Exception as error:
        return JsonResponse({'message': f'Server error: {str(error)}'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    """
    API endpoint: POST /api/authentication/logout/
    Logs out the current user.
    """
    logout(request)
    return JsonResponse({'message': 'Logged out successfully.'}, status=200)


@require_http_methods(["GET"])
def dashboard_summary_view(request):
    """
    API endpoint: GET /api/authentication/dashboard-summary/
    Returns live KPI counts for the dashboard:
    - Stock items count and low stock alerts
    - Open purchase orders count
    - Open sales orders count
    - Active work orders count
    - Total employees
    - Recent low stock items
    """
    try:
        # Stock: count distinct items in stock and find low stock (qty <= 10)
        total_stock_items = Stock.objects.filter(quantity__gt=0).count()
        low_stock_qs      = list(Stock.objects.filter(
            quantity__gt=0, quantity__lte=10
        ).select_related('item', 'warehouse').order_by('quantity')[:5])
        low_stock_count   = len(low_stock_qs)

        # Purchase Orders: draft + confirmed = open/pending
        open_pos = PurchaseOrder.objects.filter(status__in=['draft', 'confirmed', 'partial']).count()

        # Sales Orders: draft + confirmed = open/pending
        open_sos = SalesOrder.objects.filter(status__in=['draft', 'confirmed']).count()

        # Work Orders: confirmed + in_progress = active
        active_wos = WorkOrder.objects.filter(status__in=['confirmed', 'in_progress']).count()

        # Employees: total active (status field, not is_active)
        total_employees = Employee.objects.filter(status='active').count()

        # Medical Textile: open CAPAs (open + in_progress)
        open_capas = CAPA.objects.filter(status__in=['open', 'in_progress', 'overdue']).count()

        # Medical Textile: certificates expiring within 90 days
        today          = timezone.now().date()
        expiry_cutoff  = today + timedelta(days=90)
        expiring_certs = RegulatoryCompliance.objects.filter(
            expiry_date__gte=today, expiry_date__lte=expiry_cutoff
        ).count()

        # Medical Textile: near-expiry or expired shelf life batches
        near_expiry_batches = ShelfLifeRecord.objects.filter(
            status__in=['near_expiry', 'expired']
        ).count()

        # Technical Textile: samples pending approval (prepared or sent)
        pending_samples = Sample.objects.filter(status__in=['prepared', 'sent']).count()

        # Technical Textile: active R&D projects
        active_rd = RDProject.objects.filter(status__in=['active', 'testing']).count()

        # Recent low stock list for alert panel
        low_stock_list = [{
            'item_code':     s.item.item_code,
            'item_name':     s.item.item_name,
            'quantity':      str(s.quantity),
            'warehouse':     s.warehouse.name,
            'reorder_level': '10',
        } for s in low_stock_qs]

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
        })
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)


@require_http_methods(["GET"])
def current_user_view(request):
    """
    API endpoint: GET /api/authentication/current-user/
    Returns info about the currently logged-in user.
    """
    if request.user.is_authenticated:
        return JsonResponse({
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'is_staff': request.user.is_staff,
            }
        }, status=200)
    else:
        return JsonResponse({'message': 'Not logged in.'}, status=401)
