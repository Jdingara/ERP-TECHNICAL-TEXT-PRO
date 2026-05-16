// PAGE: Buyer Inquiries — Buying House ERP
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const STATUS_META = {
    open:         { label: 'Open',              color: '#3b82f6' },
    costing_done: { label: 'Costing Done',      color: '#f59e0b' },
    rfq_sent:     { label: 'RFQ Sent',          color: '#8b5cf6' },
    quoted:       { label: 'Quoted to Buyer',   color: '#06b6d4' },
    confirmed:    { label: 'Converted to CO',   color: '#10b981' },
    dropped:      { label: 'Dropped',           color: '#94a3b8' },
};
const STATUSES   = Object.entries(STATUS_META).map(([v, { label }]) => ({ value: v, label }));
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'INR'];

const emptyForm = {
    customer_id: '', brand_id: '', category_id: '',
    inquiry_date: new Date().toISOString().split('T')[0],
    required_delivery: '', destination: '',
    target_fob_price: '', currency: 'USD',
    description: '', notes: '',
    items: [],
};
const emptyItem = { style_ref: '', description: '', color: '', size_range: '', quantity: '', target_price: '' };

export default function InquiryListPage() {
    const pt  = usePageTheme();
    const nav = useNavigate();
    const thS = { ...pt.th, textAlign: 'left' };
    const tdS = { ...pt.cell, verticalAlign: 'middle' };
    const inpS = { ...pt.inp };

    const [rows, setRows]           = useState([]);
    const [search, setSearch]       = useState('');
    const [statusFilter, setStatus] = useState('');
    const [modal, setModal]         = useState(false);
    const [form, setForm]           = useState(emptyForm);
    const [customers, setCustomers] = useState([]);
    const [brands, setBrands]       = useState([]);
    const [categories, setCats]     = useState([]);
    const [saving, setSaving]       = useState(false);
    const [msg, setMsg]             = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (statusFilter) p.set('status', statusFilter);
        const res = await fetch(`/api/orders/inquiries/?${p}`, { credentials: 'include' });
        const d   = await res.json();
        setRows(d.inquiries || []);
    }, [search, statusFilter]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        Promise.all([
            fetch('/api/masters/customers/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/brands/',    { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/categories/',{ credentials: 'include' }).then(r => r.json()),
        ]).then(([c, b, cat]) => {
            setCustomers(c.customers || []);
            setBrands(b.brands || []);
            setCats(cat.categories || []);
        });
    }, []);

    const addItem    = () => setForm(p => ({ ...p, items: [...p.items, { ...emptyItem }] }));
    const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
    const updateItem = (idx, f, v) => setForm(p => {
        const items = [...p.items]; items[idx] = { ...items[idx], [f]: v }; return { ...p, items };
    });

    const save = async () => {
        setSaving(true); setMsg('');
        const payload = {
            ...form,
            customer_id: form.customer_id || null,
            brand_id: form.brand_id || null,
            category_id: form.category_id || null,
            required_delivery: form.required_delivery || null,
            target_fob_price: form.target_fob_price || null,
            items: form.items.map(i => ({ ...i, quantity: i.quantity || 0, target_price: i.target_price || null })),
        };
        const res = await fetch('/api/orders/inquiries/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        setSaving(false);
        if (res.ok) {
            const d = await res.json();
            setModal(false);
            nav(`/orders/inquiries/${d.inquiry.id}`);
        } else {
            const d = await res.json(); setMsg(d.error || 'Error saving inquiry.');
        }
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });
    const counts = STATUSES.reduce((acc, s) => { acc[s.value] = rows.filter(r => r.status === s.value).length; return acc; }, {});

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Buyer Inquiries</h2>
                    <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>
                        Capture customer requirements → cost → vendor quotes → convert to order
                    </p>
                </div>
                <button onClick={() => { setForm(emptyForm); setMsg(''); setModal(true); }} style={btn('#3b82f6')}>
                    + New Inquiry
                </button>
            </div>

            {/* Flow indicator */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                {['Open', 'Costing Done', 'RFQ Sent', 'Quoted to Buyer', 'Converted to CO'].map((s, i, arr) => (
                    <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: 11, fontWeight: 600 }}>{s}</span>
                        {i < arr.length - 1 && <span style={{ color: '#475569', fontSize: 12 }}>→</span>}
                    </span>
                ))}
            </div>

            {/* Status pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <button onClick={() => setStatus('')} style={filterPill(statusFilter === '', '#64748b')}>All ({rows.length})</button>
                {STATUSES.filter(s => counts[s.value] > 0).map(s => (
                    <button key={s.value} onClick={() => setStatus(s.value)} style={filterPill(statusFilter === s.value, STATUS_META[s.value].color)}>
                        {s.label} ({counts[s.value]})
                    </button>
                ))}
            </div>

            <div style={{ marginBottom: 16 }}>
                <input placeholder="Search inquiry number / customer / description…" value={search}
                    onChange={e => setSearch(e.target.value)} style={{ ...inpS, width: 360, outline: 'none' }} />
            </div>

            {/* Table */}
            <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr>
                        {['INQ No.', 'Customer', 'Brand / Category', 'Inquiry Date', 'Required Delivery', 'Target FOB', 'Quotes', 'Selected Vendor', 'Status', ''].map(h =>
                            <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {rows.map(r => {
                            const sm = STATUS_META[r.status] || STATUS_META.open;
                            return (
                                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/orders/inquiries/${r.id}`)}>
                                    <td style={{ ...tdS, fontWeight: 700, color: '#3b82f6' }}>{r.inquiry_number}</td>
                                    <td style={tdS}>{r.customer_name || '—'}</td>
                                    <td style={{ ...tdS, color: pt.colors.dimText }}>{[r.brand_name, r.category_name].filter(Boolean).join(' / ') || '—'}</td>
                                    <td style={tdS}>{r.inquiry_date}</td>
                                    <td style={{ ...tdS, color: r.required_delivery ? pt.colors.text : pt.colors.muted }}>{r.required_delivery || '—'}</td>
                                    <td style={tdS}>{r.target_fob_price ? `${r.currency} ${Number(r.target_fob_price).toFixed(2)}` : '—'}</td>
                                    <td style={{ ...tdS, textAlign: 'center' }}>
                                        <span style={tag(r.quotation_count > 0 ? '#8b5cf6' : '#475569')}>{r.quotation_count}</span>
                                    </td>
                                    <td style={{ ...tdS, color: r.selected_vendor ? '#10b981' : pt.colors.muted }}>{r.selected_vendor || '—'}</td>
                                    <td style={tdS}><span style={tag(sm.color)}>{sm.label}</span></td>
                                    <td style={tdS} onClick={e => e.stopPropagation()}>
                                        <button onClick={() => nav(`/orders/inquiries/${r.id}`)} style={smallBtn('#3b82f6')}>Open</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr><td colSpan={10} style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                                No inquiries yet. Click "+ New Inquiry" to capture a buyer requirement.
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* New Inquiry Modal */}
            {modal && (
                <div style={overlay}>
                    <div style={{ ...modalBox(pt), maxWidth: 780 }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>New Buyer Inquiry</h3>
                        <div style={grid2}>
                            <F label="Customer">
                                <select style={inpS} {...inp('customer_id')}>
                                    <option value="">— Select Customer —</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                                </select>
                            </F>
                            <F label="Inquiry Date *"><input type="date" style={inpS} {...inp('inquiry_date')} /></F>
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
                            <F label="Required Delivery"><input type="date" style={inpS} {...inp('required_delivery')} /></F>
                            <F label="Destination (Country / Port)"><input style={inpS} placeholder="e.g. Spain / Barcelona" {...inp('destination')} /></F>
                            <F label="Target FOB Price (per pc)"><input type="number" style={inpS} placeholder="0.00" step="0.01" {...inp('target_fob_price')} /></F>
                            <F label="Currency">
                                <select style={inpS} {...inp('currency')}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </F>
                        </div>
                        <F label="Description / Style Brief">
                            <textarea style={{ ...inpS, width: '100%', height: 64, resize: 'vertical' }} placeholder="Brief description of the style / product requirement…" {...inp('description')} />
                        </F>

                        {/* Items */}
                        <div style={{ margin: '16px 0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: 14 }}>Style / Product Items (optional)</strong>
                            <button onClick={addItem} style={smallBtn('#3b82f6')}>+ Add Item</button>
                        </div>
                        {form.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                                <F label={idx === 0 ? 'Style Ref' : ''}><input style={inpS} placeholder="Style#" value={item.style_ref} onChange={e => updateItem(idx, 'style_ref', e.target.value)} /></F>
                                <F label={idx === 0 ? 'Description *' : ''}><input style={inpS} placeholder="Item desc" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} /></F>
                                <F label={idx === 0 ? 'Color' : ''}><input style={inpS} placeholder="Color" value={item.color} onChange={e => updateItem(idx, 'color', e.target.value)} /></F>
                                <F label={idx === 0 ? 'Size Range' : ''}><input style={inpS} placeholder="S-XL" value={item.size_range} onChange={e => updateItem(idx, 'size_range', e.target.value)} /></F>
                                <F label={idx === 0 ? 'Qty' : ''}><input type="number" style={inpS} placeholder="0" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} /></F>
                                <F label={idx === 0 ? 'Target Price' : ''}><input type="number" style={inpS} placeholder="0.00" step="0.01" value={item.target_price} onChange={e => updateItem(idx, 'target_price', e.target.value)} /></F>
                                <button onClick={() => removeItem(idx)} style={{ ...smallBtn('#ef4444'), marginBottom: 2 }}>✕</button>
                            </div>
                        ))}

                        <F label="Notes"><textarea style={{ ...inpS, height: 52, resize: 'vertical', width: '100%', marginTop: 8 }} {...inp('notes')} /></F>
                        {msg && <div style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#3b82f6')}>{saving ? 'Creating…' : 'Create & Open'}</button>
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
