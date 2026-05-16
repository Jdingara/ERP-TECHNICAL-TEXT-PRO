from django.urls import path
from . import views

urlpatterns = [
    # TDS Sections
    path('sections/',                           views.tds_section_list,         name='tds-section-list'),
    path('sections/<int:pk>/',                  views.tds_section_detail,       name='tds-section-detail'),

    # Vendor TDS Config
    path('vendor-config/<int:vendor_id>/',      views.vendor_tds_config,        name='vendor-tds-config'),

    # TDS Deductions
    path('deductions/',                         views.tds_deduction_list,       name='tds-deduction-list'),
    path('deductions/<int:pk>/deposit/',        views.tds_mark_deposited,       name='tds-mark-deposited'),

    # TDS Returns (26Q/27Q/24Q)
    path('returns/',                            views.tds_return_list,          name='tds-return-list'),

    # TCS Sections
    path('tcs/sections/',                       views.tcs_section_list,         name='tcs-section-list'),

    # TCS Collections
    path('tcs/collections/',                    views.tcs_collection_list,      name='tcs-collection-list'),
    path('tcs/collections/<int:pk>/deposit/',   views.tcs_mark_deposited,       name='tcs-mark-deposited'),

    # Dashboard
    path('dashboard/',                          views.tds_tcs_dashboard,        name='tds-tcs-dashboard'),
]
