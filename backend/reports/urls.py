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

    # Report Maker
    path('maker/sources/',                           views.maker_sources,       name='maker-sources'),
    path('maker/run/',                               views.maker_run,           name='maker-run'),
    path('maker/templates/',                         views.template_list,       name='template-list'),
    path('maker/templates/<int:tmpl_id>/',           views.template_detail,     name='template-detail'),
    path('maker/templates/<int:tmpl_id>/run/',       views.template_run,        name='template-run'),
    path('maker/templates/<int:tmpl_id>/export/',    views.template_export_csv, name='template-export'),
]
