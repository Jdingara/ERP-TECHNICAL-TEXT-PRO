# ============================================================
# FILE: traceability/models.py
# PURPOSE: Traceability search index — USP of the system
#          Links: Lot → Process Entry → Batch → Dispatch → Customer
#          This model is auto-populated; never entered manually
# ============================================================

from django.db import models
from master_data.models import Company
from purchase.models import Lot
from production_exec.models import Batch, ProcessEntry
from dispatch.models import DispatchEntry


class TraceabilityRecord(models.Model):
    """
    One record per lot-batch-dispatch link.
    Auto-created when process entries are confirmed and dispatches are done.
    Used for fast traceability search.
    """
    company        = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)

    # Raw material end
    lot            = models.ForeignKey(Lot, on_delete=models.CASCADE, related_name='trace_records')
    lot_number     = models.CharField(max_length=50, db_index=True)
    material_name  = models.CharField(max_length=200)

    # Production end
    process_entry  = models.ForeignKey(ProcessEntry, on_delete=models.SET_NULL, null=True, blank=True)
    batch          = models.ForeignKey(Batch, on_delete=models.SET_NULL, null=True, blank=True, related_name='trace_records')
    batch_number   = models.CharField(max_length=50, db_index=True)
    process_stage  = models.CharField(max_length=100)
    machine_used   = models.CharField(max_length=100)
    production_date = models.DateField(null=True, blank=True)

    # Dispatch end
    dispatch       = models.ForeignKey(DispatchEntry, on_delete=models.SET_NULL, null=True, blank=True)
    dispatch_number = models.CharField(max_length=50, blank=True, db_index=True)
    customer_name  = models.CharField(max_length=200, blank=True)
    dispatch_date  = models.DateField(null=True, blank=True)

    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f"{self.lot_number} → {self.batch_number}"
    class Meta: ordering = ['-created_at']
