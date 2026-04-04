# ============================================================
# FILE: authentication/models.py
# PURPOSE: Role and UserProfile models for access control.
#          Role stores which pages a user can access.
#          UserProfile links a Django user to a Role.
# ============================================================

from django.db import models
from django.contrib.auth.models import User


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
    Extends Django's built-in User with a Role assignment.
    Created automatically when a new user is created via ERP.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.ForeignKey(Role, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"{self.user.username} → {self.role.name if self.role else 'No Role'}"
