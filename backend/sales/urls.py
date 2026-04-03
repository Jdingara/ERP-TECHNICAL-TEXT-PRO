# ============================================================
# FILE: sales/urls.py
# PURPOSE: URL routes for sales module.
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    # Sales Orders
    path('orders/',                             views.sales_order_list_and_create,  name='so-list'),
    path('orders/<int:so_id>/',                 views.sales_order_detail,           name='so-detail'),
    path('orders/<int:so_id>/deliver/',         views.sales_order_deliver,          name='so-deliver'),

    # Invoices
    path('invoices/',                           views.invoice_list_and_create,      name='invoice-list'),
    path('invoices/<int:invoice_id>/paid/',     views.invoice_mark_paid,            name='invoice-paid'),
]
