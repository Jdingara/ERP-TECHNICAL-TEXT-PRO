/**
 * generate_sop.js
 * Generates a self-contained SOP HTML document with embedded screenshots.
 * Run: node generate_sop.js
 */
const fs   = require('fs');
const path = require('path');

const SHOTS = path.join(__dirname, 'sop_screenshots');
const OUT   = path.join(__dirname, 'BHF_India_ERP_SOP.html');

function img(name, alt) {
    const file = path.join(SHOTS, `${name}.png`);
    if (!fs.existsSync(file)) return `<div class="no-img">[Screenshot: ${alt}]</div>`;
    const b64 = fs.readFileSync(file).toString('base64');
    return `<img src="data:image/png;base64,${b64}" alt="${alt}" class="screenshot" />`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>BHF India ERP — Standard Operating Procedure</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #f8fafc; font-size: 14px; line-height: 1.6; }

  /* Cover page */
  .cover { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%); color: white; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 60px 40px; page-break-after: always; }
  .cover-logo { font-size: 56px; font-weight: 900; letter-spacing: -2px; margin-bottom: 8px; background: linear-gradient(135deg, #818cf8, #38bdf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .cover-sub { font-size: 18px; color: #94a3b8; margin-bottom: 48px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; }
  .cover h1 { font-size: 38px; font-weight: 700; margin-bottom: 16px; }
  .cover p  { font-size: 16px; color: #94a3b8; max-width: 600px; margin: 0 auto 40px; }
  .cover-meta { display: flex; gap: 40px; justify-content: center; flex-wrap: wrap; margin-top: 48px; }
  .cover-meta-item { text-align: center; }
  .cover-meta-item .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
  .cover-meta-item .value { font-size: 15px; color: #e2e8f0; font-weight: 600; margin-top: 4px; }
  .workflow-pills { display: flex; gap: 0; align-items: center; margin-top: 40px; flex-wrap: wrap; justify-content: center; }
  .workflow-pills span { background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4); color: #a5b4fc; padding: 8px 18px; border-radius: 20px; font-size: 13px; font-weight: 600; }
  .workflow-pills .arrow { color: #475569; padding: 0 8px; font-size: 16px; }

  /* TOC */
  .toc-page { background: white; padding: 60px 80px; page-break-after: always; }
  .toc-page h2 { font-size: 28px; font-weight: 700; color: #0f172a; border-bottom: 3px solid #6366f1; padding-bottom: 12px; margin-bottom: 32px; }
  .toc-section { margin-bottom: 28px; }
  .toc-section-title { font-size: 14px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
  .toc-items { list-style: none; }
  .toc-items li { padding: 6px 0; border-bottom: 1px dotted #e2e8f0; display: flex; justify-content: space-between; }
  .toc-items li a { color: #334155; text-decoration: none; font-weight: 500; }
  .toc-items li a:hover { color: #6366f1; }
  .toc-items li .pg { color: #94a3b8; font-size: 12px; }

  /* Content */
  .page { background: white; padding: 56px 72px; margin-bottom: 0; page-break-after: always; max-width: 1100px; margin: 0 auto; }
  @media print { .page { padding: 40px 56px; page-break-after: always; } }

  .section-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9; }
  .section-number { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; flex-shrink: 0; }
  .section-title { font-size: 26px; font-weight: 700; color: #0f172a; }
  .section-desc { font-size: 14px; color: #64748b; margin-top: 2px; }

  .screenshot { width: 100%; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); margin: 20px 0 28px; display: block; }
  .screenshot-caption { text-align: center; font-size: 12px; color: #64748b; margin-top: -20px; margin-bottom: 28px; font-style: italic; }
  .no-img { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 40px; text-align: center; color: #94a3b8; margin: 20px 0 28px; }

  h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 28px 0 12px; }
  h4 { font-size: 15px; font-weight: 600; color: #334155; margin: 20px 0 8px; }
  p  { color: #475569; margin-bottom: 12px; }
  ul, ol { padding-left: 24px; margin-bottom: 16px; color: #475569; }
  li { margin-bottom: 6px; }

  .steps { counter-reset: step; list-style: none; padding: 0; }
  .steps li { counter-increment: step; display: flex; gap: 16px; margin-bottom: 20px; padding: 16px 20px; background: #f8fafc; border-radius: 10px; border-left: 4px solid #6366f1; }
  .steps li::before { content: counter(step); background: #6366f1; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
  .steps li .step-content strong { display: block; color: #0f172a; font-size: 14px; margin-bottom: 4px; }
  .steps li .step-content span { color: #64748b; font-size: 13px; }

  .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px 20px; margin: 16px 0 24px; display: flex; gap: 12px; }
  .info-box .icon { font-size: 20px; flex-shrink: 0; }
  .info-box p { margin: 0; color: #1e40af; font-size: 13px; }

  .warn-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px 20px; margin: 16px 0 24px; display: flex; gap: 12px; }
  .warn-box p { margin: 0; color: #92400e; font-size: 13px; }

  .status-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 20px; }
  .chip { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }

  table.ref { width: 100%; border-collapse: collapse; margin: 16px 0 28px; font-size: 13px; }
  table.ref th { background: #f1f5f9; color: #334155; font-weight: 700; padding: 10px 14px; text-align: left; border-bottom: 2px solid #e2e8f0; }
  table.ref td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #475569; vertical-align: top; }
  table.ref tr:hover td { background: #f8fafc; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 16px 0 24px; }
  .col-card { background: #f8fafc; border-radius: 10px; padding: 16px 20px; border: 1px solid #e2e8f0; }
  .col-card h4 { margin: 0 0 10px; color: #1e293b; }
  .col-card ul { margin: 0; padding-left: 18px; }
  .col-card li { color: #475569; font-size: 13px; }

  .workflow-flow { display: flex; gap: 0; align-items: center; margin: 20px 0 28px; flex-wrap: wrap; }
  .flow-box { background: #f1f5f9; border: 2px solid #e2e8f0; border-radius: 10px; padding: 12px 18px; text-align: center; min-width: 110px; }
  .flow-box .flow-num { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
  .flow-box .flow-label { font-size: 13px; font-weight: 700; color: #1e293b; }
  .flow-box .flow-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .flow-arrow { color: #94a3b8; font-size: 20px; padding: 0 8px; }

  .page-break { page-break-after: always; }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════════
     COVER PAGE
═══════════════════════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-logo">BHF India</div>
  <div class="cover-sub">Buying House ERP</div>
  <h1>Standard Operating Procedure</h1>
  <p>Complete guide for using the BHF India ERP system — from product development through shipment, invoicing, and payment tracking.</p>

  <div class="workflow-pills">
    <span>Buyer Inquiry</span><div class="arrow">→</div>
    <span>Costing &amp; RFQ</span><div class="arrow">→</div>
    <span>PD / Sampling</span><div class="arrow">→</div>
    <span>Customer Order</span><div class="arrow">→</div>
    <span>Factory Order</span><div class="arrow">→</div>
    <span>T&amp;A Tracking</span><div class="arrow">→</div>
    <span>PSI</span><div class="arrow">→</div>
    <span>Shipment</span><div class="arrow">→</div>
    <span>Invoice &amp; Payment</span>
  </div>

  <div class="cover-meta">
    <div class="cover-meta-item"><div class="label">Version</div><div class="value">1.0</div></div>
    <div class="cover-meta-item"><div class="label">Date</div><div class="value">May 2026</div></div>
    <div class="cover-meta-item"><div class="label">Prepared By</div><div class="value">BHF India Admin</div></div>
    <div class="cover-meta-item"><div class="label">System</div><div class="value">BHF India ERP v1.0</div></div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     TABLE OF CONTENTS
═══════════════════════════════════════════════════════════════ -->
<div class="toc-page">
  <h2>Table of Contents</h2>

  <div class="toc-section">
    <div class="toc-section-title">Getting Started</div>
    <ul class="toc-items">
      <li><a href="#s1">1. Login &amp; Navigation</a></li>
      <li><a href="#s2">2. Dashboard Overview</a></li>
    </ul>
  </div>

  <div class="toc-section">
    <div class="toc-section-title">Core Workflow</div>
    <ul class="toc-items">
      <li><a href="#s3">3. Buyer Inquiries — Capture, Cost &amp; Vendor RFQ</a></li>
      <li><a href="#s4">4. Product Development (PD) — Sampling &amp; Approval</a></li>
      <li><a href="#s5">5. Customer Orders (CO) — Placing &amp; Managing Orders</a></li>
      <li><a href="#s6">6. Factory Orders (FO) — Sourcing from Vendors</a></li>
      <li><a href="#s7">7. T&amp;A Milestone Tracking</a></li>
      <li><a href="#s8">8. Costing Sheet — Margin &amp; FOB Calculation</a></li>
    </ul>
  </div>

  <div class="toc-section">
    <div class="toc-section-title">Shipment &amp; Quality</div>
    <ul class="toc-items">
      <li><a href="#s9">9. Pre-Shipment Inspection (PSI)</a></li>
      <li><a href="#s10">10. Shipment Tracking</a></li>
    </ul>
  </div>

  <div class="toc-section">
    <div class="toc-section-title">Finance</div>
    <ul class="toc-items">
      <li><a href="#s11">11. Sales Invoices — Billing the Buyer</a></li>
      <li><a href="#s12">12. Purchase Invoices — Vendor Bills</a></li>
      <li><a href="#s13">13. Payments — Received &amp; Made</a></li>
    </ul>
  </div>

  <div class="toc-section">
    <div class="toc-section-title">Reports</div>
    <ul class="toc-items">
      <li><a href="#s14">14. Order Summary Report</a></li>
      <li><a href="#s15">15. PD Pipeline Report</a></li>
      <li><a href="#s16">16. Vendor Performance Report</a></li>
      <li><a href="#s17">17. Shipment Tracker Report</a></li>
    </ul>
  </div>

  <div class="toc-section">
    <div class="toc-section-title">Masters &amp; Settings</div>
    <ul class="toc-items">
      <li><a href="#s18">18. Master Data (Customers, Vendors, Brands)</a></li>
      <li><a href="#s19">19. Settings &amp; Email Templates</a></li>
    </ul>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 1: LOGIN & NAVIGATION
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s1">
  <div class="section-header">
    <div class="section-number">1</div>
    <div>
      <div class="section-title">Login &amp; Navigation</div>
      <div class="section-desc">Accessing the BHF India ERP system</div>
    </div>
  </div>

  <h3>1.1 Logging In</h3>
  <p>Open your browser and navigate to your ERP URL (e.g., <strong>http://localhost:8000</strong> or your server address). You will see the login page:</p>
  ${img('01_login', 'Login Page')}
  <p class="screenshot-caption">Figure 1.1 — Login Page</p>

  <ol class="steps">
    <li><div class="step-content"><strong>Enter Username</strong><span>Type your username in the first field (e.g., <em>admin</em>).</span></div></li>
    <li><div class="step-content"><strong>Enter Password</strong><span>Type your password in the password field.</span></div></li>
    <li><div class="step-content"><strong>Click "Sign In"</strong><span>Press the Sign In button. You will be redirected to the Dashboard.</span></div></li>
  </ol>

  <div class="info-box">
    <div class="icon">ℹ️</div>
    <p>If you see "Invalid username or password", check your credentials with your system administrator. Passwords are case-sensitive.</p>
  </div>

  <h3>1.2 Navigation Sidebar</h3>
  <p>Once logged in, the left sidebar provides access to all modules:</p>
  ${img('00_sidebar_dashboard', 'Sidebar Navigation')}
  <p class="screenshot-caption">Figure 1.2 — Sidebar Navigation</p>

  <table class="ref">
    <tr><th>Sidebar Module</th><th>What It Does</th></tr>
    <tr><td><strong>Dashboard</strong></td><td>Live KPI overview — orders, shipments, finance, alerts</td></tr>
    <tr><td><strong>Product Development</strong></td><td>Manage PD requests from customer inquiry through sample approval</td></tr>
    <tr><td><strong>Masters</strong></td><td>Customers, Vendors, Brands, Categories, Items and other reference data</td></tr>
    <tr><td><strong>Orders</strong></td><td>Buyer Inquiries (capture requirements, cost, vendor RFQ), Customer Orders (CO) and Factory Orders (FO)</td></tr>
    <tr><td><strong>Quality</strong></td><td>Pre-Shipment Inspection, Sample Testing</td></tr>
    <tr><td><strong>Shipment</strong></td><td>PSI records and Shipment tracking</td></tr>
    <tr><td><strong>Finance</strong></td><td>Sales Invoices, Purchase Invoices, Payments</td></tr>
    <tr><td><strong>Reports</strong></td><td>Order Summary, PD Pipeline, Vendor Performance, Shipment Tracker</td></tr>
    <tr><td><strong>Settings</strong></td><td>Company info, Email templates, Format panel</td></tr>
  </table>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 2: DASHBOARD
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s2">
  <div class="section-header">
    <div class="section-number">2</div>
    <div>
      <div class="section-title">Dashboard Overview</div>
      <div class="section-desc">Your buying house at a glance</div>
    </div>
  </div>

  ${img('02_dashboard', 'Dashboard')}
  <p class="screenshot-caption">Figure 2.1 — Main Dashboard showing KPIs, charts, and recent orders</p>

  <h3>Dashboard Sections</h3>
  <div class="two-col">
    <div class="col-card">
      <h4>KPI Cards (top row)</h4>
      <ul>
        <li><strong>Active PD Requests</strong> — open product developments</li>
        <li><strong>Customer Orders</strong> — confirmed &amp; active COs</li>
        <li><strong>In Production</strong> — FOs currently in production</li>
        <li><strong>Factory Orders</strong> — all active FOs</li>
        <li><strong>Shipments In Transit</strong> — sea/air/land in flight</li>
        <li><strong>PSI Pass Rate</strong> — % of inspections passed</li>
        <li><strong>Receivable</strong> — total outstanding from buyers</li>
        <li><strong>T&amp;A Overdue</strong> — milestones past due date</li>
      </ul>
    </div>
    <div class="col-card">
      <h4>Charts &amp; Tables</h4>
      <ul>
        <li><strong>Monthly Order Value</strong> — 6-month bar chart (FOB USD)</li>
        <li><strong>CO Status Pie</strong> — order pipeline by status</li>
        <li><strong>PD Status Pie</strong> — development pipeline</li>
        <li><strong>Finance Snapshot</strong> — receivables vs payables</li>
        <li><strong>Workflow Flow</strong> — end-to-end process view</li>
        <li><strong>Recent COs</strong> — last 5 customer orders with links</li>
      </ul>
    </div>
  </div>

  <div class="info-box">
    <div class="icon">💡</div>
    <p>Click any KPI card or row in Recent COs to navigate directly to that record. The dashboard auto-refreshes — click <strong>Refresh</strong> in the top-right to force an update.</p>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 3: BUYER INQUIRIES
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s3">
  <div class="section-header">
    <div class="section-number">3</div>
    <div>
      <div class="section-title">Buyer Inquiries</div>
      <div class="section-desc">Capture customer requirements → cost → vendor RFQ → convert to order</div>
    </div>
  </div>

  <p>Every business starts with a buyer inquiry. The Buyer Inquiry module is the <strong>first step in the workflow</strong> — capturing what the customer wants, calculating your cost and selling price, comparing vendor quotes, and then converting to a confirmed Customer Order.</p>

  <div class="workflow-flow" style="margin-bottom:24px">
    <div class="flow-box" style="border-color:#3b82f6"><div class="flow-num">1</div><div class="flow-label">Capture Inquiry</div><div class="flow-sub">Style, qty, delivery</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box" style="border-color:#f59e0b"><div class="flow-num">2</div><div class="flow-label">Build Cost Sheet</div><div class="flow-sub">Fabric, CM, margin</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box" style="border-color:#8b5cf6"><div class="flow-num">3</div><div class="flow-label">Send RFQ</div><div class="flow-sub">Multiple vendors</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box" style="border-color:#06b6d4"><div class="flow-num">4</div><div class="flow-label">Compare Quotes</div><div class="flow-sub">Select best vendor</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box" style="border-color:#10b981"><div class="flow-num">5</div><div class="flow-label">Convert to CO</div><div class="flow-sub">One click</div></div>
  </div>

  ${img('03_inquiry_list', 'Buyer Inquiry List')}
  <p class="screenshot-caption">Figure 3.1 — Buyer Inquiry list showing status flow and vendor quote counts</p>

  <h3>3.1 Creating a New Inquiry</h3>
  <ol class="steps">
    <li><div class="step-content"><strong>Go to Orders → Buyer Inquiries</strong><span>Click "Buyer Inquiries" in the sidebar under Orders.</span></div></li>
    <li><div class="step-content"><strong>Click "+ New Inquiry"</strong><span>Opens the creation form.</span></div></li>
    <li><div class="step-content"><strong>Fill customer details</strong><span>Select Customer, Brand, Category. Enter Inquiry Date, Required Delivery date, Destination (country/port), and Target FOB Price per piece.</span></div></li>
    <li><div class="step-content"><strong>Add style items (optional)</strong><span>Click "+ Add Item" to list each style with Style Ref, Description, Color, Size Range, Quantity, and Target Price. You can also add items later in the detail page.</span></div></li>
    <li><div class="step-content"><strong>Save</strong><span>The system auto-generates an inquiry number (e.g., INQ-2026-0001) and opens the detail page.</span></div></li>
  </ol>

  <h3>3.2 Inquiry Overview Tab</h3>
  ${img('03b_inquiry_overview', 'Inquiry Overview')}
  <p class="screenshot-caption">Figure 3.2 — Inquiry detail: Overview tab with summary cards (Target FOB, Selling Price, Best Quote)</p>

  <p>The detail page has four tabs:</p>
  <div class="two-col">
    <div class="col-card">
      <h4>Overview</h4>
      <ul>
        <li>Edit all inquiry fields (customer, dates, target price)</li>
        <li>Summary cards: Target FOB vs. Your Selling Price vs. Best Quote</li>
        <li>Link to the converted Customer Order once confirmed</li>
        <li>"Convert to CO" button to create a CO from this inquiry</li>
      </ul>
    </div>
    <div class="col-card">
      <h4>Items Tab</h4>
      <ul>
        <li>Add/edit style items: style ref, color, size range, quantity</li>
        <li>Target price per piece per style</li>
        <li>All items are copied automatically when converting to CO</li>
      </ul>
    </div>
  </div>

  <h3>3.3 Building the Cost Sheet</h3>
  ${img('03c_inquiry_cost_sheet', 'Inquiry Cost Sheet')}
  <p class="screenshot-caption">Figure 3.3 — Cost Sheet tab: build-up from raw materials to FOB selling price</p>

  <p>The Cost Sheet tab lets you calculate your exact FOB price per piece. Enter each cost component:</p>
  <table class="ref">
    <tr><th>Field</th><th>Description</th></tr>
    <tr><td><strong>Fabric Cost / pc</strong></td><td>Cost of fabric per finished piece (weight × price per kg/m)</td></tr>
    <tr><td><strong>Trims &amp; Accessories / pc</strong></td><td>Buttons, zippers, labels, hangtags</td></tr>
    <tr><td><strong>Cut &amp; Make (CM) / pc</strong></td><td>Factory cutting and sewing cost</td></tr>
    <tr><td><strong>Washing / Finishing / pc</strong></td><td>Any washing, printing, or finishing treatment</td></tr>
    <tr><td><strong>Testing &amp; Inspection / pc</strong></td><td>Lab testing, QC charges</td></tr>
    <tr><td><strong>Freight &amp; Misc / pc</strong></td><td>Export freight, agent fee, documentation</td></tr>
    <tr><td><strong>Overhead %</strong></td><td>% overhead on base cost (office, staff)</td></tr>
    <tr><td><strong>Margin %</strong></td><td>Your profit margin as % of (base + overhead)</td></tr>
    <tr><td><strong>Selling FOB Price</strong></td><td>Your final quoted price to buyer — override or auto-calculate</td></tr>
  </table>

  <div class="info-box">
    <div class="icon">💡</div>
    <p>The <strong>live calculation preview</strong> shows Base Cost, Calculated Total (with overhead + margin), and compares it against the Buyer's Target FOB in real time as you type. Save the cost sheet to update the inquiry status to "Costing Done".</p>
  </div>

  <h3>3.4 Vendor Quotation Comparison</h3>
  ${img('03d_inquiry_vendor_quotes', 'Vendor Quotes Comparison')}
  <p class="screenshot-caption">Figure 3.4 — Vendor Quotes tab: side-by-side comparison with selected vendor highlighted</p>

  <ol class="steps">
    <li><div class="step-content"><strong>Click "+ Add RFQ / Quote"</strong><span>Select a vendor, enter RFQ date. If the vendor has responded, also enter their response date, unit quoted (per pc), total quoted, and lead time.</span></div></li>
    <li><div class="step-content"><strong>Add multiple vendors</strong><span>Repeat for each factory you approach. Quotes are automatically sorted lowest price first.</span></div></li>
    <li><div class="step-content"><strong>Click "Select" on the best vendor</strong><span>The selected vendor is highlighted green. All other vendors are automatically marked "Rejected". Inquiry status moves to "Quoted to Buyer".</span></div></li>
  </ol>

  <h3>3.5 Converting to Customer Order</h3>
  <p>Once the buyer confirms the order, click <strong>"Convert to CO →"</strong> in the top-right of the inquiry. This automatically:</p>
  <ul>
    <li>Creates a new Customer Order (CO) with all inquiry items pre-filled</li>
    <li>Sets delivery date from inquiry's required delivery</li>
    <li>Marks the inquiry as "Converted to CO" with a link to the CO</li>
  </ul>

  <div class="status-chips">
    <span class="chip" style="background:#3b82f620;color:#3b82f6">Open</span>
    <span class="chip" style="background:#f59e0b20;color:#f59e0b">Costing Done</span>
    <span class="chip" style="background:#8b5cf620;color:#8b5cf6">RFQ Sent</span>
    <span class="chip" style="background:#06b6d420;color:#06b6d4">Quoted to Buyer</span>
    <span class="chip" style="background:#10b98120;color:#10b981">Converted to CO</span>
    <span class="chip" style="background:#94a3b820;color:#94a3b8">Dropped</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 4: PRODUCT DEVELOPMENT
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s4">
  <div class="section-header">
    <div class="section-number">4</div>
    <div>
      <div class="section-title">Product Development (PD)</div>
      <div class="section-desc">From sample request to approval</div>
    </div>
  </div>

  <p>The PD module tracks every product development request from vendor assignment through sampling, testing, and final approval.</p>

  ${img('04_pd_list', 'PD List')}
  <p class="screenshot-caption">Figure 4.1 — Product Development Pipeline with status filters</p>

  <h3>4.1 Creating a New PD Request</h3>
  <ol class="steps">
    <li><div class="step-content"><strong>Navigate to Product Development</strong><span>Click "Product Development" in the sidebar.</span></div></li>
    <li><div class="step-content"><strong>Click "+ New PD Request"</strong><span>Opens the creation form.</span></div></li>
    <li><div class="step-content"><strong>Fill in the details</strong><span>Enter Title, Customer, Brand, Category, Request Date, Required By date, and a description of the product.</span></div></li>
    <li><div class="step-content"><strong>Save</strong><span>The system auto-generates a PD number (e.g., PD-2026-0001) and sets status to "Open".</span></div></li>
  </ol>

  <h3>4.2 PD Request Detail</h3>
  ${img('04b_pd_detail', 'PD Detail')}
  <p class="screenshot-caption">Figure 4.2 — PD Detail page showing vendor assignments and sample tracking</p>

  <p>The PD detail page has multiple tabs:</p>

  <div class="two-col">
    <div class="col-card">
      <h4>Vendor Assignment Tab</h4>
      <ul>
        <li>Assign one or more vendors to develop the product</li>
        <li>Track accept/reject status per vendor</li>
        <li>Record development cost (sample fee)</li>
        <li>Add notes on vendor capability</li>
      </ul>
    </div>
    <div class="col-card">
      <h4>Sample Tracking Tab</h4>
      <ul>
        <li>Log each sample shipment (courier + tracking)</li>
        <li>Record shipped date and received date</li>
        <li>Link sample to the vendor assignment</li>
        <li>Add comments on sample quality</li>
      </ul>
    </div>
  </div>

  <h3>4.3 PD Status Workflow</h3>
  <div class="workflow-flow">
    <div class="flow-box"><div class="flow-num">1</div><div class="flow-label">Open</div><div class="flow-sub">Created</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box"><div class="flow-num">2</div><div class="flow-label">Vendor Assigned</div><div class="flow-sub">Sourcing</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box"><div class="flow-num">3</div><div class="flow-label">Sample In Progress</div><div class="flow-sub">Development</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box"><div class="flow-num">4</div><div class="flow-label">Sample Received</div><div class="flow-sub">Review</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box"><div class="flow-num">5</div><div class="flow-label">Testing</div><div class="flow-sub">Lab</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box"><div class="flow-num">6</div><div class="flow-label">Approved</div><div class="flow-sub">Ready for CO</div></div>
  </div>

  <div class="status-chips">
    <span class="chip" style="background:#3b82f620;color:#3b82f6">Open</span>
    <span class="chip" style="background:#f59e0b20;color:#f59e0b">Vendor Assigned</span>
    <span class="chip" style="background:#f9731620;color:#f97316">Sample In Progress</span>
    <span class="chip" style="background:#8b5cf620;color:#8b5cf6">Sample Received</span>
    <span class="chip" style="background:#06b6d420;color:#06b6d4">Testing</span>
    <span class="chip" style="background:#10b98120;color:#10b981">Approved</span>
    <span class="chip" style="background:#ef444420;color:#ef4444">Rejected</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 5: CUSTOMER ORDERS
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s5">
  <div class="section-header">
    <div class="section-number">5</div>
    <div>
      <div class="section-title">Customer Orders (CO)</div>
      <div class="section-desc">Managing buyer purchase orders</div>
    </div>
  </div>

  ${img('04_co_list', 'CO List')}
  <p class="screenshot-caption">Figure 4.1 — Customer Orders list with status badges and quick filters</p>

  <h3>4.1 Creating a Customer Order</h3>
  <ol class="steps">
    <li><div class="step-content"><strong>Go to Orders → Customer Orders</strong><span>Click the Orders menu in the sidebar, then Customer Orders.</span></div></li>
    <li><div class="step-content"><strong>Click "+ New Customer Order"</strong><span>Fill in: Customer, Brand, Category, Buyer's PO Reference, Order Date, Ship By Date, Currency, Incoterms, and Payment Terms.</span></div></li>
    <li><div class="step-content"><strong>Link to PD (optional)</strong><span>Select the approved PD request this order is based on.</span></div></li>
    <li><div class="step-content"><strong>Save the header</strong><span>System generates a CO number (e.g., CO-2026-0001).</span></div></li>
    <li><div class="step-content"><strong>Add line items</strong><span>In the Items tab, add style/color/size rows with quantities and unit prices.</span></div></li>
  </ol>

  <h3>4.2 CO Detail — Overview Tab</h3>
  ${img('05_co_detail_overview', 'CO Overview')}
  <p class="screenshot-caption">Figure 4.2 — CO Detail: Overview showing order summary, customer info, and key dates</p>

  <h3>4.3 CO Detail — Items Tab</h3>
  ${img('05b_co_items_tab', 'CO Items')}
  <p class="screenshot-caption">Figure 4.3 — CO Items tab: Style / color / size breakdown with quantities and prices</p>

  <h3>CO Status Values</h3>
  <div class="status-chips">
    <span class="chip" style="background:#94a3b820;color:#64748b">Draft</span>
    <span class="chip" style="background:#3b82f620;color:#3b82f6">Confirmed</span>
    <span class="chip" style="background:#f59e0b20;color:#f59e0b">In Production</span>
    <span class="chip" style="background:#06b6d420;color:#06b6d4">Ready to Ship</span>
    <span class="chip" style="background:#10b98120;color:#10b981">Shipped</span>
    <span class="chip" style="background:#8b5cf620;color:#8b5cf6">Closed</span>
    <span class="chip" style="background:#ef444420;color:#ef4444">Cancelled</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 6: FACTORY ORDERS
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s6">
  <div class="section-header">
    <div class="section-number">6</div>
    <div>
      <div class="section-title">Factory Orders (FO)</div>
      <div class="section-desc">Placing production orders with vendors</div>
    </div>
  </div>

  ${img('06_co_factory_orders_tab', 'Factory Orders')}
  <p class="screenshot-caption">Figure 5.1 — Factory Orders tab inside CO detail: all FOs linked to this customer order</p>

  <h3>5.1 Creating a Factory Order</h3>
  <p>Factory Orders are created from within the Customer Order detail page, under the <strong>Factory Orders</strong> tab:</p>

  <ol class="steps">
    <li><div class="step-content"><strong>Open the CO detail</strong><span>Navigate to Orders → Customer Orders, click on the CO.</span></div></li>
    <li><div class="step-content"><strong>Go to Factory Orders tab</strong><span>Click the "Factory Orders" tab at the top.</span></div></li>
    <li><div class="step-content"><strong>Click "+ New Factory Order"</strong><span>Select the vendor, set Ex-Factory date, currency, and payment terms.</span></div></li>
    <li><div class="step-content"><strong>Add FO items</strong><span>Enter style ref, description, size, quantity, and unit cost (in vendor's currency, typically INR).</span></div></li>
    <li><div class="step-content"><strong>Save</strong><span>System generates FO number (e.g., FO-2026-0001).</span></div></li>
  </ol>

  <div class="warn-box">
    <div class="icon">⚠️</div>
    <p><strong>Important:</strong> One Customer Order can have multiple Factory Orders (e.g., different vendors for fabric vs. CMT). Each FO is tracked independently for production status and payments.</p>
  </div>

  <table class="ref">
    <tr><th>FO Status</th><th>Meaning</th></tr>
    <tr><td><span class="chip" style="background:#94a3b820;color:#64748b">Draft</span></td><td>FO created but not yet confirmed with vendor</td></tr>
    <tr><td><span class="chip" style="background:#3b82f620;color:#3b82f6">Confirmed</span></td><td>Vendor has acknowledged the order</td></tr>
    <tr><td><span class="chip" style="background:#f59e0b20;color:#f59e0b">In Production</span></td><td>Vendor is actively producing</td></tr>
    <tr><td><span class="chip" style="background:#06b6d420;color:#06b6d4">Ready</span></td><td>Goods ready for inspection / dispatch</td></tr>
    <tr><td><span class="chip" style="background:#10b98120;color:#10b981">Completed</span></td><td>Goods delivered</td></tr>
    <tr><td><span class="chip" style="background:#ef444420;color:#ef4444">Cancelled</span></td><td>FO cancelled</td></tr>
  </table>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 7: T&A MILESTONES
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s7">
  <div class="section-header">
    <div class="section-number">7</div>
    <div>
      <div class="section-title">T&amp;A Milestone Tracking</div>
      <div class="section-desc">Time &amp; Action calendar for on-time delivery</div>
    </div>
  </div>

  <p>The T&amp;A (Time &amp; Action) tab on every Customer Order shows a milestone calendar that tracks all critical activities from fabric approval through ex-factory.</p>

  ${img('07_ta_milestones', 'T&A Milestones')}
  <p class="screenshot-caption">Figure 6.1 — T&amp;A Milestones: planned vs actual dates with overdue highlighting</p>

  <h3>6.1 Standard Milestones</h3>
  <table class="ref">
    <tr><th>#</th><th>Milestone</th><th>Responsible</th><th>Notes</th></tr>
    <tr><td>1</td><td>Fabric Approval</td><td>BHF Office</td><td>Customer signs off on fabric swatch</td></tr>
    <tr><td>2</td><td>PP Sample Approval</td><td>BHF Office</td><td>Pre-production sample review</td></tr>
    <tr><td>3</td><td>Bulk Fabric In-House</td><td>Vendor</td><td>Fabric received at factory</td></tr>
    <tr><td>4</td><td>Cutting Start</td><td>Vendor</td><td>Production cutting begins</td></tr>
    <tr><td>5</td><td>Sewing Complete</td><td>Vendor</td><td>All pieces sewn</td></tr>
    <tr><td>6</td><td>Final Inspection</td><td>BHF / 3rd Party</td><td>PSI conducted</td></tr>
    <tr><td>7</td><td>Ex-Factory</td><td>Vendor</td><td>Goods dispatched from factory</td></tr>
  </table>

  <h3>6.2 Managing Milestones</h3>
  <ol class="steps">
    <li><div class="step-content"><strong>Open CO → T&amp;A tab</strong><span>All milestones are listed with planned dates.</span></div></li>
    <li><div class="step-content"><strong>Update actual dates</strong><span>When a milestone is completed, click Edit and enter the actual completion date.</span></div></li>
    <li><div class="step-content"><strong>Monitor overdue items</strong><span>Red highlighted rows show milestones past their planned date that are not yet completed.</span></div></li>
    <li><div class="step-content"><strong>Dashboard alert</strong><span>The T&amp;A Overdue KPI on the dashboard shows the total count across all orders.</span></div></li>
  </ol>

  <div class="warn-box">
    <div class="icon">⚠️</div>
    <p>Milestones in <strong>red</strong> are overdue — the actual date has passed but the milestone is still "pending" or "in progress". Update these immediately to keep records accurate.</p>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 8: COSTING SHEET
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s8">
  <div class="section-header">
    <div class="section-number">8</div>
    <div>
      <div class="section-title">Costing Sheet</div>
      <div class="section-desc">FOB price breakdown and margin calculation</div>
    </div>
  </div>

  ${img('08_costing_sheet', 'Costing Sheet')}
  <p class="screenshot-caption">Figure 7.1 — Costing Sheet: per-piece cost breakdown with live margin calculation</p>

  <h3>7.1 How to Use the Costing Sheet</h3>
  <p>The Costing Sheet is in the <strong>Costing</strong> tab of each Customer Order detail page.</p>

  <ol class="steps">
    <li><div class="step-content"><strong>Enter FOB Price per piece</strong><span>This is the price you charge the customer (USD per piece).</span></div></li>
    <li><div class="step-content"><strong>Fill in cost components</strong><span>Enter each cost per piece: Fabric, Trim, Embroidery/Print, Washing/Finishing, CM (Cut &amp; Make), Testing, Inspection, Freight, Other.</span></div></li>
    <li><div class="step-content"><strong>Set BH Commission %</strong><span>Your buying house commission percentage (e.g., 5%).</span></div></li>
    <li><div class="step-content"><strong>Review live P&amp;L</strong><span>The right panel shows total cost, margin per piece, margin %, and total order P&amp;L automatically.</span></div></li>
  </ol>

  <table class="ref">
    <tr><th>Cost Component</th><th>Description</th></tr>
    <tr><td>Fabric Cost</td><td>Raw fabric per piece (USD)</td></tr>
    <tr><td>Trim Cost</td><td>Buttons, zippers, labels, elastic per piece</td></tr>
    <tr><td>Embroidery / Print</td><td>Decoration cost per piece</td></tr>
    <tr><td>Washing / Finishing</td><td>Laundry, pressing, finishing cost</td></tr>
    <tr><td>CM Cost</td><td>Cut &amp; Make (labour) cost per piece</td></tr>
    <tr><td>Testing Cost</td><td>Lab test cost amortized per piece</td></tr>
    <tr><td>Inspection Cost</td><td>PSI cost amortized per piece</td></tr>
    <tr><td>Freight Cost</td><td>Freight amortized per piece</td></tr>
    <tr><td>Other Cost</td><td>Any miscellaneous cost</td></tr>
    <tr><td>BH Commission %</td><td>Buying house service fee % of FOB</td></tr>
  </table>

  <p><strong>Margin = FOB Price − Total Cost per piece − Commission</strong></p>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 9: PSI
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s9">
  <div class="section-header">
    <div class="section-number">9</div>
    <div>
      <div class="section-title">Pre-Shipment Inspection (PSI)</div>
      <div class="section-desc">Quality gate before goods leave the factory</div>
    </div>
  </div>

  ${img('09_psi_list', 'PSI List')}
  <p class="screenshot-caption">Figure 8.1 — PSI List: all inspections with results and defect counts</p>

  <h3>8.1 Creating a PSI Record</h3>
  <ol class="steps">
    <li><div class="step-content"><strong>Go to Shipment → PSI</strong><span>Click Shipment in the sidebar, then Pre-Shipment Inspection.</span></div></li>
    <li><div class="step-content"><strong>Click "+ New Inspection"</strong><span>Select the Customer Order and Factory Order being inspected.</span></div></li>
    <li><div class="step-content"><strong>Enter inspection details</strong><span>Inspector name, agency, inspection date, AQL level (typically 2.5), quantity inspected.</span></div></li>
    <li><div class="step-content"><strong>Record defects</strong><span>Enter count of Critical, Major, and Minor defects found.</span></div></li>
    <li><div class="step-content"><strong>Set result</strong><span>Choose: Pass / Pass with Remarks / Fail / Re-Inspection Required.</span></div></li>
    <li><div class="step-content"><strong>Complete checklist</strong><span>Tick each standard checklist item (measurements, stitching, labels, packing, etc.).</span></div></li>
  </ol>

  <div class="two-col">
    <div class="col-card">
      <h4>PSI Result Codes</h4>
      <ul>
        <li><strong>Pass</strong> — No significant defects, approve for shipment</li>
        <li><strong>Pass with Remarks</strong> — Minor issues noted, shipment allowed with conditions</li>
        <li><strong>Fail</strong> — Significant defects found, do not ship</li>
        <li><strong>Re-Inspection</strong> — Issues found, rework required, re-inspect before shipping</li>
      </ul>
    </div>
    <div class="col-card">
      <h4>AQL Levels</h4>
      <ul>
        <li><strong>AQL 1.0</strong> — Strictest, zero tolerance</li>
        <li><strong>AQL 1.5</strong> — High quality standard</li>
        <li><strong>AQL 2.5</strong> — Standard for apparel (most common)</li>
        <li><strong>AQL 4.0</strong> — Relaxed standard</li>
      </ul>
    </div>
  </div>

  <div class="warn-box">
    <div class="icon">⚠️</div>
    <p>Never create a Shipment record for a CO that has a PSI result of <strong>Fail</strong>. Resolve defects first and re-inspect, or obtain written approval from the buyer before shipping.</p>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 10: SHIPMENTS
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s10">
  <div class="section-header">
    <div class="section-number">10</div>
    <div>
      <div class="section-title">Shipment Tracking</div>
      <div class="section-desc">Tracking goods from factory to buyer's port</div>
    </div>
  </div>

  ${img('10_shipments', 'Shipments')}
  <p class="screenshot-caption">Figure 9.1 — Shipment list with mode, routing, ETA, and B/L numbers</p>

  <h3>9.1 Creating a Shipment</h3>
  <ol class="steps">
    <li><div class="step-content"><strong>Go to Shipment → Shipments</strong><span>Click the Shipment module in the sidebar.</span></div></li>
    <li><div class="step-content"><strong>Click "+ New Shipment"</strong><span>Select the Customer Order and optionally the linked Factory Order and PSI.</span></div></li>
    <li><div class="step-content"><strong>Enter routing</strong><span>Mode (Sea/Air/Land/Courier), Port of Loading, Port of Discharge.</span></div></li>
    <li><div class="step-content"><strong>Enter dates</strong><span>ETD (Estimated Time of Departure) and ETA (Estimated Time of Arrival).</span></div></li>
    <li><div class="step-content"><strong>Enter cargo details</strong><span>B/L number, container number, total cartons, total qty, gross weight, CBM, invoice value.</span></div></li>
    <li><div class="step-content"><strong>Update status as shipment progresses</strong><span>Booked → Loaded → In Transit → Arrived → Customs → Delivered.</span></div></li>
  </ol>

  <table class="ref">
    <tr><th>Status</th><th>Meaning</th></tr>
    <tr><td>Draft</td><td>Booking not yet confirmed</td></tr>
    <tr><td>Booked</td><td>Space confirmed with carrier/forwarder</td></tr>
    <tr><td>Loaded</td><td>Goods stuffed into container, awaiting departure</td></tr>
    <tr><td>In Transit</td><td>Vessel/aircraft departed</td></tr>
    <tr><td>Arrived</td><td>Vessel arrived at destination port</td></tr>
    <tr><td>Customs</td><td>Goods under customs clearance</td></tr>
    <tr><td>Delivered</td><td>Goods delivered to buyer's warehouse</td></tr>
  </table>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 11: SALES INVOICES
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s11">
  <div class="section-header">
    <div class="section-number">11</div>
    <div>
      <div class="section-title">Sales Invoices</div>
      <div class="section-desc">Billing the buyer for each shipment</div>
    </div>
  </div>

  ${img('11_sales_invoices', 'Sales Invoices')}
  <p class="screenshot-caption">Figure 10.1 — Sales Invoice list with outstanding balances and status</p>

  <h3>10.1 Creating a Sales Invoice</h3>
  <ol class="steps">
    <li><div class="step-content"><strong>Go to Finance → Sales Invoices</strong></div></li>
    <li><div class="step-content"><strong>Click "+ New Invoice"</strong><span>Select the Customer Order, Shipment, and Customer.</span></div></li>
    <li><div class="step-content"><strong>Set dates</strong><span>Invoice Date and Due Date (typically 30-60 days from shipment).</span></div></li>
    <li><div class="step-content"><strong>Add line items</strong><span>Enter each style/description, quantity, and unit price. The subtotal calculates automatically.</span></div></li>
    <li><div class="step-content"><strong>Add tax if applicable</strong><span>Enter tax % (0% for most export invoices).</span></div></li>
    <li><div class="step-content"><strong>Save</strong><span>Invoice number auto-generated (e.g., SI-2026-0001).</span></div></li>
  </ol>

  <div class="info-box">
    <div class="icon">💡</div>
    <p>When a payment is received and linked to this invoice, the status automatically updates from <strong>Draft → Partially Paid → Paid</strong>. You do not need to update the status manually.</p>
  </div>

  <h3>10.2 Invoice Status</h3>
  <div class="status-chips">
    <span class="chip" style="background:#94a3b820;color:#64748b">Draft</span>
    <span class="chip" style="background:#3b82f620;color:#3b82f6">Sent</span>
    <span class="chip" style="background:#f59e0b20;color:#f59e0b">Partially Paid</span>
    <span class="chip" style="background:#10b98120;color:#10b981">Paid</span>
    <span class="chip" style="background:#ef444420;color:#ef4444">Overdue</span>
    <span class="chip" style="background:#94a3b820;color:#94a3b8">Cancelled</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 12: PURCHASE INVOICES
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s12">
  <div class="section-header">
    <div class="section-number">12</div>
    <div>
      <div class="section-title">Purchase Invoices</div>
      <div class="section-desc">Recording vendor bills from factories</div>
    </div>
  </div>

  ${img('12_purchase_invoices', 'Purchase Invoices')}
  <p class="screenshot-caption">Figure 11.1 — Purchase Invoice list: vendor bills linked to Factory Orders</p>

  <h3>11.1 Creating a Purchase Invoice</h3>
  <ol class="steps">
    <li><div class="step-content"><strong>Go to Finance → Purchase Invoices</strong></div></li>
    <li><div class="step-content"><strong>Click "+ New Invoice"</strong><span>Select the Factory Order and Vendor.</span></div></li>
    <li><div class="step-content"><strong>Enter vendor invoice ref</strong><span>The vendor's own invoice number (e.g., SREE/2025/0042) for cross-referencing.</span></div></li>
    <li><div class="step-content"><strong>Set dates and currency</strong><span>Invoice Date, Due Date, Currency (usually INR for Indian vendors).</span></div></li>
    <li><div class="step-content"><strong>Add line items</strong><span>Enter style, quantity, and unit cost. Subtotal auto-calculates.</span></div></li>
    <li><div class="step-content"><strong>Add GST if applicable</strong><span>Enter tax % (e.g., 5% GST on finished garments).</span></div></li>
  </ol>

  <div class="info-box">
    <div class="icon">💡</div>
    <p>Always record the vendor's invoice reference number. This helps during reconciliation and vendor payment disputes. The system stores it separately from the ERP's own PI number.</p>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 13: PAYMENTS
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s13">
  <div class="section-header">
    <div class="section-number">13</div>
    <div>
      <div class="section-title">Payments</div>
      <div class="section-desc">Tracking money received from buyers and paid to vendors</div>
    </div>
  </div>

  ${img('13_payments', 'Payments')}
  <p class="screenshot-caption">Figure 12.1 — Payments page: total receivable, payable, and net position summary</p>

  <h3>12.1 Recording a Payment Received (from Buyer)</h3>
  <ol class="steps">
    <li><div class="step-content"><strong>Go to Finance → Payments</strong></div></li>
    <li><div class="step-content"><strong>Click "↓ Received from Customer"</strong><span>Switches to the inbound payment form.</span></div></li>
    <li><div class="step-content"><strong>Select the Sales Invoice</strong><span>Only invoices with outstanding balance are shown.</span></div></li>
    <li><div class="step-content"><strong>Enter amount, date, and method</strong><span>Payment method: LC / Bank Transfer (TT) / Cheque / Cash.</span></div></li>
    <li><div class="step-content"><strong>Enter bank reference</strong><span>LC number, SWIFT reference, or cheque number for audit trail.</span></div></li>
    <li><div class="step-content"><strong>Save</strong><span>Invoice balance updates automatically. PAY number generated (e.g., PAY-2026-0001).</span></div></li>
  </ol>

  <h3>12.2 Recording a Payment Made (to Vendor)</h3>
  <p>Same process but click <strong>"↑ Made to Vendor"</strong> and select a Purchase Invoice instead of a Sales Invoice.</p>

  <table class="ref">
    <tr><th>Payment Method</th><th>When Used</th></tr>
    <tr><td>Letter of Credit (LC)</td><td>International export — most common for buyers</td></tr>
    <tr><td>Bank Transfer (TT)</td><td>Telegraphic transfer — domestic vendor payments</td></tr>
    <tr><td>Cheque</td><td>Local payments</td></tr>
    <tr><td>Cash</td><td>Petty expenses only</td></tr>
  </table>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 14-17: REPORTS
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s14">
  <div class="section-header">
    <div class="section-number">14</div>
    <div>
      <div class="section-title">Order Summary Report</div>
      <div class="section-desc">All customer orders in one filterable view</div>
    </div>
  </div>

  ${img('14_report_orders', 'Order Summary Report')}
  <p class="screenshot-caption">Figure 13.1 — Order Summary: filterable by status and date range, with totals footer</p>

  <p>The Order Summary Report shows all Customer Orders with their quantities, values, FO counts, and current status. Use the filters to narrow by:</p>
  <ul>
    <li><strong>Status</strong> — View only confirmed, in-production, or shipped orders</li>
    <li><strong>Date Range</strong> — Filter by order date range</li>
  </ul>
  <p>Click <strong>Print / PDF</strong> to export for customer or management review.</p>
</div>

<div class="page" id="s15">
  <div class="section-header">
    <div class="section-number">15</div>
    <div>
      <div class="section-title">PD Pipeline Report</div>
      <div class="section-desc">Product development funnel from inquiry to approval</div>
    </div>
  </div>

  ${img('15_report_pd', 'PD Pipeline Report')}
  <p class="screenshot-caption">Figure 14.1 — PD Pipeline: visual funnel showing each development stage with counts</p>

  <p>The PD Pipeline Report shows:</p>
  <ul>
    <li><strong>Pipeline Funnel</strong> — Visual count at each PD stage (Open → Approved)</li>
    <li><strong>Overdue PDs</strong> — Rows highlighted in red when Required By date has passed</li>
    <li><strong>Vendor count</strong> — How many vendors are assigned per PD</li>
    <li><strong>Sample count</strong> — Number of sample shipments received</li>
  </ul>
  <p>Click any funnel box to filter the table below to that status.</p>
</div>

<div class="page" id="s16">
  <div class="section-header">
    <div class="section-number">16</div>
    <div>
      <div class="section-title">Vendor Performance Report</div>
      <div class="section-desc">Score vendors by on-time delivery and quality</div>
    </div>
  </div>

  ${img('16_report_vendors', 'Vendor Performance Report')}
  <p class="screenshot-caption">Figure 15.1 — Vendor Performance: FO counts, late delivery %, PSI fail %, composite score</p>

  <p>Each vendor gets a <strong>Performance Score</strong> calculated as:<br/>
  <strong>Score = 100 − Late FO% − PSI Fail%</strong></p>

  <table class="ref">
    <tr><th>Score Range</th><th>Rating</th><th>Action</th></tr>
    <tr><td style="color:#10b981;font-weight:700">≥ 80</td><td>Good</td><td>Preferred vendor — continue business</td></tr>
    <tr><td style="color:#f59e0b;font-weight:700">60 – 79</td><td>Needs Attention</td><td>Issue improvement notice, monitor closely</td></tr>
    <tr><td style="color:#ef4444;font-weight:700">&lt; 60</td><td>At Risk</td><td>Consider suspension, escalate to management</td></tr>
  </table>
</div>

<div class="page" id="s17">
  <div class="section-header">
    <div class="section-number">17</div>
    <div>
      <div class="section-title">Shipment Tracker Report</div>
      <div class="section-desc">Live view of all active shipments and ETA countdowns</div>
    </div>
  </div>

  ${img('17_report_shipments', 'Shipment Tracker')}
  <p class="screenshot-caption">Figure 16.1 — Shipment Tracker: ETA countdown with overdue and due-soon alerts</p>

  <p>The Shipment Tracker shows all active shipments (excludes Delivered and Cancelled) with:</p>
  <ul>
    <li><strong>ETA Overdue</strong> (red) — ETA has passed but shipment not marked delivered</li>
    <li><strong>Arriving This Week</strong> (amber) — ETA within 7 days — prepare for customs and delivery</li>
    <li><strong>PSI Result</strong> — Quick view of inspection outcome per shipment</li>
    <li><strong>B/L Number</strong> — For tracking with carrier or forwarder</li>
  </ul>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 18: MASTER DATA
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s18">
  <div class="section-header">
    <div class="section-number">18</div>
    <div>
      <div class="section-title">Master Data</div>
      <div class="section-desc">Customers, Vendors, Brands, and reference data</div>
    </div>
  </div>

  <div class="two-col">
    <div>
      ${img('18_customers', 'Customers')}
      <p class="screenshot-caption">Figure 17.1 — Customer Master</p>
    </div>
    <div>
      ${img('19_vendors', 'Vendors')}
      <p class="screenshot-caption">Figure 17.2 — Vendor Master</p>
    </div>
  </div>

  <h3>17.1 Setting Up Customers (Buyers)</h3>
  <p>Go to <strong>Masters → Customers</strong>. For each international buyer, record:</p>
  <ul>
    <li>Company name, type (Brand / Retailer / Agent)</li>
    <li>Contact person, email, phone</li>
    <li>Country and currency (USD, EUR, GBP, etc.)</li>
    <li>Credit days and credit limit</li>
  </ul>

  <h3>17.2 Setting Up Vendors (Factories / Suppliers)</h3>
  <p>Go to <strong>Masters → Vendors</strong>. For each factory or supplier, record:</p>
  <ul>
    <li>Company name and type (Manufacturer / Fabric / Trim / Testing Lab / Logistics)</li>
    <li>Contact person, email, phone</li>
    <li>City, country, currency (INR for Indian factories)</li>
    <li>GST/PAN numbers for Indian vendors</li>
  </ul>

  <h3>17.3 Other Masters</h3>
  <table class="ref">
    <tr><th>Master</th><th>Where</th><th>Purpose</th></tr>
    <tr><td>Brands</td><td>Masters → Brands</td><td>Customer brands (e.g., Zara, H&amp;M, M&amp;S) — used in PD and CO</td></tr>
    <tr><td>Categories</td><td>Masters → Categories</td><td>Product categories (e.g., Woven Tops, Bottoms, Knitwear)</td></tr>
    <tr><td>UOM</td><td>Masters → UOM</td><td>Units of measure (pcs, meters, kg)</td></tr>
    <tr><td>Locations</td><td>Masters → Locations</td><td>Warehouse / storage locations</td></tr>
    <tr><td>Testing Params</td><td>Masters → Testing Params</td><td>Lab test parameters with acceptance criteria</td></tr>
  </table>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     SECTION 19: SETTINGS
═══════════════════════════════════════════════════════════════ -->
<div class="page" id="s19">
  <div class="section-header">
    <div class="section-number">19</div>
    <div>
      <div class="section-title">Settings &amp; Email Templates</div>
      <div class="section-desc">System configuration and communication templates</div>
    </div>
  </div>

  ${img('21_settings', 'Settings')}
  <p class="screenshot-caption">Figure 18.1 — Settings page</p>

  <h3>18.1 Company Settings</h3>
  <p>Go to <strong>Settings → Company Master</strong> to update your company details — name, address, GSTIN, logo URL, and contact info. These appear on printed documents.</p>

  <h3>18.2 Email Templates</h3>
  ${img('22_email_templates', 'Email Templates')}
  <p class="screenshot-caption">Figure 18.2 — Email Templates: pre-built templates for maintenance alerts, reports, and business documents</p>

  <p>Pre-built email templates are available for:</p>
  <ul>
    <li><strong>Maintenance Alerts</strong> — Machine maintenance reminders with confirm/escalate links</li>
    <li><strong>Report Templates</strong> — Formatted summaries for management</li>
    <li><strong>Business Document Templates</strong> — PO confirmations, invoice cover emails</li>
  </ul>

  <h3>18.3 Format Panel</h3>
  <p>Go to <strong>Settings → Format Panel</strong> to configure document number formats, date formats, and default currencies.</p>

  <div class="info-box">
    <div class="icon">🔒</div>
    <p>Settings changes take effect immediately. Only Admin users can access Settings. Contact your system administrator if you need to change company-level configuration.</p>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════
     QUICK REFERENCE — END
═══════════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="section-header">
    <div class="section-number" style="background:linear-gradient(135deg,#10b981,#06b6d4)">✓</div>
    <div>
      <div class="section-title">Quick Reference — End-to-End Workflow</div>
      <div class="section-desc">Complete buying house process in one page</div>
    </div>
  </div>

  <div class="workflow-flow" style="flex-wrap:wrap;gap:12px">
    <div class="flow-box" style="border-color:#8b5cf6;background:#8b5cf610"><div class="flow-num">Step 1</div><div class="flow-label" style="color:#8b5cf6">PD Request</div><div class="flow-sub">Customer inquiry → sample approval</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box" style="border-color:#3b82f6;background:#3b82f610"><div class="flow-num">Step 2</div><div class="flow-label" style="color:#3b82f6">Customer Order</div><div class="flow-sub">Buyer confirms PO</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box" style="border-color:#f59e0b;background:#f59e0b10"><div class="flow-num">Step 3</div><div class="flow-label" style="color:#f59e0b">Factory Order</div><div class="flow-sub">Place order with factory</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box" style="border-color:#06b6d4;background:#06b6d410"><div class="flow-num">Step 4</div><div class="flow-label" style="color:#06b6d4">T&amp;A Track</div><div class="flow-sub">Monitor milestones</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box" style="border-color:#f97316;background:#f9731610"><div class="flow-num">Step 5</div><div class="flow-label" style="color:#f97316">PSI</div><div class="flow-sub">Inspect before shipment</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box" style="border-color:#10b981;background:#10b98110"><div class="flow-num">Step 6</div><div class="flow-label" style="color:#10b981">Shipment</div><div class="flow-sub">Book &amp; track cargo</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box" style="border-color:#a855f7;background:#a855f710"><div class="flow-num">Step 7</div><div class="flow-label" style="color:#a855f7">Invoice</div><div class="flow-sub">Bill the buyer</div></div>
    <div class="flow-arrow">→</div>
    <div class="flow-box" style="border-color:#ec4899;background:#ec489910"><div class="flow-num">Step 8</div><div class="flow-label" style="color:#ec4899">Payment</div><div class="flow-sub">Collect &amp; pay</div></div>
  </div>

  <table class="ref" style="margin-top:32px">
    <tr><th>Document</th><th>Auto-Numbered As</th><th>Module</th></tr>
    <tr><td>PD Request</td><td>PD-YYYY-NNNN</td><td>Product Development</td></tr>
    <tr><td>Customer Order</td><td>CO-YYYY-NNNN</td><td>Orders → Customer Orders</td></tr>
    <tr><td>Factory Order</td><td>FO-YYYY-NNNN</td><td>Orders → (inside CO detail)</td></tr>
    <tr><td>Pre-Shipment Inspection</td><td>PSI-YYYY-NNNN</td><td>Shipment → PSI</td></tr>
    <tr><td>Shipment</td><td>SHP-YYYY-NNNN</td><td>Shipment → Shipments</td></tr>
    <tr><td>Sales Invoice</td><td>SI-YYYY-NNNN</td><td>Finance → Sales Invoices</td></tr>
    <tr><td>Purchase Invoice</td><td>PI-YYYY-NNNN</td><td>Finance → Purchase Invoices</td></tr>
    <tr><td>Payment</td><td>PAY-YYYY-NNNN</td><td>Finance → Payments</td></tr>
  </table>

  <div style="margin-top:48px;text-align:center;color:#94a3b8;font-size:12px;border-top:1px solid #f1f5f9;padding-top:24px;">
    <p><strong>BHF India ERP — Standard Operating Procedure v1.0</strong></p>
    <p>Prepared May 2026 · For internal use only · Contact admin for support</p>
  </div>
</div>

</body>
</html>`;

fs.writeFileSync(OUT, html, 'utf8');
const size = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
console.log(`SOP generated: ${OUT}`);
console.log(`File size: ${size} MB`);
