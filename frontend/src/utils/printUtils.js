// ============================================================
// FILE: utils/printUtils.js
// PURPOSE: Print utility for MEI TEXZ ERP.
//          Generates formatted HTML for all business documents
//          and opens them in a new window for browser printing.
// ============================================================

// ────────────────────────────────────────────────────────────
// Active company — loaded from localStorage (set by Company Master).
// Falls back to defaults if no company has been configured yet.
// ────────────────────────────────────────────────────────────
function getActiveCompany() {
    try {
        const stored = localStorage.getItem('meitexz_active_company');
        if (stored) return JSON.parse(stored);
    } catch {}
    return null;
}

function buildAddress(c) {
    return [c.address_line1, c.address_line2, c.city, c.state, c.pincode]
        .filter(Boolean).join(', ');
}

// Fallback when no company configured yet
const COMPANY_FALLBACK = {
    name:    'MEI TEXZ Technologies',
    tagline: 'Medical & Technical Textiles',
    address: 'Coimbatore, Tamilnadu 641062',
    phone:   '+91 9176236675',
    email:   'info@meitexz.com',
    gstin:   '',
    website: 'www.meitexz.com',
};

// SVG placeholder logo — replace <img src="..."> once logo is ready
const LOGO_SVG = `
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="8" fill="#1a237e"/>
  <rect x="10" y="14" width="44" height="6" rx="2" fill="white" opacity="0.9"/>
  <rect x="10" y="24" width="44" height="6" rx="2" fill="white" opacity="0.7"/>
  <rect x="10" y="34" width="30" height="6" rx="2" fill="white" opacity="0.5"/>
  <rect x="44" y="24" width="6" height="22" rx="2" fill="#5c6bc0"/>
  <text x="10" y="56" font-family="Arial" font-size="8" font-weight="bold" fill="#5c6bc0">MEI TEXZ</text>
</svg>`;

// ────────────────────────────────────────────────────────────
// Core print function — opens new window and triggers print
// ────────────────────────────────────────────────────────────
export function printDoc(title, bodyHTML) {
    const win = window.open('', '_blank', 'width=900,height=750');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>${getPrintCSS()}</style>
</head>
<body>
  ${bodyHTML}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`);
    win.document.close();
}

// ────────────────────────────────────────────────────────────
// Shared CSS for all print documents
// ────────────────────────────────────────────────────────────
function getPrintCSS() {
    return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: white; }
    .page { width: 794px; margin: 0 auto; padding: 30px 36px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a237e; padding-bottom: 14px; margin-bottom: 18px; }
    .company-block { display: flex; align-items: center; gap: 12px; }
    .company-info h1 { font-size: 20px; color: #1a237e; font-weight: bold; letter-spacing: 1px; }
    .company-info .tagline { font-size: 10px; color: #5c6bc0; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px; }
    .company-info p { font-size: 9.5px; color: #444; line-height: 1.5; }
    .doc-title-block { text-align: right; }
    .doc-title-block .doc-type { font-size: 22px; font-weight: bold; color: #1a237e; text-transform: uppercase; letter-spacing: 2px; }
    .doc-title-block .doc-number { font-size: 13px; font-weight: bold; color: #333; margin-top: 4px; }
    .doc-title-block .doc-date { font-size: 10px; color: #666; margin-top: 2px; }

    /* Two-column info row */
    .info-row { display: flex; gap: 20px; margin-bottom: 16px; }
    .info-box { flex: 1; background: #f5f6ff; border: 1px solid #e0e3ff; border-radius: 4px; padding: 10px 12px; }
    .info-box.highlight { background: #fff8e1; border-color: #ffe082; }
    .info-box h3 { font-size: 9px; text-transform: uppercase; color: #1a237e; font-weight: bold; letter-spacing: 1px; margin-bottom: 6px; border-bottom: 1px solid #c5cae9; padding-bottom: 4px; }
    .info-box p { font-size: 10px; color: #333; line-height: 1.6; }
    .info-box .big { font-size: 12px; font-weight: bold; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 10px; }
    thead { background: #1a237e; color: white; }
    thead th { padding: 8px 10px; text-align: left; font-weight: bold; font-size: 10px; }
    thead th.num { text-align: right; }
    tbody tr:nth-child(even) { background: #f8f9ff; }
    tbody td { padding: 7px 10px; border-bottom: 1px solid #e8eaf6; color: #222; vertical-align: top; }
    tbody td.num { text-align: right; font-family: monospace; }
    tfoot td { padding: 7px 10px; font-weight: bold; background: #e8eaf6; }
    tfoot td.num { text-align: right; font-family: monospace; }

    /* Totals box */
    .totals-wrap { display: flex; justify-content: flex-end; margin: 10px 0; }
    .totals-table { min-width: 280px; }
    .totals-table td { padding: 5px 10px; font-size: 10.5px; }
    .totals-table .label { color: #555; }
    .totals-table .value { text-align: right; font-family: monospace; }
    .totals-table .grand { font-size: 13px; font-weight: bold; color: #1a237e; background: #e8eaf6; }
    .totals-table .paid { color: #2e7d32; }
    .totals-table .due { color: #c62828; font-weight: bold; }

    /* Status badge */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
    .badge.paid   { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
    .badge.sent   { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
    .badge.draft  { background: #f5f5f5; color: #555; border: 1px solid #ccc; }
    .badge.pass   { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }

    /* Notes/Terms */
    .notes-section { margin-top: 14px; padding: 10px 12px; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 10px; color: #444; }
    .notes-section h4 { color: #1a237e; font-size: 10px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Signature block */
    .sig-row { display: flex; gap: 30px; margin-top: 28px; }
    .sig-box { flex: 1; border-top: 1.5px solid #555; padding-top: 6px; text-align: center; }
    .sig-box .title { font-size: 10px; color: #333; font-weight: bold; }
    .sig-box .sub   { font-size: 9px; color: #888; margin-top: 2px; }
    .sig-space      { height: 36px; }

    /* Footer */
    .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; font-size: 9px; color: #888; }

    /* Special sections */
    .section-title { font-size: 11px; font-weight: bold; color: #1a237e; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .field-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
    .field-item label { font-size: 9px; color: #888; display: block; text-transform: uppercase; }
    .field-item span  { font-size: 11px; color: #222; font-weight: 600; }

    /* Salary slip specific */
    .salary-table td.section-head { background: #e8eaf6; font-weight: bold; color: #1a237e; font-size: 10.5px; }
    .net-pay-box { text-align: center; background: #1a237e; color: white; padding: 12px; border-radius: 6px; margin: 14px 0; }
    .net-pay-box .amount { font-size: 22px; font-weight: bold; }
    .net-pay-box .label  { font-size: 10px; opacity: 0.85; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    `;
}

// ───────────────────��────────────────────────────────────────
// Shared header / footer builders
// ────────────────────────────────────────────────────────────
function companyHeader(docType, docNumber, docDate, extraDate = '') {
    const co  = getActiveCompany();
    const name    = co ? co.name    : COMPANY_FALLBACK.name;
    const tagline = co ? co.tagline : COMPANY_FALLBACK.tagline;
    const address = co ? buildAddress(co) : COMPANY_FALLBACK.address;
    const phone   = co ? co.phone   : COMPANY_FALLBACK.phone;
    const email   = co ? co.email   : COMPANY_FALLBACK.email;
    const gstin   = co ? co.gstin   : COMPANY_FALLBACK.gstin;
    return `
    <div class="header">
      <div class="company-block">
        ${LOGO_SVG}
        <div class="company-info">
          <h1>${name}</h1>
          ${tagline ? `<div class="tagline">${tagline}</div>` : ''}
          ${address ? `<p>${address}</p>` : ''}
          <p>${phone ? `Tel: ${phone}` : ''}${phone && email ? ' &nbsp;|&nbsp; ' : ''}${email || ''}</p>
          ${gstin ? `<p>GSTIN: ${gstin}</p>` : ''}
        </div>
      </div>
      <div class="doc-title-block">
        <div class="doc-type">${docType}</div>
        <div class="doc-number"># ${docNumber}</div>
        <div class="doc-date">Date: ${docDate}</div>
        ${extraDate ? `<div class="doc-date">${extraDate}</div>` : ''}
      </div>
    </div>`;
}

function pageFooter() {
    const co      = getActiveCompany();
    const name    = co ? co.name    : COMPANY_FALLBACK.name;
    const address = co ? buildAddress(co) : COMPANY_FALLBACK.address;
    const gstin   = co ? co.gstin   : COMPANY_FALLBACK.gstin;
    const website = co ? co.website : COMPANY_FALLBACK.website;
    return `
    <div class="footer">
      <span>${name}${address ? ' | ' + address : ''}</span>
      <span>${gstin ? 'GSTIN: ' + gstin + ' | ' : ''}${website || ''}</span>
    </div>`;
}

function fmtNum(v, decimals = 2) {
    return parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDate(d) {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
}

// ============================================================
// 1. QUOTATION
// ============================================================
export function printQuotation(qt) {
    const body = `
    <div class="page">
      ${companyHeader('Quotation', qt.quotation_number, fmtDate(qt.date), `Valid Until: ${fmtDate(qt.valid_until)}`)}

      <div class="info-row">
        <div class="info-box">
          <h3>To (Customer)</h3>
          <p class="big">${qt.customer_name}</p>
          <p>${qt.customer_address || ''}</p>
          ${qt.customer_gstin ? `<p>GSTIN: ${qt.customer_gstin}</p>` : ''}
          ${qt.customer_phone ? `<p>Tel: ${qt.customer_phone}</p>` : ''}
        </div>
        <div class="info-box highlight">
          <h3>Enquiry Reference</h3>
          ${qt.inquiry_number ? `<p>Inquiry #: <strong>${qt.inquiry_number}</strong></p>` : '<p>—</p>'}
          <p>Lead Time: <strong>${qt.lead_time_days || 30} Days</strong></p>
          <p>Status: <span class="badge ${qt.status}">${qt.status.toUpperCase()}</span></p>
        </div>
      </div>

      <div class="section-title">Product Details</div>
      <table>
        <thead>
          <tr>
            <th style="width:5%">#</th>
            <th style="width:35%">Product Description</th>
            <th>GSM</th>
            <th>Width (cm)</th>
            <th class="num">Quantity</th>
            <th>Unit</th>
            <th class="num">Unit Price (Rs)</th>
            <th class="num">Total (Rs)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>${qt.product_description}</td>
            <td>${qt.gsm || '—'}</td>
            <td>${qt.width_cm || '—'}</td>
            <td class="num">${fmtNum(qt.quantity, 0)}</td>
            <td>${qt.unit}</td>
            <td class="num">${fmtNum(qt.unit_price)}</td>
            <td class="num"><strong>${fmtNum(qt.total_amount)}</strong></td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="7" class="num">Total Amount (Excl. GST)</td>
            <td class="num">Rs ${fmtNum(qt.total_amount)}</td>
          </tr>
        </tfoot>
      </table>

      ${qt.spec_notes ? `
      <div class="notes-section">
        <h4>Technical Specifications / Notes</h4>
        <p>${qt.spec_notes}</p>
      </div>` : ''}

      <div class="info-row" style="margin-top:12px">
        <div class="info-box">
          <h3>Payment Terms</h3>
          <p>${qt.payment_terms || 'As per agreement'}</p>
        </div>
        <div class="info-box">
          <h3>Delivery Terms</h3>
          <p>${qt.delivery_terms || 'Ex-Works Tiruppur'}</p>
        </div>
      </div>

      <div class="notes-section" style="margin-top:10px">
        <h4>Terms &amp; Conditions</h4>
        <p>1. Prices are exclusive of GST. GST at applicable rates will be charged extra.</p>
        <p>2. Delivery subject to availability of raw materials and production schedule.</p>
        <p>3. This quotation is valid until the date mentioned above.</p>
        <p>4. Orders accepted subject to our standard terms and conditions.</p>
      </div>

      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">Customer Acceptance</div>
          <div class="sub">Authorised Signatory with Stamp</div>
        </div>
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">For ${(getActiveCompany() || COMPANY_FALLBACK).name}</div>
          <div class="sub">Authorised Signatory</div>
        </div>
      </div>
      ${pageFooter()}
    </div>`;
    printDoc(`Quotation ${qt.quotation_number}`, body);
}

// ============================================================
// 2. SALES ORDER CONFIRMATION
// ============================================================
export function printSalesOrder(so) {
    const lines = so.lines || [];
    const linesHTML = lines.length > 0 ? lines.map((l, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${l.item_code}</td>
          <td>${l.item_name}</td>
          <td class="num">${fmtNum(l.ordered_quantity, 3)}</td>
          <td>${l.unit}</td>
          <td class="num">${fmtNum(l.unit_price)}</td>
          <td class="num"><strong>${fmtNum(l.total_price)}</strong></td>
          <td>${l.notes || ''}</td>
        </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;color:#888">No line items</td></tr>`;

    const body = `
    <div class="page">
      ${companyHeader('Order Confirmation', so.so_number, fmtDate(so.order_date), `Delivery: ${fmtDate(so.delivery_date)}`)}

      <div class="info-row">
        <div class="info-box">
          <h3>Bill To / Ship To</h3>
          <p class="big">${so.customer_name}</p>
          <p>${so.customer_address || ''}</p>
          ${so.customer_gstin ? `<p>GSTIN: ${so.customer_gstin}</p>` : ''}
          ${so.customer_phone ? `<p>Tel: ${so.customer_phone}</p>` : ''}
        </div>
        <div class="info-box highlight">
          <h3>Order Details</h3>
          <p>Warehouse: <strong>${so.warehouse_name}</strong></p>
          <p>Order Date: <strong>${fmtDate(so.order_date)}</strong></p>
          <p>Delivery Date: <strong>${fmtDate(so.delivery_date)}</strong></p>
          <p>Status: <span class="badge ${so.status}">${so.status.toUpperCase()}</span></p>
        </div>
      </div>

      <div class="section-title">Order Items</div>
      <table>
        <thead>
          <tr>
            <th style="width:4%">#</th>
            <th style="width:10%">Item Code</th>
            <th>Item Description</th>
            <th class="num">Qty</th>
            <th>Unit</th>
            <th class="num">Rate (Rs)</th>
            <th class="num">Amount (Rs)</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>${linesHTML}</tbody>
      </table>

      <div class="totals-wrap">
        <table class="totals-table">
          <tr>
            <td class="label">Total (Excl. GST)</td>
            <td class="value">Rs ${fmtNum(so.total_amount)}</td>
          </tr>
          <tr>
            <td class="label">GST (18%)</td>
            <td class="value">Rs ${fmtNum(parseFloat(so.total_amount || 0) * 0.18)}</td>
          </tr>
          <tr class="grand">
            <td>Grand Total (Incl. GST)</td>
            <td class="value">Rs ${fmtNum(parseFloat(so.total_amount || 0) * 1.18)}</td>
          </tr>
        </table>
      </div>

      ${so.notes ? `<div class="notes-section"><h4>Notes / Special Instructions</h4><p>${so.notes}</p></div>` : ''}

      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">Customer Acknowledgement</div>
          <div class="sub">Authorised Signatory with Stamp</div>
        </div>
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">For ${(getActiveCompany() || COMPANY_FALLBACK).name}</div>
          <div class="sub">Sales Manager / Authorised Signatory</div>
        </div>
      </div>
      ${pageFooter()}
    </div>`;
    printDoc(`Sales Order ${so.so_number}`, body);
}

// ============================================================
// 3. DELIVERY CHALLAN (from delivered SO)
// ============================================================
export function printDeliveryChallan(so) {
    const lines = so.lines || [];
    const linesHTML = lines.map((l, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${l.item_code}</td>
          <td>${l.item_name}</td>
          <td class="num">${fmtNum(l.delivered_quantity || l.ordered_quantity, 3)}</td>
          <td>${l.unit}</td>
          <td>${l.notes || ''}</td>
        </tr>`).join('');

    const body = `
    <div class="page">
      ${companyHeader('Delivery Challan', `DC-${so.so_number}`, fmtDate(new Date()), `SO Ref: ${so.so_number}`)}

      <div class="info-row">
        <div class="info-box">
          <h3>Deliver To</h3>
          <p class="big">${so.customer_name}</p>
          <p>${so.customer_address || ''}</p>
          ${so.customer_phone ? `<p>Tel: ${so.customer_phone}</p>` : ''}
        </div>
        <div class="info-box highlight">
          <h3>Dispatch Details</h3>
          <p>Dispatch From: <strong>${so.warehouse_name}</strong></p>
          <p>Dispatch Date: <strong>${fmtDate(new Date())}</strong></p>
          <p>Vehicle No.: _______________________</p>
          <p>LR / AWB No.: _______________________</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th><th>Item Code</th><th>Item Description</th>
            <th class="num">Qty Delivered</th><th>Unit</th><th>Remarks</th>
          </tr>
        </thead>
        <tbody>${linesHTML}</tbody>
      </table>

      <div class="notes-section">
        <h4>Receiver's Acknowledgement</h4>
        <p>Goods received in good condition. Date of Receipt: _______________ &nbsp;&nbsp;&nbsp; Seal &amp; Signature: _______________</p>
      </div>

      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">Received By (Customer)</div>
          <div class="sub">Name, Date &amp; Stamp</div>
        </div>
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">Dispatched By</div>
          <div class="sub">For ${(getActiveCompany() || COMPANY_FALLBACK).name}</div>
        </div>
      </div>
      ${pageFooter()}
    </div>`;
    printDoc(`Delivery Challan ${so.so_number}`, body);
}

// ============================================================
// 4. TAX INVOICE
// ============================================================
export function printInvoice(inv, soLines = []) {
    const taxRate = 0.18;
    const cgst = parseFloat(inv.tax_amount || 0) / 2;
    const sgst = parseFloat(inv.tax_amount || 0) / 2;

    const linesHTML = soLines.length > 0 ? soLines.map((l, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${l.item_code}</td>
          <td>${l.item_name}</td>
          <td>${l.hsn_code || '—'}</td>
          <td class="num">${fmtNum(l.ordered_quantity, 3)}</td>
          <td>${l.unit}</td>
          <td class="num">${fmtNum(l.unit_price)}</td>
          <td class="num">${fmtNum(l.total_price)}</td>
          <td class="num">${fmtNum(parseFloat(l.total_price || 0) * taxRate / 2)}</td>
          <td class="num">${fmtNum(parseFloat(l.total_price || 0) * taxRate / 2)}</td>
          <td class="num"><strong>${fmtNum(parseFloat(l.total_price || 0) * (1 + taxRate))}</strong></td>
        </tr>`).join('') : `<tr>
        <td colspan="4">As per SO ${inv.so_number}</td>
        <td colspan="3"></td>
        <td class="num">${fmtNum(inv.subtotal)}</td>
        <td class="num">${fmtNum(cgst)}</td>
        <td class="num">${fmtNum(sgst)}</td>
        <td class="num"><strong>${fmtNum(inv.total_amount)}</strong></td>
      </tr>`;

    const body = `
    <div class="page">
      ${companyHeader('Tax Invoice', inv.invoice_number, fmtDate(inv.invoice_date), `Due: ${fmtDate(inv.due_date)}`)}

      <div class="info-row">
        <div class="info-box">
          <h3>Bill To</h3>
          <p class="big">${inv.customer_name}</p>
          <p>${inv.customer_address || ''}</p>
          ${inv.customer_gstin ? `<p>GSTIN: ${inv.customer_gstin}</p>` : ''}
          ${inv.customer_phone ? `<p>Tel: ${inv.customer_phone}</p>` : ''}
        </div>
        <div class="info-box highlight">
          <h3>Invoice Details</h3>
          <p>Invoice #: <strong>${inv.invoice_number}</strong></p>
          <p>Against SO: <strong>${inv.so_number}</strong></p>
          <p>Invoice Date: <strong>${fmtDate(inv.invoice_date)}</strong></p>
          <p>Due Date: <strong>${fmtDate(inv.due_date)}</strong></p>
          <p>Status: <span class="badge ${inv.status}">${inv.status.toUpperCase()}</span></p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th><th>Item Code</th><th>Description</th><th>HSN</th>
            <th class="num">Qty</th><th>Unit</th><th class="num">Rate</th>
            <th class="num">Taxable Amt</th>
            <th class="num">CGST 9%</th><th class="num">SGST 9%</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>${linesHTML}</tbody>
        <tfoot>
          <tr>
            <td colspan="7" class="num">Sub Total</td>
            <td class="num">Rs ${fmtNum(inv.subtotal)}</td>
            <td class="num">Rs ${fmtNum(cgst)}</td>
            <td class="num">Rs ${fmtNum(sgst)}</td>
            <td class="num">Rs ${fmtNum(inv.total_amount)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="totals-wrap">
        <table class="totals-table">
          <tr><td class="label">Sub Total (Excl. Tax)</td><td class="value">Rs ${fmtNum(inv.subtotal)}</td></tr>
          <tr><td class="label">CGST @ 9%</td><td class="value">Rs ${fmtNum(cgst)}</td></tr>
          <tr><td class="label">SGST @ 9%</td><td class="value">Rs ${fmtNum(sgst)}</td></tr>
          <tr class="grand"><td>Invoice Total</td><td class="value">Rs ${fmtNum(inv.total_amount)}</td></tr>
          <tr><td class="label paid">Amount Paid</td><td class="value paid">Rs ${fmtNum(inv.paid_amount)}</td></tr>
          <tr><td class="label due">Balance Due</td><td class="value due">Rs ${fmtNum(inv.balance_due)}</td></tr>
        </table>
      </div>

      <div class="info-row">
        <div class="info-box">
          <h3>Bank Details for Payment</h3>
          <p>Bank: <strong>HDFC Bank</strong></p>
          <p>Account Name: <strong>${(getActiveCompany() || COMPANY_FALLBACK).name}</strong></p>
          <p>Account No.: <strong>HDFC123456789</strong></p>
          <p>IFSC: <strong>HDFC0001234</strong></p>
          <p>Branch: Tiruppur</p>
        </div>
        <div class="info-box">
          <h3>Notes</h3>
          <p>${inv.notes || 'Payment to be made within due date.'}</p>
        </div>
      </div>

      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">Customer Acknowledgement</div>
          <div class="sub">Authorised Signatory</div>
        </div>
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">For ${(getActiveCompany() || COMPANY_FALLBACK).name}</div>
          <div class="sub">Authorised Signatory</div>
        </div>
      </div>
      ${pageFooter()}
    </div>`;
    printDoc(`Invoice ${inv.invoice_number}`, body);
}

// ============================================================
// 5. PURCHASE ORDER
// ============================================================
export function printPurchaseOrder(po) {
    const lines = po.lines || [];
    const linesHTML = lines.map((l, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${l.item_code}</td>
          <td>${l.item_name}</td>
          <td class="num">${fmtNum(l.ordered_quantity, 3)}</td>
          <td>${l.unit}</td>
          <td class="num">${fmtNum(l.unit_price)}</td>
          <td class="num"><strong>${fmtNum(l.total_price)}</strong></td>
          <td>${l.notes || ''}</td>
        </tr>`).join('');

    const body = `
    <div class="page">
      ${companyHeader('Purchase Order', po.po_number, fmtDate(po.order_date), `Expected: ${fmtDate(po.expected_date)}`)}

      <div class="info-row">
        <div class="info-box">
          <h3>Supplier</h3>
          <p class="big">${po.supplier_name}</p>
          <p>${po.supplier_address || ''}</p>
          ${po.supplier_gstin ? `<p>GSTIN: ${po.supplier_gstin}</p>` : ''}
          ${po.supplier_phone ? `<p>Tel: ${po.supplier_phone}</p>` : ''}
          ${po.supplier_contact ? `<p>Attn: ${po.supplier_contact}</p>` : ''}
        </div>
        <div class="info-box highlight">
          <h3>Delivery Details</h3>
          <p>Deliver To: <strong>${po.warehouse_name}</strong></p>
          <p>${po.delivery_address || ''}</p>
          <p>Expected Date: <strong>${fmtDate(po.expected_date)}</strong></p>
          <p>Status: <span class="badge ${po.status}">${po.status.toUpperCase()}</span></p>
        </div>
      </div>

      <div class="section-title">Items Ordered</div>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Item Code</th><th>Description</th>
            <th class="num">Qty</th><th>Unit</th>
            <th class="num">Unit Price (Rs)</th><th class="num">Total (Rs)</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>${linesHTML}</tbody>
        <tfoot>
          <tr>
            <td colspan="6" class="num">Total Order Value</td>
            <td class="num">Rs ${fmtNum(po.total_amount)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      ${po.notes ? `<div class="notes-section"><h4>Special Instructions</h4><p>${po.notes}</p></div>` : ''}

      <div class="notes-section" style="margin-top:10px">
        <h4>Terms &amp; Conditions</h4>
        <p>1. Goods must be supplied as per specifications. Substandard goods will be rejected.</p>
        <p>2. Delivery on or before the date mentioned. Delays to be communicated in advance.</p>
        <p>3. Invoice to be sent in triplicate along with delivery.</p>
        <p>4. Payment as per agreed terms post satisfactory goods receipt.</p>
      </div>

      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">Supplier Acknowledgement</div>
          <div class="sub">Authorised Signatory with Stamp</div>
        </div>
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">For ${(getActiveCompany() || COMPANY_FALLBACK).name}</div>
          <div class="sub">Purchase Manager / Authorised Signatory</div>
        </div>
      </div>
      ${pageFooter()}
    </div>`;
    printDoc(`Purchase Order ${po.po_number}`, body);
}

// ============================================================
// 6. GOODS RECEIPT NOTE (GRN)
// ============================================================
export function printGRN(grn) {
    const lines = grn.lines || [];
    const linesHTML = lines.map((l, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${l.item_code}</td>
          <td>${l.item_name}</td>
          <td class="num">${fmtNum(l.received_quantity, 3)}</td>
          <td>${l.notes || ''}</td>
        </tr>`).join('');

    const body = `
    <div class="page">
      ${companyHeader('Goods Receipt Note', grn.grn_number, fmtDate(grn.receipt_date), `PO Ref: ${grn.po_number}`)}

      <div class="info-row">
        <div class="info-box">
          <h3>Received From (Supplier)</h3>
          <p class="big">${grn.supplier_name}</p>
          <p>${grn.supplier_address || ''}</p>
        </div>
        <div class="info-box highlight">
          <h3>Receipt Details</h3>
          <p>GRN #: <strong>${grn.grn_number}</strong></p>
          <p>PO Reference: <strong>${grn.po_number}</strong></p>
          <p>Receipt Date: <strong>${fmtDate(grn.receipt_date)}</strong></p>
          <p>Supplier Invoice: <strong>${grn.supplier_invoice_number || '—'}</strong></p>
          <p>Received At: <strong>${grn.warehouse_name || '—'}</strong></p>
          <p>Status: <span class="badge ${grn.status}">${grn.status.toUpperCase()}</span></p>
        </div>
      </div>

      <div class="section-title">Items Received</div>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Item Code</th><th>Item Description</th>
            <th class="num">Qty Received</th><th>Quality Remarks</th>
          </tr>
        </thead>
        <tbody>${linesHTML}</tbody>
      </table>

      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">Store Keeper / Receiver</div>
          <div class="sub">Name, Date &amp; Sign</div>
        </div>
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">QC Inspector</div>
          <div class="sub">Quality Verification Sign</div>
        </div>
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">Accounts Verified</div>
          <div class="sub">Finance Team Sign</div>
        </div>
      </div>
      ${pageFooter()}
    </div>`;
    printDoc(`GRN ${grn.grn_number}`, body);
}

// ============================================================
// 7. WORK ORDER
// ============================================================
export function printWorkOrder(wo) {
    const materials = wo.materials || [];
    const materialsHTML = materials.map((m, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${m.raw_material_code}</td>
          <td>${m.raw_material_name}</td>
          <td class="num">${fmtNum(m.planned_quantity, 3)}</td>
          <td class="num">${m.actual_quantity > 0 ? fmtNum(m.actual_quantity, 3) : '—'}</td>
        </tr>`).join('');

    const body = `
    <div class="page">
      ${companyHeader('Work Order', wo.work_order_number, fmtDate(wo.planned_start_date), `End: ${fmtDate(wo.planned_end_date)}`)}

      <div class="field-grid" style="margin-bottom:14px">
        <div class="field-item"><label>Finished Product</label><span>${wo.finished_product} (${wo.finished_product_code})</span></div>
        <div class="field-item"><label>BOM Reference</label><span>${wo.bom_name}</span></div>
        <div class="field-item"><label>Output Warehouse</label><span>${wo.warehouse}</span></div>
        <div class="field-item"><label>Planned Quantity</label><span>${fmtNum(wo.planned_quantity, 3)}</span></div>
        <div class="field-item"><label>Actual Quantity</label><span>${parseFloat(wo.actual_quantity || 0) > 0 ? fmtNum(wo.actual_quantity, 3) : '—'}</span></div>
        <div class="field-item"><label>Status</label><span style="color:#1a237e;font-weight:bold">${wo.status?.toUpperCase()}</span></div>
      </div>

      <div class="section-title">Raw Material Requirement</div>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Material Code</th><th>Material Name</th>
            <th class="num">Planned Qty (kg)</th><th class="num">Actual Consumed</th>
          </tr>
        </thead>
        <tbody>${materialsHTML || '<tr><td colspan="5" style="text-align:center;color:#888">No materials linked</td></tr>'}</tbody>
      </table>

      ${wo.notes ? `<div class="notes-section"><h4>Production Instructions / Notes</h4><p>${wo.notes}</p></div>` : ''}

      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">Machine Operator</div>
          <div class="sub">Name &amp; Sign</div>
        </div>
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">Production Supervisor</div>
          <div class="sub">Verified &amp; Sign</div>
        </div>
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">QC Sign-off</div>
          <div class="sub">Quality Approval</div>
        </div>
      </div>
      ${pageFooter()}
    </div>`;
    printDoc(`Work Order ${wo.work_order_number}`, body);
}

// ============================================================
// 8. SALARY SLIP
// ============================================================
export function printSalarySlip(salary) {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthYear = `${monthNames[salary.month]} ${salary.year}`;

    const body = `
    <div class="page">
      ${companyHeader('Salary Slip', `PAY-${salary.employee_code}-${salary.month}${salary.year}`, monthYear)}

      <div class="info-row">
        <div class="info-box">
          <h3>Employee Details</h3>
          <p>Name: <strong>${salary.employee_name}</strong></p>
          <p>Employee Code: <strong>${salary.employee_code}</strong></p>
          <p>Department: <strong>${salary.department}</strong></p>
        </div>
        <div class="info-box highlight">
          <h3>Attendance Summary</h3>
          <p>Working Days: <strong>${salary.working_days}</strong></p>
          <p>Days Present: <strong>${salary.present_days}</strong></p>
          <p>Days Absent: <strong>${salary.absent_days}</strong></p>
          <p>Status: <span class="badge ${salary.status}">${salary.status.toUpperCase()}</span></p>
        </div>
      </div>

      <div style="display:flex; gap:16px; margin-top:8px">
        <div style="flex:1">
          <div class="section-title">Earnings</div>
          <table class="salary-table">
            <thead><tr><th>Component</th><th class="num">Amount (Rs)</th></tr></thead>
            <tbody>
              <tr><td>Basic Salary</td><td class="num">${fmtNum(salary.basic_salary)}</td></tr>
              <tr><td>House Rent Allowance (HRA)</td><td class="num">${fmtNum(salary.hra)}</td></tr>
              <tr><td>Dearness Allowance (DA)</td><td class="num">${fmtNum(salary.da)}</td></tr>
              <tr><td>Other Allowance</td><td class="num">${fmtNum(salary.other_allowance)}</td></tr>
              <tr><td>Overtime Pay</td><td class="num">${fmtNum(salary.overtime_pay)}</td></tr>
            </tbody>
            <tfoot>
              <tr><td><strong>Gross Earnings</strong></td><td class="num"><strong>Rs ${fmtNum(salary.gross_earnings)}</strong></td></tr>
            </tfoot>
          </table>
        </div>
        <div style="flex:1">
          <div class="section-title">Deductions</div>
          <table class="salary-table">
            <thead><tr><th>Component</th><th class="num">Amount (Rs)</th></tr></thead>
            <tbody>
              <tr><td>Provident Fund (12%)</td><td class="num">${fmtNum(salary.pf_deduction)}</td></tr>
              <tr><td>ESI (0.75%)</td><td class="num">${fmtNum(salary.esi_deduction)}</td></tr>
              <tr><td>Other Deduction</td><td class="num">${fmtNum(salary.other_deduction)}</td></tr>
            </tbody>
            <tfoot>
              <tr><td><strong>Total Deductions</strong></td><td class="num"><strong>Rs ${fmtNum(salary.total_deductions)}</strong></td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="net-pay-box">
        <div class="label">Net Salary Payable for ${monthYear}</div>
        <div class="amount">Rs ${fmtNum(salary.net_salary)}</div>
        ${salary.paid_date ? `<div class="label">Paid On: ${fmtDate(salary.paid_date)}</div>` : ''}
      </div>

      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">Employee Signature</div>
          <div class="sub">${salary.employee_name}</div>
        </div>
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">HR Manager</div>
          <div class="sub">Authorised Signatory</div>
        </div>
      </div>
      <p style="font-size:9px;color:#888;margin-top:10px;text-align:center">This is a computer generated salary slip. No signature required.</p>
      ${pageFooter()}
    </div>`;
    printDoc(`Salary Slip - ${salary.employee_name} - ${monthYear}`, body);
}

// ============================================================
// 9. TECHNICAL DATA SHEET (TDS)
// ============================================================
export function printTDS(sheet) {
    const spec = sheet.spec || {};
    const specRows = [
        ['GSM (g/m²)', spec.gsm],
        ['Width (cm)', spec.width_cm],
        ['Thickness (mm)', spec.thickness_mm],
        ['Tensile Strength — Warp (N)', spec.tensile_strength_warp],
        ['Tensile Strength — Weft (N)', spec.tensile_strength_weft],
        ['Elongation — Warp (%)', spec.elongation_warp],
        ['Elongation — Weft (%)', spec.elongation_weft],
        ['Tear Strength (N)', spec.tear_strength],
        ['Burst Strength (kPa)', spec.burst_strength],
        ['Air Permeability (mm/s)', spec.air_permeability],
        ['Composition', spec.composition],
        ['Standard Reference', spec.standard_reference],
    ].filter(([, v]) => v !== undefined && v !== null && v !== '');

    const specHTML = specRows.map(([label, value], i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${label}</td>
          <td class="num"><strong>${value}</strong></td>
        </tr>`).join('');

    const body = `
    <div class="page">
      ${companyHeader('Technical Data Sheet', sheet.tds_number, fmtDate(sheet.issue_date), `Revision: ${sheet.revision_number}`)}

      <div class="info-row">
        <div class="info-box">
          <h3>Product</h3>
          <p class="big">${sheet.item_name}</p>
          <p>Item Code: <strong>${sheet.item_code}</strong></p>
          <p>Revision: <strong>${sheet.revision_number}</strong></p>
          <p>Status: <span class="badge ${sheet.status}">${sheet.status?.toUpperCase()}</span></p>
        </div>
        <div class="info-box highlight">
          <h3>Document Control</h3>
          <p>TDS Number: <strong>${sheet.tds_number}</strong></p>
          <p>Issue Date: <strong>${fmtDate(sheet.issue_date)}</strong></p>
          <p>Prepared By: <strong>${sheet.prepared_by || '—'}</strong></p>
          <p>Approved By: <strong>${sheet.approved_by || '—'}</strong></p>
        </div>
      </div>

      <div class="section-title">Technical Specifications</div>
      <table>
        <thead>
          <tr><th style="width:5%">#</th><th>Parameter</th><th class="num" style="width:25%">Value / Specification</th></tr>
        </thead>
        <tbody>${specHTML || '<tr><td colspan="3" style="text-align:center;color:#888">Spec not linked</td></tr>'}</tbody>
      </table>

      ${sheet.notes ? `<div class="notes-section"><h4>Additional Notes</h4><p>${sheet.notes}</p></div>` : ''}

      <div class="notes-section" style="margin-top:10px">
        <h4>Disclaimer</h4>
        <p>The specifications contained in this data sheet represent typical values obtained in the testing of representative samples.
        Actual values may vary due to manufacturing tolerances. This document is subject to change without notice.</p>
      </div>

      <div class="sig-row">
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">Prepared By: ${sheet.prepared_by || '—'}</div>
          <div class="sub">Technical Team</div>
        </div>
        <div class="sig-box">
          <div class="sig-space"></div>
          <div class="title">Approved By: ${sheet.approved_by || '—'}</div>
          <div class="sub">Quality Manager</div>
        </div>
      </div>
      ${pageFooter()}
    </div>`;
    printDoc(`TDS ${sheet.tds_number}`, body);
}
