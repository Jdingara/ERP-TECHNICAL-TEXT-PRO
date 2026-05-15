// PAGE: Buyer Inquiry Detail — Buying House ERP
// Tabs: Overview | Items | Cost Sheet | Vendor Quotes
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
const QUOT_STATUS = [
    { value: 'sent',     label: 'RFQ Sent' },
    { value: 'received', label: 'Quote Received' },
    { value: 'selected', label: 'Selected' },
    { value: 'rejected', label: 'Rejected' },
];
const QUOT_STATUS_META = {
    sent:     '#3b82f6', received: '#f59e0b', selected: '#10b981', rejected: '#94a3b8',
};
const emptyItem = { style_ref: '', description: '', color: '', size_range: '', quantity: '', target_price: '' };
const emptyQuot = { vendor_id: '', rfq_date: new Date().toISOString().split('T')[0], response_date: '', lead_time_days: '', currency: 'INR', unit_quoted: '', total_quoted: '', status: 'sent', notes: '' };

export default function InquiryDetailPage() {
    const { id }  = useParams();
    const pt      = usePageTheme();
    const nav     = useNavigate();
    const inpS    = { ...pt.inp };

    const [inq, setInq]           = useState(null);
    const [tab, setTab]           = useState('overview');
    const [loading, setLoading]   = useState(true);
    const [msg, setMsg]           = useState('');

    // Overview edit
    const [editing, setEditing]   = useState(false);
    const [editForm, setEditForm] = useState({});
    const [customers, setCustomers] = useState([]);
    const [brands, setBrands]     = useState([]);
    const [categories, setCats]   = useState([]);

    // Items
    const [itemModal, setItemModal] = useState(false);
    const [itemForm, setItemForm]   = useState({ ...emptyItem });
    const [editItemId, setEditItemId] = useState(null);

    // Cost Sheet
    const [cs, setCs]             = useState(null);
    const [csForm, setCsForm]     = useState({ fabric_cost: '', trims_cost: '', cm_cost: '', washing_cost: '', testing_cost: '', freight_cost: '', overhead_pct: '', margin_pct: '', selling_price: '', currency: 'USD', notes: '' });
    const [csSaving, setCsSaving] = useState(false);

    // Vendor Quotes
    const [quotModal, setQuotModal] = useState(false);
    const [quotForm, setQuotForm]   = useState({ ...emptyQuot });
    const [editQuotId, setEditQuotId] = useState(null);
    const [vendors, setVendors]     = useState([]);

    // Convert to CO
    const [convertModal, setConvertModal] = useState(false);
    const [converting, setConverting]     = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/orders/inquiries/${id}/`, { credentials: 'include' });
        if (!res.ok) { nav('/orders/inquiries'); return; }
        const d = await res.json();
        setInq(d.inquiry);
        setCs(d.inquiry.cost_sheet);
        if (d.inquiry.cost_sheet) {
            const c = d.inquiry.cost_sheet;
            setCsForm({ fabric_cost: c.fabric_cost, trims_cost: c.trims_cost, cm_cost: c.cm_cost,
                washing_cost: c.washing_cost, testing_cost: c.testing_cost, freight_cost: c.freight_cost,
                overhead_pct: c.overhead_pct, margin_pct: c.margin_pct, selling_price: c.selling_price,
                currency: c.currency, notes: c.notes });
        }
        setLoading(false);
    }, [id, nav]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        Promise.all([
            fetch('/api/masters/customers/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/brands/',    { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/categories/',{ credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/vendors/',   { credentials: 'include' }).then(r => r.json()),
        ]).then(([c, b, cat, v]) => {
            setCustomers(c.customers || []);
            setBrands(b.brands || []);
            setCats(cat.categories || []);
            setVendors(v.vendors || []);
        });
    }, []);

    // Computed cost preview (live from form)
    const computeCost = () => {
        const base = ['fabric_cost','trims_cost','cm_cost','washing_cost','testing_cost','freight_cost']
            .reduce((s, k) => s + (parseFloat(csForm[k]) || 0), 0);
        const overhead = base * (parseFloat(csForm.overhead_pct) || 0) / 100;
        const subtotal = base + overhead;
        const margin   = subtotal * (parseFloat(csForm.margin_pct) || 0) / 100;
        return { base: base.toFixed(4), total: (subtotal + margin).toFixed(4) };
    };

    // ── Overview save ─────────────────────────────────────────
    const startEdit = () => {
        setEditForm({
            customer_id: inq.customer_id || '',
            brand_id: inq.brand_id || '',
            category_id: inq.category_id || '',
            required_delivery: inq.required_delivery || '',
            destination: inq.destination || '',
            target_fob_price: inq.target_fob_price || '',
            currency: inq.currency || 'USD',
            description: inq.description || '',
            status: inq.status,
            notes: inq.notes || '',
        });
        setEditing(true);
    };

    const saveOverview = async () => {
        setMsg('');
        const res = await fetch(`/api/orders/inquiries/${id}/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...editForm,
                customer_id: editForm.customer_id || null,
                brand_id: editForm.brand_id || null,
                category_id: editForm.category_id || null,
                required_delivery: editForm.required_delivery || null,
                target_fob_price: editForm.target_fob_price || null,
            }),
        });
        if (res.ok) { setEditing(false); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    // ── Item CRUD ─────────────────────────────────────────────
    const openItemModal = (item = null) => {
        if (item) { setItemForm({ style_ref: item.style_ref, description: item.description, color: item.color, size_range: item.size_range, quantity: item.quantity, target_price: item.target_price || '' }); setEditItemId(item.id); }
        else { setItemForm({ ...emptyItem }); setEditItemId(null); }
        setItemModal(true);
    };

    const saveItem = async () => {
        const payload = { ...itemForm, quantity: itemForm.quantity || 0, target_price: itemForm.target_price || null };
        let res;
        if (editItemId) {
            res = await fetch(`/api/orders/inquiry-items/${editItemId}/`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        } else {
            res = await fetch(`/api/orders/inquiries/${id}/items/`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        }
        if (res.ok) { setItemModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const deleteItem = async (itemId) => {
        if (!window.confirm('Delete this item?')) return;
        await fetch(`/api/orders/inquiry-items/${itemId}/`, { method: 'DELETE', credentials: 'include' });
        load();
    };

    // ── Cost Sheet save ───────────────────────────────────────
    const saveCostSheet = async () => {
        setCsSaving(true); setMsg('');
        const res = await fetch(`/api/orders/inquiries/${id}/cost-sheet/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(csForm),
        });
        setCsSaving(false);
        if (res.ok) { const d = await res.json(); setCs(d.cost_sheet); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    // ── Quotation CRUD ────────────────────────────────────────
    const openQuotModal = (q = null) => {
        if (q) { setQuotForm({ vendor_id: q.vendor_id || '', rfq_date: q.rfq_date, response_date: q.response_date || '', lead_time_days: q.lead_time_days || '', currency: q.currency, unit_quoted: q.unit_quoted, total_quoted: q.total_quoted, status: q.status, notes: q.notes }); setEditQuotId(q.id); }
        else { setQuotForm({ ...emptyQuot }); setEditQuotId(null); }
        setQuotModal(true);
    };

    const saveQuot = async () => {
        const payload = { ...quotForm, vendor_id: quotForm.vendor_id || null, response_date: quotForm.response_date || null, lead_time_days: quotForm.lead_time_days || null };
        let res;
        if (editQuotId) {
            res = await fetch(`/api/orders/inquiry-quotations/${editQuotId}/`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        } else {
            res = await fetch(`/api/orders/inquiries/${id}/quotations/`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        }
        if (res.ok) { setQuotModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const selectVendor = async (q) => {
        if (!window.confirm(`Select ${q.vendor_name} as the factory for this inquiry? Other vendors will be marked Rejected.`)) return;
        await fetch(`/api/orders/inquiry-quotations/${q.id}/`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'selected' }) });
        load();
    };

    const deleteQuot = async (qId) => {
        if (!window.confirm('Remove this quotation?')) return;
        await fetch(`/api/orders/inquiry-quotations/${qId}/`, { method: 'DELETE', credentials: 'include' });
        load();
    };

    // ── Convert to CO ─────────────────────────────────────────
    const convertToCO = async () => {
        setConverting(true);
        const res = await fetch(`/api/orders/inquiries/${id}/convert-to-co/`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        setConverting(false);
        if (res.ok) {
            const d = await res.json();
            setConvertModal(false);
            nav(`/orders/co/${d.co_id}`);
        } else {
            const d = await res.json(); setMsg(d.error || 'Error converting.');
        }
    };

    if (loading) return <div style={{ padding: 40, color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>Loading…</div>;
    if (!inq) return null;

    const sm = STATUS_META[inq.status] || STATUS_META.open;
    const cost = computeCost();

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <button onClick={() => nav('/orders/inquiries')} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 13 }}>← Inquiries</button>
                        <span style={{ color: '#475569' }}>/</span>
                        <span style={{ fontSize: 20, fontWeight: 700 }}>{inq.inquiry_number}</span>
                        <span style={tag(sm.color)}>{sm.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: pt.colors.dimText }}>
                        {inq.customer_name || 'No customer'}{inq.brand_name ? ` · ${inq.brand_name}` : ''}{inq.destination ? ` · ${inq.destination}` : ''}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {inq.status === 'confirmed' && inq.customer_order_id && (
                        <button onClick={() => nav(`/orders/co/${inq.customer_order_id}`)} style={btn('#10b981')}>View CO {inq.co_number}</button>
                    )}
                    {inq.status !== 'confirmed' && inq.status !== 'dropped' && (
                        <button onClick={() => setConvertModal(true)} style={btn('#06b6d4')}>Convert to CO →</button>
                    )}
                </div>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
                {[
                    { label: 'Target FOB', value: inq.target_fob_price ? `${inq.currency} ${Number(inq.target_fob_price).toFixed(2)}` : '—', color: '#3b82f6' },
                    { label: 'Your Selling Price', value: cs ? `${cs.currency} ${Number(cs.selling_price).toFixed(2)}` : '—', color: '#f59e0b' },
                    { label: 'Best Quote', value: inq.quotations?.length ? `${inq.quotations[0].currency} ${Number(inq.quotations[0].unit_quoted).toFixed(2)}` : '—', color: '#8b5cf6' },
                    { label: 'Vendors Quoted', value: inq.quotation_count || 0, color: '#06b6d4' },
                ].map(c => (
                    <div key={c.label} style={{ background: pt.colors.card, borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${c.color}` }}>
                        <div style={{ fontSize: 11, color: pt.colors.dimText, marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${pt.colors.border}` }}>
                {['overview', 'items', 'cost_sheet', 'vendor_quotes'].map(t => {
                    const labels = { overview: 'Overview', items: `Items (${inq.items?.length || 0})`, cost_sheet: 'Cost Sheet', vendor_quotes: `Vendor Quotes (${inq.quotation_count || 0})` };
                    return (
                        <button key={t} onClick={() => setTab(t)} style={{
                            padding: '8px 18px', border: 'none', borderRadius: '8px 8px 0 0',
                            background: tab === t ? '#3b82f6' : 'transparent',
                            color: tab === t ? '#fff' : pt.colors.dimText,
                            cursor: 'pointer', fontWeight: 600, fontSize: 13,
                        }}>{labels[t]}</button>
                    );
                })}
            </div>

            {msg && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{msg}</div>}

            {/* ── TAB: OVERVIEW ──────────────────────────────────── */}
            {tab === 'overview' && (
                <div style={{ background: pt.colors.card, borderRadius: 12, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontSize: 16 }}>Inquiry Details</h3>
                        {!editing && <button onClick={startEdit} style={smallBtn('#3b82f6')}>Edit</button>}
                    </div>
                    {!editing ? (
                        <div style={grid2}>
                            {[
                                ['Customer', inq.customer_name || '—'],
                                ['Brand', inq.brand_name || '—'],
                                ['Category', inq.category_name || '—'],
                                ['Inquiry Date', inq.inquiry_date],
                                ['Required Delivery', inq.required_delivery || '—'],
                                ['Destination', inq.destination || '—'],
                                ['Target FOB Price', inq.target_fob_price ? `${inq.currency} ${Number(inq.target_fob_price).toFixed(2)}` : '—'],
                                ['Currency', inq.currency],
                                ['Status', <span style={tag(sm.color)}>{sm.label}</span>],
                                ['Linked CO', inq.co_number ? <button onClick={() => nav(`/orders/co/${inq.customer_order_id}`)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{inq.co_number}</button> : '—'],
                            ].map(([label, val]) => (
                                <div key={label}>
                                    <div style={{ fontSize: 11, color: pt.colors.dimText, marginBottom: 2 }}>{label}</div>
                                    <div style={{ fontSize: 14, fontWeight: 500 }}>{val}</div>
                                </div>
                            ))}
                            {inq.description && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={{ fontSize: 11, color: pt.colors.dimText, marginBottom: 4 }}>Description / Style Brief</div>
                                    <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{inq.description}</div>
                                </div>
                            )}
                            {inq.notes && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={{ fontSize: 11, color: pt.colors.dimText, marginBottom: 4 }}>Notes</div>
                                    <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{inq.notes}</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div style={grid2}>
                                <F label="Customer">
                                    <select style={inpS} value={editForm.customer_id} onChange={e => setEditForm(p => ({ ...p, customer_id: e.target.value }))}>
                                        <option value="">— Select —</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                                    </select>
                                </F>
                                <F label="Brand">
                                    <select style={inpS} value={editForm.brand_id} onChange={e => setEditForm(p => ({ ...p, brand_id: e.target.value }))}>
                                        <option value="">— Select —</option>
                                        {brands.map(b => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
                                    </select>
                                </F>
                                <F label="Category">
                                    <select style={inpS} value={editForm.category_id} onChange={e => setEditForm(p => ({ ...p, category_id: e.target.value }))}>
                                        <option value="">— Select —</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                                    </select>
                                </F>
                                <F label="Required Delivery"><input type="date" style={inpS} value={editForm.required_delivery} onChange={e => setEditForm(p => ({ ...p, required_delivery: e.target.value }))} /></F>
                                <F label="Destination"><input style={inpS} value={editForm.destination} onChange={e => setEditForm(p => ({ ...p, destination: e.target.value }))} /></F>
                                <F label="Target FOB Price"><input type="number" step="0.01" style={inpS} value={editForm.target_fob_price} onChange={e => setEditForm(p => ({ ...p, target_fob_price: e.target.value }))} /></F>
                                <F label="Currency">
                                    <select style={inpS} value={editForm.currency} onChange={e => setEditForm(p => ({ ...p, currency: e.target.value }))}>
                                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </F>
                                <F label="Status">
                                    <select style={inpS} value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </F>
                            </div>
                            <F label="Description">
                                <textarea style={{ ...inpS, width: '100%', height: 64, resize: 'vertical' }} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                            </F>
                            <F label="Notes">
                                <textarea style={{ ...inpS, width: '100%', height: 52, resize: 'vertical', marginTop: 8 }} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
                            </F>
                            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                <button onClick={() => setEditing(false)} style={smallBtn('#64748b')}>Cancel</button>
                                <button onClick={saveOverview} style={btn('#3b82f6')}>Save Changes</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── TAB: ITEMS ─────────────────────────────────────── */}
            {tab === 'items' && (
                <div style={{ background: pt.colors.card, borderRadius: 12, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 16 }}>Style / Product Items</h3>
                        <button onClick={() => openItemModal()} style={btn('#3b82f6')}>+ Add Item</button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr>
                            {['Style Ref', 'Description', 'Color', 'Size Range', 'Quantity', 'Target Price / pc', ''].map(h =>
                                <th key={h} style={{ ...pt.th, textAlign: 'left' }}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {(inq.items || []).map(item => (
                                <tr key={item.id}>
                                    <td style={pt.cell}>{item.style_ref || '—'}</td>
                                    <td style={{ ...pt.cell, fontWeight: 500 }}>{item.description}</td>
                                    <td style={pt.cell}>{item.color || '—'}</td>
                                    <td style={pt.cell}>{item.size_range || '—'}</td>
                                    <td style={pt.cell}>{Number(item.quantity).toLocaleString()}</td>
                                    <td style={pt.cell}>{item.target_price ? `${inq.currency} ${Number(item.target_price).toFixed(2)}` : '—'}</td>
                                    <td style={pt.cell}>
                                        <button onClick={() => openItemModal(item)} style={smallBtn('#3b82f6')}>Edit</button>
                                        <button onClick={() => deleteItem(item.id)} style={smallBtn('#ef4444')}>Del</button>
                                    </td>
                                </tr>
                            ))}
                            {(!inq.items || inq.items.length === 0) && (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: pt.colors.muted }}>No items yet. Click "+ Add Item".</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── TAB: COST SHEET ────────────────────────────────── */}
            {tab === 'cost_sheet' && (
                <div style={{ background: pt.colors.card, borderRadius: 12, padding: 24, maxWidth: 700 }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: 16 }}>Cost Sheet — FOB Price Build-Up</h3>
                    <div style={grid2}>
                        <F label="Currency">
                            <select style={inpS} value={csForm.currency} onChange={e => setCsForm(p => ({ ...p, currency: e.target.value }))}>
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </F>
                        <div />
                        {[
                            ['fabric_cost', 'Fabric Cost / pc'],
                            ['trims_cost', 'Trims & Accessories / pc'],
                            ['cm_cost', 'Cut & Make (CM) / pc'],
                            ['washing_cost', 'Washing / Finishing / pc'],
                            ['testing_cost', 'Testing & Inspection / pc'],
                            ['freight_cost', 'Freight & Misc / pc'],
                        ].map(([key, label]) => (
                            <F key={key} label={label}>
                                <input type="number" step="0.0001" style={inpS} placeholder="0.00"
                                    value={csForm[key]} onChange={e => setCsForm(p => ({ ...p, [key]: e.target.value }))} />
                            </F>
                        ))}
                        <F label="Overhead %">
                            <input type="number" step="0.01" style={inpS} placeholder="0.00"
                                value={csForm.overhead_pct} onChange={e => setCsForm(p => ({ ...p, overhead_pct: e.target.value }))} />
                        </F>
                        <F label="Margin %">
                            <input type="number" step="0.01" style={inpS} placeholder="0.00"
                                value={csForm.margin_pct} onChange={e => setCsForm(p => ({ ...p, margin_pct: e.target.value }))} />
                        </F>
                        <F label="Your Selling FOB Price / pc (override)">
                            <input type="number" step="0.0001" style={inpS} placeholder="0.00"
                                value={csForm.selling_price} onChange={e => setCsForm(p => ({ ...p, selling_price: e.target.value }))} />
                        </F>
                    </div>
                    {/* Live calculation preview */}
                    <div style={{ background: 'rgba(59,130,246,0.07)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            {[
                                { label: 'Base Cost', val: `${csForm.currency} ${cost.base}` },
                                { label: 'Calculated Total (with overhead+margin)', val: `${csForm.currency} ${cost.total}`, strong: true },
                                { label: 'Buyer Target FOB', val: inq.target_fob_price ? `${inq.currency} ${Number(inq.target_fob_price).toFixed(4)}` : '—' },
                            ].map(c => (
                                <div key={c.label}>
                                    <div style={{ fontSize: 11, color: pt.colors.dimText, marginBottom: 2 }}>{c.label}</div>
                                    <div style={{ fontSize: 16, fontWeight: c.strong ? 700 : 500, color: c.strong ? '#f59e0b' : pt.colors.text }}>{c.val}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <F label="Notes">
                        <textarea style={{ ...inpS, width: '100%', height: 52, resize: 'vertical' }} value={csForm.notes} onChange={e => setCsForm(p => ({ ...p, notes: e.target.value }))} />
                    </F>
                    <div style={{ marginTop: 16 }}>
                        <button onClick={saveCostSheet} disabled={csSaving} style={btn('#f59e0b')}>{csSaving ? 'Saving…' : 'Save Cost Sheet'}</button>
                    </div>
                </div>
            )}

            {/* ── TAB: VENDOR QUOTES ─────────────────────────────── */}
            {tab === 'vendor_quotes' && (
                <div style={{ background: pt.colors.card, borderRadius: 12, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 16 }}>Vendor Quotation Comparison</h3>
                        <button onClick={() => openQuotModal()} style={btn('#8b5cf6')}>+ Add RFQ / Quote</button>
                    </div>
                    {/* Comparison Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead><tr>
                                {['Vendor', 'RFQ Date', 'Response', 'Lead Time', 'Unit Quoted', 'Total Quoted', 'Status', ''].map(h =>
                                    <th key={h} style={{ ...pt.th, textAlign: 'left' }}>{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {(inq.quotations || []).map(q => {
                                    const qcol = QUOT_STATUS_META[q.status] || '#475569';
                                    const isSelected = q.status === 'selected';
                                    return (
                                        <tr key={q.id} style={{ background: isSelected ? 'rgba(16,185,129,0.06)' : 'transparent' }}>
                                            <td style={{ ...pt.cell, fontWeight: isSelected ? 700 : 400, color: isSelected ? '#10b981' : pt.colors.text }}>
                                                {q.vendor_name || '—'}
                                                {isSelected && <span style={{ marginLeft: 6, fontSize: 10, background: '#10b98120', color: '#10b981', borderRadius: 8, padding: '1px 6px' }}>SELECTED</span>}
                                            </td>
                                            <td style={pt.cell}>{q.rfq_date}</td>
                                            <td style={{ ...pt.cell, color: q.response_date ? pt.colors.text : pt.colors.muted }}>{q.response_date || 'Pending'}</td>
                                            <td style={pt.cell}>{q.lead_time_days ? `${q.lead_time_days} days` : '—'}</td>
                                            <td style={{ ...pt.cell, fontWeight: 600 }}>{q.currency} {Number(q.unit_quoted).toFixed(2)}</td>
                                            <td style={pt.cell}>{q.currency} {Number(q.total_quoted).toLocaleString()}</td>
                                            <td style={pt.cell}><span style={tag(qcol)}>{QUOT_STATUS.find(s => s.value === q.status)?.label || q.status}</span></td>
                                            <td style={pt.cell}>
                                                {q.status !== 'selected' && q.status !== 'rejected' && (
                                                    <button onClick={() => selectVendor(q)} style={{ ...smallBtn('#10b981'), marginRight: 4 }}>Select</button>
                                                )}
                                                <button onClick={() => openQuotModal(q)} style={smallBtn('#3b82f6')}>Edit</button>
                                                <button onClick={() => deleteQuot(q.id)} style={smallBtn('#ef4444')}>Del</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {(!inq.quotations || inq.quotations.length === 0) && (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: pt.colors.muted }}>
                                        No vendor quotes yet. Click "+ Add RFQ / Quote".
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {inq.quotations?.length > 0 && (
                        <div style={{ marginTop: 16, padding: 12, background: 'rgba(139,92,246,0.07)', borderRadius: 8, fontSize: 12, color: pt.colors.dimText }}>
                            Lowest quote: <strong>{inq.quotations[0]?.vendor_name}</strong> at <strong>{inq.quotations[0]?.currency} {Number(inq.quotations[0]?.unit_quoted).toFixed(2)}/pc</strong>
                            {inq.target_fob_price && ` · Target FOB: ${inq.currency} ${Number(inq.target_fob_price).toFixed(2)}`}
                        </div>
                    )}
                </div>
            )}

            {/* ── Item Modal ────────────────────────────────────── */}
            {itemModal && (
                <div style={overlay}>
                    <div style={{ ...modalBox(pt), maxWidth: 520 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>{editItemId ? 'Edit Item' : 'Add Item'}</h3>
                        <div style={grid2}>
                            <F label="Style Ref"><input style={inpS} value={itemForm.style_ref} onChange={e => setItemForm(p => ({ ...p, style_ref: e.target.value }))} /></F>
                            <F label="Description *"><input style={inpS} value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} /></F>
                            <F label="Color"><input style={inpS} value={itemForm.color} onChange={e => setItemForm(p => ({ ...p, color: e.target.value }))} /></F>
                            <F label="Size Range"><input style={inpS} placeholder="S / M / L / XL" value={itemForm.size_range} onChange={e => setItemForm(p => ({ ...p, size_range: e.target.value }))} /></F>
                            <F label="Quantity"><input type="number" style={inpS} value={itemForm.quantity} onChange={e => setItemForm(p => ({ ...p, quantity: e.target.value }))} /></F>
                            <F label="Target Price / pc"><input type="number" step="0.01" style={inpS} value={itemForm.target_price} onChange={e => setItemForm(p => ({ ...p, target_price: e.target.value }))} /></F>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                            <button onClick={() => setItemModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={saveItem} style={btn('#3b82f6')}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Quotation Modal ───────────────────────────────── */}
            {quotModal && (
                <div style={overlay}>
                    <div style={{ ...modalBox(pt), maxWidth: 560 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>{editQuotId ? 'Edit Quotation' : 'Add Vendor RFQ / Quote'}</h3>
                        <div style={grid2}>
                            <F label="Vendor *">
                                <select style={inpS} value={quotForm.vendor_id} onChange={e => setQuotForm(p => ({ ...p, vendor_id: e.target.value }))}>
                                    <option value="">— Select Vendor —</option>
                                    {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                                </select>
                            </F>
                            <F label="Status">
                                <select style={inpS} value={quotForm.status} onChange={e => setQuotForm(p => ({ ...p, status: e.target.value }))}>
                                    {QUOT_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </F>
                            <F label="RFQ Date *"><input type="date" style={inpS} value={quotForm.rfq_date} onChange={e => setQuotForm(p => ({ ...p, rfq_date: e.target.value }))} /></F>
                            <F label="Response Date"><input type="date" style={inpS} value={quotForm.response_date} onChange={e => setQuotForm(p => ({ ...p, response_date: e.target.value }))} /></F>
                            <F label="Lead Time (days)"><input type="number" style={inpS} value={quotForm.lead_time_days} onChange={e => setQuotForm(p => ({ ...p, lead_time_days: e.target.value }))} /></F>
                            <F label="Currency">
                                <select style={inpS} value={quotForm.currency} onChange={e => setQuotForm(p => ({ ...p, currency: e.target.value }))}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </F>
                            <F label="Unit Quoted / pc"><input type="number" step="0.01" style={inpS} value={quotForm.unit_quoted} onChange={e => setQuotForm(p => ({ ...p, unit_quoted: e.target.value }))} /></F>
                            <F label="Total Quoted (all qty)"><input type="number" step="0.01" style={inpS} value={quotForm.total_quoted} onChange={e => setQuotForm(p => ({ ...p, total_quoted: e.target.value }))} /></F>
                        </div>
                        <F label="Notes"><textarea style={{ ...inpS, width: '100%', height: 52, resize: 'vertical' }} value={quotForm.notes} onChange={e => setQuotForm(p => ({ ...p, notes: e.target.value }))} /></F>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                            <button onClick={() => setQuotModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={saveQuot} style={btn('#8b5cf6')}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Convert to CO Modal ───────────────────────────── */}
            {convertModal && (
                <div style={overlay}>
                    <div style={{ ...modalBox(pt), maxWidth: 440 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Convert Inquiry to Customer Order?</h3>
                        <p style={{ fontSize: 13, color: pt.colors.dimText, marginBottom: 16 }}>
                            This will create a new <strong>Customer Order</strong> pre-filled with the inquiry items, customer, brand and delivery date. The inquiry will be marked as "Converted to CO".
                        </p>
                        {inq.quotations?.find(q => q.status === 'selected') && (
                            <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                                Selected vendor: <strong>{inq.quotations.find(q => q.status === 'selected')?.vendor_name}</strong>
                            </div>
                        )}
                        {msg && <div style={{ color: '#ef4444', marginBottom: 10, fontSize: 13 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setConvertModal(false); setMsg(''); }} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={convertToCO} disabled={converting} style={btn('#06b6d4')}>{converting ? 'Creating…' : 'Yes, Convert to CO'}</button>
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
const overlay    = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox   = (pt) => ({ background: pt.colors.card, borderRadius: 16, padding: 28, width: '90%', maxHeight: '90vh', overflowY: 'auto' });
const grid2      = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
