# ============================================================
# FILE: master_data/urls.py
# PURPOSE: URL routes for master data module.
# ============================================================

from django.urls import path
from . import views
from . import settings_views

urlpatterns = [

    # ── Settings: Financial Year ──────────────────────────────
    path('settings/financial-years/',                   settings_views.financial_year_list_create,  name='fy-list'),
    path('settings/financial-years/<int:fy_id>/activate/', settings_views.financial_year_activate,  name='fy-activate'),
    path('settings/financial-years/<int:fy_id>/delete/',   settings_views.financial_year_delete,    name='fy-delete'),

    # ── Settings: Document Series ─────────────────────────────
    path('settings/document-series/',                        settings_views.document_series_list,    name='series-list'),
    path('settings/document-series/<int:series_id>/',        settings_views.document_series_update,  name='series-update'),
    path('settings/document-series/<int:series_id>/reset/',  settings_views.document_series_reset,   name='series-reset'),
    path('settings/series-enabled/',                         settings_views.series_enabled_map,      name='series-enabled'),

    # ── Settings: Message Templates ───────────────────────────
    path('settings/message-templates/',                      settings_views.message_template_list,   name='msg-tmpl-list'),
    path('settings/message-templates/<str:doc_type>/',       settings_views.message_template_update, name='msg-tmpl-update'),


    # Units of Measure
    path('units/',              views.unit_of_measure_list_and_create,  name='unit-list'),

    # Item Categories
    path('categories/',         views.item_category_list_and_create,    name='category-list'),

    # Items
    path('items/',              views.item_list_and_create,             name='item-list'),
    path('items/<int:item_id>/',views.item_detail_update_delete,        name='item-detail'),

    # Suppliers
    path('suppliers/',                          views.supplier_list_and_create,         name='supplier-list'),
    path('suppliers/<int:supplier_id>/',        views.supplier_detail_update_delete,    name='supplier-detail'),

    # Customers
    path('customers/',                          views.customer_list_and_create,         name='customer-list'),
    path('customers/<int:customer_id>/',        views.customer_detail_update_delete,    name='customer-detail'),

    # Warehouses
    path('warehouses/',                             views.warehouse_list_and_create,        name='warehouse-list'),
    path('warehouses/<int:warehouse_id>/',           views.warehouse_detail_update,           name='warehouse-detail'),
]
