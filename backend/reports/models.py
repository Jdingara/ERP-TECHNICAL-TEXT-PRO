from django.db import models
from django.contrib.auth.models import User


class ReportTemplate(models.Model):
    """
    A saved custom report created in the Report Maker.
    is_published = True → also shows in the Reports section.
    """
    name         = models.CharField(max_length=200)
    description  = models.CharField(max_length=500, blank=True)
    source_key   = models.CharField(max_length=100)   # key into SOURCES registry
    columns      = models.JSONField(default=list)     # list of selected field keys
    filters      = models.JSONField(default=dict)     # saved filter values
    is_published = models.BooleanField(default=False) # show in Reports section
    created_by   = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.name
