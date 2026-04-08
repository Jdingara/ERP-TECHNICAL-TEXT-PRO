# ============================================================
# FILE: master_data/doc_series_utils.py
# PURPOSE: Auto-number generator for all document types.
#          Called from every create view to generate codes.
# ============================================================

from django.db import transaction


def generate_next_number(document_type: str):
    """
    Atomically generates and returns the next document number
    for the given document_type.

    Returns:
        str  — the generated number  (e.g., "PO-25-26-001")
        None — if series not found or is_enabled=False
    """
    from master_data.models import DocumentSeries, FinancialYear   # avoid circular import

    with transaction.atomic():
        try:
            series = DocumentSeries.objects.select_for_update().get(
                document_type=document_type
            )
        except DocumentSeries.DoesNotExist:
            return None

        if not series.is_enabled:
            return None

        # Advance counter
        if series.current_number < series.starting_number:
            series.current_number = series.starting_number
        else:
            series.current_number += 1
        series.save(update_fields=['current_number', 'updated_at'])

        # Build number string
        parts = []
        if series.prefix:
            parts.append(series.prefix)
        if series.include_fy:
            fy = FinancialYear.objects.filter(is_active=True).first()
            if fy:
                parts.append(fy.label)
        parts.append(str(series.current_number).zfill(series.padding))

        sep = series.separator if series.separator is not None else ''
        return sep.join(parts)
