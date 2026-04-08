# ============================================================
# FILE: authentication/audit.py
# PURPOSE: Utility to record audit log entries from any view.
#          Call log_action() after any create / update / delete.
# ============================================================

from .models import AuditLog


def log_action(request, module, action, object_repr, changes=None):
    """
    Write one AuditLog row.

    Parameters
    ----------
    request     : Django request object (used to get the logged-in user)
    module      : human-readable name, e.g. 'Sales Order', 'Item'
    action      : 'Created' | 'Updated' | 'Deleted' | 'Status Changed' | …
    object_repr : document number / name shown in the log, e.g. 'SO-2024-0001'
    changes     : dict with before/after info; pass None for no-detail entries
    """
    user = request.user if (hasattr(request, 'user') and request.user.is_authenticated) else None
    AuditLog.objects.create(
        user        = user,
        module      = module,
        action      = action,
        object_repr = object_repr,
        changes     = changes or {},
    )


def field_diff(before: dict, after: dict, fields: list = None) -> list:
    """
    Compare two snapshots and return a list of changed fields:
        [{'field': 'Status', 'before': 'draft', 'after': 'confirmed'}, ...]

    If `fields` is given, only those keys are compared.
    """
    keys = fields if fields else list(after.keys())
    changes = []
    for k in keys:
        b = str(before.get(k, ''))
        a = str(after.get(k, ''))
        if b != a:
            changes.append({
                'field':  k.replace('_', ' ').title(),
                'before': b,
                'after':  a,
            })
    return changes
