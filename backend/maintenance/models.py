# ============================================================
# FILE: maintenance/models.py
# PURPOSE: Machine maintenance schedules, logs, escalation
# ============================================================

import uuid
from django.db import models
from master_data.models import Company
from masters.models import Machine


FREQUENCY_CHOICES = [
    ('daily',       'Daily'),
    ('weekly',      'Weekly'),
    ('15_days',     'Every 15 Days'),
    ('monthly',     'Monthly'),
    ('3_monthly',   'Every 3 Months'),
    ('6_monthly',   'Every 6 Months'),
    ('yearly',      'Yearly'),
    ('beam_change', 'Every Beam Change'),
]

TASK_TYPE_CHOICES = [
    ('checklist',   'Checklist (tick done)'),
    ('measurement', 'Measurement (capture values)'),
]

STATUS_CHOICES = [
    ('pending',  'Pending'),
    ('done',     'Done'),
    ('overdue',  'Overdue'),
    ('skipped',  'Skipped'),
]


class MaintenanceTask(models.Model):
    """Template: what maintenance to do, how often, for which machine."""
    company          = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    machine          = models.ForeignKey(Machine, on_delete=models.CASCADE, related_name='maintenance_tasks')
    task_name        = models.CharField(max_length=200)
    frequency        = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    task_type        = models.CharField(max_length=20, choices=TASK_TYPE_CHOICES, default='checklist')
    measurement_labels = models.JSONField(default=list, blank=True)
    # e.g. [{"label": "Before (Hz)", "key": "before"}, {"label": "After (Hz)", "key": "after"}]
    instructions     = models.TextField(blank=True)
    task_image       = models.FileField(upload_to='maintenance/tasks/', blank=True, null=True)
    is_active        = models.BooleanField(default=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.machine.machine_code} — {self.task_name} ({self.frequency})"

    class Meta:
        ordering = ['machine__machine_code', 'frequency', 'task_name']


class MaintenanceEscalation(models.Model):
    """Email / WhatsApp escalation config per machine."""
    company         = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    machine         = models.ForeignKey(Machine, on_delete=models.CASCADE, related_name='escalation_config')
    reminder_days   = models.PositiveIntegerField(default=1, help_text='Days before due to send reminder')
    enable_email    = models.BooleanField(default=False)
    enable_whatsapp = models.BooleanField(default=False)

    level1_name  = models.CharField(max_length=100, blank=True)
    level1_email = models.EmailField(blank=True)
    level1_phone = models.CharField(max_length=20, blank=True)
    level1_grace_hours = models.PositiveIntegerField(default=24, help_text='Hours before escalating to L2')

    level2_name  = models.CharField(max_length=100, blank=True)
    level2_email = models.EmailField(blank=True)
    level2_phone = models.CharField(max_length=20, blank=True)
    level2_grace_hours = models.PositiveIntegerField(default=48, help_text='Hours before escalating to L3')

    level3_name  = models.CharField(max_length=100, blank=True)
    level3_email = models.EmailField(blank=True)
    level3_phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"Escalation — {self.machine.machine_code}"

    class Meta:
        unique_together = ['company', 'machine']


class MaintenanceLog(models.Model):
    """Actual execution record for a maintenance task."""
    company        = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    task           = models.ForeignKey(MaintenanceTask, on_delete=models.CASCADE, related_name='logs')
    due_date       = models.DateField()
    completed_date = models.DateField(null=True, blank=True)
    completed_by   = models.CharField(max_length=100, blank=True)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    measurements   = models.JSONField(default=dict, blank=True)
    remarks        = models.TextField(blank=True)
    escalation_level = models.PositiveIntegerField(default=0)
    notified_at    = models.DateTimeField(null=True, blank=True)
    confirm_token  = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.task} — due {self.due_date} — {self.status}"

    class Meta:
        ordering = ['due_date', 'task__machine__machine_code']
