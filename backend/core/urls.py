# ============================================================
# FILE: core/urls.py
# PURPOSE: Main URL configuration for the entire ERP backend.
#          All module URLs are registered here under /api/
# ============================================================

from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
import os

urlpatterns = [
    # Django admin panel
    path('admin/', admin.site.urls),

    # Authentication module - login, logout, current user
    path('api/authentication/', include('authentication.urls')),

    # Master data - items, suppliers, customers, warehouses
    path('api/master-data/', include('master_data.urls')),

    # Inventory module - stock, movements
    path('api/inventory/', include('inventory.urls')),

    # Purchasing module - purchase orders, GRN
    path('api/purchasing/', include('purchasing.urls')),

    # Sales module - sales orders, invoices
    path('api/sales/', include('sales.urls')),

    # Finance module - accounts, journal entries, reports
    path('api/finance/', include('finance.urls')),

    # HR & Payroll module
    path('api/hr/', include('hr_payroll.urls')),

    # Production module - BOM, work orders, batches, quality
    path('api/production/', include('production.urls')),

    # Technical Textile module
    path('api/technical-textile/', include('technical_textile.urls')),

    # Medical Textile module
    path('api/medical-textile/', include('medical_textile.urls')),

    # Reports module
    path('api/reports/', include('reports.urls')),

    # Dashboard API
    path('api/dashboard/', include('dashboard.urls')),

    # Customer Intelligence Analytics
    path('api/analytics/', include('analytics.urls')),
]

# ── Serve React frontend in production ───────────────────────
# When deployed on Render, Django serves the React build.
# Any URL that is NOT /api/ or /admin/ goes to React's index.html
# React Router then handles the navigation on the client side.
frontend_build = settings.BASE_DIR / 'frontend_build'
if os.path.exists(frontend_build):
    from django.views.static import serve as static_serve
    urlpatterns += [
        # React static assets (JS, CSS, images)
        re_path(r'^static/(?P<path>.*)$', static_serve,
                {'document_root': frontend_build / 'static'}),
        # All other routes → React index.html (React Router handles it)
        re_path(r'^(?!api/|admin/).*$',
                TemplateView.as_view(template_name='index.html'),
                name='react-app'),
    ]
    # Tell Django where to find the React index.html
    from django.template.loaders.filesystem import Loader
    settings.TEMPLATES[0]['DIRS'] = [frontend_build]
