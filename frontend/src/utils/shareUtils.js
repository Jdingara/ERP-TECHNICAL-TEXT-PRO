// ============================================================
// FILE: utils/shareUtils.js
// PURPOSE: Email template storage (localStorage) + share helpers.
//          Email  → opens mailto: in default mail client
//          WhatsApp → opens wa.me/ in new tab
// ============================================================

export const DOC_TYPES = [
    {
        key: 'so',
        label: 'Sales Order',
        color: '#3b82f6',
        placeholders: ['{{so_number}}', '{{customer_name}}', '{{product_name}}', '{{order_quantity}}', '{{required_date}}', '{{total_amount}}'],
        defaultSubject: 'Sales Order Confirmation — {{so_number}}',
        defaultBody:
`Dear {{customer_name}},

Thank you for your order. Please find below the details of your Sales Order:

  Order No    : {{so_number}}
  Product     : {{product_name}}
  Quantity    : {{order_quantity}}
  Required By : {{required_date}}

Please acknowledge receipt of this confirmation.

Warm regards,
MEI TEXZ Technologies`,
    },
    {
        key: 'po',
        label: 'Purchase Order',
        color: '#10b981',
        placeholders: ['{{po_number}}', '{{vendor_name}}', '{{total_amount}}', '{{expected_date}}', '{{order_date}}'],
        defaultSubject: 'Purchase Order — {{po_number}}',
        defaultBody:
`Dear {{vendor_name}},

Please find attached our Purchase Order for your reference:

  PO Number     : {{po_number}}
  Order Date    : {{order_date}}
  Expected Date : {{expected_date}}
  Order Value   : ₹{{total_amount}}

Kindly confirm receipt and expected delivery date.

Regards,
MEI TEXZ Technologies`,
    },
    {
        key: 'sales_invoice',
        label: 'Sales Invoice',
        color: '#8b5cf6',
        placeholders: ['{{invoice_number}}', '{{customer_name}}', '{{total_amount}}', '{{due_date}}', '{{balance_due}}', '{{dispatch_number}}'],
        defaultSubject: 'Invoice {{invoice_number}} — Payment Due {{due_date}}',
        defaultBody:
`Dear {{customer_name}},

Please find below your invoice details:

  Invoice No   : {{invoice_number}}
  Dispatch Ref : {{dispatch_number}}
  Total Amount : ₹{{total_amount}}
  Balance Due  : ₹{{balance_due}}
  Due Date     : {{due_date}}

Kindly arrange payment before the due date.

Thank you for your business.

Regards,
MEI TEXZ Technologies`,
    },
    {
        key: 'purchase_invoice',
        label: 'Purchase Invoice',
        color: '#f97316',
        placeholders: ['{{invoice_number}}', '{{vendor_name}}', '{{total_amount}}', '{{due_date}}', '{{grn_number}}'],
        defaultSubject: 'Invoice Acknowledgement — {{invoice_number}}',
        defaultBody:
`Dear {{vendor_name}},

We acknowledge receipt of your invoice:

  Invoice No  : {{invoice_number}}
  GRN Ref     : {{grn_number}}
  Amount      : ₹{{total_amount}}
  Due Date    : {{due_date}}

Payment will be processed as per agreed terms.

Regards,
MEI TEXZ Technologies`,
    },
    {
        key: 'dispatch',
        label: 'Delivery Challan',
        color: '#ec4899',
        placeholders: ['{{dispatch_number}}', '{{customer_name}}', '{{dispatch_date}}', '{{vehicle_number}}', '{{lr_number}}', '{{transporter}}'],
        defaultSubject: 'Dispatch Notification — {{dispatch_number}}',
        defaultBody:
`Dear {{customer_name}},

Your order has been dispatched. Details below:

  Dispatch No  : {{dispatch_number}}
  Dispatch Date: {{dispatch_date}}
  Vehicle No   : {{vehicle_number}}
  LR Number    : {{lr_number}}
  Transporter  : {{transporter}}

Please arrange for receipt at your end.

Regards,
MEI TEXZ Technologies`,
    },
    {
        key: 'report',
        label: 'Reports',
        color: '#0ea5e9',
        placeholders: ['{{report_name}}', '{{period}}', '{{generated_date}}', '{{total_entries}}', '{{summary}}'],
        defaultSubject: '{{report_name}} — {{period}}',
        defaultBody:
`Hi,

Please find the {{report_name}} for the period {{period}}.

  Generated On : {{generated_date}}
  Summary      : {{summary}}

The full report is attached / available in the ERP system.

Regards,
MEI TEXZ Technologies`,
    },
    {
        key: 'maintenance',
        label: 'Maintenance Reminder',
        color: '#f59e0b',
        placeholders: ['{{machine_name}}', '{{machine_code}}', '{{task_name}}', '{{frequency}}', '{{last_done_date}}', '{{next_due_date}}', '{{overdue_days}}', '{{status}}', '{{assigned_to}}'],
        defaultSubject: 'Maintenance Due — {{machine_name}} ({{task_name}})',
        defaultBody:
`Dear {{assigned_to}},

This is a reminder that the following maintenance task is due / overdue:

  Machine      : {{machine_name}} ({{machine_code}})
  Task         : {{task_name}}
  Frequency    : {{frequency}}
  Last Done    : {{last_done_date}}
  Next Due     : {{next_due_date}}
  Overdue By   : {{overdue_days}} days
  Status       : {{status}}

Please schedule and complete this maintenance at the earliest to avoid equipment failure.

Regards,
MEI TEXZ Technologies — Maintenance Team`,
    },
];

const STORAGE_KEY = 'meitexz_email_templates';

export function loadTemplates() {
    try {
        const s = localStorage.getItem(STORAGE_KEY);
        return s ? JSON.parse(s) : {};
    } catch { return {}; }
}

export function saveTemplate(docType, subject, body) {
    const all = loadTemplates();
    all[docType] = { subject, body };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getTemplate(docType) {
    const all = loadTemplates();
    if (all[docType]) return all[docType];
    const def = DOC_TYPES.find(d => d.key === docType);
    return def ? { subject: def.defaultSubject, body: def.defaultBody } : { subject: '', body: '' };
}

// Replace {{placeholders}} with actual data values
export function fillTemplate(text, data) {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '—');
}

// Open mailto: link in default email client
export function shareEmail({ email, docType, data }) {
    const tpl     = getTemplate(docType);
    const subject = fillTemplate(tpl.subject, data);
    const body    = fillTemplate(tpl.body, data);
    const mailto  = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
}

// Open WhatsApp chat with pre-filled message
export function shareWhatsApp({ phone, docType, data, customMessage }) {
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (!cleanPhone) { alert('No phone number on record for this contact.'); return; }
    const tpl  = getTemplate(docType);
    const body = customMessage || fillTemplate(tpl.body, data);
    const url  = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}
