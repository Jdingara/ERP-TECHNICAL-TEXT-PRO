# ============================================================
# FILE: authentication/models.py
# PURPOSE: Role and UserProfile models for access control.
#          Role stores which pages a user can access.
#          UserProfile links a Django user to a Role.
# ============================================================

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Role(models.Model):
    """
    A named role (e.g. "QC Inspector", "Sales Manager").
    Stores a list of page paths the role is allowed to access.
    """
    name          = models.CharField(max_length=100, unique=True)
    description   = models.CharField(max_length=255, blank=True)
    allowed_pages = models.JSONField(default=list)   # e.g. ["/inventory/stock-list", "/reports/inventory"]
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    """
    Extends Django's built-in User with a Role assignment and personal profile.
    Created automatically when a new user is created via ERP.
    """
    user            = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role            = models.ForeignKey(Role, null=True, blank=True, on_delete=models.SET_NULL)

    # Personal / official info
    designation     = models.CharField(max_length=100, blank=True)
    department      = models.CharField(max_length=100, blank=True)
    phone           = models.CharField(max_length=20,  blank=True)
    employee_id     = models.CharField(max_length=50,  blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    bio             = models.TextField(blank=True)

    # Profile picture stored as base64 data URL
    avatar          = models.TextField(blank=True)

    def __str__(self):
        return f"{self.user.username} → {self.role.name if self.role else 'No Role'}"


# ============================================================
# AUDIT LOG — tracks every create / update / delete / action
# ============================================================

class AuditLog(models.Model):
    user        = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='audit_logs')
    timestamp   = models.DateTimeField(default=timezone.now, db_index=True)
    module      = models.CharField(max_length=100, db_index=True)   # e.g. "Sales Order"
    action      = models.CharField(max_length=50, db_index=True)    # e.g. "Created"
    object_repr = models.CharField(max_length=200)                  # e.g. "SO-2024-0001"
    changes     = models.JSONField(default=dict, blank=True)        # before/after data

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        u = self.user.username if self.user else 'System'
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {u} — {self.action} {self.module}: {self.object_repr}"
