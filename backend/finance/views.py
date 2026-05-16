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

from .models import (Account, AccountType, JournalEntry, JournalEntryLine,
                     FiscalYear, AccountingPeriod, Payment, Receipt, PaymentAllocation,
                     CreditNote, DebitNote, Budget, BudgetLine, CostCenter)
from master_data.models import CompanySettings, CompanyGroup
from master_data.company_utils import get_active_company
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

    company = get_active_company(request)

    if request.method == 'GET':
        accounts = Account.objects.filter(is_active=True)
        if company:
            accounts = accounts.filter(company=company)
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
                company             = company,
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

    company = get_active_company(request)

    if request.method == 'GET':
        entries = JournalEntry.objects.all()
        if company:
            entries = entries.filter(company=company)
        return JsonResponse({'journal_entries': [journal_to_dict(e) for e in entries], 'total': entries.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            with transaction.atomic():
                entry = JournalEntry.objects.create(
                    company         = company,
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


# ============================================================
# COMPANY SETTINGS
# ============================================================

@csrf_exempt
def company_settings_view(request):
    company = get_active_company(request)
    if not company:
        return JsonResponse({'message': 'No active company.'}, status=400)

    if request.method == 'GET':
        settings_obj, _ = CompanySettings.objects.get_or_create(company=company)
        return JsonResponse({'settings': {
            'id': settings_obj.id, 'fy_start_month': settings_obj.fy_start_month,
            'tan_number': settings_obj.tan_number, 'cin_number': settings_obj.cin_number,
            'msme_number': settings_obj.msme_number, 'esic_code': settings_obj.esic_code,
            'pf_establishment': settings_obj.pf_establishment,
            'module_gst': settings_obj.module_gst, 'module_tds': settings_obj.module_tds,
            'module_tcs': settings_obj.module_tcs, 'module_payroll': settings_obj.module_payroll,
            'module_banking': settings_obj.module_banking, 'module_budget': settings_obj.module_budget,
            'module_fixed_assets': settings_obj.module_fixed_assets,
            'default_currency': settings_obj.default_currency,
        }})

    if request.method == 'PUT':
        data = json.loads(request.body)
        settings_obj, _ = CompanySettings.objects.get_or_create(company=company)
        allowed = ['fy_start_month', 'tan_number', 'cin_number', 'msme_number', 'udyam_number',
                   'esic_code', 'pf_establishment', 'module_gst', 'module_tds', 'module_tcs',
                   'module_payroll', 'module_banking', 'module_budget', 'module_fixed_assets',
                   'default_currency', 'round_off_limit']
        for f in allowed:
            if f in data:
                setattr(settings_obj, f, data[f])
        settings_obj.save()
        return JsonResponse({'message': 'Settings saved.'})


# ============================================================
# FISCAL YEAR
# ============================================================

@csrf_exempt
def fiscal_year_list(request):
    company = get_active_company(request)
    qs = FiscalYear.objects.filter(company=company) if company else FiscalYear.objects.all()

    if request.method == 'GET':
        return JsonResponse({'fiscal_years': [
            {'id': fy.id, 'year_name': fy.year_name, 'start_date': str(fy.start_date),
             'end_date': str(fy.end_date), 'is_active': fy.is_active, 'is_closed': fy.is_closed}
            for fy in qs
        ]})

    if request.method == 'POST':
        data = json.loads(request.body)
        fy = FiscalYear.objects.create(
            company=company, year_name=data['year_name'],
            start_date=data['start_date'], end_date=data['end_date'],
            is_active=data.get('is_active', False),
        )
        if fy.is_active:
            _create_periods_for_fy(fy)
        return JsonResponse({'message': 'Fiscal year created.', 'id': fy.id}, status=201)


def _create_periods_for_fy(fy):
    """Auto-create 12 monthly accounting periods for a fiscal year."""
    import calendar
    from datetime import date
    start = fy.start_date
    for i in range(12):
        month = ((start.month - 1 + i) % 12) + 1
        year  = start.year + ((start.month - 1 + i) // 12)
        last_day = calendar.monthrange(year, month)[1]
        AccountingPeriod.objects.get_or_create(
            fiscal_year=fy, period_number=i + 1,
            defaults={
                'period_name': date(year, month, 1).strftime('%B %Y'),
                'start_date': date(year, month, 1),
                'end_date':   date(year, month, last_day),
            }
        )


@csrf_exempt
def fiscal_year_detail(request, pk):
    try:
        fy = FiscalYear.objects.get(id=pk)
    except FiscalYear.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'fiscal_year': {
            'id': fy.id, 'year_name': fy.year_name, 'start_date': str(fy.start_date),
            'end_date': str(fy.end_date), 'is_active': fy.is_active, 'is_closed': fy.is_closed,
        }})
    if request.method == 'PUT':
        data = json.loads(request.body)
        if data.get('is_active'):
            fy.is_active = True
            fy.save()
            _create_periods_for_fy(fy)
        if 'is_closed' in data:
            fy.is_closed = data['is_closed']
            fy.save()
        return JsonResponse({'message': 'Updated.'})


def accounting_period_list(request, fy_id):
    try:
        fy = FiscalYear.objects.get(id=fy_id)
    except FiscalYear.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    periods = fy.periods.all().order_by('period_number')
    return JsonResponse({'periods': [
        {'id': p.id, 'period_name': p.period_name, 'period_number': p.period_number,
         'start_date': str(p.start_date), 'end_date': str(p.end_date), 'is_closed': p.is_closed}
        for p in periods
    ]})


# ============================================================
# PAYMENT VOUCHER
# ============================================================

def _payment_to_dict(p):
    return {
        'id': p.id, 'payment_number': p.payment_number, 'payment_date': str(p.payment_date),
        'payment_mode': p.payment_mode, 'party_type': p.party_type,
        'vendor_id': p.vendor_id, 'employee_id': p.employee_id,
        'amount': str(p.amount), 'tds_amount': str(p.tds_amount), 'net_amount': str(p.net_amount),
        'cheque_number': p.cheque_number, 'narration': p.narration,
        'reference': p.reference, 'status': p.status,
    }


@csrf_exempt
def payment_list(request):
    company = get_active_company(request)
    qs = Payment.objects.filter(company=company) if company else Payment.objects.all()
    status_f = request.GET.get('status', '')
    if status_f:
        qs = qs.filter(status=status_f)

    if request.method == 'GET':
        from django.db.models import Sum as DSum
        total = qs.aggregate(t=DSum('net_amount'))['t'] or 0
        return JsonResponse({'payments': [_payment_to_dict(p) for p in qs.order_by('-payment_date')[:200]],
                             'total': str(total), 'count': qs.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        amount = float(data['amount'])
        tds    = float(data.get('tds_amount', 0))
        p = Payment.objects.create(
            company=company,
            payment_number=data.get('payment_number', f"PV-{Payment.objects.count()+1:05d}"),
            payment_date=data['payment_date'],
            payment_mode=data['payment_mode'],
            party_type=data['party_type'],
            vendor_id=data.get('vendor_id') or None,
            employee_id=data.get('employee_id') or None,
            bank_account_id=data.get('bank_account_id') or None,
            amount=amount, tds_amount=tds, net_amount=amount - tds,
            cheque_number=data.get('cheque_number', ''),
            cheque_date=data.get('cheque_date') or None,
            narration=data.get('narration', ''),
            reference=data.get('reference', ''),
            status='draft',
            created_by=request.user if request.user.is_authenticated else None,
        )
        log_action(request, 'Finance', 'Payment Created', p.payment_number, {'amount': str(p.net_amount)})
        return JsonResponse({'message': 'Payment voucher created.', 'payment': _payment_to_dict(p)}, status=201)


@csrf_exempt
def payment_detail(request, pk):
    try:
        p = Payment.objects.get(id=pk)
    except Payment.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'payment': _payment_to_dict(p)})
    if request.method == 'PUT':
        if p.status == 'posted':
            return JsonResponse({'message': 'Cannot edit a posted payment.'}, status=400)
        data = json.loads(request.body)
        for f in ['payment_date', 'payment_mode', 'narration', 'cheque_number', 'cheque_date', 'reference']:
            if f in data:
                setattr(p, f, data[f])
        p.save()
        return JsonResponse({'message': 'Updated.', 'payment': _payment_to_dict(p)})


@csrf_exempt
def payment_post(request, pk):
    try:
        p = Payment.objects.get(id=pk)
    except Payment.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if p.status == 'posted':
        return JsonResponse({'message': 'Already posted.'}, status=400)
    p.status = 'posted'
    p.save()
    log_action(request, 'Finance', 'Payment Posted', p.payment_number, {'net_amount': str(p.net_amount)})
    return JsonResponse({'message': 'Payment posted.', 'payment': _payment_to_dict(p)})


# ============================================================
# RECEIPT VOUCHER
# ============================================================

def _receipt_to_dict(r):
    return {
        'id': r.id, 'receipt_number': r.receipt_number, 'receipt_date': str(r.receipt_date),
        'receipt_mode': r.receipt_mode, 'customer_id': r.customer_id,
        'amount': str(r.amount), 'tcs_amount': str(r.tcs_amount),
        'cheque_number': r.cheque_number, 'narration': r.narration,
        'gateway_reference': r.gateway_reference, 'gateway_provider': r.gateway_provider,
        'reference': r.reference, 'status': r.status,
    }


@csrf_exempt
def receipt_list(request):
    company = get_active_company(request)
    qs = Receipt.objects.filter(company=company) if company else Receipt.objects.all()
    status_f = request.GET.get('status', '')
    if status_f:
        qs = qs.filter(status=status_f)

    if request.method == 'GET':
        from django.db.models import Sum as DSum
        total = qs.aggregate(t=DSum('amount'))['t'] or 0
        return JsonResponse({'receipts': [_receipt_to_dict(r) for r in qs.order_by('-receipt_date')[:200]],
                             'total': str(total), 'count': qs.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        r = Receipt.objects.create(
            company=company,
            receipt_number=data.get('receipt_number', f"RV-{Receipt.objects.count()+1:05d}"),
            receipt_date=data['receipt_date'],
            receipt_mode=data['receipt_mode'],
            customer_id=data.get('customer_id') or None,
            bank_account_id=data.get('bank_account_id') or None,
            amount=data['amount'],
            tcs_amount=data.get('tcs_amount', 0),
            cheque_number=data.get('cheque_number', ''),
            cheque_date=data.get('cheque_date') or None,
            narration=data.get('narration', ''),
            reference=data.get('reference', ''),
            gateway_reference=data.get('gateway_reference', ''),
            gateway_provider=data.get('gateway_provider', ''),
            status='draft',
            created_by=request.user if request.user.is_authenticated else None,
        )
        log_action(request, 'Finance', 'Receipt Created', r.receipt_number, {'amount': str(r.amount)})
        return JsonResponse({'message': 'Receipt voucher created.', 'receipt': _receipt_to_dict(r)}, status=201)


@csrf_exempt
def receipt_detail(request, pk):
    try:
        r = Receipt.objects.get(id=pk)
    except Receipt.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'receipt': _receipt_to_dict(r)})
    if request.method == 'PUT':
        if r.status == 'posted':
            return JsonResponse({'message': 'Cannot edit a posted receipt.'}, status=400)
        data = json.loads(request.body)
        for f in ['receipt_date', 'receipt_mode', 'narration', 'cheque_number', 'reference']:
            if f in data:
                setattr(r, f, data[f])
        r.save()
        return JsonResponse({'message': 'Updated.', 'receipt': _receipt_to_dict(r)})


@csrf_exempt
def receipt_post(request, pk):
    try:
        r = Receipt.objects.get(id=pk)
    except Receipt.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if r.status == 'posted':
        return JsonResponse({'message': 'Already posted.'}, status=400)
    r.status = 'posted'
    r.save()
    return JsonResponse({'message': 'Receipt posted.', 'receipt': _receipt_to_dict(r)})


# ============================================================
# CREDIT NOTE & DEBIT NOTE
# ============================================================

@csrf_exempt
def credit_note_list(request):
    company = get_active_company(request)
    qs = CreditNote.objects.filter(company=company) if company else CreditNote.objects.all()
    if request.method == 'GET':
        return JsonResponse({'credit_notes': [
            {'id': c.id, 'credit_note_number': c.credit_note_number, 'credit_note_date': str(c.credit_note_date),
             'customer_id': c.customer_id, 'total_amount': str(c.total_amount), 'status': c.status}
            for c in qs.order_by('-credit_note_date')
        ]})
    if request.method == 'POST':
        data = json.loads(request.body)
        c = CreditNote.objects.create(
            company=company,
            credit_note_number=data.get('credit_note_number', f"CN-{CreditNote.objects.count()+1:05d}"),
            credit_note_date=data['credit_note_date'],
            customer_id=data['customer_id'],
            sales_invoice_id=data.get('sales_invoice_id') or None,
            reason=data.get('reason', ''),
            taxable_amount=data.get('taxable_amount', 0),
            cgst_amount=data.get('cgst_amount', 0),
            sgst_amount=data.get('sgst_amount', 0),
            igst_amount=data.get('igst_amount', 0),
            total_amount=data['total_amount'],
            created_by=request.user if request.user.is_authenticated else None,
        )
        return JsonResponse({'message': 'Credit note created.', 'id': c.id}, status=201)


@csrf_exempt
def credit_note_detail(request, pk):
    try:
        c = CreditNote.objects.get(id=pk)
    except CreditNote.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'credit_note': {
            'id': c.id, 'credit_note_number': c.credit_note_number, 'credit_note_date': str(c.credit_note_date),
            'customer_id': c.customer_id, 'reason': c.reason,
            'taxable_amount': str(c.taxable_amount), 'cgst_amount': str(c.cgst_amount),
            'sgst_amount': str(c.sgst_amount), 'igst_amount': str(c.igst_amount),
            'total_amount': str(c.total_amount), 'status': c.status,
        }})
    if request.method == 'PUT':
        if c.status == 'posted':
            return JsonResponse({'message': 'Cannot edit a posted credit note.'}, status=400)
        data = json.loads(request.body)
        c.status = data.get('status', c.status)
        c.save()
        return JsonResponse({'message': 'Updated.'})


@csrf_exempt
def debit_note_list(request):
    company = get_active_company(request)
    qs = DebitNote.objects.filter(company=company) if company else DebitNote.objects.all()
    if request.method == 'GET':
        return JsonResponse({'debit_notes': [
            {'id': d.id, 'debit_note_number': d.debit_note_number, 'debit_note_date': str(d.debit_note_date),
             'vendor_id': d.vendor_id, 'total_amount': str(d.total_amount), 'status': d.status}
            for d in qs.order_by('-debit_note_date')
        ]})
    if request.method == 'POST':
        data = json.loads(request.body)
        d = DebitNote.objects.create(
            company=company,
            debit_note_number=data.get('debit_note_number', f"DN-{DebitNote.objects.count()+1:05d}"),
            debit_note_date=data['debit_note_date'],
            vendor_id=data['vendor_id'],
            purchase_invoice_id=data.get('purchase_invoice_id') or None,
            reason=data.get('reason', ''),
            taxable_amount=data.get('taxable_amount', 0),
            cgst_amount=data.get('cgst_amount', 0),
            sgst_amount=data.get('sgst_amount', 0),
            igst_amount=data.get('igst_amount', 0),
            total_amount=data['total_amount'],
            created_by=request.user if request.user.is_authenticated else None,
        )
        return JsonResponse({'message': 'Debit note created.', 'id': d.id}, status=201)


@csrf_exempt
def debit_note_detail(request, pk):
    try:
        d = DebitNote.objects.get(id=pk)
    except DebitNote.DoesNotExist:
        return JsonResponse({'message': 'Not found.'}, status=404)
    if request.method == 'GET':
        return JsonResponse({'debit_note': {
            'id': d.id, 'debit_note_number': d.debit_note_number, 'total_amount': str(d.total_amount),
            'vendor_id': d.vendor_id, 'status': d.status,
        }})
    if request.method == 'PUT':
        if d.status == 'posted':
            return JsonResponse({'message': 'Cannot edit a posted debit note.'}, status=400)
        data = json.loads(request.body)
        d.status = data.get('status', d.status)
        d.save()
        return JsonResponse({'message': 'Updated.'})


# ============================================================
# A/R & A/P AGEING
# ============================================================

def ar_ageing(request):
    """Accounts Receivable ageing — outstanding sales invoices grouped by days overdue."""
    from dispatch.models import SalesInvoice
    from django.utils import timezone
    from django.db.models import F, ExpressionWrapper, fields

    company = get_active_company(request)
    invoices = SalesInvoice.objects.filter(company=company, status__in=['sent', 'overdue']) if company else SalesInvoice.objects.filter(status__in=['sent', 'overdue'])
    today = timezone.now().date()
    buckets = {'current': 0, '1_30': 0, '31_60': 0, '61_90': 0, 'over_90': 0}
    rows = []
    for inv in invoices.select_related('customer'):
        balance = float(inv.balance_due)
        if balance <= 0:
            continue
        days = (today - inv.due_date).days if inv.due_date else 0
        if days <= 0:
            buckets['current'] += balance
        elif days <= 30:
            buckets['1_30'] += balance
        elif days <= 60:
            buckets['31_60'] += balance
        elif days <= 90:
            buckets['61_90'] += balance
        else:
            buckets['over_90'] += balance
        rows.append({'invoice_number': inv.invoice_number, 'customer': str(inv.customer),
                     'invoice_date': str(inv.invoice_date), 'due_date': str(inv.due_date) if inv.due_date else None,
                     'total_amount': str(inv.total_amount), 'balance_due': str(balance), 'days_overdue': days})
    return JsonResponse({'ageing': rows, 'buckets': buckets, 'total': sum(buckets.values())})


def ap_ageing(request):
    """Accounts Payable ageing — outstanding purchase invoices grouped by days overdue."""
    from purchase.models import PurchaseInvoice
    from django.utils import timezone
    company = get_active_company(request)
    invoices = PurchaseInvoice.objects.filter(company=company, status__in=['posted']) if company else PurchaseInvoice.objects.filter(status='posted')
    today = timezone.now().date()
    buckets = {'current': 0, '1_30': 0, '31_60': 0, '61_90': 0, 'over_90': 0}
    rows = []
    for inv in invoices.select_related('vendor'):
        total = float(inv.total_amount)
        days = (today - inv.due_date).days if inv.due_date else 0
        if days <= 0:
            buckets['current'] += total
        elif days <= 30:
            buckets['1_30'] += total
        elif days <= 60:
            buckets['31_60'] += total
        elif days <= 90:
            buckets['61_90'] += total
        else:
            buckets['over_90'] += total
        rows.append({'invoice_number': inv.invoice_number, 'vendor': str(inv.vendor),
                     'invoice_date': str(inv.invoice_date), 'due_date': str(inv.due_date) if inv.due_date else None,
                     'total_amount': str(inv.total_amount), 'days_overdue': days})
    return JsonResponse({'ageing': rows, 'buckets': buckets, 'total': sum(buckets.values())})


# ============================================================
# P&L, BALANCE SHEET, CASH FLOW
# ============================================================

def profit_and_loss(request):
    """Profit & Loss statement — income accounts minus expense accounts."""
    company = get_active_company(request)
    from_date = request.GET.get('from_date', '')
    to_date   = request.GET.get('to_date', '')

    income_accounts  = Account.objects.filter(account_category='income', is_active=True)
    expense_accounts = Account.objects.filter(account_category='expense', is_active=True)
    if company:
        income_accounts  = income_accounts.filter(company=company)
        expense_accounts = expense_accounts.filter(company=company)

    def get_balance_for_period(account, from_dt, to_dt):
        qs = account.journal_lines.filter(entry__status='posted')
        if from_dt:
            qs = qs.filter(entry__entry_date__gte=from_dt)
        if to_dt:
            qs = qs.filter(entry__entry_date__lte=to_dt)
        debits  = qs.aggregate(Sum('debit_amount'))['debit_amount__sum'] or 0
        credits = qs.aggregate(Sum('credit_amount'))['credit_amount__sum'] or 0
        if account.account_category == 'income':
            return float(credits) - float(debits)
        return float(debits) - float(credits)

    income_rows  = [{'account_code': a.account_code, 'account_name': a.account_name,
                     'amount': get_balance_for_period(a, from_date, to_date)} for a in income_accounts]
    expense_rows = [{'account_code': a.account_code, 'account_name': a.account_name,
                     'amount': get_balance_for_period(a, from_date, to_date)} for a in expense_accounts]
    total_income  = sum(r['amount'] for r in income_rows)
    total_expense = sum(r['amount'] for r in expense_rows)
    net_profit    = total_income - total_expense

    return JsonResponse({
        'income':        income_rows,  'total_income':   total_income,
        'expenses':      expense_rows, 'total_expenses': total_expense,
        'net_profit':    net_profit,   'from_date': from_date, 'to_date': to_date,
    })


def balance_sheet(request):
    """Balance Sheet — Assets = Liabilities + Equity."""
    company = get_active_company(request)
    as_of = request.GET.get('as_of', '')

    def get_cat_accounts(category):
        qs = Account.objects.filter(account_category=category, is_active=True)
        if company:
            qs = qs.filter(company=company)
        rows = []
        for a in qs:
            lines = a.journal_lines.filter(entry__status='posted')
            if as_of:
                lines = lines.filter(entry__entry_date__lte=as_of)
            debits  = lines.aggregate(Sum('debit_amount'))['debit_amount__sum'] or 0
            credits = lines.aggregate(Sum('credit_amount'))['credit_amount__sum'] or 0
            balance = (float(debits) - float(credits)) if category in ('asset', 'expense') else (float(credits) - float(debits))
            if balance != 0:
                rows.append({'account_code': a.account_code, 'account_name': a.account_name, 'balance': balance})
        return rows

    assets      = get_cat_accounts('asset')
    liabilities = get_cat_accounts('liability')
    equity      = get_cat_accounts('equity')
    total_assets = sum(r['balance'] for r in assets)
    total_liab   = sum(r['balance'] for r in liabilities)
    total_equity = sum(r['balance'] for r in equity)

    return JsonResponse({
        'assets': assets, 'total_assets': total_assets,
        'liabilities': liabilities, 'total_liabilities': total_liab,
        'equity': equity, 'total_equity': total_equity,
        'is_balanced': abs(total_assets - (total_liab + total_equity)) < 0.01,
        'as_of': as_of,
    })


def cash_flow_statement(request):
    """Basic cash flow — collections, payments, net flow from bank transactions."""
    from banking.models import BankTransaction
    company = get_active_company(request)
    from_date = request.GET.get('from_date', '')
    to_date   = request.GET.get('to_date', '')
    qs = BankTransaction.objects.all()
    if company:
        qs = qs.filter(bank_account__company=company)
    if from_date:
        qs = qs.filter(transaction_date__gte=from_date)
    if to_date:
        qs = qs.filter(transaction_date__lte=to_date)

    totals = qs.aggregate(
        total_in=Sum('amount', filter=json.loads('{"transaction_type": "credit"}') and None),
        total_out=Sum('amount'),
    )
    credits = qs.filter(transaction_type='credit').aggregate(Sum('amount'))['amount__sum'] or 0
    debits  = qs.filter(transaction_type='debit').aggregate(Sum('amount'))['amount__sum'] or 0
    return JsonResponse({
        'total_inflows': str(credits), 'total_outflows': str(debits),
        'net_cash_flow': str(float(credits) - float(debits)),
        'from_date': from_date, 'to_date': to_date,
    })


# ============================================================
# BUDGETS
# ============================================================

def budget_list(request):
    company = get_active_company(request)
    qs = Budget.objects.filter(company=company, is_active=True) if company else Budget.objects.filter(is_active=True)
    return JsonResponse({'budgets': [
        {'id': b.id, 'budget_name': b.budget_name, 'fiscal_year': b.fiscal_year.year_name}
        for b in qs.select_related('fiscal_year')
    ]})


# ============================================================
# FINANCE DASHBOARD
# ============================================================

def finance_dashboard(request):
    company = get_active_company(request)
    from dispatch.models import SalesInvoice
    from purchase.models import PurchaseInvoice
    from django.db.models import Sum as DSum, Count

    sales_qs    = SalesInvoice.objects.filter(company=company)    if company else SalesInvoice.objects.all()
    purchase_qs = PurchaseInvoice.objects.filter(company=company) if company else PurchaseInvoice.objects.all()
    payment_qs  = Payment.objects.filter(company=company)         if company else Payment.objects.all()
    receipt_qs  = Receipt.objects.filter(company=company)         if company else Receipt.objects.all()

    ar_total = sales_qs.filter(status__in=['sent','overdue']).aggregate(DSum('total_amount'))['total_amount__sum'] or 0
    ap_total = purchase_qs.filter(status='posted').aggregate(DSum('total_amount'))['total_amount__sum'] or 0
    payments_month = payment_qs.filter(status='posted').aggregate(DSum('net_amount'))['net_amount__sum'] or 0
    receipts_month = receipt_qs.filter(status='posted').aggregate(DSum('amount'))['amount__sum'] or 0

    return JsonResponse({
        'accounts_receivable': str(ar_total),
        'accounts_payable':    str(ap_total),
        'total_payments':      str(payments_month),
        'total_receipts':      str(receipts_month),
        'overdue_invoices': sales_qs.filter(status='overdue').count(),
    })
