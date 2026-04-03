# ============================================================
# FILE: purchasing/urls.py
# PURPOSE: URL routes for purchasing module.
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    # Purchase Orders
    path('purchase-orders/',                        views.purchase_order_list_and_create,   name='po-list'),
    path('purchase-orders/<int:po_id>/',            views.purchase_order_detail,            name='po-detail'),

    # Goods Receipt (GRN)
    path('grn/',                                    views.goods_receipt_list_and_create,    name='grn-list'),
    path('grn/<int:grn_id>/confirm/',               views.goods_receipt_confirm,            name='grn-confirm'),
]
