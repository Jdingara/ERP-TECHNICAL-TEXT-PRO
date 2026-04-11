# ============================================================
# FILE: analytics/urls.py
# PURPOSE: URL routes for the Customer Intelligence analytics module.
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    path('summary/',  views.summary,  name='analytics-summary'),
    path('rfm/',      views.rfm,      name='analytics-rfm'),
    path('churn/',    views.churn,    name='analytics-churn'),
    path('forecast/', views.forecast, name='analytics-forecast'),
    path('products/', views.products, name='analytics-products'),
    path('whatif/',   views.whatif,   name='analytics-whatif'),
]
