# ============================================================
# Management Command: seed_tt_data
# Run: python manage.py seed_tt_data
# Seeds 10+ realistic records across ALL TT-ERP modules:
#   Masters → Purchase → Lots → Planning → Production → Quality → Dispatch
# SAFE: uses get_or_create — will NOT duplicate existing data.
# ============================================================

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from datetime import date, timedelta
from decimal import Decimal

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed MEI TEXZ TT-ERP demo data across all modules (10+ records each).'

    def handle(self, *args, **options):
        self.user = User.objects.filter(is_superuser=True).first()
        self.today = date.today()
        self.stdout.write('\n=== MEI TEXZ — TT-ERP Demo Data Seed ===\n')

        with transaction.atomic():
            company   = self.seed_company()
            uoms      = self.seed_uom()
            locations = self.seed_locations(company)
            yarns     = self.seed_yarn(company, uoms)
            items     = self.seed_items(company, uoms)
            machines  = self.seed_machines(company, uoms, locations)
            processes = self.seed_processes(company)
            products  = self.seed_products(company)
            vendors   = self.seed_vendors(company)
            customers = self.seed_customers(company)
            self.seed_bom(company, products, yarns, items, uoms, processes)
            lots      = self.seed_purchase(company, vendors, yarns, items, uoms, locations)
            self.seed_planning(company, customers, products, machines, processes, lots)
            self.seed_quality_defect_types(company)
            self.seed_forecast(company, customers, products)

        self.stdout.write(self.style.SUCCESS('\n=== All TT-ERP demo data seeded! ===\n'))

    # ── Company ───────────────────────────────────────────────
    def seed_company(self):
        from master_data.models import Company
        co, _ = Company.objects.get_or_create(
            name='MEI TEXZ',
            defaults=dict(
                gstin='33ABCDE1234F1Z5',
                address_line1='No. 12, Industrial Estate',
                city='Coimbatore', state='Tamil Nadu', pincode='641001',
                phone='0422-2345678', email='info@meitexz.com',
                is_active=True,
            )
        )
        self.stdout.write(f'  Company: {co.name}')
        return co

    # ── UOM ───────────────────────────────────────────────────
    def seed_uom(self):
        from masters.models import UOM
        data = [('Kilogram', 'kg'), ('Meter', 'm'), ('Roll', 'roll'), ('Piece', 'pcs'), ('Liter', 'ltr')]
        uoms = {}
        for name, short in data:
            u, _ = UOM.objects.get_or_create(name=name, defaults={'short_name': short})
            uoms[short] = u
        self.stdout.write(f'  UOM: {len(uoms)} ready')
        return uoms

    # ── Locations ─────────────────────────────────────────────
    def seed_locations(self, company):
        from masters.models import Location
        data = [
            ('Raw Material Store', 'RM-STORE', 'raw_material'),
            ('WIP Production Floor', 'WIP-FLOOR', 'wip'),
            ('Finished Goods Store', 'FG-STORE', 'finished'),
            ('Dispatch Area', 'DISPATCH', 'dispatch'),
        ]
        locs = {}
        for name, code, ltype in data:
            l, _ = Location.objects.get_or_create(
                code=code,
                defaults=dict(company=company, name=name, location_type=ltype, is_active=True)
            )
            locs[code] = l
        self.stdout.write(f'  Locations: {len(locs)} ready')
        return locs

    # ── Yarn Master ───────────────────────────────────────────
    def seed_yarn(self, company, uoms):
        from masters.models import YarnMaster
        data = [
            ('YRN-001', 'Cotton Warp Yarn 30s Ne',    'warp',  '30s Ne', '100% Cotton',    'WHT', 'White'),
            ('YRN-002', 'Cotton Weft Yarn 20s Ne',    'weft',  '20s Ne', '100% Cotton',    'CRM', 'Cream'),
            ('YRN-003', 'Polyester Warp 150D',         'warp',  '150D',  '100% Polyester', 'WHT', 'White'),
            ('YRN-004', 'Polyester Weft 75D',          'weft',  '75D',   '100% Polyester', 'WHT', 'White'),
            ('YRN-005', 'HDPE Warp Yarn 200D',         'warp',  '200D',  '100% HDPE',      'BLK', 'Black'),
            ('YRN-006', 'Nylon Warp 100D',             'warp',  '100D',  '100% Nylon',     'WHT', 'White'),
            ('YRN-007', 'PP Weft Yarn 120D',           'weft',  '120D',  '100% PP',        'GRY', 'Grey'),
            ('YRN-008', 'Cotton / Polyester 60/40',    'warp',  '40s Ne','60% Cotton 40% Poly', 'WHT', 'White'),
            ('YRN-009', 'Glass Fiber Roving',          'other', '—',     '100% Fiberglass','WHT', 'White'),
            ('YRN-010', 'Aramid Warp Yarn',            'warp',  '200D',  '100% Aramid',    'YEL', 'Yellow'),
        ]
        yarns = []
        for code, name, ytype, count, comp, ccode, cname in data:
            y, _ = YarnMaster.objects.get_or_create(
                item_code=code,
                defaults=dict(
                    company=company, item_name=name, yarn_type=ytype,
                    count=count, composition=comp, color_code=ccode, color_name=cname,
                    uom=uoms['kg'], reorder_level=500, is_active=True,
                )
            )
            yarns.append(y)
        self.stdout.write(f'  Yarn Master: {len(yarns)} ready')
        return yarns

    # ── Item Master ───────────────────────────────────────────
    def seed_items(self, company, uoms):
        from masters.models import ItemMaster
        data = [
            ('ITM-001', 'PVC Compound Grade A',     'pvc',      'kg'),
            ('ITM-002', 'Adhesive Resin',            'chemical', 'ltr'),
            ('ITM-003', 'Pigment Red',               'chemical', 'kg'),
            ('ITM-004', 'Pigment Black',             'chemical', 'kg'),
            ('ITM-005', 'Softener Chemical',         'chemical', 'ltr'),
            ('ITM-006', 'Anti-UV Stabilizer',        'chemical', 'kg'),
            ('ITM-007', 'Woven Base Fabric 200GSM',  'fabric',   'kg'),
            ('ITM-008', 'Non-woven Backing Sheet',   'fabric',   'kg'),
            ('ITM-009', 'Velcro Tape 2.5cm',         'accessory','pcs'),
            ('ITM-010', 'Cardboard Roll Core',       'accessory','pcs'),
        ]
        items = []
        for code, name, itype, uom_key in data:
            it, _ = ItemMaster.objects.get_or_create(
                item_code=code,
                defaults=dict(
                    company=company, item_name=name, item_type=itype,
                    uom=uoms.get(uom_key, uoms['kg']),
                    reorder_level=100, is_active=True,
                )
            )
            items.append(it)
        self.stdout.write(f'  Item Master: {len(items)} ready')
        return items

    # ── Machines ──────────────────────────────────────────────
    def seed_machines(self, company, uoms, locations):
        from masters.models import Machine
        floor = locations.get('WIP-FLOOR')
        data = [
            ('WRP-001', 'Warping Machine 1',    'warping',    floor, 200),
            ('WRP-002', 'Warping Machine 2',    'warping',    floor, 200),
            ('WVG-001', 'Weaving Loom 1',       'weaving',    floor, 100),
            ('WVG-002', 'Weaving Loom 2',       'weaving',    floor, 100),
            ('WVG-003', 'Weaving Loom 3',       'weaving',    floor, 100),
            ('STN-001', 'Stenter Machine',      'stenter',    floor, 150),
            ('TMB-001', 'Tumbler / Dryer',      'tumbler',    floor, 200),
            ('EMB-001', 'Embossing Machine',    'embossing',  floor, 120),
            ('LAM-001', 'Lamination Machine',   'lamination', floor, 80),
            ('INS-001', 'Inspection Table 1',   'inspection', floor, 300),
        ]
        machines = []
        for code, name, mtype, loc, cap in data:
            m, _ = Machine.objects.get_or_create(
                machine_code=code,
                defaults=dict(
                    company=company, machine_name=name, machine_type=mtype,
                    location=loc, capacity_per_day=cap,
                    uom=uoms['kg'], is_active=True,
                )
            )
            machines.append(m)
        self.stdout.write(f'  Machines: {len(machines)} ready')
        return machines

    # ── Processes ─────────────────────────────────────────────
    def seed_processes(self, company):
        from masters.models import Process
        data = [
            ('PRC-001', 'Warping',    1, 'warping',    'Winding yarn onto beam'),
            ('PRC-002', 'Weaving',    2, 'weaving',    'Interlacing warp & weft'),
            ('PRC-003', 'Stentering', 3, 'stenter',    'Heat setting and width fixing'),
            ('PRC-004', 'Tumbling',   4, 'tumbler',    'Softening and drying'),
            ('PRC-005', 'Embossing',  5, 'embossing',  'Surface pattern / texture'),
            ('PRC-006', 'Lamination', 6, 'lamination', 'PVC or film coating'),
            ('PRC-007', 'Inspection', 7, 'inspection', 'Final quality inspection'),
        ]
        procs = []
        for code, name, seq, mtype, desc in data:
            p, _ = Process.objects.get_or_create(
                process_code=code,
                defaults=dict(
                    company=company, process_name=name, sequence=seq,
                    machine_type=mtype, description=desc, is_active=True,
                )
            )
            procs.append(p)
        self.stdout.write(f'  Processes: {len(procs)} ready')
        return procs

    # ── Products / Designs ────────────────────────────────────
    def seed_products(self, company):
        from masters.models import ProductDesign
        data = [
            # (code, name, category, route, gsm, width, composition)
            ('PD-001', 'Cotton Canvas 200GSM',        'Canvas',       'full_cycle', 200, 150, '100% Cotton'),
            ('PD-002', 'Polyester Woven 120GSM',      'Woven',        'full_cycle', 120, 150, '100% Polyester'),
            ('PD-003', 'Geotextile Woven 300GSM',     'Geotextile',   'full_cycle', 300, 200, '100% Polypropylene'),
            ('PD-004', 'HDPE Safety Net 400GSM',      'Safety',       'full_cycle', 400, 200, '100% HDPE'),
            ('PD-005', 'PVC Laminated Fabric',        'Laminated',    'fabric_in',  500, 150, '65% PVC 35% Polyester'),
            ('PD-006', 'Embossed Canvas',             'Canvas',       'fabric_in',  250, 150, '80% Cotton 20% Poly'),
            ('PD-007', 'Cotton Bandage Fabric 80GSM', 'Medical',      'full_cycle',  80, 100, '100% Cotton'),
            ('PD-008', 'Surgical Drape 60GSM',        'Medical',      'full_cycle',  60, 200, '70% Cotton 30% Poly'),
            ('PD-009', 'Filter Fabric 180GSM',        'Filtration',   'full_cycle', 180, 150, '100% Polyester'),
            ('PD-010', 'Direct Sale Fabric A',        'Direct',       'direct',     150, 150, '100% Cotton'),
        ]
        products = []
        for code, name, cat, route, gsm, width, comp in data:
            p, _ = ProductDesign.objects.get_or_create(
                design_code=code,
                defaults=dict(
                    company=company, design_name=name, category=cat,
                    process_route=route, gsm=gsm, width_cm=width,
                    composition=comp, is_active=True,
                )
            )
            products.append(p)
        self.stdout.write(f'  Products: {len(products)} ready')
        return products

    # ── Vendors ───────────────────────────────────────────────
    def seed_vendors(self, company):
        from masters.models import Vendor
        data = [
            ('VND-001', 'Coimbatore Yarn Mills',     'raw_material', 'Ravi Kumar',   '9876543210', 'Coimbatore',  'Tamil Nadu',  '33ABCDE1234F1Z5', 30),
            ('VND-002', 'Tirupur Thread Works',      'raw_material', 'Murugan S',    '9865432100', 'Tirupur',     'Tamil Nadu',  '33XYZPQ5678G1Z2', 30),
            ('VND-003', 'Erode Cotton Suppliers',    'raw_material', 'Selvam R',     '9944321099', 'Erode',       'Tamil Nadu',  '33MNOPQ9012H1Z9', 45),
            ('VND-004', 'Chennai Chemicals Pvt Ltd', 'raw_material', 'Anbu Raj',     '9811122233', 'Chennai',     'Tamil Nadu',  '33LMNOP4567I1Z3', 30),
            ('VND-005', 'Mumbai Polymer Supplies',   'raw_material', 'Vinod Shah',   '9900011223', 'Mumbai',      'Maharashtra', '27ABCDE5678J1Z1', 45),
            ('VND-006', 'Surat Textile Traders',     'job_work',     'Harsh Patel',  '9898776655', 'Surat',       'Gujarat',     '24QRSTU1234K1Z8', 30),
            ('VND-007', 'Ludhiana Fiber Mills',      'raw_material', 'Gurpreet S',   '9876611223', 'Ludhiana',    'Punjab',      '03VWXYZ5678L1Z6', 30),
            ('VND-008', 'Delhi Nonwoven Fabrics',    'raw_material', 'Amit Gupta',   '9810099887', 'Delhi',       'Delhi',       '07ABCDE1234M1Z4', 30),
            ('VND-009', 'Rajasthan Fiber Pvt Ltd',   'raw_material', 'Suresh Joshi', '9812345678', 'Jaipur',      'Rajasthan',   '08FGHIJ5678N1Z7', 45),
            ('VND-010', 'Karnataka Chemicals Ltd',   'raw_material', 'Priya Nair',   '9944556677', 'Bengaluru',   'Karnataka',   '29KLMNO9012O1Z5', 30),
        ]
        vendors = []
        for code, name, vtype, contact, phone, city, state, gstin, cdays in data:
            v, _ = Vendor.objects.get_or_create(
                vendor_code=code,
                defaults=dict(
                    company=company, vendor_name=name, vendor_type=vtype,
                    contact_person=contact, phone=phone, city=city, state=state,
                    gstin=gstin, credit_days=cdays, is_active=True,
                )
            )
            vendors.append(v)
        self.stdout.write(f'  Vendors: {len(vendors)} ready')
        return vendors

    # ── Customers ─────────────────────────────────────────────
    def seed_customers(self, company):
        from masters.models import Customer
        data = [
            ('CST-001', 'Apollo Hospitals Ltd',      'Dr. Ramesh',   '9944001122', 'Chennai',     'Tamil Nadu',  '33APOLLO1234F1Z5', 30,  500000),
            ('CST-002', 'Cipla Medical Devices',     'Kiran Mehta',  '9922334455', 'Mumbai',      'Maharashtra', '27CIPLA5678G1Z2',  45,  300000),
            ('CST-003', 'L&T Construction Ltd',      'Sanjay Rao',   '9911556677', 'Hyderabad',   'Telangana',   '36LANDT9012H1Z9', 30, 1000000),
            ('CST-004', 'SAIL Steel Plants',         'Dinesh Kumar', '9800112233', 'Bhubaneswar', 'Odisha',      '21SAIL4567I1Z3',  60,  750000),
            ('CST-005', 'Bharat Agriculture Co',     'Mohan Verma',  '9855443322', 'Nagpur',      'Maharashtra', '27BHARAT5678J1Z1', 30, 400000),
            ('CST-006', 'Medanta Medical Centre',    'Dr. Priya',    '9911223344', 'Gurgaon',     'Haryana',     '06MEDANTA1234K1Z8', 30, 600000),
            ('CST-007', 'Sun Pharma Industries',     'Rakesh Shah',  '9977665544', 'Vadodara',    'Gujarat',     '24SUNPHA5678L1Z6', 45, 800000),
            ('CST-008', 'Tata Projects Ltd',         'Anand Pillai', '9933112244', 'Mumbai',      'Maharashtra', '27TATAP1234M1Z4',  30, 1500000),
            ('CST-009', 'National Geotextile Corp',  'Suresh Iyer',  '9876001234', 'Coimbatore',  'Tamil Nadu',  '33NATGEO5678N1Z7', 45, 900000),
            ('CST-010', 'Mahindra Agro Supplies',    'Vijay Naik',   '9800998877', 'Pune',        'Maharashtra', '27MAHIND9012O1Z5', 30, 350000),
        ]
        customers = []
        for code, name, contact, phone, city, state, gstin, cdays, climit in data:
            c, _ = Customer.objects.get_or_create(
                customer_code=code,
                defaults=dict(
                    company=company, customer_name=name, contact_person=contact,
                    phone=phone, city=city, state=state, gstin=gstin,
                    credit_days=cdays, credit_limit=climit, is_active=True,
                )
            )
            customers.append(c)
        self.stdout.write(f'  Customers: {len(customers)} ready')
        return customers

    # ── BOM ───────────────────────────────────────────────────
    def seed_bom(self, company, products, yarns, items, uoms, processes):
        from masters.models import BOM, BOMLine
        bom_configs = [
            # (product_idx, [(mat_type, yarn_idx/item_idx, qty, proc_idx), ...])
            (0, [('yarn', 0, 1.20, 0), ('yarn', 1, 0.80, 1)]),   # Cotton Canvas
            (1, [('yarn', 2, 1.10, 0), ('yarn', 3, 0.70, 1)]),   # Polyester Woven
            (2, [('yarn', 4, 1.50, 0), ('yarn', 6, 0.90, 1)]),   # Geotextile
            (3, [('yarn', 4, 1.80, 0), ('yarn', 6, 1.00, 1)]),   # HDPE Safety Net
            (4, [('item', 6, 1.10, 1), ('item', 0, 0.30, 5)]),   # PVC Laminated (fabric_in)
            (6, [('yarn', 0, 1.00, 0), ('yarn', 1, 0.60, 1)]),   # Cotton Bandage
            (7, [('yarn', 0, 0.80, 0), ('yarn', 2, 0.50, 1)]),   # Surgical Drape
            (8, [('yarn', 2, 1.20, 0), ('yarn', 3, 0.80, 1)]),   # Filter Fabric
        ]
        count = 0
        for prod_idx, lines in bom_configs:
            prod = products[prod_idx]
            try:
                bom = prod.bom
            except Exception:
                bom = BOM.objects.create(
                    company=company, product=prod,
                    version='v1.0', is_active=True, created_by=self.user
                )
                count += 1
            for mat_type, mat_idx, qty, proc_idx in lines:
                if BOMLine.objects.filter(bom=bom, material_type=mat_type).exists():
                    continue
                kwargs = dict(
                    bom=bom, material_type=mat_type,
                    quantity=qty, uom=uoms['kg'],
                    process_stage=processes[proc_idx] if proc_idx < len(processes) else None,
                )
                if mat_type == 'yarn':
                    kwargs['yarn'] = yarns[mat_idx] if mat_idx < len(yarns) else None
                else:
                    kwargs['item'] = items[mat_idx] if mat_idx < len(items) else None
                BOMLine.objects.create(**kwargs)
        self.stdout.write(f'  BOMs: {count} created (lines added)')

    # ── Purchase: PO → GRN → Lots → Invoice ──────────────────
    def seed_purchase(self, company, vendors, yarns, items, uoms, locations):
        from purchase.models import PurchaseOrder, PurchaseOrderLine, GRN, GRNLine, Lot, PurchaseInvoice
        import datetime

        rm_loc = locations.get('RM-STORE')
        po_data = [
            # (vendor_idx, mat_type, yarn/item_idx, qty, price, days_ago)
            (0, 'yarn', 0, 2000, 280, -45),   # Cotton Warp from VND-001
            (1, 'yarn', 1, 1500, 260, -40),   # Cotton Weft from VND-002
            (2, 'yarn', 2,  800, 320, -35),   # Polyester Warp from VND-003
            (3, 'item', 0,  500, 180, -30),   # PVC Compound
            (4, 'item', 1,  300, 240, -25),   # Adhesive Resin
            (0, 'yarn', 4, 1200, 350, -20),   # HDPE Warp
            (1, 'yarn', 6,  900, 200, -15),   # PP Weft
            (5, 'item', 6, 2000, 150, -12),   # Woven Base Fabric (job work vendor)
            (9, 'item', 2,  200, 420, -10),   # Pigment Red
            (3, 'item', 4,  400, 310, -7),    # Softener Chemical
        ]

        today_str = self.today.strftime('%Y%m%d')
        lots_created = []

        for i, (v_idx, mat_type, mat_idx, qty, price, days_ago) in enumerate(po_data):
            order_date = self.today + timedelta(days=days_ago)
            po_num = f'PO-{order_date.strftime("%Y%m%d")}-{i+1:03d}'

            vendor = vendors[v_idx]
            yarn_obj = yarns[mat_idx] if mat_type == 'yarn' else None
            item_obj = items[mat_idx] if mat_type == 'item' else None
            mat_name = yarn_obj.item_name if yarn_obj else item_obj.item_name
            uom_obj = uoms['kg'] if mat_type == 'yarn' else uoms.get('ltr' if 'Resin' in (item_obj.item_name if item_obj else '') or 'Softener' in (item_obj.item_name if item_obj else '') else 'kg', uoms['kg'])

            po, po_created = PurchaseOrder.objects.get_or_create(
                po_number=po_num,
                defaults=dict(
                    company=company, vendor=vendor,
                    order_date=order_date,
                    expected_date=order_date + timedelta(days=10),
                    status='confirmed',
                    total_amount=Decimal(str(qty * price)),
                    notes=f'Demo PO for {mat_name}',
                    created_by=self.user,
                )
            )

            pol = PurchaseOrderLine.objects.filter(purchase_order=po).first()
            if not pol:
                pol = PurchaseOrderLine.objects.create(
                    purchase_order=po,
                    material_type=mat_type,
                    yarn=yarn_obj, item=item_obj,
                    ordered_quantity=qty, received_quantity=qty,
                    unit_price=price,
                    total_price=Decimal(str(qty * price)),
                    uom=uom_obj,
                )

            # GRN
            grn_num = f'GRN-{order_date.strftime("%Y%m%d")}-{i+1:03d}'
            grn, grn_created = GRN.objects.get_or_create(
                grn_number=grn_num,
                defaults=dict(
                    company=company, purchase_order=po,
                    receipt_date=order_date + timedelta(days=3),
                    vendor_invoice_number=f'VINV-{i+1:04d}',
                    status='confirmed',
                    created_by=self.user,
                )
            )

            grn_line = GRNLine.objects.filter(grn=grn).first()
            if not grn_line:
                grn_line = GRNLine.objects.create(
                    grn=grn, po_line=pol,
                    received_quantity=qty, lot_created=True,
                )

            # LOT
            lot_num = f'LOT-{order_date.strftime("%Y%m%d")}-{i+1:03d}'
            lot, lot_created = Lot.objects.get_or_create(
                lot_number=lot_num,
                defaults=dict(
                    company=company, grn=grn, grn_line=grn_line,
                    material_type=mat_type,
                    yarn=yarn_obj, item=item_obj,
                    quantity=qty, balance_qty=qty,
                    uom=uom_obj, location=rm_loc,
                    status='available',
                    received_date=order_date + timedelta(days=3),
                    vendor_lot_ref=f'VL-{i+1:04d}',
                    created_by=self.user,
                )
            )
            lots_created.append(lot)

            # Purchase Invoice for first 7
            if i < 7:
                inv_num = f'PINV-{order_date.strftime("%Y%m%d")}-{i+1:03d}'
                total = Decimal(str(qty * price))
                tax = total * Decimal('0.18')
                PurchaseInvoice.objects.get_or_create(
                    invoice_number=inv_num,
                    defaults=dict(
                        company=company, grn=grn, vendor=vendor,
                        invoice_date=order_date + timedelta(days=5),
                        due_date=order_date + timedelta(days=35),
                        total_amount=total + tax, tax_amount=tax,
                        status='posted' if i < 5 else 'draft',
                    )
                )

        self.stdout.write(f'  Purchase: {len(po_data)} POs + GRNs + Lots + 7 Invoices created')
        return lots_created

    # ── Planning: Forecast → SO → Prod Order → Daily Plan ────
    def seed_planning(self, company, customers, products, machines, processes, lots):
        from planning.models import (
            SalesOrder, SalesOrderLine,
            ProductionOrder, DailyPlan,
            CustomerForecast, ForecastLine,
        )
        from production_exec.models import ProcessEntry, ProcessEntryLotInput, Batch, YarnIssue, BeamOutward
        from quality.models import Inspection, DefectType, SampleTest
        from dispatch.models import DispatchEntry, DispatchLine, SalesInvoice
        import datetime

        # ── Sales Orders (10) ──────────────────────────────────
        so_data = [
            (0, 0, 1000, 450, 'confirmed',   -60),
            (1, 1,  800, 380, 'confirmed',   -55),
            (2, 2, 2000, 520, 'in_production',-45),
            (3, 3, 1500, 680, 'in_production',-40),
            (4, 4,  500, 750, 'confirmed',   -35),
            (5, 5,  300, 820, 'confirmed',   -30),
            (6, 6,  600, 560, 'in_production',-25),
            (7, 7,  900, 490, 'confirmed',   -20),
            (8, 8, 1200, 610, 'draft',       -15),
            (9, 9, 2500, 420, 'draft',       -10),
        ]

        sos = []
        for i, (c_idx, p_idx, qty, price, status, days_ago) in enumerate(so_data):
            od = self.today + timedelta(days=days_ago)
            so_num = f'SO-{od.strftime("%Y%m%d")}-{i+1:03d}'
            total = Decimal(str(qty)) * Decimal(str(price))
            so, _ = SalesOrder.objects.get_or_create(
                so_number=so_num,
                defaults=dict(
                    company=company,
                    customer=customers[c_idx], order_date=od,
                    delivery_date=od + timedelta(days=30),
                    status=status, total_amount=total,
                    created_by=self.user,
                )
            )
            SalesOrderLine.objects.get_or_create(
                sales_order=so, product=products[p_idx],
                defaults=dict(quantity=qty, unit_price=price, total_price=total)
            )
            sos.append(so)
        self.stdout.write(f'  Sales Orders: 10 ready')

        # ── Production Orders (10) ─────────────────────────────
        po_data = [
            (0, 0, 1000, 'completed',   -55, 'high'),
            (1, 1,  800, 'completed',   -50, 'normal'),
            (2, 2, 2000, 'in_progress', -40, 'high'),
            (3, 3, 1500, 'in_progress', -35, 'urgent'),
            (4, 6,  600, 'in_progress', -20, 'normal'),
            (5, 4,  500, 'planned',     -15, 'normal'),
            (6, 5,  300, 'planned',     -12, 'low'),
            (7, 7,  900, 'planned',     -10, 'normal'),
            (8, 0,  400, 'draft',        -5, 'normal'),
            (9, 1,  200, 'draft',        -3, 'low'),
        ]

        prod_orders = []
        for i, (so_idx, p_idx, qty, status, days_ago, priority) in enumerate(po_data):
            sd = self.today + timedelta(days=days_ago)
            prod_num = f'PROD-{sd.strftime("%Y%m%d")}-{i+1:03d}'
            produced = qty if status == 'completed' else (int(qty * 0.6) if status == 'in_progress' else 0)
            po, _ = ProductionOrder.objects.get_or_create(
                po_number=prod_num,
                defaults=dict(
                    company=company,
                    sales_order=sos[so_idx], product=products[p_idx],
                    planned_qty=qty, produced_qty=produced,
                    start_date=sd, delivery_date=sd + timedelta(days=20),
                    priority=priority, status=status,
                    created_by=self.user,
                )
            )
            prod_orders.append(po)
        self.stdout.write(f'  Production Orders: 10 ready')

        # ── Daily Plans (10) ───────────────────────────────────
        dp_data = [
            (0, 0, 0, 200, 'completed', -50),   # Warping
            (0, 2, 1, 180, 'completed', -49),   # Weaving
            (1, 0, 0, 150, 'completed', -45),   # Warping
            (1, 2, 1, 140, 'completed', -44),   # Weaving
            (2, 0, 0, 300, 'in_progress',-38),
            (2, 2, 1, 280, 'planned',   -37),
            (3, 3, 0, 250, 'in_progress',-33),
            (3, 4, 1, 200, 'planned',   -32),
            (4, 5, 2, 100, 'planned',   -18),
            (5, 8, 2, 80,  'planned',   -14),
        ]
        for i, (po_idx, mach_idx, proc_idx, qty, status, days_ago) in enumerate(dp_data):
            pd = self.today + timedelta(days=days_ago)
            DailyPlan.objects.get_or_create(
                company=company, plan_date=pd,
                production_order=prod_orders[po_idx],
                machine=machines[mach_idx],
                defaults=dict(
                    process_stage=processes[proc_idx],
                    planned_qty=qty, actual_qty=qty if status == 'completed' else 0,
                    status=status, created_by=self.user,
                )
            )
        self.stdout.write(f'  Daily Plans: 10 ready')

        # ── Yarn Issues (10) ───────────────────────────────────
        yarn_lots = [l for l in lots if l.material_type == 'yarn'][:5]
        for i, (po_idx, lot_idx, qty, purpose, days_ago) in enumerate([
            (0, 0, 200, 'warp',  -52),
            (0, 1, 150, 'weft',  -52),
            (1, 0, 180, 'warp',  -47),
            (1, 1, 130, 'weft',  -47),
            (2, 2,  80, 'warp',  -39),
            (2, 0, 120, 'warp',  -39),
            (3, 0, 250, 'warp',  -34),
            (3, 1, 180, 'weft',  -34),
            (4, 2,  60, 'warp',  -19),
            (5, 1,  50, 'weft',  -13),
        ]):
            if lot_idx >= len(yarn_lots):
                continue
            yi_date = self.today + timedelta(days=days_ago)
            yi_num = f'YI-{yi_date.strftime("%Y%m%d")}-{i+1:03d}'
            YarnIssue.objects.get_or_create(
                issue_number=yi_num,
                defaults=dict(
                    company=company,
                    production_order=prod_orders[po_idx],
                    lot=yarn_lots[lot_idx],
                    issued_qty=qty, purpose=purpose,
                    issue_date=yi_date, shift='morning',
                    issued_to_machine=machines[0],
                    issued_by='Store Keeper',
                    status='confirmed',
                    created_by=self.user,
                )
            )
        self.stdout.write(f'  Yarn Issues: 10 ready')

        # ── Process Entries + Batches (10 each) ───────────────
        pe_data = [
            (0, 0, 0, 200, 190,  5, 'confirmed', -49),
            (0, 2, 1, 190, 185,  3, 'confirmed', -48),
            (0, 5, 2, 185, 182,  2, 'confirmed', -47),
            (1, 0, 0, 150, 145,  4, 'confirmed', -44),
            (1, 2, 1, 145, 140,  3, 'confirmed', -43),
            (2, 0, 0, 300,   0,  0, 'draft',     -37),
            (2, 2, 1,   0,   0,  0, 'draft',     -36),
            (3, 3, 0, 250,   0,  0, 'draft',     -32),
            (4, 5, 2, 100,   0,  0, 'draft',     -17),
            (5, 8, 2,  80,   0,  0, 'draft',     -13),
        ]

        batches_created = []
        for i, (po_idx, mach_idx, proc_idx, out_qty, batch_qty, rej_qty, status, days_ago) in enumerate(pe_data):
            pe_date = self.today + timedelta(days=days_ago)
            pe_num = f'PE-{pe_date.strftime("%Y%m%d")}-{i+1:03d}'
            pe, pe_new = ProcessEntry.objects.get_or_create(
                entry_number=pe_num,
                defaults=dict(
                    company=company,
                    production_order=prod_orders[po_idx],
                    process_stage=processes[proc_idx],
                    machine=machines[mach_idx],
                    entry_date=pe_date, shift='morning',
                    operator_name='Operator ' + str(i+1),
                    output_quantity=out_qty,
                    rejection_qty=rej_qty,
                    status=status,
                    created_by=self.user,
                )
            )
            # Lot input for confirmed entries
            if status == 'confirmed' and yarn_lots and pe_new:
                lot = yarn_lots[i % len(yarn_lots)]
                ProcessEntryLotInput.objects.get_or_create(
                    process_entry=pe, lot=lot,
                    defaults=dict(quantity_used=out_qty * Decimal('1.05'))
                )

            # Batch for confirmed entries
            if status == 'confirmed' and batch_qty > 0:
                b_num = f'BTH-{pe_date.strftime("%Y%m%d")}-{i+1:03d}'
                batch_status = 'qc_passed' if i < 3 else 'qc_pending'
                b, _ = Batch.objects.get_or_create(
                    batch_number=b_num,
                    defaults=dict(
                        company=company,
                        process_entry=pe,
                        production_order=prod_orders[po_idx],
                        process_stage=processes[proc_idx],
                        quantity=batch_qty, balance_qty=batch_qty,
                        status=batch_status,
                    )
                )
                batches_created.append(b)

        self.stdout.write(f'  Process Entries: 10 | Batches: {len(batches_created)} ready')

        # ── Beam Outward (5) ──────────────────────────────────
        warping_entries = ProcessEntry.objects.filter(
            company=company, process_stage=processes[0], status='confirmed'
        )[:3]
        for i, pe in enumerate(warping_entries):
            bm_num = f'BM-{pe.entry_date.strftime("%Y%m%d")}-{i+1:03d}'
            BeamOutward.objects.get_or_create(
                beam_number=bm_num,
                defaults=dict(
                    company=company, process_entry=pe,
                    quantity=pe.output_quantity,
                    issued_to_machine=machines[2],
                    issue_date=pe.entry_date + timedelta(days=1),
                    notes=f'Beam {i+1} to Weaving Loom 1',
                )
            )
        self.stdout.write(f'  Beam Outward: 3 ready')

        # ── Inspections (10) ──────────────────────────────────
        if batches_created:
            insp_data = [
                ('greige',   'pass',   'greige', 1),
                ('greige',   'pass',   'greige', 2),
                ('bare',     'pass',   'bare',   3),
                ('bare',     'rework', 'bare',   2),
                ('finished', 'pass',   'finished',4),
            ]
            insp_count = 0
            for i, batch in enumerate(batches_created):
                stage, result, cat, insp_qty_factor = insp_data[i % len(insp_data)]
                insp_date = self.today + timedelta(days=-(40 - i*5))
                insp_num = f'QC-{insp_date.strftime("%Y%m%d")}-{i+1:03d}'
                insp_qty = float(batch.quantity)
                passed = insp_qty * 0.95 if result == 'pass' else insp_qty * 0.80
                rejected = insp_qty - passed
                Inspection.objects.get_or_create(
                    inspection_number=insp_num,
                    defaults=dict(
                        company=company, batch=batch,
                        inspection_stage=stage,
                        inspection_date=insp_date,
                        inspected_by='QC Inspector',
                        inspected_qty=insp_qty,
                        passed_qty=passed, rejected_qty=rejected,
                        rework_qty=0,
                        result=result,
                        defect_category='Weaving Defect' if result != 'pass' else '',
                        created_by=self.user,
                    )
                )
                insp_count += 1

            # Sample Tests (5)
            st_count = 0
            for i, batch in enumerate(batches_created[:5]):
                st_date = self.today + timedelta(days=-(38 - i*5))
                st_num = f'ST-{st_date.strftime("%Y%m%d")}-{i+1:03d}'
                SampleTest.objects.get_or_create(
                    test_number=st_num,
                    defaults=dict(
                        company=company, batch=batch,
                        test_date=st_date, tested_by='Lab Tech',
                        tensile_strength=Decimal('450.00'),
                        elongation_pct=Decimal('12.50'),
                        width_cm=batch.production_order.product.width_cm or Decimal('150.00'),
                        weight_per_sqm=batch.production_order.product.gsm or Decimal('200.00'),
                        breaking_strength=Decimal('520.00'),
                        result='pass' if i < 4 else 'fail',
                        remarks='Standard physical test',
                        created_by=self.user,
                    )
                )
                st_count += 1
            self.stdout.write(f'  Inspections: {insp_count} | Sample Tests: {st_count} ready')

            # ── Dispatch (5 entries) ──────────────────────────
            qc_passed_batches = [b for b in batches_created if b.status == 'qc_passed']
            if qc_passed_batches:
                for i, batch in enumerate(qc_passed_batches[:3]):
                    disp_date = self.today + timedelta(days=-(30 - i*5))
                    de_num = f'DE-{disp_date.strftime("%Y%m%d")}-{i+1:03d}'
                    customer = customers[i % len(customers)]
                    so = sos[i % len(sos)]
                    de, de_new = DispatchEntry.objects.get_or_create(
                        dispatch_number=de_num,
                        defaults=dict(
                            company=company, sales_order=so,
                            customer=customer, dispatch_date=disp_date,
                            vehicle_number=f'TN-{38+i:02d}-AB-{1000+i:04d}',
                            driver_name=f'Driver {i+1}',
                            lr_number=f'LR-{2026001+i}',
                            transporter='Sri Murugan Transports',
                            status='confirmed',
                            created_by=self.user,
                        )
                    )
                    if de_new:
                        disp_qty = float(batch.balance_qty)
                        dl = DispatchLine.objects.create(
                            dispatch=de, batch=batch,
                            quantity=disp_qty, rolls=max(1, int(disp_qty / 50)),
                        )
                        # Sales Invoice
                        sinv_num = f'SINV-{disp_date.strftime("%Y%m%d")}-{i+1:03d}'
                        subtotal = Decimal(str(disp_qty)) * Decimal('650')
                        tax = subtotal * Decimal('0.12')
                        SalesInvoice.objects.get_or_create(
                            invoice_number=sinv_num,
                            defaults=dict(
                                company=company, dispatch=de,
                                customer=customer,
                                invoice_date=disp_date,
                                due_date=disp_date + timedelta(days=30),
                                subtotal=subtotal, tax_amount=tax,
                                total_amount=subtotal + tax,
                                paid_amount=subtotal + tax if i == 0 else Decimal('0'),
                                status='paid' if i == 0 else 'sent',
                                created_by=self.user,
                            )
                        )
                self.stdout.write(f'  Dispatch: {len(qc_passed_batches[:3])} entries + invoices ready')

    # ── Quality: Defect Types ─────────────────────────────────
    def seed_quality_defect_types(self, company):
        from quality.models import DefectType
        data = [
            ('Broken End',          'greige',   'Warp thread breakage during weaving'),
            ('Float',               'greige',   'Warp or weft not interlaced correctly'),
            ('Reed Mark',           'greige',   'Visible reed line in fabric'),
            ('Weft Missing',        'greige',   'Missing pick in weave structure'),
            ('Stain',               'bare',     'Oil or chemical stain on fabric'),
            ('Width Variation',     'bare',     'Fabric width outside spec range'),
            ('GSM Deviation',       'finished', 'Weight per sqm outside tolerance'),
            ('Tensile Failure',     'finished', 'Below minimum tensile strength'),
            ('Color Defect',        'bare',     'Uneven dyeing or color bleeding'),
            ('Hole / Tear',         'finished', 'Physical damage in fabric'),
        ]
        count = 0
        for name, stage, desc in data:
            _, created = DefectType.objects.get_or_create(
                company=company, name=name,
                defaults=dict(stage=stage, description=desc, is_active=True)
            )
            if created:
                count += 1
        self.stdout.write(f'  Defect Types: {count} created')

    # ── Customer Forecast (3 months) ─────────────────────────
    def seed_forecast(self, company, customers, products):
        from planning.models import CustomerForecast, ForecastLine
        import calendar

        today = self.today
        m1 = today.replace(day=1)
        m2 = (m1.replace(day=28) + timedelta(days=4)).replace(day=1)
        m3 = (m2.replace(day=28) + timedelta(days=4)).replace(day=1)
        m1_lbl = m1.strftime('%b %Y')
        m2_lbl = m2.strftime('%b %Y')
        m3_lbl = m3.strftime('%b %Y')
        m3_last = m3.replace(day=calendar.monthrange(m3.year, m3.month)[1])

        fc_data = [
            (0, f'{m1_lbl}–{m3_lbl} Forecast — Apollo Hospitals',
             [(0,  500,  600,  550), (6,  300,  350,  320), (7,  200,  220,  210)]),
            (2, f'{m1_lbl}–{m3_lbl} Forecast — L&T Construction',
             [(2, 1500, 2000, 1800), (3,  800, 1000,  900)]),
            (4, f'{m1_lbl}–{m3_lbl} Forecast — Bharat Agriculture',
             [(4,  400,  500,  450), (8,  300,  350,  320)]),
        ]

        for c_idx, title, lines in fc_data:
            fc, fc_new = CustomerForecast.objects.get_or_create(
                company=company, customer=customers[c_idx], title=title,
                defaults=dict(
                    period_from=m1, period_to=m3_last,
                    month_1_label=m1_lbl, month_2_label=m2_lbl, month_3_label=m3_lbl,
                    status='confirmed', created_by=self.user,
                )
            )
            if fc_new:
                for p_idx, q1, q2, q3 in lines:
                    ForecastLine.objects.create(
                        forecast=fc, product=products[p_idx],
                        month_1_qty=q1, month_2_qty=q2, month_3_qty=q3,
                        uom='kg',
                    )

        self.stdout.write(f'  Customer Forecasts: 3 confirmed (with lines)')
