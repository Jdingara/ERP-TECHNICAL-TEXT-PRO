# ============================================================
# FILE: inventory/urls.py
# PURPOSE: URL routes for inventory module.
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    # Current stock levels
    path('stock/',          views.stock_list,                       name='stock-list'),

    # Stock movements (in/out history)
    path('movements/',      views.stock_movement_list_and_create,   name='stock-movements'),

    # Summary for dashboard
    path('summary/',        views.stock_summary,                    name='stock-summary'),
]
