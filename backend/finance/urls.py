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
    path('journal-entries/<int:entry_id>/',         views.journal_entry_detail,          name='journal-detail'),
    path('journal-entries/<int:entry_id>/post/',    views.journal_entry_post,            name='journal-post'),

    # Reports
    path('trial-balance/',                          views.trial_balance,                name='trial-balance'),
    path('ledger/<int:account_id>/',                views.general_ledger,              name='general-ledger'),
    path('profit-loss/',                            views.profit_and_loss,             name='profit-loss'),
    path('balance-sheet/',                          views.balance_sheet,               name='balance-sheet'),
    path('cash-flow/',                              views.cash_flow_statement,         name='cash-flow'),

    # Fiscal Year & Periods
    path('fiscal-years/',                           views.fiscal_year_list,            name='fiscal-year-list'),
    path('fiscal-years/<int:pk>/',                  views.fiscal_year_detail,          name='fiscal-year-detail'),
    path('fiscal-years/<int:fy_id>/periods/',       views.accounting_period_list,      name='period-list'),

    # Company Settings
    path('company-settings/',                       views.company_settings_view,       name='company-settings'),

    # Payments
    path('payments/',                               views.payment_list,                name='payment-list'),
    path('payments/<int:pk>/',                      views.payment_detail,              name='payment-detail'),
    path('payments/<int:pk>/post/',                 views.payment_post,                name='payment-post'),

    # Receipts
    path('receipts/',                               views.receipt_list,                name='receipt-list'),
    path('receipts/<int:pk>/',                      views.receipt_detail,              name='receipt-detail'),
    path('receipts/<int:pk>/post/',                 views.receipt_post,                name='receipt-post'),

    # Credit / Debit Notes
    path('credit-notes/',                           views.credit_note_list,            name='credit-note-list'),
    path('credit-notes/<int:pk>/',                  views.credit_note_detail,          name='credit-note-detail'),
    path('debit-notes/',                            views.debit_note_list,             name='debit-note-list'),
    path('debit-notes/<int:pk>/',                   views.debit_note_detail,           name='debit-note-detail'),

    # A/R & A/P Ageing
    path('ar-ageing/',                              views.ar_ageing,                   name='ar-ageing'),
    path('ap-ageing/',                              views.ap_ageing,                   name='ap-ageing'),

    # Budgets
    path('budgets/',                                views.budget_list,                 name='budget-list'),

    # Dashboard
    path('dashboard/',                              views.finance_dashboard,           name='finance-dashboard'),
]
