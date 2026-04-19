from django.urls import path
from . import views

urlpatterns = [
    # Purchase Orders
    path('po/',                    views.po_list,           name='po_list'),
    path('po/<int:pk>/',           views.po_detail,         name='po_detail'),

    # GRN
    path('grn/',                   views.grn_list,          name='grn_list'),
    path('grn/<int:pk>/',          views.grn_detail,        name='grn_detail'),
    path('grn/confirm-lots/',      views.grn_confirm_lots,  name='grn_confirm_lots'),

    # Lots
    path('lots/',                  views.lot_list,          name='lot_list'),
    path('lots/<int:pk>/',         views.lot_detail,        name='lot_detail'),

    # Purchase Invoices
    path('invoices/',              views.invoice_list,      name='invoice_list'),
    path('invoices/<int:pk>/',     views.invoice_detail,    name='invoice_detail'),
]
