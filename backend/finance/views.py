# ============================================================
# FILE: finance/views.py
# PURPOSE: API endpoints for finance module.
#          Chart of Accounts, Journal Entries, Trial Balance.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.db.models import Sum
import json

from .models import Account, AccountType, JournalEntry, JournalEntryLine
from authentication.audit import log_action, field_diff


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def account_to_dict(acc, include_balance=False):
    data = {
        'id':               acc.id,
        'account_code':     acc.account_code,
        'account_name':     acc.account_name,
        'account_category': acc.account_category,
        'description':      acc.description,
        'is_active':        acc.is_active,
        'parent_id':        acc.parent_account_id,
    }
    if include_balance:
        data['balance'] = str(acc.get_balance())
    return data

def journal_line_to_dict(line):
    return {
        'id':               line.id,
        'account_id':       line.account_id,
        'account_code':     line.account.account_code,
        'account_name':     line.account.account_name,
        'description':      line.description,
        'debit_amount':     str(line.debit_amount),
        'credit_amount':    str(line.credit_amount),
    }

def journal_to_dict(entry, include_lines=False):
    data = {
        'id':               entry.id,
        'entry_number':     entry.entry_number,
        'entry_date':       str(entry.entry_date),
        'description':      entry.description,
        'status':           entry.status,
        'reference':        entry.reference,
        'total_debits':     str(entry.total_debits()),
        'total_credits':    str(entry.total_credits()),
        'is_balanced':      entry.is_balanced(),
        'created_at':       entry.created_at.strftime('%Y-%m-%d'),
    }
    if include_lines:
        data['lines'] = [journal_line_to_dict(l) for l in entry.lines.select_related('account').all()]
    return data


# ============================================================
# CHART OF ACCOUNTS
# ============================================================

@csrf_exempt
def account_list_and_create(request):
    """ GET = list all accounts | POST = create new account """

    if request.method == 'GET':
        accounts = Account.objects.filter(is_active=True)
        category = request.GET.get('category', '')
        if category:
            accounts = accounts.filter(account_category=category)
        include_balance = request.GET.get('balance', '')
        return JsonResponse({
            'accounts': [account_to_dict(a, include_balance=bool(include_balance)) for a in accounts]
        })

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            account = Account.objects.create(
                account_code        = data['account_code'],
                account_name        = data['account_name'],
                account_category    = data['account_category'],
                description         = data.get('description', ''),
                parent_account_id   = data.get('parent_id') or None,
            )
            return JsonResponse({'message': 'Account created.', 'account': account_to_dict(account)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def account_detail_update(request, account_id):
    """ GET = get account with balance | PUT = update """
    try:
        account = Account.objects.get(id=account_id)
    except Account.DoesNotExist:
        return JsonResponse({'message': 'Account not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'account': account_to_dict(account, include_balance=True)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        for field in ['account_name', 'description']:
            if field in data:
                setattr(account, field, data[field])
        account.save()
        return JsonResponse({'message': 'Account updated.', 'account': account_to_dict(account)})


# ============================================================
# JOURNAL ENTRIES
# ============================================================

@csrf_exempt
def journal_entry_list_and_create(request):
    """ GET = list all journal entries | POST = create new entry """

    if request.method == 'GET':
        entries = JournalEntry.objects.all()
        return JsonResponse({'journal_entries': [journal_to_dict(e) for e in entries], 'total': entries.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            with transaction.atomic():
                entry = JournalEntry.objects.create(
                    entry_number    = data['entry_number'],
                    entry_date      = data['entry_date'],
                    description     = data['description'],
                    reference       = data.get('reference', ''),
                    status          = 'draft',
                    created_by      = request.user if request.user.is_authenticated else None,
                )

                for line_data in data.get('lines', []):
                    JournalEntryLine.objects.create(
                        entry           = entry,
                        account_id      = line_data['account_id'],
                        description     = line_data.get('description', ''),
                        debit_amount    = line_data.get('debit_amount', 0),
                        credit_amount   = line_data.get('credit_amount', 0),
                    )

            log_action(request, 'Journal Entry', 'Created', entry.entry_number,
                       {'description': entry.description, 'lines': len(data.get('lines', []))})
            return JsonResponse({'message': 'Journal entry created.', 'entry': journal_to_dict(entry, include_lines=True)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def journal_entry_detail(request, entry_id):
    """ GET = get entry with lines | PUT = update draft entry | DELETE = delete draft entry """
    try:
        entry = JournalEntry.objects.get(id=entry_id)
    except JournalEntry.DoesNotExist:
        return JsonResponse({'message': 'Journal entry not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'entry': journal_to_dict(entry, include_lines=True)})

    if request.method == 'PUT':
        if entry.status == 'posted':
            return JsonResponse({'message': 'Cannot edit a posted journal entry. It is locked.'}, status=400)
        data = json.loads(request.body)
        for field in ['entry_date', 'description', 'reference']:
            if field in data:
                setattr(entry, field, data[field])
        entry.save()
        return JsonResponse({'message': 'Journal entry updated.', 'entry': journal_to_dict(entry)})

    if request.method == 'DELETE':
        if entry.status == 'posted':
            return JsonResponse({'message': 'Cannot delete a posted journal entry.'}, status=400)
        log_action(request, 'Journal Entry', 'Deleted', entry.entry_number, {'description': entry.description})
        entry.delete()
        return JsonResponse({'message': 'Journal entry deleted.'})


@csrf_exempt
def journal_entry_post(request, entry_id):
    """
    POST /api/finance/journal-entries/<id>/post/
    Posts the journal entry — makes it affect account balances.
    Only balanced entries can be posted.
    """
    try:
        entry = JournalEntry.objects.get(id=entry_id)
    except JournalEntry.DoesNotExist:
        return JsonResponse({'message': 'Journal entry not found.'}, status=404)

    if entry.status == 'posted':
        return JsonResponse({'message': 'Already posted.'}, status=400)

    if not entry.is_balanced():
        return JsonResponse({'message': f'Cannot post — not balanced. Debits: {entry.total_debits()}, Credits: {entry.total_credits()}'}, status=400)

    entry.status = 'posted'
    entry.save()
    log_action(request, 'Journal Entry', 'Posted', entry.entry_number,
               {'description': entry.description, 'total_debits': str(entry.total_debits())})
    return JsonResponse({'message': 'Journal entry posted successfully.', 'entry': journal_to_dict(entry)})


# ============================================================
# TRIAL BALANCE
# Shows all accounts with their debit/credit balances
# ============================================================

def trial_balance(request):
    """
    GET /api/finance/trial-balance/
    Returns all accounts with current balances for trial balance report.
    """
    accounts = Account.objects.filter(is_active=True).order_by('account_code')
    result = []
    total_debit = 0
    total_credit = 0

    for acc in accounts:
        balance = acc.get_balance()
        if balance == 0:
            continue

        if acc.account_category in ('asset', 'expense'):
            debit_bal  = balance if balance > 0 else 0
            credit_bal = abs(balance) if balance < 0 else 0
        else:
            credit_bal = balance if balance > 0 else 0
            debit_bal  = abs(balance) if balance < 0 else 0

        total_debit  += debit_bal
        total_credit += credit_bal

        result.append({
            'account_code':     acc.account_code,
            'account_name':     acc.account_name,
            'account_category': acc.account_category,
            'debit_balance':    str(debit_bal),
            'credit_balance':   str(credit_bal),
        })

    return JsonResponse({
        'trial_balance':    result,
        'total_debit':      str(total_debit),
        'total_credit':     str(total_credit),
        'is_balanced':      total_debit == total_credit,
    })


# ============================================================
# GENERAL LEDGER
# Shows all transactions for a specific account
# ============================================================

def general_ledger(request, account_id):
    """
    GET /api/finance/ledger/<account_id>/
    Returns all journal entry lines for a specific account.
    """
    try:
        account = Account.objects.get(id=account_id)
    except Account.DoesNotExist:
        return JsonResponse({'message': 'Account not found.'}, status=404)

    lines = JournalEntryLine.objects.filter(
        account=account,
        entry__status='posted'
    ).select_related('entry').order_by('entry__entry_date')

    running_balance = 0
    ledger_lines = []
    for line in lines:
        if account.account_category in ('asset', 'expense'):
            running_balance += float(line.debit_amount) - float(line.credit_amount)
        else:
            running_balance += float(line.credit_amount) - float(line.debit_amount)

        ledger_lines.append({
            'date':             str(line.entry.entry_date),
            'entry_number':     line.entry.entry_number,
            'description':      line.description or line.entry.description,
            'debit_amount':     str(line.debit_amount),
            'credit_amount':    str(line.credit_amount),
            'running_balance':  str(round(running_balance, 2)),
        })

    return JsonResponse({
        'account':          account_to_dict(account),
        'ledger_lines':     ledger_lines,
        'closing_balance':  str(round(running_balance, 2)),
    })
