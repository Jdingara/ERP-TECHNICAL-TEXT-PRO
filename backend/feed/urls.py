# ============================================================
# FILE: feed/urls.py
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    path('',          views.feed,      name='feed'),
    path('ai-status/', views.ai_status, name='feed-ai-status'),
]
