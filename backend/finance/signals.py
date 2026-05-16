# ============================================================
# FILE: finance/signals.py
# PURPOSE: Auto-create balanced Journal Entries when key
#          business documents are posted/approved.
#
# Covered triggers:
#   dispatch.SalesInvoice  status → 'sent'    → AR / Revenue JE
#   purchase.PurchaseInvoice status → 'posted' → Purchases / AP JE
#   finance.Payment         status → 'posted'  → AP / Bank JE
#   finance.Receipt         status → 'posted'  → Bank / AR JE
#   hr_payroll.PaySlip      status → 'approved'→ Salary expense JE
#
# GRACEFUL DEGRADATION:
#   If the required Chart of Accounts entries don't exist, the JE
#   is skipped and a WARNING is logged. The document still saves
#   normally — accounting is advisory until CoA is fully set up.
# ============================================================

import logging
from decimal import Decimal
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.db import transaction

logger = logging.getLogger('finance.signals')

# ============================================================
# HELPERS
# ============================================================

def _get_account(company, *name_patterns, category=None):
    """
    Look up an active Account by partial name match (icontains).
    Tries company-specific first, then global (company=None) accounts.
    Returns first match across all patterns, or None.
    """
    from finance.models import Account
    for scope_qs in [
        Account.objects.filter(company=company, is_active=True),
        Account.objects.filter(company__isnull=True, is_active=True),
    ]:
        if category:
            scope_qs = scope_qs.filter(account_category=category)
        for pattern in name_patterns:
            acct = scope_qs.filter(account_name__icontains=pattern).first()
            if acct:
                return acct
    return None


def _next_je_number():
    """Generate sequential auto-journal entry number: AJE-YYYYMMDD-XXXX."""
    from finance.models import JournalEntry
    from datetime import date
    prefix = f"AJE-{date.today().strftime('%Y%m%d')}-"
    count = JournalEntry.objects.filter(entry_number__startswith=prefix).count()
    return f"{prefix}{str(count + 1).zfill(4)}"


def _create_je(company, entry_date, description, reference, lines):
    """
    Atomically create a posted JournalEntry.

    lines: list of (account, debit_amount, credit_amount, line_description)
    Returns JournalEntry on success, None if any account is missing.
    """
    from finance.models import JournalEntry, JournalEntryLine

    for account, _dr, _cr, desc in lines:
        if account is None:
            logger.warning(
                "Auto-JE skipped for '%s' (ref=%s) — account not found for line: %s. "
                "Create the account in Chart of Accounts to enable auto-posting.",
                description, reference, desc
            )
            return None

    with transaction.atomic():
        je = JournalEntry.objects.create(
            company=company,
            entry_number=_next_je_number(),
            entry_date=entry_date,
            description=description,
            reference=reference,
            status='posted',
        )
        for account, dr, cr, desc in lines:
            JournalEntryLine.objects.create(
                entry=je,
                account=account,
                description=desc,
                debit_amount=Decimal(str(dr)),
                credit_amount=Decimal(str(cr)),
            )
    logger.info("Auto-JE created: %s for %s", je.entry_number, description)
    return je


def _je_exists_for_ref(reference):
    """Return True if any JE already has this reference (prevents duplicate JEs)."""
    from finance.models import JournalEntry
    return JournalEntry.objects.filter(reference=reference).exists()


# ============================================================
# TRACK STATUS CHANGES (pre_save)
# We store the DB-persisted status on the instance so the
# post_save handler can compare old vs new without re-querying.
# ============================================================

def _attach_old_status(sender, instance, **kwargs):
    """Attach previous DB status to the instance before saving."""
    if instance.pk:
        try:
            instance._old_status = sender.objects.get(pk=instance.pk).status
        except sender.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


# ============================================================
# SIGNAL 1: dispatch.SalesInvoice → status 'sent'
# DR  Accounts Receivable  (total_amount)
# CR  Sales Revenue        (subtotal)
# CR  GST Output Tax       (tax_amount)  — if > 0
# ============================================================

def wire_sales_invoice_signals():
    from dispatch.models import SalesInvoice

    pre_save.connect(_attach_old_status, sender=SalesInvoice,
                     dispatch_uid='finance_signals_sales_inv_pre')

    @receiver(post_save, sender=SalesInvoice,
              dispatch_uid='finance_signals_sales_inv_post')
    def on_sales_invoice_sent(sender, instance, **kwargs):
        if getattr(instance, '_old_status', None) == instance.status:
            return
        if instance.status != 'sent':
            return

        ref = f"SINV-{instance.invoice_number}"
        if _je_exists_for_ref(ref):
            return

        company = instance.company
        tax     = Decimal(str(instance.tax_amount or 0))
        total   = Decimal(str(instance.total_amount or 0))
        subtotal = total - tax

        ar_acct      = _get_account(company, 'accounts receivable', 'trade receivable', 'debtors', category='asset')
        revenue_acct = _get_account(company, 'sales revenue', 'sales income', 'revenue', 'sales', category='income')
        gst_out_acct = _get_account(company, 'gst output', 'output gst', 'output tax', 'gst payable', category='liability')

        lines = [
            (ar_acct, total, 0, f"A/R — {instance.customer}"),
            (revenue_acct, 0, subtotal, f"Sales — {instance.invoice_number}"),
        ]
        if tax > 0:
            lines.append((gst_out_acct, 0, tax, f"GST Output — {instance.invoice_number}"))
        else:
            lines[-1] = (revenue_acct, 0, total, f"Sales — {instance.invoice_number}")

        _create_je(
            company=company,
            entry_date=instance.invoice_date,
            description=f"Sales Invoice {instance.invoice_number} — {instance.customer}",
            reference=ref,
            lines=lines,
        )


# ============================================================
# SIGNAL 2: purchase.PurchaseInvoice → status 'posted'
# DR  Purchase Expense  (subtotal = total - tax)
# DR  GST Input Tax     (tax_amount)  — if > 0
# CR  Accounts Payable  (total_amount)
# ============================================================

def wire_purchase_invoice_signals():
    from purchase.models import PurchaseInvoice

    pre_save.connect(_attach_old_status, sender=PurchaseInvoice,
                     dispatch_uid='finance_signals_purch_inv_pre')

    @receiver(post_save, sender=PurchaseInvoice,
              dispatch_uid='finance_signals_purch_inv_post')
    def on_purchase_invoice_posted(sender, instance, **kwargs):
        if getattr(instance, '_old_status', None) == instance.status:
            return
        if instance.status != 'posted':
            return

        ref = f"PINV-{instance.invoice_number}"
        if _je_exists_for_ref(ref):
            return

        company  = instance.company
        tax      = Decimal(str(instance.tax_amount or 0))
        total    = Decimal(str(instance.total_amount or 0))
        subtotal = total - tax

        purch_acct   = _get_account(company, 'purchase expense', 'purchases', 'raw material', category='expense')
        gst_in_acct  = _get_account(company, 'gst input', 'input gst', 'input tax', 'gst receivable', category='asset')
        ap_acct      = _get_account(company, 'accounts payable', 'trade payable', 'creditors', category='liability')

        lines = [(ap_acct, 0, total, f"A/P — {instance.vendor}")]
        if tax > 0:
            lines = [
                (purch_acct,  subtotal, 0, f"Purchases — {instance.invoice_number}"),
                (gst_in_acct, tax,      0, f"GST Input — {instance.invoice_number}"),
                (ap_acct,     0,    total, f"A/P — {instance.vendor}"),
            ]
        else:
            lines = [
                (purch_acct, total, 0, f"Purchases — {instance.invoice_number}"),
                (ap_acct,    0, total, f"A/P — {instance.vendor}"),
            ]

        _create_je(
            company=company,
            entry_date=instance.invoice_date,
            description=f"Purchase Invoice {instance.invoice_number} — {instance.vendor}",
            reference=ref,
            lines=lines,
        )


# ============================================================
# SIGNAL 3: finance.Payment → status 'posted'
# Vendor payment:
#   DR  Accounts Payable  (amount)
#   CR  Bank / Cash       (net_amount)
#   CR  TDS Payable       (tds_amount)  — if > 0
# Employee payment:
#   DR  Net Salary Payable (net_amount)
#   CR  Bank / Cash        (net_amount)
# ============================================================

def wire_payment_signals():
    from finance.models import Payment

    pre_save.connect(_attach_old_status, sender=Payment,
                     dispatch_uid='finance_signals_payment_pre')

    @receiver(post_save, sender=Payment,
              dispatch_uid='finance_signals_payment_post')
    def on_payment_posted(sender, instance, **kwargs):
        if getattr(instance, '_old_status', None) == instance.status:
            return
        if instance.status != 'posted':
            return
        if instance.journal_entry_id:
            return  # JE already linked

        company    = instance.company
        amount     = Decimal(str(instance.amount))
        tds        = Decimal(str(instance.tds_amount or 0))
        net_amount = Decimal(str(instance.net_amount))

        # Bank / cash account — prefer GL account linked to bank account FK
        bank_acct = None
        if instance.bank_account_id and instance.bank_account.gl_account_id:
            bank_acct = instance.bank_account.gl_account
        if bank_acct is None:
            if instance.payment_mode == 'cash':
                bank_acct = _get_account(company, 'cash', 'petty cash', category='asset')
            else:
                bank_acct = _get_account(company, 'bank account', 'current account', 'bank', category='asset')

        if instance.party_type == 'employee':
            salary_payable = _get_account(company, 'net salary payable', 'salary payable', 'wages payable', category='liability')
            lines = [
                (salary_payable, net_amount, 0,          f"Salary payable — {instance.employee}"),
                (bank_acct,      0,          net_amount,  f"Bank payment — {instance.payment_number}"),
            ]
        else:
            ap_acct      = _get_account(company, 'accounts payable', 'trade payable', 'creditors', category='liability')
            tds_payable  = _get_account(company, 'tds payable', 'tax deducted at source', 'tds', category='liability')

            if tds > 0:
                lines = [
                    (ap_acct,     amount,     0,          f"A/P cleared — {instance.vendor or instance.payment_number}"),
                    (bank_acct,   0,          net_amount, f"Bank payment — {instance.payment_number}"),
                    (tds_payable, 0,          tds,        f"TDS deducted — {instance.payment_number}"),
                ]
            else:
                lines = [
                    (ap_acct,   amount, 0,      f"A/P cleared — {instance.vendor or instance.payment_number}"),
                    (bank_acct, 0,      amount, f"Bank payment — {instance.payment_number}"),
                ]

        je = _create_je(
            company=company,
            entry_date=instance.payment_date,
            description=f"Payment {instance.payment_number}",
            reference=f"PAY-{instance.payment_number}",
            lines=lines,
        )
        if je:
            # Link JE back to Payment (without re-triggering signal)
            Payment.objects.filter(pk=instance.pk).update(journal_entry=je)


# ============================================================
# SIGNAL 4: finance.Receipt → status 'posted'
# DR  Bank / Cash          (amount)
# CR  Accounts Receivable  (amount - tcs_amount)
# CR  TCS Payable          (tcs_amount)  — if > 0
# ============================================================

def wire_receipt_signals():
    from finance.models import Receipt

    pre_save.connect(_attach_old_status, sender=Receipt,
                     dispatch_uid='finance_signals_receipt_pre')

    @receiver(post_save, sender=Receipt,
              dispatch_uid='finance_signals_receipt_post')
    def on_receipt_posted(sender, instance, **kwargs):
        if getattr(instance, '_old_status', None) == instance.status:
            return
        if instance.status != 'posted':
            return
        if instance.journal_entry_id:
            return

        company = instance.company
        amount  = Decimal(str(instance.amount))
        tcs     = Decimal(str(instance.tcs_amount or 0))
        ar_amt  = amount - tcs

        bank_acct = None
        if instance.bank_account_id and instance.bank_account.gl_account_id:
            bank_acct = instance.bank_account.gl_account
        if bank_acct is None:
            if instance.receipt_mode == 'cash':
                bank_acct = _get_account(company, 'cash', 'petty cash', category='asset')
            else:
                bank_acct = _get_account(company, 'bank account', 'current account', 'bank', category='asset')

        ar_acct      = _get_account(company, 'accounts receivable', 'trade receivable', 'debtors', category='asset')
        tcs_payable  = _get_account(company, 'tcs payable', 'tax collected at source', 'tcs', category='liability')

        if tcs > 0:
            lines = [
                (bank_acct,   amount, 0,      f"Bank receipt — {instance.receipt_number}"),
                (ar_acct,     0,      ar_amt, f"A/R cleared — {instance.customer or instance.receipt_number}"),
                (tcs_payable, 0,      tcs,    f"TCS collected — {instance.receipt_number}"),
            ]
        else:
            lines = [
                (bank_acct, amount, 0,      f"Bank receipt — {instance.receipt_number}"),
                (ar_acct,   0,      amount, f"A/R cleared — {instance.customer or instance.receipt_number}"),
            ]

        je = _create_je(
            company=company,
            entry_date=instance.receipt_date,
            description=f"Receipt {instance.receipt_number}",
            reference=f"REC-{instance.receipt_number}",
            lines=lines,
        )
        if je:
            Receipt.objects.filter(pk=instance.pk).update(journal_entry=je)


# ============================================================
# SIGNAL 5: hr_payroll.PaySlip → status 'approved'
# DR  Salary Expense        (gross_earnings)
# DR  PF Expense            (pf_employer)       — employer share
# DR  ESI Expense           (esi_employer)      — employer share
# CR  PF Payable            (pf_employee + pf_employer)
# CR  ESI Payable           (esi_employee + esi_employer)
# CR  PT Payable            (professional_tax)  — if > 0
# CR  TDS Payable           (tds_on_salary)     — if > 0
# CR  Other Deductions      (other_deductions)  — if > 0
# CR  Net Salary Payable    (net_salary)
#
# Verify: DR = gross + pf_emp + esi_emp
#         CR = (pf_ee+pf_emp) + (esi_ee+esi_emp) + pt + tds + other + net
#            = net + pf_ee + esi_ee + pt + tds + other + pf_emp + esi_emp
#            = gross + pf_emp + esi_emp  ✓
# ============================================================

def wire_payslip_signals():
    from hr_payroll.models import PaySlip

    pre_save.connect(_attach_old_status, sender=PaySlip,
                     dispatch_uid='finance_signals_payslip_pre')

    @receiver(post_save, sender=PaySlip,
              dispatch_uid='finance_signals_payslip_post')
    def on_payslip_approved(sender, instance, **kwargs):
        if getattr(instance, '_old_status', None) == instance.status:
            return
        if instance.status != 'approved':
            return

        ref = f"PSLIP-{instance.pk}"
        if _je_exists_for_ref(ref):
            return

        company = instance.period.company if instance.period_id else None

        gross        = Decimal(str(instance.gross_earnings or 0))
        pf_ee        = Decimal(str(instance.pf_employee    or 0))
        pf_er        = Decimal(str(instance.pf_employer    or 0))
        esi_ee       = Decimal(str(instance.esi_employee   or 0))
        esi_er       = Decimal(str(instance.esi_employer   or 0))
        pt           = Decimal(str(instance.professional_tax or 0))
        tds          = Decimal(str(instance.tds_on_salary  or 0))
        other_ded    = Decimal(str(instance.other_deductions or 0))
        net          = Decimal(str(instance.net_salary     or 0))

        sal_exp  = _get_account(company, 'salary expense', 'salaries and wages', 'employee cost', category='expense')
        pf_exp   = _get_account(company, 'pf expense', 'provident fund expense', 'epf expense', category='expense')
        esi_exp  = _get_account(company, 'esi expense', 'employee state insurance expense', category='expense')
        pf_pay   = _get_account(company, 'pf payable', 'provident fund payable', 'epf payable', category='liability')
        esi_pay  = _get_account(company, 'esi payable', 'employee state insurance payable', category='liability')
        pt_pay   = _get_account(company, 'professional tax payable', 'pt payable', category='liability')
        tds_pay  = _get_account(company, 'tds payable', 'income tax payable', category='liability')
        net_pay  = _get_account(company, 'net salary payable', 'salary payable', 'wages payable', category='liability')
        ded_pay  = _get_account(company, 'other deductions payable', 'advance recovery payable', category='liability')

        lines = []

        # Debit side
        lines.append((sal_exp, gross,  0, f"Salary — {instance.employee.full_name} {instance.period.period_name}"))
        if pf_er > 0 and pf_exp:
            lines.append((pf_exp, pf_er, 0, f"Employer PF — {instance.employee.full_name}"))
        if esi_er > 0 and esi_exp:
            lines.append((esi_exp, esi_er, 0, f"Employer ESI — {instance.employee.full_name}"))

        # Credit side
        pf_total  = pf_ee + pf_er
        esi_total = esi_ee + esi_er
        if pf_total > 0:
            lines.append((pf_pay,  0, pf_total,  f"PF Payable — {instance.employee.full_name}"))
        if esi_total > 0:
            lines.append((esi_pay, 0, esi_total, f"ESI Payable — {instance.employee.full_name}"))
        if pt > 0:
            lines.append((pt_pay,  0, pt,         f"PT Payable — {instance.employee.full_name}"))
        if tds > 0:
            lines.append((tds_pay, 0, tds,        f"TDS on Salary — {instance.employee.full_name}"))
        if other_ded > 0:
            lines.append((ded_pay, 0, other_ded,  f"Other Deductions — {instance.employee.full_name}"))
        lines.append((net_pay, 0, net, f"Net Salary Payable — {instance.employee.full_name}"))

        # If PF/ESI employer expense accounts not found, fold into salary expense
        if pf_er > 0 and pf_exp is None:
            lines[0] = (sal_exp, gross + pf_er + (esi_er if esi_exp is None else 0), 0, lines[0][3])
        if esi_er > 0 and esi_exp is None:
            if pf_exp is not None:
                lines[0] = (sal_exp, gross + esi_er, 0, lines[0][3])

        _create_je(
            company=company,
            entry_date=instance.period.start_date if instance.period_id else None,
            description=f"Payslip {instance.period.period_name if instance.period_id else ''} — {instance.employee.full_name}",
            reference=ref,
            lines=lines,
        )


# ============================================================
# ENTRY POINT — called from FinanceConfig.ready()
# ============================================================

def connect_all_signals():
    """Connect all auto-journal signals. Called once from apps.py."""
    try:
        wire_sales_invoice_signals()
        logger.debug("Wired: SalesInvoice → JE")
    except Exception as e:
        logger.warning("Could not wire SalesInvoice signals: %s", e)

    try:
        wire_purchase_invoice_signals()
        logger.debug("Wired: PurchaseInvoice → JE")
    except Exception as e:
        logger.warning("Could not wire PurchaseInvoice signals: %s", e)

    try:
        wire_payment_signals()
        logger.debug("Wired: Payment → JE")
    except Exception as e:
        logger.warning("Could not wire Payment signals: %s", e)

    try:
        wire_receipt_signals()
        logger.debug("Wired: Receipt → JE")
    except Exception as e:
        logger.warning("Could not wire Receipt signals: %s", e)

    try:
        wire_payslip_signals()
        logger.debug("Wired: PaySlip → JE")
    except Exception as e:
        logger.warning("Could not wire PaySlip signals: %s", e)
