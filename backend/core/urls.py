# ============================================================
# FILE: core/urls.py
# PURPOSE: Main URL configuration for the entire ERP backend.
#          All module URLs are registered here under /api/
# ============================================================

from django.contrib import admin
from django.urls import path, include

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

    # More modules will be added here as we build them:
    # path('api/inventory/',     include('inventory.urls')),
    # path('api/purchasing/',    include('purchasing.urls')),
    # path('api/sales/',         include('sales.urls')),
    # path('api/finance/',       include('finance.urls')),
    # path('api/hr-payroll/',    include('hr_payroll.urls')),
    # path('api/production/',    include('production.urls')),
]
