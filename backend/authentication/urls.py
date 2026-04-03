# ============================================================
# FILE: authentication/urls.py
# PURPOSE: URL routes for authentication module.
#          Maps URL paths to view functions.
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    # POST /api/authentication/login/  → login_view
    path('login/', views.login_view, name='login'),

    # POST /api/authentication/logout/ → logout_view
    path('logout/', views.logout_view, name='logout'),

    # GET /api/authentication/current-user/ → current_user_view
    path('current-user/', views.current_user_view, name='current-user'),

    # GET /api/authentication/dashboard-summary/ → live KPI data for dashboard
    path('dashboard-summary/', views.dashboard_summary_view, name='dashboard-summary'),
]
