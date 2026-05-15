"""
seed_full_data.py  —  BHF India Buying House ERP
Creates complete end-to-end test data across 5 buyer chains at different stages.
Run:  python seed_full_data.py   (from backend/ directory)

Chain 1  ->  Zara Linen Shirts      — FULLY COMPLETED & PAID
Chain 2  ->  H&M Jersey Dresses     — IN PRODUCTION (T&A in progress)
Chain 3  ->  Primark Chino Trousers — PRODUCTION DELAYED (T&A overdue)
Chain 4  ->  M&S Knitwear Sweaters  — QUOTED TO BUYER (awaiting CO)
Chain 5  ->  Next Outerwear Jackets — RFQ SENT (cost sheet done)
"""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from datetime import date, timedelta
from decimal import Decimal

admin  = User.objects.get(username='admin')
today  = date.today()

def d(offset): return today + timedelta(days=offset)

errors = []
def ok(msg):       print(f"  [OK]  {msg}")
def skip(msg):     print(f"  [--]  {msg}")
def err(label, e): print(f"  [ERR] {label}: {e}"); errors.append(f"{label}: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# 1.  MASTER DATA
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== 1. MASTER DATA ===")

from master_data.models import Company
from masters.models import Customer, Vendor, Brand, Category

co_obj = Company.objects.first()
ok(f"Company: {co_obj.name}")

# ── Customers ────────────────────────────────────────────────────────────────
customers_data = [
    dict(customer_code="CST-BH01", customer_name="Zara International",
         customer_type="brand", contact_person="Maria Garcia",
         email="maria@zara.com", phone="+34912345678",
         country="Spain",  currency="USD", credit_days=60),
    dict(customer_code="CST-BH02", customer_name="H&M Group",
         customer_type="brand", contact_person="Erik Lindqvist",
         email="erik.lind@hm.com", phone="+46812345678",
         country="Sweden", currency="EUR", credit_days=45),
    dict(customer_code="CST-BH03", customer_name="Primark Ltd",
         customer_type="retailer", contact_person="James O'Brien",
         email="james.ob@primark.com", phone="+441234567890",
         country="UK",     currency="GBP", credit_days=30),
    dict(customer_code="CST-BH04", customer_name="Marks & Spencer Plc",
         customer_type="retailer", contact_person="Sarah Thompson",
         email="sarah.t@marksandspencer.com", phone="+441279123456",
         country="UK",     currency="GBP", credit_days=45),
    dict(customer_code="CST-BH05", customer_name="Next Retail Ltd",
         customer_type="retailer", contact_person="David Hollis",
         email="d.hollis@next.co.uk", phone="+441162843000",
         country="UK",     currency="GBP", credit_days=30),
    dict(customer_code="CST-BH06", customer_name="Target Corporation",
         customer_type="retailer", contact_person="Lisa Monroe",
         email="lisa.m@target.com", phone="+16122345678",
         country="USA",    currency="USD", credit_days=60),
]
custs = {}
for d_c in customers_data:
    code = d_c.pop('customer_code')
    obj, cr = Customer.objects.get_or_create(
        customer_code=code, defaults=dict(company=co_obj, **d_c))
    custs[code] = obj
    ok(f"Customer: {obj.customer_name} ({'new' if cr else 'existing'})")

zara   = custs['CST-BH01']
hm     = custs['CST-BH02']
primark= custs['CST-BH03']
ms     = custs['CST-BH04']
next_  = custs['CST-BH05']
target = custs['CST-BH06']

# ── Vendors ──────────────────────────────────────────────────────────────────
vendors_data = [
    dict(vendor_code="VND-BH01", vendor_name="Sree Textiles Pvt Ltd",
         vendor_type="manufacturer", contact_person="Rajan Kumar",
         email="rajan@sreetex.com", phone="9944123456",
         city="Tirupur",   country="India", currency="INR"),
    dict(vendor_code="VND-BH02", vendor_name="Tirupur Knits Pvt Ltd",
         vendor_type="manufacturer", contact_person="Murugan K",
         email="murugan@tiruknits.com", phone="9944567890",
         city="Tirupur",   country="India", currency="INR"),
    dict(vendor_code="VND-BH03", vendor_name="Bangalore Wovens Pvt Ltd",
         vendor_type="manufacturer", contact_person="Suresh Gowda",
         email="suresh@bangalorewovens.com", phone="9845123456",
         city="Bangalore",  country="India", currency="INR"),
    dict(vendor_code="VND-BH04", vendor_name="Ludhiana Knitwear Co",
         vendor_type="manufacturer", contact_person="Harpreet Singh",
         email="hp@ludhknitwear.com", phone="9815432100",
         city="Ludhiana",  country="India", currency="INR"),
    dict(vendor_code="VND-BH05", vendor_name="Chennai Stitching Works",
         vendor_type="manufacturer", contact_person="Anand Raj",
         email="anand@chennaistitch.com", phone="9841234567",
         city="Chennai",   country="India", currency="INR"),
]
vends = {}
for d_v in vendors_data:
    code = d_v.pop('vendor_code')
    obj, cr = Vendor.objects.get_or_create(
        vendor_code=code, defaults=dict(company=co_obj, **d_v))
    vends[code] = obj
    ok(f"Vendor: {obj.vendor_name} ({'new' if cr else 'existing'})")

sree     = vends['VND-BH01']
tiruknit = vends['VND-BH02']
bangwov  = vends['VND-BH03']
ludhiana = vends['VND-BH04']
chennai  = vends['VND-BH05']

# ── Brands ───────────────────────────────────────────────────────────────────
brand_list = [
    ("BRD-ZR", "Zara"),
    ("BRD-HM", "H&M"),
    ("BRD-PK", "Primark"),
    ("BRD-MS", "M&S Collection"),
    ("BRD-NX", "Next"),
]
brands = {}
for code, name in brand_list:
    obj, cr = Brand.objects.get_or_create(brand_code=code, defaults=dict(company=co_obj, brand_name=name))
    brands[name] = obj
    ok(f"Brand: {name} ({'new' if cr else 'existing'})")

# ── Categories ───────────────────────────────────────────────────────────────
cat_list = [
    ("CAT-WT", "Woven Tops"),
    ("CAT-KN", "Knitwear"),
    ("CAT-BT", "Bottoms / Trousers"),
    ("CAT-DR", "Dresses"),
    ("CAT-OW", "Outerwear"),
    ("CAT-KD", "Kids Wear"),
]
cats = {}
for code, name in cat_list:
    obj, cr = Category.objects.get_or_create(category_code=code, defaults=dict(company=co_obj, category_name=name))
    cats[name] = obj
    ok(f"Category: {name} ({'new' if cr else 'existing'})")


# ══════════════════════════════════════════════════════════════════════════════
# HELPER — create full T&A milestone set
# ══════════════════════════════════════════════════════════════════════════════
from order_management.models import TAMilestone

def make_ta(co, base_offset, delay=0):
    b = base_offset
    milestones = [
        ("Fabric Approval",       b,    b,    "completed"),
        ("PP Sample Approval",    b+7,  b+7,  "completed"),
        ("Bulk Fabric In-House",  b+14, b+14+delay, "completed" if delay == 0 else "in_progress"),
        ("Cutting Start",         b+21, b+21+delay if delay else None,
                                               "completed" if delay == 0 else "pending"),
        ("Sewing Complete",       b+35, b+35  if delay == 0 else None,
                                               "completed" if delay == 0 else "pending"),
        ("Final Inspection",      b+42, b+42  if delay == 0 else None,
                                               "completed" if delay == 0 else "pending"),
        ("Ex-Factory",            b+49, b+49  if delay == 0 else None,
                                               "completed" if delay == 0 else "pending"),
    ]
    cnt = 0
    for name, planned_off, actual_off, status in milestones:
        if TAMilestone.objects.filter(customer_order=co, milestone_name=name).exists():
            continue
        TAMilestone.objects.create(
            customer_order=co, milestone_name=name,
            planned_date=d(planned_off),
            actual_date=d(actual_off) if actual_off is not None else None,
            status=status, responsible="BHF Office")
        cnt += 1
    ok(f"T&A: {cnt} milestones for {co.co_number}")


# ══════════════════════════════════════════════════════════════════════════════
# CHAIN 1  —  Zara Linen Shirts  (FULLY COMPLETED & PAID)
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== CHAIN 1 — Zara Linen Shirts (COMPLETED & PAID) ===")

from order_management.models import (
    BuyerInquiry, InquiryItem, InquiryCostSheet, VendorQuotation,
    CustomerOrder, CustomerOrderItem, FactoryOrder, FactoryOrderItem
)
from product_development.models import PDRequest, PDVendorAssignment, PDSampleShipment
from shipment.models import PreShipmentInspection, PSIChecklistItem, Shipment, CostingSheet
from bh_finance.models import SalesInvoice, SalesInvoiceItem, PurchaseInvoice, PurchaseInvoiceItem, Payment

# Buyer Inquiry (update existing INQ-2026-0001 to confirmed if it exists)
inq1 = BuyerInquiry.objects.filter(inquiry_number__startswith='INQ-').first()
if not inq1:
    inq1 = BuyerInquiry.objects.create(
        company=co_obj, customer=zara, brand=brands["Zara"],
        category=cats["Woven Tops"], inquiry_date=d(-75),
        required_delivery=d(-10), destination="Barcelona, Spain",
        target_fob_price=Decimal("13.50"), currency="USD",
        description="Women's linen shirt collection SS25", status="confirmed",
        created_by=admin)
    ok(f"INQ1 created: {inq1.inquiry_number}")
else:
    inq1.status = 'confirmed'; inq1.save()
    ok(f"INQ1 existing: {inq1.inquiry_number} -> set confirmed")

# Items
if not inq1.items.exists():
    InquiryItem.objects.create(inquiry=inq1, style_ref="ZR-101",
        description="Peasant Top - Linen White", color="White",
        size_range="XS-XL", quantity=1200, target_price=Decimal("13.50"))
    InquiryItem.objects.create(inquiry=inq1, style_ref="ZR-102",
        description="Wrap Top - Linen Ecru", color="Ecru",
        size_range="XS-XL", quantity=900, target_price=Decimal("14.00"))
    ok("INQ1 items: 2 styles")

# Cost sheet
cs1, cr = InquiryCostSheet.objects.get_or_create(inquiry=inq1, defaults=dict(
    fabric_cost=Decimal("5.20"), trims_cost=Decimal("0.80"),
    cm_cost=Decimal("3.50"), washing_cost=Decimal("0.40"),
    testing_cost=Decimal("0.30"), freight_cost=Decimal("0.50"),
    overhead_pct=Decimal("8.00"), margin_pct=Decimal("18.00"),
    currency="USD", selling_price=Decimal("13.50")))
ok(f"INQ1 cost sheet ({'new' if cr else 'existing'})")

# Vendor quotes
for vnd, amt, sel in [(sree, 950, 'selected'), (tiruknit, 990, 'rejected')]:
    if not VendorQuotation.objects.filter(inquiry=inq1, vendor=vnd).exists():
        VendorQuotation.objects.create(
            inquiry=inq1, vendor=vnd, rfq_date=d(-70),
            response_date=d(-65), lead_time_days=55,
            currency="INR", unit_quoted=Decimal(amt),
            total_quoted=Decimal(amt * 2100), status=sel)
        ok(f"INQ1 quote: {vnd.vendor_name} INR {amt} -> {sel}")

# CO
co1, cr = CustomerOrder.objects.get_or_create(
    customer_po_ref="ZARA-PO-2025-001",
    defaults=dict(company=co_obj, customer=zara, brand=brands["Zara"],
        category=cats["Woven Tops"], order_date=d(-65), ship_by_date=d(-10),
        status="shipped", currency="USD",
        notes="Women linen shirts SS25 — FOB Barcelona", created_by=admin))
if cr:
    CustomerOrderItem.objects.bulk_create([
        CustomerOrderItem(customer_order=co1, style_ref="ZR-101",
            description="Peasant Top Linen White", color="White",
            size="S",  quantity=400, unit_price=Decimal("13.50")),
        CustomerOrderItem(customer_order=co1, style_ref="ZR-101",
            description="Peasant Top Linen White", color="White",
            size="M",  quantity=500, unit_price=Decimal("13.50")),
        CustomerOrderItem(customer_order=co1, style_ref="ZR-101",
            description="Peasant Top Linen White", color="White",
            size="L",  quantity=300, unit_price=Decimal("13.50")),
        CustomerOrderItem(customer_order=co1, style_ref="ZR-102",
            description="Wrap Top Linen Ecru", color="Ecru",
            size="S",  quantity=300, unit_price=Decimal("14.00")),
        CustomerOrderItem(customer_order=co1, style_ref="ZR-102",
            description="Wrap Top Linen Ecru", color="Ecru",
            size="M",  quantity=350, unit_price=Decimal("14.00")),
        CustomerOrderItem(customer_order=co1, style_ref="ZR-102",
            description="Wrap Top Linen Ecru", color="Ecru",
            size="L",  quantity=250, unit_price=Decimal("14.00")),
    ])
if inq1.customer_order is None:
    inq1.customer_order = co1; inq1.save()
ok(f"CO1: {co1.co_number} [{co1.status}] ({'new' if cr else 'existing'})")

# FO
fo1, cr = FactoryOrder.objects.get_or_create(
    customer_order=co1, vendor=sree,
    defaults=dict(company=co_obj, order_date=d(-65),
        ex_factory_date=d(-12), status="shipped",
        currency="INR", notes="Linen woven tops", created_by=admin))
if cr:
    FactoryOrderItem.objects.bulk_create([
        FactoryOrderItem(factory_order=fo1, style_ref="ZR-101",
            description="Peasant Top Linen", size="S",  quantity=400, unit_cost=Decimal("940")),
        FactoryOrderItem(factory_order=fo1, style_ref="ZR-101",
            description="Peasant Top Linen", size="M",  quantity=500, unit_cost=Decimal("940")),
        FactoryOrderItem(factory_order=fo1, style_ref="ZR-101",
            description="Peasant Top Linen", size="L",  quantity=300, unit_cost=Decimal("940")),
        FactoryOrderItem(factory_order=fo1, style_ref="ZR-102",
            description="Wrap Top Linen",    size="S",  quantity=300, unit_cost=Decimal("980")),
        FactoryOrderItem(factory_order=fo1, style_ref="ZR-102",
            description="Wrap Top Linen",    size="M",  quantity=350, unit_cost=Decimal("980")),
        FactoryOrderItem(factory_order=fo1, style_ref="ZR-102",
            description="Wrap Top Linen",    size="L",  quantity=250, unit_cost=Decimal("980")),
    ])
ok(f"FO1: {fo1.fo_number} -> {sree.vendor_name} ({'new' if cr else 'existing'})")

# T&A — all completed
make_ta(co1, -65, delay=0)

# Costing Sheet
cs_co1, cr = CostingSheet.objects.get_or_create(customer_order=co1, defaults=dict(
    currency="USD", fob_price_per_pc=Decimal("13.50"), total_quantity=2400,
    fabric_cost=Decimal("5.20"), trim_cost=Decimal("0.80"),
    embroidery_print=Decimal("0.00"), washing_finishing=Decimal("0.40"),
    cm_cost=Decimal("3.50"), testing_cost=Decimal("0.30"),
    inspection_cost=Decimal("0.15"), freight_cost=Decimal("0.50"),
    other_cost=Decimal("0.20"), commission_pct=Decimal("5.00"),
    notes="Zara Linen Shirts SS25 — FOB Barcelona"))
ok(f"Costing sheet CO1 ({'new' if cr else 'existing'})")

# PSI
psi1, cr = PreShipmentInspection.objects.get_or_create(customer_order=co1, defaults=dict(
    company=co_obj, factory_order=fo1,
    inspection_date=d(-18), inspector_name="Bureau Veritas",
    inspection_agency="Bureau Veritas", result="pass",
    quantity_inspected=2400, quantity_passed=2400, aql_level="2.5",
    critical_defects=0, major_defects=0, minor_defects=5,
    remarks="Minor shade variation within tolerance. All measurements pass.",
    created_by=admin))
ok(f"PSI1: {psi1.psi_number} -> {psi1.result} ({'new' if cr else 'existing'})")
if cr:
    for i, (sec, desc, res) in enumerate([
        ("Measurements",    "All dimensions match spec",        "pass"),
        ("Fabric Quality",  "No defects found",                 "pass"),
        ("Color / Shade",   "Within tolerance",                 "pass_remarks"),
        ("Stitching",       "SPI correct, no skips",            "pass"),
        ("Packing",         "Polybag + carton correct",         "pass"),
        ("Labels",          "Care + size labels correct",       "pass"),
        ("Qty Check",       "Carton ratio correct",             "pass"),
        ("Finishing",       "Clean press, no creases",          "pass"),
    ], 1): PSIChecklistItem.objects.create(psi=psi1, section=sec,
            description=desc, result=res, sort_order=i)
    ok("PSI1 checklist: 8 items")

# Shipment
shp1, cr = Shipment.objects.get_or_create(customer_order=co1, defaults=dict(
    company=co_obj, factory_order=fo1, psi=psi1,
    mode="sea", status="delivered",
    port_of_loading="Chennai", port_of_discharge="Barcelona",
    etd=d(-15), eta=d(12), bl_number="MAEU2025001234",
    container_number="MSKU1234567", total_cartons=120,
    total_qty=2400, gross_weight_kg=Decimal("1800"), cbm=Decimal("16.5"),
    currency="USD", invoice_value=Decimal("32850.00"),
    notes="FCL 20ft Maersk — SS25 Linen", created_by=admin))
ok(f"Shipment1: {shp1.shipment_number} [{shp1.status}] ({'new' if cr else 'existing'})")

# Sales Invoice
si1, cr = SalesInvoice.objects.get_or_create(customer_order=co1, defaults=dict(
    company=co_obj, customer=zara, shipment=shp1,
    invoice_date=d(-15), due_date=d(45),
    currency="USD", notes="FOB Chennai — ZARA-PO-2025-001", created_by=admin))
if cr:
    SalesInvoiceItem.objects.bulk_create([
        SalesInvoiceItem(invoice=si1, description="Peasant Top Linen White S",  quantity=400, unit_price=Decimal("13.50")),
        SalesInvoiceItem(invoice=si1, description="Peasant Top Linen White M",  quantity=500, unit_price=Decimal("13.50")),
        SalesInvoiceItem(invoice=si1, description="Peasant Top Linen White L",  quantity=300, unit_price=Decimal("13.50")),
        SalesInvoiceItem(invoice=si1, description="Wrap Top Linen Ecru S",      quantity=300, unit_price=Decimal("14.00")),
        SalesInvoiceItem(invoice=si1, description="Wrap Top Linen Ecru M",      quantity=350, unit_price=Decimal("14.00")),
        SalesInvoiceItem(invoice=si1, description="Wrap Top Linen Ecru L",      quantity=250, unit_price=Decimal("14.00")),
    ])
si1.refresh_from_db()
ok(f"Sales Invoice SI1: {si1.invoice_number} — {si1.currency} {si1.total_amount} ({'new' if cr else 'existing'})")

# Purchase Invoice
pi1, cr = PurchaseInvoice.objects.get_or_create(factory_order=fo1, defaults=dict(
    company=co_obj, vendor=sree, vendor_invoice_ref="SREE/2025/0042",
    invoice_date=d(-20), due_date=d(10),
    currency="INR", notes="GST 5% included", created_by=admin))
if cr:
    PurchaseInvoiceItem.objects.bulk_create([
        PurchaseInvoiceItem(invoice=pi1, description="Peasant Top S",  quantity=400, unit_price=Decimal("940")),
        PurchaseInvoiceItem(invoice=pi1, description="Peasant Top M",  quantity=500, unit_price=Decimal("940")),
        PurchaseInvoiceItem(invoice=pi1, description="Peasant Top L",  quantity=300, unit_price=Decimal("940")),
        PurchaseInvoiceItem(invoice=pi1, description="Wrap Top S",     quantity=300, unit_price=Decimal("980")),
        PurchaseInvoiceItem(invoice=pi1, description="Wrap Top M",     quantity=350, unit_price=Decimal("980")),
        PurchaseInvoiceItem(invoice=pi1, description="Wrap Top L",     quantity=250, unit_price=Decimal("980")),
    ])
pi1.refresh_from_db()
ok(f"Purchase Invoice PI1: {pi1.invoice_number} — INR {pi1.total_amount} ({'new' if cr else 'existing'})")

# Payments — SI fully paid
if not Payment.objects.filter(sales_invoice=si1).exists():
    Payment.objects.create(company=co_obj, payment_type="received",
        sales_invoice=si1, payment_date=d(-5),
        amount=si1.total_amount, currency="USD",
        payment_method="tt", reference="TT/HDFC/2025/0301",
        notes="Full payment received from Zara via TT", created_by=admin)
    ok(f"Payment IN: USD {si1.total_amount} fully paid")
else: skip("Payment IN: already exists")

if not Payment.objects.filter(purchase_invoice=pi1).exists():
    Payment.objects.create(company=co_obj, payment_type="made",
        purchase_invoice=pi1, payment_date=d(-18),
        amount=pi1.total_amount, currency="INR",
        payment_method="bank_transfer", reference="NEFT/SBI/2025/0288",
        notes="Full payment to Sree Textiles", created_by=admin)
    ok(f"Payment OUT: INR {pi1.total_amount} fully paid")
else: skip("Payment OUT: already exists")


# ══════════════════════════════════════════════════════════════════════════════
# CHAIN 2  —  H&M Jersey Dresses  (IN PRODUCTION)
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== CHAIN 2 — H&M Jersey Dresses (IN PRODUCTION) ===")

# Buyer Inquiry
inq2 = None
if not BuyerInquiry.objects.filter(customer=hm).exists():
    try:
        inq2 = BuyerInquiry.objects.create(
            company=co_obj, customer=hm, brand=brands["H&M"],
            category=cats["Dresses"], inquiry_date=d(-45),
            required_delivery=d(30), destination="Stockholm, Sweden",
            target_fob_price=Decimal("9.75"), currency="EUR",
            description="Jersey midi dresses AW25 — 4 colorways",
            status="confirmed", created_by=admin)
        InquiryItem.objects.bulk_create([
            InquiryItem(inquiry=inq2, style_ref="HM-D01",
                description="Jersey Midi Dress - Black", color="Black",
                size_range="XS-XL", quantity=2000, target_price=Decimal("9.75")),
            InquiryItem(inquiry=inq2, style_ref="HM-D02",
                description="Jersey Midi Dress - Navy", color="Navy",
                size_range="XS-XL", quantity=1500, target_price=Decimal("9.75")),
            InquiryItem(inquiry=inq2, style_ref="HM-D03",
                description="Jersey Midi Dress - Olive", color="Olive",
                size_range="XS-XL", quantity=1000, target_price=Decimal("9.75")),
        ])
        InquiryCostSheet.objects.create(inquiry=inq2,
            fabric_cost=Decimal("3.80"), trims_cost=Decimal("0.50"),
            cm_cost=Decimal("2.20"), washing_cost=Decimal("0.20"),
            testing_cost=Decimal("0.25"), freight_cost=Decimal("0.40"),
            overhead_pct=Decimal("8.00"), margin_pct=Decimal("15.00"),
            currency="EUR", selling_price=Decimal("9.75"))
        for vnd, amt, sel in [(tiruknit, 720, 'selected'), (sree, 760, 'rejected'), (bangwov, 780, 'rejected')]:
            VendorQuotation.objects.create(
                inquiry=inq2, vendor=vnd, rfq_date=d(-40),
                response_date=d(-35), lead_time_days=50,
                currency="INR", unit_quoted=Decimal(amt),
                total_quoted=Decimal(amt * 4500), status=sel)
        ok(f"INQ2: {inq2.inquiry_number} — H&M Jersey Dresses")
    except Exception as e: err("INQ2", e)
else:
    inq2 = BuyerInquiry.objects.filter(customer=hm).first()
    skip(f"INQ2: {inq2.inquiry_number} already exists")

# CO
co2, cr = CustomerOrder.objects.get_or_create(
    customer_po_ref="HM-PO-2025-041",
    defaults=dict(company=co_obj, customer=hm, brand=brands["H&M"],
        category=cats["Dresses"], order_date=d(-38), ship_by_date=d(30),
        status="in_production", currency="EUR",
        notes="Jersey dresses AW25 — 3 colorways", created_by=admin))
if cr:
    CustomerOrderItem.objects.bulk_create([
        CustomerOrderItem(customer_order=co2, style_ref="HM-D01",
            description="Jersey Midi Dress Black XS", color="Black", size="XS", quantity=400, unit_price=Decimal("9.75")),
        CustomerOrderItem(customer_order=co2, style_ref="HM-D01",
            description="Jersey Midi Dress Black S",  color="Black", size="S",  quantity=600, unit_price=Decimal("9.75")),
        CustomerOrderItem(customer_order=co2, style_ref="HM-D01",
            description="Jersey Midi Dress Black M",  color="Black", size="M",  quantity=600, unit_price=Decimal("9.75")),
        CustomerOrderItem(customer_order=co2, style_ref="HM-D01",
            description="Jersey Midi Dress Black L",  color="Black", size="L",  quantity=400, unit_price=Decimal("9.75")),
        CustomerOrderItem(customer_order=co2, style_ref="HM-D02",
            description="Jersey Midi Dress Navy S",   color="Navy",  size="S",  quantity=500, unit_price=Decimal("9.75")),
        CustomerOrderItem(customer_order=co2, style_ref="HM-D02",
            description="Jersey Midi Dress Navy M",   color="Navy",  size="M",  quantity=500, unit_price=Decimal("9.75")),
        CustomerOrderItem(customer_order=co2, style_ref="HM-D02",
            description="Jersey Midi Dress Navy L",   color="Navy",  size="L",  quantity=500, unit_price=Decimal("9.75")),
        CustomerOrderItem(customer_order=co2, style_ref="HM-D03",
            description="Jersey Midi Dress Olive M",  color="Olive", size="M",  quantity=500, unit_price=Decimal("9.75")),
        CustomerOrderItem(customer_order=co2, style_ref="HM-D03",
            description="Jersey Midi Dress Olive L",  color="Olive", size="L",  quantity=500, unit_price=Decimal("9.75")),
    ])
if inq2 and inq2.customer_order is None:
    inq2.customer_order = co2; inq2.save()
ok(f"CO2: {co2.co_number} [{co2.status}] ({'new' if cr else 'existing'})")

# FO
fo2, cr = FactoryOrder.objects.get_or_create(
    customer_order=co2, vendor=tiruknit,
    defaults=dict(company=co_obj, order_date=d(-35),
        ex_factory_date=d(25), status="in_production",
        currency="INR", notes="Jersey dresses — confirm yarn before cutting", created_by=admin))
if cr:
    FactoryOrderItem.objects.bulk_create([
        FactoryOrderItem(factory_order=fo2, style_ref="HM-D01", description="Jersey Midi Dress Black", size="XS", quantity=400, unit_cost=Decimal("720")),
        FactoryOrderItem(factory_order=fo2, style_ref="HM-D01", description="Jersey Midi Dress Black", size="S",  quantity=600, unit_cost=Decimal("720")),
        FactoryOrderItem(factory_order=fo2, style_ref="HM-D01", description="Jersey Midi Dress Black", size="M",  quantity=600, unit_cost=Decimal("720")),
        FactoryOrderItem(factory_order=fo2, style_ref="HM-D01", description="Jersey Midi Dress Black", size="L",  quantity=400, unit_cost=Decimal("720")),
        FactoryOrderItem(factory_order=fo2, style_ref="HM-D02", description="Jersey Midi Dress Navy",  size="S",  quantity=500, unit_cost=Decimal("720")),
        FactoryOrderItem(factory_order=fo2, style_ref="HM-D02", description="Jersey Midi Dress Navy",  size="M",  quantity=500, unit_cost=Decimal("720")),
        FactoryOrderItem(factory_order=fo2, style_ref="HM-D02", description="Jersey Midi Dress Navy",  size="L",  quantity=500, unit_cost=Decimal("720")),
        FactoryOrderItem(factory_order=fo2, style_ref="HM-D03", description="Jersey Midi Dress Olive", size="M",  quantity=500, unit_cost=Decimal("720")),
        FactoryOrderItem(factory_order=fo2, style_ref="HM-D03", description="Jersey Midi Dress Olive", size="L",  quantity=500, unit_cost=Decimal("720")),
    ])
ok(f"FO2: {fo2.fo_number} -> {tiruknit.vendor_name} ({'new' if cr else 'existing'})")

# T&A — fabric done, bulk fabric in-house, rest pending
if not TAMilestone.objects.filter(customer_order=co2).exists():
    for name, planned_off, actual_off, status in [
        ("Fabric Approval",       -35, -35, "completed"),
        ("PP Sample Approval",    -28, -28, "completed"),
        ("Bulk Fabric In-House",  -20, -18, "completed"),
        ("Cutting Start",         -10,  -8, "completed"),
        ("Sewing Complete",         5, None, "in_progress"),
        ("Final Inspection",       18, None, "pending"),
        ("Ex-Factory",             25, None, "pending"),
    ]:
        TAMilestone.objects.create(
            customer_order=co2, milestone_name=name,
            planned_date=d(planned_off),
            actual_date=d(actual_off) if actual_off is not None else None,
            status=status, responsible="BHF Office")
    ok(f"T&A: 7 milestones for {co2.co_number} (sewing in progress)")

# Costing Sheet
CostingSheet.objects.get_or_create(customer_order=co2, defaults=dict(
    currency="EUR", fob_price_per_pc=Decimal("9.75"), total_quantity=5000,
    fabric_cost=Decimal("3.80"), trim_cost=Decimal("0.50"),
    embroidery_print=Decimal("0.00"), washing_finishing=Decimal("0.20"),
    cm_cost=Decimal("2.20"), testing_cost=Decimal("0.25"),
    inspection_cost=Decimal("0.15"), freight_cost=Decimal("0.40"),
    other_cost=Decimal("0.10"), commission_pct=Decimal("5.00"),
    notes="H&M Jersey Dresses AW25"))
ok(f"Costing sheet CO2 done")


# ══════════════════════════════════════════════════════════════════════════════
# CHAIN 3  —  Primark Chino Trousers  (PRODUCTION DELAYED)
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== CHAIN 3 — Primark Chino Trousers (DELAYED) ===")

inq3 = None
if not BuyerInquiry.objects.filter(customer=primark).exists():
    try:
        inq3 = BuyerInquiry.objects.create(
            company=co_obj, customer=primark, brand=brands["Primark"],
            category=cats["Bottoms / Trousers"], inquiry_date=d(-55),
            required_delivery=d(15), destination="Dublin, Ireland",
            target_fob_price=Decimal("7.50"), currency="GBP",
            description="Men's slim-fit stretch chino trousers SS25",
            status="confirmed", created_by=admin)
        InquiryItem.objects.bulk_create([
            InquiryItem(inquiry=inq3, style_ref="PK-CH01",
                description="Slim Chino - Khaki", color="Khaki",
                size_range="28-38", quantity=3000, target_price=Decimal("7.50")),
            InquiryItem(inquiry=inq3, style_ref="PK-CH02",
                description="Slim Chino - Olive", color="Olive",
                size_range="28-38", quantity=2000, target_price=Decimal("7.50")),
        ])
        InquiryCostSheet.objects.create(inquiry=inq3,
            fabric_cost=Decimal("2.80"), trims_cost=Decimal("0.60"),
            cm_cost=Decimal("2.10"), washing_cost=Decimal("0.50"),
            testing_cost=Decimal("0.20"), freight_cost=Decimal("0.35"),
            overhead_pct=Decimal("8.00"), margin_pct=Decimal("12.00"),
            currency="GBP", selling_price=Decimal("7.50"))
        for vnd, amt, sel in [(bangwov, 580, 'selected'), (chennai, 610, 'rejected')]:
            VendorQuotation.objects.create(
                inquiry=inq3, vendor=vnd, rfq_date=d(-50),
                response_date=d(-45), lead_time_days=60,
                currency="INR", unit_quoted=Decimal(amt),
                total_quoted=Decimal(amt * 5000), status=sel)
        ok(f"INQ3: {inq3.inquiry_number} — Primark Chino")
    except Exception as e: err("INQ3", e)
else:
    inq3 = BuyerInquiry.objects.filter(customer=primark).first()
    skip(f"INQ3 already exists: {inq3.inquiry_number}")

co3, cr = CustomerOrder.objects.get_or_create(
    customer_po_ref="PRM-PO-2025-018",
    defaults=dict(company=co_obj, customer=primark, brand=brands["Primark"],
        category=cats["Bottoms / Trousers"], order_date=d(-48), ship_by_date=d(15),
        status="in_production", currency="GBP",
        notes="DELAYED — fabric arrived late, cutting behind by 12 days", created_by=admin))
if cr:
    CustomerOrderItem.objects.bulk_create([
        CustomerOrderItem(customer_order=co3, style_ref="PK-CH01", description="Slim Chino Khaki 30", color="Khaki", size="30", quantity=600, unit_price=Decimal("7.50")),
        CustomerOrderItem(customer_order=co3, style_ref="PK-CH01", description="Slim Chino Khaki 32", color="Khaki", size="32", quantity=800, unit_price=Decimal("7.50")),
        CustomerOrderItem(customer_order=co3, style_ref="PK-CH01", description="Slim Chino Khaki 34", color="Khaki", size="34", quantity=800, unit_price=Decimal("7.50")),
        CustomerOrderItem(customer_order=co3, style_ref="PK-CH01", description="Slim Chino Khaki 36", color="Khaki", size="36", quantity=500, unit_price=Decimal("7.50")),
        CustomerOrderItem(customer_order=co3, style_ref="PK-CH01", description="Slim Chino Khaki 38", color="Khaki", size="38", quantity=300, unit_price=Decimal("7.50")),
        CustomerOrderItem(customer_order=co3, style_ref="PK-CH02", description="Slim Chino Olive 32",  color="Olive", size="32", quantity=600, unit_price=Decimal("7.50")),
        CustomerOrderItem(customer_order=co3, style_ref="PK-CH02", description="Slim Chino Olive 34",  color="Olive", size="34", quantity=700, unit_price=Decimal("7.50")),
        CustomerOrderItem(customer_order=co3, style_ref="PK-CH02", description="Slim Chino Olive 36",  color="Olive", size="36", quantity=500, unit_price=Decimal("7.50")),
        CustomerOrderItem(customer_order=co3, style_ref="PK-CH02", description="Slim Chino Olive 38",  color="Olive", size="38", quantity=200, unit_price=Decimal("7.50")),
    ])
if inq3 and inq3.customer_order is None:
    inq3.customer_order = co3; inq3.save()
ok(f"CO3: {co3.co_number} [{co3.status}] ({'new' if cr else 'existing'})")

fo3, cr = FactoryOrder.objects.get_or_create(
    customer_order=co3, vendor=bangwov,
    defaults=dict(company=co_obj, order_date=d(-45),
        ex_factory_date=d(12), status="in_production",
        currency="INR", notes="DELAYED — bulk fabric shortage", created_by=admin))
if cr:
    FactoryOrderItem.objects.bulk_create([
        FactoryOrderItem(factory_order=fo3, style_ref="PK-CH01", description="Slim Chino Khaki", size="30", quantity=600, unit_cost=Decimal("580")),
        FactoryOrderItem(factory_order=fo3, style_ref="PK-CH01", description="Slim Chino Khaki", size="32", quantity=800, unit_cost=Decimal("580")),
        FactoryOrderItem(factory_order=fo3, style_ref="PK-CH01", description="Slim Chino Khaki", size="34", quantity=800, unit_cost=Decimal("580")),
        FactoryOrderItem(factory_order=fo3, style_ref="PK-CH02", description="Slim Chino Olive", size="32", quantity=600, unit_cost=Decimal("580")),
        FactoryOrderItem(factory_order=fo3, style_ref="PK-CH02", description="Slim Chino Olive", size="34", quantity=700, unit_cost=Decimal("580")),
    ])
ok(f"FO3: {fo3.fo_number} -> {bangwov.vendor_name} ({'new' if cr else 'existing'})")

# T&A — delayed (overdue milestones)
if not TAMilestone.objects.filter(customer_order=co3).exists():
    for name, planned_off, actual_off, status in [
        ("Fabric Approval",       -45, -45, "completed"),
        ("PP Sample Approval",    -38, -38, "completed"),
        ("Bulk Fabric In-House",  -30, -18, "completed"),   # 12 days late
        ("Cutting Start",         -22,  -8, "completed"),   # 14 days late
        ("Sewing Complete",        -8, None, "in_progress"),# overdue
        ("Final Inspection",        2, None, "pending"),    # will be late
        ("Ex-Factory",             12, None, "pending"),
    ]:
        TAMilestone.objects.create(
            customer_order=co3, milestone_name=name,
            planned_date=d(planned_off),
            actual_date=d(actual_off) if actual_off is not None else None,
            status=status, responsible="BHF Office")
    ok(f"T&A: 7 milestones for {co3.co_number} (DELAYED — sewing overdue by 8 days)")

CostingSheet.objects.get_or_create(customer_order=co3, defaults=dict(
    currency="GBP", fob_price_per_pc=Decimal("7.50"), total_quantity=5000,
    fabric_cost=Decimal("2.80"), trim_cost=Decimal("0.60"),
    embroidery_print=Decimal("0.00"), washing_finishing=Decimal("0.50"),
    cm_cost=Decimal("2.10"), testing_cost=Decimal("0.20"),
    inspection_cost=Decimal("0.15"), freight_cost=Decimal("0.35"),
    other_cost=Decimal("0.10"), commission_pct=Decimal("5.00"),
    notes="Primark Chinos SS25"))
ok("Costing sheet CO3 done")


# ══════════════════════════════════════════════════════════════════════════════
# CHAIN 4  —  M&S Knitwear Sweaters  (QUOTED TO BUYER)
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== CHAIN 4 — M&S Knitwear Sweaters (QUOTED) ===")

inq4 = None
if not BuyerInquiry.objects.filter(customer=ms).exists():
    try:
        inq4 = BuyerInquiry.objects.create(
            company=co_obj, customer=ms, brand=brands["M&S Collection"],
            category=cats["Knitwear"], inquiry_date=d(-20),
            required_delivery=d(75), destination="London, UK",
            target_fob_price=Decimal("16.00"), currency="GBP",
            description="Women's fine knit crew-neck sweaters AW25 — 3 colours",
            status="quoted", created_by=admin)
        InquiryItem.objects.bulk_create([
            InquiryItem(inquiry=inq4, style_ref="MS-KN01",
                description="Fine Knit Sweater - Camel", color="Camel",
                size_range="XS-XL", quantity=1200, target_price=Decimal("16.00")),
            InquiryItem(inquiry=inq4, style_ref="MS-KN02",
                description="Fine Knit Sweater - Burgundy", color="Burgundy",
                size_range="XS-XL", quantity=1000, target_price=Decimal("16.00")),
            InquiryItem(inquiry=inq4, style_ref="MS-KN03",
                description="Fine Knit Sweater - Ivory", color="Ivory",
                size_range="XS-XL", quantity=800, target_price=Decimal("16.00")),
        ])
        InquiryCostSheet.objects.create(inquiry=inq4,
            fabric_cost=Decimal("7.20"), trims_cost=Decimal("0.60"),
            cm_cost=Decimal("3.80"), washing_cost=Decimal("0.30"),
            testing_cost=Decimal("0.40"), freight_cost=Decimal("0.55"),
            overhead_pct=Decimal("8.00"), margin_pct=Decimal("20.00"),
            currency="GBP", selling_price=Decimal("16.50"))
        for vnd, amt, sel in [
            (ludhiana, 1150, 'selected'),
            (tiruknit, 1220, 'rejected'),
            (sree,     1280, 'rejected'),
        ]:
            VendorQuotation.objects.create(
                inquiry=inq4, vendor=vnd, rfq_date=d(-15),
                response_date=d(-10), lead_time_days=65,
                currency="INR", unit_quoted=Decimal(amt),
                total_quoted=Decimal(amt * 3000), status=sel)
        ok(f"INQ4: {inq4.inquiry_number} — M&S Knitwear (quoted, 3 vendor quotes)")
    except Exception as e: err("INQ4", e)
else:
    inq4 = BuyerInquiry.objects.filter(customer=ms).first()
    skip(f"INQ4 already exists: {inq4.inquiry_number}")


# ══════════════════════════════════════════════════════════════════════════════
# CHAIN 5  —  Next Outerwear Jackets  (RFQ SENT)
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== CHAIN 5 — Next Outerwear Jackets (RFQ SENT) ===")

inq5 = None
if not BuyerInquiry.objects.filter(customer=next_).exists():
    try:
        inq5 = BuyerInquiry.objects.create(
            company=co_obj, customer=next_, brand=brands["Next"],
            category=cats["Outerwear"], inquiry_date=d(-8),
            required_delivery=d(90), destination="Leicester, UK",
            target_fob_price=Decimal("28.00"), currency="GBP",
            description="Padded quilted jacket AW26 — unisex, 2 colourways",
            status="rfq_sent", created_by=admin)
        InquiryItem.objects.bulk_create([
            InquiryItem(inquiry=inq5, style_ref="NX-OW01",
                description="Padded Quilted Jacket - Black", color="Black",
                size_range="XS-XXL", quantity=1500, target_price=Decimal("28.00")),
            InquiryItem(inquiry=inq5, style_ref="NX-OW02",
                description="Padded Quilted Jacket - Olive", color="Olive",
                size_range="XS-XXL", quantity=1000, target_price=Decimal("28.00")),
        ])
        InquiryCostSheet.objects.create(inquiry=inq5,
            fabric_cost=Decimal("10.50"), trims_cost=Decimal("1.20"),
            cm_cost=Decimal("5.50"), washing_cost=Decimal("0.00"),
            testing_cost=Decimal("0.50"), freight_cost=Decimal("0.80"),
            overhead_pct=Decimal("8.00"), margin_pct=Decimal("22.00"),
            currency="GBP", selling_price=Decimal("28.00"))
        # RFQ sent, awaiting responses
        for vnd, amt, sel in [
            (bangwov, 1850, 'sent'),
            (chennai, 0, 'sent'),
        ]:
            VendorQuotation.objects.create(
                inquiry=inq5, vendor=vnd, rfq_date=d(-6),
                response_date=None, lead_time_days=None,
                currency="INR", unit_quoted=Decimal(amt),
                total_quoted=Decimal("0"), status=sel,
                notes="Awaiting quote response")
        ok(f"INQ5: {inq5.inquiry_number} — Next Outerwear (rfq_sent, awaiting responses)")
    except Exception as e: err("INQ5", e)
else:
    inq5 = BuyerInquiry.objects.filter(customer=next_).first()
    skip(f"INQ5 already exists: {inq5.inquiry_number}")


# ══════════════════════════════════════════════════════════════════════════════
# CHAIN 6  —  Target Summer Tops  (OPEN INQUIRY)
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== CHAIN 6 — Target Summer Tops (NEW OPEN INQUIRY) ===")

if not BuyerInquiry.objects.filter(customer=target).exists():
    try:
        inq6 = BuyerInquiry.objects.create(
            company=co_obj, customer=target, brand=brands["H&M"],
            category=cats["Woven Tops"], inquiry_date=d(0),
            required_delivery=d(120), destination="Minneapolis, USA",
            target_fob_price=Decimal("11.00"), currency="USD",
            description="Women's woven summer top — 5 prints, target price USD 11 FOB",
            status="open", created_by=admin)
        InquiryItem.objects.bulk_create([
            InquiryItem(inquiry=inq6, style_ref="TG-ST01",
                description="Woven Summer Top - Floral Print", color="Multi",
                size_range="XS-XL", quantity=2500, target_price=Decimal("11.00")),
            InquiryItem(inquiry=inq6, style_ref="TG-ST02",
                description="Woven Summer Top - Stripe", color="Blue/White",
                size_range="XS-XL", quantity=2000, target_price=Decimal("10.50")),
        ])
        ok(f"INQ6: {inq6.inquiry_number} — Target Summer Tops (open, just received)")
    except Exception as e: err("INQ6", e)
else:
    skip("INQ6: Target inquiry already exists")


# ══════════════════════════════════════════════════════════════════════════════
# PD REQUESTS (linked to COs)
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== PD REQUESTS ===")

pd_data = [
    dict(title="Women's Linen Shirt SS25 — Zara", customer=zara, brand=brands["Zara"],
         category=cats["Woven Tops"], offset=-75, req_offset=-20, status="approved", co=co1),
    dict(title="H&M Jersey Dress AW25", customer=hm, brand=brands["H&M"],
         category=cats["Dresses"], offset=-45, req_offset=20, status="sample_approved", co=co2),
    dict(title="Primark Slim Chino SS25", customer=primark, brand=brands["Primark"],
         category=cats["Bottoms / Trousers"], offset=-55, req_offset=10, status="approved", co=co3),
    dict(title="M&S Fine Knit Sweater AW25", customer=ms, brand=brands["M&S Collection"],
         category=cats["Knitwear"], offset=-20, req_offset=60, status="sample_in_progress", co=None),
    dict(title="Next Quilted Jacket AW26", customer=next_, brand=brands["Next"],
         category=cats["Outerwear"], offset=-8, req_offset=80, status="open", co=None),
]

for p in pd_data:
    co_link = p.pop('co')
    off     = p.pop('offset')
    req_off = p.pop('req_offset')
    if not PDRequest.objects.filter(title=p['title']).exists():
        try:
            pd = PDRequest.objects.create(
                company=co_obj, request_date=d(off), required_by=d(req_off),
                status=p['status'], created_by=admin,
                notes=f"PD for {p['title']}",
                **{k: v for k, v in p.items() if k != 'status'})
            if co_link:
                co_link.pd_request = pd; co_link.save()
            va = PDVendorAssignment.objects.create(
                pd_request=pd, vendor=sree,
                assigned_date=d(off), status="accepted",
                sample_dev_cost=Decimal("300"), currency="INR",
                ta_notes="Assigned for proto development")
            if p['status'] in ('approved', 'sample_approved'):
                PDSampleShipment.objects.create(
                    pd_request=pd, vendor_assignment=va,
                    courier_name="DHL", tracking_number=f"DHL{abs(off):06d}",
                    shipment_date=d(off+15), received_date=d(off+18),
                    notes="Proto samples received and approved")
            ok(f"PD: {pd.pd_number} — {pd.title} [{pd.status}]")
        except Exception as e: err(f"PD {p['title']}", e)
    else:
        skip(f"PD: {p['title']} already exists")


# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== SUMMARY ===")
from order_management.models import CustomerOrder, FactoryOrder, TAMilestone
from shipment.models import PreShipmentInspection, Shipment, CostingSheet
from bh_finance.models import SalesInvoice, PurchaseInvoice, Payment
from product_development.models import PDRequest

print(f"  Customers        : {Customer.objects.count()}")
print(f"  Vendors          : {Vendor.objects.count()}")
print(f"  Brands           : {Brand.objects.count()}")
print(f"  Categories       : {Category.objects.count()}")
print(f"  Buyer Inquiries  : {BuyerInquiry.objects.count()}")
print(f"  PD Requests      : {PDRequest.objects.count()}")
print(f"  Customer Orders  : {CustomerOrder.objects.count()}")
print(f"  Factory Orders   : {FactoryOrder.objects.count()}")
print(f"  T&A Milestones   : {TAMilestone.objects.count()}")
print(f"  Costing Sheets   : {CostingSheet.objects.count()}")
print(f"  PSI Records      : {PreShipmentInspection.objects.count()}")
print(f"  Shipments        : {Shipment.objects.count()}")
print(f"  Sales Invoices   : {SalesInvoice.objects.count()}")
print(f"  Purchase Invoices: {PurchaseInvoice.objects.count()}")
print(f"  Payments         : {Payment.objects.count()}")

if errors:
    print(f"\n  ERRORS ({len(errors)}):")
    for e in errors: print(f"    [ERR] {e}")
    sys.exit(1)
else:
    print("\n  All done! 6 complete buyer chains seeded.")
