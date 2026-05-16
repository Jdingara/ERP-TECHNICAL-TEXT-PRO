// PAGE: Customer Orders — Buying House ERP
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const STATUS_META = {
    draft:         { label: 'Draft',          color: '#64748b' },
    confirmed:     { label: 'Confirmed',      color: '#3b82f6' },
    in_production: { label: 'In Production',  color: '#f59e0b' },
    inspected:     { label: 'Inspected',      color: '#8b5cf6' },
    shipped:       { label: 'Shipped',        color: '#06b6d4' },
    delivered:     { label: 'Delivered',      color: '#10b981' },
    cancelled:     { label: 'Cancelled',      color: '#94a3b8' },
};
const STATUSES = Object.entries(STATUS_META).map(([v, { label }]) => ({ value: v, label }));

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'INR', 'OTHER'];

const emptyForm = {
    customer_id: '', brand_id: '', category_id: '', pd_request_id: '',
    customer_po_ref: '',
    order_date: new Date().toISOString().split('T')[0],
    ship_by_date: '', ex_factory_date: '',
    status: 'confirmed', currency: 'USD', notes: '',
    items: [],
};

const emptyItem = { style_ref: '', description: '', color: '', size: '', quantity: '', unit_price: '' };

export default function CustomerOrdersPage() {
    const pt = usePageTheme();
    const nav = useNavigate();
    const thS  = { ...pt.th, textAlign: 'left' };
    const tdS  = { ...pt.cell, verticalAlign: 'middle' };
    const inpS = { ...pt.inp };

    const [rows, setRows]         = useState([]);
    const [search, setSearch]     = useState('');
    const [statusFilter, setStatus] = useState('');
    const [modal, setModal]       = useState(false);
    const [form, setForm]         = useState(emptyForm);
    const [customers, setCustomers] = useState([]);
    const [brands, setBrands]     = useState([]);
    const [categories, setCategories] = useState([]);
    const [pdRequests, setPDRequests] = useState([]);
    const [saving, setSaving]     = useState(false);
    const [msg, setMsg]           = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (statusFilter) p.set('status', statusFilter);
        const res = await fetch(`/api/orders/co/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.customer_orders || []);
    }, [search, statusFilter]);

    const loadDropdowns = useCallback(async () => {
        const [c, b, cat, pd] = await Promise.all([
            fetch('/api/masters/customers/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/brands/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/categories/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/pd/requests/', { credentials: 'include' }).then(r => r.json()),
        ]);
        setCustomers(c.customers || []);
        setBrands(b.brands || []);
        setCategories(cat.categories || []);
        setPDRequests(pd.pd_requests || []);
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

    const addItem = () => setForm(p => ({ ...p, items: [...p.items, { ...emptyItem }] }));
    const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
    const updateItem = (idx, f, v) => setForm(p => {
        const items = [...p.items]; items[idx] = { ...items[idx], [f]: v }; return { ...p, items };
    });

    const save = async () => {
        if (!form.items.length) { setMsg('Add at least one item.'); return; }
        setSaving(true); setMsg('');
        const payload = {
            ...form,
            customer_id: form.customer_id || null,
            brand_id: form.brand_id || null,
            category_id: form.category_id || null,
            pd_request_id: form.pd_request_id || null,
            ship_by_date: form.ship_by_date || null,
            ex_factory_date: form.ex_factory_date || null,
            items: form.items.map(i => ({ ...i, unit_price: i.unit_price || null })),
        };
        const res = await fetch('/api/orders/co/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        setSaving(false);
        if (res.ok) {
            const d = await res.json();
            setModal(false);
            nav(`/orders/co/${d.customer_order.id}`);
        } else {
            const d = await res.json(); setMsg(d.error || 'Error');
        }
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    const counts = STATUSES.reduce((acc, s) => { acc[s.value] = rows.filter(r => r.status === s.value).length; return acc; }, {});

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Customer Orders</h2>
                    <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>Orders received from brands and retailers</p>
                </div>
                <button onClick={() => { setForm(emptyForm); setMsg(''); setModal(true); }} style={btn('#10b981')}>+ New Customer Order</button>
            </div>

            {/* Status pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <button onClick={() => setStatus('')} style={filterPill(statusFilter === '', '#64748b')}>All ({rows.length})</button>
                {STATUSES.filter(s => counts[s.value] > 0).map(s => (
                    <button key={s.value} onClick={() => setStatus(s.value)} style={filterPill(statusFilter === s.value, STATUS_META[s.value].color)}>
                        {s.label} ({counts[s.value]})
                    </button>
                ))}
            </div>

            <div style={{ marginBottom: 16 }}>
                <input placeholder="Search CO number / customer / PO ref…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inpS, width: 320, outline: 'none' }} />
            </div>

            <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr>
                        {['CO No.', 'Customer PO Ref', 'Customer', 'Brand', 'Order Date', 'Ship By', 'Ex-Factory', 'Qty', 'Value', 'Status', ''].map(h =>
                            <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {rows.map(r => {
                            const sm = STATUS_META[r.status] || STATUS_META.draft;
                            return (
                                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/orders/co/${r.id}`)}>
                                    <td style={{ ...tdS, fontWeight: 700, color: '#10b981' }}>{r.co_number}</td>
                                    <td style={{ ...tdS, color: pt.colors.dimText }}>{r.customer_po_ref || '—'}</td>
                                    <td style={tdS}>{r.customer_name || '—'}</td>
                                    <td style={tdS}>{r.brand_name || '—'}</td>
                                    <td style={tdS}>{r.order_date}</td>
                                    <td style={{ ...tdS, color: r.ship_by_date ? pt.colors.text : pt.colors.muted }}>{r.ship_by_date || '—'}</td>
                                    <td style={{ ...tdS, color: r.ex_factory_date ? pt.colors.text : pt.colors.muted }}>{r.ex_factory_date || '—'}</td>
                                    <td style={tdS}>{r.total_qty}</td>
                                    <td style={tdS}>{r.currency} {Number(r.total_value).toLocaleString()}</td>
                                    <td style={tdS}><span style={tag(sm.color)}>{sm.label}</span></td>
                                    <td style={tdS} onClick={e => e.stopPropagation()}>
                                        <button onClick={() => nav(`/orders/co/${r.id}`)} style={smallBtn('#10b981')}>Open</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr><td colSpan={11} style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                                No customer orders yet. Click "+ New Customer Order" to start.
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* New CO Modal */}
            {modal && (
                <div style={overlay}>
                    <div style={{ ...modalBox(pt), maxWidth: 760 }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>New Customer Order</h3>
                        <div style={grid2}>
                            <F label="Customer">
                                <select style={inpS} {...inp('customer_id')}>
                                    <option value="">— Select Customer —</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                                </select>
                            </F>
                            <F label="Customer PO Ref"><input style={inpS} placeholder="Customer's own PO number" {...inp('customer_po_ref')} /></F>
                            <F label="Brand">
                                <select style={inpS} {...inp('brand_id')}>
                                    <option value="">— Select Brand —</option>
                                    {brands.map(b => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
                                </select>
                            </F>
                            <F label="Category">
                                <select style={inpS} {...inp('category_id')}>
                                    <option value="">— Select Category —</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                                </select>
                            </F>
                            <F label="Linked PD Request">
                                <select style={inpS} {...inp('pd_request_id')}>
                                    <option value="">— None —</option>
                                    {pdRequests.map(p => <option key={p.id} value={p.id}>{p.pd_number} — {p.title}</option>)}
                                </select>
                            </F>
                            <F label="Currency">
                                <select style={inpS} {...inp('currency')}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </F>
                            <F label="Order Date *"><input type="date" style={inpS} {...inp('order_date')} /></F>
                            <F label="Status">
                                <select style={inpS} {...inp('status')}>
                                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </F>
                            <F label="Ship By Date"><input type="date" style={inpS} {...inp('ship_by_date')} /></F>
                            <F label="Ex-Factory Date"><input type="date" style={inpS} {...inp('ex_factory_date')} /></F>
                        </div>

                        {/* Order Items */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <strong style={{ fontSize: 14 }}>Order Items</strong>
                                <button onClick={addItem} style={smallBtn('#3b82f6')}>+ Add Item</button>
                            </div>
                            {form.items.length === 0 && <div style={{ color: pt.colors.muted, fontSize: 13 }}>No items yet. Click "+ Add Item".</div>}
                            {form.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                                    <F label={idx === 0 ? 'Style Ref' : ''}><input style={inpS} placeholder="Style#" value={item.style_ref} onChange={e => updateItem(idx, 'style_ref', e.target.value)} /></F>
                                    <F label={idx === 0 ? 'Description *' : ''}><input style={inpS} placeholder="Item description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} /></F>
                                    <F label={idx === 0 ? 'Color' : ''}><input style={inpS} placeholder="Color" value={item.color} onChange={e => updateItem(idx, 'color', e.target.value)} /></F>
                                    <F label={idx === 0 ? 'Size' : ''}><input style={inpS} placeholder="Size" value={item.size} onChange={e => updateItem(idx, 'size', e.target.value)} /></F>
                                    <F label={idx === 0 ? 'Qty *' : ''}><input type="number" style={inpS} placeholder="0" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} /></F>
                                    <F label={idx === 0 ? 'Unit Price' : ''}><input type="number" style={inpS} placeholder="0.00" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} /></F>
                                    <button onClick={() => removeItem(idx)} style={{ ...smallBtn('#ef4444'), marginBottom: 2 }}>✕</button>
                                </div>
                            ))}
                        </div>

                        <F label="Notes"><textarea style={{ ...inpS, height: 60, resize: 'vertical', width: '100%' }} {...inp('notes')} /></F>
                        {msg && <div style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#10b981')}>{saving ? 'Creating…' : 'Create & Open'}</button>
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
const smallBtn   = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const tag        = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const filterPill = (active, color) => ({ padding: '4px 12px', borderRadius: 20, border: `1px solid ${color}`, background: active ? color : 'transparent', color: active ? '#fff' : color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });
const overlay    = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox   = (pt) => ({ background: pt.colors.card, borderRadius: 16, padding: 28, width: '90%', maxHeight: '90vh', overflowY: 'auto' });
const grid2      = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
