from django.urls import path
from . import views

urlpatterns = [
    # GST Rate Master
    path('rates/',                              views.gst_rate_list,        name='gst-rate-list'),
    path('rates/<int:pk>/',                     views.gst_rate_detail,      name='gst-rate-detail'),

    # HSN / SAC Codes
    path('hsn/',                                views.hsn_list,             name='hsn-list'),
    path('hsn/<int:pk>/',                       views.hsn_detail,           name='hsn-detail'),
    path('sac/',                                views.sac_list,             name='sac-list'),

    # GST Ledger
    path('ledger/',                             views.gst_ledger_list,      name='gst-ledger'),

    # GSTR-1
    path('gstr1/',                              views.gstr1_list,           name='gstr1-list'),
    path('gstr1/generate/<int:period_id>/',     views.gstr1_generate,       name='gstr1-generate'),

    # GSTR-3B
    path('gstr3b/',                             views.gstr3b_list,          name='gstr3b-list'),

    # e-Invoice (stub)
    path('einvoice/<int:invoice_id>/',          views.einvoice_detail,      name='einvoice-detail'),
    path('einvoice/<int:invoice_id>/generate/', views.einvoice_generate,    name='einvoice-generate'),

    # e-Way Bill (stub)
    path('ewaybill/<int:dispatch_id>/',         views.ewaybill_detail,      name='ewaybill-detail'),
    path('ewaybill/<int:dispatch_id>/generate/',views.ewaybill_generate,    name='ewaybill-generate'),
]
