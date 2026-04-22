// ============================================================
// FILE: utils/reportUtils.js
// PURPOSE: Print and Excel (CSV) export for all Report pages.
//          printReport  — opens branded print window
//          exportCSV    — downloads a .csv file Excel can open
// ============================================================

function getActiveCompany() {
    try {
        const s = localStorage.getItem('meitexz_active_company');
        if (s) return JSON.parse(s);
    } catch {}
    return null;
}

// ── Print ────────────────────────────────────────────────────

export function printReport({ title, subtitle = '', headers, rows, summaryCards = [], footerRow = null, fromDate = '', toDate = '' }) {
    const co   = getActiveCompany();
    const name = co ? co.name : 'MEI TEXZ Technologies';

    const dateRange = (fromDate || toDate)
        ? `<div style="font-size:11px;color:#555;margin-top:3px">Period: ${fromDate || '—'} to ${toDate || '—'}</div>`
        : '';

    const summaryHTML = summaryCards.length > 0 ? `
        <div style="display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap">
            ${summaryCards.map(c => `
            <div style="flex:1;min-width:120px;background:#f5f6ff;border:1px solid #e0e3ff;border-radius:6px;padding:10px 14px">
                <div style="font-size:9px;color:#1a237e;font-weight:bold;text-transform:uppercase;letter-spacing:.5px">${c.label}</div>
                <div style="font-size:18px;font-weight:700;color:${c.color || '#1a237e'};margin-top:2px">${c.val}</div>
            </div>`).join('')}
        </div>` : '';

    const theadHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

    const tbodyHTML = rows.length > 0
        ? rows.map((r, i) => `<tr class="${i % 2 === 0 ? 'even' : ''}">${r.map(cell => `<td>${cell ?? '—'}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${headers.length}" style="text-align:center;color:#888;padding:20px">No data for this period</td></tr>`;

    const tfootHTML = footerRow
        ? `<tfoot><tr>${footerRow.map(cell => `<td><strong>${cell ?? ''}</strong></td>`).join('')}</tr></tfoot>`
        : '';

    const win = window.open('', '_blank', 'width=1000,height=820');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>${title}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff}
.toolbar{position:fixed;top:0;left:0;right:0;z-index:9999;background:#1a237e;color:#fff;
  display:flex;align-items:center;justify-content:space-between;padding:10px 24px;
  box-shadow:0 2px 8px rgba(0,0,0,.3);font-family:Arial,sans-serif}
.toolbar .doc-title{font-size:14px;font-weight:bold}
.toolbar .hint{font-size:11px;color:rgba(255,255,255,.7)}
.toolbar .btn-group{display:flex;gap:10px}
.toolbar button{padding:8px 20px;border:none;border-radius:6px;font-size:13px;font-weight:bold;cursor:pointer}
.btn-print{background:#fff;color:#1a237e}
.btn-pdf{background:#43a047;color:#fff}
.btn-close{background:transparent;color:rgba(255,255,255,.7);font-size:18px;padding:4px 10px}
.page{width:960px;margin:70px auto 30px;padding:24px 32px}
.header{display:flex;justify-content:space-between;align-items:flex-start;
  border-bottom:3px solid #1a237e;padding-bottom:12px;margin-bottom:16px}
.co-name{font-size:20px;font-weight:bold;color:#1a237e}
.rpt-title{text-align:right}
.rpt-title h2{font-size:18px;font-weight:bold;color:#1a237e;text-transform:uppercase;letter-spacing:1px}
table{width:100%;border-collapse:collapse;font-size:10.5px;margin-top:6px}
thead tr{background:#1a237e;color:#fff}
thead th{padding:8px 10px;text-align:left;font-size:10px;font-weight:bold}
tbody tr.even{background:#f8f9ff}
tbody td{padding:7px 10px;border-bottom:1px solid #e8eaf6;color:#222}
tfoot td{padding:7px 10px;background:#1a237e;color:#fff;font-weight:bold}
.footer{margin-top:20px;padding-top:8px;border-top:1px solid #e0e0e0;
  display:flex;justify-content:space-between;font-size:9px;color:#888}
@media print{
  .toolbar{display:none!important}
  .page{margin-top:0}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  thead{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  tfoot{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style></head><body>
<div class="toolbar">
  <div>
    <div class="doc-title">📊 ${title}</div>
    <div class="hint">To save as PDF: click Save as PDF → choose "Save as PDF" printer</div>
  </div>
  <div class="btn-group">
    <button class="btn-print" onclick="window.print()">🖨 Print</button>
    <button class="btn-pdf"   onclick="window.print()">⬇ Save as PDF</button>
    <button class="btn-close" onclick="window.close()">✕</button>
  </div>
</div>
<div class="page">
  <div class="header">
    <div>
      <div class="co-name">${name}</div>
      <div style="font-size:10px;color:#555;margin-top:2px">Medical &amp; Technical Textiles</div>
    </div>
    <div class="rpt-title">
      <h2>${title}</h2>
      ${subtitle ? `<div style="font-size:11px;color:#555;margin-top:3px">${subtitle}</div>` : ''}
      ${dateRange}
      <div style="font-size:10px;color:#888;margin-top:4px">Generated: ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
    </div>
  </div>
  ${summaryHTML}
  <table>
    <thead>${theadHTML}</thead>
    <tbody>${tbodyHTML}</tbody>
    ${tfootHTML}
  </table>
  <div class="footer">
    <span>${name} — Confidential</span>
    <span>Printed: ${new Date().toLocaleString('en-IN')}</span>
  </div>
</div>
</body></html>`);
    win.document.close();
}


// ── Excel / CSV Export ───────────────────────────────────────

export function exportCSV({ filename, headers, rows, summaryRows = [] }) {
    const escape = (val) => {
        const s = String(val ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    };

    const lines = [];

    // Summary block at top
    if (summaryRows.length > 0) {
        summaryRows.forEach(([label, val]) => lines.push(`${escape(label)},${escape(val)}`));
        lines.push('');
    }

    lines.push(headers.map(escape).join(','));
    rows.forEach(r => lines.push(r.map(escape).join(',')));

    const csv  = '\uFEFF' + lines.join('\r\n'); // BOM for Excel UTF-8
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
