from django.urls import path
from . import views

urlpatterns = [
    # Tasks (schedule master)
    path('tasks/',                          views.task_list,          name='maintenance_task_list'),
    path('tasks/<int:pk>/',                views.task_detail,        name='maintenance_task_detail'),
    path('tasks/<int:pk>/upload-image/',   views.task_upload_image,  name='maintenance_task_upload_image'),

    # Logs (execution records)
    path('logs/',                          views.log_list,     name='maintenance_log_list'),
    path('logs/<int:pk>/complete/',        views.log_complete, name='maintenance_log_complete'),

    # Alerts
    path('alerts/',           views.due_alerts,        name='maintenance_alerts'),

    # Escalation config
    path('escalation/',           views.escalation_list,   name='maintenance_escalation_list'),
    path('escalation/<int:pk>/',  views.escalation_detail, name='maintenance_escalation_detail'),
]
