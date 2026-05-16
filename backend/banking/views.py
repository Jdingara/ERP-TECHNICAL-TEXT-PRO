# ============================================================
# FILE: banking/views.py
# PURPOSE: API endpoints for banking module.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.db.models import Sum, Q
import json

from .models import BankAccount, BankTransaction, ChequeBook, ChequeEntry, FundTransfer, BankReconciliation, PettyCash, PettyCashEntry
from master_data.company_utils import get_active_company
from authentication.audit import log_action


# ── Helpers ──────────────────────────────────────────────────

def account_to_dict(a, include_balance=False):
    d = {
        'id': a.id, 'account_name': a.account_name, 'account_number': a.account_number,
        'bank_name': a.bank_name, 'branch_name': a.branch_name, 'ifsc_code': a.ifsc_code,
        'account_type': a.account_type, 'currency': a.currency,
        'opening_balance': str(a.opening_balance), 'is_active': a.is_active,
        'bank_feed_enabled': a.bank_feed_enabled, 'gl_account_id': a.gl_account_id,
    }
    if include_balance:
        d['current_balance'] = str(a.current_balance)
    return d

def txn_to_dict(t):
    return {
        'id': t.id, 'transaction_date': str(t.transaction_date), 'value_date': str(t.value_date) if t.value_date else None,
        'transaction_type': t.transaction_type, 'amount': str(t.amount),
        'balance_after': str(t.balance_after) if t.balance_after is not None else None,
        'narration': t.narration, 'reference': t.reference, 'is_reconciled': t.is_reconciled, 'source': t.source,
        'bank_account_id': t.bank_account_id,
    }

def cheque_to_dict(c):
    return {
        'id': c.id, 'cheque_type': c.cheque_type, 'cheque_number': c.cheque_number,
        'cheque_date': str(c.cheque_date), 'amount': str(c.amount),
        'party_name': c.party_name, 'party_bank': c.party_bank, 'status': c.status,
        'deposited_date': str(c.deposited_date) if c.deposited_date else None,
        'bounce_reason': c.bounce_reason, 'bank_account_id': c.bank_account_id,
    }

def transfer_to_dict(t):
    return {
        'id': t.id, 'transfer_number': t.transfer_number, 'transfer_date': str(t.transfer_date),
        'from_account_id': t.from_account_id, 'from_account': str(t.from_account),
        'to_account_id': t.to_account_id, 'to_account': str(t.to_account),
        'amount': str(t.amount), 'transfer_mode': t.transfer_mode,
        'reference': t.reference, 'narration': t.narration, 'status': t.status,
    }


# ── Bank Account ─────────────────────────────────────────────

@csrf_exempt
def bank_account_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = BankAccount.objects.filter(company=company, is_active=True) if company else BankAccount.objects.filter(is_active=True)
        include_balance = request.GET.get('balance', '')
        return JsonResponse({'bank_accounts': [account_to_dict(a, include_balance=bool(include_balance)) for a in qs]})

    if request.method == 'POST':
        data = json.loads(request.body)
        a = BankAccount.objects.create(
            company=company,
            account_name=data['account_name'],
            account_number=data['account_number'],
            bank_name=data['bank_name'],
            branch_name=data.get('branch_name', ''),
            ifsc_code=data.get('ifsc_code', ''),
            micr_code=data.get('micr_code', ''),
            swift_code=data.get('swift_code', ''),
            account_type=data.get('account_type', 'current'),
            currency=data.get('currency', 'INR'),
            opening_balance=data.get('opening_balance', 0),
            opening_balance_date=data.get('opening_balance_date') or None,
            gl_account_id=data.get('gl_account_id') or None,
        )
        log_action(request, 'Banking', 'Created Bank Account', a.account_name, {})
        return JsonResponse({'message': 'Bank account created.', 'bank_account': account_to_dict(a, True)}, status=201)


@csrf_exempt
def bank_account_detail(request, pk):
    try:
        a = BankAccount.objects.get(id=pk)
    except BankAccount.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'bank_account': account_to_dict(a, include_balance=True)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        for f in ['account_name', 'branch_name', 'ifsc_code', 'gl_account_id', 'is_active', 'bank_feed_enabled']:
            if f in data:
                setattr(a, f, data[f])
        a.save()
        return JsonResponse({'message': 'Updated.', 'bank_account': account_to_dict(a, True)})


# ── Bank Transactions ─────────────────────────────────────────

def bank_transaction_list(request, account_id=None):
    qs = BankTransaction.objects.all()
    if account_id:
        qs = qs.filter(bank_account_id=account_id)
    else:
        company = get_active_company(request)
        if company:
            qs = qs.filter(bank_account__company=company)

    from_date = request.GET.get('from_date', '')
    to_date   = request.GET.get('to_date', '')
    reconciled = request.GET.get('reconciled', '')
    if from_date:
        qs = qs.filter(transaction_date__gte=from_date)
    if to_date:
        qs = qs.filter(transaction_date__lte=to_date)
    if reconciled != '':
        qs = qs.filter(is_reconciled=(reconciled == 'true'))

    totals = qs.aggregate(
        total_credits=Sum('amount', filter=Q(transaction_type='credit')),
        total_debits=Sum('amount',  filter=Q(transaction_type='debit')),
    )
    return JsonResponse({
        'transactions': [txn_to_dict(t) for t in qs.order_by('-transaction_date')[:500]],
        'total_credits': str(totals['total_credits'] or 0),
        'total_debits': str(totals['total_debits'] or 0),
        'count': qs.count(),
    })


@csrf_exempt
def bank_transaction_create(request):
    if request.method != 'POST':
        return JsonResponse({'message': 'POST only.'}, status=405)
    data = json.loads(request.body)
    t = BankTransaction.objects.create(
        company=get_active_company(request),
        bank_account_id=data['bank_account_id'],
        transaction_date=data['transaction_date'],
        value_date=data.get('value_date') or None,
        transaction_type=data['transaction_type'],
        amount=data['amount'],
        narration=data['narration'],
        reference=data.get('reference', ''),
        source='manual',
    )
    return JsonResponse({'message': 'Transaction recorded.', 'transaction': txn_to_dict(t)}, status=201)


# ── Cheque Entry ─────────────────────────────────────────────

@csrf_exempt
def cheque_list(request):
    company = get_active_company(request)
    qs = ChequeEntry.objects.filter(company=company) if company else ChequeEntry.objects.all()

    cheque_type = request.GET.get('type', '')
    status = request.GET.get('status', '')
    if cheque_type:
        qs = qs.filter(cheque_type=cheque_type)
    if status:
        qs = qs.filter(status=status)

    if request.method == 'GET':
        return JsonResponse({'cheques': [cheque_to_dict(c) for c in qs.order_by('-cheque_date')]})

    if request.method == 'POST':
        data = json.loads(request.body)
        c = ChequeEntry.objects.create(
            company=company,
            bank_account_id=data['bank_account_id'],
            cheque_type=data['cheque_type'],
            cheque_number=data['cheque_number'],
            cheque_date=data['cheque_date'],
            amount=data['amount'],
            party_name=data['party_name'],
            party_bank=data.get('party_bank', ''),
            status='issued',
        )
        return JsonResponse({'message': 'Cheque recorded.', 'cheque': cheque_to_dict(c)}, status=201)


@csrf_exempt
def cheque_update_status(request, pk):
    try:
        c = ChequeEntry.objects.get(id=pk)
    except ChequeEntry.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)

    if request.method == 'PUT':
        data = json.loads(request.body)
        c.status = data['status']
        if data.get('deposited_date'):
            c.deposited_date = data['deposited_date']
        if data.get('cleared_date'):
            c.cleared_date = data['cleared_date']
        if data.get('bounce_reason'):
            c.bounce_reason = data['bounce_reason']
        c.save()
        return JsonResponse({'message': 'Cheque status updated.', 'cheque': cheque_to_dict(c)})


# ── Fund Transfer ─────────────────────────────────────────────

@csrf_exempt
def fund_transfer_list(request):
    company = get_active_company(request)
    qs = FundTransfer.objects.filter(company=company) if company else FundTransfer.objects.all()

    if request.method == 'GET':
        return JsonResponse({'fund_transfers': [transfer_to_dict(t) for t in qs.select_related('from_account', 'to_account').order_by('-transfer_date')]})

    if request.method == 'POST':
        data = json.loads(request.body)
        with transaction.atomic():
            from master_data.models import DocumentSeries
            t = FundTransfer.objects.create(
                company=company,
                transfer_number=data.get('transfer_number', f"FT-{FundTransfer.objects.count()+1:04d}"),
                transfer_date=data['transfer_date'],
                from_account_id=data['from_account_id'],
                to_account_id=data['to_account_id'],
                amount=data['amount'],
                transfer_mode=data.get('transfer_mode', 'neft'),
                reference=data.get('reference', ''),
                narration=data.get('narration', ''),
                status='draft',
                created_by=request.user if request.user.is_authenticated else None,
            )
        log_action(request, 'Banking', 'Fund Transfer Created', t.transfer_number, {'amount': str(t.amount)})
        return JsonResponse({'message': 'Fund transfer created.', 'fund_transfer': transfer_to_dict(t)}, status=201)


@csrf_exempt
def fund_transfer_post(request, pk):
    """Post a fund transfer — creates bank transactions on both sides."""
    try:
        t = FundTransfer.objects.get(id=pk)
    except FundTransfer.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)

    if t.status == 'posted':
        return JsonResponse({'message': 'Already posted.'}, status=400)

    with transaction.atomic():
        BankTransaction.objects.create(
            company=t.company, bank_account=t.from_account, transaction_date=t.transfer_date,
            transaction_type='debit', amount=t.amount,
            narration=f"Transfer to {t.to_account.account_name}", reference=t.reference,
            source='transfer', fund_transfer=t,
        )
        BankTransaction.objects.create(
            company=t.company, bank_account=t.to_account, transaction_date=t.transfer_date,
            transaction_type='credit', amount=t.amount,
            narration=f"Transfer from {t.from_account.account_name}", reference=t.reference,
            source='transfer', fund_transfer=t,
        )
        t.status = 'posted'
        t.save()

    return JsonResponse({'message': 'Fund transfer posted.', 'fund_transfer': transfer_to_dict(t)})


# ── Bank Reconciliation ───────────────────────────────────────

@csrf_exempt
def reconciliation_list(request):
    company = get_active_company(request)
    qs = BankReconciliation.objects.filter(company=company).select_related('bank_account') if company else BankReconciliation.objects.select_related('bank_account').all()

    if request.method == 'GET':
        return JsonResponse({'reconciliations': [
            {'id': r.id, 'bank_account': str(r.bank_account), 'statement_date': str(r.statement_date),
             'statement_closing': str(r.statement_closing), 'book_balance': str(r.book_balance),
             'difference': str(r.difference), 'status': r.status}
            for r in qs.order_by('-statement_date')
        ]})

    if request.method == 'POST':
        data = json.loads(request.body)
        r = BankReconciliation.objects.create(
            company=company,
            bank_account_id=data['bank_account_id'],
            reconciliation_date=data['reconciliation_date'],
            statement_date=data['statement_date'],
            statement_opening=data.get('statement_opening', 0),
            statement_closing=data['statement_closing'],
            book_balance=data.get('book_balance', 0),
            difference=float(data['statement_closing']) - float(data.get('book_balance', 0)),
            status='draft',
        )
        return JsonResponse({'message': 'Reconciliation created.', 'id': r.id}, status=201)


@csrf_exempt
def reconciliation_complete(request, pk):
    try:
        r = BankReconciliation.objects.get(id=pk)
    except BankReconciliation.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)

    from django.utils import timezone
    r.status = 'completed'
    r.completed_by = request.user if request.user.is_authenticated else None
    r.completed_at = timezone.now()
    r.save()
    return JsonResponse({'message': 'Reconciliation completed.'})


# ── Petty Cash ───────────────────────────────────────────────

def petty_cash_list(request):
    company = get_active_company(request)
    qs = PettyCash.objects.filter(company=company, is_active=True) if company else PettyCash.objects.filter(is_active=True)
    return JsonResponse({'petty_cash_funds': [
        {'id': p.id, 'fund_name': p.fund_name, 'custodian': p.custodian, 'opening_balance': str(p.opening_balance)}
        for p in qs
    ]})
