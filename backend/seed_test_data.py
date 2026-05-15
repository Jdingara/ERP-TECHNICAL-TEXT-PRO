"""
Seed 10 complete test entries across the full BH workflow.
Run: python seed_test_data.py  (from backend/ directory)
"""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from datetime import date, timedelta
from decimal import Decimal

admin = User.objects.get(username='admin')

today   = date.today()
in30    = today + timedelta(days=30)
in60    = today + timedelta(days=60)
in90    = today + timedelta(days=90)
m10     = today - timedelta(days=10)
m30     = today - timedelta(days=30)

errors = []

def ok(label):  print(f"  [OK] {label}")
def fail(label, e): print(f"  [ERR] {label}: {e}"); errors.append(f"{label}: {e}")

# ─── 1. MASTER DATA ───────────────────────────────────────────────────────────
print("\n=== 1. MASTER DATA ===")

from master_data.models import Company
co_obj = Company.objects.first()
ok(f"Using company: {co_obj.name} (id={co_obj.id})")

from masters.models import Brand, Category, Customer, Vendor

brand, cr = Brand.objects.get_or_create(
    brand_name="Zara", defaults=dict(company=co_obj))
ok(f"Brand: {brand.brand_name} ({'new' if cr else 'existing'})")

cat, cr = Category.objects.get_or_create(
    category_name="Woven Tops", defaults=dict(company=co_obj))
ok(f"Category: {cat.category_name} ({'new' if cr else 'existing'})")

cust, cr = Customer.objects.get_or_create(
    customer_code="CST-BH01",
    defaults=dict(
        company=co_obj, customer_name="Zara International",
        customer_type="brand", contact_person="Maria Garcia",
        email="maria@zara.com", phone="+34912345678",
        country="Spain", currency="USD", credit_days=60
    ))
ok(f"Customer: {cust.customer_name} ({'new' if cr else 'existing'})")

vendor, cr = Vendor.objects.get_or_create(
    vendor_code="VND-BH01",
    defaults=dict(
        company=co_obj, vendor_name="Sree Textiles Pvt Ltd",
        vendor_type="manufacturer", contact_person="Rajan Kumar",
        email="rajan@sreetex.com", phone="9944123456",
        city="Tirupur", country="India", currency="INR"
    ))
ok(f"Vendor: {vendor.vendor_name} ({'new' if cr else 'existing'})")

# ─── 2. PD REQUESTS ───────────────────────────────────────────────────────────
print("\n=== 2. PD REQUESTS ===")

from product_development.models import PDRequest, PDVendorAssignment, PDSampleShipment

try:
    pd1, cr = PDRequest.objects.get_or_create(
        title="Women's Linen Shirt - SS25",
        defaults=dict(
            company=co_obj, customer=cust, brand=brand, category=cat,
            request_date=m30, required_by=in30,
            notes="Round neck, 3/4 sleeve, linen blend. Sizes XS-XL.",
            status="approved", created_by=admin
        ))
    ok(f"PD1: {pd1.pd_number} [{pd1.status}] ({'new' if cr else 'existing'})")
except Exception as e:
    fail("PD1", e); pd1 = None

try:
    pd2, cr = PDRequest.objects.get_or_create(
        title="Men's Chino Trousers - AW25",
        defaults=dict(
            company=co_obj, customer=cust, brand=brand, category=cat,
            request_date=m10, required_by=in60,
            notes="Slim fit, stretch fabric, 2 back pockets.",
            status="sample_in_progress", created_by=admin
        ))
    ok(f"PD2: {pd2.pd_number} [{pd2.status}] ({'new' if cr else 'existing'})")
except Exception as e:
    fail("PD2", e); pd2 = None

try:
    pd3, cr = PDRequest.objects.get_or_create(
        title="Kids' Cotton T-shirt - SS25",
        defaults=dict(
            company=co_obj, customer=cust, brand=brand, category=cat,
            request_date=today, required_by=in90,
            notes="100% cotton, crew neck, screen print.",
            status="open", created_by=admin
        ))
    ok(f"PD3: {pd3.pd_number} [{pd3.status}] ({'new' if cr else 'existing'})")
except Exception as e:
    fail("PD3", e); pd3 = None

# Vendor assignment on pd1
if pd1:
    try:
        va, cr = PDVendorAssignment.objects.get_or_create(
            pd_request=pd1, vendor=vendor,
            defaults=dict(
                assigned_date=m30, status="accepted",
                sample_dev_cost=Decimal("250.00"), currency="INR",
                ta_notes="Specializes in linen, good QC track record"
            ))
        ok(f"Vendor assigned to PD1 ({'new' if cr else 'existing'})")

        # Sample shipment using vendor_assignment FK
        sship, cr2 = PDSampleShipment.objects.get_or_create(
            pd_request=pd1, vendor_assignment=va,
            defaults=dict(
                courier_name="DHL", tracking_number="DHL123456789",
                shipment_date=m10, received_date=m10 + timedelta(days=3),
                notes="2 proto samples received; colors approved"
            ))
        ok(f"Sample shipment ({'new' if cr2 else 'existing'})")
    except Exception as e:
        fail("VendorAssignment/SampleShipment PD1", e)

# ─── 3. CUSTOMER ORDERS ───────────────────────────────────────────────────────
print("\n=== 3. CUSTOMER ORDERS ===")

from order_management.models import CustomerOrder, CustomerOrderItem

co1 = None
try:
    co1, cr = CustomerOrder.objects.get_or_create(
        customer_po_ref="ZARA-PO-2025-001",
        defaults=dict(
            company=co_obj, customer=cust, brand=brand, category=cat,
            pd_request=pd1, order_date=m10, ship_by_date=in60,
            status="confirmed", currency="USD",
            notes="Priority order — linen shirts SS25", created_by=admin
        ))
    ok(f"CO1: {co1.co_number} [{co1.status}] ({'new' if cr else 'existing'})")

    if cr:  # only create items on new orders
        CustomerOrderItem.objects.create(
            customer_order=co1, style_ref="ZR-LS-001",
            description="Women Linen Shirt - White", color="White", size="XS",
            quantity=500, unit_price=Decimal("18.50"))
        CustomerOrderItem.objects.create(
            customer_order=co1, style_ref="ZR-LS-001",
            description="Women Linen Shirt - White", color="White", size="S",
            quantity=1000, unit_price=Decimal("18.50"))
        CustomerOrderItem.objects.create(
            customer_order=co1, style_ref="ZR-LS-001",
            description="Women Linen Shirt - White", color="White", size="M",
            quantity=1200, unit_price=Decimal("18.50"))
        ok(f"CO1 items: 3 size breaks (total 2700 pcs)")
except Exception as e:
    fail("CO1", e)

co2 = None
try:
    co2, cr = CustomerOrder.objects.get_or_create(
        customer_po_ref="ZARA-PO-2025-002",
        defaults=dict(
            company=co_obj, customer=cust, brand=brand, category=cat,
            pd_request=pd2, order_date=today, ship_by_date=in90,
            status="draft", currency="USD",
            notes="Awaiting final size confirmation", created_by=admin
        ))
    ok(f"CO2: {co2.co_number} [{co2.status}] ({'new' if cr else 'existing'})")

    if cr:
        CustomerOrderItem.objects.create(
            customer_order=co2, style_ref="ZR-CH-001",
            description="Men Chino Trouser - Navy", color="Navy", size="30",
            quantity=800, unit_price=Decimal("24.00"))
        ok(f"CO2 items: 800 pcs")
except Exception as e:
    fail("CO2", e)

# ─── 4. FACTORY ORDER ─────────────────────────────────────────────────────────
print("\n=== 4. FACTORY ORDER ===")

from order_management.models import FactoryOrder, FactoryOrderItem

fo1 = None
if co1:
    try:
        fo1, cr = FactoryOrder.objects.get_or_create(
            customer_order=co1, vendor=vendor,
            defaults=dict(
                company=co_obj, order_date=m10,
                ex_factory_date=in60, status="in_production",
                currency="INR", notes="Confirm fabric before cutting",
                created_by=admin
            ))
        ok(f"FO1: {fo1.fo_number} → {vendor.vendor_name} ({'new' if cr else 'existing'})")

        if cr:
            FactoryOrderItem.objects.create(
                factory_order=fo1, style_ref="ZR-LS-001",
                description="Women Linen Shirt - White", size="XS",
                quantity=500, unit_cost=Decimal("950.00"))
            FactoryOrderItem.objects.create(
                factory_order=fo1, style_ref="ZR-LS-001",
                description="Women Linen Shirt - White", size="S",
                quantity=1000, unit_cost=Decimal("950.00"))
            FactoryOrderItem.objects.create(
                factory_order=fo1, style_ref="ZR-LS-001",
                description="Women Linen Shirt - White", size="M",
                quantity=1200, unit_cost=Decimal("950.00"))
            ok(f"FO1 items: 3 lines (2700 pcs @ INR 950)")
    except Exception as e:
        fail("FO1", e)

# ─── 5. T&A MILESTONES ────────────────────────────────────────────────────────
print("\n=== 5. T&A MILESTONES ===")

from order_management.models import TAMilestone

if co1:
    milestone_data = [
        ("Fabric Approval",       m10,              m10,              "completed"),
        ("PP Sample Approval",    m10+timedelta(5), m10+timedelta(5), "completed"),
        ("Bulk Fabric In-House",  m10+timedelta(10),today,            "in_progress"),
        ("Cutting Start",         in30,             None,             "pending"),
        ("Sewing Complete",       in30+timedelta(10),None,            "pending"),
        ("Final Inspection",      in60-timedelta(5),None,             "pending"),
        ("Ex-Factory",            in60,             None,             "pending"),
    ]
    created_count = 0
    for name, planned, actual, status in milestone_data:
        if not TAMilestone.objects.filter(customer_order=co1, milestone_name=name).exists():
            try:
                TAMilestone.objects.create(
                    customer_order=co1, milestone_name=name,
                    planned_date=planned, actual_date=actual, status=status,
                    responsible="BHF Office"
                )
                created_count += 1
            except Exception as e:
                fail(f"T&A {name}", e)
    ok(f"T&A milestones: {created_count} created for {co1.co_number}")

# ─── 6. COSTING SHEET ─────────────────────────────────────────────────────────
print("\n=== 6. COSTING SHEET ===")

from shipment.models import CostingSheet

if co1:
    try:
        cs, cr = CostingSheet.objects.get_or_create(
            customer_order=co1,
            defaults=dict(
                currency="USD", fob_price_per_pc=Decimal("18.50"),
                total_quantity=2700,
                fabric_cost=Decimal("8.00"), trim_cost=Decimal("0.80"),
                embroidery_print=Decimal("0.50"), washing_finishing=Decimal("0.30"),
                cm_cost=Decimal("3.50"), testing_cost=Decimal("0.20"),
                inspection_cost=Decimal("0.15"), freight_cost=Decimal("0.60"),
                other_cost=Decimal("0.20"), commission_pct=Decimal("5.00"),
                notes="Linen shirt SS25 — FOB Barcelona"
            ))
        total_cost = (cs.fabric_cost + cs.trim_cost + cs.embroidery_print +
                      cs.washing_finishing + cs.cm_cost + cs.testing_cost +
                      cs.inspection_cost + cs.freight_cost + cs.other_cost)
        ok(f"Costing: FOB={cs.fob_price_per_pc}, Cost={total_cost:.2f}, Margin={cs.fob_price_per_pc - total_cost:.2f} ({'new' if cr else 'existing'})")
    except Exception as e:
        fail("CostingSheet", e)

# ─── 7. PRE-SHIPMENT INSPECTION ───────────────────────────────────────────────
print("\n=== 7. PRE-SHIPMENT INSPECTION ===")

from shipment.models import PreShipmentInspection, PSIChecklistItem

psi1 = None
if co1 and fo1:
    try:
        psi1, cr = PreShipmentInspection.objects.get_or_create(
            customer_order=co1,
            defaults=dict(
                company=co_obj, factory_order=fo1,
                inspection_date=in60-timedelta(7),
                inspector_name="Ravi QC / Bureau Veritas",
                inspection_agency="Bureau Veritas",
                result="pass_remarks",
                quantity_inspected=2700, quantity_passed=2700,
                aql_level="2.5",
                critical_defects=0, major_defects=3, minor_defects=12,
                remarks="3 major: loose stitching corrected on-line. 12 minor: shade variation within tolerance.",
                report_file_url="https://bv.com/reports/PSI-2025-001",
                created_by=admin
            ))
        ok(f"PSI: {psi1.psi_number} → {psi1.result} ({'new' if cr else 'existing'})")

        if cr:
            checklist = [
                ("Measurements", "Dimensions match approved spec sheet", "pass"),
                ("Fabric Quality", "No holes, snags, or weave defects", "pass"),
                ("Color / Shade", "Matches approved lab dip", "pass_remarks"),
                ("Stitching Quality", "SPI correct, no skipped stitches", "pass"),
                ("Seam Strength", "Seam slippage within tolerance", "pass"),
                ("Labels & Hangtags", "Care label and size label correct", "pass"),
                ("Packing", "Individual polybag + shipper carton", "pass"),
                ("Qty & Assortment", "Correct sizes per carton ratio", "pass"),
                ("Ironing / Finishing", "No creases, clean press", "pass"),
                ("Workmanship", "Overall presentation acceptable", "pass"),
            ]
            for i, (sec, desc, res) in enumerate(checklist):
                PSIChecklistItem.objects.create(
                    psi=psi1, section=sec, description=desc, result=res, sort_order=i+1)
            ok(f"PSI checklist: {len(checklist)} items")
    except Exception as e:
        fail("PSI", e)

# ─── 8. SHIPMENT ──────────────────────────────────────────────────────────────
print("\n=== 8. SHIPMENT ===")

from shipment.models import Shipment

shp1 = None
if co1:
    try:
        shp1, cr = Shipment.objects.get_or_create(
            customer_order=co1,
            defaults=dict(
                company=co_obj, factory_order=fo1, psi=psi1,
                mode="sea", status="loaded",
                port_of_loading="Chennai", port_of_discharge="Barcelona",
                etd=in60-timedelta(5), eta=in60+timedelta(25),
                bl_number="MAEU123456789", container_number="MSKU1234567",
                total_cartons=135, total_qty=2700,
                gross_weight_kg=Decimal("2025.00"), cbm=Decimal("18.50"),
                currency="USD", invoice_value=Decimal("49950.00"),
                notes="FCL 20ft — Maersk Edmonton",
                created_by=admin
            ))
        ok(f"Shipment: {shp1.shipment_number} [{shp1.status}] ETA {shp1.eta} ({'new' if cr else 'existing'})")
    except Exception as e:
        fail("Shipment", e)

# ─── 9. INVOICES ──────────────────────────────────────────────────────────────
print("\n=== 9. INVOICES ===")

from bh_finance.models import (SalesInvoice, SalesInvoiceItem,
                                PurchaseInvoice, PurchaseInvoiceItem)

si1 = None
if co1:
    try:
        si1, cr = SalesInvoice.objects.get_or_create(
            customer_order=co1,
            defaults=dict(
                company=co_obj, customer=cust, shipment=shp1,
                invoice_date=in60-timedelta(5),
                due_date=in60+timedelta(55),
                currency="USD", notes="FOB Chennai as per ZARA-PO-2025-001",
                created_by=admin
            ))
        ok(f"Sales Invoice: {si1.invoice_number} ({'new' if cr else 'existing'})")

        if cr:
            SalesInvoiceItem.objects.create(
                invoice=si1, description="Women Linen Shirt - White XS",
                quantity=500, unit_price=Decimal("18.50"))
            SalesInvoiceItem.objects.create(
                invoice=si1, description="Women Linen Shirt - White S",
                quantity=1000, unit_price=Decimal("18.50"))
            SalesInvoiceItem.objects.create(
                invoice=si1, description="Women Linen Shirt - White M",
                quantity=1200, unit_price=Decimal("18.50"))
            si1.refresh_from_db()
            ok(f"SI total: {si1.currency} {si1.total_amount}")
    except Exception as e:
        fail("SalesInvoice", e)

pi1 = None
if fo1:
    try:
        pi1, cr = PurchaseInvoice.objects.get_or_create(
            factory_order=fo1,
            defaults=dict(
                company=co_obj, vendor=vendor,
                vendor_invoice_ref="SREE/2025/0042",
                invoice_date=in60-timedelta(10),
                due_date=in60+timedelta(20),
                currency="INR", notes="GST 5% on finished garments",
                created_by=admin
            ))
        ok(f"Purchase Invoice: {pi1.invoice_number} ({'new' if cr else 'existing'})")

        if cr:
            PurchaseInvoiceItem.objects.create(
                invoice=pi1, description="Women Linen Shirt - White XS",
                quantity=500, unit_price=Decimal("950.00"))
            PurchaseInvoiceItem.objects.create(
                invoice=pi1, description="Women Linen Shirt - White S",
                quantity=1000, unit_price=Decimal("950.00"))
            PurchaseInvoiceItem.objects.create(
                invoice=pi1, description="Women Linen Shirt - White M",
                quantity=1200, unit_price=Decimal("950.00"))
            pi1.refresh_from_db()
            ok(f"PI total: {pi1.currency} {pi1.total_amount}")
    except Exception as e:
        fail("PurchaseInvoice", e)

# ─── 10. PAYMENTS ─────────────────────────────────────────────────────────────
print("\n=== 10. PAYMENTS ===")

from bh_finance.models import Payment

if si1 and not Payment.objects.filter(sales_invoice=si1).exists():
    try:
        pay1 = Payment.objects.create(
            company=co_obj, payment_type="received",
            sales_invoice=si1, payment_date=in60+timedelta(5),
            amount=Decimal("25000.00"), currency="USD",
            payment_method="lc", reference="LC/HDFC/2025/001",
            notes="First LC payment received from Zara", created_by=admin
        )
        si1.refresh_from_db()
        ok(f"Payment IN: USD 25,000 via LC | SI balance={si1.total_amount - si1.amount_paid}")
    except Exception as e:
        fail("Payment IN", e)
else:
    ok("Payment IN: already exists")

if pi1 and not Payment.objects.filter(purchase_invoice=pi1).exists():
    try:
        pay2 = Payment.objects.create(
            company=co_obj, payment_type="made",
            purchase_invoice=pi1, payment_date=in60-timedelta(5),
            amount=Decimal("1350000.00"), currency="INR",
            payment_method="bank_transfer", reference="NEFT/SBI/20250501",
            notes="Advance 50% to Sree Textiles", created_by=admin
        )
        pi1.refresh_from_db()
        ok(f"Payment OUT: INR 13,50,000 | PI balance={pi1.total_amount - pi1.amount_paid}")
    except Exception as e:
        fail("Payment OUT", e)
else:
    ok("Payment OUT: already exists")

# ─── SUMMARY ──────────────────────────────────────────────────────────────────
print("\n=== SUMMARY ===")
from product_development.models import PDRequest
from order_management.models import CustomerOrder, FactoryOrder
from shipment.models import PreShipmentInspection, Shipment, CostingSheet
from bh_finance.models import SalesInvoice, PurchaseInvoice, Payment

print(f"  PD Requests      : {PDRequest.objects.count()}")
print(f"  Customer Orders  : {CustomerOrder.objects.count()}")
print(f"  Factory Orders   : {FactoryOrder.objects.count()}")
print(f"  Costing Sheets   : {CostingSheet.objects.count()}")
print(f"  PSI Records      : {PreShipmentInspection.objects.count()}")
print(f"  Shipments        : {Shipment.objects.count()}")
print(f"  Sales Invoices   : {SalesInvoice.objects.count()}")
print(f"  Purchase Invoices: {PurchaseInvoice.objects.count()}")
print(f"  Payments         : {Payment.objects.count()}")

if errors:
    print(f"\n  ERRORS ({len(errors)}):")
    for e in errors:
        print(f"    [ERR] {e}")
    sys.exit(1)
else:
    print("\n  All entries created successfully!")
