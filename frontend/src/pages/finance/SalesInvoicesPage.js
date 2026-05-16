// PAGE: Sales Invoices — Buying House ERP
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const STATUS_META = {
    draft:          { label: 'Draft',            color: '#64748b' },
    sent:           { label: 'Sent',             color: '#3b82f6' },
    partially_paid: { label: 'Partially Paid',   color: '#f59e0b' },
    paid:           { label: 'Paid',             color: '#10b981' },
    overdue:        { label: 'Overdue',          color: '#ef4444' },
    cancelled:      { label: 'Cancelled',        color: '#94a3b8' },
};
const STATUSES   = Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label }));
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'INR', 'OTHER'];

const emptyForm = {
    customer_order_id: '', shipment_id: '', customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '', currency: 'USD', tax_amount: '0',
    status: 'draft', bank_details: '', notes: '',
    items: [],
};
const emptyItem = { description: '', quantity: '1', unit_price: '' };

export default function SalesInvoicesPage() {
    const pt   = usePageTheme();
    const thS  = { ...pt.th, textAlign: 'left' };
    const tdS  = { ...pt.cell, verticalAlign: 'middle' };
    const inpS = { ...pt.inp };

    const [rows, setRows]         = useState([]);
    const [filter, setFilter]     = useState('');
    const [modal, setModal]       = useState(false);
    const [form, setForm]         = useState(emptyForm);
    const [orders, setOrders]     = useState([]);
    const [shipments, setShipments] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [saving, setSaving]     = useState(false);
    const [msg, setMsg]           = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (filter) p.set('status', filter);
        const res = await fetch(`/api/finance/si/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.sales_invoices || []);
    }, [filter]);

    const loadDropdowns = useCallback(async () => {
        const [co, sh, cu] = await Promise.all([
            fetch('/api/orders/co/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/shipment/shipments/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/customers/', { credentials: 'include' }).then(r => r.json()),
        ]);
        setOrders(co.customer_orders || []);
        setShipments(sh.shipments || []);
        setCustomers(cu.customers || []);
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });
    const addItem    = () => setForm(p => ({ ...p, items: [...p.items, { ...emptyItem }] }));
    const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
    const updateItem = (idx, f, v) => setForm(p => { const items = [...p.items]; items[idx] = { ...items[idx], [f]: v }; return { ...p, items }; });

    const liveSubtotal = form.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
    const liveTotal    = liveSubtotal + (parseFloat(form.tax_amount) || 0);

    const save = async () => {
        if (!form.invoice_date) { setMsg('Invoice date is required.'); return; }
        setSaving(true); setMsg('');
        const payload = {
            ...form,
            customer_order_id: form.customer_order_id || null,
            shipment_id: form.shipment_id || null,
            customer_id: form.customer_id || null,
            due_date: form.due_date || null,
            subtotal: liveSubtotal,
            tax_amount: parseFloat(form.tax_amount) || 0,
            items: form.items.map(i => ({ ...i, quantity: parseFloat(i.quantity) || 1, unit_price: parseFloat(i.unit_price) || 0 })),
        };
        const res = await fetch('/api/finance/si/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const updateStatus = async (id, status) => {
        await fetch(`/api/finance/si/${id}/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
        });
        load();
    };

    const counts = Object.keys(STATUS_META).reduce((a, k) => { a[k] = rows.filter(r => r.status === k).length; return a; }, {});
    const totalReceivable = rows.filter(r => r.balance_due > 0 && r.status !== 'cancelled').reduce((s, r) => s + r.balance_due, 0);

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Sales Invoices</h2>
                    <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>Invoices issued to customers / brands</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {totalReceivable > 0 && (
                        <div style={{ background: '#ef444415', border: '1px solid #ef4444', borderRadius: 8, padding: '6px 14px', fontSize: 13 }}>
                            <span style={{ color: pt.colors.dimText }}>Outstanding: </span>
                            <span style={{ fontWeight: 700, color: '#ef4444' }}>${totalReceivable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <button onClick={() => { setForm(emptyForm); setMsg(''); setModal(true); }} style={btn('#3b82f6')}>+ New Invoice</button>
                </div>
            </div>

            {/* Status pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <button onClick={() => setFilter('')} style={filterPill(filter === '', '#64748b')}>All ({rows.length})</button>
                {Object.entries(STATUS_META).filter(([k]) => counts[k] > 0).map(([k, m]) => (
                    <button key={k} onClick={() => setFilter(k)} style={filterPill(filter === k, m.color)}>
                        {m.label} ({counts[k]})
                    </button>
                ))}
            </div>

            <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr>
                        {['Invoice No.', 'Customer', 'CO Ref', 'Invoice Date', 'Due Date', 'Total', 'Paid', 'Balance Due', 'Status', ''].map(h =>
                            <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {rows.map(r => {
                            const sm = STATUS_META[r.status] || STATUS_META.draft;
                            const isOverdue = r.due_date && r.due_date < new Date().toISOString().split('T')[0] && r.balance_due > 0 && r.status !== 'cancelled';
                            return (
                                <tr key={r.id} style={{ background: isOverdue ? '#ef444408' : 'transparent' }}>
                                    <td style={{ ...tdS, fontWeight: 700, color: '#3b82f6' }}>{r.invoice_number}</td>
                                    <td style={tdS}>{r.customer_name || '—'}</td>
                                    <td style={{ ...tdS, color: '#10b981', fontWeight: 600 }}>{r.co_number || '—'}</td>
                                    <td style={tdS}>{r.invoice_date}</td>
                                    <td style={{ ...tdS, color: isOverdue ? '#ef4444' : pt.colors.text }}>{r.due_date || '—'}</td>
                                    <td style={{ ...tdS, fontWeight: 600 }}>{r.currency} {Number(r.total_amount).toLocaleString()}</td>
                                    <td style={{ ...tdS, color: '#10b981' }}>{r.currency} {Number(r.amount_paid).toLocaleString()}</td>
                                    <td style={{ ...tdS, fontWeight: 700, color: r.balance_due > 0 ? '#ef4444' : '#10b981' }}>
                                        {r.currency} {Number(r.balance_due).toLocaleString()}
                                    </td>
                                    <td style={tdS}><span style={tag(sm.color)}>{sm.label}</span></td>
                                    <td style={tdS}>
                                        <select value={r.status}
                                            onChange={e => updateStatus(r.id, e.target.value)}
                                            style={{ fontSize: 11, padding: '2px 4px', borderRadius: 4, border: `1px solid ${sm.color}`, background: 'transparent', color: sm.color, cursor: 'pointer' }}>
                                            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr><td colSpan={10} style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
                                No sales invoices yet.
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div style={overlay}>
                    <div style={{ ...modalBox(pt), maxWidth: 760 }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>New Sales Invoice</h3>
                        <div style={grid2}>
                            <F label="Customer">
                                <select style={inpS} {...inp('customer_id')}>
                                    <option value="">— Select Customer —</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                                </select>
                            </F>
                            <F label="Customer Order">
                                <select style={inpS} {...inp('customer_order_id')}>
                                    <option value="">— Select CO —</option>
                                    {orders.map(o => <option key={o.id} value={o.id}>{o.co_number} — {o.customer_name}</option>)}
                                </select>
                            </F>
                            <F label="Shipment">
                                <select style={inpS} {...inp('shipment_id')}>
                                    <option value="">— Select Shipment —</option>
                                    {shipments.map(s => <option key={s.id} value={s.id}>{s.shipment_number}</option>)}
                                </select>
                            </F>
                            <F label="Currency">
                                <select style={inpS} {...inp('currency')}>
                                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </F>
                            <F label="Invoice Date *"><input type="date" style={inpS} {...inp('invoice_date')} /></F>
                            <F label="Due Date"><input type="date" style={inpS} {...inp('due_date')} /></F>
                            <F label="Status">
                                <select style={inpS} {...inp('status')}>
                                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </F>
                            <F label="Tax Amount"><input type="number" style={inpS} placeholder="0.00" {...inp('tax_amount')} /></F>
                        </div>

                        {/* Line items */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <strong style={{ fontSize: 14 }}>Line Items</strong>
                                <button onClick={addItem} style={smallBtn('#3b82f6')}>+ Add Item</button>
                            </div>
                            {form.items.length === 0 && <div style={{ color: pt.colors.muted, fontSize: 13 }}>No items yet.</div>}
                            {form.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                                    <F label={idx === 0 ? 'Description *' : ''}><input style={inpS} placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} /></F>
                                    <F label={idx === 0 ? 'Qty' : ''}><input type="number" style={inpS} value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} /></F>
                                    <F label={idx === 0 ? 'Unit Price' : ''}><input type="number" style={inpS} placeholder="0.00" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} /></F>
                                    <button onClick={() => removeItem(idx)} style={{ ...smallBtn('#ef4444'), marginBottom: 2 }}>✕</button>
                                </div>
                            ))}
                            {form.items.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, fontSize: 13, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${pt.colors.border || '#e2e8f0'}` }}>
                                    <span>Subtotal: <strong>{form.currency} {liveSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                                    <span>Tax: <strong>{form.currency} {(parseFloat(form.tax_amount) || 0).toFixed(2)}</strong></span>
                                    <span style={{ fontWeight: 700 }}>Total: {form.currency} {liveTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                        </div>

                        <F label="Bank Details"><textarea style={{ ...inpS, height: 50, resize: 'vertical', width: '100%' }} {...inp('bank_details')} /></F>
                        <F label="Notes"><textarea style={{ ...inpS, height: 50, resize: 'vertical', width: '100%', marginTop: 8 }} {...inp('notes')} /></F>
                        {msg && <div style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#3b82f6')}>{saving ? 'Creating…' : 'Create Invoice'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function F({ label, children }) {
    const { settings } = useSettings();
    const muted = settings.themeMode === 'dark' ? '#94a3b8' : '#475569';
    return <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 4 }}>{label}</label>{children}</div>;
}
const btn        = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn   = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 });
const tag        = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const filterPill = (active, color) => ({ padding: '4px 12px', borderRadius: 20, border: `1px solid ${color}`, background: active ? color : 'transparent', color: active ? '#fff' : color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });
const overlay    = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox   = (pt) => ({ background: pt.colors.card, borderRadius: 16, padding: 28, width: '90%', maxHeight: '90vh', overflowY: 'auto' });
const grid2      = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
