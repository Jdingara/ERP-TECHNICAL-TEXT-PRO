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

def _fix_si(inv):
    """Recalculate SalesInvoice totals — bulk_create bypasses save() so amounts stay 0."""
    from bh_finance.models import SalesInvoice, SalesInvoiceItem
    for item in inv.items.all():
        correct = float(item.quantity) * float(item.unit_price)
        if float(item.amount) != correct:
            SalesInvoiceItem.objects.filter(pk=item.pk).update(amount=correct)
    subtotal = sum(float(i.quantity) * float(i.unit_price) for i in inv.items.all())
    SalesInvoice.objects.filter(pk=inv.pk).update(subtotal=subtotal, total_amount=subtotal)
    inv.refresh_from_db()

def _fix_pi(inv):
    """Recalculate PurchaseInvoice totals — bulk_create bypasses save() so amounts stay 0."""
    from bh_finance.models import PurchaseInvoice, PurchaseInvoiceItem
    for item in inv.items.all():
        correct = float(item.quantity) * float(item.unit_price)
        if float(item.amount) != correct:
            PurchaseInvoiceItem.objects.filter(pk=item.pk).update(amount=correct)
    subtotal = sum(float(i.quantity) * float(i.unit_price) for i in inv.items.all())
    PurchaseInvoice.objects.filter(pk=inv.pk).update(subtotal=subtotal, total_amount=subtotal)
    inv.refresh_from_db()


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
        ("Color / Shade",   "Within tolerance",                 "pass"),
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
_fix_si(si1)
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
_fix_pi(pi1)
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
# FIX EXISTING DATA ISSUES
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== FIX EXISTING DATA ===")

# Fix CO1 status to delivered
if co1.status != 'delivered':
    co1.status = 'delivered'; co1.save()
    ok(f"CO1 {co1.co_number}: status -> delivered")

# Fix Shipment SHP-2026-0001 to delivered
shp1.refresh_from_db()
if shp1.status != 'delivered':
    shp1.status = 'delivered'
    shp1.actual_arrival = d(-5)
    shp1.save()
    ok(f"Shipment {shp1.shipment_number}: status -> delivered")

# Fix payment method "tt" -> "bank_transfer"
from bh_finance.models import Payment as Pay
fixed = Pay.objects.filter(payment_method='tt').update(payment_method='bank_transfer')
ok(f"Fixed {fixed} payments: tt -> bank_transfer")

# Fix SI1 status to paid
si1.refresh_from_db()
if si1.amount_paid >= si1.total_amount and si1.status != 'paid':
    si1.status = 'paid'; si1.save()
    ok(f"SI1 {si1.invoice_number}: status -> paid")

# Fix PI1 status to paid
pi1.refresh_from_db()
if pi1.amount_paid >= pi1.total_amount and pi1.status != 'paid':
    pi1.status = 'paid'; pi1.save()
    ok(f"PI1 {pi1.invoice_number}: status -> paid")


# ══════════════════════════════════════════════════════════════════════════════
# CHAIN 7  —  Zara Cotton Polo T-shirts  (DELIVERED & FULLY PAID — historical)
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== CHAIN 7 — Zara Cotton Polo T-shirts (DELIVERED & PAID) ===")

inq7 = None
if not BuyerInquiry.objects.filter(description__icontains="Cotton Polo").exists():
    try:
        inq7 = BuyerInquiry.objects.create(
            company=co_obj, customer=zara, brand=brands["Zara"],
            category=cats["Knitwear"], inquiry_date=d(-90),
            required_delivery=d(-25), destination="Madrid, Spain",
            target_fob_price=Decimal("6.80"), currency="USD",
            description="Cotton Polo T-shirts AW25 — 3 colours unisex",
            status="confirmed", created_by=admin)
        InquiryItem.objects.bulk_create([
            InquiryItem(inquiry=inq7, style_ref="ZR-PT01",
                description="Polo Tee - White", color="White",
                size_range="XS-XL", quantity=3000, target_price=Decimal("6.80")),
            InquiryItem(inquiry=inq7, style_ref="ZR-PT02",
                description="Polo Tee - Navy", color="Navy",
                size_range="XS-XL", quantity=2500, target_price=Decimal("6.80")),
        ])
        InquiryCostSheet.objects.create(inquiry=inq7,
            fabric_cost=Decimal("2.60"), trims_cost=Decimal("0.30"),
            cm_cost=Decimal("1.80"), washing_cost=Decimal("0.20"),
            testing_cost=Decimal("0.15"), freight_cost=Decimal("0.30"),
            overhead_pct=Decimal("8.00"), margin_pct=Decimal("15.00"),
            currency="USD", selling_price=Decimal("6.80"))
        for vnd, amt, sel in [(sree, 520, 'selected'), (tiruknit, 540, 'rejected')]:
            VendorQuotation.objects.create(
                inquiry=inq7, vendor=vnd, rfq_date=d(-85),
                response_date=d(-80), lead_time_days=45,
                currency="INR", unit_quoted=Decimal(amt),
                total_quoted=Decimal(amt * 5500), status=sel)
        ok(f"INQ7: {inq7.inquiry_number} — Zara Cotton Polo")
    except Exception as e: err("INQ7", e)
else:
    inq7 = BuyerInquiry.objects.filter(description__icontains="Cotton Polo").first()
    skip(f"INQ7 already exists: {inq7.inquiry_number if inq7 else 'none'}")

co7, cr = CustomerOrder.objects.get_or_create(
    customer_po_ref="ZARA-PO-2025-088",
    defaults=dict(company=co_obj, customer=zara, brand=brands["Zara"],
        category=cats["Knitwear"], order_date=d(-82), ship_by_date=d(-28),
        status="delivered", currency="USD",
        notes="Cotton polo tees AW25 — FOB Madrid", created_by=admin))
if cr:
    CustomerOrderItem.objects.bulk_create([
        CustomerOrderItem(customer_order=co7, style_ref="ZR-PT01", description="Polo Tee White S",  color="White", size="S",  quantity=800,  unit_price=Decimal("6.80")),
        CustomerOrderItem(customer_order=co7, style_ref="ZR-PT01", description="Polo Tee White M",  color="White", size="M",  quantity=1000, unit_price=Decimal("6.80")),
        CustomerOrderItem(customer_order=co7, style_ref="ZR-PT01", description="Polo Tee White L",  color="White", size="L",  quantity=800,  unit_price=Decimal("6.80")),
        CustomerOrderItem(customer_order=co7, style_ref="ZR-PT01", description="Polo Tee White XL", color="White", size="XL", quantity=400,  unit_price=Decimal("6.80")),
        CustomerOrderItem(customer_order=co7, style_ref="ZR-PT02", description="Polo Tee Navy S",   color="Navy",  size="S",  quantity=600,  unit_price=Decimal("6.80")),
        CustomerOrderItem(customer_order=co7, style_ref="ZR-PT02", description="Polo Tee Navy M",   color="Navy",  size="M",  quantity=900,  unit_price=Decimal("6.80")),
        CustomerOrderItem(customer_order=co7, style_ref="ZR-PT02", description="Polo Tee Navy L",   color="Navy",  size="L",  quantity=700,  unit_price=Decimal("6.80")),
        CustomerOrderItem(customer_order=co7, style_ref="ZR-PT02", description="Polo Tee Navy XL",  color="Navy",  size="XL", quantity=300,  unit_price=Decimal("6.80")),
    ])
if inq7 and not inq7.customer_order:
    inq7.customer_order = co7; inq7.save()
ok(f"CO7: {co7.co_number} [{co7.status}] ({'new' if cr else 'existing'})")

fo7, cr = FactoryOrder.objects.get_or_create(
    customer_order=co7, vendor=sree,
    defaults=dict(company=co_obj, order_date=d(-80), ex_factory_date=d(-30),
        status="shipped", currency="INR", notes="Polo tees — single jersey knit", created_by=admin))
if cr:
    FactoryOrderItem.objects.bulk_create([
        FactoryOrderItem(factory_order=fo7, style_ref="ZR-PT01", description="Polo Tee White", size="S",  quantity=800,  unit_cost=Decimal("520")),
        FactoryOrderItem(factory_order=fo7, style_ref="ZR-PT01", description="Polo Tee White", size="M",  quantity=1000, unit_cost=Decimal("520")),
        FactoryOrderItem(factory_order=fo7, style_ref="ZR-PT01", description="Polo Tee White", size="L",  quantity=800,  unit_cost=Decimal("520")),
        FactoryOrderItem(factory_order=fo7, style_ref="ZR-PT02", description="Polo Tee Navy",  size="M",  quantity=900,  unit_cost=Decimal("520")),
        FactoryOrderItem(factory_order=fo7, style_ref="ZR-PT02", description="Polo Tee Navy",  size="L",  quantity=700,  unit_cost=Decimal("520")),
    ])
ok(f"FO7: {fo7.fo_number} -> {sree.vendor_name} ({'new' if cr else 'existing'})")

if not TAMilestone.objects.filter(customer_order=co7).exists():
    for name, po, ao in [
        ("Fabric Approval",      -80, -80), ("PP Sample Approval", -73, -73),
        ("Bulk Fabric In-House", -66, -64), ("Cutting Start",       -55, -54),
        ("Sewing Complete",      -45, -44), ("Final Inspection",    -38, -36),
        ("Ex-Factory",           -30, -30),
    ]:
        TAMilestone.objects.create(customer_order=co7, milestone_name=name,
            planned_date=d(po), actual_date=d(ao), status="completed", responsible="BHF Office")
    ok(f"T&A CO7: 7 milestones all completed")

CostingSheet.objects.get_or_create(customer_order=co7, defaults=dict(
    currency="USD", fob_price_per_pc=Decimal("6.80"), total_quantity=5500,
    fabric_cost=Decimal("2.60"), trim_cost=Decimal("0.30"), embroidery_print=Decimal("0.00"),
    washing_finishing=Decimal("0.20"), cm_cost=Decimal("1.80"), testing_cost=Decimal("0.15"),
    inspection_cost=Decimal("0.10"), freight_cost=Decimal("0.30"), other_cost=Decimal("0.10"),
    commission_pct=Decimal("5.00"), notes="Zara Polo Tees AW25"))

psi7, cr = PreShipmentInspection.objects.get_or_create(customer_order=co7, defaults=dict(
    company=co_obj, factory_order=fo7,
    inspection_date=d(-35), inspector_name="SGS India",
    inspection_agency="SGS", result="pass",
    quantity_inspected=5500, quantity_passed=5500, aql_level="2.5",
    critical_defects=0, major_defects=0, minor_defects=8,
    remarks="All items pass. Minor pilling on sleeve — within tolerance.",
    created_by=admin))
ok(f"PSI7: {psi7.psi_number} -> {psi7.result} ({'new' if cr else 'existing'})")
if cr:
    for i, (sec, desc, res) in enumerate([
        ("Measurements","Dimensions per spec sheet","pass"),
        ("Fabric","No holes or defects","pass"),
        ("Color","Lab dip match","pass"),
        ("Stitching","SPI correct","pass"),
        ("Packing","Polybag + carton OK","pass"),
        ("Labels","Care + size labels correct","pass"),
    ], 1): PSIChecklistItem.objects.create(psi=psi7, section=sec, description=desc, result=res, sort_order=i)

shp7, cr = Shipment.objects.get_or_create(customer_order=co7, defaults=dict(
    company=co_obj, factory_order=fo7, psi=psi7,
    mode="sea", status="delivered",
    port_of_loading="Chennai", port_of_discharge="Algeciras",
    etd=d(-32), eta=d(-8), actual_departure=d(-31), actual_arrival=d(-6),
    bl_number="COSU2025009876", container_number="TCKU8765432",
    total_cartons=220, total_qty=5500, gross_weight_kg=Decimal("3850"),
    cbm=Decimal("31.20"), currency="USD", invoice_value=Decimal("37400"),
    notes="FCL 40ft — CMA CGM — Polo tees", created_by=admin))
ok(f"Shipment7: {shp7.shipment_number} [{shp7.status}] ({'new' if cr else 'existing'})")

si7, cr = SalesInvoice.objects.get_or_create(customer_order=co7, defaults=dict(
    company=co_obj, customer=zara, shipment=shp7,
    invoice_date=d(-30), due_date=d(30), currency="USD",
    notes="FOB Chennai — ZARA-PO-2025-088", created_by=admin))
if cr:
    SalesInvoiceItem.objects.bulk_create([
        SalesInvoiceItem(invoice=si7, description="Polo Tee White (S-XL)", quantity=3000, unit_price=Decimal("6.80")),
        SalesInvoiceItem(invoice=si7, description="Polo Tee Navy (S-XL)",  quantity=2500, unit_price=Decimal("6.80")),
    ])
_fix_si(si7)
SalesInvoice.objects.filter(pk=si7.pk).update(status='paid')
si7.refresh_from_db()
ok(f"SI7: {si7.invoice_number} — USD {si7.total_amount} ({'new' if cr else 'existing'})")

pi7, cr = PurchaseInvoice.objects.get_or_create(factory_order=fo7, defaults=dict(
    company=co_obj, vendor=sree, vendor_invoice_ref="SREE/2025/0088",
    invoice_date=d(-35), due_date=d(-5), currency="INR",
    notes="GST 5%", created_by=admin))
if cr:
    PurchaseInvoiceItem.objects.bulk_create([
        PurchaseInvoiceItem(invoice=pi7, description="Polo Tee White", quantity=3000, unit_price=Decimal("520")),
        PurchaseInvoiceItem(invoice=pi7, description="Polo Tee Navy",  quantity=2500, unit_price=Decimal("520")),
    ])
_fix_pi(pi7)
PurchaseInvoice.objects.filter(pk=pi7.pk).update(status='paid')
pi7.refresh_from_db()
ok(f"PI7: {pi7.invoice_number} — INR {pi7.total_amount} ({'new' if cr else 'existing'})")

if not Payment.objects.filter(sales_invoice=si7).exists():
    si7.refresh_from_db()
    Payment.objects.create(company=co_obj, payment_type="received",
        sales_invoice=si7, payment_date=d(-10), amount=si7.total_amount, currency="USD",
        payment_method="bank_transfer", reference="TT/CITI/2025/0488",
        notes="Full TT payment from Zara — Polo tees", created_by=admin)
    ok(f"Payment IN7: USD {si7.total_amount} fully paid")

if not Payment.objects.filter(purchase_invoice=pi7).exists():
    pi7.refresh_from_db()
    Payment.objects.create(company=co_obj, payment_type="made",
        purchase_invoice=pi7, payment_date=d(-28), amount=pi7.total_amount, currency="INR",
        payment_method="bank_transfer", reference="NEFT/HDFC/2025/0772",
        notes="Full payment to Sree Textiles — Polo tees", created_by=admin)
    ok(f"Payment OUT7: INR {pi7.total_amount} fully paid")


# ══════════════════════════════════════════════════════════════════════════════
# CHAIN 8  —  H&M Kids Basics T-shirts  (LOADED — vessel departed)
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== CHAIN 8 — H&M Kids Basics T-shirts (LOADED) ===")

inq8 = None
if not BuyerInquiry.objects.filter(description__icontains="Kids Basics").exists():
    try:
        inq8 = BuyerInquiry.objects.create(
            company=co_obj, customer=hm, brand=brands["H&M"],
            category=cats["Kids Wear"], inquiry_date=d(-55),
            required_delivery=d(5), destination="Hamburg, Germany",
            target_fob_price=Decimal("4.50"), currency="EUR",
            description="H&M Kids Basics T-shirts SS25 — 4 colours",
            status="confirmed", created_by=admin)
        InquiryItem.objects.bulk_create([
            InquiryItem(inquiry=inq8, style_ref="HM-KT01",
                description="Kids Tee - White", color="White",
                size_range="2Y-14Y", quantity=4000, target_price=Decimal("4.50")),
            InquiryItem(inquiry=inq8, style_ref="HM-KT02",
                description="Kids Tee - Blue", color="Blue",
                size_range="2Y-14Y", quantity=3000, target_price=Decimal("4.50")),
        ])
        InquiryCostSheet.objects.create(inquiry=inq8,
            fabric_cost=Decimal("1.70"), trims_cost=Decimal("0.20"),
            cm_cost=Decimal("1.20"), washing_cost=Decimal("0.10"),
            testing_cost=Decimal("0.10"), freight_cost=Decimal("0.25"),
            overhead_pct=Decimal("8.00"), margin_pct=Decimal("12.00"),
            currency="EUR", selling_price=Decimal("4.50"))
        for vnd, amt, sel in [(tiruknit, 340, 'selected'), (sree, 360, 'rejected')]:
            VendorQuotation.objects.create(
                inquiry=inq8, vendor=vnd, rfq_date=d(-50),
                response_date=d(-46), lead_time_days=45,
                currency="INR", unit_quoted=Decimal(amt),
                total_quoted=Decimal(amt * 7000), status=sel)
        ok(f"INQ8: {inq8.inquiry_number} — H&M Kids Tees")
    except Exception as e: err("INQ8", e)
else:
    inq8 = BuyerInquiry.objects.filter(description__icontains="Kids Basics").first()
    skip(f"INQ8 already exists")

co8, cr = CustomerOrder.objects.get_or_create(
    customer_po_ref="HM-PO-2025-109",
    defaults=dict(company=co_obj, customer=hm, brand=brands["H&M"],
        category=cats["Kids Wear"], order_date=d(-48), ship_by_date=d(5),
        status="shipped", currency="EUR",
        notes="Kids basics SS25 — 7000 pcs 4 colours", created_by=admin))
if cr:
    CustomerOrderItem.objects.bulk_create([
        CustomerOrderItem(customer_order=co8, style_ref="HM-KT01", description="Kids Tee White 2Y-6Y",  color="White", size="2Y-6Y",  quantity=1200, unit_price=Decimal("4.50")),
        CustomerOrderItem(customer_order=co8, style_ref="HM-KT01", description="Kids Tee White 8Y-14Y", color="White", size="8Y-14Y", quantity=1600, unit_price=Decimal("4.50")),
        CustomerOrderItem(customer_order=co8, style_ref="HM-KT01", description="Kids Tee White Unisex", color="White", size="Unisex", quantity=1200, unit_price=Decimal("4.50")),
        CustomerOrderItem(customer_order=co8, style_ref="HM-KT02", description="Kids Tee Blue 2Y-6Y",   color="Blue",  size="2Y-6Y",  quantity=1000, unit_price=Decimal("4.50")),
        CustomerOrderItem(customer_order=co8, style_ref="HM-KT02", description="Kids Tee Blue 8Y-14Y",  color="Blue",  size="8Y-14Y", quantity=1200, unit_price=Decimal("4.50")),
        CustomerOrderItem(customer_order=co8, style_ref="HM-KT02", description="Kids Tee Blue Unisex",  color="Blue",  size="Unisex", quantity=800,  unit_price=Decimal("4.50")),
    ])
if inq8 and not inq8.customer_order:
    inq8.customer_order = co8; inq8.save()
ok(f"CO8: {co8.co_number} [{co8.status}] ({'new' if cr else 'existing'})")

fo8, cr = FactoryOrder.objects.get_or_create(
    customer_order=co8, vendor=tiruknit,
    defaults=dict(company=co_obj, order_date=d(-45), ex_factory_date=d(-8),
        status="shipped", currency="INR", notes="Kids tees — 100% cotton single jersey", created_by=admin))
if cr:
    FactoryOrderItem.objects.bulk_create([
        FactoryOrderItem(factory_order=fo8, style_ref="HM-KT01", description="Kids Tee White", size="2Y-6Y",  quantity=1200, unit_cost=Decimal("340")),
        FactoryOrderItem(factory_order=fo8, style_ref="HM-KT01", description="Kids Tee White", size="8Y-14Y", quantity=1600, unit_cost=Decimal("340")),
        FactoryOrderItem(factory_order=fo8, style_ref="HM-KT02", description="Kids Tee Blue",  size="2Y-6Y",  quantity=1000, unit_cost=Decimal("340")),
        FactoryOrderItem(factory_order=fo8, style_ref="HM-KT02", description="Kids Tee Blue",  size="8Y-14Y", quantity=1200, unit_cost=Decimal("340")),
    ])
ok(f"FO8: {fo8.fo_number} -> {tiruknit.vendor_name} ({'new' if cr else 'existing'})")

if not TAMilestone.objects.filter(customer_order=co8).exists():
    for name, po, ao in [
        ("Fabric Approval",      -45, -45), ("PP Sample Approval", -38, -38),
        ("Bulk Fabric In-House", -30, -29), ("Cutting Start",       -22, -21),
        ("Sewing Complete",      -14, -13), ("Final Inspection",    -10, -10),
        ("Ex-Factory",            -8,  -8),
    ]:
        TAMilestone.objects.create(customer_order=co8, milestone_name=name,
            planned_date=d(po), actual_date=d(ao), status="completed", responsible="BHF Office")
    ok(f"T&A CO8: 7 milestones all completed")

CostingSheet.objects.get_or_create(customer_order=co8, defaults=dict(
    currency="EUR", fob_price_per_pc=Decimal("4.50"), total_quantity=7000,
    fabric_cost=Decimal("1.70"), trim_cost=Decimal("0.20"), embroidery_print=Decimal("0.00"),
    washing_finishing=Decimal("0.10"), cm_cost=Decimal("1.20"), testing_cost=Decimal("0.10"),
    inspection_cost=Decimal("0.08"), freight_cost=Decimal("0.25"), other_cost=Decimal("0.05"),
    commission_pct=Decimal("5.00"), notes="H&M Kids Tees SS25"))

psi8, cr = PreShipmentInspection.objects.get_or_create(customer_order=co8, defaults=dict(
    company=co_obj, factory_order=fo8,
    inspection_date=d(-12), inspector_name="Intertek India",
    inspection_agency="Intertek", result="pass",
    quantity_inspected=7000, quantity_passed=7000, aql_level="2.5",
    critical_defects=0, major_defects=0, minor_defects=4,
    remarks="4 minor: thread trimming — corrected on-spot. Full pass.",
    created_by=admin))
ok(f"PSI8: {psi8.psi_number} -> {psi8.result} ({'new' if cr else 'existing'})")
if cr:
    for i, (sec, desc, res) in enumerate([
        ("Workmanship","Seam strength and SPI","pass"),
        ("Measurements","All sizes within spec","pass"),
        ("Appearance","No fabric defects","pass"),
        ("Packing","Polybag folding correct","pass"),
        ("Labels","Care label placement OK","pass"),
        ("Safety","No sharp edges/needles","pass"),
    ], 1): PSIChecklistItem.objects.create(psi=psi8, section=sec, description=desc, result=res, sort_order=i)

shp8, cr = Shipment.objects.get_or_create(customer_order=co8, defaults=dict(
    company=co_obj, factory_order=fo8, psi=psi8,
    mode="sea", status="loaded",
    port_of_loading="Tuticorin", port_of_discharge="Hamburg",
    etd=d(-6), eta=d(22), bl_number="HLCU2025007654",
    container_number="HLXU3456789", total_cartons=280,
    total_qty=7000, gross_weight_kg=Decimal("3500"),
    cbm=Decimal("28.40"), currency="EUR", invoice_value=Decimal("31500"),
    notes="FCL 40ft — Hapag Lloyd — Kids basics", created_by=admin))
ok(f"Shipment8: {shp8.shipment_number} [{shp8.status}] ({'new' if cr else 'existing'})")

si8, cr = SalesInvoice.objects.get_or_create(customer_order=co8, defaults=dict(
    company=co_obj, customer=hm, shipment=shp8,
    invoice_date=d(-6), due_date=d(52), currency="EUR",
    notes="FOB Tuticorin — HM-PO-2025-109", created_by=admin))
if cr:
    SalesInvoiceItem.objects.bulk_create([
        SalesInvoiceItem(invoice=si8, description="Kids Tee White (2Y-Unisex)", quantity=4000, unit_price=Decimal("4.50")),
        SalesInvoiceItem(invoice=si8, description="Kids Tee Blue (2Y-Unisex)",  quantity=3000, unit_price=Decimal("4.50")),
    ])
_fix_si(si8)
ok(f"SI8: {si8.invoice_number} — EUR {si8.total_amount} ({'new' if cr else 'existing'})")

pi8, cr = PurchaseInvoice.objects.get_or_create(factory_order=fo8, defaults=dict(
    company=co_obj, vendor=tiruknit, vendor_invoice_ref="TKNIT/2025/0109",
    invoice_date=d(-10), due_date=d(20), currency="INR",
    notes="Kids tees GST 5%", created_by=admin))
if cr:
    PurchaseInvoiceItem.objects.bulk_create([
        PurchaseInvoiceItem(invoice=pi8, description="Kids Tee White", quantity=4000, unit_price=Decimal("340")),
        PurchaseInvoiceItem(invoice=pi8, description="Kids Tee Blue",  quantity=3000, unit_price=Decimal("340")),
    ])
_fix_pi(pi8)
if not Payment.objects.filter(purchase_invoice=pi8).exists():
    pi8.refresh_from_db()
    Payment.objects.create(company=co_obj, payment_type="made",
        purchase_invoice=pi8, payment_date=d(-8), amount=pi8.total_amount / 2,
        currency="INR", payment_method="bank_transfer", reference="NEFT/HDFC/2025/0901",
        notes="50% advance to Tirupur Knits", created_by=admin)
    ok(f"Payment OUT8: INR {pi8.total_amount / 2} advance paid")
ok(f"PI8: {pi8.invoice_number} — INR {pi8.total_amount} ({'new' if cr else 'existing'})")


# ══════════════════════════════════════════════════════════════════════════════
# CHAIN 9  —  Primark Boho Summer Dresses  (IN TRANSIT)
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== CHAIN 9 — Primark Boho Summer Dresses (IN TRANSIT) ===")

inq9 = None
if not BuyerInquiry.objects.filter(description__icontains="Boho Summer").exists():
    try:
        inq9 = BuyerInquiry.objects.create(
            company=co_obj, customer=primark, brand=brands["Primark"],
            category=cats["Dresses"], inquiry_date=d(-65),
            required_delivery=d(10), destination="Dublin, Ireland",
            target_fob_price=Decimal("8.25"), currency="GBP",
            description="Primark Boho Summer Dresses SS25 — 3 prints",
            status="confirmed", created_by=admin)
        InquiryItem.objects.bulk_create([
            InquiryItem(inquiry=inq9, style_ref="PK-BD01",
                description="Boho Dress - Floral Print", color="Multi",
                size_range="XS-XL", quantity=3000, target_price=Decimal("8.25")),
            InquiryItem(inquiry=inq9, style_ref="PK-BD02",
                description="Boho Dress - Stripe Print", color="Blue/White",
                size_range="XS-XL", quantity=2000, target_price=Decimal("8.25")),
        ])
        InquiryCostSheet.objects.create(inquiry=inq9,
            fabric_cost=Decimal("3.20"), trims_cost=Decimal("0.40"),
            cm_cost=Decimal("2.30"), washing_cost=Decimal("0.20"),
            testing_cost=Decimal("0.15"), freight_cost=Decimal("0.35"),
            overhead_pct=Decimal("8.00"), margin_pct=Decimal("14.00"),
            currency="GBP", selling_price=Decimal("8.25"))
        for vnd, amt, sel in [(bangwov, 620, 'selected'), (chennai, 650, 'rejected')]:
            VendorQuotation.objects.create(
                inquiry=inq9, vendor=vnd, rfq_date=d(-60),
                response_date=d(-55), lead_time_days=55,
                currency="INR", unit_quoted=Decimal(amt),
                total_quoted=Decimal(amt * 5000), status=sel)
        ok(f"INQ9: {inq9.inquiry_number} — Primark Boho Dresses")
    except Exception as e: err("INQ9", e)
else:
    inq9 = BuyerInquiry.objects.filter(description__icontains="Boho Summer").first()
    skip(f"INQ9 already exists")

co9, cr = CustomerOrder.objects.get_or_create(
    customer_po_ref="PRM-PO-2025-055",
    defaults=dict(company=co_obj, customer=primark, brand=brands["Primark"],
        category=cats["Dresses"], order_date=d(-58), ship_by_date=d(10),
        status="shipped", currency="GBP",
        notes="Boho dresses SS25 — in transit", created_by=admin))
if cr:
    CustomerOrderItem.objects.bulk_create([
        CustomerOrderItem(customer_order=co9, style_ref="PK-BD01", description="Boho Dress Floral XS", color="Multi", size="XS", quantity=500,  unit_price=Decimal("8.25")),
        CustomerOrderItem(customer_order=co9, style_ref="PK-BD01", description="Boho Dress Floral S",  color="Multi", size="S",  quantity=800,  unit_price=Decimal("8.25")),
        CustomerOrderItem(customer_order=co9, style_ref="PK-BD01", description="Boho Dress Floral M",  color="Multi", size="M",  quantity=900,  unit_price=Decimal("8.25")),
        CustomerOrderItem(customer_order=co9, style_ref="PK-BD01", description="Boho Dress Floral L",  color="Multi", size="L",  quantity=600,  unit_price=Decimal("8.25")),
        CustomerOrderItem(customer_order=co9, style_ref="PK-BD01", description="Boho Dress Floral XL", color="Multi", size="XL", quantity=200,  unit_price=Decimal("8.25")),
        CustomerOrderItem(customer_order=co9, style_ref="PK-BD02", description="Boho Dress Stripe S",  color="Multi", size="S",  quantity=600,  unit_price=Decimal("8.25")),
        CustomerOrderItem(customer_order=co9, style_ref="PK-BD02", description="Boho Dress Stripe M",  color="Multi", size="M",  quantity=800,  unit_price=Decimal("8.25")),
        CustomerOrderItem(customer_order=co9, style_ref="PK-BD02", description="Boho Dress Stripe L",  color="Multi", size="L",  quantity=600,  unit_price=Decimal("8.25")),
    ])
if inq9 and not inq9.customer_order:
    inq9.customer_order = co9; inq9.save()
ok(f"CO9: {co9.co_number} [{co9.status}] ({'new' if cr else 'existing'})")

fo9, cr = FactoryOrder.objects.get_or_create(
    customer_order=co9, vendor=bangwov,
    defaults=dict(company=co_obj, order_date=d(-55), ex_factory_date=d(-16),
        status="shipped", currency="INR", notes="Boho dresses — cotton voile print", created_by=admin))
if cr:
    FactoryOrderItem.objects.bulk_create([
        FactoryOrderItem(factory_order=fo9, style_ref="PK-BD01", description="Boho Dress Floral", size="XS-XL", quantity=3000, unit_cost=Decimal("620")),
        FactoryOrderItem(factory_order=fo9, style_ref="PK-BD02", description="Boho Dress Stripe",  size="S-L",  quantity=2000, unit_cost=Decimal("620")),
    ])
ok(f"FO9: {fo9.fo_number} -> {bangwov.vendor_name} ({'new' if cr else 'existing'})")

if not TAMilestone.objects.filter(customer_order=co9).exists():
    for name, po, ao in [
        ("Fabric Approval",      -55, -55), ("PP Sample Approval", -48, -47),
        ("Bulk Fabric In-House", -40, -38), ("Cutting Start",       -30, -29),
        ("Sewing Complete",      -22, -21), ("Final Inspection",    -18, -17),
        ("Ex-Factory",           -16, -16),
    ]:
        TAMilestone.objects.create(customer_order=co9, milestone_name=name,
            planned_date=d(po), actual_date=d(ao), status="completed", responsible="BHF Office")
    ok(f"T&A CO9: 7 milestones completed")

CostingSheet.objects.get_or_create(customer_order=co9, defaults=dict(
    currency="GBP", fob_price_per_pc=Decimal("8.25"), total_quantity=5000,
    fabric_cost=Decimal("3.20"), trim_cost=Decimal("0.40"), embroidery_print=Decimal("0.00"),
    washing_finishing=Decimal("0.20"), cm_cost=Decimal("2.30"), testing_cost=Decimal("0.15"),
    inspection_cost=Decimal("0.12"), freight_cost=Decimal("0.35"), other_cost=Decimal("0.10"),
    commission_pct=Decimal("5.00"), notes="Primark Boho Dresses SS25"))

psi9, cr = PreShipmentInspection.objects.get_or_create(customer_order=co9, defaults=dict(
    company=co_obj, factory_order=fo9,
    inspection_date=d(-19), inspector_name="Bureau Veritas",
    inspection_agency="Bureau Veritas", result="pass_remarks",
    quantity_inspected=5000, quantity_passed=5000, aql_level="2.5",
    critical_defects=0, major_defects=2, minor_defects=18,
    remarks="2 major: print misalignment corrected. 18 minor: thread ends within tolerance.",
    created_by=admin))
ok(f"PSI9: {psi9.psi_number} -> {psi9.result} ({'new' if cr else 'existing'})")
if cr:
    for i, (sec, desc, res) in enumerate([
        ("Workmanship","SPI and seam quality","pass"),
        ("Measurements","Dimensions per spec","pass"),
        ("Appearance","Print placement","pass"),
        ("Packing","Polybag + carton","pass"),
        ("Labels","All labels correct","pass"),
    ], 1): PSIChecklistItem.objects.create(psi=psi9, section=sec, description=desc, result=res, sort_order=i)

shp9, cr = Shipment.objects.get_or_create(customer_order=co9, defaults=dict(
    company=co_obj, factory_order=fo9, psi=psi9,
    mode="sea", status="in_transit",
    port_of_loading="Nhava Sheva", port_of_discharge="Tilbury",
    etd=d(-14), eta=d(12), bl_number="EVGR2025006543",
    container_number="EGHU9876543", total_cartons=200,
    total_qty=5000, gross_weight_kg=Decimal("3200"),
    cbm=Decimal("26.50"), currency="GBP", invoice_value=Decimal("41250"),
    notes="FCL 40ft — Evergreen — Boho dresses in transit", created_by=admin))
ok(f"Shipment9: {shp9.shipment_number} [{shp9.status}] ({'new' if cr else 'existing'})")

si9, cr = SalesInvoice.objects.get_or_create(customer_order=co9, defaults=dict(
    company=co_obj, customer=primark, shipment=shp9,
    invoice_date=d(-14), due_date=d(16), currency="GBP",
    status="sent", notes="FOB Nhava Sheva — PRM-PO-2025-055", created_by=admin))
if cr:
    SalesInvoiceItem.objects.bulk_create([
        SalesInvoiceItem(invoice=si9, description="Boho Dress Floral (XS-XL)", quantity=3000, unit_price=Decimal("8.25")),
        SalesInvoiceItem(invoice=si9, description="Boho Dress Stripe (S-L)",   quantity=2000, unit_price=Decimal("8.25")),
    ])
_fix_si(si9)
ok(f"SI9: {si9.invoice_number} — GBP {si9.total_amount} ({'new' if cr else 'existing'})")

pi9, cr = PurchaseInvoice.objects.get_or_create(factory_order=fo9, defaults=dict(
    company=co_obj, vendor=bangwov, vendor_invoice_ref="BWV/2025/0055",
    invoice_date=d(-18), due_date=d(12), currency="INR",
    status="received", notes="Boho dresses GST 5%", created_by=admin))
if cr:
    PurchaseInvoiceItem.objects.bulk_create([
        PurchaseInvoiceItem(invoice=pi9, description="Boho Dress Floral", quantity=3000, unit_price=Decimal("620")),
        PurchaseInvoiceItem(invoice=pi9, description="Boho Dress Stripe",  quantity=2000, unit_price=Decimal("620")),
    ])
_fix_pi(pi9)
ok(f"PI9: {pi9.invoice_number} — INR {pi9.total_amount} ({'new' if cr else 'existing'})")


# ══════════════════════════════════════════════════════════════════════════════
# CHAIN 10  —  M&S Ladies Wide Leg Trousers  (PSI SCHEDULED — ready to ship)
# ══════════════════════════════════════════════════════════════════════════════
print("\n=== CHAIN 10 — M&S Ladies Wide Leg Trousers (PSI PENDING) ===")

inq10 = None
if not BuyerInquiry.objects.filter(description__icontains="Wide Leg").exists():
    try:
        inq10 = BuyerInquiry.objects.create(
            company=co_obj, customer=ms, brand=brands["M&S Collection"],
            category=cats["Bottoms / Trousers"], inquiry_date=d(-42),
            required_delivery=d(20), destination="London, UK",
            target_fob_price=Decimal("18.50"), currency="GBP",
            description="M&S Ladies Wide Leg Trousers AW25 — linen blend, 2 colours",
            status="confirmed", created_by=admin)
        InquiryItem.objects.bulk_create([
            InquiryItem(inquiry=inq10, style_ref="MS-WL01",
                description="Wide Leg Trouser - Stone", color="Stone",
                size_range="6-22", quantity=1500, target_price=Decimal("18.50")),
            InquiryItem(inquiry=inq10, style_ref="MS-WL02",
                description="Wide Leg Trouser - Black", color="Black",
                size_range="6-22", quantity=1500, target_price=Decimal("18.50")),
        ])
        InquiryCostSheet.objects.create(inquiry=inq10,
            fabric_cost=Decimal("7.50"), trims_cost=Decimal("0.70"),
            cm_cost=Decimal("4.20"), washing_cost=Decimal("0.30"),
            testing_cost=Decimal("0.40"), freight_cost=Decimal("0.60"),
            overhead_pct=Decimal("8.00"), margin_pct=Decimal("20.00"),
            currency="GBP", selling_price=Decimal("18.50"))
        for vnd, amt, sel in [
            (ludhiana, 1380, 'selected'),
            (sree,     1450, 'rejected'),
        ]:
            VendorQuotation.objects.create(
                inquiry=inq10, vendor=vnd, rfq_date=d(-38),
                response_date=d(-33), lead_time_days=55,
                currency="INR", unit_quoted=Decimal(amt),
                total_quoted=Decimal(amt * 3000), status=sel)
        ok(f"INQ10: {inq10.inquiry_number} — M&S Wide Leg Trousers")
    except Exception as e: err("INQ10", e)
else:
    inq10 = BuyerInquiry.objects.filter(description__icontains="Wide Leg").first()
    skip(f"INQ10 already exists")

co10, cr = CustomerOrder.objects.get_or_create(
    customer_po_ref="MS-PO-2025-033",
    defaults=dict(company=co_obj, customer=ms, brand=brands["M&S Collection"],
        category=cats["Bottoms / Trousers"], order_date=d(-36), ship_by_date=d(20),
        status="in_production", currency="GBP",
        notes="Wide leg trousers AW25 — PSI scheduled next week", created_by=admin))
if cr:
    CustomerOrderItem.objects.bulk_create([
        CustomerOrderItem(customer_order=co10, style_ref="MS-WL01", description="Wide Leg Stone Size 6-10",  color="Stone", size="6-10",  quantity=400, unit_price=Decimal("18.50")),
        CustomerOrderItem(customer_order=co10, style_ref="MS-WL01", description="Wide Leg Stone Size 12-16", color="Stone", size="12-16", quantity=600, unit_price=Decimal("18.50")),
        CustomerOrderItem(customer_order=co10, style_ref="MS-WL01", description="Wide Leg Stone Size 18-22", color="Stone", size="18-22", quantity=500, unit_price=Decimal("18.50")),
        CustomerOrderItem(customer_order=co10, style_ref="MS-WL02", description="Wide Leg Black Size 6-10",  color="Black", size="6-10",  quantity=400, unit_price=Decimal("18.50")),
        CustomerOrderItem(customer_order=co10, style_ref="MS-WL02", description="Wide Leg Black Size 12-16", color="Black", size="12-16", quantity=600, unit_price=Decimal("18.50")),
        CustomerOrderItem(customer_order=co10, style_ref="MS-WL02", description="Wide Leg Black Size 18-22", color="Black", size="18-22", quantity=500, unit_price=Decimal("18.50")),
    ])
if inq10 and not inq10.customer_order:
    inq10.customer_order = co10; inq10.save()
ok(f"CO10: {co10.co_number} [{co10.status}] ({'new' if cr else 'existing'})")

fo10, cr = FactoryOrder.objects.get_or_create(
    customer_order=co10, vendor=ludhiana,
    defaults=dict(company=co_obj, order_date=d(-33), ex_factory_date=d(18),
        status="in_production", currency="INR", notes="Wide leg trousers — linen blend", created_by=admin))
if cr:
    FactoryOrderItem.objects.bulk_create([
        FactoryOrderItem(factory_order=fo10, style_ref="MS-WL01", description="Wide Leg Stone", size="6-16",  quantity=1000, unit_cost=Decimal("1380")),
        FactoryOrderItem(factory_order=fo10, style_ref="MS-WL01", description="Wide Leg Stone", size="18-22", quantity=500,  unit_cost=Decimal("1380")),
        FactoryOrderItem(factory_order=fo10, style_ref="MS-WL02", description="Wide Leg Black", size="6-16",  quantity=1000, unit_cost=Decimal("1380")),
        FactoryOrderItem(factory_order=fo10, style_ref="MS-WL02", description="Wide Leg Black", size="18-22", quantity=500,  unit_cost=Decimal("1380")),
    ])
ok(f"FO10: {fo10.fo_number} -> {ludhiana.vendor_name} ({'new' if cr else 'existing'})")

if not TAMilestone.objects.filter(customer_order=co10).exists():
    for name, po, ao, status in [
        ("Fabric Approval",      -33, -33, "completed"),
        ("PP Sample Approval",   -26, -26, "completed"),
        ("Bulk Fabric In-House", -18, -17, "completed"),
        ("Cutting Start",        -10,  -9, "completed"),
        ("Sewing Complete",       -3,  None, "in_progress"),
        ("Final Inspection",       4,  None, "pending"),
        ("Ex-Factory",            18,  None, "pending"),
    ]:
        TAMilestone.objects.create(customer_order=co10, milestone_name=name,
            planned_date=d(po), actual_date=d(ao) if ao else None,
            status=status, responsible="BHF Office")
    ok(f"T&A CO10: 7 milestones (sewing in progress)")

CostingSheet.objects.get_or_create(customer_order=co10, defaults=dict(
    currency="GBP", fob_price_per_pc=Decimal("18.50"), total_quantity=3000,
    fabric_cost=Decimal("7.50"), trim_cost=Decimal("0.70"), embroidery_print=Decimal("0.00"),
    washing_finishing=Decimal("0.30"), cm_cost=Decimal("4.20"), testing_cost=Decimal("0.40"),
    inspection_cost=Decimal("0.20"), freight_cost=Decimal("0.60"), other_cost=Decimal("0.15"),
    commission_pct=Decimal("5.00"), notes="M&S Wide Leg Trousers AW25"))
ok("Costing sheet CO10 done")


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
