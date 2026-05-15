from django.urls import path
from . import views

urlpatterns = [
    # Sales Invoices
    path('si/',                views.si_list,          name='si_list'),
    path('si/<int:pk>/',       views.si_detail,        name='si_detail'),

    # Purchase Invoices
    path('pi/',                views.pi_list,          name='pi_list'),
    path('pi/<int:pk>/',       views.pi_detail,        name='pi_detail'),

    # Payments
    path('payments/',          views.payment_list,     name='payment_list'),
    path('payments/<int:pk>/', views.payment_detail,   name='payment_detail'),

    # Summary
    path('summary/',                  views.finance_summary,          name='finance_summary'),

    # BH Dashboard
    path('dashboard/',                views.bh_dashboard,             name='bh_dashboard'),

    # Reports
    path('reports/order-summary/',    views.report_order_summary,     name='report_order_summary'),
    path('reports/pd-pipeline/',      views.report_pd_pipeline,       name='report_pd_pipeline'),
    path('reports/vendor-performance/',views.report_vendor_performance,name='report_vendor_performance'),
    path('reports/shipment-tracker/', views.report_shipment_tracker,  name='report_shipment_tracker'),
]
