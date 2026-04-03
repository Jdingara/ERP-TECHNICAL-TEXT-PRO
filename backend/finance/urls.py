# ============================================================
# FILE: finance/urls.py
# PURPOSE: URL routes for finance module.
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    # Chart of Accounts
    path('accounts/',                               views.account_list_and_create,      name='account-list'),
    path('accounts/<int:account_id>/',              views.account_detail_update,        name='account-detail'),

    # Journal Entries
    path('journal-entries/',                        views.journal_entry_list_and_create, name='journal-list'),
    path('journal-entries/<int:entry_id>/post/',    views.journal_entry_post,           name='journal-post'),

    # Reports
    path('trial-balance/',                          views.trial_balance,                name='trial-balance'),
    path('ledger/<int:account_id>/',                views.general_ledger,              name='general-ledger'),
]
