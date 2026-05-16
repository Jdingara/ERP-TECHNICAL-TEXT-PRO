# Sasi ERP — Complete Build Documentation

> **Repository:** github.com/Jdingara/Technical-Textile-ERP  
> **Build Date:** May 2026  
> **Author:** Sasi Kumar R (srskumar143@gmail.com)  
> **Scope:** India ERP — Full QuickBooks replacement for Indian SMBs, built on top of Technical Textile ERP

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Repository Structure](#3-repository-structure)
4. [Backend — All Django Apps](#4-backend--all-django-apps)
5. [Database Schema Summary](#5-database-schema-summary)
6. [Frontend — All Pages](#6-frontend--all-pages)
7. [API Endpoints](#7-api-endpoints)
8. [Auto-Journal Entry Signals](#8-auto-journal-entry-signals)
9. [India Compliance Modules](#9-india-compliance-modules)
10. [Migrations History](#10-migrations-history)
11. [End-to-End Test Suite](#11-end-to-end-test-suite)
12. [Deployment](#12-deployment)
13. [Integration Stubs (Phase 3+)](#13-integration-stubs-phase-3)
14. [Build Phases & Roadmap](#14-build-phases--roadmap)
15. [Known Issues & Limitations](#15-known-issues--limitations)
16. [Change Log](#16-change-log)

---

## 1. Project Overview

This repository contains two ERP products built on a single codebase:

### Product A — Technical Textile ERP (Original)
A specialized ERP for technical textile manufacturers (nonwovens, coated fabrics, industrial textiles). Covers the full production lifecycle from yarn procurement to dispatch.

### Product B — India ERP / QuickBooks Replacement (This Build)
A complete accounting and compliance ERP for Indian SMBs, built as a superset of the textile ERP. Targets businesses currently using QuickBooks, Tally, or spreadsheets.

**Why one codebase:** The textile ERP's master data, purchase, sales, and dispatch modules form the operational backbone. The India ERP adds finance, GST, TDS, payroll, and banking on top — sharing the same company, vendor, and customer records.

### Business Goal
Replace QuickBooks Pro (India) + Tally for:
- GST-registered manufacturers
- Companies with 10–500 employees
- Businesses needing lot-based inventory traceability
- Exporters needing both IGST and CGST+SGST handling

---

## 2. Technology Stack

### Backend
| Component | Choice | Version | Reason |
|-----------|--------|---------|--------|
| Framework | Django | 5.2 (originally), running on 6.0.3 | Mature, batteries-included |
| API | Django REST Framework | 3.x | Industry standard for Django APIs |
| Database | PostgreSQL | 15 | ACID compliance, JSONB, full-text search |
| Auth | Django built-in + session auth | — | CSRF protection, role-based groups |
| Task Queue | (stub) Celery + Redis | — | Planned for async email/report generation |
| Email | Django email backend | — | SMTP configured via settings |

### Frontend
| Component | Choice | Version | Reason |
|-----------|--------|---------|--------|
| Framework | React | 19 | Concurrent features, ecosystem |
| UI Library | Material-UI (MUI) | 7 | Enterprise-grade components |
| Routing | React Router | 6 | Declarative routing |
| State | React hooks (useState/useEffect) | — | No Redux needed at current scale |
| HTTP | Fetch API (native) | — | No extra dependency |
| Charts | (custom CSS/SVG) | — | Lightweight, no chart library dependency |

### Infrastructure
| Component | Choice |
|-----------|--------|
| Hosting | Render.com (Web Service + PostgreSQL) |
| Domain | Custom domain via Render |
| Storage | Render disk / AWS S3 (planned) |
| CI/CD | GitHub → Render auto-deploy on push |
| Monitoring | Render logs + Django logging |

### Development Tools
| Tool | Purpose |
|------|---------|
| PowerShell 5.1 | Windows dev environment |
| Python venv | Isolated Python environment |
| npm | Frontend package management |
| psycopg2 | PostgreSQL adapter for Django |

---

## 3. Repository Structure

```
QB_build/
├── backend/
│   ├── core/                    # Django project root
│   │   ├── settings.py          # All settings (INSTALLED_APPS, DB, email)
│   │   └── urls.py              # Root URL conf (all app URLs wired here)
│   │
│   ├── authentication/          # User auth, RBAC, company switching
│   │   └── management/
│   │       └── commands/
│   │           └── test_e2e.py  # End-to-end test + seed command
│   │
│   ├── master_data/             # Company, CompanyGroup, CompanySettings
│   ├── masters/                 # Vendor, Customer, YarnMaster, ItemMaster, UOM, Location
│   ├── purchase/                # PurchaseOrder, GRN, GRNLine, Lot, PurchaseInvoice
│   ├── dispatch/                # DispatchEntry, SalesInvoice, DeliveryChallan
│   ├── planning/                # SalesOrder, ProductionOrder, Forecast
│   ├── production_exec/         # WarpingBatch, WeavingBatch, process execution screens
│   ├── production/              # Batch, process entries (stenter, embossing, etc.)
│   ├── lot_inventory/           # LotMovement, StockAdjustment
│   ├── quality/                 # Inspection, DefectType, SampleTest
│   ├── maintenance/             # MaintenanceSchedule, MaintenanceLog, Escalation
│   ├── traceability/            # Full lot-to-dispatch traceability
│   ├── reports/                 # Report generation views
│   ├── dashboard/               # KPI dashboard aggregations
│   │
│   ├── finance/                 # NEW — Core accounting
│   │   ├── models.py            # Account, JournalEntry, JELine, FiscalYear,
│   │   │                        #   AccountingPeriod, Payment, Receipt,
│   │   │                        #   PaymentAllocation, ContraEntry, CreditNote,
│   │   │                        #   DebitNote, Budget, BudgetLine
│   │   ├── views.py             # All finance API views
│   │   ├── urls.py              # Finance URL patterns
│   │   ├── signals.py           # Auto-JE signals for all modules
│   │   └── apps.py              # Calls connect_all_signals() on ready()
│   │
│   ├── gst/                     # NEW — GST compliance
│   │   ├── models.py            # GSTRate, HSNCode, SACCode, GSTLedger,
│   │   │                        #   GSTR1Summary, GSTR3BSummary, EInvoiceStub, EWayBillStub
│   │   ├── views.py
│   │   └── urls.py
│   │
│   ├── banking/                 # NEW — Banking
│   │   ├── models.py            # BankAccount, BankTransaction, ChequeBook,
│   │   │                        #   FundTransfer, BankReconciliation, PettyCash
│   │   ├── views.py
│   │   └── urls.py
│   │
│   ├── tds_tcs/                 # NEW — TDS/TCS compliance
│   │   ├── models.py            # TDSSection, VendorTDSConfig, TDSDeduction,
│   │   │                        #   TDSReturn, TCSSection, TCSCollection
│   │   ├── views.py
│   │   └── urls.py
│   │
│   ├── hr_payroll/              # EXTENDED — HR & Payroll
│   │   ├── models.py            # Department, Employee, EmployeeStatutory,
│   │   │                        #   ProfessionalTaxSlab, SalaryStructure,
│   │   │                        #   SalaryComponent, EmployeeSalaryAssignment,
│   │   │                        #   PayrollPeriod, PaySlip, PaySlipLine,
│   │   │                        #   LeaveType, LeaveApplication
│   │   ├── views.py
│   │   └── urls.py
│   │
│   └── venv/                    # Python virtual environment (not committed)
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── App.js               # All routes defined here
│       ├── components/
│       │   └── layout/
│       │       ├── Sidebar.js   # Navigation sidebar (all menu items)
│       │       └── Layout.js    # App shell
│       ├── hooks/
│       │   └── usePageTheme.js  # Shared theme hook (colors, spacing, input styles)
│       └── pages/               # All UI pages (see Section 6)
│
├── SOP.md                       # Standard Operating Procedure (this project)
├── BUILD.md                     # This document
└── README.md                    # Quick start guide
```

---

## 4. Backend — All Django Apps

### 4.1 `authentication` — User Auth & RBAC
**Tables:** `auth_user`, `auth_group`, `auth_permission`, `authentication_*`

Key features:
- Django's built-in User model extended with company association
- Multi-company support: each user belongs to one company
- Role-based access via Django Groups
- Session-based auth (CSRF token via cookie)
- Company switching for holding companies

### 4.2 `master_data` — Company & Settings
**Tables:** `master_data_company`, `master_data_companysettings`, `master_data_companygroup`

Models:
- **Company** — name, GSTIN, TAN, CIN, state, address
- **CompanySettings** — FY start month, module flags (GST/TDS/TCS/Payroll/Banking on-off), ESIC code, PF establishment
- **CompanyGroup** — for holding company setups with multiple subsidiaries

### 4.3 `masters` — Core Master Data
**Tables:** `masters_vendor`, `masters_customer`, `masters_yarnmaster`, `masters_itemmaster`, `masters_uom`, `masters_location`, `masters_productdesign`, `masters_bom`, `masters_bomline`, `masters_process`

Key models:
- **Vendor** — vendor_code (unique), vendor_name, GSTIN, PAN, state, credit_days, vendor_type (raw_material/job_work/both)
- **Customer** — customer_code (unique), customer_name, GSTIN, state, credit_limit, credit_days
- **YarnMaster** — item_code (unique), yarn_type (warp/weft/zari/other), count, composition, uom
- **ItemMaster** — item_code (unique), item_type (chemical/pvc/fabric/accessory/other)
- **UOM** — name, short_name (KG, MTR, NOS, etc.)
- **ProductDesign** — design_code, process_route (direct/fabric_in/full_cycle)

### 4.4 `purchase` — Procurement
**Tables:** `purchase_purchaseorder`, `purchase_purchaseorderline`, `purchase_grn`, `purchase_grnline`, `purchase_lot`, `purchase_purchaseinvoice`

Flow: PO → PO confirmed → GRN → Lot created → Purchase Invoice → Payment

- **PurchaseOrder** — po_number (unique), vendor, order_date, status (draft/confirmed/partial/received/cancelled)
- **PurchaseOrderLine** — material_type, yarn/item FK, ordered_qty, unit_price
- **GRN** — grn_number (unique), po FK, receipt_date, vendor_invoice_number
- **GRNLine** — grn FK, po_line FK, received_quantity
- **Lot** — lot_number (auto: LOT-YYYYMMDD-NNN), grn, material (yarn/item), quantity, balance_qty, status (available/in_use/consumed/rejected)
- **PurchaseInvoice** — invoice_number (unique), grn, vendor, total_amount, tax_amount, status (draft/posted/paid)

### 4.5 `dispatch` — Sales & Delivery
**Tables:** `dispatch_dispatchentry`, `dispatch_dispatchline`, `dispatch_salesinvoice`, `dispatch_packinglabel`

- **DispatchEntry** — dispatch_number (unique), customer, dispatch_date, vehicle, LR number, status
- **SalesInvoice** — invoice_number (unique), customer, subtotal, tax_amount, total_amount, paid_amount, status (draft/sent/paid/overdue)
- **PackingLabel** — per roll/piece label with batch info

### 4.6 `planning` — Sales & Production Planning
- **SalesOrder** — SO number, customer, product, quantity, delivery date
- **ProductionOrder** — linked to SO, machine, target quantity
- **Forecast** — demand forecasts by product/period
- **DailyPlan** — daily machine allocation

### 4.7 `production` / `production_exec` — Production Execution
Process screens for each production stage:
- Warping (yarn → beam)
- Weaving (beam → grey fabric)
- Stenter, Embossing, Lamination, Tumbler (finishing)
- Process Entries (machine-level recording)
- Batch creation and progression through stages

### 4.8 `lot_inventory` — Lot-Based Stock
- LotMovement — every issue/transfer/return recorded
- StockAdjustment — physical count corrections
- Real-time balance per lot

### 4.9 `quality` — QC
- Inspection (incoming/in-process/final)
- DefectType master
- SampleTest (lab test results)

### 4.10 `maintenance` — Preventive Maintenance
- MaintenanceSchedule — machine, frequency, next due
- MaintenanceLog — completed activity records
- Escalation — email alerts for overdue maintenance

### 4.11 `finance` — Core Accounting (NEW)
**Tables:** `finance_account`, `finance_journal_entry`, `finance_je_line`, `finance_fiscal_year`, `finance_accounting_period`, `finance_payment`, `finance_receipt`, `finance_payment_allocation`, `finance_contra_entry`, `finance_credit_note`, `finance_debit_note`, `finance_budget`, `finance_budget_line`

Models:

**Account (Chart of Accounts)**
```
id, company, account_code (unique), account_name, category (asset/liability/equity/income/expense),
parent_account (self-FK for hierarchy), is_active, opening_balance
```

**JournalEntry**
```
id, company, entry_number (unique, AJE-YYYYMMDD-NNNN for auto), entry_date,
description, reference, fiscal_year, accounting_period, status (draft/posted/reversed),
created_by, posted_at
```

**JournalEntryLine**
```
id, journal_entry, account, debit_amount, credit_amount, narration, sequence
```
*Constraint: For each JE, SUM(debit) == SUM(credit)*

**FiscalYear**
```
id, company, year_name ("2025-26"), start_date, end_date, is_active
```
*On save: if is_active=True, all other FYs for company set to inactive*

**AccountingPeriod (auto-created 12 per FY)**
```
id, fiscal_year, period_name ("April 2025"), period_number (1-12), start_date, end_date, is_closed
```

**Payment (AP)**
```
id, company, payment_number (unique), payment_date, fiscal_year, payment_mode
(cash/cheque/neft/rtgs/imps/upi/dd), party_type (vendor/employee/other),
vendor FK, employee FK, bank_account FK, amount, tds_amount, net_amount,
narration, reference, status (draft/posted/cleared/bounced/cancelled)
```

**Receipt (AR)**
```
id, company, receipt_number (unique), receipt_date, fiscal_year, receipt_mode,
customer FK, bank_account FK, amount, tcs_amount, narration, reference,
status (draft/posted/deposited/cleared/bounced/cancelled)
```

**Budget / BudgetLine**
```
Budget: company, fiscal_year, name, status (draft/approved)
BudgetLine: budget, account, period (1-12), budgeted_amount
```

### 4.12 `gst` — GST Compliance (NEW)
**Tables:** `gst_rate`, `gst_hsn_code`, `gst_sac_code`, `gst_ledger`, `gst_gstr1_summary`, `gst_gstr3b_summary`, `gst_einvoice_stub`, `gst_eway_bill_stub`

**GSTRate**
```
id, rate_name ("GST 18%"), total_rate (18.00), cgst_rate (9.00),
sgst_rate (9.00), igst_rate (18.00), cess_rate (0.00), is_active
```

**HSNCode** (goods)
```
id, hsn_code (4/6/8 digit, unique), description, gst_rate FK, is_active
```

**SACCode** (services)
```
id, sac_code (6 digit, unique), description, gst_rate FK, is_active
```

**GSTLedger** (transaction-level GST recording)
```
id, company, transaction_type (sale/purchase/credit_note/debit_note),
invoice_number, invoice_date, party_gstin, party_name, party_state,
supply_type (intrastate/interstate/export), hsn_code, taxable_value,
cgst_amount, sgst_amount, igst_amount, cess_amount, total_gst
```

**EInvoiceStub** — placeholder for GSP API integration
**EWayBillStub** — placeholder for NIC API integration

### 4.13 `banking` — Banking (NEW)
**Tables:** `banking_bank_account`, `banking_bank_transaction`, `banking_cheque_book`, `banking_fund_transfer`, `banking_bank_reconciliation`, `banking_petty_cash`

**BankAccount**
```
id, company, account_name, bank_name, branch_name, account_number (unique within company),
ifsc_code, account_type (current/savings/cc/od), opening_balance,
gl_account FK (finance.Account), is_active
```

**BankTransaction**
```
id, bank_account, company, transaction_date, transaction_type (credit/debit),
amount, narration, reference (unique), source (manual/bank_feed/payment/receipt),
is_reconciled, reconciliation_date, reconciliation_reference
```

**FundTransfer** — intra-company bank-to-bank transfer  
**BankReconciliation** — period-wise reconciliation records  
**PettyCash** — petty cash vouchers

### 4.14 `tds_tcs` — TDS/TCS Compliance (NEW)
**Tables:** `tds_section`, `tds_vendor_config`, `tds_deduction`, `tds_return`, `tcs_section`, `tcs_collection`

**TDSSection**
```
id, section_code ("194C"), description, nature_of_payment ("Contract/Sub-contract"),
rate_individual_huf (1.00), rate_company (2.00), rate_no_pan (20.00),
single_payment_threshold (30000), annual_threshold (100000),
surcharge_applicable, health_cess_applicable, is_salary_section, is_active
```

**VendorTDSConfig** (OneToOne with Vendor)
```
id, vendor (OneToOne), section FK, deductee_type (individual/company/other),
tds_exempt, lower_deduction_rate, lower_deduction_cert, cert_valid_from, cert_valid_to
```

**TDSDeduction**
```
id, company, fiscal_year FK, section FK, deduction_date, party_type (vendor/employee/other),
vendor FK, employee FK, party_pan, party_name, transaction_amount, tds_rate,
tds_amount, surcharge_amount, cess_amount, total_tds, deposit_date, challan_number,
bsr_code, status (deducted/deposited), payment FK, payslip FK
```

**TCSSection** — TCS goods categories with rates  
**TCSCollection** — TCS collected from customers

### 4.15 `hr_payroll` — HR & Payroll (EXTENDED)
**Tables:** `hr_department`, `hr_employee`, `hr_employee_statutory`, `hr_professional_tax_slab`, `hr_salary_structure`, `hr_salary_component`, `hr_employee_salary_assignment`, `hr_payroll_period`, `hr_payslip`, `hr_payslip_line`, `hr_leave_type`, `hr_leave_application`

**Employee**
```
id, company, employee_code (unique), first_name, last_name, gender,
date_of_birth, date_of_joining, employment_type (permanent/contract/probation/intern),
department FK, designation, basic_salary, status (active/inactive/resigned/terminated)
```

**EmployeeStatutory**
```
id, employee (OneToOne), pf_applicable, pf_rate_employee (12%), pf_rate_employer (12%),
pf_ceiling (15000), esi_applicable, esi_rate_employee (0.75%), esi_rate_employer (3.25%),
esi_ceiling (21000), pt_applicable, pt_state, tds_regime (old/new)
```

**ProfessionalTaxSlab** (state-wise)
```
id, state ("Tamil Nadu"), slab_from (15001), slab_to (NULL = above),
pt_amount (200.00), effective_from, is_active
```

**SalaryStructure** + **SalaryComponent**
```
Structure: company, name ("Standard Monthly")
Component: structure FK, component_name, component_code (BASIC/HRA/PF_EE etc.),
           component_type (earning/deduction/employer_contribution),
           calculation_type (fixed/pct_basic/pct_gross/pct_ctc/formula),
           amount, percentage, sequence
```

**PayrollPeriod**
```
id, company, period_name ("May 2025"), period_month, period_year,
start_date, end_date, working_days, status (draft/processing/posted),
fiscal_year FK, total_gross, total_deductions, total_net,
total_pf_employee, total_esi_employee, total_pt
```

**PaySlip**
```
id, company, period FK, employee FK, working_days, paid_days,
gross_earnings, pf_employee, pf_employer, esi_employee, esi_employer,
professional_tax, tds_on_salary, other_deductions, total_deductions,
net_salary, ctc_monthly, status (draft/approved/posted)
```

---

## 5. Database Schema Summary

### Total Tables: 85+
| App | Tables |
|-----|--------|
| authentication | 8 |
| master_data | 5 |
| masters | 10 |
| purchase | 6 |
| dispatch | 4 |
| planning | 4 |
| production / production_exec | 8 |
| lot_inventory | 3 |
| quality | 4 |
| maintenance | 3 |
| traceability | 2 |
| **finance (NEW)** | **13** |
| **gst (NEW)** | **7** |
| **banking (NEW)** | **6** |
| **tds_tcs (NEW)** | **6** |
| **hr_payroll (EXTENDED)** | **10** |

### Key Relationships
```
Company ─┬─ CompanySettings (1:1)
         ├─ Vendor (1:N) ─── VendorTDSConfig (1:1)
         ├─ Customer (1:N)
         ├─ FiscalYear (1:N) ─── AccountingPeriod (1:12)
         ├─ Account / Chart of Accounts (1:N)
         ├─ JournalEntry (1:N) ─── JournalEntryLine (1:N)
         ├─ Payment (1:N) ─── TDSDeduction (1:1)
         ├─ Receipt (1:N)
         ├─ BankAccount (1:N) ─── BankTransaction (1:N)
         ├─ PayrollPeriod (1:N) ─── PaySlip (1:N per employee)
         └─ Employee (1:N) ─── EmployeeStatutory (1:1)

PurchaseOrder ─── PurchaseOrderLine ─── Lot (traceability start)
GRN ─────────── GRNLine ─────────────── Lot

SalesInvoice ─── PaymentAllocation ─── Receipt
PurchaseInvoice ─ PaymentAllocation ─── Payment
```

---

## 6. Frontend — All Pages

### Navigation Structure (Sidebar)

```
Dashboard                    /dashboard
Textile ERP ─────────────────────────────────────────────
  Masters
    Vendors                  /masters/vendors
    Customers                /masters/customers
    Yarn                     /masters/yarn
    Items                    /masters/items
    Products                 /masters/products
    UOM                      /masters/uom
    Locations                /masters/locations
    BOM                      /masters/bom
  Purchase
    Purchase Orders          /purchase/orders
    GRN                      /purchase/grns
    Purchase Invoices        /purchase/invoices
    Lot Stock                /purchase/lot-stock
  Planning
    Sales Orders             /planning/sales-orders
    Production Orders        /planning/production-orders
    Procurement Plan         /planning/procurement
    Forecast                 /planning/forecast
    Daily Plan               /planning/daily-plan
  Production
    Warping                  /production/warping
    Weaving                  /production/weaving
    Batches                  /production/batches
    Beams                    /production/beams
    Process Entries          /production/process-entries
    Stenter                  /production/stenter
    Lamination               /production/lamination
    Embossing                /production/embossing
    Tumbler                  /production/tumbler
    Yarn Issue               /production/yarn-issue
  Quality
    QC Dashboard             /quality/dashboard
    Inspections              /quality/inspections
    Defect Types             /quality/defect-types
    Sample Testing           /quality/sample-testing
  Inventory
    Stock List               /inventory/stock
    Stock Movements          /inventory/movements
    Finished Goods           /inventory/finished-goods
    Lot Dashboard            /lot-inventory/dashboard
    Lot Movements            /lot-inventory/movements
    Stock Adjustments        /lot-inventory/adjustments
  Dispatch
    Dispatch Entries         /dispatch/entries
    Delivery Challans        /dispatch/challans
    Sales Invoices           /dispatch/invoices
  Traceability               /traceability
  Maintenance
    Schedule                 /maintenance/schedule
    Log                      /maintenance/log
    Escalations              /maintenance/escalation
  Reports
    Production               /reports/production
    Inventory                /reports/inventory
    Sales                    /reports/sales
    Reconciliation           /reports/reconciliation
India ERP (New) ──────────────────────────────────────────
  Finance
    Dashboard (P&L/BS/CF)    /finance/dashboard
    Chart of Accounts        /finance/accounts
    Journal Entries          /finance/journal-entries
    Payments (AP)            /finance/payments
    Receipts (AR)            /finance/receipts
    Fiscal Years             /finance/fiscal-years
  GST
    GST Center               /gst/center
  Banking
    Bank Accounts            /banking/accounts
  HR & Payroll
    Employees                /payroll/employees
    Payroll Periods          /payroll/periods
  TDS/TCS
    TDS Center               /tds/center
Settings ────────────────────────────────────────────────
  Company Settings           /settings/company-settings
  Company Master             /settings/company
  Format Panel               /settings/format
  Email Templates            /settings/email-templates
  Tally Integration          /settings/tally
Admin
  Activity Log               /audit/activity-log
  Admin Panel                /admin
Analytics
  Analytics                  /analytics
  Customer Intelligence      /analytics/customer-intelligence
  Smart Feed                 /feed/smart
```

### New Pages Added (This Build)
| Page | File | URL |
|------|------|-----|
| Finance Dashboard | `finance/FinanceDashboardPage.js` | `/finance/dashboard` |
| Chart of Accounts | `finance/ChartOfAccountsPage.js` | `/finance/accounts` |
| Journal Entries | `finance/JournalEntriesPage.js` | `/finance/journal-entries` |
| Payments (AP) | `finance/PaymentsPage.js` | `/finance/payments` |
| Receipts (AR) | `finance/ReceiptsPage.js` | `/finance/receipts` |
| Fiscal Years | `finance/FiscalYearsPage.js` | `/finance/fiscal-years` |
| GST Center | `gst/GSTCenterPage.js` | `/gst/center` |
| Bank Accounts | `banking/BankAccountsPage.js` | `/banking/accounts` |
| Employees | `payroll/EmployeeHRPage.js` | `/payroll/employees` |
| Payroll Periods | `payroll/PayrollPeriodsPage.js` | `/payroll/periods` |
| TDS Center | `tds/TDSCenterPage.js` | `/tds/center` |
| Company Settings | `settings/CompanySettingsPage.js` | `/settings/company-settings` |

### Shared UI Patterns
All pages use `usePageTheme()` hook providing:
- `pt.th` — table header style
- `pt.cell` — table cell style
- `pt.inp` — input field style
- `pt.formPage`, `pt.formHeader`, `pt.backBtn` — form page layout
- `pt.colors.inner`, `pt.colors.muted` — theme colors

---

## 7. API Endpoints

### Finance
```
GET/POST   /api/finance/accounts/
GET/PUT    /api/finance/accounts/<id>/
GET/POST   /api/finance/journal-entries/
GET        /api/finance/journal-entries/<id>/
POST       /api/finance/journal-entries/<id>/post/
GET/POST   /api/finance/fiscal-years/
GET        /api/finance/fiscal-years/<id>/periods/
GET/POST   /api/finance/payments/
POST       /api/finance/payments/<id>/post/
GET/POST   /api/finance/receipts/
POST       /api/finance/receipts/<id>/post/
GET        /api/finance/profit-loss/        ?start=YYYY-MM-DD&end=YYYY-MM-DD
GET        /api/finance/balance-sheet/      ?date=YYYY-MM-DD
GET        /api/finance/cash-flow/          ?start=YYYY-MM-DD&end=YYYY-MM-DD
GET/PUT    /api/finance/company-settings/
```

### GST
```
GET/POST   /api/gst/rates/
GET/PUT    /api/gst/rates/<id>/
GET        /api/gst/hsn/
GET        /api/gst/sac/
GET        /api/gst/gstr1/               ?month=5&year=2025
GET        /api/gst/gstr3b/              ?month=5&year=2025
GET        /api/gst/ledger/
POST       /api/gst/einvoice/<id>/generate/   (stub)
POST       /api/gst/ewb/<id>/generate/         (stub)
```

### Banking
```
GET/POST   /api/banking/accounts/
GET/PUT    /api/banking/accounts/<id>/
GET/POST   /api/banking/transactions/
GET        /api/banking/reconciliation/
POST       /api/banking/fund-transfer/
```

### TDS/TCS
```
GET        /api/tds-tcs/sections/
GET        /api/tds-tcs/deductions/
GET        /api/tds-tcs/dashboard/
POST       /api/tds-tcs/deductions/<id>/deposit/
GET        /api/tds-tcs/tcs-collections/
```

### HR/Payroll
```
GET/POST   /api/payroll/employees/
GET/PUT    /api/payroll/employees/<id>/
GET        /api/payroll/departments/
GET/POST   /api/payroll/payroll-periods/
POST       /api/payroll/payroll-periods/<id>/run/
POST       /api/payroll/payroll-periods/<id>/post/
GET        /api/payroll/payslips/?period=<id>
POST       /api/payroll/payslips/<id>/approve/
```

---

## 8. Auto-Journal Entry Signals

**File:** `backend/finance/signals.py`  
**Entry point:** `connect_all_signals()` called from `FinanceConfig.ready()`

### Architecture
```
Django pre_save signal → stores _old_status on instance
Django post_save signal → if status changed to trigger value → create JE
```

### Signal Handlers

| Trigger | Status Change | Debit | Credit |
|---------|--------------|-------|--------|
| SalesInvoice → 'sent' | draft → sent | Accounts Receivable (total) | Sales Revenue (subtotal) + GST Output (tax) |
| PurchaseInvoice → 'posted' | draft → posted | Purchases (subtotal) + GST Input (tax) | Accounts Payable (total) |
| Payment → 'posted' (vendor) | draft → posted | Accounts Payable (net) | Bank (net) + TDS Payable (TDS) |
| Payment → 'posted' (employee) | draft → posted | Salary Payable | Bank |
| Receipt → 'posted' | draft → posted | Bank (amount) | Accounts Receivable (amount) + TCS Payable (TCS if any) |
| PaySlip → 'approved' | draft → approved | Salary Expense + PF Employer Exp + ESI Employer Exp | PF Payable + ESI Payable + PT Payable + TDS Payable + Net Salary Payable |

### Safety Features
- `_je_exists_for_ref(reference)` — prevents duplicate JEs (idempotent)
- `_get_account()` — uses `icontains` name matching with multiple fallback patterns
- Graceful degradation: if account not found, logs WARNING and skips (does not crash)
- All wiring wrapped in try/except so one failure doesn't block others

### JE Numbering
Format: `AJE-YYYYMMDD-NNNN` (auto-sequential per day)

---

## 9. India Compliance Modules

### 9.1 GST — Goods and Services Tax
- CGST + SGST for intra-state (supplier and buyer in same state)
- IGST for inter-state (supplier and buyer in different states)
- GST rates: 0%, 5%, 12%, 18%, 28% (+ cess for some goods)
- HSN codes on all goods invoices (mandatory for turnover > ₹5 crore)
- SAC codes on all service invoices
- e-Invoice IRN — mandatory for turnover > ₹5 crore (stub ready)
- e-Way Bill — mandatory for goods > ₹50,000 in transit (stub ready)
- Returns: GSTR-1 (monthly), GSTR-3B (monthly), GSTR-9 (annual)

### 9.2 TDS — Tax Deducted at Source
Most commonly used sections in manufacturing:
- **194C** — Payment to contractors and sub-contractors
  - Company: 2%, Individual/HUF: 1%
  - Threshold: ₹30,000 per payment or ₹1,00,000 annual
- **194J** — Professional/Technical services
  - 10% for both company and individual
  - Threshold: ₹30,000
- **192** — Salary (deducted monthly from employees)
  - Rate: as per income tax slab
- **No PAN rate** — 20% for vendors without PAN

Deposit: By 7th of following month (30th April for March)
Returns: 26Q quarterly (non-salary), 24Q quarterly (salary)

### 9.3 Payroll — PF / ESI / PT

**Employees' Provident Fund (EPF)**
- Employee: 12% of Basic Salary (max basic ₹15,000)
- Employer: 12% of Basic (split: 3.67% EPF + 8.33% EPS)
- No EPF if basic > ₹15,000 (unless opted in)
- Deposit: by 15th of following month via EPFO portal

**Employees' State Insurance (ESI)**
- Employee: 0.75% of Gross
- Employer: 3.25% of Gross
- Applicable only if Gross ≤ ₹21,000/month
- Deposit: by 15th of following month via ESIC portal

**Professional Tax (PT)**
State-wise slabs (Tamil Nadu example):
| Gross Salary | PT per month |
|-------------|-------------|
| ≤ ₹15,000 | ₹0 |
| > ₹15,000 | ₹200 |
Paid quarterly in Tamil Nadu (April, July, October, January)

### 9.4 Form Compliance Summary
| Form | Purpose | Frequency | Deadline |
|------|---------|-----------|---------|
| GSTR-1 | Outward supplies | Monthly | 11th of next month |
| GSTR-3B | Summary return | Monthly | 20th of next month |
| GSTR-9 | Annual return | Annual | Dec 31 |
| 26Q | TDS non-salary | Quarterly | 31st post-quarter |
| 24Q | TDS salary | Quarterly | 31st post-quarter |
| Form 16 | TDS certificate to employee | Annual | June 15 |
| Form 16A | TDS certificate to vendor | Quarterly | 15 days post-return |
| EPF ECR | PF remittance challan | Monthly | 15th |
| ESI Challan | ESI remittance | Monthly | 15th |

---

## 10. Migrations History

### Original TT ERP Migrations
- `master_data/0001_initial` through `0006` — Company, UOM, Document Series
- `masters/0001_initial`, `0002_productdesign_process_route`
- `purchase/0001` through `0003`
- `dispatch/0001`, `0002`
- `planning/0001`
- `production/0001`, `production_exec/0001`
- `quality/0001`, `maintenance/0001`, `traceability/0001`
- `lot_inventory/0001`
- `hr_payroll/0001`, `0002` — Basic Employee, Department, Leave

### India ERP Migrations (This Build)
- `master_data/0006_alter_documentseries_document_type_companygroup_and_more`
  - Added CompanyGroup model
  - Added CompanySettings (FY start, TAN, CIN, module flags, ESIC, PF establishment)
  - Added AlterField for DocumentSeries document_type

- `finance/0003_contraentry_creditnote_debitnote_fiscalyear_budget_and_more`
  - Added FiscalYear, AccountingPeriod
  - Added Payment, Receipt, PaymentAllocation
  - Added ContraEntry, CreditNote, DebitNote
  - Added Budget, BudgetLine

- `hr_payroll/0003_professionaltaxslab_employeestatutory_leavetype_and_more`
  - Added EmployeeStatutory (PF/ESI/PT config per employee)
  - Added ProfessionalTaxSlab (state-wise slabs)
  - Added SalaryStructure, SalaryComponent, EmployeeSalaryAssignment
  - Added PayrollPeriod, PaySlip, PaySlipLine
  - Extended LeaveType, LeaveApplication

- `gst/0001_initial` — Full GST app
- `banking/0001_initial` + `0002` — Full Banking app
- `tds_tcs/0001_initial` — Full TDS/TCS app

---

## 11. End-to-End Test Suite

**File:** `backend/authentication/management/commands/test_e2e.py`

### Run Command
```powershell
cd "d:\MY ERP BUILDs\QB_build\backend"
$env:PYTHONIOENCODING='utf-8'
& "venv\Scripts\python.exe" manage.py test_e2e
```

### What It Creates & Validates
1. Admin user (admin / admin123)
2. Company: Sasi Textiles Pvt Ltd (GSTIN: 33AABCS1429B1ZB)
3. 33 Chart of Accounts entries across all categories
4. Opening Balance Journal Entry (DR Bank ₹50L + DR Stock ₹20L = CR Capital ₹70L)
5. Fiscal Year 2025-26 + 12 accounting periods
6. GST Rates: 5%, 12%, 18%, 28% (correct CGST/SGST splits)
7. 10 HSN Codes (textile: 5407, 5408, 5501, 5601, 5602, 5603, 5604, 5901, 6305, 8448)
8. TDS Sections 194C (2% company) and 194J (10%)
9. 10 Vendors with TDS Config (194C for raw material, 194J for professional services)
10. 10 Customers across 8 states (for IGST / intra-state mix)
11. 10 Purchase Orders → GRNs → Purchase Invoices @18% GST
12. 10 Sales Invoices (IGST for inter-state, CGST+SGST for TN)
13. 10 Vendor Payments with TDS @2% under 194C
14. 10 TDS Deduction records
15. 10 Customer Receipts (90% part payments)
16. 10 Employees + May 2025 Payroll (PF/ESI/PT calculated and validated)
17. 2 Bank Accounts (SBI ₹50L, HDFC ₹20L) + 10 Transactions
18. Verification of: JE balance, GST splits, PF cap, ESI ceiling, PT amount

### Test Results (May 2026)
```
✓ Passed:   103
⚠ Warnings: 1 (TDS pending deposit — expected, not yet deposited)
✗ Failed:   0
```

### Fixes Applied During Testing
| Issue | Fix |
|-------|-----|
| HSNCode.uom field doesn't exist | Removed uom from HSN creation |
| TDSSection uses `single_payment_threshold` not `threshold_individual` | Fixed field names |
| Vendor requires `vendor_code` (unique), no `payment_terms` field | Added code, used `credit_days` |
| VendorTDSConfig uses `section` not `tds_section`, `deductee_type` not `vendor_type` | Fixed field names |
| Customer requires `customer_code`, no `payment_terms` | Added code, used `credit_days` |
| TDSDeduction: field names wrong, `reference_number` not a model field | Rewrote creation with correct fields |
| YarnMaster has no `denier` field, needs `item_code` | Fixed defaults |
| GRNLine uses `po_line` not `purchase_order_line`, no `accepted_quantity` | Fixed field names |
| PurchaseInvoice has no `created_by` field | Removed from create call |
| SalaryComponent requires `component_code`, no `is_active` field | Added code, removed is_active |
| PowerShell UnicodeEncodeError (✓ ✗ chars) | Set PYTHONIOENCODING=utf-8 |
| DB: masters_vendor.country NOT NULL without default | Added DB default via ALTER TABLE |
| DB: masters_vendor.currency NOT NULL without default | Added DB default 'INR' |
| DB: masters_customer.customer_type NOT NULL without default | Added DB default 'regular' |

---

## 12. Deployment

### Render.com Setup

**Backend (Web Service)**
```
Build Command:  pip install -r requirements.txt && python manage.py migrate
Start Command:  gunicorn core.wsgi:application
Environment:    DJANGO_SETTINGS_MODULE=core.settings
                DATABASE_URL=postgresql://...  (Render managed)
                SECRET_KEY=...
                ALLOWED_HOSTS=your-app.onrender.com
```

**Frontend (Static Site)**
```
Build Command:  npm install && npm run build
Publish Dir:    build/
```

Or serve frontend from Django using WhiteNoise (whitenoise package):
```python
# settings.py
MIDDLEWARE = ['whitenoise.middleware.WhiteNoiseMiddleware', ...]
STATICFILES_DIRS = [BASE_DIR / 'frontend/build']
```

### Environment Variables Required
```
SECRET_KEY=<random 50-char string>
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DEBUG=False
ALLOWED_HOSTS=your-domain.com,your-app.onrender.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your@email.com
EMAIL_HOST_PASSWORD=app-specific-password
```

---

## 13. Integration Stubs (Phase 3+)

### GSP (GST Suvidha Provider) — e-Invoice & GSTR filing
- **Status:** Stub implemented (EInvoiceStub model)
- **Integration cost:** ₹0.50–₹2 per invoice
- **Provider options:** Karvy, IRIS, ClearTax GSP
- **To activate:** Add GSP credentials in Company Settings → GST Portal

### NIC e-Way Bill Portal
- **Status:** Stub implemented (EWayBillStub model)
- **API:** NIC's REST API for e-Way Bill generation
- **To activate:** Add NIC portal credentials

### Account Aggregator (Bank Feeds)
- **Status:** Stub (bank_feed source type in BankTransaction)
- **Integration cost:** ₹5–₹15/account/month
- **Provider options:** Setu, Finbox, Perfios
- **To activate:** Implement OAuth flow with account aggregator

### Payment Gateway (Razorpay)
- **Status:** Planned Phase 4
- **Cost:** 2% per transaction, no setup fee
- **For:** Online invoice payment links sent to customers

### TRACES (TDS Returns)
- **Status:** Planned Phase 3
- **For:** Filing 26Q/27Q/24Q directly from app

### PAN/GSTIN Verification
- **Status:** Planned Phase 3
- **Cost:** ₹2–₹5 per lookup
- **Provider:** Sandbox, Gridlines, AuthBridge

### Communication
| Channel | Provider | Cost |
|---------|----------|------|
| Email | AWS SES | ₹0.10/1000 |
| SMS | Twilio / MSG91 | ₹0.15/message |
| WhatsApp Business | Twilio / Interakt | ₹0.50–₹1.35/message |

---

## 14. Build Phases & Roadmap

### Phase 1 — Core Technical Textile ERP ✅ COMPLETE
- Authentication + RBAC
- Master Data (Company, Customers, Vendors, Items, UOM, Locations)
- Purchase: PO → GRN → Invoice
- Planning: Sales Orders, Production Orders, Forecasts
- Production Execution (warping, weaving, stenter, embossing, lamination, tumbler)
- Lot-Based Inventory with full traceability
- Quality Control
- Dispatch + Delivery Challan + Sales Invoice
- Reports (PDF/Excel/Print)
- Email/WhatsApp document sharing
- Dashboard analytics
- Maintenance module with email escalation
- Chatbot (AI-powered)

### Phase 2 — India ERP Core ✅ COMPLETE (This Build)
- Chart of Accounts (double-entry bookkeeping)
- Journal Entries (manual + auto from signals)
- Finance Dashboard (P&L, Balance Sheet, Cash Flow)
- Fiscal Years + Accounting Periods
- Payments (AP) + Receipts (AR)
- GST Center (rates, HSN/SAC, GSTR-1, GSTR-3B stubs)
- Banking (accounts, transactions, reconciliation)
- TDS Center (sections, deductions, deposit tracking)
- HR & Payroll (employees, salary structure, payroll run, PF/ESI/PT)
- Company Settings (module flags, FY config, TAN/CIN)
- Auto-Journal Entry signals (payment, receipt, payslip → JE)
- End-to-end test suite (103 validations)

### Phase 3 — GST Filing Integration (Planned)
- GSP API integration for e-Invoice IRN generation
- e-Way Bill API integration
- GSTR-1 direct filing via API
- GSTR-3B direct filing
- TRACES integration for TDS returns

### Phase 4 — Payment Gateway (Planned)
- Razorpay payment links on sales invoices
- Online receipt via payment gateway
- Auto-reconcile gateway receipts

### Phase 5 — Bank Feeds (Planned)
- Account Aggregator API integration (Setu/Finbox)
- Auto-import bank statements
- AI-powered transaction categorization and matching

### Phase 6 — USA Variant (Planned)
- Replace GST → Sales Tax (state-wise)
- Replace TDS → 1099 forms
- Replace PF/ESI → 401k/health insurance
- Replace Professional Tax → State income tax
- Replace INR → USD
- GAAP compliance instead of Ind AS

### Phase 7 — Advanced Analytics (Planned)
- 214 QuickBooks-equivalent reports
- AR/AP Ageing reports UI
- Budget vs Actual variance
- Profitability by customer/product/machine
- Cash flow forecasting

---

## 15. Known Issues & Limitations

| Issue | Severity | Status |
|-------|----------|--------|
| Auto-JE for Purchase Invoice skips (account name mismatch) | Medium | Needs COA account named "Purchases" |
| Auto-JE for Sales Invoice skips (account name mismatch) | Medium | Needs COA account named "Sales Revenue" |
| All test customers are inter-state (no TN customers in seed) | Low | Test data; real usage will mix |
| e-Invoice IRN is stub only | High | Phase 3 |
| e-Way Bill is stub only | High | Phase 3 |
| TDS Returns filing is manual | High | Phase 3 |
| Bank Reconciliation UI page missing | Medium | Pending build |
| Salary Structures UI page missing | Medium | Pending build |
| Leave Management UI missing | Low | Pending build |
| AR/AP Ageing report UI missing | Medium | Pending build |
| masters_vendor.country/currency columns in DB not in Django model | Low | DB defaults set; model sync needed |
| ESI = 0 when all employees above ₹21,000 gross | Info | Correct behavior; add lower-paid employees to test ESI |

---

## 16. Change Log

### v2.0.0 — India ERP Release (May 2026)

**Backend — New Django Apps**
- `finance` app: Account, JournalEntry, JournalEntryLine, FiscalYear, AccountingPeriod, Payment, Receipt, PaymentAllocation, ContraEntry, CreditNote, DebitNote, Budget, BudgetLine
- `gst` app: GSTRate, HSNCode, SACCode, GSTLedger, GSTR1Summary, GSTR3BSummary, EInvoiceStub, EWayBillStub
- `banking` app: BankAccount, BankTransaction, ChequeBook, FundTransfer, BankReconciliation, PettyCash
- `tds_tcs` app: TDSSection, VendorTDSConfig, TDSDeduction, TDSReturn, TCSSection, TCSCollection

**Backend — Extended Apps**
- `hr_payroll`: Added EmployeeStatutory, ProfessionalTaxSlab, SalaryStructure, SalaryComponent, EmployeeSalaryAssignment, PayrollPeriod, PaySlip, PaySlipLine, LeaveType, LeaveApplication
- `master_data`: Added CompanyGroup, CompanySettings (FY start, TAN, CIN, ESIC, PF, module flags)

**Backend — Finance Signals**
- `finance/signals.py`: Auto-JE creation for Sales Invoice, Purchase Invoice, Payment, Receipt, PaySlip
- `finance/apps.py`: Updated to call `connect_all_signals()` on app ready

**Backend — Views & URLs**
- Finance: 15+ API endpoints (accounts, JE, payment, receipt, fiscal year, P&L, BS, cash flow, company settings)
- GST: 8+ API endpoints (rates, HSN, SAC, GSTR-1, GSTR-3B, ledger, e-Invoice stub, e-Way Bill stub)
- Banking: 6+ API endpoints (accounts, transactions, reconciliation, fund transfer)
- TDS/TCS: 5+ API endpoints (sections, deductions, dashboard, deposit, TCS collections)
- HR/Payroll: 8+ API endpoints (employees, departments, payroll periods, run, payslips, approve)

**Backend — Migrations**
- master_data/0006: CompanyGroup + CompanySettings
- finance/0003: FiscalYear, AccountingPeriod, Payment, Receipt, etc.
- hr_payroll/0003: EmployeeStatutory, ProfessionalTaxSlab, SalaryStructure, PayrollPeriod, PaySlip
- gst/0001: Full GST app
- banking/0001 + 0002: Full Banking app
- tds_tcs/0001: Full TDS/TCS app

**Frontend — New Pages (12)**
- FinanceDashboardPage, ChartOfAccountsPage, JournalEntriesPage
- PaymentsPage, ReceiptsPage, FiscalYearsPage
- GSTCenterPage
- BankAccountsPage
- EmployeeHRPage, PayrollPeriodsPage
- TDSCenterPage
- CompanySettingsPage

**Frontend — Updated Files**
- `App.js`: 12 new routes added
- `Sidebar.js`: Finance, GST, Banking, HR & Payroll, TDS/TCS menu sections added

**Testing**
- `test_e2e.py`: 103-point end-to-end validation covering all India ERP modules
- All 103 checks pass; 1 expected warning (TDS pending deposit)

### v1.x — Technical Textile ERP (Earlier)
- Full textile production ERP (see git log for details)
- Warping, Weaving, Stenter, Embossing, Lamination, Tumbler
- Lot-based inventory and traceability
- Quality control
- Dispatch + Delivery Challan + Sales Invoice
- Maintenance with email escalation
- PDF/Excel reports
- Email/WhatsApp sharing
- Analytics dashboard
- AI chatbot

---

*This document is auto-maintained. Update BUILD.md after every sprint.*
