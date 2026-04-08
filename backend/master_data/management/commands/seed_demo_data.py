# ============================================================
# Management Command: seed_demo_data
# Run: python manage.py seed_demo_data
# Seeds ~10 related records per module for demo/testing.
# SAFE: uses get_or_create — will NOT duplicate existing data.
# ============================================================

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from datetime import date, timedelta
from decimal import Decimal

User = get_user_model()

# lazy import inside methods to avoid circular imports at module level


class Command(BaseCommand):
    help = 'Seed demo data — 10 related records per module.'

    def handle(self, *args, **options):
        self.user = User.objects.filter(is_superuser=True).first()
        self.today = date.today()

        self.stdout.write('\n=== SASI ERP — Demo Data Seed ===\n')

        with transaction.atomic():
            units      = self.seed_units()
            cats       = self.seed_categories()
            items      = self.seed_items(units, cats)
            warehouses = self.seed_warehouses()
            suppliers  = self.seed_suppliers()
            customers  = self.seed_customers()
            depts      = self.seed_departments()
            self.seed_employees(depts)
            batches    = self.seed_purchasing(suppliers, items, warehouses)
            self.seed_stock(items, warehouses)
            self.seed_inquiries_quotations(customers)
            self.seed_sales(customers, items, warehouses)
            self.seed_production(items, warehouses, batches)
            self.seed_technical(items, customers)
            self.seed_medical(items, batches)
            self.seed_finance()

        self.stdout.write(self.style.SUCCESS('\n=== All demo data seeded successfully! ===\n'))

    # ──────────────────────────────────────────────────────────
    # UNITS OF MEASURE
    # ──────────────────────────────────────────────────────────
    def seed_units(self):
        from master_data.models import UnitOfMeasure
        units_data = [
            ('Kilogram',  'kg'),
            ('Meter',     'm'),
            ('Roll',      'roll'),
            ('Piece',     'pcs'),
            ('Liter',     'ltr'),
        ]
        units = []
        for name, short in units_data:
            u, _ = UnitOfMeasure.objects.get_or_create(name=name, defaults={'short_name': short})
            units.append(u)
        self.stdout.write(f'  Units: {len(units)} ready')
        return units

    # ──────────────────────────────────────────────────────────
    # ITEM CATEGORIES
    # ──────────────────────────────────────────────────────────
    def seed_categories(self):
        from master_data.models import ItemCategory
        cats_data = ['Raw Material', 'Medical Textile', 'Technical Textile', 'Finished Goods', 'Chemicals']
        cats = []
        for name in cats_data:
            c, _ = ItemCategory.objects.get_or_create(name=name)
            cats.append(c)
        self.stdout.write(f'  Categories: {len(cats)} ready')
        return cats

    # ──────────────────────────────────────────────────────────
    # ITEMS  (4 raw materials + 6 finished goods)
    # ──────────────────────────────────────────────────────────
    def seed_items(self, units, cats):
        from master_data.models import Item
        from master_data.doc_series_utils import generate_next_number

        kg, m, roll, pcs, ltr = units
        rm_cat, med_cat, tech_cat, fg_cat, chem_cat = cats

        items_data = [
            # (name, type, category, uom, min_stock, price, yarn_count, composition)
            ('Medical Grade Cotton Yarn',   'raw_material', rm_cat,   kg,   500, 180,  '30s Ne', '100% Cotton'),
            ('Polyester Staple Fiber',      'raw_material', rm_cat,   kg,   300, 95,   '20s Ne', '100% Polyester'),
            ('Elastic Thread',              'raw_material', rm_cat,   roll, 100, 250,  '—',      '80% Polyester 20% Rubber'),
            ('Non-woven Polypropylene',     'raw_material', rm_cat,   kg,   200, 75,   '—',      '100% Polypropylene'),
            ('Medical Bandage Fabric',      'finished_good', med_cat, m,    200, 420,  '—',      '100% Cotton'),
            ('Surgical Drape Material',     'finished_good', med_cat, m,    150, 680,  '—',      '70% Cotton 30% Polyester'),
            ('Wound Dressing Base',         'finished_good', med_cat, m,    100, 550,  '—',      '100% Cotton Gauze'),
            ('Geotextile Woven Fabric',     'finished_good', tech_cat, m,   100, 320,  '—',      '100% Polypropylene'),
            ('Safety Net Material',         'finished_good', tech_cat, m,   50,  290,  '—',      '100% HDPE'),
            ('Industrial Filter Fabric',    'finished_good', tech_cat, m,   80,  480,  '—',      '100% Polyester'),
        ]

        items = []
        for name, itype, cat, uom, min_s, price, yarn, comp in items_data:
            code = generate_next_number('item') or f'IT-{len(items)+1:03d}'
            obj, created = Item.objects.get_or_create(
                item_name=name,
                defaults=dict(
                    item_code=code, item_type=itype,
                    category=cat, unit_of_measure=uom,
                    minimum_stock=min_s, standard_price=price,
                    yarn_count=yarn, composition=comp, is_active=True,
                )
            )
            items.append(obj)
        self.stdout.write(f'  Items: {len(items)} ready')
        return items

    # ──────────────────────────────────────────────────────────
    # WAREHOUSES
    # ──────────────────────────────────────────────────────────
    def seed_warehouses(self):
        from master_data.models import Warehouse
        from master_data.doc_series_utils import generate_next_number

        wh_data = [
            ('Raw Material Store',    'Raw material incoming and storage'),
            ('Finished Goods Store',  'Finished product storage and QC'),
            ('Dispatch Store',        'Ready for dispatch and shipping'),
        ]
        warehouses = []
        for name, addr in wh_data:
            code = generate_next_number('warehouse') or f'WH-{len(warehouses)+1:03d}'
            obj, _ = Warehouse.objects.get_or_create(
                name=name,
                defaults=dict(code=code, address=addr, is_active=True)
            )
            warehouses.append(obj)
        self.stdout.write(f'  Warehouses: {len(warehouses)} ready')
        return warehouses

    # ──────────────────────────────────────────────────────────
    # SUPPLIERS
    # ──────────────────────────────────────────────────────────
    def seed_suppliers(self):
        from master_data.models import Supplier
        from master_data.doc_series_utils import generate_next_number

        sup_data = [
            ('Coimbatore Yarn Mills',      'yarn_supplier',        'Ravi Kumar',   '9876543210', 'Coimbatore', 'Tamil Nadu'),
            ('Rajasthan Fiber Pvt Ltd',    'other',               'Suresh Joshi', '9812345678', 'Jaipur',     'Rajasthan'),
            ('Chennai Elastic Co',         'other',               'Anbu Raj',     '9811122233', 'Chennai',    'Tamil Nadu'),
            ('Mumbai Polymer Supplies',    'chemical_supplier',   'Vinod Shah',   '9900011223', 'Mumbai',     'Maharashtra'),
            ('Karnataka Chemicals Ltd',    'chemical_supplier',   'Priya Nair',   '9944556677', 'Bengaluru',  'Karnataka'),
            ('Tirupur Thread Works',       'yarn_supplier',       'Murugan S',    '9865432100', 'Tirupur',    'Tamil Nadu'),
            ('Delhi Nonwoven Fabrics',     'other',               'Amit Gupta',   '9810099887', 'Delhi',      'Delhi'),
            ('Surat Textile Traders',      'other',               'Harsh Patel',  '9898776655', 'Surat',      'Gujarat'),
            ('Ludhiana Fiber Mills',       'other',               'Gurpreet S',   '9876611223', 'Ludhiana',   'Punjab'),
            ('Erode Cotton Suppliers',     'yarn_supplier',       'Selvam R',     '9944321099', 'Erode',      'Tamil Nadu'),
        ]
        suppliers = []
        for name, stype, contact, phone, city, state in sup_data:
            code = generate_next_number('supplier') or f'SUP-{len(suppliers)+1:03d}'
            obj, _ = Supplier.objects.get_or_create(
                supplier_name=name,
                defaults=dict(
                    supplier_code=code, supplier_type=stype,
                    contact_person=contact, phone=phone,
                    city=city, state=state, country='India', is_active=True,
                )
            )
            suppliers.append(obj)
        self.stdout.write(f'  Suppliers: {len(suppliers)} ready')
        return suppliers

    # ──────────────────────────────────────────────────────────
    # CUSTOMERS
    # ──────────────────────────────────────────────────────────
    def seed_customers(self):
        from master_data.models import Customer
        from master_data.doc_series_utils import generate_next_number

        cust_data = [
            ('Apollo Hospitals Ltd',          'domestic',      'Dr. Ramesh',   '9944001122', 'Chennai',    'Tamil Nadu',  30),
            ('Cipla Medical Devices',         'domestic',      'Kiran Mehta',  '9922334455', 'Mumbai',     'Maharashtra', 45),
            ('L&T Construction Ltd',          'domestic',      'Sanjay Rao',   '9911556677', 'Hyderabad',  'Telangana',   30),
            ('SAIL Steel Plants',             'domestic',      'Dinesh Kumar', '9800112233', 'Bhubaneswar','Odisha',       60),
            ('Bharat Agriculture Co',         'domestic',      'Mohan Verma',  '9855443322', 'Nagpur',     'Maharashtra', 30),
            ('Medanta Medical Centre',        'domestic',      'Dr. Priya',    '9911223344', 'Gurgaon',    'Haryana',     30),
            ('Sun Pharma Industries',         'both',          'Rakesh Shah',  '9977665544', 'Vadodara',   'Gujarat',     45),
            ('Tata Projects Ltd',             'domestic',      'Anand Pillai', '9933112244', 'Mumbai',     'Maharashtra', 30),
            ('Mahindra Agro Supplies',        'domestic',      'Vijay Naik',   '9800998877', 'Pune',       'Maharashtra', 30),
            ('National Geotextile Corp',      'export',        'Suresh Iyer',  '9876001234', 'Coimbatore', 'Tamil Nadu',  45),
        ]
        customers = []
        for name, ctype, contact, phone, city, state, credit in cust_data:
            code = generate_next_number('customer') or f'CUS-{len(customers)+1:03d}'
            obj, _ = Customer.objects.get_or_create(
                customer_name=name,
                defaults=dict(
                    customer_code=code, customer_type=ctype,
                    contact_person=contact, phone=phone,
                    city=city, state=state, country='India',
                    credit_days=credit, is_active=True,
                )
            )
            customers.append(obj)
        self.stdout.write(f'  Customers: {len(customers)} ready')
        return customers

    # ──────────────────────────────────────────────────────────
    # DEPARTMENTS
    # ──────────────────────────────────────────────────────────
    def seed_departments(self):
        from hr_payroll.models import Department
        dept_data = [
            ('Production',       'PROD'),
            ('Quality Control',  'QC'),
            ('Sales',            'SALES'),
            ('Finance',          'FIN'),
            ('HR',               'HR'),
        ]
        depts = []
        for name, code in dept_data:
            d, _ = Department.objects.get_or_create(name=name, defaults={'code': code})
            depts.append(d)
        self.stdout.write(f'  Departments: {len(depts)} ready')
        return depts

    # ──────────────────────────────────────────────────────────
    # EMPLOYEES
    # ──────────────────────────────────────────────────────────
    def seed_employees(self, depts):
        from hr_payroll.models import Employee
        from master_data.doc_series_utils import generate_next_number

        prod, qc, sales, fin, hr = depts
        emp_data = [
            ('Ramesh',    'Kumar',    'male',   prod,  'Production Manager',  'permanent', 45000, '2022-04-01'),
            ('Priya',     'Nair',     'female', qc,    'QC Inspector',        'permanent', 32000, '2022-06-15'),
            ('Suresh',    'Patel',    'male',   sales, 'Sales Executive',     'permanent', 38000, '2023-01-10'),
            ('Anitha',    'Raj',      'female', fin,   'Accountant',          'permanent', 35000, '2021-09-01'),
            ('Vijay',     'Sharma',   'male',   prod,  'Machine Operator',    'permanent', 28000, '2023-03-15'),
            ('Meena',     'Devi',     'female', hr,    'HR Executive',        'permanent', 30000, '2022-11-01'),
            ('Karthik',   'S',        'male',   prod,  'Shift Supervisor',    'permanent', 36000, '2021-07-20'),
            ('Lakshmi',   'Pillai',   'female', qc,    'Lab Technician',      'contract',  25000, '2023-08-01'),
            ('Murugan',   'Thangam',  'male',   prod,  'Weaving Operator',    'permanent', 27000, '2022-02-14'),
            ('Deepa',     'Krishnan', 'female', sales, 'Customer Relations',  'permanent', 32000, '2023-05-01'),
        ]
        count = 0
        for fname, lname, gender, dept, desig, etype, salary, doj in emp_data:
            code = generate_next_number('employee') or f'EMP-{count+1:03d}'
            _, created = Employee.objects.get_or_create(
                first_name=fname, last_name=lname,
                defaults=dict(
                    employee_code=code, gender=gender, department=dept,
                    designation=desig, employment_type=etype,
                    basic_salary=salary, date_of_joining=doj, status='active',
                )
            )
            if created:
                count += 1
        self.stdout.write(f'  Employees: {count} created (existing skipped)')

    # ──────────────────────────────────────────────────────────
    # PURCHASING  (10 POs + 5 GRNs)
    # ──────────────────────────────────────────────────────────
    def seed_purchasing(self, suppliers, items, warehouses):
        from purchasing.models import PurchaseOrder, PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine
        from master_data.doc_series_utils import generate_next_number

        raw_wh = warehouses[0]
        raw_items = items[:4]   # first 4 are raw materials

        po_configs = [
            (suppliers[0], raw_items[0], 1000, 180,  -90),
            (suppliers[1], raw_items[1], 800,  95,   -75),
            (suppliers[2], raw_items[2], 200,  250,  -60),
            (suppliers[3], raw_items[3], 500,  75,   -45),
            (suppliers[0], raw_items[0], 600,  180,  -30),
            (suppliers[1], raw_items[1], 400,  95,   -20),
            (suppliers[4], raw_items[3], 300,  75,   -15),
            (suppliers[5], raw_items[0], 700,  185,  -10),
            (suppliers[6], raw_items[3], 450,  78,   -5),
            (suppliers[9], raw_items[0], 500,  182,   0),
        ]

        batches = []
        po_count = 0
        for i, (sup, item, qty, price, days_ago) in enumerate(po_configs):
            order_date = self.today + timedelta(days=days_ago)
            po_num = generate_next_number('purchase_order') or f'PO-DEMO-{i+1:03d}'
            po, created = PurchaseOrder.objects.get_or_create(
                po_number=po_num,
                defaults=dict(
                    supplier=sup, warehouse=raw_wh,
                    order_date=order_date,
                    expected_date=order_date + timedelta(days=14),
                    status='confirmed', notes=f'Demo PO {i+1}',
                )
            )
            if created:
                total = Decimal(str(qty * price))
                po_line = PurchaseOrderLine.objects.create(
                    purchase_order=po, item=item,
                    ordered_quantity=qty, unit_price=price, total_price=total,
                )
                po.total_amount = total
                po.save(update_fields=['total_amount'])
                po_count += 1

            # Create GRN for first 5 POs
            if i < 5 and created:
                grn_num = generate_next_number('grn') or f'GRN-DEMO-{i+1:03d}'
                grn = GoodsReceipt.objects.create(
                    grn_number=grn_num,
                    purchase_order=po,
                    receipt_date=order_date + timedelta(days=10),
                    status='confirmed',
                )
                GoodsReceiptLine.objects.create(
                    goods_receipt=grn, purchase_order_line=po_line,
                    item=item, received_quantity=qty,
                )

        self.stdout.write(f'  Purchase Orders: {po_count} created')

        # Return batches created from production (empty for now)
        return batches

    # ──────────────────────────────────────────────────────────
    # STOCK  (add directly so dashboard shows values)
    # ──────────────────────────────────────────────────────────
    def seed_stock(self, items, warehouses):
        from inventory.models import Stock

        raw_wh = warehouses[0]
        fg_wh  = warehouses[1]

        stock_data = [
            (items[0], raw_wh, 1800),   # Cotton Yarn
            (items[1], raw_wh, 1200),   # Polyester Fiber
            (items[2], raw_wh, 350),    # Elastic Thread
            (items[3], raw_wh, 850),    # Non-woven PP
            (items[4], fg_wh,  420),    # Medical Bandage
            (items[5], fg_wh,  280),    # Surgical Drape
            (items[6], fg_wh,  180),    # Wound Dressing
            (items[7], fg_wh,  520),    # Geotextile
            (items[8], fg_wh,  95),     # Safety Net  ← below min_stock (100)
            (items[9], fg_wh,  60),     # Filter Fabric ← below min_stock (80)
        ]
        for item, wh, qty in stock_data:
            Stock.objects.update_or_create(
                item=item, warehouse=wh,
                defaults={'quantity': qty}
            )
        self.stdout.write(f'  Stock: {len(stock_data)} entries set (2 low-stock alerts)')

    # ──────────────────────────────────────────────────────────
    # INQUIRIES + QUOTATIONS  (10 each)
    # ──────────────────────────────────────────────────────────
    def seed_inquiries_quotations(self, customers):
        from sales.models import CustomerInquiry, Quotation
        from master_data.doc_series_utils import generate_next_number

        inq_data = [
            (customers[0], 'Medical Bandage Fabric 100GSM',          'medical',       500,  'meters', 420,  -60),
            (customers[1], 'Surgical Drape 60GSM non-sterile',        'medical',       300,  'meters', 680,  -55),
            (customers[2], 'Geotextile woven 200GSM for road base',   'geotextile',    2000, 'meters', 320,  -50),
            (customers[3], 'Safety Net HDPE 500GSM',                  'safety',        1000, 'meters', 290,  -45),
            (customers[4], 'Filter Fabric 150GSM agriculture use',    'filtration',    800,  'meters', 480,  -40),
            (customers[5], 'Medical Bandage sterile grade 80GSM',     'medical',       400,  'meters', 450,  -35),
            (customers[6], 'Wound Dressing gauze 60GSM',              'medical',       250,  'meters', 550,  -30),
            (customers[7], 'Geotextile non-woven 150GSM',             'geotextile',    3000, 'meters', 280,  -25),
            (customers[8], 'Safety Net agriculture bird netting',      'safety',        500,  'meters', 300,  -20),
            (customers[9], 'Technical Fabric export quality',         'other',         1500, 'meters', 350,  -15),
        ]

        inqs = []
        qt_count = 0
        for i, (cust, desc, end_use, qty, unit, price, days_ago) in enumerate(inq_data):
            rec_date = self.today + timedelta(days=days_ago)
            status = 'quoted' if i < 8 else 'new'
            inq_num = generate_next_number('inquiry') or f'INQ-DEMO-{i+1:03d}'
            inq, created = CustomerInquiry.objects.get_or_create(
                inquiry_number=inq_num,
                defaults=dict(
                    customer=cust, received_date=rec_date,
                    product_description=desc, end_use=end_use,
                    quantity_required=qty, unit=unit, target_price=price,
                    required_by_date=rec_date + timedelta(days=30),
                    status=status, created_by=self.user,
                )
            )
            inqs.append(inq)

            # Quotation for each inquiry
            if created:
                qt_num = generate_next_number('quotation') or f'QT-DEMO-{i+1:03d}'
                total = Decimal(str(qty)) * Decimal(str(price))
                qt_status = 'accepted' if i < 5 else ('sent' if i < 8 else 'draft')
                Quotation.objects.get_or_create(
                    quotation_number=qt_num,
                    defaults=dict(
                        inquiry=inq, customer=cust,
                        date=rec_date + timedelta(days=3),
                        valid_until=rec_date + timedelta(days=33),
                        product_description=desc,
                        quantity=qty, unit=unit,
                        unit_price=price, total_amount=total,
                        lead_time_days=21, status=qt_status,
                        payment_terms='30 days net',
                        delivery_terms='Ex-Works Coimbatore',
                    )
                )
                qt_count += 1

        self.stdout.write(f'  Inquiries: {len(inqs)} | Quotations: {qt_count} created')

    # ──────────────────────────────────────────────────────────
    # SALES ORDERS + INVOICES  (10 SOs, 5 Invoices)
    # ──────────────────────────────────────────────────────────
    def seed_sales(self, customers, items, warehouses):
        from sales.models import SalesOrder, SalesOrderLine, Invoice
        from master_data.doc_series_utils import generate_next_number

        fg_wh = warehouses[1]
        fg_items = items[4:]   # finished goods

        so_data = [
            (customers[0], fg_items[0], 500,  420, 'delivered', -80),
            (customers[1], fg_items[1], 300,  680, 'delivered', -70),
            (customers[2], fg_items[3], 2000, 320, 'delivered', -60),
            (customers[3], fg_items[4], 1000, 290, 'delivered', -50),
            (customers[4], fg_items[5], 800,  480, 'delivered', -40),
            (customers[5], fg_items[0], 400,  435, 'confirmed', -30),
            (customers[6], fg_items[2], 250,  565, 'confirmed', -20),
            (customers[7], fg_items[3], 1500, 335, 'partial',   -15),
            (customers[8], fg_items[4], 600,  305, 'confirmed', -10),
            (customers[9], fg_items[5], 1200, 495, 'draft',      -5),
        ]

        so_count = inv_count = 0
        for i, (cust, item, qty, price, status, days_ago) in enumerate(so_data):
            ord_date = self.today + timedelta(days=days_ago)
            so_num = generate_next_number('sales_order') or f'SO-DEMO-{i+1:03d}'
            total = Decimal(str(qty)) * Decimal(str(price))
            so, created = SalesOrder.objects.get_or_create(
                so_number=so_num,
                defaults=dict(
                    customer=cust, warehouse=fg_wh,
                    order_date=ord_date,
                    delivery_date=ord_date + timedelta(days=21),
                    status=status, total_amount=total,
                    created_by=self.user,
                )
            )
            if created:
                so_count += 1
                SalesOrderLine.objects.create(
                    sales_order=so, item=item,
                    ordered_quantity=qty, unit_price=price, total_price=total,
                )

            # Invoice for first 5 delivered SOs
            if i < 5 and created:
                inv_num = generate_next_number('invoice') or f'INV-DEMO-{i+1:03d}'
                paid_amount = total if i < 3 else Decimal('0')
                inv_status = 'paid' if i < 3 else 'sent'
                Invoice.objects.get_or_create(
                    invoice_number=inv_num,
                    defaults=dict(
                        sales_order=so, customer=cust,
                        invoice_date=ord_date + timedelta(days=25),
                        due_date=ord_date + timedelta(days=55),
                        subtotal=total, tax_amount=total * Decimal('0.18'),
                        total_amount=total * Decimal('1.18'),
                        paid_amount=paid_amount * Decimal('1.18') if i < 3 else Decimal('0'),
                        status=inv_status,
                    )
                )
                inv_count += 1

        self.stdout.write(f'  Sales Orders: {so_count} | Invoices: {inv_count} created')

    # ──────────────────────────────────────────────────────────
    # PRODUCTION  (3 BOMs + 5 Work Orders + 3 Batches)
    # ──────────────────────────────────────────────────────────
    def seed_production(self, items, warehouses, _batches):
        from production.models import BillOfMaterials, BOMLine, WorkOrder, Batch
        from master_data.doc_series_utils import generate_next_number

        fg_wh = warehouses[1]
        raw_items = items[:4]
        fg_items  = items[4:]

        bom_configs = [
            (fg_items[0], 'Medical Bandage BOM',   [(raw_items[0], 1.2), (raw_items[2], 0.1)]),
            (fg_items[1], 'Surgical Drape BOM',    [(raw_items[0], 0.8), (raw_items[1], 0.5)]),
            (fg_items[3], 'Geotextile BOM',        [(raw_items[3], 1.5), (raw_items[1], 0.3)]),
        ]

        boms = []
        for fg_item, bom_name, lines in bom_configs:
            bom, created = BillOfMaterials.objects.get_or_create(
                bom_name=bom_name,
                defaults=dict(
                    finished_product=fg_item, quantity_produced=1,
                    status='active', created_by=self.user,
                )
            )
            if created:
                for raw_item, qty in lines:
                    BOMLine.objects.create(bom=bom, raw_material=raw_item, quantity=qty)
            boms.append(bom)

        wo_configs = [
            (boms[0], fg_items[0], 500,  'completed',   -60),
            (boms[1], fg_items[1], 300,  'completed',   -45),
            (boms[2], fg_items[3], 2000, 'in_progress', -20),
            (boms[0], fg_items[0], 400,  'confirmed',   -10),
            (boms[1], fg_items[1], 200,  'draft',        -3),
        ]

        wo_count = batch_count = 0
        for i, (bom, fg_item, qty, status, days_ago) in enumerate(wo_configs):
            start = self.today + timedelta(days=days_ago)
            wo_num = generate_next_number('work_order') or f'WO-DEMO-{i+1:03d}'
            wo, created = WorkOrder.objects.get_or_create(
                work_order_number=wo_num,
                defaults=dict(
                    bom=bom, finished_product=fg_item,
                    planned_quantity=qty, actual_quantity=qty if status == 'completed' else 0,
                    warehouse=fg_wh,
                    planned_start_date=start,
                    planned_end_date=start + timedelta(days=7),
                    actual_start_date=start if status in ('completed','in_progress') else None,
                    actual_end_date=start + timedelta(days=6) if status == 'completed' else None,
                    status=status, created_by=self.user,
                )
            )
            if created:
                wo_count += 1

            # Batch for completed WOs
            if created and status == 'completed':
                bat_num = generate_next_number('batch') or f'BAT-DEMO-{i+1:03d}'
                Batch.objects.get_or_create(
                    batch_number=bat_num,
                    defaults=dict(
                        work_order=wo,
                        item=fg_item,
                        quantity_produced=qty,
                        production_date=start + timedelta(days=6),
                    )
                )
                batch_count += 1

        self.stdout.write(f'  BOMs: {len(boms)} | Work Orders: {wo_count} | Batches: {batch_count} created')

    # ──────────────────────────────────────────────────────────
    # TECHNICAL TEXTILE
    # ──────────────────────────────────────────────────────────
    def seed_technical(self, items, customers):
        from technical_textile.models import (
            TechnicalProductCategory, PerformanceSpec,
            Sample, TechnicalDataSheet, TestingLabRecord, RDProject,
        )
        from master_data.doc_series_utils import generate_next_number

        # Categories
        cat_data = [
            ('Geotextile',   'GEO',  'Road construction, drainage, slope stabilization'),
            ('Medical',      'MED',  'Medical devices, wound care, surgical'),
            ('Safety',       'SAF',  'Safety nets, fall protection, industrial'),
            ('Filtration',   'FLT',  'Air and liquid filtration'),
            ('Agriculture',  'AGR',  'Shade nets, mulch films, crop protection'),
        ]
        tech_cats = []
        for name, code, app in cat_data:
            c, _ = TechnicalProductCategory.objects.get_or_create(
                name=name, defaults={'code': code, 'application': app}
            )
            tech_cats.append(c)

        fg_items = items[4:]

        # Performance Specs (one per finished good)
        specs = []
        spec_data = [
            (fg_items[0], tech_cats[1], 80,  160, 250, 300),
            (fg_items[1], tech_cats[1], 60,  100, 180, 220),
            (fg_items[2], tech_cats[1], 100, 180, 300, 380),
            (fg_items[3], tech_cats[0], 200, 210, 800, 600),
            (fg_items[4], tech_cats[2], 500, 210, 1200, 900),
            (fg_items[5], tech_cats[3], 150, 200, 600, 500),
        ]
        for item, cat, gsm, width, t_warp, t_weft in spec_data:
            spec, _ = PerformanceSpec.objects.get_or_create(
                item=item, spec_version='v1.0',
                defaults=dict(
                    category=cat, status='approved',
                    gsm=gsm, width_cm=width,
                    tensile_strength_warp=t_warp,
                    tensile_strength_weft=t_weft,
                    composition=item.composition,
                    standard_reference='IS 1954 / ASTM D4595',
                    created_by=self.user,
                )
            )
            specs.append(spec)

        # Samples (10)
        sample_statuses = ['approved', 'approved', 'sent', 'sent', 'approved', 'prepared', 'sent', 'rejected', 'approved', 'prepared']
        smp_count = 0
        for i in range(10):
            smp_num = generate_next_number('sample') or f'SMP-DEMO-{i+1:03d}'
            _, created = Sample.objects.get_or_create(
                sample_number=smp_num,
                defaults=dict(
                    item=fg_items[i % len(fg_items)],
                    customer=customers[i % len(customers)],
                    quantity=5, status=sample_statuses[i],
                    sent_date=self.today + timedelta(days=-(60 - i*5)),
                    approved_date=self.today + timedelta(days=-(50 - i*5)) if 'approved' in sample_statuses[i] else None,
                    internal_notes=f'Sample batch {i+1} for customer evaluation',
                    created_by=self.user,
                )
            )
            if created:
                smp_count += 1

        # TDS (5)
        tds_count = 0
        for i in range(5):
            tds_num = generate_next_number('tds') or f'TDS-DEMO-{i+1:03d}'
            _, created = TechnicalDataSheet.objects.get_or_create(
                tds_number=tds_num,
                defaults=dict(
                    item=fg_items[i],
                    spec=specs[i] if i < len(specs) else None,
                    issue_date=self.today + timedelta(days=-(90 - i*10)),
                    revision_number='R0',
                    status='issued',
                    prepared_by='Quality Team',
                    approved_by='QC Manager',
                )
            )
            if created:
                tds_count += 1

        # Test Reports (5)
        tst_count = 0
        for i in range(5):
            tst_num = generate_next_number('test_report') or f'TST-DEMO-{i+1:03d}'
            result = 'pass' if i < 4 else 'fail'
            _, created = TestingLabRecord.objects.get_or_create(
                test_number=tst_num,
                defaults=dict(
                    item=fg_items[i],
                    test_type='physical',
                    test_date=self.today + timedelta(days=-(80 - i*10)),
                    tested_by='Lab Technician',
                    lab_name='SASI Internal QC Lab',
                    gsm_actual=specs[i].gsm if i < len(specs) and specs[i].gsm else 80,
                    tensile_warp_actual=specs[i].tensile_strength_warp if i < len(specs) and specs[i].tensile_strength_warp else 250,
                    overall_result=result,
                    standard_used='IS 1954 / ASTM D4595',
                    created_by=self.user,
                )
            )
            if created:
                tst_count += 1

        # R&D Projects (5)
        rd_count = 0
        rd_data = [
            ('Antimicrobial Bandage Development',     'Develop silver-ion coated bandage fabric',           tech_cats[1]),
            ('High-Strength Geotextile for Highways', 'Develop 400GSM woven geotextile for NH projects',    tech_cats[0]),
            ('Biodegradable Safety Net',              'Eco-friendly PLA-based safety net material',         tech_cats[2]),
            ('Nano-coated Filter Fabric',             'Develop PTFE nano-coated filtration membrane',       tech_cats[3]),
            ('UV-Resistant Agriculture Net',          'UV stabilised 200GSM shade net for greenhouses',     tech_cats[4]),
        ]
        for i, (name, obj, cat) in enumerate(rd_data):
            rd_num = generate_next_number('rd_project') or f'RD-DEMO-{i+1:03d}'
            status = ['in_progress', 'in_progress', 'testing', 'in_progress', 'completed'][i]
            _, created = RDProject.objects.get_or_create(
                project_number=rd_num,
                defaults=dict(
                    project_name=name, objective=obj, category=cat,
                    target_product=name,
                    start_date=self.today + timedelta(days=-(120 - i*15)),
                    target_end_date=self.today + timedelta(days=(90 - i*10)),
                    status=status, created_by=self.user,
                )
            )
            if created:
                rd_count += 1

        self.stdout.write(f'  Tech — Samples:{smp_count} | TDS:{tds_count} | Tests:{tst_count} | R&D:{rd_count}')

    # ──────────────────────────────────────────────────────────
    # MEDICAL TEXTILE
    # ──────────────────────────────────────────────────────────
    def seed_medical(self, items, batches):
        from medical_textile.models import CAPA, RegulatoryCompliance
        from master_data.doc_series_utils import generate_next_number

        med_items = items[4:7]  # Medical finished goods

        # CAPAs (10)
        capa_data = [
            ('corrective', 'customer_complaint', 'Customer reported pilling on bandage fabric. GSM below spec.', 'open',      0),
            ('corrective', 'internal_audit',     'Moisture content > 8% in yarn lot INV-202501.',              'in_progress',-10),
            ('preventive', 'process_deviation',  'Preventive CAPA on loom tension settings review.',           'open',      -15),
            ('corrective', 'supplier_issue',     'Polyester fiber lot rejected — denier mismatch.',            'closed',    -45),
            ('corrective', 'customer_complaint', 'Tensile strength below IS 1954 in geotextile sample.',       'open',      -20),
            ('preventive', 'internal_audit',     'CAPA to implement pre-dispatch sampling protocol.',          'in_progress',-30),
            ('corrective', 'product_failure',    'Non-conformance in sterility test — EO cycle failure.',      'overdue',   -60),
            ('corrective', 'process_deviation',  'Width variation > 2% observed in fabric finishing.',         'in_progress',-25),
            ('preventive', 'supplier_issue',     'Preventive CAPA on supplier qualification process.',         'open',       -5),
            ('corrective', 'customer_complaint', 'Color bleeding reported in surgical drape — dye issue.',     'closed',    -50),
        ]
        capa_count = 0
        for i, (ctype, source, desc, status, days_ago) in enumerate(capa_data):
            capa_num = generate_next_number('capa') or f'CAPA-DEMO-{i+1:03d}'
            target = self.today + timedelta(days=(30 - i*3))
            _, created = CAPA.objects.get_or_create(
                capa_number=capa_num,
                defaults=dict(
                    capa_type=ctype, source=source, description=desc,
                    responsible_person=['Ramesh Kumar', 'Priya Nair', 'QC Manager'][i % 3],
                    target_date=target,
                    status=status,
                    related_item=med_items[i % len(med_items)],
                    created_by=self.user,
                )
            )
            if created:
                capa_count += 1

        # Regulatory Compliance Certificates (10)
        comp_data = [
            (med_items[0], 'bis',      'CERT-IS-001', 'BIS Bureau of Indian Standards', -365, 365),
            (med_items[1], 'ce_mark', 'CE-2024-045', 'TUV Rheinland Germany',          -300, 365),
            (med_items[0], 'iso_13485','ISO-QMS-2024','DNV GL Certification',           -400, 365),
            (med_items[2], 'bis',      'CERT-IS-002', 'BIS Bureau of Indian Standards', -200, 365),
            (med_items[1], 'fda_510k', 'FDA-510K-234','US FDA',                         -500, 365),
            (med_items[0], 'ce_mark',  'CE-2025-012', 'TUV Rheinland Germany',         -100, 365),
            (med_items[2], 'iso_13485','ISO-QMS-2025','DNV GL Certification',            -50, 365),
            (med_items[1], 'bis',      'CERT-IS-003', 'BIS Bureau of Indian Standards',  -30, 90),   # expiring soon
            (med_items[0], 'ce_mark',  'CE-2025-023', 'TUV Rheinland Germany',          -20, 60),   # expiring soon
            (med_items[2], 'fda_510k', 'FDA-510K-501','US FDA',                        -180, 365),
        ]
        comp_count = 0
        for item, std, cert_num, issuer, issue_ago, valid_days in comp_data:
            issue = self.today + timedelta(days=issue_ago)
            expiry = issue + timedelta(days=valid_days)
            status = 'pending' if (expiry - self.today).days < 91 else 'active'
            _, created = RegulatoryCompliance.objects.get_or_create(
                item=item, certificate_number=cert_num,
                defaults=dict(
                    standard=std, issuing_body=issuer,
                    issue_date=issue, expiry_date=expiry,
                    status=status, created_by=self.user,
                )
            )
            if created:
                comp_count += 1

        self.stdout.write(f'  Medical — CAPAs:{capa_count} | Compliance:{comp_count} created')

    # ──────────────────────────────────────────────────────────
    # FINANCE  (Accounts + 10 Journal Entries)
    # ──────────────────────────────────────────────────────────
    def seed_finance(self):
        from finance.models import AccountType, Account, JournalEntry, JournalEntryLine

        # Account Types
        at_map = {}
        for name, nb in [('Revenue', 'credit'), ('Cost of Goods Sold', 'debit'),
                          ('Operating Expense', 'debit'), ('Asset', 'debit'), ('Liability', 'credit')]:
            at, _ = AccountType.objects.get_or_create(name=name, defaults={'normal_balance': nb})
            at_map[name] = at

        # Chart of Accounts
        acc_data = [
            ('4001', 'Sales Revenue',           'income',   'Revenue'),
            ('4002', 'Service Income',          'income',   'Revenue'),
            ('4003', 'Export Sales',            'income',   'Revenue'),
            ('5001', 'Raw Material Cost',       'expense',  'Cost of Goods Sold'),
            ('5002', 'Manufacturing Overhead',  'expense',  'Cost of Goods Sold'),
            ('5003', 'Salaries & Wages',        'expense',  'Operating Expense'),
            ('5004', 'Utilities Expense',       'expense',  'Operating Expense'),
            ('5005', 'Marketing & Sales Exp',   'expense',  'Operating Expense'),
            ('1001', 'Cash & Bank',             'asset',    'Asset'),
            ('1002', 'Accounts Receivable',     'asset',    'Asset'),
        ]
        accs = {}
        for code, name, cat, at_name in acc_data:
            acc, _ = Account.objects.get_or_create(
                account_code=code,
                defaults=dict(
                    account_name=name, account_category=cat,
                    account_type=at_map[at_name], is_active=True,
                )
            )
            accs[code] = acc

        # Journal Entries (10: 5 income + 5 expense — all posted)
        je_data = [
            ('Sales — Apollo Hospitals',     '4001', '1002', 210000, -75),
            ('Sales — Cipla Medical',        '4001', '1002', 204000, -65),
            ('Export — National Geotextile', '4003', '1002', 480000, -55),
            ('Sales — L&T Construction',     '4001', '1002', 640000, -45),
            ('Service Revenue — QC Report',  '4002', '1002',  35000, -35),
            ('Raw Material Purchase',        '1002', '5001', 180000, -80),
            ('Factory Salaries — March',     '1002', '5003', 420000, -30),
            ('Electricity Bill — Q4',        '1002', '5004',  48000, -25),
            ('Marketing Campaign',           '1002', '5005',  65000, -20),
            ('Manufacturing Overhead — Q4',  '1002', '5002',  95000, -15),
        ]

        je_count = 0
        for i, (desc, dr_code, cr_code, amount, days_ago) in enumerate(je_data):
            je_date = self.today + timedelta(days=days_ago)
            je_num  = f'JE-{je_date.year}-{i+1:03d}'
            je, created = JournalEntry.objects.get_or_create(
                entry_number=je_num,
                defaults=dict(
                    entry_date=je_date, description=desc,
                    status='posted', created_by=self.user,
                )
            )
            if created:
                JournalEntryLine.objects.create(
                    entry=je, account=accs[dr_code],
                    description=desc, debit_amount=amount, credit_amount=0,
                )
                JournalEntryLine.objects.create(
                    entry=je, account=accs[cr_code],
                    description=desc, debit_amount=0, credit_amount=amount,
                )
                je_count += 1

        self.stdout.write(f'  Finance — Accounts:{len(accs)} | Journal Entries:{je_count} created')
