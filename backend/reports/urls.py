from django.urls import path
from . import views

urlpatterns = [
    # Reports
    path('production/',     views.production_report,     name='production_report'),
    path('lot-stock/',      views.lot_stock_report,      name='lot_stock_report'),
    path('quality/',        views.quality_report,        name='quality_report'),
    path('reconciliation/', views.reconciliation_report, name='reconciliation_report'),
    path('tally-export/',   views.tally_export,          name='tally_export'),

    # Analytics
    path('analytics/production-efficiency/', views.analytics_production_efficiency, name='analytics_prod_eff'),
    path('analytics/lot-utilization/',       views.analytics_lot_utilization,       name='analytics_lot_util'),
    path('analytics/quality-trends/',        views.analytics_quality_trends,        name='analytics_quality'),
    path('analytics/vendor-performance/',    views.analytics_vendor_performance,    name='analytics_vendor'),
    path('analytics/dispatch/',              views.analytics_dispatch,              name='analytics_dispatch'),

    # Feed
    path('feed/',           views.feed,                  name='feed'),

    # Finished Goods Inventory
    path('finished-goods/', views.finished_goods_inventory, name='finished_goods'),
]
