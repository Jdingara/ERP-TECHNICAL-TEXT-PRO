from django.urls import path
from . import views

urlpatterns = [
    # Dispatch Entries
    path('',                          views.dispatch_list,      name='dispatch_list'),
    path('entries/',                  views.dispatch_list,      name='dispatch_entries_list'),
    path('entries/<int:pk>/',         views.dispatch_detail,    name='dispatch_entries_detail'),
    path('entries/<int:pk>/confirm/', views.confirm_dispatch,   name='dispatch_entries_confirm'),
    path('<int:pk>/',                 views.dispatch_detail,    name='dispatch_detail'),
    path('<int:pk>/confirm/',         views.confirm_dispatch,   name='confirm_dispatch'),

    # Sales Invoices
    path('invoices/',                 views.invoice_list,       name='dispatch_invoice_list'),
    path('invoices/<int:pk>/',        views.invoice_detail,     name='dispatch_invoice_detail'),

    # Labels / Barcodes
    path('labels/generate/',          views.generate_labels,    name='generate_labels'),
    path('labels/mark-printed/',      views.mark_labels_printed, name='mark_labels_printed'),
]
