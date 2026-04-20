from django.urls import path
from . import views

urlpatterns = [
    # Sales Orders
    path('so/',                              views.so_list,           name='so_list'),
    path('so/<int:pk>/',                     views.so_detail,         name='so_detail'),
    path('sales-orders/',                    views.so_list,           name='so_list_alias'),
    path('sales-orders/<int:pk>/',           views.so_detail,         name='so_detail_alias'),

    # Production Orders
    path('production-orders/',               views.prod_order_list,   name='prod_order_list'),
    path('production-orders/<int:pk>/',      views.prod_order_detail, name='prod_order_detail'),

    # Daily Plans (alias for frontend calling daily-plan singular)
    path('daily-plans/',                     views.daily_plan_list,   name='daily_plan_list'),
    path('daily-plans/<int:pk>/',            views.daily_plan_detail, name='daily_plan_detail'),
    path('daily-plan/',                      views.daily_plan_list,   name='daily_plan_list_alias'),
    path('daily-plan/<int:pk>/',             views.daily_plan_detail, name='daily_plan_detail_alias'),

    # Customer Forecast
    path('forecasts/',                       views.forecast_list,     name='forecast_list'),
    path('forecasts/<int:pk>/',              views.forecast_detail,   name='forecast_detail'),

    # Procurement Plan (BOM explosion)
    path('forecasts/<int:pk>/procurement/',  views.procurement_plan,  name='procurement_plan'),
]
