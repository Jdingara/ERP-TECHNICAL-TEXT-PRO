# Sasi ERP — Standard Operating Procedure (SOP)

> **Product:** India ERP — Complete QuickBooks Replacement for Indian SMBs  
> **Built for:** Sasi Textiles Pvt Ltd (Technical Textile Manufacturer)  
> **Version:** 1.0 | **Date:** May 2026  
> **Stack:** Django 5.2 + DRF | React 19 + MUI 7 | PostgreSQL | Render.com

---

## Table of Contents

1. [System Start-Up](#1-system-start-up)
2. [First-Time Setup](#2-first-time-setup)
3. [Company & Settings](#3-company--settings)
4. [Master Data Setup](#4-master-data-setup)
5. [Purchase Workflow](#5-purchase-workflow)
6. [Sales Workflow](#6-sales-workflow)
7. [Finance & Accounting](#7-finance--accounting)
8. [GST Compliance](#8-gst-compliance)
9. [Banking](#9-banking)
10. [TDS / TCS](#10-tds--tcs)
11. [HR & Payroll](#11-hr--payroll)
12. [Textile Production Modules](#12-textile-production-modules)
13. [Quality Control](#13-quality-control)
14. [Inventory & Lot Management](#14-inventory--lot-management)
15. [Dispatch & Delivery](#15-dispatch--delivery)
16. [Maintenance](#16-maintenance)
17. [Reports](#17-reports)
18. [Admin & Audit](#18-admin--audit)
19. [User Roles & Permissions](#19-user-roles--permissions)
20. [Month-End Closing Checklist](#20-month-end-closing-checklist)
21. [Year-End Closing Checklist](#21-year-end-closing-checklist)
22. [Troubleshooting](#22-troubleshooting)

---

## 1. System Start-Up

### Local Development

```powershell
# Terminal 1 — Django Backend
cd "d:\MY ERP BUILDs\QB_build\backend"
& "venv\Scripts\python.exe" manage.py runserver
# Server starts at http://127.0.0.1:8000

# Terminal 2 — React Frontend
cd "d:\MY ERP BUILDs\QB_build\frontend"
npm start
# App opens at http://localhost:3000
```

### Production (Render.com)
- Backend auto-deploys from GitHub `main` branch → `https://your-app.onrender.com`
- Frontend served via static build or separate Render Static Site
- PostgreSQL managed by Render

### Default Login
| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

> **Change the default password immediately on first login.**

---

## 2. First-Time Setup

Run in order — this seeds all required master data:

```powershell
cd "d:\MY ERP BUILDs\QB_build\backend"
$env:PYTHONIOENCODING='utf-8'

# 1. Apply all migrations
& "venv\Scripts\python.exe" manage.py migrate

# 2. Create superuser (if needed)
& "venv\Scripts\python.exe" manage.py createsuperuser

# 3. Run end-to-end seed + validation
& "venv\Scripts\python.exe" manage.py test_e2e
```

The `test_e2e` command creates:
- Company with GST/TAN/CIN
- 33 Chart of Accounts entries
- 4 GST rates (5%, 12%, 18%, 28%)
- 10 HSN codes (textile)
- TDS Sections 194C, 194J
- Opening Balance Journal Entry
- Fiscal Year 2025-26 + 12 periods

---

## 3. Company & Settings

**URL:** `/settings/company-settings`

### 3.1 Company Profile
1. Go to **Settings → Company Settings**
2. Fill in:
   - Company Name, GSTIN (15-char alphanumeric)
   - TAN (10-char, for TDS deductor certificate)
   - CIN (21-char, for Companies Act compliance)
   - MSME / Udyam Registration Number
   - PF Establishment Code, ESIC Code

### 3.2 Financial Year Configuration
| Setting | Typical India Value |
|---------|-------------------|
| FY Start Month | April (month 4) |
| FY End Month | March |
| Current FY | 2025-26 |

### 3.3 Module Flags
Enable only the modules you use:

| Module Flag | When to Enable |
|-------------|----------------|
| GST | All registered businesses |
| TDS | When making payments to vendors/employees |
| TCS | When collecting tax on goods sale (motor vehicles, scrap, etc.) |
| Payroll | When employees are on payroll |
| Banking | When using bank accounts (recommended always) |
| Budget | For budget vs actual tracking |
| Fixed Assets | When maintaining depreciable assets |
| Multi-currency | Only for export/import businesses |

---

## 4. Master Data Setup

### 4.1 Chart of Accounts
**URL:** `/finance/accounts`

Set up accounts in this order:

| Category | Example Accounts |
|----------|-----------------|
| **Assets** | Cash & Equivalents, Bank Accounts (SBI, HDFC), Accounts Receivable, Inventory / Raw Materials, Fixed Assets |
| **Liabilities** | Accounts Payable, GST Output Payable, TDS Payable, PF Payable, ESI Payable, PT Payable, Loans |
| **Equity** | Share Capital, Retained Earnings |
| **Income** | Sales Revenue, Other Income |
| **Expense** | Purchases, Wages, Salary Expense, PF Employer Contribution, ESI Employer Contribution, Depreciation |

**Important:** Account names must contain these keywords for auto-journal entry signals to work:

| Signal Event | Required Account Name Keywords |
|---|---|
| Sales Invoice | "accounts receivable" or "trade receivable" or "debtors" |
| Sales Revenue | "sales revenue" or "revenue" or "sales" |
| GST Output | "gst output" or "output gst" or "cgst payable" |
| Purchase Invoice | "accounts payable" or "trade payable" or "creditors" |
| Purchases | "purchases" or "cost of goods" |
| GST Input | "gst input" or "input gst" or "cgst receivable" |
| Bank (Payment) | "bank" or "cash" |
| TDS Payable | "tds payable" or "tax deducted" |
| Salary Expense | "salary expense" or "wages" |
| PF Payable | "pf payable" or "provident fund payable" |
| ESI Payable | "esi payable" or "esi payable" |

### 4.2 Vendors
**URL:** `/masters/vendors` (legacy TT ERP) or Admin → Vendor

Required fields:
- Vendor Code (unique, e.g., VND-001)
- Vendor Name
- GSTIN (for GST matching)
- PAN Number (for TDS deduction)
- State (determines IGST vs CGST+SGST)
- Vendor Type: `raw_material` / `job_work` / `both`

### 4.3 Customers
Required fields:
- Customer Code (unique, e.g., CUST-001)
- Customer Name
- GSTIN
- State (determines inter-state IGST vs intra-state CGST+SGST)
- Credit Days, Credit Limit

### 4.4 Items / Materials
- **Yarn Master** — for raw yarn (warp, weft, zari)
- **Item Master** — for chemicals, accessories, packaging
- **Product / Design** — finished goods designs
- **UOM** — units of measure (KG, MTR, NOS, etc.)

### 4.5 HSN / SAC Codes
**URL:** `/gst/center` → HSN/SAC tab

Common textile HSN codes:
| HSN | Description | GST Rate |
|-----|-------------|----------|
| 5407 | Woven fabrics of synthetic filament yarn | 12% |
| 5408 | Woven fabrics of artificial filament yarn | 12% |
| 5501 | Synthetic filament tow | 18% |
| 5601 | Wadding of textile materials | 18% |
| 5603 | Nonwovens (impregnated) | 18% |
| 6305 | Sacks and bags | 18% |
| 8448 | Textile machinery parts | 18% |

---

## 5. Purchase Workflow

```
Indent / Requirement → Purchase Order → GRN (Goods Receipt) → Lot Creation → Purchase Invoice → Payment
```

### 5.1 Purchase Order
**URL:** `/purchase/orders`

1. Click **New Purchase Order**
2. Select Vendor
3. Add line items (Material Type: Yarn / Item, Qty, Unit Price, UOM)
4. Set Expected Date
5. Save as **Draft** → Confirm → Status: `confirmed`

### 5.2 Goods Receipt Note (GRN)
**URL:** `/purchase/grns`

1. Open confirmed PO → Click **Create GRN**
2. Enter Vendor Invoice Number
3. Set Receipt Date
4. Verify received quantities against ordered quantities
5. Confirm GRN → Status: `confirmed`
6. System auto-creates Lot records for each GRN line

### 5.3 Purchase Invoice
**URL:** `/purchase/invoices`

1. Select GRN → Click **Create Invoice**
2. Enter Invoice Number (as on vendor's bill)
3. Verify Invoice Date, Due Date
4. Verify Total Amount and Tax Amount (18% GST on yarn)
5. Save → **Post** → Status: `posted`
6. **Auto-Journal Entry triggered:**
   - DR Purchases (taxable amount)
   - DR GST Input Tax (tax amount)
   - CR Accounts Payable (total)

### 5.4 Vendor Payment
**URL:** `/finance/payments`

1. Click **New Payment**
2. Select Party Type: `Vendor`
3. Select Vendor
4. Enter Amount (gross amount before TDS)
5. TDS Section auto-populates from Vendor TDS Config
6. TDS Amount auto-calculated (e.g., 194C @2% for company)
7. Net Amount = Gross − TDS
8. Select Payment Mode: NEFT / RTGS / Cheque
9. Select Bank Account
10. Save → **Post**
11. **Auto-Journal Entry triggered:**
    - DR Accounts Payable (full invoice amount)
    - CR Bank Account (net amount paid)
    - CR TDS Payable (TDS deducted)

---

## 6. Sales Workflow

```
Sales Order → Production Order → Dispatch → Delivery Challan → Sales Invoice → Receipt
```

### 6.1 Sales Order
**URL:** `/planning/sales-orders`

1. Click **New Sales Order**
2. Select Customer
3. Add line items (Product, Qty, Rate)
4. Set Delivery Date
5. Confirm → Status: `confirmed`

### 6.2 Production Order
**URL:** `/planning/production-orders`

1. Created from Sales Order or manually
2. Assign Machine, Process Route
3. Set Target Quantity, Start Date
4. Release to production floor

### 6.3 Dispatch Entry
**URL:** `/dispatch/entries`

1. Select Sales Order / finished batch
2. Enter Vehicle Number, LR Number, Transporter
3. Add dispatch lines (Batch → Quantity)
4. Confirm → Status: `dispatched`

### 6.4 Delivery Challan
**URL:** `/dispatch/challans`

- Auto-generated from Dispatch Entry
- Print PDF for driver / transporter
- Share via Email or WhatsApp

### 6.5 Sales Invoice
**URL:** `/dispatch/invoices`

1. Open Dispatch Entry → Create Invoice
2. Verify Customer, Invoice Date
3. GST auto-applied based on customer state:
   - **Same state (Tamil Nadu → Tamil Nadu):** CGST 9% + SGST 9%
   - **Different state (Tamil Nadu → Maharashtra):** IGST 18%
4. Save → **Send** (status: `sent`)
5. **Auto-Journal Entry triggered:**
   - DR Accounts Receivable (total with GST)
   - CR Sales Revenue (taxable value)
   - CR GST Output (CGST + SGST or IGST)

### 6.6 Customer Receipt
**URL:** `/finance/receipts`

1. Click **New Receipt**
2. Select Customer
3. Enter Amount Received
4. Select Receipt Mode: NEFT / Cheque / UPI
5. Select Bank Account
6. Save → **Post**
7. **Auto-Journal Entry triggered:**
   - DR Bank Account (amount received)
   - CR Accounts Receivable

---

## 7. Finance & Accounting

### 7.1 Chart of Accounts
**URL:** `/finance/accounts`

- Categories: Asset, Liability, Equity, Income, Expense
- Each account has a unique code (e.g., 1100, 2100, 3000, 4000, 5000)
- Filter by category using pills at top

### 7.2 Journal Entries
**URL:** `/finance/journal-entries`

**Auto-generated entries** (AJE prefix) are created by signals when:
- Sales Invoice posted → SINV-XXXX
- Purchase Invoice posted → PINV-XXXX
- Payment posted → PAY-XXXX
- Receipt posted → REC-XXXX
- Payslip approved → PAY-SLIP-XXXX

**Manual Journal Entries** for:
- Opening balances
- Depreciation entries
- Provisions and accruals
- Corrections

Creating a manual JE:
1. Click **New Journal Entry**
2. Enter Date, Description, Reference
3. Add lines: Account, Debit or Credit amount
4. DR total must equal CR total (balance shown in real time)
5. Save → **Post**

### 7.3 Finance Dashboard
**URL:** `/finance/dashboard`

- **P&L Statement** — Revenue vs Expenses for selected period
- **Balance Sheet** — Assets = Liabilities + Equity snapshot
- **Cash Flow** — Operating, Investing, Financing activities
- Select date range using the date pickers

### 7.4 Fiscal Years
**URL:** `/finance/fiscal-years`

- India standard: April 1 → March 31
- Each FY auto-creates 12 accounting periods
- Close periods after month-end reconciliation
- Only one FY can be active at a time

### 7.5 Payments & Receipts
- **Payments** (`/finance/payments`) — AP: vendor and employee payments
- **Receipts** (`/finance/receipts`) — AR: customer receipts

---

## 8. GST Compliance

**URL:** `/gst/center`

### 8.1 GST Rates Setup
| Rate Name | Total | CGST | SGST | IGST |
|-----------|-------|------|------|------|
| GST 5%    | 5%    | 2.5% | 2.5% | 5%  |
| GST 12%   | 12%   | 6%   | 6%   | 12% |
| GST 18%   | 18%   | 9%   | 9%   | 18% |
| GST 28%   | 28%   | 14%  | 14%  | 28% |

When you enter a Total Rate, CGST and SGST auto-split to half each, and IGST = Total.

### 8.2 GST Logic
| Transaction Type | Rule |
|-----------------|------|
| Supplier in same state as company | CGST + SGST (intra-state) |
| Supplier in different state | IGST (inter-state) |
| Customer in same state as company | CGST + SGST (intra-state) |
| Customer in different state | IGST (inter-state) |

### 8.3 GSTR-1 (Outward Supplies)
**URL:** `/gst/center` → GSTR-1 tab

1. Select Period (Month + Year)
2. System aggregates all sales invoices for that period
3. Shows: Taxable Value, CGST, SGST, IGST per GSTIN
4. Status: `draft` → `filed`
5. Export data for upload to GST Portal

> **GSP Integration (Stub):** Configure GSP API credentials in Settings to enable direct filing via API. Currently requires manual upload to gstn.gov.in.

### 8.4 GSTR-3B (Summary Return)
**URL:** `/gst/center` → GSTR-3B tab

Monthly filing due by 20th of next month:
- Section 3.1: Outward taxable supplies
- Section 4: ITC available (Input Tax Credit from purchases)
- Net GST payable = Output GST − Input ITC

### 8.5 e-Invoice (IRN)
- Mandatory for businesses with turnover > ₹5 crore
- Stub implementation — connect GSP API credentials to enable
- IRN (Invoice Reference Number) generated from GST portal/GSP

### 8.6 e-Way Bill
- Required for goods movement > ₹50,000 value
- Stub implementation — NIC portal integration pending
- Generate e-Way Bill number before dispatch

---

## 9. Banking

**URL:** `/banking/accounts`

### 9.1 Bank Account Setup
1. Click **New Bank Account**
2. Fill: Account Label, Bank Name, Account Type (Current/Savings/CC/OD)
3. Enter Account Number, IFSC Code
4. Set Opening Balance
5. Link to GL Account (from Chart of Accounts)

### 9.2 Bank Transactions
1. Go to **Transactions** tab
2. Filter by Bank Account
3. Manual entry or future bank feed import
4. Transaction Types: Credit (money in) / Debit (money out)
5. Mark as Reconciled after bank statement matching

### 9.3 Bank Reconciliation
Steps:
1. Download bank statement (PDF/CSV) from your bank
2. Go to Banking → Transactions
3. Mark transactions as `Reconciled` when matched with statement
4. Any unmatched items need investigation (timing differences, errors)

### 9.4 Fund Transfer
- Banking → Fund Transfer (between two company accounts)
- Creates Contra Entry: DR Destination Account / CR Source Account

---

## 10. TDS / TCS

**URL:** `/tds/center`

### 10.1 TDS Sections Reference
| Section | Nature | Rate (Company) | Rate (Individual) | Threshold |
|---------|--------|----------------|-------------------|-----------|
| 192 | Salary | Slab rate | Slab rate | — |
| 194A | Interest (non-bank) | 10% | 10% | ₹5,000 |
| 194C | Contractor | 2% | 1% | ₹30,000 single / ₹1L annual |
| 194I | Rent | 10% | 10% | ₹2.4L annual |
| 194J | Professional/Technical | 10% | 10% | ₹30,000 |
| No PAN | Any section | 20% | 20% | — |

### 10.2 Vendor TDS Configuration
1. Go to Admin → Vendor TDS Config (or configure during Vendor setup)
2. Select Vendor → assign TDS Section (194C, 194J, etc.)
3. Set Deductee Type: Company / Individual
4. If vendor has lower deduction certificate, enter certificate number and validity

### 10.3 TDS Deduction Process
When posting a vendor payment:
1. System checks `VendorTDSConfig` for TDS section and rate
2. TDS deducted = Gross Amount × Rate %
3. Net paid = Gross − TDS
4. `TDSDeduction` record auto-created
5. Journal Entry: DR AP / CR Bank / CR TDS Payable

### 10.4 TDS Deposit (Monthly)
**Deadline:** 7th of the following month (30th April for March)

1. `/tds/center` → Deductions tab
2. Select pending deductions for the month
3. Click **Mark Deposited**
4. Enter Challan Number (BSR Code + Challan Serial)
5. Status changes to `deposited`

### 10.5 TDS Returns
| Form | Frequency | Deadline |
|------|-----------|----------|
| 24Q | Quarterly (salary) | 31st of month after quarter end |
| 26Q | Quarterly (non-salary) | 31st of month after quarter end |
| 27Q | Quarterly (foreign payments) | 31st of month after quarter end |
| 27EQ | Quarterly (TCS) | 15th of month after quarter end |

> **TRACES Integration (Stub):** TDS return filing via TRACES API is planned for Phase 3.

### 10.6 TCS (Tax Collected at Source)
- Applicable on sale of certain goods (scrap, coal, minerals, motor vehicles, etc.)
- Rate varies by goods category
- Collected from buyer at time of receipt
- Deposit by 7th of following month

---

## 11. HR & Payroll

**URL:** `/payroll/employees` and `/payroll/periods`

### 11.1 Employee Setup
**URL:** `/payroll/employees`

1. Click **New Employee**
2. Fill: Employee Code, First/Last Name, Gender
3. Department, Designation, Employment Type (Permanent/Contract/Probation)
4. Date of Joining
5. Basic Salary (all other components calculated from this)
6. Assign Salary Structure

### 11.2 Statutory Configuration (per Employee)
Set via Admin → Employee Statutory:

| Statutory | Rate | Ceiling |
|-----------|------|---------|
| PF (Employee) | 12% of Basic | ₹15,000 max basic |
| PF (Employer) | 12% of Basic | ₹15,000 max basic |
| ESI (Employee) | 0.75% of Gross | Applies if Gross ≤ ₹21,000 |
| ESI (Employer) | 3.25% of Gross | Applies if Gross ≤ ₹21,000 |
| Professional Tax | As per state slab | Tamil Nadu: ₹200/month if Gross > ₹15,000 |

**PF Calculation Example:**
- Basic: ₹25,000 → Capped at ₹15,000 → PF = 12% × ₹15,000 = ₹1,800/month
- Basic: ₹10,000 → PF = 12% × ₹10,000 = ₹1,200/month (no cap)

**ESI Calculation Example:**
- Gross: ₹18,000 → ESI Employee = 0.75% × ₹18,000 = ₹135/month ✓
- Gross: ₹25,000 → ESI NOT applicable (above ₹21,000 ceiling)

### 11.3 Salary Structure
Components in "Standard Monthly" structure:
| Component | Type | Calculation |
|-----------|------|-------------|
| Basic Salary | Earning | Fixed (per employment contract) |
| HRA | Earning | 40% of Basic |
| DA | Earning | 10% of Basic |
| PF Employee | Deduction | 12% of Basic (max ₹15,000 basic) |
| ESI Employee | Deduction | 0.75% of Gross (if applicable) |

### 11.4 Payroll Period Run
**URL:** `/payroll/periods`

1. Click **New Payroll Period**
2. Select Month, Year, Working Days
3. Click **Run Payroll** → system generates payslip for each active employee
4. Review each payslip in the detail view
5. Click **Approve** on each payslip (or bulk approve)
6. **Post Period** → generates Journal Entry:
   - DR Salary Expense (gross earnings)
   - DR PF Employer Contribution
   - DR ESI Employer Contribution
   - CR PF Payable (employee + employer share)
   - CR ESI Payable (employee + employer share)
   - CR Professional Tax Payable
   - CR TDS Payable (on salary)
   - CR Net Salary Payable (employee take-home)

### 11.5 Payslip Details
Each payslip shows:
- Earnings: Basic, HRA, DA
- Deductions: PF, ESI, PT, TDS on Salary, Other
- Net Pay (take-home)
- CTC Monthly (Gross + Employer PF + Employer ESI)

### 11.6 Statutory Payment Deadlines
| Statutory | Deadline |
|-----------|----------|
| PF (Employee + Employer) | 15th of following month |
| ESI (Employee + Employer) | 15th of following month |
| Professional Tax | As per state (Tamil Nadu: quarterly) |
| TDS on Salary (24Q) | 7th of following month |

### 11.7 Leave Management
- Leave Types: Casual Leave, Sick Leave, Earned Leave, Maternity Leave
- Apply leave via Leave Application module
- Approved leaves deduct from available balance
- Unpaid leaves reduce paid_days on payslip

---

## 12. Textile Production Modules

### 12.1 Production Flow
```
Yarn Procurement → Warping → Weaving → Stenter/Finishing → Inspection → Dispatch
```

### 12.2 Warping
**URL:** `/production/warping`

1. Select Yarn Lots from inventory
2. Create Beam with target length, yarn count, design
3. Record actual warped length, wastage
4. Beam status: `warping` → `completed`

### 12.3 Weaving
**URL:** `/production/weaving`

1. Select Beam → assign to Loom
2. Record production: Meter/Day per loom
3. Track grey fabric output
4. Weaving completion → grey batch created

### 12.4 Finishing (Stenter / Embossing / Lamination / Tumbler)
Each machine has its own screen:
- **Stenter** (`/production/stenter`) — heat setting, width control
- **Embossing** (`/production/embossing`) — pattern embossing
- **Lamination** (`/production/lamination`) — coating/lamination
- **Tumbler** (`/production/tumbler`) — softening, tumbling

Process:
1. Input: Grey Batch from previous stage
2. Set Machine Parameters (temperature, speed, pressure)
3. Record Output Quantity, wastage
4. Create next-stage batch

### 12.5 Batch Tracking
**URL:** `/production/batches`

Every batch has:
- Unique Batch Number
- Material: Yarn Lot → Grey Batch → Finished Batch
- Stage: `warping`, `weaving`, `stenter`, `finished`
- Quantity (meters), weight
- Full traceability from yarn lot to final dispatch

---

## 13. Quality Control

**URL:** `/quality/inspections`

### 13.1 Inspection Types
- **Incoming (GRN)** — inspect yarn/material on receipt
- **In-process** — inspect during production
- **Final** — inspect finished goods before dispatch

### 13.2 QC Process
1. Create Inspection record
2. Select Batch / Lot to inspect
3. Record test parameters (GSM, width, tensile strength, color fastness, etc.)
4. Record Defect Types and quantities
5. Decision: `pass`, `fail`, `conditional pass`

### 13.3 Defect Types
**URL:** `/quality/defect-types`

Configure defect codes (e.g., HOLE, STAIN, WIDTH-VAR, GSM-LOW, COLOR-FADE)

### 13.4 Sample Testing
**URL:** `/quality/sample-testing`

- Lab tests for new designs/materials
- Record test parameters, results
- Approve or reject sample

---

## 14. Inventory & Lot Management

### 14.1 Lot-Based Inventory
Every material receipt creates a Lot with:
- Unique Lot Number (auto: LOT-YYYYMMDD-NNN)
- Material (Yarn type, color, denier)
- Quantity (original and remaining)
- Location (store/floor)
- Status: `available`, `in_use`, `consumed`, `rejected`

### 14.2 Lot Dashboard
**URL:** `/lot-inventory/dashboard`

- Current stock by material type
- Low stock alerts
- Lot-wise ageing

### 14.3 Lot Movements
**URL:** `/lot-inventory/movements`

- Issue to Production
- Transfer between locations
- Return to store
- Each movement is traceable

### 14.4 Stock Adjustments
**URL:** `/lot-inventory/adjustments`

For:
- Physical count differences
- Damage / write-off
- Sample consumption

Requires reason code and authorization.

### 14.5 Inventory Reports
- Stock Summary by material
- Stock Ageing (FIFO)
- Lot-wise movement history
- Reorder Level alerts

---

## 15. Dispatch & Delivery

### 15.1 Dispatch Entry
**URL:** `/dispatch/entries`

1. Select Customer from confirmed Sales Order
2. Add dispatch lines (Batch → Quantity)
3. Enter logistics: Vehicle Number, LR Number, Transporter Name
4. **Confirm** dispatch → status: `dispatched`

### 15.2 Delivery Challan
**URL:** `/dispatch/challans`

- Auto-created when Dispatch is confirmed
- Print for driver (PDF)
- Share via Email / WhatsApp
- Required legally for goods movement

### 15.3 Sales Invoice from Dispatch
1. Open Dispatch Entry → **Create Invoice**
2. GST auto-calculated by state (IGST or CGST+SGST)
3. e-Invoice IRN generated (when GSP connected)
4. e-Way Bill generated (when NIC connected)

### 15.4 Packing Labels
**URL:** `/dispatch/labels`

- Auto-generated per roll/piece in dispatch
- Contains: Batch No, Product Code, Weight, Length, Customer
- Print as barcode labels

---

## 16. Maintenance

### 16.1 Maintenance Schedule
**URL:** `/maintenance/schedule`

1. Add machines to maintenance calendar
2. Set frequency: Daily / Weekly / Monthly / Annual
3. Assign responsible person
4. Set next due date

### 16.2 Maintenance Log
**URL:** `/maintenance/log`

1. Record completed maintenance activity
2. Parts replaced, technician name, downtime hours
3. Next scheduled date auto-updated
4. Cost tracking (parts + labour)

### 16.3 Escalation Alerts
**URL:** `/maintenance/escalation`

- Auto-email alerts when maintenance is overdue
- Escalation levels: 1st reminder (due date) → 2nd reminder (+3 days) → Escalation (+7 days)
- Email sent to: Maintenance Manager → Plant Head → GM
- One-click confirm button in email

---

## 17. Reports

### 17.1 Production Reports
**URL:** `/reports/production`

- Machine-wise output (meters/day)
- Process-wise efficiency
- Batch status summary
- Wastage analysis

### 17.2 Inventory Reports
**URL:** `/reports/inventory`

- Current stock (lot-wise)
- Stock in/out movement
- GRN vs Invoice reconciliation

### 17.3 Sales Reports
**URL:** `/reports/sales`

- Sales by customer
- Sales by product
- Invoice ageing (AR ageing)
- Payment collection status

### 17.4 Finance Reports (Dashboard)
**URL:** `/finance/dashboard`

- Profit & Loss Statement
- Balance Sheet
- Cash Flow Statement

### 17.5 GST Reports
**URL:** `/gst/center`

- GSTR-1 (outward supplies)
- GSTR-3B (summary return)
- GST Input vs Output

### 17.6 TDS Reports
**URL:** `/tds/center`

- TDS Deducted vs Deposited
- Section-wise summary
- Pending deposits

### 17.7 Payroll Reports
**URL:** `/payroll/periods`

- Monthly payroll summary
- Employee-wise payslips
- PF/ESI/PT contribution report

### 17.8 Export Options
All reports support:
- **Print/PDF** — print-ready format
- **Excel** — `.xlsx` download
- **Email** — send to email address
- **WhatsApp** — share via WhatsApp Business

---

## 18. Admin & Audit

### 18.1 Django Admin
**URL:** `http://localhost:8000/admin/`

Access all models directly. Useful for:
- Bulk data fixes
- Permission management
- Viewing signal-generated Journal Entries

### 18.2 Activity Log
**URL:** `/audit/activity-log`

Records every create, update, delete action with:
- User who made the change
- Timestamp
- Old value → New value

### 18.3 Smart Feed
**URL:** `/feed/smart`

Real-time activity feed showing recent transactions, approvals, alerts.

---

## 19. User Roles & Permissions

| Role | Access |
|------|--------|
| Superadmin | Full access to everything |
| Accounts Manager | Finance, GST, TDS, Banking, Payroll |
| Purchase Manager | Purchase Orders, GRNs, Vendor Payments |
| Sales Manager | Sales Orders, Dispatch, Invoices, Receipts |
| Production Manager | Production Orders, Batches, Process Entries |
| Quality Inspector | QC Inspections, Defect recording |
| Store Keeper | Lot Inventory, Stock Adjustments, GRN |
| HR Manager | Employees, Payroll, Leave |
| Viewer | Read-only access to reports |

Configure via Admin → Authentication → Users & Groups.

---

## 20. Month-End Closing Checklist

Run at the end of each month:

### Week 4 of Month
- [ ] All purchase invoices for the month posted
- [ ] All sales invoices for the month sent/posted
- [ ] All vendor payments posted
- [ ] All customer receipts posted
- [ ] Bank reconciliation completed for all accounts
- [ ] Payroll period run and approved

### By 7th of Next Month
- [ ] TDS deposited (with challan) for all deductions
- [ ] PF deposited (with challan)
- [ ] ESI deposited (with challan)

### By 20th of Next Month
- [ ] GSTR-3B filed on GST portal
- [ ] TDS Return (26Q) filed on TRACES

### Accounting Closure
- [ ] Review Finance Dashboard P&L
- [ ] Verify AR Ageing — follow up on overdue customers
- [ ] Verify AP Ageing — plan vendor payments
- [ ] Close accounting period in Fiscal Years → Periods

---

## 21. Year-End Closing Checklist

At March 31st (India FY end):

### During March
- [ ] Complete all pending transactions for the year
- [ ] Post depreciation entries for all fixed assets
- [ ] Provision for bad debts if any
- [ ] Advance Tax payment if due (March 15)

### April 1st
- [ ] Create new Fiscal Year (2026-27)
- [ ] New FY auto-creates 12 accounting periods
- [ ] Set Opening Balances from closing balances of previous year
- [ ] Activate new fiscal year

### Statutory Filings
- [ ] GSTR-9 (Annual GST Return) — by December 31
- [ ] GSTR-9C (Reconciliation) — if turnover > ₹5 crore
- [ ] TDS Returns Q4 (24Q / 26Q) — by May 31
- [ ] Form 16 issued to employees — by June 15
- [ ] Income Tax Return (ITR) — by October 31 (audit cases) or July 31

---

## 22. Troubleshooting

### Backend won't start
```powershell
# Wrong: python manage.py runserver (uses Windows Store stub)
# Correct:
cd "d:\MY ERP BUILDs\QB_build\backend"
& "venv\Scripts\python.exe" manage.py runserver
```

### Frontend shows blank page / API errors
- Ensure backend is running on port 8000
- Check `frontend/package.json` has `"proxy": "http://127.0.0.1:8000"`
- Open browser dev tools → Network tab for specific API errors

### Auto-Journal Entries not creating
- Check account names contain the right keywords (see Section 4.1)
- Check `signals.py` is loaded (verify `apps.py` calls `connect_all_signals()`)
- Check Django logs for "Auto-JE skipped" messages

### GST calculation shows wrong split
- Verify GST Rate is set up with correct CGST/SGST (half of total each)
- Verify customer/vendor state is set correctly
- Tamil Nadu → Tamil Nadu = CGST + SGST; Any other state = IGST

### PF not deducting correctly
- PF is capped at ₹15,000 basic — if employee basic > ₹15,000, PF = 12% × 15,000 = ₹1,800
- Check `EmployeeStatutory.pf_ceiling` = 15000

### ESI shows 0 for all employees
- ESI only applies if Gross Salary ≤ ₹21,000/month
- Employees with gross > ₹21,000 are not covered under ESI

### Migrations error
```powershell
cd "d:\MY ERP BUILDs\QB_build\backend"
& "venv\Scripts\python.exe" manage.py showmigrations  # see status
& "venv\Scripts\python.exe" manage.py migrate --run-syncdb  # sync without migrations
```

### Unicode error in PowerShell
```powershell
$env:PYTHONIOENCODING='utf-8'
& "venv\Scripts\python.exe" manage.py test_e2e
```

---

*Document maintained in the GitHub repository. Update after each sprint.*
