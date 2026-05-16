# BHF India — Buying House ERP

> A complete, production-ready ERP system built specifically for **Garment Buying Houses**.
> Built with React.js · Django · PostgreSQL · Material UI

---

## Overview

Purpose-built for buying houses that source garments from Indian factories and supply global brands. Covers the **entire buying house workflow** — from the first buyer inquiry through costing, vendor sourcing, sampling, order management, shipment, and finance.

**End-to-end workflow:**
```
Buyer Inquiry → Cost Sheet → Vendor RFQ → PD / Sampling → Customer Order → Factory Order → T&A → PSI → Shipment → Invoice → Payment
```

---

## Modules

### Core Workflow

| Module | What it covers |
|---|---|
| **Dashboard** | Live KPIs: active inquiries, orders in production, shipments in transit, receivables, T&A overdue |
| **Buyer Inquiries** | Capture buyer requirements → build cost sheet (FOB price build-up) → send RFQ to multiple vendors → compare quotes → convert to Customer Order |
| **Product Development** | PD requests, tech specs, vendor assignment, sample shipment tracking, testing, approval |
| **Customer Orders** | Confirmed POs from brands/retailers — items, delivery dates, status tracking |
| **Factory Orders** | Production orders placed to factories — items, unit cost, ex-factory date |
| **T&A Milestones** | Time & Action calendar: fabric booking, bulk cutting, sewing, finishing, shipment milestones |
| **Pre-Shipment Inspection** | PSI checklists with pass/fail/NA items, AQL levels, inspector, result |
| **Shipments** | Booking number, vessel, ETD/ETA, BL number, port-to-port tracking |

### Finance

| Module | What it covers |
|---|---|
| **Sales Invoices** | Invoice to buyer — linked to shipment, items, tax, payment tracking |
| **Purchase Invoices** | Vendor bill — linked to factory order, items, approval workflow |
| **Payments** | Received from buyers (LC, TT, cheque) and made to vendors — auto-updates invoice balance |

### Reports

| Report | What it shows |
|---|---|
| **Order Summary** | All COs with qty, value, FO count, status — filterable, printable |
| **PD Pipeline** | Product development funnel by status and customer |
| **Vendor Performance** | On-time delivery rate, PSI pass rate per factory |
| **Shipment Tracker** | All active shipments with ETD, ETA, days to arrival |

### Masters & Settings

| Module | What it covers |
|---|---|
| **Customers** | Brands/retailers — country, currency, payment terms |
| **Vendors** | Factories — location, type, capacity |
| **Brands** | Brand master linked to orders and PDs |
| **Categories** | Product category master |
| **Fabric Types** | Fabric construction reference |
| **Testing Params** | Lab test standards and limits |
| **Settings** | Company master, format panel (doc numbering), email templates |

### Platform Features

| Feature | Description |
|---|---|
| **ERP Chatbot** | Floating AI assistant — natural language queries about sales, stock, machines, revenue |
| **Voice Input** | Mic button on chatbot — speak your question in English (en-IN) |
| **Navigation Commands** | "open sales orders", "open dashboard" — instant page navigation by voice or text |
| **Date Range Queries** | "last 10 days", "this financial year", "last 2 weeks" — flexible date understanding |
| **UI Theme Presets** | 10 complete UI themes (SAP Classic, Modern Pro, Dark Executive, Zinzi Trendy, Neon Gaming, Retro 90s, and more) |
| **Resizable Layouts** | Drag to resize chart heights, panel widths, and table column widths across all pages |
| **Role-Based Access** | Admin / Standard User with module-level permission control |
| **Activity Log** | Full audit trail — every action logged with user, module, timestamp |
| **Format Panel** | Configurable document prefixes, numbering, financial year settings |
| **Message Templates** | WhatsApp & Email templates for quotations and orders |

---

## Tech Stack

### Frontend
- **React.js 18** — UI framework
- **Material UI (MUI) v5** — Component library with full dark/light theming
- **Recharts** — Charts and data visualizations
- **React Router v6** — Client-side routing
- **Google Fonts** — Inter, Roboto, Poppins, DM Sans

### Backend
- **Python 3.x** + **Django 4.x** — Web framework
- **Django REST Framework** — REST API layer
- **PostgreSQL** — Relational database
- **WhiteNoise** — Serves React build in production
- **python-dotenv** — Environment variable management

### AI & Intelligence
- **Claude API (Anthropic)** — Powers the ERP chatbot AI fallback and Smart Feed AI card
- **Pure Python ML** — RFM scoring, churn prediction, linear regression forecasting (no pandas/scikit-learn required)
- **Web Speech API** — Browser-native voice recognition

### Infrastructure
- **Docker + Docker Compose** — Runs PostgreSQL locally
- **Render** — Cloud hosting (web service + PostgreSQL)
- **GitHub** — Version control

---

## Project Structure

```
Buying House/
│
├── backend/                          # Django backend
│   ├── core/                         # Settings, main URL router, WSGI
│   ├── authentication/               # Login, logout, session, roles, permissions
│   ├── master_data/                  # Company master
│   ├── masters/                      # Customers, Vendors, Brands, Categories, Fabric, Testing Params
│   ├── order_management/             # BuyerInquiry, InquiryCostSheet, VendorQuotation
│   │                                 # CustomerOrder, FactoryOrder, TAMilestone
│   ├── product_development/          # PDRequest, TechSpec, VendorAssignment, SampleShipment
│   ├── shipment/                     # PSI, PSIChecklistItem, Shipment
│   ├── bh_finance/                   # SalesInvoice, PurchaseInvoice, Payment
│   ├── reports/                      # All report + dashboard APIs
│   ├── dashboard/                    # BI Dashboard KPIs
│   ├── maintenance/                  # Machine maintenance schedules
│   ├── chatbot/                      # ERP chatbot
│   ├── seed_test_data.py             # Creates 10 complete test entries
│   ├── test_apis.py                  # Automated API smoke tests
│   ├── requirements.txt
│   └── manage.py
│
├── frontend/                         # React frontend
│   └── src/
│       ├── App.js                    # All routes
│       ├── components/layout/
│       │   ├── MainLayout.js
│       │   └── Sidebar.js
│       └── pages/
│           ├── order_management/     # InquiryListPage, InquiryDetailPage
│           │                         # CustomerOrdersPage, CustomerOrderDetailPage
│           ├── product_development/  # ProductDevelopmentPage, PDRequestDetailPage
│           ├── shipment/             # PSIPage, ShipmentsPage
│           ├── finance/              # SalesInvoicesPage, PurchaseInvoicesPage, PaymentsPage
│           ├── reports/              # OrderSummaryReport, PDPipelineReport, etc.
│           ├── masters/              # CustomerPage, VendorPage, BrandPage, etc.
│           └── settings/             # SettingsPage, CompanyMasterPage, EmailTemplatesPage
│
├── sop_screenshots/                  # 32 screenshots for SOP document
├── BHF_India_ERP_SOP.html            # Full SOP document (self-contained, 3.5 MB)
├── take_screenshots.js               # Playwright script — retake all screenshots
├── generate_sop.js                   # SOP HTML generator
└── README.md
```

---

## How to Run Locally

### Prerequisites
- Docker Desktop (for PostgreSQL)
- Python 3.10+
- Node.js 18+ and npm

### 1. Clone the repository
```bash
git clone https://github.com/Jdingara/ERP-TECHNICAL-TEXT-PRO.git
cd ERP-TECHNICAL-TEXT-PRO
```

### 2. Create environment file
Create `backend/.env`:
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
DB_NAME=sasi_erp
DB_USER=sasi_erp_user
DB_PASSWORD=sasi_erp_password
DB_HOST=localhost
DB_PORT=5432
ANTHROPIC_API_KEY=your-claude-api-key-here   # optional — for AI chatbot
```

### 3. Start PostgreSQL (Docker)
```bash
docker-compose up -d
```

### 4. Start the backend
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac / Linux
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
Backend runs at: `http://127.0.0.1:8000`

### 5. Start the frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs at: `http://localhost:3000`

### 6. Create admin user (first time only)
```bash
cd backend
python manage.py createsuperuser
```

---

## Key Features in Detail

### Customer Intelligence (6-tab Analytics)
- **RFM Segmentation** — Scores every customer on Recency, Frequency, Monetary (1–5). Auto-classifies into Champion, Loyal, Promising, At Risk, Lost, etc.
- **Churn Prediction** — Compares each customer's last purchase against their average cycle. Flags Critical / High / Medium / Low churn risk with revenue at stake.
- **Sales Forecasting** — 3-month forward projection using pure Python linear regression. Per-customer or overall.
- **Product Intelligence** — Revenue, repeat rate, trend (growing/stable/declining) per product.
- **What-If Simulator** — Price change impact, losing customers, upsell targeting — instant revenue projection.

### ERP Chatbot
- Understands natural language: *"how many sales orders this week"*, *"which machines are broken down"*, *"top 5 customers this month"*
- 12+ query types: sales, invoices, stock, customers, machines, revenue, overdue, employees, production
- Flexible date ranges: *"last 10 days"*, *"this financial year"*, *"yesterday"*, *"last 2 weeks"*
- Voice input via Web Speech API (en-IN locale)
- Navigation commands: *"open purchase orders"*, *"go to dashboard"* — routes instantly
- Claude AI fallback for open-ended questions

### Smart Business Feed
- Daily personalised feed combining live ERP data alerts + curated content
- Data cards: revenue trend, churn alerts, overdue invoices, top product, repeat rate
- Curated cards: 18 books, 10 courses, 18 tips, 10 market insights — all textile/manufacturing relevant
- Optional Claude AI insight card

### UI Theme Presets
10 one-click complete UI transformations:

| Preset | Vibe |
|---|---|
| 🏢 SAP Classic | Dense, sharp, enterprise blue |
| ✨ Modern Pro | Clean contemporary (default) |
| 💼 Dark Executive | Dark + gold, boardroom |
| 🌙 Midnight | Dark navy + electric blue |
| 🌊 Casual Breeze | Light, teal, spacious |
| 🔥 Zinzi Trendy | Dark pink, Gen-Z |
| 🎮 Neon Gaming | Cyberpunk dark green |
| 💾 Retro 90s | Windows 95, purple |
| 🌿 Nature Forest | Earthy green, calm |
| 🌸 Rose Gold | Light rose, elegant |

Each preset changes: theme mode, accent color, font family, font size, corner radius, and layout density — all at once.

### Resizable Everything
- **Chart height** — drag bottom handle of any chart up/down
- **Side-by-side panels** — drag divider between panels left/right
- **Table columns** — drag column header edge to resize width
- All sizes saved to localStorage per user, per page

---

## API Reference

All APIs are under `http://127.0.0.1:8000/api/`

| Endpoint | Method | Description |
|---|---|---|
| `/api/authentication/login/` | POST | Login |
| `/api/authentication/logout/` | POST | Logout |
| `/api/orders/inquiries/` | GET, POST | Buyer inquiries list & create |
| `/api/orders/inquiries/<id>/` | GET, PUT | Inquiry detail & update |
| `/api/orders/inquiries/<id>/cost-sheet/` | GET, PUT | Inquiry cost sheet (FOB build-up) |
| `/api/orders/inquiries/<id>/quotations/` | GET, POST | Vendor quotations for an inquiry |
| `/api/orders/inquiries/<id>/convert-to-co/` | POST | Convert inquiry to Customer Order |
| `/api/pd/requests/` | GET, POST | PD requests |
| `/api/pd/requests/<id>/vendors/` | GET, POST | Vendor assignments |
| `/api/pd/requests/<id>/shipments/` | GET, POST | Sample shipments |
| `/api/orders/co/` | GET, POST | Customer orders |
| `/api/orders/co/<id>/` | GET, PUT | CO detail & update |
| `/api/orders/fo/` | GET, POST | Factory orders |
| `/api/orders/ta-milestones/` | GET, POST | T&A milestones |
| `/api/shipment/psi/` | GET, POST | Pre-shipment inspections |
| `/api/shipment/shipments/` | GET, POST | Shipments |
| `/api/finance/sales-invoices/` | GET, POST | Sales invoices |
| `/api/finance/purchase-invoices/` | GET, POST | Purchase invoices |
| `/api/finance/payments/` | GET, POST | Payments |
| `/api/reports/bh-dashboard/` | GET | Dashboard KPIs |
| `/api/reports/order-summary/` | GET | Order summary report |
| `/api/reports/pd-pipeline/` | GET | PD pipeline report |
| `/api/reports/vendor-performance/` | GET | Vendor performance report |
| `/api/reports/shipment-tracker/` | GET | Shipment tracker |
| `/api/masters/customers/` | GET, POST | Customers |
| `/api/masters/vendors/` | GET, POST | Vendors |

---

## Deployment (Render)

This app is configured for one-click deployment on Render.

### Services needed on Render:
1. **Web Service** — runs Django (serves both API and React build)
2. **PostgreSQL** — managed database

### Environment variables to set on Render:
```
SECRET_KEY          = <generate a secure random key>
DEBUG               = False
ALLOWED_HOSTS       = your-app.onrender.com
DB_NAME             = <from Render PostgreSQL>
DB_USER             = <from Render PostgreSQL>
DB_PASSWORD         = <from Render PostgreSQL>
DB_HOST             = <from Render PostgreSQL>
DB_PORT             = 5432
ANTHROPIC_API_KEY   = <optional — for AI features>
```

Build command:
```bash
./build.sh
```

Start command:
```bash
cd backend && gunicorn core.wsgi:application
```

---

## Screenshots

> *(Add screenshots here after deployment)*

---

## License

**Private — All rights reserved.**

This software is proprietary. No part of this codebase may be copied, distributed, or used without explicit written permission from the owner.

---

## Built by

**Jdingara** — [github.com/Jdingara](https://github.com/Jdingara)

*Purpose-built ERP for Technical & Medical Textile manufacturers.*
*Designed to be fast, industry-specific, and intelligent.*
