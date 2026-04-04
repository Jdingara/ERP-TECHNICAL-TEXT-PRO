# ============================================================
# FILE: authentication/management/commands/seed_data.py
# PURPOSE: Populate the entire database with realistic sample
#          data for a Medical & Technical Textile ERP.
#
# FULL FLOW COVERED:
#   1. Admin user + roles
#   2. Units of measure
#   3. Warehouses, Suppliers, Customers, Items
#   4. Chart of Accounts + Opening Journal Entry
#   5. Purchase Order > GRN (confirm) > Stock arrives
#   6. BOM > Machines > Work Order > Complete > Batch
#   7. Quality Check
#   8. Customer Inquiry > Quotation
#   9. Sales Order > Deliver > Stock reduced
#  10. Invoice > Paid
#  11. HR: Departments, Employees, Attendance, Salary
#  12. Medical Textile: Compliance, Traceability, Sterility, CAPA, Shelf Life
#  13. Technical Textile: Categories, Specs, Samples, TDS, Lab, R&D
#
# RUN:  python manage.py seed_data
# ============================================================

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from datetime import date, timedelta
from decimal import Decimal


class Command(BaseCommand):
    help = 'Seed the database with complete sample data (end-to-end flow)'

    def handle(self, *args, **kwargs):
        self.stdout.write('\n=== SASI ERP - Seeding Sample Data ===\n')
        try:
            self._seed_users()
            self._seed_master_data()
            self._seed_finance()
            self._seed_purchasing()
            self._seed_production()
            self._seed_sales()
            self._seed_hr()
            self._seed_medical_textile()
            self._seed_technical_textile()
            self.stdout.write('\nOK All sample data seeded successfully!\n')
            self.stdout.write('  Login: admin / admin123\n')
        except Exception as e:
            self.stdout.write(f'\nERROR: {e}')
            import traceback
            traceback.print_exc()

    # ---------------------------------------------------------
    # 1. USERS & ROLES
    # ---------------------------------------------------------
    def _seed_users(self):
        self.stdout.write('  > Users & Roles')
        from authentication.models import Role, UserProfile

        admin, created = User.objects.get_or_create(username='admin', defaults={
            'first_name': 'SASI', 'last_name': 'Admin',
            'email': 'admin@sasigroup.com', 'is_staff': True, 'is_superuser': True,
        })
        if created:
            admin.set_password('admin123')
            admin.save()

        all_pages = [
            '/master-data/items', '/master-data/suppliers', '/master-data/customers', '/master-data/warehouses',
            '/inventory/stock-list', '/inventory/stock-movement',
            '/purchasing/purchase-orders', '/purchasing/create-purchase-order', '/purchasing/goods-receipt',
            '/sales/inquiries', '/sales/quotations', '/sales/order-journey',
            '/sales/sales-orders', '/sales/create-sales-order',
            '/finance/chart-of-accounts', '/finance/journal-entries', '/finance/trial-balance',
            '/hr-payroll/employees', '/hr-payroll/attendance', '/hr-payroll/salary',
            '/production/bill-of-materials', '/production/work-orders', '/production/create-work-order',
            '/production/machines', '/production/quality-checks', '/production/batches',
            '/technical-textile/product-categories', '/technical-textile/performance-specs',
            '/technical-textile/samples', '/technical-textile/data-sheets',
            '/technical-textile/testing-lab', '/technical-textile/rd-projects',
            '/medical-textile/compliance', '/medical-textile/batch-traceability',
            '/medical-textile/sterility', '/medical-textile/capa',
            '/medical-textile/audit-trail', '/medical-textile/shelf-life',
            '/reports/production', '/reports/inventory', '/reports/sales',
            '/reports/finance', '/reports/hr',
        ]

        manager_role, _ = Role.objects.get_or_create(name='Production Manager', defaults={
            'description': 'Access to production, inventory, purchasing',
            'allowed_pages': [p for p in all_pages if any(x in p for x in [
                'production', 'inventory', 'purchasing', 'master-data',
            ])],
        })
        sales_role, _ = Role.objects.get_or_create(name='Sales Executive', defaults={
            'description': 'Access to sales, customer, inventory',
            'allowed_pages': [p for p in all_pages if any(x in p for x in [
                'sales', 'master-data/customers', 'inventory/stock-list',
            ])],
        })

        for uname, fname, lname, email, role in [
            ('rajan', 'Rajan', 'Kumar', 'rajan@sasigroup.com', manager_role),
            ('priya', 'Priya', 'Devi',  'priya@sasigroup.com', sales_role),
        ]:
            u, created = User.objects.get_or_create(username=uname, defaults={
                'first_name': fname, 'last_name': lname, 'email': email,
            })
            if created:
                u.set_password('pass1234')
                u.save()
            UserProfile.objects.get_or_create(user=u, defaults={'role': role})

        self.stdout.write('     OK admin, rajan, priya created')
        self.admin_user = admin

    # ---------------------------------------------------------
    # 2. MASTER DATA
    # ---------------------------------------------------------
    def _seed_master_data(self):
        self.stdout.write('  > Master Data')
        from master_data.models import UnitOfMeasure, Warehouse, Supplier, Customer, Item, ItemCategory

        # Units
        kg,  _ = UnitOfMeasure.objects.get_or_create(name='Kilogram', short_name='kg')
        mtr, _ = UnitOfMeasure.objects.get_or_create(name='Meter',    short_name='mtr')
        nos, _ = UnitOfMeasure.objects.get_or_create(name='Numbers',  short_name='nos')
        ltr, _ = UnitOfMeasure.objects.get_or_create(name='Litre',    short_name='ltr')

        # Warehouses  (fields: name, code, address)
        self.wh_main, _ = Warehouse.objects.get_or_create(
            code='WH-MAIN', defaults={'name': 'Main Warehouse',    'address': 'Plot 12, Industrial Estate, Tiruppur, Tamil Nadu'})
        self.wh_fg, _   = Warehouse.objects.get_or_create(
            code='WH-FG',   defaults={'name': 'Finished Goods',    'address': 'Plot 12, Industrial Estate, Tiruppur, Tamil Nadu'})
        self.wh_rm, _   = Warehouse.objects.get_or_create(
            code='WH-RM',   defaults={'name': 'Raw Material Store', 'address': 'Plot 14, Industrial Estate, Tiruppur, Tamil Nadu'})

        # Suppliers  (payment_days is an int, no payment_terms field)
        self.sup1, _ = Supplier.objects.get_or_create(supplier_code='SUP-001', defaults={
            'supplier_name': 'Sri Lakshmi Yarns Pvt Ltd',
            'supplier_type': 'yarn_supplier',
            'contact_person': 'Venkat Rao', 'phone': '9876543210',
            'email': 'sales@srilakshmiyarns.com',
            'address': '14, Industrial Estate', 'city': 'Erode', 'state': 'Tamil Nadu',
            'gstin': '33AABCS1234A1Z5', 'payment_days': 30,
        })
        self.sup2, _ = Supplier.objects.get_or_create(supplier_code='SUP-002', defaults={
            'supplier_name': 'Coimbatore Chemicals Ltd',
            'supplier_type': 'chemical_supplier',
            'contact_person': 'Suresh Babu', 'phone': '9123456789',
            'email': 'procurement@cbechemicals.com',
            'address': '22, Chemical Zone', 'city': 'Coimbatore', 'state': 'Tamil Nadu',
            'gstin': '33AADCC5678B1Z2', 'payment_days': 15,
        })
        self.sup3, _ = Supplier.objects.get_or_create(supplier_code='SUP-003', defaults={
            'supplier_name': 'Global Nonwoven Fabrics',
            'supplier_type': 'other',
            'contact_person': 'Amit Shah', 'phone': '9988776655',
            'email': 'supply@globalnonwoven.com',
            'address': '8, Textile Park', 'city': 'Surat', 'state': 'Gujarat',
            'gstin': '24AABCG9012C1Z8', 'payment_days': 45,
        })

        # Customers  (credit_days is an int, no payment_terms or credit_limit field)
        self.cust1, _ = Customer.objects.get_or_create(customer_code='CUST-001', defaults={
            'customer_name': 'Apollo Hospitals Pvt Ltd',
            'contact_person': 'Dr. Ramesh Kumar', 'phone': '9000100200',
            'email': 'purchase@apollohospitals.com',
            'address': '21, Greams Lane', 'city': 'Chennai', 'state': 'Tamil Nadu',
            'gstin': '33AABCA1234D1Z1', 'credit_days': 30,
        })
        self.cust2, _ = Customer.objects.get_or_create(customer_code='CUST-002', defaults={
            'customer_name': 'Geo Solutions Infra Ltd',
            'contact_person': 'Harish Mehta', 'phone': '9876001234',
            'email': 'procurement@geosolutions.in',
            'address': '5, Tech Hub', 'city': 'Pune', 'state': 'Maharashtra',
            'gstin': '27AABCG4567E1Z9', 'credit_days': 45,
        })
        self.cust3, _ = Customer.objects.get_or_create(customer_code='CUST-003', defaults={
            'customer_name': 'KEC International Ltd',
            'contact_person': 'Sunil Joshi', 'phone': '9712345678',
            'email': 'supply@kecinternational.com',
            'address': '9, Industrial Area', 'city': 'Vadodara', 'state': 'Gujarat',
            'gstin': '24AABCK7890F1Z4', 'credit_days': 60,
        })

        # Item Categories
        cat_rm,   _ = ItemCategory.objects.get_or_create(name='Raw Material',   defaults={'description': 'Basic raw materials'})
        cat_fg,   _ = ItemCategory.objects.get_or_create(name='Finished Goods', defaults={'description': 'Finished textile products'})
        cat_chem, _ = ItemCategory.objects.get_or_create(name='Chemicals',      defaults={'description': 'Processing chemicals'})

        # Raw Materials  (standard_price, minimum_stock — no standard_cost/reorder_level/selling_price)
        self.rm_cotton, _ = Item.objects.get_or_create(item_code='RM-001', defaults={
            'item_name': 'Raw Cotton (Grade A)',
            'item_type': 'raw_material', 'category': cat_rm,
            'unit_of_measure': kg, 'standard_price': Decimal('85.00'),
            'minimum_stock': Decimal('500'),
            'description': 'Premium grade raw cotton for nonwoven fabric production',
        })
        self.rm_polyester, _ = Item.objects.get_or_create(item_code='RM-002', defaults={
            'item_name': 'Polyester Staple Fibre (1.5D)',
            'item_type': 'raw_material', 'category': cat_rm,
            'unit_of_measure': kg, 'standard_price': Decimal('120.00'),
            'minimum_stock': Decimal('300'),
            'description': 'Fine denier polyester for medical nonwoven',
        })
        self.rm_binder, _ = Item.objects.get_or_create(item_code='RM-003', defaults={
            'item_name': 'Acrylic Binder Chemical',
            'item_type': 'raw_material', 'category': cat_chem,
            'unit_of_measure': kg, 'standard_price': Decimal('210.00'),
            'minimum_stock': Decimal('100'),
            'description': 'Binder for thermal bonding process',
        })
        self.rm_pet, _ = Item.objects.get_or_create(item_code='RM-004', defaults={
            'item_name': 'PET Yarn (150 Denier)',
            'item_type': 'raw_material', 'category': cat_rm,
            'unit_of_measure': kg, 'standard_price': Decimal('165.00'),
            'minimum_stock': Decimal('200'),
            'description': 'High tenacity PET yarn for geotextile weaving',
        })
        self.rm_pp, _ = Item.objects.get_or_create(item_code='RM-005', defaults={
            'item_name': 'Polypropylene Granules',
            'item_type': 'raw_material', 'category': cat_rm,
            'unit_of_measure': kg, 'standard_price': Decimal('95.00'),
            'minimum_stock': Decimal('400'),
            'description': 'PP granules for spunbond nonwoven',
        })

        # Finished Goods  (item_type='finished_goods' — NOT 'finished_good')
        self.fg_medical_nw, _ = Item.objects.get_or_create(item_code='FG-001', defaults={
            'item_name': 'Medical Nonwoven Fabric (25 GSM)',
            'item_type': 'finished_goods', 'category': cat_fg,
            'unit_of_measure': mtr, 'standard_price': Decimal('28.00'),
            'minimum_stock': Decimal('1000'),
            'description': 'ISO 13485 certified surgical nonwoven 25 GSM',
        })
        self.fg_geotextile, _ = Item.objects.get_or_create(item_code='FG-002', defaults={
            'item_name': 'Woven Geotextile Fabric (200 GSM)',
            'item_type': 'finished_goods', 'category': cat_fg,
            'unit_of_measure': mtr, 'standard_price': Decimal('55.00'),
            'minimum_stock': Decimal('500'),
            'description': 'High tensile woven geotextile for road construction',
        })
        self.fg_protective, _ = Item.objects.get_or_create(item_code='FG-003', defaults={
            'item_name': 'FR Protective Fabric (380 GSM)',
            'item_type': 'finished_goods', 'category': cat_fg,
            'unit_of_measure': mtr, 'standard_price': Decimal('420.00'),
            'minimum_stock': Decimal('200'),
            'description': 'Flame retardant fabric for industrial protective wear',
        })

        self.stdout.write('     OK 3 warehouses, 3 suppliers, 3 customers, 8 items created')

    # ---------------------------------------------------------
    # 3. FINANCE - CHART OF ACCOUNTS
    # ---------------------------------------------------------
    def _seed_finance(self):
        self.stdout.write('  > Finance - Chart of Accounts')
        from finance.models import AccountType, Account, JournalEntry, JournalEntryLine

        at_asset,   _ = AccountType.objects.get_or_create(name='Asset',     defaults={'normal_balance': 'debit'})
        at_liab,    _ = AccountType.objects.get_or_create(name='Liability', defaults={'normal_balance': 'credit'})
        at_equity,  _ = AccountType.objects.get_or_create(name='Equity',    defaults={'normal_balance': 'credit'})
        at_income,  _ = AccountType.objects.get_or_create(name='Income',    defaults={'normal_balance': 'credit'})
        at_expense, _ = AccountType.objects.get_or_create(name='Expense',   defaults={'normal_balance': 'debit'})

        # (account_code, account_name, account_type FK, account_category string)
        accounts_def = [
            ('1001', 'Cash in Hand',              at_asset,   'asset'),
            ('1002', 'Bank Account - HDFC',        at_asset,   'asset'),
            ('1100', 'Accounts Receivable',        at_asset,   'asset'),
            ('1200', 'Inventory - Raw Material',   at_asset,   'asset'),
            ('1201', 'Inventory - Finished Goods', at_asset,   'asset'),
            ('2001', 'Accounts Payable',           at_liab,    'liability'),
            ('2100', 'GST Payable',                at_liab,    'liability'),
            ('3001', 'Share Capital',              at_equity,  'equity'),
            ('4001', 'Sales Revenue',              at_income,  'income'),
            ('4002', 'Other Income',               at_income,  'income'),
            ('5001', 'Raw Material Cost',          at_expense, 'expense'),
            ('5002', 'Manufacturing Overhead',     at_expense, 'expense'),
            ('5003', 'Salaries & Wages',           at_expense, 'expense'),
            ('5004', 'Rent & Utilities',           at_expense, 'expense'),
            ('5005', 'Depreciation',               at_expense, 'expense'),
        ]

        self.accounts = {}
        for code, name, atype, category in accounts_def:
            acc, _ = Account.objects.get_or_create(account_code=code, defaults={
                'account_name': name,
                'account_type': atype,
                'account_category': category,
                'is_active': True,
            })
            self.accounts[code] = acc

        # Opening balance journal entry
        # JournalEntry fields: entry_number, entry_date, description, status, reference, created_by
        je, created = JournalEntry.objects.get_or_create(
            entry_number='JE-OPENING-001',
            defaults={
                'entry_date': date(2026, 1, 1),
                'description': 'Opening balances - FY 2026-27',
                'status': 'posted',
                'reference': 'Opening Balance',
                'created_by': self.admin_user,
            }
        )
        if created:
            # JournalEntryLine fields: entry (FK), account (FK), description, debit_amount, credit_amount
            lines = [
                (self.accounts['1002'], Decimal('5000000'), Decimal('0')),
                (self.accounts['1200'], Decimal('850000'),  Decimal('0')),
                (self.accounts['1201'], Decimal('420000'),  Decimal('0')),
                (self.accounts['3001'], Decimal('0'), Decimal('6270000')),
            ]
            for acc, dr, cr in lines:
                JournalEntryLine.objects.create(
                    entry=je, account=acc,
                    debit_amount=dr, credit_amount=cr,
                    description='Opening balance',
                )

        self.stdout.write('     OK 15 accounts, opening journal entry created')

    # ---------------------------------------------------------
    # 4. PURCHASING - PO > GRN > STOCK
    # ---------------------------------------------------------
    def _seed_purchasing(self):
        self.stdout.write('  > Purchasing (PO > GRN > Stock)')
        from purchasing.models import PurchaseOrder, PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine

        # PO 1: Raw Cotton + Binder
        po1, created = PurchaseOrder.objects.get_or_create(po_number='PO-20260101-001', defaults={
            'supplier': self.sup1, 'warehouse': self.wh_rm,
            'order_date': date(2026, 1, 5), 'expected_date': date(2026, 1, 15),
            'status': 'confirmed', 'total_amount': Decimal('275000'),
            'notes': 'Urgent order for Q1 production plan',
            'created_by': self.admin_user,
        })
        if created:
            l1 = PurchaseOrderLine.objects.create(
                purchase_order=po1, item=self.rm_cotton,
                ordered_quantity=Decimal('2000'), unit_price=Decimal('85'),
                total_price=Decimal('170000'),
            )
            l2 = PurchaseOrderLine.objects.create(
                purchase_order=po1, item=self.rm_binder,
                ordered_quantity=Decimal('500'), unit_price=Decimal('210'),
                total_price=Decimal('105000'),
            )
            grn1 = GoodsReceipt.objects.create(
                grn_number='GRN-20260115-001', purchase_order=po1,
                receipt_date=date(2026, 1, 15),
                supplier_invoice_number='SLY-INV-2026-0042',
                status='draft', created_by=self.admin_user,
            )
            GoodsReceiptLine.objects.create(
                goods_receipt=grn1, purchase_order_line=l1,
                item=self.rm_cotton, received_quantity=Decimal('2000'),
            )
            GoodsReceiptLine.objects.create(
                goods_receipt=grn1, purchase_order_line=l2,
                item=self.rm_binder, received_quantity=Decimal('500'),
            )
            self._confirm_grn(grn1, self.wh_rm)

        # PO 2: Polyester + PET Yarn
        po2, created = PurchaseOrder.objects.get_or_create(po_number='PO-20260110-002', defaults={
            'supplier': self.sup3, 'warehouse': self.wh_rm,
            'order_date': date(2026, 1, 10), 'expected_date': date(2026, 1, 20),
            'status': 'confirmed', 'total_amount': Decimal('312000'),
            'created_by': self.admin_user,
        })
        if created:
            l3 = PurchaseOrderLine.objects.create(
                purchase_order=po2, item=self.rm_polyester,
                ordered_quantity=Decimal('1500'), unit_price=Decimal('120'),
                total_price=Decimal('180000'),
            )
            l4 = PurchaseOrderLine.objects.create(
                purchase_order=po2, item=self.rm_pet,
                ordered_quantity=Decimal('800'), unit_price=Decimal('165'),
                total_price=Decimal('132000'),
            )
            grn2 = GoodsReceipt.objects.create(
                grn_number='GRN-20260120-002', purchase_order=po2,
                receipt_date=date(2026, 1, 20),
                supplier_invoice_number='GNF-2026-INV-115',
                status='draft', created_by=self.admin_user,
            )
            GoodsReceiptLine.objects.create(
                goods_receipt=grn2, purchase_order_line=l3,
                item=self.rm_polyester, received_quantity=Decimal('1500'),
            )
            GoodsReceiptLine.objects.create(
                goods_receipt=grn2, purchase_order_line=l4,
                item=self.rm_pet, received_quantity=Decimal('800'),
            )
            self._confirm_grn(grn2, self.wh_rm)

        # PO 3: PP Granules
        po3, created = PurchaseOrder.objects.get_or_create(po_number='PO-20260115-003', defaults={
            'supplier': self.sup2, 'warehouse': self.wh_rm,
            'order_date': date(2026, 1, 15), 'expected_date': date(2026, 1, 25),
            'status': 'confirmed', 'total_amount': Decimal('95000'),
            'created_by': self.admin_user,
        })
        if created:
            l5 = PurchaseOrderLine.objects.create(
                purchase_order=po3, item=self.rm_pp,
                ordered_quantity=Decimal('1000'), unit_price=Decimal('95'),
                total_price=Decimal('95000'),
            )
            grn3 = GoodsReceipt.objects.create(
                grn_number='GRN-20260125-003', purchase_order=po3,
                receipt_date=date(2026, 1, 25),
                supplier_invoice_number='CCL-2026-5021',
                status='draft', created_by=self.admin_user,
            )
            GoodsReceiptLine.objects.create(
                goods_receipt=grn3, purchase_order_line=l5,
                item=self.rm_pp, received_quantity=Decimal('1000'),
            )
            self._confirm_grn(grn3, self.wh_rm)

        self.stdout.write('     OK 3 POs, 3 GRNs confirmed, stock added to WH-RM')

    def _confirm_grn(self, grn, warehouse):
        from inventory.models import Stock, StockMovement
        for line in grn.lines.select_related('item').all():
            stock, _ = Stock.objects.get_or_create(
                item=line.item, warehouse=warehouse,
                defaults={'quantity': Decimal('0')},
            )
            stock.quantity += line.received_quantity
            stock.save()
            StockMovement.objects.create(
                item=line.item, warehouse=warehouse,
                movement_type='stock_in',
                quantity=line.received_quantity,
                reference_number=grn.grn_number,
                reference_type='grn',
                notes=f'GRN receipt: {grn.grn_number}',
                created_by=self.admin_user,
            )
            pol = line.purchase_order_line
            pol.received_quantity = line.received_quantity
            pol.save()
        grn.status = 'confirmed'
        grn.save()
        grn.purchase_order.status = 'received'
        grn.purchase_order.save()

    # ---------------------------------------------------------
    # 5. PRODUCTION - BOM > Machines > Work Order > Complete
    # ---------------------------------------------------------
    def _seed_production(self):
        self.stdout.write('  > Production (BOM > Machines > Work Order > Complete > QC)')
        from production.models import (
            BillOfMaterials, BOMLine, Machine, WorkOrder,
            WorkOrderMaterialConsumption, Batch, QualityCheck,
        )

        # BOM 1: Medical Nonwoven 25 GSM
        bom1, created = BillOfMaterials.objects.get_or_create(
            bom_name='Medical NW 25 GSM - Standard',
            defaults={
                'finished_product': self.fg_medical_nw,
                'quantity_produced': Decimal('1000'),
                'status': 'active',
                'notes': 'ISO 13485 certified formula. Polyester + Binder thermal bonding.',
                'created_by': self.admin_user,
            }
        )
        if created:
            BOMLine.objects.create(bom=bom1, raw_material=self.rm_polyester,
                quantity=Decimal('30'), waste_percent=Decimal('5'),
                notes='30 kg polyester per 1000 mtr output')
            BOMLine.objects.create(bom=bom1, raw_material=self.rm_binder,
                quantity=Decimal('8'), waste_percent=Decimal('2'),
                notes='Acrylic binder for thermal bonding')

        # BOM 2: Geotextile 200 GSM
        bom2, created = BillOfMaterials.objects.get_or_create(
            bom_name='Woven Geotextile 200 GSM - Standard',
            defaults={
                'finished_product': self.fg_geotextile,
                'quantity_produced': Decimal('500'),
                'status': 'active',
                'notes': 'Heavy duty PET woven for road geotextile.',
                'created_by': self.admin_user,
            }
        )
        if created:
            BOMLine.objects.create(bom=bom2, raw_material=self.rm_pet,
                quantity=Decimal('110'), waste_percent=Decimal('8'),
                notes='PET yarn for warp & weft')

        # Machines
        machines_data = [
            ('MCH-001', 'Thermal Bond Line TBL-3000', 'nonwoven', Decimal('1200'), 'mtr/day', 'Plant A'),
            ('MCH-002', 'Rapier Loom RL-800',         'weaving',  Decimal('120'),  'mtr/day', 'Plant B'),
            ('MCH-003', 'Coating Machine CM-500',      'coating',  Decimal('500'),  'mtr/day', 'Plant A'),
            ('MCH-004', 'Tensile Tester TT-100',       'testing',  Decimal('50'),   'tests/day','QC Lab'),
            ('MCH-005', 'Spunbond Line SBL-200',       'nonwoven', Decimal('800'),  'mtr/day', 'Plant C'),
        ]
        for code, name, mtype, cap, cap_unit, loc in machines_data:
            Machine.objects.get_or_create(machine_code=code, defaults={
                'machine_name': name, 'machine_type': mtype,
                'capacity': cap, 'capacity_unit': cap_unit,
                'location': loc, 'status': 'active',
                'purchase_date': date(2023, 6, 15),
                'notes': f'Primary {mtype} equipment',
            })

        # Work Order 1: Medical Nonwoven - COMPLETED
        wo1, created = WorkOrder.objects.get_or_create(
            work_order_number='WO-20260201-001',
            defaults={
                'bom': bom1, 'finished_product': self.fg_medical_nw,
                'planned_quantity': Decimal('2000'),
                'warehouse': self.wh_fg,
                'planned_start_date': date(2026, 2, 1),
                'planned_end_date':   date(2026, 2, 5),
                'status': 'draft',
                'notes': 'Batch for Apollo Hospitals order Q1 2026',
                'created_by': self.admin_user,
            }
        )
        if created:
            ratio = float(2000) / float(bom1.quantity_produced)
            for bom_line in bom1.lines.select_related('raw_material').all():
                WorkOrderMaterialConsumption.objects.create(
                    work_order=wo1,
                    raw_material=bom_line.raw_material,
                    planned_quantity=Decimal(str(round(float(bom_line.quantity_with_waste) * ratio, 3))),
                )
            self._complete_work_order(wo1, actual_qty=Decimal('1980'))

        # Work Order 2: Geotextile - IN PROGRESS
        wo2, created = WorkOrder.objects.get_or_create(
            work_order_number='WO-20260210-002',
            defaults={
                'bom': bom2, 'finished_product': self.fg_geotextile,
                'planned_quantity': Decimal('1000'),
                'warehouse': self.wh_fg,
                'planned_start_date': date(2026, 2, 10),
                'planned_end_date':   date(2026, 2, 18),
                'actual_start_date':  date(2026, 2, 10),
                'status': 'in_progress',
                'notes': 'Geotextile for KEC International project',
                'created_by': self.admin_user,
            }
        )
        if created:
            ratio = float(1000) / float(bom2.quantity_produced)
            for bom_line in bom2.lines.select_related('raw_material').all():
                WorkOrderMaterialConsumption.objects.create(
                    work_order=wo2,
                    raw_material=bom_line.raw_material,
                    planned_quantity=Decimal(str(round(float(bom_line.quantity_with_waste) * ratio, 3))),
                )

        # Quality Check on WO1
        wo1_obj = WorkOrder.objects.get(work_order_number='WO-20260201-001')
        batch = Batch.objects.filter(work_order=wo1_obj).first()
        QualityCheck.objects.get_or_create(
            work_order=wo1_obj,
            check_date=date(2026, 2, 5),
            defaults={
                'batch': batch,
                'checked_by': 'Rajan Kumar (QC Lead)',
                'result': 'pass',
                'remarks': 'All parameters within ISO 13485 spec. GSM 25.2. Approved for dispatch.',
                'yarn_count_actual': '1.5 Denier',
                'strength_value': Decimal('420.5'),
                'elongation_percent': Decimal('38.2'),
                'unevenness_percent': Decimal('1.8'),
            }
        )

        self.stdout.write('     OK 2 BOMs, 5 machines, 2 work orders, 1 QC check created')

    def _complete_work_order(self, wo, actual_qty):
        from inventory.models import Stock, StockMovement
        from production.models import Batch
        ratio = float(actual_qty) / float(wo.planned_quantity)

        for material in wo.material_consumptions.select_related('raw_material').all():
            actual_consumed = Decimal(str(round(float(material.planned_quantity) * ratio, 3)))
            material.actual_quantity = actual_consumed
            material.save()
            # Use WH-RM for raw material stock (not FG warehouse)
            rm_wh = self.wh_rm
            stock, _ = Stock.objects.get_or_create(
                item=material.raw_material, warehouse=rm_wh,
                defaults={'quantity': Decimal('0')},
            )
            if stock.quantity < actual_consumed:
                stock.quantity = actual_consumed
            stock.quantity -= actual_consumed
            stock.save()
            StockMovement.objects.create(
                item=material.raw_material, warehouse=rm_wh,
                movement_type='production_out', quantity=actual_consumed,
                reference_number=wo.work_order_number, reference_type='work_order',
                notes=f'Material consumed in {wo.work_order_number}',
                created_by=self.admin_user,
            )

        # Add finished goods stock
        fg_stock, _ = Stock.objects.get_or_create(
            item=wo.finished_product, warehouse=wo.warehouse,
            defaults={'quantity': Decimal('0')},
        )
        fg_stock.quantity += actual_qty
        fg_stock.save()
        StockMovement.objects.create(
            item=wo.finished_product, warehouse=wo.warehouse,
            movement_type='production_in', quantity=actual_qty,
            reference_number=wo.work_order_number, reference_type='work_order',
            notes=f'Produced in {wo.work_order_number}',
            created_by=self.admin_user,
        )

        # Batch (fields: batch_number, work_order, item, quantity_produced, production_date, expiry_date)
        Batch.objects.get_or_create(
            batch_number=f'BAT-{wo.work_order_number}',
            defaults={
                'work_order': wo, 'item': wo.finished_product,
                'quantity_produced': actual_qty,
                'production_date': date(2026, 2, 5),
                'expiry_date': date(2027, 2, 5),
                'notes': 'Sterile packed. ISO 13485 lot release approved.',
            }
        )

        wo.actual_quantity = actual_qty
        wo.actual_start_date = wo.planned_start_date
        wo.actual_end_date = date(2026, 2, 5)
        wo.status = 'completed'
        wo.save()

    # ---------------------------------------------------------
    # 6. SALES - Inquiry > Quotation > SO > Deliver > Invoice
    # ---------------------------------------------------------
    def _seed_sales(self):
        self.stdout.write('  > Sales (Inquiry > Quotation > SO > Deliver > Invoice > Paid)')
        from sales.models import CustomerInquiry, Quotation, SalesOrder, SalesOrderLine, Invoice

        # Inquiries  (quantity_required not quantity, no coating_type unless coating_required=True)
        inq1, _ = CustomerInquiry.objects.get_or_create(
            inquiry_number='INQ-20260210-001',
            defaults={
                'customer': self.cust1, 'received_date': date(2026, 2, 10),
                'product_description': 'Medical grade nonwoven fabric for surgical drapes and gowns',
                'end_use': 'medical',
                'gsm_required': Decimal('25'), 'width_cm': Decimal('160'),
                'tensile_requirement': 'MD >= 400N/5cm, CD >= 200N/5cm',
                'coating_required': False, 'color': 'White',
                'quantity_required': Decimal('5000'), 'unit': 'meters',
                'target_price': Decimal('40'), 'required_by_date': date(2026, 3, 15),
                'status': 'won', 'assigned_to': 'Priya Devi',
                'notes': 'Apollo requires ISO 13485 cert copy with each delivery.',
                'created_by': self.admin_user,
            }
        )
        inq2, _ = CustomerInquiry.objects.get_or_create(
            inquiry_number='INQ-20260212-002',
            defaults={
                'customer': self.cust3, 'received_date': date(2026, 2, 12),
                'product_description': 'Woven geotextile for highway embankment stabilisation',
                'end_use': 'geotextile',
                'gsm_required': Decimal('200'), 'width_cm': Decimal('520'),
                'tensile_requirement': 'Tensile >= 50 kN/m, CBR >= 3.5 kN',
                'coating_required': False,
                'quantity_required': Decimal('10000'), 'unit': 'meters',
                'target_price': Decimal('78'), 'required_by_date': date(2026, 4, 30),
                'status': 'quoted', 'assigned_to': 'Priya Devi',
                'notes': 'KEC project: NH-44 expressway section 3.',
                'created_by': self.admin_user,
            }
        )
        inq3, _ = CustomerInquiry.objects.get_or_create(
            inquiry_number='INQ-20260220-003',
            defaults={
                'customer': self.cust2, 'received_date': date(2026, 2, 20),
                'product_description': 'Filtration nonwoven for industrial dust collector bags',
                'end_use': 'filtration',
                'gsm_required': Decimal('350'), 'width_cm': Decimal('200'),
                'coating_required': True, 'coating_type': 'PTFE membrane coating',
                'quantity_required': Decimal('2000'), 'unit': 'meters',
                'target_price': Decimal('180'), 'required_by_date': date(2026, 5, 30),
                'status': 'sampling', 'assigned_to': 'Priya Devi',
                'notes': 'Sample trial requested: 50 mtr.',
                'created_by': self.admin_user,
            }
        )

        # Quotations
        qt1, _ = Quotation.objects.get_or_create(
            quotation_number='QT-20260211-001',
            defaults={
                'inquiry': inq1, 'customer': self.cust1,
                'date': date(2026, 2, 11), 'valid_until': date(2026, 3, 11),
                'product_description': 'Medical Nonwoven Fabric 25 GSM, 160cm width - ISO 13485',
                'gsm': Decimal('25'), 'width_cm': Decimal('160'),
                'quantity': Decimal('5000'), 'unit': 'meters',
                'unit_price': Decimal('42'), 'total_amount': Decimal('210000'),
                'lead_time_days': 21,
                'spec_notes': 'Tensile MD >= 420N/5cm. Sterile packed in rolls of 200 mtr.',
                'payment_terms': '50% advance, 50% on dispatch',
                'delivery_terms': 'Ex-Works Tiruppur',
                'status': 'accepted', 'created_by': self.admin_user,
            }
        )
        qt2, _ = Quotation.objects.get_or_create(
            quotation_number='QT-20260213-002',
            defaults={
                'inquiry': inq2, 'customer': self.cust3,
                'date': date(2026, 2, 13), 'valid_until': date(2026, 3, 13),
                'product_description': 'Woven Geotextile 200 GSM, 520cm width - IS 13162',
                'gsm': Decimal('200'), 'width_cm': Decimal('520'),
                'quantity': Decimal('10000'), 'unit': 'meters',
                'unit_price': Decimal('82'), 'total_amount': Decimal('820000'),
                'lead_time_days': 45,
                'payment_terms': 'Net 60 days',
                'delivery_terms': 'For Delivery, Pune',
                'status': 'sent', 'created_by': self.admin_user,
            }
        )

        # Sales Order 1: Delivered
        so1, created = SalesOrder.objects.get_or_create(
            so_number='SO-20260215-001',
            defaults={
                'customer': self.cust1, 'warehouse': self.wh_fg,
                'order_date': date(2026, 2, 15), 'delivery_date': date(2026, 3, 10),
                'status': 'delivered', 'total_amount': Decimal('63000'),
                'notes': 'First delivery against Q1 order. COA required.',
                'created_by': self.admin_user,
            }
        )
        if created:
            sol1 = SalesOrderLine.objects.create(
                sales_order=so1, item=self.fg_medical_nw,
                ordered_quantity=Decimal('1500'), delivered_quantity=Decimal('0'),
                unit_price=Decimal('42'), total_price=Decimal('63000'),
                notes='Roll width 160cm. Sterility cert required.',
            )
            self._deliver_sales_order(so1, [sol1])

        # Sales Order 2: Confirmed
        so2, created = SalesOrder.objects.get_or_create(
            so_number='SO-20260301-002',
            defaults={
                'customer': self.cust1, 'warehouse': self.wh_fg,
                'order_date': date(2026, 3, 1), 'delivery_date': date(2026, 3, 25),
                'status': 'confirmed', 'total_amount': Decimal('147000'),
                'notes': 'Second delivery - remaining 3500 mtr.',
                'created_by': self.admin_user,
            }
        )
        if created:
            SalesOrderLine.objects.create(
                sales_order=so2, item=self.fg_medical_nw,
                ordered_quantity=Decimal('3500'), delivered_quantity=Decimal('0'),
                unit_price=Decimal('42'), total_price=Decimal('147000'),
            )

        # Sales Order 3: Draft
        so3, created = SalesOrder.objects.get_or_create(
            so_number='SO-20260305-003',
            defaults={
                'customer': self.cust3, 'warehouse': self.wh_fg,
                'order_date': date(2026, 3, 5), 'delivery_date': date(2026, 4, 20),
                'status': 'draft', 'total_amount': Decimal('410000'),
                'notes': 'Advance PO from KEC. Production scheduled Feb-Mar.',
                'created_by': self.admin_user,
            }
        )
        if created:
            SalesOrderLine.objects.create(
                sales_order=so3, item=self.fg_geotextile,
                ordered_quantity=Decimal('5000'), delivered_quantity=Decimal('0'),
                unit_price=Decimal('82'), total_price=Decimal('410000'),
            )

        # Invoices  (invoice_number, sales_order, customer, invoice_date, due_date, subtotal, tax_amount, total_amount, paid_amount, status)
        Invoice.objects.get_or_create(
            invoice_number='INV-20260310-001',
            defaults={
                'sales_order': so1, 'customer': self.cust1,
                'invoice_date': date(2026, 3, 10), 'due_date': date(2026, 4, 10),
                'subtotal': Decimal('63000'), 'tax_amount': Decimal('11340'),
                'total_amount': Decimal('74340'), 'paid_amount': Decimal('74340'),
                'status': 'paid',
                'notes': 'Payment received via NEFT. UTR: HDFC20260312000145.',
                'created_by': self.admin_user,
            }
        )
        Invoice.objects.get_or_create(
            invoice_number='INV-20260325-002',
            defaults={
                'sales_order': so2, 'customer': self.cust1,
                'invoice_date': date(2026, 3, 25), 'due_date': date(2026, 4, 25),
                'subtotal': Decimal('147000'), 'tax_amount': Decimal('26460'),
                'total_amount': Decimal('173460'), 'paid_amount': Decimal('86730'),
                'status': 'sent',
                'notes': '50% advance received. Balance due on delivery.',
                'created_by': self.admin_user,
            }
        )

        self.stdout.write('     OK 3 inquiries, 2 quotations, 3 sales orders, 2 invoices created')

    def _deliver_sales_order(self, so, lines):
        from inventory.models import Stock, StockMovement
        for line in lines:
            remaining = line.ordered_quantity - line.delivered_quantity
            if remaining <= 0:
                continue
            stock, _ = Stock.objects.get_or_create(
                item=line.item, warehouse=so.warehouse,
                defaults={'quantity': Decimal('0')},
            )
            if stock.quantity < remaining:
                stock.quantity = remaining
            stock.quantity -= remaining
            stock.save()
            StockMovement.objects.create(
                item=line.item, warehouse=so.warehouse,
                movement_type='stock_out', quantity=remaining,
                reference_number=so.so_number, reference_type='sales_order',
                notes=f'Delivery for SO: {so.so_number}',
                created_by=self.admin_user,
            )
            line.delivered_quantity = line.ordered_quantity
            line.save()
        so.status = 'delivered'
        so.save()

    # ---------------------------------------------------------
    # 7. HR & PAYROLL
    # ---------------------------------------------------------
    def _seed_hr(self):
        self.stdout.write('  > HR & Payroll')
        from hr_payroll.models import Department, Employee, Attendance, SalaryRecord

        # Department fields: name, code, description
        dept_prod, _ = Department.objects.get_or_create(name='Production',       defaults={'code': 'PROD', 'description': 'Weaving, nonwoven and finishing operations'})
        dept_qc,   _ = Department.objects.get_or_create(name='Quality Control',  defaults={'code': 'QC',   'description': 'In-process and final inspection'})
        dept_sales,_ = Department.objects.get_or_create(name='Sales & Marketing',defaults={'code': 'SALES','description': 'Domestic and export sales'})
        dept_acc,  _ = Department.objects.get_or_create(name='Accounts',         defaults={'code': 'ACC',  'description': 'Finance and accounting'})
        dept_hr,   _ = Department.objects.get_or_create(name='HR & Admin',       defaults={'code': 'HR',   'description': 'Human resources and general administration'})

        # Employee gender choices: 'male' / 'female'  (NOT 'M'/'F')
        # bank_account field (NOT bank_account_number)
        employees_data = [
            ('EMP-001', 'Rajan',  'Kumar',    'male',   date(1985, 6, 12),  'rajan@sasigroup.com',  '9876543001', dept_prod,  'Production Manager',    date(2018, 4, 1),  Decimal('65000')),
            ('EMP-002', 'Priya',  'Devi',     'female', date(1990, 3, 22),  'priya@sasigroup.com',  '9876543002', dept_sales, 'Sales Executive',       date(2020, 7, 1),  Decimal('42000')),
            ('EMP-003', 'Suresh', 'Babu',     'male',   date(1982, 11, 5),  'suresh@sasigroup.com', '9876543003', dept_qc,    'QC Inspector',          date(2016, 1, 15), Decimal('35000')),
            ('EMP-004', 'Kavitha','Rajan',    'female', date(1992, 8, 17),  'kavitha@sasigroup.com','9876543004', dept_acc,   'Accounts Executive',    date(2021, 3, 1),  Decimal('38000')),
            ('EMP-005', 'Murugan','S',        'male',   date(1988, 2, 28),  'murugan@sasigroup.com','9876543005', dept_prod,  'Machine Operator - Sr', date(2015, 6, 1),  Decimal('28000')),
            ('EMP-006', 'Selvi',  'Arumugam', 'female', date(1995, 12, 10), 'selvi@sasigroup.com',  '9876543006', dept_prod,  'Machine Operator - Jr', date(2022, 9, 1),  Decimal('22000')),
            ('EMP-007', 'Anand',  'Krishnan', 'male',   date(1980, 7, 3),   'anand@sasigroup.com',  '9876543007', dept_hr,    'HR Manager',            date(2012, 4, 1),  Decimal('55000')),
        ]
        self.employees = []
        for (code, fn, ln, gender, dob, email, phone, dept, desg, join_date, salary) in employees_data:
            emp, _ = Employee.objects.get_or_create(employee_code=code, defaults={
                'first_name': fn, 'last_name': ln,
                'gender': gender, 'date_of_birth': dob,
                'email': email, 'phone': phone,
                'department': dept, 'designation': desg,
                'date_of_joining': join_date,
                'basic_salary': salary,
                'hra': salary * Decimal('0.40'),
                'da':  salary * Decimal('0.15'),
                'status': 'active',
                'bank_account': f'HDFC{code[-3:]}0023456',
                'bank_name': 'HDFC Bank',
                'pan_number': f'ABCD{code[-3:]}123E',
            })
            self.employees.append(emp)

        # Attendance  (in_time/out_time are TimeField, NOT check_in/check_out)
        for emp in self.employees[:4]:
            for day_offset in range(0, 26):
                att_date = date(2026, 3, 1) + timedelta(days=day_offset)
                if att_date.weekday() >= 6:
                    continue
                Attendance.objects.get_or_create(
                    employee=emp, date=att_date,
                    defaults={
                        'status': 'present',
                        'shift': 'Morning',
                        'in_time': '08:30',
                        'out_time': '17:30',
                        'notes': '',
                    }
                )

        # SalaryRecord fields: working_days, present_days, absent_days, gross_earnings,
        #                      other_allowance, other_deduction, total_deductions, paid_date
        for emp in self.employees:
            hra   = emp.basic_salary * Decimal('0.40')
            da    = emp.basic_salary * Decimal('0.15')
            pf    = emp.basic_salary * Decimal('0.12')
            esi   = (emp.basic_salary + hra + da) * Decimal('0.0075')
            gross = emp.basic_salary + hra + da
            total_ded = pf + esi
            net   = gross - total_ded
            SalaryRecord.objects.get_or_create(
                employee=emp, month=3, year=2026,
                defaults={
                    'working_days': 26,
                    'present_days': Decimal('26'),
                    'absent_days':  Decimal('0'),
                    'basic_salary': emp.basic_salary,
                    'hra': hra, 'da': da,
                    'other_allowance': Decimal('0'),
                    'pf_deduction': pf,
                    'esi_deduction': esi,
                    'other_deduction': Decimal('0'),
                    'total_deductions': total_ded,
                    'gross_earnings': gross,
                    'net_salary': net,
                    'status': 'paid',
                    'paid_date': date(2026, 4, 1),
                }
            )

        self.stdout.write(f'     OK 5 departments, {len(self.employees)} employees, attendance + salary for March 2026')

    # ---------------------------------------------------------
    # 8. MEDICAL TEXTILE
    # ---------------------------------------------------------
    def _seed_medical_textile(self):
        self.stdout.write('  > Medical Textile (Compliance, Traceability, Sterility, CAPA, Shelf Life)')
        from medical_textile.models import (
            RegulatoryCompliance, BatchTraceability,
            SterilityRecord, CAPA, ShelfLifeRecord,
        )
        from production.models import Batch

        batch = Batch.objects.filter(batch_number='BAT-WO-20260201-001').first()

        # RegulatoryCompliance: item (FK), standard (choice), certificate_number, issuing_body, issue_date, expiry_date
        RegulatoryCompliance.objects.get_or_create(
            certificate_number='ISO13485-2026-001',
            defaults={
                'item': self.fg_medical_nw,
                'standard': 'iso_13485',
                'issuing_body': 'Bureau Veritas India Pvt Ltd',
                'issue_date': date(2024, 4, 1), 'expiry_date': date(2027, 3, 31),
                'status': 'active',
                'scope': 'Design, manufacture and supply of medical nonwoven fabrics',
                'notes': 'Covers surgical drapes, gowns, wound care nonwoven.',
                'created_by': self.admin_user,
            }
        )
        RegulatoryCompliance.objects.get_or_create(
            certificate_number='CE-MARK-2025-042',
            defaults={
                'item': self.fg_medical_nw,
                'standard': 'ce_mark',
                'issuing_body': 'TUV Rheinland GmbH, Germany',
                'issue_date': date(2025, 1, 15), 'expiry_date': date(2028, 1, 14),
                'status': 'active',
                'scope': 'Class I medical devices - sterile surgical draping nonwoven',
                'notes': 'Required for EU export. Annual surveillance audit in Jan.',
                'created_by': self.admin_user,
            }
        )

        # BatchTraceability: batch (OneToOne), item (FK), raw_material_lot, supplier_batch_ref,
        #                    production_date, operator_name, supervisor_name, qc_passed, etc.
        if batch:
            BatchTraceability.objects.get_or_create(
                batch=batch,
                defaults={
                    'item': self.fg_medical_nw,
                    'raw_material_lot': 'RM-PSF-20260120',
                    'supplier_batch_ref': 'GNF-LOT-2026-0038',
                    'raw_material_coa': 'COA-GNF-2026-0038',
                    'production_date': date(2026, 2, 5),
                    'production_line': 'Thermal Bond Line MCH-001',
                    'operator_name': 'Murugan S',
                    'supervisor_name': 'Rajan Kumar',
                    'qc_passed': True,
                    'qc_checked_by': 'Suresh Babu',
                    'qc_date': date(2026, 2, 5),
                    'qc_remarks': 'All parameters pass. ISO 13485 lot release #QC-2026-0023.',
                    'dispatched_to': 'Apollo Hospitals Pvt Ltd, Chennai',
                    'dispatch_date': date(2026, 3, 12),
                    'invoice_reference': 'INV-20260310-001',
                    'notes': 'COA issued. Sterility cert attached.',
                    'created_by': self.admin_user,
                }
            )

            # SterilityRecord: batch (FK), sterilization_method choice ('eo_gas'), sterilization_date
            SterilityRecord.objects.get_or_create(
                batch=batch,
                defaults={
                    'sterilization_method': 'eo_gas',
                    'sterilization_date': date(2026, 2, 6),
                    'sterilized_by': 'Stericert Labs, Chennai',
                    'cycle_number': 'CYC-2026-0089',
                    'temperature': Decimal('54.0'),
                    'exposure_time_min': 180,
                    'test_result': 'pass',
                    'test_date': date(2026, 2, 7),
                    'tested_by': 'Stericert Labs QC',
                    'certificate_number': 'STR-CERT-2026-0089',
                    'remarks': 'D10 value 3.2 min. SAL 10-6 confirmed.',
                    'created_by': self.admin_user,
                }
            )

            # ShelfLifeRecord: batch (OneToOne), item (FK), manufacture_date, expiry_date,
            #                  storage_condition, quantity_remaining (NOT unit, NOT manufacturing_date)
            ShelfLifeRecord.objects.get_or_create(
                batch=batch,
                defaults={
                    'item': self.fg_medical_nw,
                    'manufacture_date': date(2026, 2, 5),
                    'expiry_date': date(2027, 2, 5),
                    'shelf_life_months': 12,
                    'storage_condition': 'Below 30 deg C, 65% RH. Away from moisture and UV.',
                    'status': 'valid',
                    'quantity_remaining': Decimal('1980'),
                    'notes': 'Shelf life per ISO 11607-1 guidelines. Check quarterly.',
                    'created_by': self.admin_user,
                }
            )

        # CAPA: capa_type ('corrective'/'preventive'), closed_date (NOT completion_date)
        #       related_batch (FK), related_item (FK)
        CAPA.objects.get_or_create(capa_number='CAPA-20260115-001', defaults={
            'capa_type': 'corrective',
            'source': 'customer_complaint',
            'description': 'Apollo Hospitals reported GSM variation of 2.4% in lot FG-2026-0008. '
                           'Spec allows +-2%. Root cause: binder dosing pump calibration drift.',
            'root_cause': 'Binder dosing pump flow meter drifted 3.5% over 3 months without recalibration.',
            'action_taken': '1. Pump recalibrated on 17-Jan-2026. '
                            '2. Calibration frequency changed to monthly. '
                            '3. SOP-QC-05 updated to include daily pump check.',
            'responsible_person': 'Rajan Kumar',
            'target_date': date(2026, 2, 15),
            'closed_date': date(2026, 2, 10),
            'status': 'closed',
            'effectiveness_check': 'Subsequent 3 lots showed GSM variation < 1.2%. CAPA effective.',
            'related_item': self.fg_medical_nw,
            'related_batch': batch,
            'created_by': self.admin_user,
        })
        CAPA.objects.get_or_create(capa_number='CAPA-20260301-002', defaults={
            'capa_type': 'corrective',
            'source': 'internal_audit',
            'description': 'Internal QC: tensile MD = 385 N/5cm vs spec >= 400 N/5cm.',
            'root_cause': 'Under investigation - suspected web formation speed too high.',
            'action_taken': 'Batch quarantined. Speed parameters under review.',
            'responsible_person': 'Suresh Babu',
            'target_date': date(2026, 4, 1),
            'status': 'open',
            'related_item': self.fg_medical_nw,
            'created_by': self.admin_user,
        })

        self.stdout.write('     OK 2 compliances, traceability, sterility, 2 CAPAs, shelf life created')

    # ---------------------------------------------------------
    # 9. TECHNICAL TEXTILE
    # ---------------------------------------------------------
    def _seed_technical_textile(self):
        self.stdout.write('  > Technical Textile (Categories, Specs, Samples, TDS, Lab, R&D)')
        from technical_textile.models import (
            TechnicalProductCategory, PerformanceSpec,
            Sample, TechnicalDataSheet, TestingLabRecord, RDProject,
        )

        # TechnicalProductCategory: name, code, description, application  (NOT end_use_segment)
        cat_med, _ = TechnicalProductCategory.objects.get_or_create(name='Medical Nonwoven', defaults={
            'code': 'MED-NW',
            'description': 'Spunbond and thermally bonded nonwoven for medical use',
            'application': 'Surgical drapes, gowns, wound care, sterile packaging',
        })
        cat_geo, _ = TechnicalProductCategory.objects.get_or_create(name='Woven Geotextile', defaults={
            'code': 'GEO-WV',
            'description': 'High tenacity woven geosynthetics for civil engineering',
            'application': 'Road construction, embankment stabilisation, drainage',
        })
        cat_agro, _ = TechnicalProductCategory.objects.get_or_create(name='Agrotextile', defaults={
            'code': 'AGRO',
            'description': 'UV stabilised crop protection and shade nets',
            'application': 'Crop protection, shade nets, mulch mats',
        })

        # PerformanceSpec: item (FK), category (FK), spec_version, status, gsm, width_cm,
        #   tensile_strength_warp/weft, elongation_warp/weft, standard_reference, notes
        #   (NO spec_number, NO spec_name, NO gsm_min/gsm_max, NO tensile_md_min)
        spec1, _ = PerformanceSpec.objects.get_or_create(
            item=self.fg_medical_nw,
            spec_version='v1.0',
            defaults={
                'category': cat_med,
                'status': 'approved',
                'gsm': Decimal('25'),
                'width_cm': Decimal('160'),
                'tensile_strength_warp': Decimal('420'),
                'tensile_strength_weft': Decimal('215'),
                'elongation_warp': Decimal('38'),
                'elongation_weft': Decimal('52'),
                'composition': '100% Polyester',
                'standard_reference': 'ISO 9073-3, EN 13795, ISO 13485',
                'notes': 'Surgical nonwoven spec for Apollo Hospitals. Sterile pack required.',
                'created_by': self.admin_user,
            }
        )
        spec2, _ = PerformanceSpec.objects.get_or_create(
            item=self.fg_geotextile,
            spec_version='v1.0',
            defaults={
                'category': cat_geo,
                'status': 'approved',
                'gsm': Decimal('200'),
                'width_cm': Decimal('520'),
                'tensile_strength_warp': Decimal('50000'),
                'tensile_strength_weft': Decimal('50000'),
                'elongation_warp': Decimal('12'),
                'elongation_weft': Decimal('12'),
                'composition': '100% PET',
                'standard_reference': 'IS 13162, ASTM D4632, EN ISO 12236',
                'notes': 'Road geotextile spec. CBR puncture >= 3.5 kN.',
                'created_by': self.admin_user,
            }
        )

        # Sample: sample_number, item (FK), customer (FK), quantity, sent_date, approved_date,
        #         status, customer_remarks, internal_notes
        #         (NO product_description, NO gsm, NO quantity_sent, NO unit, NO remarks, NO feedback_received)
        Sample.objects.get_or_create(
            sample_number='SMP-20260220-001',
            defaults={
                'item': self.fg_protective,
                'customer': self.cust2,
                'quantity': Decimal('50'),
                'sent_date': date(2026, 2, 22),
                'status': 'sent',
                'customer_remarks': '',
                'internal_notes': 'PTFE coating trial. DTDC courier AWB: 123456789. Follow up 2026-03-08.',
                'created_by': self.admin_user,
            }
        )
        Sample.objects.get_or_create(
            sample_number='SMP-20260115-002',
            defaults={
                'item': self.fg_medical_nw,
                'customer': self.cust1,
                'quantity': Decimal('100'),
                'sent_date': date(2026, 1, 15),
                'approved_date': date(2026, 2, 1),
                'status': 'approved',
                'customer_remarks': 'Apollo approved 30 GSM variant. To be quoted for next order cycle.',
                'internal_notes': 'Higher weight 30 GSM trial.',
                'created_by': self.admin_user,
            }
        )

        # TechnicalDataSheet: tds_number, item (FK), spec (FK), issue_date, revision_number,
        #                     status, prepared_by, approved_by, notes
        #                     (NO product, NO version, NO gsm, NO tensile, NO issued_date)
        TechnicalDataSheet.objects.get_or_create(
            tds_number='TDS-FG-001-R2',
            defaults={
                'item': self.fg_medical_nw,
                'spec': spec1,
                'issue_date': date(2026, 1, 10),
                'revision_number': 'R2',
                'status': 'issued',
                'prepared_by': 'Suresh Babu',
                'approved_by': 'Rajan Kumar',
                'notes': 'Medical Nonwoven 25 GSM. Tensile MD 420N, CD 215N. ISO 13485 certified.',
            }
        )
        TechnicalDataSheet.objects.get_or_create(
            tds_number='TDS-FG-002-R1',
            defaults={
                'item': self.fg_geotextile,
                'spec': spec2,
                'issue_date': date(2026, 1, 20),
                'revision_number': 'R1',
                'status': 'issued',
                'prepared_by': 'Suresh Babu',
                'approved_by': 'Rajan Kumar',
                'notes': 'Woven Geotextile 200 GSM. Tensile 50 kN/m. IS 13162 certified.',
            }
        )

        # TestingLabRecord: test_number, item (FK), test_type, test_date, tested_by, lab_name,
        #   gsm_actual, tensile_warp_actual, tensile_weft_actual, overall_result, standard_used
        #   (NO gsm_measured, NO tensile_md_result, NO result, NO report_number, NO sample_description)
        TestingLabRecord.objects.get_or_create(
            test_number='LAB-20260205-001',
            defaults={
                'item': self.fg_medical_nw,
                'test_type': 'physical',
                'test_date': date(2026, 2, 5),
                'tested_by': 'Suresh Babu',
                'lab_name': 'SASI In-House QC Lab',
                'gsm_actual': Decimal('25.2'),
                'tensile_warp_actual': Decimal('420.5'),
                'tensile_weft_actual': Decimal('218.0'),
                'elongation_warp_actual': Decimal('38.2'),
                'elongation_weft_actual': Decimal('51.8'),
                'overall_result': 'pass',
                'standard_used': 'ISO 9073-3 (Tensile), ISO 9073-2 (Thickness)',
                'remarks': 'All parameters pass. Approved for dispatch to Apollo Hospitals.',
                'created_by': self.admin_user,
            }
        )
        TestingLabRecord.objects.get_or_create(
            test_number='LAB-20260210-002',
            defaults={
                'item': self.fg_geotextile,
                'test_type': 'mechanical',
                'test_date': date(2026, 2, 10),
                'tested_by': 'Suresh Babu',
                'lab_name': 'SASI In-House QC Lab',
                'gsm_actual': Decimal('203.0'),
                'tensile_warp_actual': Decimal('52400'),
                'tensile_weft_actual': Decimal('51800'),
                'overall_result': 'pass',
                'standard_used': 'ASTM D4632 (Grab tensile), EN ISO 12236 (CBR)',
                'remarks': 'Exceeds IS 13162 requirements. Approved for full production.',
                'created_by': self.admin_user,
            }
        )

        # RDProject: project_number, project_name, objective, target_product, category (FK),
        #            start_date, target_end_date, status ('in_progress' not 'active'),
        #            lead_engineer (NOT team_members), outcome (NOT progress_notes)
        RDProject.objects.get_or_create(
            project_number='RD-2026-001',
            defaults={
                'project_name': 'Biodegradable Medical Nonwoven using PLA Fibre',
                'objective': 'Develop medical grade nonwoven using PLA fibres to replace polyester. '
                             'Target: 25 GSM, compostable in 180 days.',
                'target_product': 'PLA Medical Nonwoven 25 GSM - biodegradable',
                'category': cat_med,
                'start_date': date(2026, 1, 1),
                'target_end_date': date(2026, 12, 31),
                'status': 'in_progress',
                'lead_engineer': 'Rajan Kumar',
                'budget': Decimal('450000'),
                'outcome': 'Phase 1 complete. PLA 1.5D passes web formation. Phase 2 bonding in progress.',
                'created_by': self.admin_user,
            }
        )
        RDProject.objects.get_or_create(
            project_number='RD-2025-003',
            defaults={
                'project_name': 'High-Tenacity Geotextile using Recycled PET',
                'objective': 'Evaluate rPET yarn for woven geotextile to reduce carbon footprint by 40%.',
                'target_product': 'rPET Woven Geotextile 200 GSM - sustainable',
                'category': cat_geo,
                'start_date': date(2025, 6, 1),
                'target_end_date': date(2026, 5, 31),
                'status': 'testing',
                'lead_engineer': 'Suresh Babu',
                'budget': Decimal('280000'),
                'outcome': 'rPET yarn trials done. Tensile 95% of virgin PET. Cost saving 18%.',
                'created_by': self.admin_user,
            }
        )

        self.stdout.write('     OK 3 categories, 2 performance specs, 2 samples, 2 TDS, 2 lab records, 2 R&D projects')
