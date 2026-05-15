"""
Test all BH API endpoints.
Run: python test_apis.py
"""
import os, sys, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.test import Client, override_settings

@override_settings(ALLOWED_HOSTS=['*'])
def run():
    pass

c = Client(SERVER_NAME='localhost')

# Login
resp = c.post('/api/authentication/login/',
              json.dumps({"username": "admin", "password": "admin123"}),
              content_type='application/json')
print(f"Login: {resp.status_code}")

if resp.status_code != 200:
    print("Login failed — aborting")
    sys.exit(1)

errors = []

endpoints = [
    ("GET", "/api/pd/requests/",                    "pd_requests"),
    ("GET", "/api/orders/co/",                      "customer_orders"),
    ("GET", "/api/orders/fo/",                      "factory_orders"),
    ("GET", "/api/shipment/psi/",                   "psi_records"),
    ("GET", "/api/shipment/shipments/",             "shipments"),
    ("GET", "/api/finance/si/",                     "sales_invoices"),
    ("GET", "/api/finance/pi/",                     "purchase_invoices"),
    ("GET", "/api/finance/payments/",               "payments"),
    ("GET", "/api/finance/summary/",                None),
    ("GET", "/api/finance/dashboard/",              None),
    ("GET", "/api/finance/reports/order-summary/",  "orders"),
    ("GET", "/api/finance/reports/pd-pipeline/",    "pd_requests"),
    ("GET", "/api/finance/reports/vendor-performance/", "vendors"),
    ("GET", "/api/finance/reports/shipment-tracker/",   "shipments"),
]

print("\n=== API ENDPOINT TESTS ===")
for method, url, key in endpoints:
    try:
        resp = getattr(c, method.lower())(url)
        try:
            data = resp.json()
        except Exception:
            data = {}

        if resp.status_code == 200:
            if key and key in data:
                count = len(data[key]) if isinstance(data[key], list) else "n/a"
                print(f"  [OK] {method} {url}  -> {count} records")
            else:
                print(f"  [OK] {method} {url}  -> {list(data.keys())[:6]}")
        else:
            print(f"  [ERR] {method} {url}  -> HTTP {resp.status_code}: {str(data)[:200]}")
            errors.append(f"{method} {url} -> {resp.status_code}: {str(data)[:200]}")
    except Exception as e:
        print(f"  [EXC] {method} {url}  -> {e}")
        errors.append(f"{method} {url} -> Exception: {e}")

# ── Detailed data checks ──────────────────────────────────────────────────────
print("\n=== DATA INTEGRITY CHECKS ===")

# Check SI
resp = c.get("/api/finance/si/")
for inv in resp.json().get("sales_invoices", []):
    total = inv["total_amount"]
    paid  = inv["amount_paid"]
    bal   = inv["balance_due"]
    check = abs((total - paid) - bal) < 0.01
    status = "[OK]" if check else "[ERR]"
    print(f"  {status} SI {inv['invoice_number']}: total={total} paid={paid} balance={bal}")
    if not check:
        errors.append(f"SI {inv['invoice_number']} balance mismatch")

# Check PI
resp = c.get("/api/finance/pi/")
for inv in resp.json().get("purchase_invoices", []):
    total = inv["total_amount"]
    paid  = inv["amount_paid"]
    bal   = inv["balance_due"]
    check = abs((total - paid) - bal) < 0.01
    status = "[OK]" if check else "[ERR]"
    print(f"  {status} PI {inv['invoice_number']}: total={total} paid={paid} balance={bal}")
    if not check:
        errors.append(f"PI {inv['invoice_number']} balance mismatch")

# Check Dashboard
resp = c.get("/api/finance/dashboard/")
dash = resp.json()
print(f"\n  Dashboard keys: {list(dash.keys())}")

# Check Shipment Tracker
resp = c.get("/api/finance/reports/shipment-tracker/")
st = resp.json()
print(f"  Shipment Tracker: total_active={st.get('total_active')}, overdue={st.get('overdue_count')}, due_soon={st.get('due_this_week')}")
for shp in st.get("shipments", []):
    print(f"    {shp['shipment_number']} [{shp['status']}] ETA in {shp.get('eta_days')} days")

# Final
print(f"\n=== RESULT: {len(errors)} errors ===")
for e in errors:
    print(f"  [ERR] {e}")

if errors:
    sys.exit(1)
else:
    print("  All tests passed!")
