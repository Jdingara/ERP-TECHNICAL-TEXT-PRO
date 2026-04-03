# ============================================================
# FILE: production/urls.py
# PURPOSE: URL routes for production module.
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    # Bill of Materials
    path('bom/',                                    views.bom_list_and_create,          name='bom-list'),
    path('bom/<int:bom_id>/',                       views.bom_detail,                   name='bom-detail'),

    # Work Orders
    path('work-orders/',                            views.work_order_list_and_create,   name='wo-list'),
    path('work-orders/<int:wo_id>/complete/',       views.work_order_complete,          name='wo-complete'),

    # Batch Tracking
    path('batches/',                                views.batch_list,                   name='batch-list'),

    # Quality Check
    path('quality-checks/',                         views.quality_check_list_and_create, name='qc-list'),
]
