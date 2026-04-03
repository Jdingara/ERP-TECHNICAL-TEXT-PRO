# ============================================================
# FILE: reports/urls.py
# PURPOSE: URL routes for all report endpoints.
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    path('production/', views.production_report, name='report-production'),
    path('inventory/',  views.inventory_report,  name='report-inventory'),
    path('sales/',      views.sales_report,       name='report-sales'),
    path('finance/',    views.finance_report,     name='report-finance'),
    path('hr/',         views.hr_report,          name='report-hr'),
]
