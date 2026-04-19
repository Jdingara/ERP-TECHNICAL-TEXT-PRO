from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/',      views.lot_stock_dashboard,   name='lot_stock_dashboard'),
    path('movements/',      views.lot_movements,         name='lot_movements'),
    path('adjustments/',    views.stock_adjustment_list, name='stock_adjustment_list'),
]
