/**
 * take_screenshots.js — BHF India ERP
 * Captures screenshots of every major page for the SOP document.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8000';
const OUT  = path.join(__dirname, 'sop_screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Wait until React has rendered something meaningful (not blank white)
async function waitForReact(page, timeout = 20000) {
    await page.waitForFunction(
        () => document.querySelector('#root') &&
              document.querySelector('#root').childElementCount > 0,
        { timeout }
    );
    // Extra buffer for data to load
    await page.waitForTimeout(2500);
}

async function shot(page, name) {
    await page.waitForTimeout(500);
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  [OK] ${name}.png`);
}

async function goto(page, url) {
    await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
    await waitForReact(page);
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        // Block Google Fonts to speed up load
        extraHTTPHeaders: {},
    });

    // Block external font CDN to prevent slow loads
    await ctx.route('https://fonts.googleapis.com/**', r => r.abort());
    await ctx.route('https://fonts.gstatic.com/**', r => r.abort());

    const page = await ctx.newPage();

    // ── 1. LOGIN PAGE ──────────────────────────────────────────────────────
    console.log('\n[1] Login page...');
    await goto(page, '/login');
    await shot(page, '01_login');

    // Fill and submit login
    await page.locator('input').first().fill('admin');
    await page.locator('input[type="password"]').fill('admin123');
    await shot(page, '01b_login_filled');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(`${BASE}/dashboard`, { timeout: 15000 }).catch(() => {});
    await waitForReact(page);

    // ── 2. DASHBOARD ──────────────────────────────────────────────────────
    console.log('[2] Dashboard...');
    await shot(page, '02_dashboard');

    // ── 3. BUYER INQUIRIES ────────────────────────────────────────────────
    console.log('[3] Buyer Inquiries...');
    await goto(page, '/orders/inquiries');
    await shot(page, '03_inquiry_list');

    const firstInqRow = page.locator('table tbody tr').first();
    if (await firstInqRow.isVisible().catch(() => false)) {
        await firstInqRow.click();
        await waitForReact(page);
        await shot(page, '03b_inquiry_overview');

        const csTab = page.locator('button').filter({ hasText: /Cost Sheet/ }).first();
        if (await csTab.isVisible().catch(() => false)) {
            await csTab.click(); await page.waitForTimeout(1000);
            await shot(page, '03c_inquiry_cost_sheet');
        }
        const vqTab = page.locator('button').filter({ hasText: /Vendor Quotes/ }).first();
        if (await vqTab.isVisible().catch(() => false)) {
            await vqTab.click(); await page.waitForTimeout(1000);
            await shot(page, '03d_inquiry_vendor_quotes');
        }
        await page.goBack(); await waitForReact(page);
    }

    // ── 4. PD REQUESTS ────────────────────────────────────────────────────
    console.log('[4] PD Pipeline...');
    await goto(page, '/product-development');
    await shot(page, '04_pd_list');

    // Open first PD detail
    const firstPDRow = page.locator('table tbody tr').first();
    if (await firstPDRow.isVisible().catch(() => false)) {
        await firstPDRow.click();
        await waitForReact(page);
        await shot(page, '04b_pd_detail');
        await page.goBack();
        await waitForReact(page);
    }

    // ── 5. CUSTOMER ORDERS ────────────────────────────────────────────────
    console.log('[4] Customer Orders...');
    await goto(page, '/orders/co');
    await shot(page, '04_co_list');

    // Open first CO detail
    const firstCORow = page.locator('table tbody tr').first();
    if (await firstCORow.isVisible().catch(() => false)) {
        await firstCORow.click();
        await waitForReact(page);
        await shot(page, '05_co_detail_overview');

        // Items tab
        const itemsTab = page.locator('button, [role="tab"]').filter({ hasText: 'Items' }).first();
        if (await itemsTab.isVisible().catch(() => false)) {
            await itemsTab.click();
            await page.waitForTimeout(1000);
            await shot(page, '05b_co_items_tab');
        }

        // Factory Orders tab
        const foTab = page.locator('button, [role="tab"]').filter({ hasText: 'Factory' }).first();
        if (await foTab.isVisible().catch(() => false)) {
            await foTab.click();
            await page.waitForTimeout(1000);
            await shot(page, '06_co_factory_orders_tab');
        }

        // T&A tab
        const taTab = page.locator('button, [role="tab"]').filter({ hasText: 'T&A' }).first();
        if (await taTab.isVisible().catch(() => false)) {
            await taTab.click();
            await page.waitForTimeout(1000);
            await shot(page, '07_ta_milestones');
        }

        // Costing tab
        const costTab = page.locator('button, [role="tab"]').filter({ hasText: 'Costing' }).first();
        if (await costTab.isVisible().catch(() => false)) {
            await costTab.click();
            await page.waitForTimeout(1000);
            await shot(page, '08_costing_sheet');
        }

        await page.goBack();
        await waitForReact(page);
    }

    // ── 5. PSI ────────────────────────────────────────────────────────────
    console.log('[5] PSI...');
    await goto(page, '/shipment/psi');
    await shot(page, '09_psi_list');

    // Open PSI detail modal
    const viewBtn = page.locator('button').filter({ hasText: /View|Detail|Checklist/ }).first();
    if (await viewBtn.isVisible().catch(() => false)) {
        await viewBtn.click();
        await page.waitForTimeout(1500);
        await shot(page, '09b_psi_detail');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
    }

    // ── 6. SHIPMENTS ──────────────────────────────────────────────────────
    console.log('[6] Shipments...');
    await goto(page, '/shipment/shipments');
    await shot(page, '10_shipments');

    // ── 7. FINANCE ────────────────────────────────────────────────────────
    console.log('[7] Sales Invoices...');
    await goto(page, '/finance/sales-invoices');
    await shot(page, '11_sales_invoices');

    console.log('[8] Purchase Invoices...');
    await goto(page, '/finance/purchase-invoices');
    await shot(page, '12_purchase_invoices');

    console.log('[9] Payments...');
    await goto(page, '/finance/payments');
    await shot(page, '13_payments');

    // ── 8. REPORTS ────────────────────────────────────────────────────────
    console.log('[10] Order Summary Report...');
    await goto(page, '/reports/orders');
    await shot(page, '14_report_orders');

    console.log('[11] PD Pipeline Report...');
    await goto(page, '/reports/pd');
    await shot(page, '15_report_pd');

    console.log('[12] Vendor Performance...');
    await goto(page, '/reports/vendors');
    await shot(page, '16_report_vendors');

    console.log('[13] Shipment Tracker...');
    await goto(page, '/reports/shipments');
    await shot(page, '17_report_shipments');

    // ── 9. MASTERS ────────────────────────────────────────────────────────
    console.log('[14] Customers...');
    await goto(page, '/masters/customers');
    await shot(page, '18_customers');

    console.log('[15] Vendors...');
    await goto(page, '/masters/vendors');
    await shot(page, '19_vendors');

    console.log('[16] Brands...');
    await goto(page, '/masters/brands');
    await shot(page, '20_brands');

    // ── 10. SETTINGS ──────────────────────────────────────────────────────
    console.log('[17] Settings...');
    await goto(page, '/settings');
    await shot(page, '21_settings');

    console.log('[18] Email Templates...');
    await goto(page, '/settings/email-templates');
    await shot(page, '22_email_templates');

    // ── 11. FULL SIDEBAR ──────────────────────────────────────────────────
    console.log('[19] Sidebar navigation...');
    await goto(page, '/dashboard');
    await shot(page, '00_sidebar_dashboard');

    await browser.close();

    const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
    console.log(`\nDone! ${files.length} screenshots saved to:\n  ${OUT}`);
})();
