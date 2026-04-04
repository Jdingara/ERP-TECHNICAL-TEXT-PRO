# ============================================================
# FILE: authentication/urls.py
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    path('login/',              views.login_view,            name='login'),
    path('logout/',             views.logout_view,           name='logout'),
    path('current-user/',       views.current_user_view,     name='current-user'),
    path('dashboard-summary/',  views.dashboard_summary_view,name='dashboard-summary'),
    path('my-permissions/',     views.my_permissions_view,   name='my-permissions'),

    # Role management (admin only)
    path('roles/',              views.role_list_view,        name='role-list'),
    path('roles/<int:role_id>/',views.role_detail_view,      name='role-detail'),

    # User management (admin only)
    path('users/',              views.user_list_view,        name='user-list'),
    path('users/<int:user_id>/',views.user_detail_view,      name='user-detail'),
]
