from django.urls import path
from . import views

urlpatterns = [
    # PD Requests
    path('requests/',                           views.pd_request_list,          name='pd_request_list'),
    path('requests/<int:pk>/',                  views.pd_request_detail,        name='pd_request_detail'),

    # Technical Spec (nested under PD request)
    path('requests/<int:pd_pk>/tech-spec/',     views.tech_spec_save,           name='tech_spec'),

    # Vendor Assignments
    path('requests/<int:pd_pk>/vendors/',       views.vendor_assignment_list,   name='vendor_assignment_list'),
    path('vendor-assignments/<int:pk>/',        views.vendor_assignment_detail, name='vendor_assignment_detail'),

    # Sample Shipments
    path('requests/<int:pd_pk>/shipments/',     views.shipment_list,            name='shipment_list'),
    path('shipments/<int:pk>/',                 views.shipment_detail,          name='shipment_detail'),

    # Sample Invoices
    path('requests/<int:pd_pk>/invoices/',      views.invoice_list,             name='invoice_list'),
    path('invoices/<int:pk>/',                  views.invoice_detail,           name='invoice_detail'),
]
