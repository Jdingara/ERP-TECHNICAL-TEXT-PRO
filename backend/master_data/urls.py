# ============================================================
# FILE: master_data/urls.py
# PURPOSE: URL routes for master data module.
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
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
