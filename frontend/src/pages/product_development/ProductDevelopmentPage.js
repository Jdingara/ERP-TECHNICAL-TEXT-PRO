// PAGE: Product Development — Request List
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const STATUS_META = {
    draft:              { label: 'Draft',              color: '#64748b' },
    open:               { label: 'Open',               color: '#3b82f6' },
    vendor_assigned:    { label: 'Vendor Assigned',    color: '#f59e0b' },
    sample_in_progress: { label: 'Sample In Progress', color: '#8b5cf6' },
    sample_received:    { label: 'Sample Received',    color: '#06b6d4' },
    testing:            { label: 'Testing',            color: '#ec4899' },
    approved:           { label: 'Approved',           color: '#10b981' },
    rejected:           { label: 'Rejected',           color: '#ef4444' },
    cancelled:          { label: 'Cancelled',          color: '#94a3b8' },
};

const STATUSES = Object.entries(STATUS_META).map(([value, { label }]) => ({ value, label }));

const emptyForm = {
    title: '', customer_id: '', brand_id: '', category_id: '',
    request_date: new Date().toISOString().split('T')[0],
    required_by: '', status: 'open', notes: '',
};

export default function ProductDevelopmentPage() {
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
    const [saving, setSaving]     = useState(false);
    const [msg, setMsg]           = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (statusFilter) p.set('status', statusFilter);
        const res = await fetch(`/api/pd/requests/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.pd_requests || []);
    }, [search, statusFilter]);

    const loadDropdowns = useCallback(async () => {
        const [c, b, cat] = await Promise.all([
            fetch('/api/masters/customers/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/brands/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/masters/categories/', { credentials: 'include' }).then(r => r.json()),
        ]);
        setCustomers(c.customers || []);
        setBrands(b.brands || []);
        setCategories(cat.categories || []);
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

    const openNew = () => { setForm(emptyForm); setMsg(''); setModal(true); };

    const save = async () => {
        setSaving(true);
        const payload = { ...form, customer_id: form.customer_id || null, brand_id: form.brand_id || null, category_id: form.category_id || null, required_by: form.required_by || null };
        const res = await fetch('/api/pd/requests/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        setSaving(false);
        if (res.ok) {
            const d = await res.json();
            setModal(false);
            nav(`/product-development/${d.pd_request.id}`);
        } else {
            const d = await res.json(); setMsg(d.error || 'Error');
        }
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    const counts = STATUSES.reduce((acc, s) => {
        acc[s.value] = rows.filter(r => r.status === s.value).length;
        return acc;
    }, {});

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Product Development</h2>
                    <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>Track PD requests from customer inquiry to sample approval</p>
                </div>
                <button onClick={openNew} style={btn('#8b5cf6')}>+ New PD Request</button>
            </div>

            {/* Status summary pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <button onClick={() => setStatus('')} style={filterPill(statusFilter === '', '#64748b')}>All ({rows.length})</button>
                {STATUSES.filter(s => counts[s.value] > 0).map(s => (
                    <button key={s.value} onClick={() => setStatus(s.value)}
                        style={filterPill(statusFilter === s.value, STATUS_META[s.value].color)}>
                        {s.label} ({counts[s.value]})
                    </button>
                ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
                <input placeholder="Search PD number / title / customer…" value={search}
                    onChange={e => setSearch(e.target.value)} style={{ ...inpS, width: 320, outline: 'none' }} />
            </div>

            {/* Table */}
            <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr>
                        {['PD No.', 'Title', 'Customer', 'Brand', 'Category', 'Request Date', 'Required By', 'Status', 'Vendors', 'Action'].map(h =>
                            <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {rows.map(r => {
                            const sm = STATUS_META[r.status] || STATUS_META.draft;
                            return (
                                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/product-development/${r.id}`)}>
                                    <td style={{ ...tdS, fontWeight: 700, color: '#8b5cf6' }}>{r.pd_number}</td>
                                    <td style={tdS}>{r.title}</td>
                                    <td style={tdS}>{r.customer_name || '—'}</td>
                                    <td style={tdS}>{r.brand_name || '—'}</td>
                                    <td style={tdS}>{r.category_name || '—'}</td>
                                    <td style={tdS}>{r.request_date}</td>
                                    <td style={{ ...tdS, color: r.required_by ? pt.colors.text : pt.colors.muted }}>{r.required_by || '—'}</td>
                                    <td style={tdS}><span style={tag(sm.color)}>{sm.label}</span></td>
                                    <td style={tdS}>{r.vendor_count > 0 ? <span style={tag('#10b981')}>{r.vendor_count} vendor{r.vendor_count > 1 ? 's' : ''}</span> : <span style={{ color: pt.colors.muted }}>—</span>}</td>
                                    <td style={tdS} onClick={e => e.stopPropagation()}>
                                        <button onClick={() => nav(`/product-development/${r.id}`)} style={smallBtn('#8b5cf6')}>Open</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr><td colSpan={10} style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                                No PD requests. Click "+ New PD Request" to start.
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* New PD modal */}
            {modal && (
                <div style={overlay}>
                    <div style={{ ...modalBox(pt), maxWidth: 640 }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>New PD Request</h3>
                        <div style={grid2}>
                            <F label="Title *" span={2}><input style={inpS} placeholder="e.g. Men's Polo Shirt — Spring 2026" {...inp('title')} /></F>
                            <F label="Customer">
                                <select style={inpS} {...inp('customer_id')}>
                                    <option value="">— Select Customer —</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                                </select>
                            </F>
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
                            <F label="Status">
                                <select style={inpS} {...inp('status')}>
                                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </F>
                            <F label="Request Date *"><input type="date" style={inpS} {...inp('request_date')} /></F>
                            <F label="Required By"><input type="date" style={inpS} {...inp('required_by')} /></F>
                        </div>
                        <F label="Notes"><textarea style={{ ...inpS, height: 70, resize: 'vertical', width: '100%' }} {...inp('notes')} /></F>
                        {msg && <div style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#8b5cf6')}>{saving ? 'Creating…' : 'Create & Open'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function F({ label, children, span }) {
    const { settings } = useSettings();
    const muted = settings.themeMode === 'dark' ? '#94a3b8' : '#475569';
    return (
        <div style={span ? { gridColumn: `span ${span}` } : {}}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 4 }}>{label}</label>
            {children}
        </div>
    );
}
const btn        = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn   = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const tag        = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const filterPill = (active, color) => ({ padding: '4px 12px', borderRadius: 20, border: `1px solid ${color}`, background: active ? color : 'transparent', color: active ? '#fff' : color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });
const overlay    = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox   = (pt) => ({ background: pt.colors.card, borderRadius: 16, padding: 28, width: '90%', maxHeight: '90vh', overflowY: 'auto' });
const grid2      = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
