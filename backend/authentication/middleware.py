# ============================================================
# FILE: authentication/middleware.py
# PURPOSE: Option B permission enforcement.
#          Runs on EVERY API request.
#          Blocks access at the backend level if user's role
#          does not have permission for the requested module.
#          Staff / superusers always pass through.
# ============================================================

from django.http import JsonResponse

# ── Map API path prefix → which frontend pages cover it ─────
# If the user's role allows ANY of those pages → API is allowed
API_PERMISSIONS = {
    '/api/master-data/':         ['/master-data/items', '/master-data/suppliers',
                                   '/master-data/customers', '/master-data/warehouses'],
    '/api/inventory/':           ['/inventory/stock-list', '/inventory/stock-movement'],
    '/api/purchasing/':          ['/purchasing/purchase-orders', '/purchasing/create-purchase-order',
                                   '/purchasing/goods-receipt'],
    '/api/sales/':               ['/sales/inquiries', '/sales/quotations', '/sales/order-journey',
                                   '/sales/sales-orders', '/sales/create-sales-order'],
    '/api/finance/':             ['/finance/chart-of-accounts', '/finance/journal-entries',
                                   '/finance/trial-balance'],
    '/api/hr/':                  ['/hr-payroll/employees', '/hr-payroll/attendance',
                                   '/hr-payroll/salary'],
    '/api/production/':          ['/production/bill-of-materials', '/production/work-orders',
                                   '/production/create-work-order', '/production/machines'],
    '/api/technical-textile/':   ['/technical-textile/product-categories',
                                   '/technical-textile/performance-specs',
                                   '/technical-textile/samples',
                                   '/technical-textile/data-sheets',
                                   '/technical-textile/testing-lab',
                                   '/technical-textile/rd-projects'],
    '/api/medical-textile/':     ['/medical-textile/compliance',
                                   '/medical-textile/batch-traceability',
                                   '/medical-textile/sterility',
                                   '/medical-textile/capa',
                                   '/medical-textile/audit-trail',
                                   '/medical-textile/shelf-life'],
    '/api/reports/production/':  ['/reports/production'],
    '/api/reports/inventory/':   ['/reports/inventory'],
    '/api/reports/sales/':       ['/reports/sales'],
    '/api/reports/finance/':     ['/reports/finance'],
    '/api/reports/hr/':          ['/reports/hr'],
}

# ── These paths bypass permission checks entirely ────────────
EXEMPT_PREFIXES = [
    '/api/authentication/',   # login, logout, dashboard-summary, roles, users
    '/admin/',
]


class RolePermissionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        # Always exempt certain paths
        if any(path.startswith(p) for p in EXEMPT_PREFIXES):
            return self.get_response(request)

        # Only enforce on API paths
        if not path.startswith('/api/'):
            return self.get_response(request)

        # Not authenticated yet — let DRF's permission classes handle it
        if not request.user.is_authenticated:
            return self.get_response(request)

        # Staff / superuser — full access, no restriction
        if request.user.is_staff or request.user.is_superuser:
            return self.get_response(request)

        # Get role from user profile
        try:
            role = request.user.profile.role
        except Exception:
            return JsonResponse(
                {'message': 'No profile found. Contact administrator.'},
                status=403
            )

        if not role:
            return JsonResponse(
                {'message': 'No role assigned to your account. Contact administrator.'},
                status=403
            )

        user_pages = set(role.allowed_pages)

        # Find which permission set covers this API path
        required_pages = None
        for api_prefix, pages in API_PERMISSIONS.items():
            if path.startswith(api_prefix):
                required_pages = set(pages)
                break

        # Unknown API prefix — allow (new modules not yet mapped)
        if required_pages is None:
            return self.get_response(request)

        # Allow if user has at least one matching page permission
        if user_pages & required_pages:
            return self.get_response(request)

        return JsonResponse(
            {'message': f'Access denied. Your role "{role.name}" does not have permission for this module.'},
            status=403
        )
