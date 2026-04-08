# ============================================================
# FILE: reports/registry.py
# PURPOSE: Defines all available Report Maker data sources.
#          Each source is a pre-joined queryset with filterable fields.
#          Add new sources here — they appear automatically in the UI.
# ============================================================

from django.db.models import Q
from sales.models       import SalesOrder, Invoice, Quotation, CustomerInquiry
from purchasing.models  import PurchaseOrder, GoodsReceipt
from production.models  import WorkOrder, Batch, BillOfMaterials, Machine
from inventory.models   import Stock, StockMovement
from hr_payroll.models  import Employee, SalaryRecord
from master_data.models import Customer, Supplier, Item, Warehouse


# ── helpers ──────────────────────────────────────────────────

def _s(v):
    """Convert any value to a safe string for the report row."""
    if v is None:
        return ''
    return str(v)


def _apply_search(qs, search, *fields):
    if not search:
        return qs
    q = Q()
    for f in fields:
        q |= Q(**{f'{f}__icontains': search})
    return qs.filter(q)


# ============================================================
# SOURCE GETTER FUNCTIONS
# ============================================================

def _sales_orders(f):
    qs = SalesOrder.objects.select_related('customer', 'warehouse').all()
    if f.get('status'):         qs = qs.filter(status=f['status'])
    if f.get('order_date_from'): qs = qs.filter(order_date__gte=f['order_date_from'])
    if f.get('order_date_to'):   qs = qs.filter(order_date__lte=f['order_date_to'])
    qs = _apply_search(qs, f.get('search'), 'so_number', 'customer__customer_name')
    return [{
        'so_number':      _s(o.so_number),
        'order_date':     _s(o.order_date),
        'delivery_date':  _s(o.delivery_date),
        'status':         _s(o.status),
        'total_amount':   _s(o.total_amount),
        'notes':          _s(o.notes),
        'customer_name':  _s(o.customer.customer_name),
        'customer_code':  _s(o.customer.customer_code),
        'customer_phone': _s(o.customer.phone),
        'customer_email': _s(o.customer.email),
        'customer_city':  _s(o.customer.city),
        'customer_gstin': _s(o.customer.gstin),
        'warehouse':      _s(o.warehouse.name),
    } for o in qs.order_by('-order_date')]


def _invoices(f):
    qs = Invoice.objects.select_related('customer', 'sales_order', 'sales_order__warehouse').all()
    if f.get('status'):          qs = qs.filter(status=f['status'])
    if f.get('invoice_date_from'): qs = qs.filter(invoice_date__gte=f['invoice_date_from'])
    if f.get('invoice_date_to'):   qs = qs.filter(invoice_date__lte=f['invoice_date_to'])
    qs = _apply_search(qs, f.get('search'), 'invoice_number', 'customer__customer_name', 'sales_order__so_number')
    return [{
        'invoice_number':  _s(i.invoice_number),
        'invoice_date':    _s(i.invoice_date),
        'due_date':        _s(i.due_date),
        'status':          _s(i.status),
        'subtotal':        _s(i.subtotal),
        'tax_amount':      _s(i.tax_amount),
        'total_amount':    _s(i.total_amount),
        'paid_amount':     _s(i.paid_amount),
        'balance_due':     _s(i.balance_due),
        'notes':           _s(i.notes),
        'so_number':       _s(i.sales_order.so_number),
        'customer_name':   _s(i.customer.customer_name),
        'customer_code':   _s(i.customer.customer_code),
        'customer_phone':  _s(i.customer.phone),
        'customer_gstin':  _s(i.customer.gstin),
    } for i in qs.order_by('-invoice_date')]


def _quotations(f):
    qs = Quotation.objects.select_related('customer', 'inquiry').all()
    if f.get('status'):      qs = qs.filter(status=f['status'])
    if f.get('date_from'):   qs = qs.filter(date__gte=f['date_from'])
    if f.get('date_to'):     qs = qs.filter(date__lte=f['date_to'])
    qs = _apply_search(qs, f.get('search'), 'quotation_number', 'customer__customer_name')
    return [{
        'quotation_number':    _s(q.quotation_number),
        'date':                _s(q.date),
        'valid_until':         _s(q.valid_until),
        'status':              _s(q.status),
        'product_description': _s(q.product_description),
        'quantity':            _s(q.quantity),
        'unit':                _s(q.unit),
        'unit_price':          _s(q.unit_price),
        'total_amount':        _s(q.total_amount),
        'lead_time_days':      _s(q.lead_time_days),
        'payment_terms':       _s(q.payment_terms),
        'delivery_terms':      _s(q.delivery_terms),
        'customer_name':       _s(q.customer.customer_name),
        'customer_code':       _s(q.customer.customer_code),
        'customer_phone':      _s(q.customer.phone),
        'inquiry_number':      _s(q.inquiry.inquiry_number if q.inquiry else ''),
    } for q in qs.order_by('-date')]


def _inquiries(f):
    qs = CustomerInquiry.objects.select_related('customer').all()
    if f.get('status'):        qs = qs.filter(status=f['status'])
    if f.get('date_from'):     qs = qs.filter(received_date__gte=f['date_from'])
    if f.get('date_to'):       qs = qs.filter(received_date__lte=f['date_to'])
    qs = _apply_search(qs, f.get('search'), 'inquiry_number', 'customer__customer_name', 'product_description')
    return [{
        'inquiry_number':      _s(i.inquiry_number),
        'received_date':       _s(i.received_date),
        'status':              _s(i.status),
        'product_description': _s(i.product_description),
        'end_use':             _s(i.end_use),
        'quantity_required':   _s(i.quantity_required),
        'unit':                _s(i.unit),
        'target_price':        _s(i.target_price),
        'required_by_date':    _s(i.required_by_date),
        'assigned_to':         _s(i.assigned_to),
        'notes':               _s(i.notes),
        'customer_name':       _s(i.customer.customer_name),
        'customer_code':       _s(i.customer.customer_code),
        'customer_phone':      _s(i.customer.phone),
    } for i in qs.order_by('-received_date')]


def _purchase_orders(f):
    qs = PurchaseOrder.objects.select_related('supplier', 'warehouse').all()
    if f.get('status'):          qs = qs.filter(status=f['status'])
    if f.get('order_date_from'): qs = qs.filter(order_date__gte=f['order_date_from'])
    if f.get('order_date_to'):   qs = qs.filter(order_date__lte=f['order_date_to'])
    qs = _apply_search(qs, f.get('search'), 'po_number', 'supplier__supplier_name')
    return [{
        'po_number':       _s(p.po_number),
        'order_date':      _s(p.order_date),
        'expected_date':   _s(p.expected_date),
        'status':          _s(p.status),
        'total_amount':    _s(p.total_amount),
        'notes':           _s(p.notes),
        'supplier_name':   _s(p.supplier.supplier_name),
        'supplier_code':   _s(p.supplier.supplier_code),
        'supplier_phone':  _s(p.supplier.phone),
        'supplier_email':  _s(p.supplier.email),
        'supplier_city':   _s(p.supplier.city),
        'supplier_gstin':  _s(p.supplier.gstin),
        'warehouse':       _s(p.warehouse.name),
    } for p in qs.order_by('-order_date')]


def _goods_receipts(f):
    qs = GoodsReceipt.objects.select_related(
        'purchase_order', 'purchase_order__supplier', 'purchase_order__warehouse'
    ).all()
    if f.get('status'):      qs = qs.filter(status=f['status'])
    if f.get('date_from'):   qs = qs.filter(receipt_date__gte=f['date_from'])
    if f.get('date_to'):     qs = qs.filter(receipt_date__lte=f['date_to'])
    qs = _apply_search(qs, f.get('search'), 'grn_number', 'purchase_order__po_number', 'purchase_order__supplier__supplier_name')
    return [{
        'grn_number':             _s(g.grn_number),
        'receipt_date':           _s(g.receipt_date),
        'status':                 _s(g.status),
        'supplier_invoice_number': _s(g.supplier_invoice_number),
        'notes':                  _s(g.notes),
        'po_number':              _s(g.purchase_order.po_number),
        'supplier_name':          _s(g.purchase_order.supplier.supplier_name),
        'supplier_code':          _s(g.purchase_order.supplier.supplier_code),
        'warehouse':              _s(g.purchase_order.warehouse.name),
    } for g in qs.order_by('-receipt_date')]


def _work_orders(f):
    qs = WorkOrder.objects.select_related('bom', 'finished_product', 'warehouse').all()
    if f.get('status'):      qs = qs.filter(status=f['status'])
    if f.get('date_from'):   qs = qs.filter(planned_start_date__gte=f['date_from'])
    if f.get('date_to'):     qs = qs.filter(planned_start_date__lte=f['date_to'])
    qs = _apply_search(qs, f.get('search'), 'work_order_number', 'finished_product__item_name')
    return [{
        'work_order_number':  _s(w.work_order_number),
        'planned_start_date': _s(w.planned_start_date),
        'planned_end_date':   _s(w.planned_end_date),
        'actual_end_date':    _s(getattr(w, 'actual_end_date', '')),
        'status':             _s(w.status),
        'planned_quantity':   _s(w.planned_quantity),
        'actual_quantity':    _s(w.actual_quantity),
        'notes':              _s(w.notes),
        'bom_name':           _s(w.bom.bom_name),
        'finished_product':   _s(w.finished_product.item_name),
        'product_code':       _s(w.finished_product.item_code),
        'warehouse':          _s(w.warehouse.name),
    } for w in qs.order_by('-planned_start_date')]


def _batches(f):
    qs = Batch.objects.select_related('item', 'work_order').all()
    if f.get('date_from'):  qs = qs.filter(production_date__gte=f['date_from'])
    if f.get('date_to'):    qs = qs.filter(production_date__lte=f['date_to'])
    qs = _apply_search(qs, f.get('search'), 'batch_number', 'item__item_name')
    return [{
        'batch_number':     _s(b.batch_number),
        'production_date':  _s(b.production_date),
        'expiry_date':      _s(b.expiry_date),
        'quantity_produced': _s(b.quantity_produced),
        'item_code':        _s(b.item.item_code),
        'item_name':        _s(b.item.item_name),
        'work_order':       _s(b.work_order.work_order_number),
    } for b in qs.order_by('-production_date')]


def _stock(f):
    qs = Stock.objects.select_related('item', 'item__unit_of_measure', 'warehouse').filter(quantity__gt=0)
    if f.get('item_type'): qs = qs.filter(item__item_type=f['item_type'])
    if f.get('warehouse'): qs = qs.filter(warehouse__name__icontains=f['warehouse'])
    qs = _apply_search(qs, f.get('search'), 'item__item_name', 'item__item_code')
    return [{
        'item_code':      _s(s.item.item_code),
        'item_name':      _s(s.item.item_name),
        'item_type':      _s(s.item.item_type),
        'quantity':       _s(s.quantity),
        'unit':           _s(s.item.unit_of_measure.short_name if s.item.unit_of_measure else ''),
        'minimum_stock':  _s(s.item.minimum_stock),
        'standard_price': _s(s.item.standard_price),
        'warehouse':      _s(s.warehouse.name),
        'updated_at':     s.updated_at.strftime('%Y-%m-%d %H:%M'),
    } for s in qs.order_by('item__item_name')]


def _stock_movements(f):
    qs = StockMovement.objects.select_related('item', 'warehouse', 'created_by').all()
    if f.get('movement_type'): qs = qs.filter(movement_type=f['movement_type'])
    if f.get('date_from'):     qs = qs.filter(created_at__date__gte=f['date_from'])
    if f.get('date_to'):       qs = qs.filter(created_at__date__lte=f['date_to'])
    qs = _apply_search(qs, f.get('search'), 'item__item_name', 'reference_number')
    return [{
        'date':            m.created_at.strftime('%Y-%m-%d %H:%M'),
        'item_code':       _s(m.item.item_code),
        'item_name':       _s(m.item.item_name),
        'warehouse':       _s(m.warehouse.name),
        'movement_type':   _s(m.movement_type),
        'quantity':        _s(m.quantity),
        'reference_number': _s(m.reference_number),
        'notes':           _s(m.notes),
        'created_by':      _s(m.created_by.username if m.created_by else ''),
    } for m in qs.order_by('-created_at')[:500]]


def _employees(f):
    qs = Employee.objects.select_related('department').filter(status='active')
    if f.get('status'):      qs = Employee.objects.select_related('department').filter(status=f['status']) if f['status'] else qs
    if f.get('department'):  qs = qs.filter(department__name__icontains=f['department'])
    if f.get('emp_type'):    qs = qs.filter(employment_type=f['emp_type'])
    qs = _apply_search(qs, f.get('search'), 'first_name', 'last_name', 'employee_code', 'designation')
    return [{
        'employee_code':    _s(e.employee_code),
        'full_name':        _s(e.full_name),
        'gender':           _s(e.gender),
        'phone':            _s(e.phone),
        'email':            _s(e.email),
        'designation':      _s(e.designation),
        'department':       _s(e.department.name if e.department else ''),
        'employment_type':  _s(e.employment_type),
        'date_of_joining':  _s(e.date_of_joining),
        'status':           _s(e.status),
        'basic_salary':     _s(e.basic_salary),
        'gross_salary':     _s(e.gross_salary),
        'bank_name':        _s(e.bank_name),
        'pan_number':       _s(e.pan_number),
        'pf_number':        _s(e.pf_number),
    } for e in qs.order_by('employee_code')]


def _salary_records(f):
    qs = SalaryRecord.objects.select_related('employee', 'employee__department').all()
    if f.get('month'):  qs = qs.filter(month=f['month'])
    if f.get('year'):   qs = qs.filter(year=f['year'])
    if f.get('status'): qs = qs.filter(status=f['status'])
    qs = _apply_search(qs, f.get('search'), 'employee__first_name', 'employee__employee_code')
    return [{
        'employee_code':  _s(s.employee.employee_code),
        'employee_name':  _s(s.employee.full_name),
        'department':     _s(s.employee.department.name if s.employee.department else ''),
        'month':          _s(s.month),
        'year':           _s(s.year),
        'working_days':   _s(s.working_days),
        'present_days':   _s(s.present_days),
        'absent_days':    _s(s.absent_days),
        'basic_salary':   _s(s.basic_salary),
        'hra':            _s(s.hra),
        'da':             _s(s.da),
        'other_allowance': _s(s.other_allowance),
        'overtime_pay':   _s(s.overtime_pay),
        'gross_earnings': _s(s.gross_earnings),
        'pf_deduction':   _s(s.pf_deduction),
        'esi_deduction':  _s(s.esi_deduction),
        'total_deductions': _s(s.total_deductions),
        'net_salary':     _s(s.net_salary),
        'status':         _s(s.status),
        'paid_date':      _s(s.paid_date),
    } for s in qs.order_by('-year', '-month')]


def _items(f):
    qs = Item.objects.select_related('category', 'unit_of_measure').filter(is_active=True)
    if f.get('item_type'): qs = qs.filter(item_type=f['item_type'])
    qs = _apply_search(qs, f.get('search'), 'item_code', 'item_name', 'hsn_code')
    return [{
        'item_code':       _s(i.item_code),
        'item_name':       _s(i.item_name),
        'item_type':       _s(i.item_type),
        'category':        _s(i.category.name if i.category else ''),
        'unit':            _s(i.unit_of_measure.short_name if i.unit_of_measure else ''),
        'description':     _s(i.description),
        'hsn_code':        _s(i.hsn_code),
        'yarn_count':      _s(i.yarn_count),
        'composition':     _s(i.composition),
        'minimum_stock':   _s(i.minimum_stock),
        'standard_price':  _s(i.standard_price),
    } for i in qs.order_by('item_code')]


def _customers(f):
    qs = Customer.objects.filter(is_active=True)
    if f.get('customer_type'): qs = qs.filter(customer_type=f['customer_type'])
    qs = _apply_search(qs, f.get('search'), 'customer_name', 'customer_code', 'phone', 'city')
    return [{
        'customer_code':   _s(c.customer_code),
        'customer_name':   _s(c.customer_name),
        'customer_type':   _s(c.customer_type),
        'contact_person':  _s(c.contact_person),
        'phone':           _s(c.phone),
        'email':           _s(c.email),
        'address':         _s(c.address),
        'city':            _s(c.city),
        'state':           _s(c.state),
        'country':         _s(c.country),
        'gstin':           _s(c.gstin),
        'credit_days':     _s(c.credit_days),
        'credit_limit':    _s(c.credit_limit),
    } for c in qs.order_by('customer_name')]


def _suppliers(f):
    qs = Supplier.objects.filter(is_active=True)
    if f.get('supplier_type'): qs = qs.filter(supplier_type=f['supplier_type'])
    qs = _apply_search(qs, f.get('search'), 'supplier_name', 'supplier_code', 'phone', 'city')
    return [{
        'supplier_code':   _s(s.supplier_code),
        'supplier_name':   _s(s.supplier_name),
        'supplier_type':   _s(s.supplier_type),
        'contact_person':  _s(s.contact_person),
        'phone':           _s(s.phone),
        'email':           _s(s.email),
        'address':         _s(s.address),
        'city':            _s(s.city),
        'state':           _s(s.state),
        'country':         _s(s.country),
        'gstin':           _s(s.gstin),
        'payment_days':    _s(s.payment_days),
    } for s in qs.order_by('supplier_name')]


# ============================================================
# SOURCE REGISTRY
# Each source entry defines:
#   label       — display name
#   group       — sidebar group (Sales, Purchasing, etc.)
#   modules     — human-readable list of linked modules
#   description — one-line explanation
#   fields      — all available columns [{key, label, type}]
#   filter_fields — filterable fields [{key, label, type, options?}]
#   get_rows    — callable(filters_dict) → list[dict]
# ============================================================

SOURCES = {

    'sales_orders': {
        'label': 'Sales Orders + Customer',
        'group': 'Sales',
        'modules': ['Sales Order', 'Customer'],
        'description': 'All sales orders with full customer details',
        'fields': [
            {'key': 'so_number',      'label': 'SO Number',       'type': 'str'},
            {'key': 'order_date',     'label': 'Order Date',      'type': 'date'},
            {'key': 'delivery_date',  'label': 'Delivery Date',   'type': 'date'},
            {'key': 'status',         'label': 'Status',          'type': 'str'},
            {'key': 'total_amount',   'label': 'Total Amount',    'type': 'decimal'},
            {'key': 'warehouse',      'label': 'Warehouse',       'type': 'str'},
            {'key': 'notes',          'label': 'Notes',           'type': 'str'},
            {'key': 'customer_name',  'label': 'Customer Name',   'type': 'str'},
            {'key': 'customer_code',  'label': 'Customer Code',   'type': 'str'},
            {'key': 'customer_phone', 'label': 'Customer Phone',  'type': 'str'},
            {'key': 'customer_email', 'label': 'Customer Email',  'type': 'str'},
            {'key': 'customer_city',  'label': 'Customer City',   'type': 'str'},
            {'key': 'customer_gstin', 'label': 'Customer GSTIN',  'type': 'str'},
        ],
        'filter_fields': [
            {'key': 'status',          'label': 'Status',      'type': 'select',
             'options': ['draft','confirmed','partial','delivered','cancelled']},
            {'key': 'order_date_from', 'label': 'Order Date From', 'type': 'date'},
            {'key': 'order_date_to',   'label': 'Order Date To',   'type': 'date'},
            {'key': 'search',          'label': 'Search (SO# / Customer)', 'type': 'text'},
        ],
        'get_rows': _sales_orders,
    },

    'invoices': {
        'label': 'Invoices + Sales Order + Customer',
        'group': 'Sales',
        'modules': ['Invoice', 'Sales Order', 'Customer'],
        'description': 'All invoices linked to their sales orders and customers',
        'fields': [
            {'key': 'invoice_number', 'label': 'Invoice Number', 'type': 'str'},
            {'key': 'invoice_date',   'label': 'Invoice Date',   'type': 'date'},
            {'key': 'due_date',       'label': 'Due Date',       'type': 'date'},
            {'key': 'status',         'label': 'Status',         'type': 'str'},
            {'key': 'subtotal',       'label': 'Subtotal',       'type': 'decimal'},
            {'key': 'tax_amount',     'label': 'Tax Amount',     'type': 'decimal'},
            {'key': 'total_amount',   'label': 'Total Amount',   'type': 'decimal'},
            {'key': 'paid_amount',    'label': 'Paid Amount',    'type': 'decimal'},
            {'key': 'balance_due',    'label': 'Balance Due',    'type': 'decimal'},
            {'key': 'notes',          'label': 'Notes',          'type': 'str'},
            {'key': 'so_number',      'label': 'SO Number',      'type': 'str'},
            {'key': 'customer_name',  'label': 'Customer Name',  'type': 'str'},
            {'key': 'customer_code',  'label': 'Customer Code',  'type': 'str'},
            {'key': 'customer_phone', 'label': 'Customer Phone', 'type': 'str'},
            {'key': 'customer_gstin', 'label': 'Customer GSTIN', 'type': 'str'},
        ],
        'filter_fields': [
            {'key': 'status',            'label': 'Status',      'type': 'select',
             'options': ['draft','sent','paid','overdue','cancelled']},
            {'key': 'invoice_date_from', 'label': 'Invoice Date From', 'type': 'date'},
            {'key': 'invoice_date_to',   'label': 'Invoice Date To',   'type': 'date'},
            {'key': 'search',            'label': 'Search (Invoice# / Customer / SO#)', 'type': 'text'},
        ],
        'get_rows': _invoices,
    },

    'quotations': {
        'label': 'Quotations + Customer',
        'group': 'Sales',
        'modules': ['Quotation', 'Customer', 'Inquiry'],
        'description': 'All quotations with customer and linked inquiry reference',
        'fields': [
            {'key': 'quotation_number',    'label': 'Quotation Number',    'type': 'str'},
            {'key': 'date',                'label': 'Date',                'type': 'date'},
            {'key': 'valid_until',         'label': 'Valid Until',         'type': 'date'},
            {'key': 'status',              'label': 'Status',              'type': 'str'},
            {'key': 'product_description', 'label': 'Product Description', 'type': 'str'},
            {'key': 'quantity',            'label': 'Quantity',            'type': 'decimal'},
            {'key': 'unit',                'label': 'Unit',                'type': 'str'},
            {'key': 'unit_price',          'label': 'Unit Price',          'type': 'decimal'},
            {'key': 'total_amount',        'label': 'Total Amount',        'type': 'decimal'},
            {'key': 'lead_time_days',      'label': 'Lead Time (Days)',    'type': 'str'},
            {'key': 'payment_terms',       'label': 'Payment Terms',       'type': 'str'},
            {'key': 'delivery_terms',      'label': 'Delivery Terms',      'type': 'str'},
            {'key': 'customer_name',       'label': 'Customer Name',       'type': 'str'},
            {'key': 'customer_code',       'label': 'Customer Code',       'type': 'str'},
            {'key': 'customer_phone',      'label': 'Customer Phone',      'type': 'str'},
            {'key': 'inquiry_number',      'label': 'Inquiry Number',      'type': 'str'},
        ],
        'filter_fields': [
            {'key': 'status',    'label': 'Status',   'type': 'select',
             'options': ['draft','sent','accepted','rejected','expired']},
            {'key': 'date_from', 'label': 'Date From', 'type': 'date'},
            {'key': 'date_to',   'label': 'Date To',   'type': 'date'},
            {'key': 'search',    'label': 'Search (Quotation# / Customer)', 'type': 'text'},
        ],
        'get_rows': _quotations,
    },

    'inquiries': {
        'label': 'Customer Inquiries',
        'group': 'Sales',
        'modules': ['Inquiry', 'Customer'],
        'description': 'Customer inquiries with product and commercial details',
        'fields': [
            {'key': 'inquiry_number',      'label': 'Inquiry Number',      'type': 'str'},
            {'key': 'received_date',       'label': 'Received Date',       'type': 'date'},
            {'key': 'status',              'label': 'Status',              'type': 'str'},
            {'key': 'product_description', 'label': 'Product Description', 'type': 'str'},
            {'key': 'end_use',             'label': 'End Use',             'type': 'str'},
            {'key': 'quantity_required',   'label': 'Quantity Required',   'type': 'decimal'},
            {'key': 'unit',                'label': 'Unit',                'type': 'str'},
            {'key': 'target_price',        'label': 'Target Price',        'type': 'decimal'},
            {'key': 'required_by_date',    'label': 'Required By Date',    'type': 'date'},
            {'key': 'assigned_to',         'label': 'Assigned To',         'type': 'str'},
            {'key': 'notes',               'label': 'Notes',               'type': 'str'},
            {'key': 'customer_name',       'label': 'Customer Name',       'type': 'str'},
            {'key': 'customer_code',       'label': 'Customer Code',       'type': 'str'},
            {'key': 'customer_phone',      'label': 'Customer Phone',      'type': 'str'},
        ],
        'filter_fields': [
            {'key': 'status',    'label': 'Status',   'type': 'select',
             'options': ['new','quoted','won','lost','cancelled']},
            {'key': 'date_from', 'label': 'Date From', 'type': 'date'},
            {'key': 'date_to',   'label': 'Date To',   'type': 'date'},
            {'key': 'search',    'label': 'Search (Inquiry# / Customer / Product)', 'type': 'text'},
        ],
        'get_rows': _inquiries,
    },

    'purchase_orders': {
        'label': 'Purchase Orders + Supplier',
        'group': 'Purchasing',
        'modules': ['Purchase Order', 'Supplier'],
        'description': 'All purchase orders with full supplier details',
        'fields': [
            {'key': 'po_number',      'label': 'PO Number',       'type': 'str'},
            {'key': 'order_date',     'label': 'Order Date',      'type': 'date'},
            {'key': 'expected_date',  'label': 'Expected Date',   'type': 'date'},
            {'key': 'status',         'label': 'Status',          'type': 'str'},
            {'key': 'total_amount',   'label': 'Total Amount',    'type': 'decimal'},
            {'key': 'warehouse',      'label': 'Warehouse',       'type': 'str'},
            {'key': 'notes',          'label': 'Notes',           'type': 'str'},
            {'key': 'supplier_name',  'label': 'Supplier Name',   'type': 'str'},
            {'key': 'supplier_code',  'label': 'Supplier Code',   'type': 'str'},
            {'key': 'supplier_phone', 'label': 'Supplier Phone',  'type': 'str'},
            {'key': 'supplier_email', 'label': 'Supplier Email',  'type': 'str'},
            {'key': 'supplier_city',  'label': 'Supplier City',   'type': 'str'},
            {'key': 'supplier_gstin', 'label': 'Supplier GSTIN',  'type': 'str'},
        ],
        'filter_fields': [
            {'key': 'status',          'label': 'Status',      'type': 'select',
             'options': ['draft','confirmed','partial','received','cancelled']},
            {'key': 'order_date_from', 'label': 'Order Date From', 'type': 'date'},
            {'key': 'order_date_to',   'label': 'Order Date To',   'type': 'date'},
            {'key': 'search',          'label': 'Search (PO# / Supplier)', 'type': 'text'},
        ],
        'get_rows': _purchase_orders,
    },

    'goods_receipts': {
        'label': 'Goods Receipts + PO + Supplier',
        'group': 'Purchasing',
        'modules': ['Goods Receipt', 'Purchase Order', 'Supplier'],
        'description': 'GRN records linked to their purchase orders and suppliers',
        'fields': [
            {'key': 'grn_number',              'label': 'GRN Number',             'type': 'str'},
            {'key': 'receipt_date',            'label': 'Receipt Date',           'type': 'date'},
            {'key': 'status',                  'label': 'Status',                 'type': 'str'},
            {'key': 'supplier_invoice_number', 'label': 'Supplier Invoice #',     'type': 'str'},
            {'key': 'notes',                   'label': 'Notes',                  'type': 'str'},
            {'key': 'po_number',               'label': 'PO Number',              'type': 'str'},
            {'key': 'supplier_name',           'label': 'Supplier Name',          'type': 'str'},
            {'key': 'supplier_code',           'label': 'Supplier Code',          'type': 'str'},
            {'key': 'warehouse',               'label': 'Warehouse',              'type': 'str'},
        ],
        'filter_fields': [
            {'key': 'status',    'label': 'Status',   'type': 'select', 'options': ['draft','confirmed']},
            {'key': 'date_from', 'label': 'Date From', 'type': 'date'},
            {'key': 'date_to',   'label': 'Date To',   'type': 'date'},
            {'key': 'search',    'label': 'Search (GRN# / PO# / Supplier)', 'type': 'text'},
        ],
        'get_rows': _goods_receipts,
    },

    'work_orders': {
        'label': 'Work Orders + BOM + Product',
        'group': 'Production',
        'modules': ['Work Order', 'BOM', 'Finished Product'],
        'description': 'All work orders with BOM and finished product details',
        'fields': [
            {'key': 'work_order_number',  'label': 'WO Number',          'type': 'str'},
            {'key': 'planned_start_date', 'label': 'Planned Start Date', 'type': 'date'},
            {'key': 'planned_end_date',   'label': 'Planned End Date',   'type': 'date'},
            {'key': 'actual_end_date',    'label': 'Actual End Date',    'type': 'date'},
            {'key': 'status',             'label': 'Status',             'type': 'str'},
            {'key': 'planned_quantity',   'label': 'Planned Qty',        'type': 'decimal'},
            {'key': 'actual_quantity',    'label': 'Actual Qty',         'type': 'decimal'},
            {'key': 'notes',              'label': 'Notes',              'type': 'str'},
            {'key': 'bom_name',           'label': 'BOM Name',           'type': 'str'},
            {'key': 'finished_product',   'label': 'Finished Product',   'type': 'str'},
            {'key': 'product_code',       'label': 'Product Code',       'type': 'str'},
            {'key': 'warehouse',          'label': 'Warehouse',          'type': 'str'},
        ],
        'filter_fields': [
            {'key': 'status',    'label': 'Status',   'type': 'select',
             'options': ['confirmed','in_progress','completed','cancelled']},
            {'key': 'date_from', 'label': 'Start Date From', 'type': 'date'},
            {'key': 'date_to',   'label': 'Start Date To',   'type': 'date'},
            {'key': 'search',    'label': 'Search (WO# / Product)', 'type': 'text'},
        ],
        'get_rows': _work_orders,
    },

    'batches': {
        'label': 'Production Batches + Item',
        'group': 'Production',
        'modules': ['Batch', 'Work Order', 'Item'],
        'description': 'Production batch records with item and work order details',
        'fields': [
            {'key': 'batch_number',     'label': 'Batch Number',     'type': 'str'},
            {'key': 'production_date',  'label': 'Production Date',  'type': 'date'},
            {'key': 'expiry_date',      'label': 'Expiry Date',      'type': 'date'},
            {'key': 'quantity_produced', 'label': 'Qty Produced',    'type': 'decimal'},
            {'key': 'item_code',        'label': 'Item Code',        'type': 'str'},
            {'key': 'item_name',        'label': 'Item Name',        'type': 'str'},
            {'key': 'work_order',       'label': 'Work Order',       'type': 'str'},
        ],
        'filter_fields': [
            {'key': 'date_from', 'label': 'Production Date From', 'type': 'date'},
            {'key': 'date_to',   'label': 'Production Date To',   'type': 'date'},
            {'key': 'search',    'label': 'Search (Batch# / Item)', 'type': 'text'},
        ],
        'get_rows': _batches,
    },

    'stock': {
        'label': 'Stock Levels + Item',
        'group': 'Inventory',
        'modules': ['Stock', 'Item', 'Warehouse'],
        'description': 'Current stock levels for all items across warehouses',
        'fields': [
            {'key': 'item_code',      'label': 'Item Code',       'type': 'str'},
            {'key': 'item_name',      'label': 'Item Name',       'type': 'str'},
            {'key': 'item_type',      'label': 'Item Type',       'type': 'str'},
            {'key': 'quantity',       'label': 'Quantity',        'type': 'decimal'},
            {'key': 'unit',           'label': 'Unit',            'type': 'str'},
            {'key': 'minimum_stock',  'label': 'Min Stock',       'type': 'decimal'},
            {'key': 'standard_price', 'label': 'Standard Price',  'type': 'decimal'},
            {'key': 'warehouse',      'label': 'Warehouse',       'type': 'str'},
            {'key': 'updated_at',     'label': 'Last Updated',    'type': 'str'},
        ],
        'filter_fields': [
            {'key': 'item_type', 'label': 'Item Type', 'type': 'select',
             'options': ['raw_material','semi_finished','finished_goods','consumable','spare_part']},
            {'key': 'warehouse', 'label': 'Warehouse',  'type': 'text'},
            {'key': 'search',    'label': 'Search (Item Code / Name)', 'type': 'text'},
        ],
        'get_rows': _stock,
    },

    'stock_movements': {
        'label': 'Stock Movements',
        'group': 'Inventory',
        'modules': ['Stock Movement', 'Item', 'Warehouse'],
        'description': 'All stock in/out movements with reference details',
        'fields': [
            {'key': 'date',             'label': 'Date',           'type': 'str'},
            {'key': 'item_code',        'label': 'Item Code',      'type': 'str'},
            {'key': 'item_name',        'label': 'Item Name',      'type': 'str'},
            {'key': 'warehouse',        'label': 'Warehouse',      'type': 'str'},
            {'key': 'movement_type',    'label': 'Movement Type',  'type': 'str'},
            {'key': 'quantity',         'label': 'Quantity',       'type': 'decimal'},
            {'key': 'reference_number', 'label': 'Reference #',   'type': 'str'},
            {'key': 'notes',            'label': 'Notes',          'type': 'str'},
            {'key': 'created_by',       'label': 'Created By',     'type': 'str'},
        ],
        'filter_fields': [
            {'key': 'movement_type', 'label': 'Movement Type', 'type': 'select',
             'options': ['stock_in','stock_out','adjustment_in','adjustment_out','transfer_in','transfer_out','production_in','production_out']},
            {'key': 'date_from', 'label': 'Date From', 'type': 'date'},
            {'key': 'date_to',   'label': 'Date To',   'type': 'date'},
            {'key': 'search',    'label': 'Search (Item / Reference)', 'type': 'text'},
        ],
        'get_rows': _stock_movements,
    },

    'employees': {
        'label': 'Employees + Department',
        'group': 'HR & Payroll',
        'modules': ['Employee', 'Department'],
        'description': 'Employee master with department and salary details',
        'fields': [
            {'key': 'employee_code',   'label': 'Employee Code',    'type': 'str'},
            {'key': 'full_name',       'label': 'Full Name',        'type': 'str'},
            {'key': 'gender',          'label': 'Gender',           'type': 'str'},
            {'key': 'phone',           'label': 'Phone',            'type': 'str'},
            {'key': 'email',           'label': 'Email',            'type': 'str'},
            {'key': 'designation',     'label': 'Designation',      'type': 'str'},
            {'key': 'department',      'label': 'Department',       'type': 'str'},
            {'key': 'employment_type', 'label': 'Employment Type',  'type': 'str'},
            {'key': 'date_of_joining', 'label': 'Date of Joining',  'type': 'date'},
            {'key': 'status',          'label': 'Status',           'type': 'str'},
            {'key': 'basic_salary',    'label': 'Basic Salary',     'type': 'decimal'},
            {'key': 'gross_salary',    'label': 'Gross Salary',     'type': 'decimal'},
            {'key': 'bank_name',       'label': 'Bank Name',        'type': 'str'},
            {'key': 'pan_number',      'label': 'PAN Number',       'type': 'str'},
            {'key': 'pf_number',       'label': 'PF Number',        'type': 'str'},
        ],
        'filter_fields': [
            {'key': 'status',     'label': 'Status',    'type': 'select', 'options': ['active','inactive','resigned']},
            {'key': 'emp_type',   'label': 'Emp. Type', 'type': 'select', 'options': ['permanent','contract','probation','intern']},
            {'key': 'department', 'label': 'Department (search)', 'type': 'text'},
            {'key': 'search',     'label': 'Search (Code / Name / Designation)', 'type': 'text'},
        ],
        'get_rows': _employees,
    },

    'salary_records': {
        'label': 'Salary Records + Employee',
        'group': 'HR & Payroll',
        'modules': ['Salary Record', 'Employee', 'Department'],
        'description': 'Monthly salary records with full earnings and deduction breakdown',
        'fields': [
            {'key': 'employee_code',   'label': 'Employee Code',    'type': 'str'},
            {'key': 'employee_name',   'label': 'Employee Name',    'type': 'str'},
            {'key': 'department',      'label': 'Department',       'type': 'str'},
            {'key': 'month',           'label': 'Month',            'type': 'str'},
            {'key': 'year',            'label': 'Year',             'type': 'str'},
            {'key': 'working_days',    'label': 'Working Days',     'type': 'str'},
            {'key': 'present_days',    'label': 'Present Days',     'type': 'decimal'},
            {'key': 'absent_days',     'label': 'Absent Days',      'type': 'decimal'},
            {'key': 'basic_salary',    'label': 'Basic Salary',     'type': 'decimal'},
            {'key': 'hra',             'label': 'HRA',              'type': 'decimal'},
            {'key': 'da',              'label': 'DA',               'type': 'decimal'},
            {'key': 'other_allowance', 'label': 'Other Allowance',  'type': 'decimal'},
            {'key': 'overtime_pay',    'label': 'Overtime Pay',     'type': 'decimal'},
            {'key': 'gross_earnings',  'label': 'Gross Earnings',   'type': 'decimal'},
            {'key': 'pf_deduction',    'label': 'PF Deduction',     'type': 'decimal'},
            {'key': 'esi_deduction',   'label': 'ESI Deduction',    'type': 'decimal'},
            {'key': 'total_deductions','label': 'Total Deductions', 'type': 'decimal'},
            {'key': 'net_salary',      'label': 'Net Salary',       'type': 'decimal'},
            {'key': 'status',          'label': 'Status',           'type': 'str'},
            {'key': 'paid_date',       'label': 'Paid Date',        'type': 'date'},
        ],
        'filter_fields': [
            {'key': 'status', 'label': 'Status', 'type': 'select', 'options': ['draft','processed','paid']},
            {'key': 'month',  'label': 'Month (1-12)', 'type': 'text'},
            {'key': 'year',   'label': 'Year',         'type': 'text'},
            {'key': 'search', 'label': 'Search (Employee Code / Name)', 'type': 'text'},
        ],
        'get_rows': _salary_records,
    },

    'items': {
        'label': 'Item Master',
        'group': 'Master Data',
        'modules': ['Item', 'Category', 'Unit'],
        'description': 'Complete item master list with all specifications',
        'fields': [
            {'key': 'item_code',      'label': 'Item Code',      'type': 'str'},
            {'key': 'item_name',      'label': 'Item Name',      'type': 'str'},
            {'key': 'item_type',      'label': 'Item Type',      'type': 'str'},
            {'key': 'category',       'label': 'Category',       'type': 'str'},
            {'key': 'unit',           'label': 'Unit',           'type': 'str'},
            {'key': 'description',    'label': 'Description',    'type': 'str'},
            {'key': 'hsn_code',       'label': 'HSN Code',       'type': 'str'},
            {'key': 'yarn_count',     'label': 'Yarn Count',     'type': 'str'},
            {'key': 'composition',    'label': 'Composition',    'type': 'str'},
            {'key': 'minimum_stock',  'label': 'Min Stock',      'type': 'decimal'},
            {'key': 'standard_price', 'label': 'Standard Price', 'type': 'decimal'},
        ],
        'filter_fields': [
            {'key': 'item_type', 'label': 'Item Type', 'type': 'select',
             'options': ['raw_material','semi_finished','finished_goods','consumable','spare_part']},
            {'key': 'search',    'label': 'Search (Code / Name / HSN)', 'type': 'text'},
        ],
        'get_rows': _items,
    },

    'customers': {
        'label': 'Customer Master',
        'group': 'Master Data',
        'modules': ['Customer'],
        'description': 'Complete customer master list',
        'fields': [
            {'key': 'customer_code',  'label': 'Customer Code',  'type': 'str'},
            {'key': 'customer_name',  'label': 'Customer Name',  'type': 'str'},
            {'key': 'customer_type',  'label': 'Customer Type',  'type': 'str'},
            {'key': 'contact_person', 'label': 'Contact Person', 'type': 'str'},
            {'key': 'phone',          'label': 'Phone',          'type': 'str'},
            {'key': 'email',          'label': 'Email',          'type': 'str'},
            {'key': 'address',        'label': 'Address',        'type': 'str'},
            {'key': 'city',           'label': 'City',           'type': 'str'},
            {'key': 'state',          'label': 'State',          'type': 'str'},
            {'key': 'country',        'label': 'Country',        'type': 'str'},
            {'key': 'gstin',          'label': 'GSTIN',          'type': 'str'},
            {'key': 'credit_days',    'label': 'Credit Days',    'type': 'str'},
            {'key': 'credit_limit',   'label': 'Credit Limit',   'type': 'decimal'},
        ],
        'filter_fields': [
            {'key': 'customer_type', 'label': 'Type', 'type': 'select', 'options': ['domestic','export','government']},
            {'key': 'search', 'label': 'Search (Name / Code / City)', 'type': 'text'},
        ],
        'get_rows': _customers,
    },

    'suppliers': {
        'label': 'Supplier Master',
        'group': 'Master Data',
        'modules': ['Supplier'],
        'description': 'Complete supplier master list',
        'fields': [
            {'key': 'supplier_code',  'label': 'Supplier Code',  'type': 'str'},
            {'key': 'supplier_name',  'label': 'Supplier Name',  'type': 'str'},
            {'key': 'supplier_type',  'label': 'Supplier Type',  'type': 'str'},
            {'key': 'contact_person', 'label': 'Contact Person', 'type': 'str'},
            {'key': 'phone',          'label': 'Phone',          'type': 'str'},
            {'key': 'email',          'label': 'Email',          'type': 'str'},
            {'key': 'address',        'label': 'Address',        'type': 'str'},
            {'key': 'city',           'label': 'City',           'type': 'str'},
            {'key': 'state',          'label': 'State',          'type': 'str'},
            {'key': 'country',        'label': 'Country',        'type': 'str'},
            {'key': 'gstin',          'label': 'GSTIN',          'type': 'str'},
            {'key': 'payment_days',   'label': 'Payment Days',   'type': 'str'},
        ],
        'filter_fields': [
            {'key': 'supplier_type', 'label': 'Type', 'type': 'select',
             'options': ['manufacturer','trader','service','other']},
            {'key': 'search', 'label': 'Search (Name / Code / City)', 'type': 'text'},
        ],
        'get_rows': _suppliers,
    },
}


def get_sources_meta():
    """Return all sources without the get_rows callable (safe for JSON)."""
    result = {}
    for key, src in SOURCES.items():
        result[key] = {k: v for k, v in src.items() if k != 'get_rows'}
    return result


def run_report(source_key, columns, filters):
    """
    Execute a report and return filtered, column-projected rows.
    columns = list of field keys; empty = return all columns.
    filters = dict of filter values from the frontend.
    """
    source = SOURCES.get(source_key)
    if not source:
        raise ValueError(f"Unknown source: {source_key!r}")

    rows = source['get_rows'](filters or {})

    if columns:
        rows = [{k: row.get(k, '') for k in columns} for row in rows]

    return rows
