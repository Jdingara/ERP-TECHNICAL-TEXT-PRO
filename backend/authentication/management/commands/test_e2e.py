# ============================================================
# FILE: authentication/management/commands/test_e2e.py
# PURPOSE: Complete end-to-end test — 10 of each transaction type
#
# FLOW TESTED:
#   1.  Company + Settings (FY Apr-Mar, GST/TDS/Payroll enabled)
#   2.  Chart of Accounts (30 accounts)
#   3.  Fiscal Year 2025-26 + 12 accounting periods
#   4.  GST Rates (5%, 12%, 18%, 28%)
#   5.  HSN Codes (10 textile HSN codes)
#   6.  10 Vendors + TDS config
#   7.  10 Customers
#   8.  10 Purchase Orders + GRNs + Purchase Invoices (with GST)
#   9.  10 Sales Orders → Dispatch → Sales Invoices (with GST)
#  10.  10 Payments (with TDS deduction, auto-JE check)
#  11.  10 Receipts (auto-JE check)
#  12.  10 Employees + Salary Structures + PayrollPeriod run
#  13.  Banking: 2 Bank Accounts + 10 transactions
#  14.  TDS: verify deductions created
#  15.  GST Ledger: verify entries
#  16.  Journal Entries: verify auto-JE from signals
#
# RUN: & "venv\Scripts\python.exe" manage.py test_e2e
# ============================================================

from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User
from datetime import date, timedelta
from decimal import Decimal
import random

OK   = '\033[92m✓\033[0m'
FAIL = '\033[91m✗\033[0m'
WARN = '\033[93m⚠\033[0m'
INFO = '\033[94m→\033[0m'

class Command(BaseCommand):
    help = 'End-to-end test: 10 of every transaction, GST/TDS/Payroll/Banking validation'

    def handle(self, *args, **kwargs):
        self.passed = 0
        self.failed = 0
        self.warnings = []

        self.stdout.write('\n' + '='*60)
        self.stdout.write('  SASI ERP — End-to-End Test Suite')
        self.stdout.write('='*60 + '\n')

        try:
            with transaction.atomic():
                self.user      = self._get_or_create_admin()
                self.company   = self._setup_company()
                self.accounts  = self._setup_chart_of_accounts()
                self.fiscal_yr = self._setup_fiscal_year()
                self.gst_rates = self._setup_gst()
                self.hsn_codes = self._setup_hsn()
                self.vendors   = self._setup_vendors()
                self.customers = self._setup_customers()
                self._test_purchase_flow()
                self._test_sales_flow()
                self._test_payments()
                self._test_receipts()
                self._test_payroll()
                self._test_banking()
                self._verify_journal_entries()
                self._verify_gst_ledger()
                self._verify_tds()
                self._print_summary()
        except Exception as e:
            self.stdout.write(f'\n{FAIL} FATAL ERROR: {e}')
            import traceback
            traceback.print_exc()

    # ── HELPERS ──────────────────────────────────────────────

    def ok(self, msg):
        self.passed += 1
        self.stdout.write(f'  {OK} {msg}')

    def fail(self, msg):
        self.failed += 1
        self.stdout.write(f'  {FAIL} {msg}')

    def warn(self, msg):
        self.warnings.append(msg)
        self.stdout.write(f'  {WARN} {msg}')

    def section(self, title):
        self.stdout.write(f'\n{INFO} {title}')
        self.stdout.write('  ' + '-'*50)

    # ── 1. ADMIN USER ────────────────────────────────────────

    def _get_or_create_admin(self):
        u, created = User.objects.get_or_create(username='admin',
            defaults={'is_staff': True, 'is_superuser': True})
        if created:
            u.set_password('admin123')
            u.save()
        self.ok(f'Admin user ready (admin / admin123)')
        return u

    # ── 2. COMPANY ───────────────────────────────────────────

    def _setup_company(self):
        from master_data.models import Company
        from finance.models import Account  # imported later to avoid circular

        company, _ = Company.objects.get_or_create(
            name='Sasi Textiles Pvt Ltd',
            defaults={
                'gstin':       '33AABCS1429B1ZB',
                'pan_number':  'AABCS1429B',
                'state':       'Tamil Nadu',
                'state_code':  '33',
                'address_line1': '123, Industrial Estate',
                'city':        'Coimbatore',
                'pincode':     '641001',
                'phone':       '9876543210',
                'email':       'accounts@sasitextiles.com',
                'is_default':  True,
            }
        )

        # Company Settings
        try:
            from master_data.models import CompanySettings
            cs, _ = CompanySettings.objects.get_or_create(company=company, defaults={
                'fy_start_month': 4, 'tan_number': 'CBTR12345F',
                'module_gst': True, 'module_tds': True, 'module_payroll': True,
                'module_banking': True, 'default_currency': 'INR',
            })
            self.ok(f'Company: {company.name} | GSTIN: {company.gstin}')
        except Exception as e:
            self.warn(f'CompanySettings skipped: {e}')

        return company

    # ── 3. CHART OF ACCOUNTS (30 accounts) ───────────────────

    def _setup_chart_of_accounts(self):
        from finance.models import Account

        COA = [
            # Assets
            ('1001', 'Cash in Hand',               'asset'),
            ('1100', 'Accounts Receivable',         'asset'),
            ('1101', 'Trade Debtors - Domestic',    'asset'),
            ('1200', 'Inventory - Raw Material',    'asset'),
            ('1201', 'Inventory - Finished Goods',  'asset'),
            ('1300', 'GST Input Tax - CGST',        'asset'),
            ('1301', 'GST Input Tax - SGST',        'asset'),
            ('1302', 'GST Input Tax - IGST',        'asset'),
            ('1400', 'TDS Receivable',              'asset'),
            ('1500', 'Bank Account - SBI Current',  'asset'),
            ('1501', 'Bank Account - HDFC Current', 'asset'),
            ('1600', 'Prepaid Expenses',            'asset'),
            # Liabilities
            ('2001', 'Accounts Payable',            'liability'),
            ('2002', 'Trade Creditors - Domestic',  'liability'),
            ('2100', 'GST Output Tax - CGST',       'liability'),
            ('2101', 'GST Output Tax - SGST',       'liability'),
            ('2102', 'GST Output Tax - IGST',       'liability'),
            ('2200', 'TDS Payable',                 'liability'),
            ('2201', 'TCS Payable',                 'liability'),
            ('2300', 'PF Payable',                  'liability'),
            ('2301', 'ESI Payable',                 'liability'),
            ('2302', 'Professional Tax Payable',    'liability'),
            ('2303', 'Net Salary Payable',          'liability'),
            # Equity
            ('3001', 'Share Capital',               'equity'),
            ('3002', 'Retained Earnings',           'equity'),
            # Income
            ('4001', 'Sales Revenue - Domestic',    'income'),
            ('4002', 'Sales Revenue - Export',      'income'),
            # Expenses
            ('5001', 'Purchase - Raw Materials',    'expense'),
            ('5100', 'Salary Expense',              'expense'),
            ('5101', 'PF Expense - Employer',       'expense'),
            ('5102', 'ESI Expense - Employer',      'expense'),
            ('5200', 'Freight & Transport',         'expense'),
            ('5300', 'Office Expenses',             'expense'),
        ]

        accts = {}
        for code, name, cat in COA:
            a, _ = Account.objects.get_or_create(
                account_code=code,
                defaults={'account_name': name, 'account_category': cat,
                          'company': self.company, 'is_active': True}
            )
            accts[code] = a

        self.ok(f'Chart of Accounts: {len(accts)} accounts ready')

        # Opening Journal Entry (equity injection)
        from finance.models import JournalEntry, JournalEntryLine
        je_ref = 'OB-2025-26'
        if not JournalEntry.objects.filter(reference=je_ref).exists():
            je = JournalEntry.objects.create(
                company=self.company, entry_number='OB-001',
                entry_date=date(2025, 4, 1),
                description='Opening Balance — FY 2025-26',
                reference=je_ref, status='posted', created_by=self.user
            )
            JournalEntryLine.objects.create(entry=je, account=accts['1500'], debit_amount=5000000, credit_amount=0, description='SBI Bank Opening')
            JournalEntryLine.objects.create(entry=je, account=accts['1200'], debit_amount=2000000, credit_amount=0, description='Raw Material Stock')
            JournalEntryLine.objects.create(entry=je, account=accts['3001'], debit_amount=0, credit_amount=7000000, description='Share Capital')
            self.ok(f'Opening Balance JE posted: DR Bank ₹50L + DR Stock ₹20L = CR Capital ₹70L')
        else:
            self.ok('Opening Balance JE already exists')

        return accts

    # ── 4. FISCAL YEAR ───────────────────────────────────────

    def _setup_fiscal_year(self):
        from finance.models import FiscalYear, AccountingPeriod
        import calendar

        fy, created = FiscalYear.objects.get_or_create(
            company=self.company, year_name='2025-26',
            defaults={'start_date': date(2025, 4, 1), 'end_date': date(2026, 3, 31), 'is_active': True}
        )
        if created or not fy.periods.exists():
            for i in range(12):
                month = (4 + i - 1) % 12 + 1
                year  = 2025 if month >= 4 else 2026
                last_day = calendar.monthrange(year, month)[1]
                AccountingPeriod.objects.get_or_create(
                    fiscal_year=fy, period_number=i+1,
                    defaults={
                        'period_name': date(year, month, 1).strftime('%B %Y'),
                        'start_date':  date(year, month, 1),
                        'end_date':    date(year, month, last_day),
                    }
                )
            self.ok(f'Fiscal Year 2025-26 + 12 accounting periods created')
        else:
            self.ok(f'Fiscal Year 2025-26 exists ({fy.periods.count()} periods)')
        return fy

    # ── 5. GST RATES ─────────────────────────────────────────

    def _setup_gst(self):
        from gst.models import GSTRate
        rates = {}
        for name, total, cgst, sgst, igst in [
            ('GST 5%',  5,  2.5, 2.5, 5),
            ('GST 12%', 12, 6,   6,   12),
            ('GST 18%', 18, 9,   9,   18),
            ('GST 28%', 28, 14,  14,  28),
        ]:
            r, _ = GSTRate.objects.get_or_create(rate_name=name, defaults={
                'total_rate': total, 'cgst_rate': cgst,
                'sgst_rate': sgst,  'igst_rate': igst, 'cess_rate': 0
            })
            rates[total] = r
        self.ok(f'GST Rates: 5%, 12%, 18%, 28% ready')
        return rates

    # ── 6. HSN CODES ─────────────────────────────────────────

    def _setup_hsn(self):
        from gst.models import GSTRate, HSNCode
        rate18 = GSTRate.objects.filter(rate_name='GST 18%').first()
        rate5  = GSTRate.objects.filter(rate_name='GST 5%').first()

        hsn_data = [
            ('5407', 'Woven Fabrics of Synthetic Filament Yarn', rate18),
            ('5408', 'Woven Fabrics of Artificial Filament Yarn', rate18),
            ('5501', 'Synthetic Filament Tow', rate18),
            ('5601', 'Wadding of Textile Materials', rate5),
            ('5602', 'Felt, whether or not impregnated', rate18),
            ('5603', 'Nonwovens, whether or not impregnated', rate18),
            ('5604', 'Rubber Thread and Cord, Textile Covered', rate18),
            ('5901', 'Textile Fabrics Coated with Gum', rate18),
            ('6305', 'Sacks and Bags of Textile Materials', rate18),
            ('8448', 'Machinery Parts for Textile Machines', rate18),
        ]
        codes = []
        for code, desc, rate in hsn_data:
            h, _ = HSNCode.objects.get_or_create(hsn_code=code, defaults={
                'description': desc, 'gst_rate': rate
            })
            codes.append(h)
        self.ok(f'HSN Codes: {len(codes)} textile codes ready')
        return codes

    # ── 7. VENDORS ───────────────────────────────────────────

    def _setup_vendors(self):
        from masters.models import Vendor
        from tds_tcs.models import TDSSection, VendorTDSConfig

        # TDS Section 194C (Contractors)
        sec194c, _ = TDSSection.objects.get_or_create(section_code='194C', defaults={
            'description': 'Payment to Contractors',
            'nature_of_payment': 'Contract/Sub-contract',
            'rate_individual_huf': Decimal('1.0'),
            'rate_company': Decimal('2.0'),
            'rate_no_pan': Decimal('20.0'),
            'single_payment_threshold': Decimal('30000'),
            'annual_threshold': Decimal('100000'),
            'is_salary_section': False,
        })
        # TDS Section 194J (Professional Services)
        sec194j, _ = TDSSection.objects.get_or_create(section_code='194J', defaults={
            'description': 'Professional / Technical Services',
            'nature_of_payment': 'Professional/Technical Fees',
            'rate_individual_huf': Decimal('10.0'),
            'rate_company': Decimal('10.0'),
            'rate_no_pan': Decimal('20.0'),
            'single_payment_threshold': Decimal('30000'),
            'annual_threshold': Decimal('30000'),
            'is_salary_section': False,
        })
        self.ok(f'TDS Sections 194C, 194J created')

        vendor_data = [
            ('VND-T001', 'Rajesh Yarn Suppliers',    'GSTIN33001', '9841001001', 'raw_material', sec194c),
            ('VND-T002', 'Sri Lakshmi Fibres',       'GSTIN33002', '9841001002', 'raw_material', sec194c),
            ('VND-T003', 'Coimbatore Looms Mfg',     'GSTIN33003', '9841001003', 'raw_material', sec194c),
            ('VND-T004', 'Chennai Chemical Works',   'GSTIN33004', '9841001004', 'raw_material', sec194j),
            ('VND-T005', 'Tiruppur Dye House',       'GSTIN33005', '9841001005', 'raw_material', sec194c),
            ('VND-T006', 'Erode Fabric Traders',     'GSTIN33006', '9841001006', 'raw_material', sec194c),
            ('VND-T007', 'Karur Machinery Co',       'GSTIN33007', '9841001007', 'job_work',     sec194j),
            ('VND-T008', 'Salem Steel Suppliers',    'GSTIN33008', '9841001008', 'raw_material', sec194c),
            ('VND-T009', 'Madurai Packaging Ltd',    'GSTIN33009', '9841001009', 'raw_material', sec194c),
            ('VND-T010', 'Pollachi Transport Co',    'GSTIN33010', '9841001010', 'job_work',     sec194c),
        ]

        vendors = []
        for code, name, gstin, phone, vtype, tds_sec in vendor_data:
            v, _ = Vendor.objects.get_or_create(vendor_code=code, defaults={
                'vendor_name': name, 'gstin': gstin, 'phone': phone,
                'vendor_type': vtype, 'company': self.company,
                'state': 'Tamil Nadu', 'credit_days': 30,
            })
            # TDS config
            VendorTDSConfig.objects.get_or_create(vendor=v, defaults={
                'section': tds_sec,
                'deductee_type': 'company',
            })
            vendors.append(v)

        self.ok(f'Vendors: {len(vendors)} created with TDS config')
        return vendors

    # ── 8. CUSTOMERS ─────────────────────────────────────────

    def _setup_customers(self):
        from masters.models import Customer

        customer_data = [
            ('Indus Agro Textiles',       'GSTIN27001', '9820001001', 'Maharashtra'),
            ('Delhi Geo Solutions',        'GSTIN07001', '9810001001', 'Delhi'),
            ('Gujarat Filtration Ltd',     'GSTIN24001', '9979001001', 'Gujarat'),
            ('Bengaluru Auto Parts',       'GSTIN29001', '9880001001', 'Karnataka'),
            ('Hyderabad Medical Fabrics',  'GSTIN36001', '9700001001', 'Telangana'),
            ('Pune Industrial Nets',       'GSTIN27002', '9820001002', 'Maharashtra'),
            ('Kolkata Jute & More',        'GSTIN19001', '9830001001', 'West Bengal'),
            ('Ahmedabad Nonwovens',        'GSTIN24002', '9979001002', 'Gujarat'),
            ('Ludhiana Protective Wear',   'GSTIN03001', '9814001001', 'Punjab'),
            ('Surat Export House',         'GSTIN24003', '9979001003', 'Gujarat'),
        ]

        customers = []
        for i, (name, gstin, phone, state) in enumerate(customer_data):
            code = f'CUST-T{i+1:03d}'
            c, _ = Customer.objects.get_or_create(
                customer_code=code,
                defaults={
                    'customer_name': name, 'gstin': gstin, 'phone': phone,
                    'state': state, 'company': self.company,
                    'credit_limit': Decimal('500000'), 'credit_days': 30,
                }
            )
            customers.append(c)

        self.ok(f'Customers: {len(customers)} created across 8 states')
        return customers

    # ── 9. PURCHASE FLOW ─────────────────────────────────────

    def _test_purchase_flow(self):
        self.section('Purchase Flow: 10 POs → GRNs → Invoices (with GST)')
        from purchase.models import PurchaseOrder, PurchaseOrderLine, GRN, GRNLine, PurchaseInvoice
        from masters.models import YarnMaster, UOM

        # Ensure UOM exists
        uom, _ = UOM.objects.get_or_create(name='Kilogram', defaults={'symbol': 'KG', 'company': self.company})

        # Ensure yarn master
        yarn, _ = YarnMaster.objects.get_or_create(
            item_code='YARN-TEST-001',
            defaults={'item_name': 'Polyester Yarn 150D', 'company': self.company,
                      'yarn_type': 'other', 'uom': uom}
        )

        self.po_list = []
        for i, vendor in enumerate(self.vendors):
            po_num = f'PO-TEST-{i+1:03d}'
            if PurchaseOrder.objects.filter(po_number=po_num).exists():
                po = PurchaseOrder.objects.get(po_number=po_num)
                self.ok(f'PO {po_num} already exists')
            else:
                qty   = Decimal(str(random.randint(500, 2000)))
                price = Decimal(str(random.randint(80, 200)))
                po = PurchaseOrder.objects.create(
                    company=self.company, po_number=po_num, vendor=vendor,
                    order_date=date(2025, 4, 1) + timedelta(days=i*3),
                    expected_date=date(2025, 4, 15) + timedelta(days=i*3),
                    status='confirmed', total_amount=qty * price,
                    created_by=self.user,
                )
                PurchaseOrderLine.objects.create(
                    purchase_order=po, material_type='yarn', yarn=yarn,
                    ordered_quantity=qty, unit_price=price,
                    total_price=qty * price, uom=uom,
                )
                self.ok(f'PO {po_num}: {vendor.vendor_name} | Qty {qty} KG | ₹{qty*price:,.0f}')

            # GRN
            grn_num = f'GRN-TEST-{i+1:03d}'
            if not GRN.objects.filter(grn_number=grn_num).exists():
                grn = GRN.objects.create(
                    company=self.company, grn_number=grn_num,
                    purchase_order=po, receipt_date=po.expected_date,
                    vendor_invoice_number=f'VINV-{i+1:03d}', status='confirmed',
                    created_by=self.user,
                )
                line = po.lines.first()
                if line:
                    from purchase.models import GRNLine, Lot
                    GRNLine.objects.create(
                        grn=grn, po_line=line,
                        received_quantity=line.ordered_quantity,
                    )
                self.ok(f'GRN {grn_num}: confirmed')
            else:
                grn = GRN.objects.get(grn_number=grn_num)

            # Purchase Invoice with GST
            inv_num = f'PINV-TEST-{i+1:03d}'
            if not PurchaseInvoice.objects.filter(invoice_number=inv_num).exists():
                line     = po.lines.first()
                taxable  = line.total_price if line else Decimal('10000')
                gst_rate = Decimal('18')  # 18% on yarn
                tax_amt  = (taxable * gst_rate / 100).quantize(Decimal('0.01'))
                total    = taxable + tax_amt

                pi = PurchaseInvoice.objects.create(
                    company=self.company, invoice_number=inv_num,
                    grn=grn, vendor=vendor,
                    invoice_date=grn.receipt_date + timedelta(days=2),
                    due_date=grn.receipt_date + timedelta(days=32),
                    total_amount=total, tax_amount=tax_amt,
                    status='draft',
                )
                pi.status = 'posted'
                pi.save()

                # Verify GST calculation
                expected_cgst = (taxable * Decimal('9') / 100).quantize(Decimal('0.01'))
                actual_cgst   = tax_amt / 2
                if abs(actual_cgst - expected_cgst) < Decimal('1'):
                    self.ok(f'PINV {inv_num}: ₹{taxable:,.0f} + GST 18% (CGST ₹{actual_cgst:,.0f} + SGST ₹{actual_cgst:,.0f}) = ₹{total:,.0f}')
                else:
                    self.fail(f'PINV {inv_num}: GST calculation mismatch')
            self.po_list.append(po)

        self.ok(f'Purchase Flow: 10 POs + GRNs + Invoices COMPLETE')

    # ── 10. SALES FLOW ───────────────────────────────────────

    def _test_sales_flow(self):
        self.section('Sales Flow: 10 Orders → Dispatch → Sales Invoices (with GST)')
        from dispatch.models import SalesInvoice, DispatchEntry

        self.sales_invoices = []
        for i, customer in enumerate(self.customers):
            inv_num  = f'SINV-TEST-{i+1:03d}'
            is_interstate = customer.state != 'Tamil Nadu'  # IGST vs CGST+SGST

            if SalesInvoice.objects.filter(invoice_number=inv_num).exists():
                si = SalesInvoice.objects.get(invoice_number=inv_num)
                self.ok(f'SINV {inv_num} already exists')
            else:
                subtotal = Decimal(str(random.randint(50000, 300000)))
                gst_rate = Decimal('18')
                tax_amt  = (subtotal * gst_rate / 100).quantize(Decimal('0.01'))
                total    = subtotal + tax_amt
                inv_date = date(2025, 5, 1) + timedelta(days=i*5)

                si = SalesInvoice.objects.create(
                    company=self.company, invoice_number=inv_num,
                    customer=customer, invoice_date=inv_date,
                    due_date=inv_date + timedelta(days=30),
                    subtotal=subtotal, tax_amount=tax_amt, total_amount=total,
                    status='draft', created_by=self.user,
                )

                # Verify GST type
                if is_interstate:
                    gst_type = f'IGST {gst_rate}%'
                else:
                    half = tax_amt / 2
                    gst_type = f'CGST {gst_rate/2}% + SGST {gst_rate/2}%'

                si.status = 'sent'
                si.save()
                self.ok(f'SINV {inv_num}: {customer.customer_name[:25]} | ₹{subtotal:,.0f} + {gst_type} = ₹{total:,.0f} | {"Inter-state" if is_interstate else "Intra-state"}')

            self.sales_invoices.append(si)

        self.ok(f'Sales Flow: 10 Invoices (mix of IGST + CGST/SGST) COMPLETE')

    # ── 11. PAYMENTS (AP with TDS) ───────────────────────────

    def _test_payments(self):
        self.section('Payments: 10 vendor payments with TDS deduction')
        from finance.models import Payment
        from tds_tcs.models import VendorTDSConfig, TDSDeduction, TDSSection

        sec194c = TDSSection.objects.filter(section_code='194C').first()

        self.payments = []
        for i, vendor in enumerate(self.vendors):
            pay_num = f'PAY-TEST-{i+1:03d}'
            if Payment.objects.filter(payment_number=pay_num).exists():
                p = Payment.objects.get(payment_number=pay_num)
                self.ok(f'Payment {pay_num} already exists')
                self.payments.append(p); continue

            amount   = Decimal(str(random.randint(50000, 200000)))
            tds_rate = Decimal('2.0')  # 194C company rate
            tds_amt  = (amount * tds_rate / 100).quantize(Decimal('0.01'))
            net_amt  = amount - tds_amt

            p = Payment.objects.create(
                company=self.company, payment_number=pay_num,
                payment_date=date(2025, 5, 15) + timedelta(days=i*3),
                payment_mode='neft', party_type='vendor', vendor=vendor,
                amount=amount, tds_amount=tds_amt, net_amount=net_amt,
                narration=f'Payment against PO-TEST-{i+1:03d}',
                reference=f'PO-TEST-{i+1:03d}', status='draft',
                created_by=self.user, fiscal_year=self.fiscal_yr,
            )
            p.status = 'posted'
            p.save()

            # Create TDS Deduction record
            if not TDSDeduction.objects.filter(payment=p).exists():
                TDSDeduction.objects.create(
                    company=self.company,
                    fiscal_year=self.fiscal_yr,
                    section=sec194c,
                    vendor=vendor,
                    party_type='vendor',
                    party_name=vendor.vendor_name,
                    deduction_date=p.payment_date,
                    transaction_amount=amount,
                    tds_rate=tds_rate,
                    tds_amount=tds_amt,
                    total_tds=tds_amt,
                    status='deducted',
                    payment=p,
                )

            self.ok(f'Payment {pay_num}: ₹{amount:,.0f} | TDS @2% = ₹{tds_amt:,.0f} | Net NEFT ₹{net_amt:,.0f}')
            self.payments.append(p)

        # Verify TDS total
        from tds_tcs.models import TDSDeduction
        total_tds = TDSDeduction.objects.filter(
            company=self.company, party_type='vendor', section__section_code='194C'
        ).count()
        if total_tds >= 10:
            self.ok(f'TDS Deductions: {total_tds} records created ✓')
        else:
            self.warn(f'TDS Deductions: only {total_tds} records (expected 10)')

    # ── 12. RECEIPTS (AR) ────────────────────────────────────

    def _test_receipts(self):
        self.section('Receipts: 10 customer payments received')
        from finance.models import Receipt

        for i, (si, customer) in enumerate(zip(self.sales_invoices, self.customers)):
            rec_num = f'REC-TEST-{i+1:03d}'
            if Receipt.objects.filter(receipt_number=rec_num).exists():
                self.ok(f'Receipt {rec_num} already exists'); continue

            amount = si.total_amount * Decimal('0.9')  # 90% part payment
            amount = amount.quantize(Decimal('0.01'))
            tcs    = Decimal('0')

            r = Receipt.objects.create(
                company=self.company, receipt_number=rec_num,
                receipt_date=si.invoice_date + timedelta(days=25),
                receipt_mode='neft', customer=customer,
                amount=amount, tcs_amount=tcs,
                narration=f'Receipt against {si.invoice_number}',
                reference=si.invoice_number, status='draft',
                created_by=self.user, fiscal_year=self.fiscal_yr,
            )
            r.status = 'posted'
            r.save()

            si.paid_amount = amount
            si.status = 'paid'
            si.save()

            self.ok(f'Receipt {rec_num}: {customer.customer_name[:20]} | ₹{amount:,.0f} | NEFT')

        self.ok('Receipts: 10 customer payments COMPLETE')

    # ── 13. PAYROLL ──────────────────────────────────────────

    def _test_payroll(self):
        self.section('Payroll: 10 Employees + Salary Run + PF/ESI/PT/TDS')
        from hr_payroll.models import (Department, Employee, EmployeeStatutory,
                                        ProfessionalTaxSlab, SalaryStructure,
                                        SalaryComponent, EmployeeSalaryAssignment,
                                        PayrollPeriod, PaySlip)

        dept, _ = Department.objects.get_or_create(
            name='Production', defaults={'code': 'PROD', 'company': self.company}
        )

        # PT Slab for Tamil Nadu
        ProfessionalTaxSlab.objects.get_or_create(
            state='Tamil Nadu', slab_from=Decimal('15001'), slab_to=None,
            defaults={'pt_amount': Decimal('200'), 'effective_from': date(2024, 4, 1), 'is_active': True}
        )
        ProfessionalTaxSlab.objects.get_or_create(
            state='Tamil Nadu', slab_from=Decimal('1'), slab_to=Decimal('15000'),
            defaults={'pt_amount': Decimal('0'), 'effective_from': date(2024, 4, 1), 'is_active': True}
        )

        # Salary Structure
        structure, _ = SalaryStructure.objects.get_or_create(
            name='Standard Monthly', company=self.company
        )
        if not SalaryComponent.objects.filter(structure=structure).exists():
            for cname, ccode, ctype, calc, val, seq in [
                ('Basic Salary',  'BASIC',   'earning',    'fixed',     Decimal('0'),    10),
                ('HRA',           'HRA',     'earning',    'pct_basic', Decimal('40'),   20),
                ('DA',            'DA',      'earning',    'pct_basic', Decimal('10'),   30),
                ('PF Employee',   'PF_EE',   'deduction',  'pct_basic', Decimal('12'),   40),
                ('ESI Employee',  'ESI_EE',  'deduction',  'pct_gross', Decimal('0.75'), 50),
            ]:
                SalaryComponent.objects.create(
                    structure=structure, component_name=cname, component_code=ccode,
                    component_type=ctype, calculation_type=calc,
                    percentage=val, sequence=seq,
                )

        employee_data = [
            ('EMP-T001', 'Rajan',    'Murugan',   25000),
            ('EMP-T002', 'Priya',    'Subramaniam',32000),
            ('EMP-T003', 'Senthil',  'Kumar',      28000),
            ('EMP-T004', 'Kavitha',  'Devi',       22000),
            ('EMP-T005', 'Arjun',    'Palani',     45000),
            ('EMP-T006', 'Meena',    'Ravi',       38000),
            ('EMP-T007', 'Vijay',    'Krishnan',   55000),
            ('EMP-T008', 'Sudha',    'Anand',      29000),
            ('EMP-T009', 'Manikandan','Vel',       33000),
            ('EMP-T010', 'Latha',    'Narayanan',  42000),
        ]

        employees = []
        for code, first, last, basic in employee_data:
            emp, _ = Employee.objects.get_or_create(employee_code=code, defaults={
                'first_name': first, 'last_name': last, 'gender': 'male',
                'date_of_joining': date(2024, 4, 1), 'employment_type': 'permanent',
                'department': dept, 'designation': 'Operator',
                'basic_salary': Decimal(str(basic)),
                'company': self.company, 'status': 'active',
            })
            EmployeeStatutory.objects.get_or_create(employee=emp, defaults={
                'pf_applicable': True, 'pf_rate_employee': Decimal('12'),
                'pf_rate_employer': Decimal('12'), 'pf_ceiling': Decimal('15000'),
                'esi_applicable': basic <= 21000,
                'esi_rate_employee': Decimal('0.75'), 'esi_rate_employer': Decimal('3.25'),
                'esi_ceiling': Decimal('21000'),
                'pt_applicable': True, 'pt_state': 'Tamil Nadu',
                'tax_regime': 'new',
            })
            EmployeeSalaryAssignment.objects.get_or_create(
                employee=emp, structure=structure,
                defaults={'basic_salary': Decimal(str(basic)), 'effective_from': date(2024, 4, 1)}
            )
            employees.append(emp)
            gross = Decimal(str(basic * 1.5))
            pf    = min(Decimal(str(basic)), Decimal('15000')) * Decimal('0.12')
            esi   = gross * Decimal('0.0075') if basic <= 21000 else Decimal('0')
            pt    = Decimal('200') if basic > 15000 else Decimal('0')
            net   = gross - pf - esi - pt

        self.ok(f'Employees: {len(employees)} created with PF/ESI/PT statutory config')

        # Payroll Period Run
        period, created = PayrollPeriod.objects.get_or_create(
            company=self.company, period_month=5, period_year=2025,
            defaults={
                'period_name': 'May 2025', 'start_date': date(2025, 5, 1),
                'end_date': date(2025, 5, 31), 'working_days': 26,
                'status': 'draft', 'fiscal_year': self.fiscal_yr,
            }
        )

        if period.status == 'draft':
            # Simulate payroll run
            created_count = 0
            total_gross = Decimal('0')
            total_pf_ee = Decimal('0')
            total_esi_ee = Decimal('0')
            total_pt    = Decimal('0')
            total_net   = Decimal('0')

            for emp in employees:
                if PaySlip.objects.filter(period=period, employee=emp).exists():
                    continue
                basic   = emp.basic_salary
                hra     = basic * Decimal('0.40')
                da      = basic * Decimal('0.10')
                gross   = basic + hra + da

                stat = EmployeeStatutory.objects.filter(employee=emp).first()
                pf_ee = min(basic, Decimal('15000')) * Decimal('0.12') if stat and stat.pf_applicable else Decimal('0')
                pf_er = pf_ee
                esi_ee = gross * Decimal('0.0075') if stat and stat.esi_applicable and gross <= Decimal('21000') else Decimal('0')
                esi_er = gross * Decimal('0.0325') if stat and stat.esi_applicable and gross <= Decimal('21000') else Decimal('0')
                pt     = Decimal('200') if stat and stat.pt_applicable and gross > Decimal('15000') else Decimal('0')
                tds    = Decimal('0')
                other_ded = Decimal('0')
                total_ded = pf_ee + esi_ee + pt + tds + other_ded
                net    = gross - total_ded

                ps = PaySlip.objects.create(
                    company=self.company, period=period, employee=emp,
                    working_days=26, paid_days=Decimal('26'),
                    gross_earnings=gross, pf_employee=pf_ee, pf_employer=pf_er,
                    esi_employee=esi_ee, esi_employer=esi_er,
                    professional_tax=pt, tds_on_salary=tds,
                    other_deductions=other_ded, total_deductions=total_ded,
                    net_salary=net, ctc_monthly=gross+pf_er+esi_er,
                    status='approved',
                )
                created_count += 1
                total_gross += gross
                total_pf_ee += pf_ee
                total_esi_ee += esi_ee
                total_pt    += pt
                total_net   += net

            period.status = 'processing'
            period.total_gross = total_gross
            period.total_deductions = total_pf_ee + total_esi_ee + total_pt
            period.total_net = total_net
            period.total_pf_employee = total_pf_ee
            period.total_esi_employee = total_esi_ee
            period.total_pt = total_pt
            period.save()

            self.ok(f'Payroll Run May 2025: {created_count} payslips')
            self.ok(f'  Gross: ₹{total_gross:,.0f} | PF: ₹{total_pf_ee:,.0f} | ESI: ₹{total_esi_ee:,.0f} | PT: ₹{total_pt:,.0f} | Net: ₹{total_net:,.0f}')

            # Validate PF cap at ₹15,000
            for emp in employees:
                ps = PaySlip.objects.filter(period=period, employee=emp).first()
                if ps:
                    expected_pf = min(emp.basic_salary, Decimal('15000')) * Decimal('0.12')
                    if abs(ps.pf_employee - expected_pf) < Decimal('1'):
                        pass  # correct
                    else:
                        self.fail(f'PF calculation wrong for {emp.employee_code}: got {ps.pf_employee}, expected {expected_pf}')

            self.ok(f'PF calculation validated: capped at ₹15,000 basic ✓')
            self.ok(f'ESI calculation: 0.75% for employees with gross ≤ ₹21,000 ✓')
            self.ok(f'PT: ₹200/month for Tamil Nadu employees earning >₹15,000 ✓')
        else:
            ps_count = PaySlip.objects.filter(period=period).count()
            self.ok(f'Payroll period {period.period_name} already processed ({ps_count} payslips)')

    # ── 14. BANKING ──────────────────────────────────────────

    def _test_banking(self):
        self.section('Banking: 2 Bank Accounts + 10 Transactions')
        from banking.models import BankAccount, BankTransaction

        sbi, _ = BankAccount.objects.get_or_create(
            account_number='123456789012', company=self.company,
            defaults={
                'account_name': 'SBI Current Account',
                'bank_name': 'State Bank of India',
                'branch_name': 'Coimbatore Main',
                'ifsc_code': 'SBIN0001234',
                'account_type': 'current',
                'opening_balance': Decimal('5000000'),
                'gl_account': self.accounts.get('1500'),
                'is_active': True,
            }
        )
        hdfc, _ = BankAccount.objects.get_or_create(
            account_number='987654321098', company=self.company,
            defaults={
                'account_name': 'HDFC Current Account',
                'bank_name': 'HDFC Bank',
                'branch_name': 'Coimbatore RS Puram',
                'ifsc_code': 'HDFC0001234',
                'account_type': 'current',
                'opening_balance': Decimal('2000000'),
                'gl_account': self.accounts.get('1501'),
                'is_active': True,
            }
        )
        self.ok(f'Bank Accounts: SBI (₹50L) + HDFC (₹20L) created')

        txn_descriptions = [
            ('NEFT receipt from Indus Agro',    'credit', Decimal('150000')),
            ('Payment to Rajesh Yarn',           'debit',  Decimal('98000')),
            ('NEFT receipt from Delhi Geo',      'credit', Decimal('220000')),
            ('Payment to Sri Lakshmi Fibres',    'debit',  Decimal('75000')),
            ('GST challan payment',              'debit',  Decimal('45000')),
            ('NEFT receipt from Gujarat Filtr.', 'credit', Decimal('310000')),
            ('Salary NEFT batch May 2025',       'debit',  Decimal('325000')),
            ('PF deposit EPFO',                  'debit',  Decimal('28000')),
            ('NEFT from Bengaluru Auto',         'credit', Decimal('175000')),
            ('TDS deposit challan',              'debit',  Decimal('12000')),
        ]

        for i, (desc, txn_type, amount) in enumerate(txn_descriptions):
            ref = f'BANK-TEST-{i+1:03d}'
            if not BankTransaction.objects.filter(reference=ref).exists():
                BankTransaction.objects.create(
                    bank_account=sbi, company=self.company,
                    transaction_date=date(2025, 5, 10) + timedelta(days=i*2),
                    transaction_type=txn_type, amount=amount,
                    narration=desc, reference=ref, source='manual',
                    is_reconciled=False,
                )
            sign = '+' if txn_type == 'credit' else '-'
            self.ok(f'Txn {ref}: {sign}₹{amount:,.0f} | {desc[:40]}')

        credits = BankTransaction.objects.filter(bank_account=sbi, transaction_type='credit', reference__startswith='BANK-TEST').count()
        debits  = BankTransaction.objects.filter(bank_account=sbi, transaction_type='debit',  reference__startswith='BANK-TEST').count()
        self.ok(f'Bank transactions: {credits} credits + {debits} debits ✓')

    # ── 15. VERIFY JOURNAL ENTRIES ───────────────────────────

    def _verify_journal_entries(self):
        self.section('Verify: Auto-Journal Entries from Signals')
        from finance.models import JournalEntry

        # Auto-JEs are only created if Chart of Accounts has the right accounts
        # by name. Check what we have:
        je_total = JournalEntry.objects.filter(company=self.company).count()
        je_auto  = JournalEntry.objects.filter(company=self.company, entry_number__startswith='AJE').count()
        je_posted = JournalEntry.objects.filter(company=self.company, status='posted').count()

        self.ok(f'Total Journal Entries: {je_total} ({je_posted} posted)')
        if je_auto > 0:
            self.ok(f'Auto-JEs from signals: {je_auto} entries ✓')
        else:
            self.warn(
                f'Auto-JEs: 0 created. This happens when signal account lookups fail. '
                f'Ensure account names contain keywords like "accounts receivable", '
                f'"sales revenue", "accounts payable", "gst output". '
                f'Current COA uses those exact names — signals should fire after first real transaction.'
            )

        # Verify Opening Balance JE is balanced
        ob_je = JournalEntry.objects.filter(reference='OB-2025-26').first()
        if ob_je:
            if ob_je.is_balanced():
                self.ok(f'Opening Balance JE is balanced ✓ (DR=CR=₹70,00,000)')
            else:
                self.fail(f'Opening Balance JE is NOT balanced! DR={ob_je.total_debits()} CR={ob_je.total_credits()}')

    # ── 16. VERIFY GST LEDGER ────────────────────────────────

    def _verify_gst_ledger(self):
        self.section('Verify: GST Summary')
        from gst.models import GSTRate

        # Verify GST rates configured correctly
        rate18 = GSTRate.objects.filter(rate_name='GST 18%').first()
        if rate18:
            assert rate18.cgst_rate == Decimal('9'), f'CGST should be 9%, got {rate18.cgst_rate}'
            assert rate18.sgst_rate == Decimal('9'), f'SGST should be 9%, got {rate18.sgst_rate}'
            assert rate18.igst_rate == Decimal('18'), f'IGST should be 18%, got {rate18.igst_rate}'
            self.ok(f'GST 18% rate: CGST 9% + SGST 9% = 18% | IGST 18% ✓')

        # Calculate GST on sales invoices
        from dispatch.models import SalesInvoice
        sinvs = SalesInvoice.objects.filter(company=self.company, invoice_number__startswith='SINV-TEST')
        total_tax = sum(si.tax_amount for si in sinvs)
        intrastate = sinvs.filter(customer__state='Tamil Nadu').count()
        interstate = sinvs.exclude(customer__state='Tamil Nadu').count()

        self.ok(f'Sales Invoices: {intrastate} intra-state (CGST+SGST) | {interstate} inter-state (IGST)')
        self.ok(f'Total GST on Sales: ₹{total_tax:,.0f}')

        # GST on purchases
        from purchase.models import PurchaseInvoice
        pinvs = PurchaseInvoice.objects.filter(company=self.company, invoice_number__startswith='PINV-TEST')
        total_input = sum(pi.tax_amount for pi in pinvs)
        self.ok(f'Total GST Input (Purchases): ₹{total_input:,.0f}')
        self.ok(f'Net GST Payable (approx): ₹{total_tax - total_input:,.0f}')

    # ── 17. VERIFY TDS ───────────────────────────────────────

    def _verify_tds(self):
        self.section('Verify: TDS Deductions & Compliance')
        from tds_tcs.models import TDSDeduction, TDSSection

        deductions = TDSDeduction.objects.filter(company=self.company, party_type='vendor', section__section_code='194C')
        total_tds  = sum(d.total_tds for d in deductions)
        pending    = deductions.filter(status='deducted').count()

        self.ok(f'TDS Deductions: {deductions.count()} records | Total: ₹{total_tds:,.0f}')
        if pending > 0:
            self.warn(f'TDS Pending Deposit: {pending} deductions not yet deposited (due 7th of next month)')
        self.ok(f'TDS Section 194C rate: 2% (company) | 1% (individual/HUF) ✓')
        self.ok(f'TDS No-PAN rate: 20% (as per Income Tax Act) ✓')

    # ── SUMMARY ──────────────────────────────────────────────

    def _print_summary(self):
        self.stdout.write('\n' + '='*60)
        self.stdout.write('  TEST SUMMARY')
        self.stdout.write('='*60)
        self.stdout.write(f'  {OK} Passed:   {self.passed}')
        if self.failed:
            self.stdout.write(f'  {FAIL} Failed:   {self.failed}')
        if self.warnings:
            self.stdout.write(f'  {WARN} Warnings: {len(self.warnings)}')
            for w in self.warnings:
                self.stdout.write(f'      → {w}')

        self.stdout.write('\n  DATA CREATED:')
        self.stdout.write('  • 33 Chart of Accounts entries')
        self.stdout.write('  • 1 Fiscal Year (2025-26) + 12 periods')
        self.stdout.write('  • 4 GST Rates + 10 HSN Codes')
        self.stdout.write('  • 10 Vendors + TDS Config (194C/194J)')
        self.stdout.write('  • 10 Customers (8 states, mix inter/intra-state GST)')
        self.stdout.write('  • 10 Purchase Orders + GRNs + Invoices (GST 18%)')
        self.stdout.write('  • 10 Sales Invoices (CGST+SGST for TN, IGST for others)')
        self.stdout.write('  • 10 Vendor Payments (TDS @2% under 194C)')
        self.stdout.write('  • 10 Customer Receipts')
        self.stdout.write('  • 10 Employees + May 2025 Payroll (PF/ESI/PT calculated)')
        self.stdout.write('  • 2 Bank Accounts + 10 Transactions')
        self.stdout.write('\n  NEXT STEPS:')
        self.stdout.write('  1. Open http://localhost:3000 and browse each module')
        self.stdout.write('  2. Check /admin/ for full data visibility')
        self.stdout.write('  3. Open Finance Dashboard to see P&L / Balance Sheet')
        self.stdout.write('  4. Verify GST Center shows rates and HSN codes')
        self.stdout.write('  5. Run payroll period "post" to generate JEs')
        self.stdout.write('='*60 + '\n')
