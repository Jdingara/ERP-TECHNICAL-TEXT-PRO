from django.urls import path
from . import views

urlpatterns = [
    path('',        views.chat,        name='chat'),
    path('status/', views.chat_status, name='chat-status'),
]
