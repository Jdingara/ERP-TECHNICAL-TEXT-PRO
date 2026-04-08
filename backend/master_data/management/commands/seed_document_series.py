# ============================================================
# Management Command: seed_document_series
# Run: python manage.py seed_document_series
# Creates default DocumentSeries rows for every document type.
# Safe to run multiple times — only creates if not present.
# ============================================================

from django.core.management.base import BaseCommand
from master_data.models import DocumentSeries

DEFAULTS = [
    # doc_type           prefix    sep  pad  start  fy
    ('item',             'IT',     '-', 3,   1,     False),
    ('warehouse',        'WH',     '-', 3,   1,     False),
    ('supplier',         'SUP',    '-', 3,   1,     False),
    ('customer',         'CUS',    '-', 3,   1,     False),
    ('employee',         'EMP',    '-', 3,   1,     False),
    ('purchase_order',   'PO',     '-', 3,   1,     True),
    ('grn',              'GRN',    '-', 3,   1,     True),
    ('inquiry',          'INQ',    '-', 3,   1,     True),
    ('quotation',        'QT',     '-', 3,   1,     True),
    ('sales_order',      'SO',     '-', 3,   1,     True),
    ('invoice',          'INV',    '-', 3,   1,     True),
    ('work_order',       'WO',     '-', 3,   1,     True),
    ('batch',            'BAT',    '-', 3,   1,     True),
    ('stock_adjustment', 'ADJ',    '-', 3,   1,     False),
    ('capa',             'CAPA',   '-', 3,   1,     False),
    ('sample',           'SMP',    '-', 3,   1,     False),
    ('tds',              'TDS',    '-', 3,   1,     False),
    ('test_report',      'TST',    '-', 3,   1,     False),
    ('rd_project',       'RD',     '-', 3,   1,     False),
]


class Command(BaseCommand):
    help = 'Seed default DocumentSeries rows for every document type.'

    def handle(self, *args, **options):
        created, skipped = 0, 0
        for doc_type, prefix, sep, pad, start, fy in DEFAULTS:
            obj, is_new = DocumentSeries.objects.get_or_create(
                document_type=doc_type,
                defaults={
                    'prefix':          prefix,
                    'separator':       sep,
                    'padding':         pad,
                    'starting_number': start,
                    'current_number':  0,
                    'include_fy':      fy,
                    'is_enabled':      True,
                },
            )
            if is_new:
                created += 1
                self.stdout.write(f'  Created: {doc_type} -> {prefix}')
            else:
                skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nDone — {created} created, {skipped} already existed.'
        ))
