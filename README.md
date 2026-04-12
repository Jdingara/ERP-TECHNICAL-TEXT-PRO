# ERP TECHNICAL TEXT — PRO

> A complete, production-ready Enterprise Resource Planning system built specifically for **Technical & Medical Textile manufacturers**.
> Built with React.js · Django · PostgreSQL · Material UI · Claude AI

---

## Overview

Most ERP systems are generic. This one is purpose-built for textile companies.

It covers the **entire business operation** — from raw material purchasing to customer invoicing, from machine work orders to payroll — all in one system. With built-in AI features, smart analytics, a floating chatbot, and fully customizable UI themes.

**Live deployment:** Hosted on [Render](https://render.com) with PostgreSQL cloud database.

---

## Modules

### Core Business

| Module | Pages | What it covers |
|---|---|---|
| **Dashboard** | 1 | Live KPIs, revenue charts, alerts, production predictions |
| **Master Data** | 8 | Items & Products, Suppliers, Customers, Warehouses |
| **Inventory** | 2 | Stock levels, Stock movements (IN / OUT / TRANSFER / ADJUSTMENT) |
| **Purchasing** | 3 | Purchase Orders, Goods Receipt (GRN), Supplier management |
| **Sales** | 6 | Inquiries, Quotations, Sales Orders, Order Journey, Invoices |
| **Finance** | 3 | Chart of Accounts, Journal Entries, Trial Balance |
| **HR & Payroll** | 3 | Employees, Attendance, Salary Processing |
| **Production** | 6 | Bill of Materials, Work Orders, Machines, Quality Checks, Batch Tracking |

### Industry-Specific

| Module | Pages | What it covers |
|---|---|---|
| **Technical Textile** | 6 | Product Categories, Performance Specs, Sample Management, Technical Data Sheets, Testing Lab, R&D Projects |
| **Medical Textile** | 6 | Regulatory Compliance (ISO 13485 / FDA / CE), Batch Traceability, Sterility Records, CAPA Management, Audit Trail, Shelf Life Tracking |

### Intelligence & Analytics

| Module | Pages | What it covers |
|---|---|---|
| **Customer Intelligence** | 6 tabs | RFM Segmentation, Churn Prediction, Sales Forecasting, Product Analytics, What-If Simulator |
| **Smart Business Feed** | 1 | Daily AI-curated business insights, alerts, books, courses, market news |
| **Reports** | 7 | Production, Inventory, Sales, Finance, HR reports + custom Report Maker |

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
ERP-TECHNICAL-TEXT-PRO/
│
├── backend/                        # Django backend
│   ├── core/                       # Settings, main URL router, WSGI
│   ├── authentication/             # Login, logout, session, roles, permissions
│   ├── master_data/                # Items, suppliers, customers, warehouses
│   ├── inventory/                  # Stock management, movements
│   ├── purchasing/                 # Purchase orders, GRN
│   ├── sales/                      # Inquiries, quotations, sales orders, invoices
│   ├── finance/                    # Chart of accounts, journal entries, trial balance
│   ├── hr_payroll/                 # Employees, attendance, salary
│   ├── production/                 # BOM, work orders, machines, quality, batches
│   ├── technical_textile/          # Performance specs, samples, testing lab, R&D
│   ├── medical_textile/            # Compliance, CAPA, traceability, shelf life
│   ├── dashboard/                  # KPI aggregation, alerts
│   ├── analytics/                  # RFM, churn, forecast, product intelligence
│   ├── feed/                       # Smart Business Feed + content library
│   ├── chatbot/                    # NLP query engine + Claude AI fallback
│   ├── reports/                    # All report APIs
│   ├── requirements.txt
│   └── manage.py
│
├── frontend/                       # React frontend
│   ├── public/
│   │   └── index.html              # Google Fonts loaded here
│   └── src/
│       ├── App.js                  # All routes (50+ pages)
│       ├── index.js                # MUI theme builder (dynamic from settings)
│       ├── context/
│       │   ├── SettingsContext.js  # Global UI settings + theme presets
│       │   └── ErrorContext.js
│       ├── components/
│       │   ├── layout/
│       │   │   ├── MainLayout.js   # App shell, header, user menu
│       │   │   └── Sidebar.js      # Navigation sidebar
│       │   └── common/
│       │       ├── ChatBot.js      # Floating AI chatbot + voice input
│       │       ├── ResizableChartPanel.js
│       │       ├── ResizablePanelRow.js
│       │       ├── useColumnResize.js
│       │       └── ReportToolbar.js
│       └── pages/                  # 50+ page components across all modules
│
├── docker-compose.yml              # PostgreSQL local container
├── render.yaml                     # Render deployment config
├── build.sh                        # Production build script
├── .gitignore
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
| `/api/authentication/current-user/` | GET | Logged-in user info |
| `/api/master-data/items/` | GET, POST | Items list & create |
| `/api/inventory/stock/` | GET | Stock levels |
| `/api/inventory/movements/` | GET, POST | Stock movements |
| `/api/purchasing/purchase-orders/` | GET, POST | Purchase orders |
| `/api/sales/sales-orders/` | GET, POST | Sales orders |
| `/api/sales/invoices/` | GET, POST | Sales invoices |
| `/api/finance/journal-entries/` | GET, POST | Journal entries |
| `/api/hr/employees/` | GET, POST | Employee records |
| `/api/production/work-orders/` | GET, POST | Work orders |
| `/api/analytics/rfm/` | GET | RFM segmentation data |
| `/api/analytics/churn/` | GET | Churn risk data |
| `/api/analytics/forecast/` | GET | Sales forecast |
| `/api/feed/` | GET | Smart Business Feed |
| `/api/chat/` | POST | Chatbot query |
| `/api/reports/sales/` | GET | Sales report |
| `/api/dashboard/` | GET | Dashboard KPIs |

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
