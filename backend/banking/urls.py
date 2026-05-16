from django.urls import path
from . import views

urlpatterns = [
    # Bank Accounts
    path('accounts/',                               views.bank_account_list,        name='bank-account-list'),
    path('accounts/<int:pk>/',                      views.bank_account_detail,      name='bank-account-detail'),

    # Transactions
    path('transactions/',                           views.bank_transaction_list,    name='bank-txn-list'),
    path('transactions/create/',                    views.bank_transaction_create,  name='bank-txn-create'),
    path('accounts/<int:account_id>/transactions/', views.bank_transaction_list,    name='bank-txn-by-account'),

    # Cheques
    path('cheques/',                                views.cheque_list,              name='cheque-list'),
    path('cheques/<int:pk>/status/',                views.cheque_update_status,     name='cheque-status'),

    # Fund Transfers
    path('transfers/',                              views.fund_transfer_list,       name='transfer-list'),
    path('transfers/<int:pk>/post/',                views.fund_transfer_post,       name='transfer-post'),

    # Reconciliation
    path('reconciliation/',                         views.reconciliation_list,      name='reconciliation-list'),
    path('reconciliation/<int:pk>/complete/',       views.reconciliation_complete,  name='reconciliation-complete'),

    # Petty Cash
    path('petty-cash/',                             views.petty_cash_list,          name='petty-cash-list'),
]
