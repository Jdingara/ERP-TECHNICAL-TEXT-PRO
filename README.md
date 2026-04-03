# SASI ERP — Medical & Technical Textile

A purpose-built Enterprise Resource Planning (ERP) system for **Medical and Technical Textile manufacturers**.  
Built with React.js, Django, and PostgreSQL.

---

## What This Does

Most ERPs are generic. This one is built specifically for textile companies that manufacture:
- **Medical textiles** — surgical drapes, wound care, implantable fabrics (requires ISO 13485, FDA, CAPA compliance)
- **Technical textiles** — geotextiles, agrotextiles, filtration, protective fabrics (requires GSM, tensile, performance specs)

It covers the **entire business operation** in one system.

---

## Modules

| Module | What It Covers |
|---|---|
| **Master Data** | Items, Suppliers, Customers, Warehouses |
| **Inventory** | Stock levels, Stock movements (IN/OUT/TRANSFER) |
| **Purchasing** | Purchase Orders, Supplier management, Goods receipt |
| **Sales** | Sales Orders, Delivery, Invoice tracking |
| **Finance** | Chart of Accounts, Journal Entries, Trial Balance |
| **HR & Payroll** | Employees, Attendance, Monthly Salary processing |
| **Production** | Bill of Materials, Work Orders, Batch tracking |
| **Technical Textile** | Performance Specs, Samples, TDS, Testing Lab, R&D Projects |
| **Medical Textile** | Regulatory Compliance, Batch Traceability, Sterility Records, CAPA, Audit Trail, Shelf Life |
| **Reports** | Production, Inventory, Sales, Finance, HR reports with charts |
| **Dashboard** | Live KPIs, alerts, charts from all modules |

**Total: 38 pages across 11 modules**

---

## Tech Stack

### Frontend
- **React.js** — UI framework
- **Material UI (MUI)** — Component library
- **Recharts** — Charts and graphs
- **React Router** — Page routing

### Backend
- **Python 3.x** + **Django** — Web framework
- **Django REST Framework** — API layer
- **PostgreSQL** — Database

### Infrastructure
- **Docker + Docker Compose** — Runs PostgreSQL locally
- **Node.js + npm** — React development server

---

## Project Structure

```
SASI's_ERP/
├── backend/                  # Django backend
│   ├── core/                 # Settings, main URL router
│   ├── authentication/       # Login, logout, dashboard API
│   ├── inventory/            # Stock and movements
│   ├── purchasing/           # Purchase orders
│   ├── sales/                # Sales orders and invoices
│   ├── finance/              # Accounts and journals
│   ├── hr_payroll/           # Employees, attendance, salary
│   ├── production/           # BOM and work orders
│   ├── technical_textile/    # Specs, samples, lab, R&D
│   ├── medical_textile/      # Compliance, CAPA, traceability
│   └── reports/              # Report APIs
│
├── frontend/                 # React frontend
│   └── src/
│       ├── App.js            # All routes
│       ├── components/       # Sidebar, layout
│       └── pages/            # All 38 pages
│
├── docker-compose.yml        # PostgreSQL container
├── .gitignore
└── README.md
```

---

## How to Run (Development)

### Prerequisites
- Docker Desktop installed and running
- Python 3.x installed
- Node.js + npm installed

### 1. Start the Database
```bash
docker-compose up -d
```

### 2. Start the Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
Backend runs at: `http://127.0.0.1:8000`

### 3. Start the Frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs at: `http://localhost:3000`

### 4. Create Admin User (first time only)
```bash
cd backend
python manage.py createsuperuser
```

---

## Key Features

- **Live Dashboard** — KPI cards, charts, alerts from all modules in real time
- **Medical Compliance** — ISO 13485, FDA 510(k), CE Mark certificate tracking with expiry alerts
- **CAPA Management** — Corrective and Preventive Action tracking with open/closed status
- **Batch Traceability** — Full raw material → production → dispatch chain
- **Shelf Life Monitoring** — Auto-calculates days remaining, flags near-expiry batches
- **Audit Trail** — Every action auto-logged with user, timestamp, and module
- **BOM + Production** — Bill of Materials with waste percentage, work order completion updates stock automatically
- **Session Auth** — Secure login with Django session management

---

## API Endpoints (Summary)

All APIs follow the pattern: `http://127.0.0.1:8000/api/<module>/<resource>/`

Examples:
- `GET /api/authentication/dashboard-summary/` — Dashboard KPIs
- `GET/POST /api/inventory/stock/` — Stock records
- `GET/POST /api/purchasing/purchase-orders/` — Purchase orders
- `POST /api/production/work-orders/<id>/complete/` — Complete a work order
- `GET /api/reports/sales/` — Sales report data

---

## Roadmap (Phase 2)

- [ ] Role-based access control (Admin / Manager / Operator)
- [ ] Email notifications (expiring certs, overdue CAPAs)
- [ ] PDF export (Sales Orders, Salary Slips, TDS)
- [ ] File attachments (certificates, test reports)
- [ ] Barcode / QR scanning for stock movement
- [ ] Cloud deployment (AWS / DigitalOcean)
- [ ] Mobile-friendly warehouse interface
- [ ] Multi-company support

---

## License

Private — All rights reserved.  
This software is proprietary. Do not distribute without permission.

---

*Built for Medical & Technical Textile manufacturers. Designed to be simple, fast, and industry-specific.*
