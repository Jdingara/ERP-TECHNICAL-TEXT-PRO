import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = '/api/planning/forecasts/';

const ROUTE_LABEL = {
    direct: 'Direct Sale',
    fabric_in: 'Fabric-In',
    full_cycle: 'Full Cycle',
};

function ForecastForm({ customers, products, onSave, onClose, existing }) {
    const today = new Date();
    const m1 = new Date(today); m1.setMonth(m1.getMonth());
    const m2 = new Date(today); m2.setMonth(m2.getMonth() + 1);
    const m3 = new Date(today); m3.setMonth(m3.getMonth() + 2);
    const fmt = d => d.toLocaleString('default', { month: 'short', year: 'numeric' });

    const [form, setForm] = useState(existing ? {
        customer_id: existing.customer_id,
        title: existing.title,
        period_from: existing.period_from,
        period_to: existing.period_to,
        month_1_label: existing.month_1_label,
        month_2_label: existing.month_2_label,
        month_3_label: existing.month_3_label,
        notes: existing.notes,
    } : {
        customer_id: '',
        title: '',
        period_from: m1.toISOString().slice(0, 10),
        period_to: m3.toISOString().slice(0, 10),
        month_1_label: fmt(m1),
        month_2_label: fmt(m2),
        month_3_label: fmt(m3),
        notes: '',
    });

    const [lines, setLines] = useState(existing?.lines || []);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const addLine = () => setLines(l => [...l, { product_id: '', month_1_qty: '', month_2_qty: '', month_3_qty: '', uom: 'kg', notes: '' }]);
    const removeLine = i => setLines(l => l.filter((_, idx) => idx !== i));
    const setLine = (i, k, v) => setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [k]: v } : ln));

    const save = async () => {
        if (!form.customer_id || !form.title || lines.length === 0) {
            setErr('Customer, title and at least one product line are required.'); return;
        }
        setSaving(true);
        try {
            const url = existing ? `${API}${existing.id}/` : API;
            const method = existing ? 'PUT' : 'POST';
            const body = {
                ...form,
                lines: lines.map(ln => ({
                    product_id: parseInt(ln.product_id),
                    month_1_qty: parseFloat(ln.month_1_qty) || 0,
                    month_2_qty: parseFloat(ln.month_2_qty) || 0,
                    month_3_qty: parseFloat(ln.month_3_qty) || 0,
                    uom: ln.uom || 'kg',
                    notes: ln.notes || '',
                })),
            };
            const r = await fetch(url, {
                method, credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const d = await r.json();
            if (!r.ok) { setErr(d.error || 'Save failed'); setSaving(false); return; }
            onSave();
        } catch (e) { setErr(e.message); setSaving(false); }
    };

    const inp = { padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none' };
    const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 };

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#0007', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px 0' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 860, boxShadow: '0 8px 32px #0003', margin: 'auto' }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>
                    {existing ? 'Edit Forecast' : 'New Customer Forecast'}
                </div>

                {err && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{err}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                        <label style={lbl}>Customer *</label>
                        <select value={form.customer_id} onChange={e => setF('customer_id', e.target.value)} style={inp}>
                            <option value="">Select customer…</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.customer_code} — {c.customer_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={lbl}>Forecast Title *</label>
                        <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Apr–Jun 2026 Forecast" style={inp} />
                    </div>
                    <div>
                        <label style={lbl}>Period From</label>
                        <input type="date" value={form.period_from} onChange={e => setF('period_from', e.target.value)} style={inp} />
                    </div>
                    <div>
                        <label style={lbl}>Period To</label>
                        <input type="date" value={form.period_to} onChange={e => setF('period_to', e.target.value)} style={inp} />
                    </div>
                    <div>
                        <label style={lbl}>Month 1 Label</label>
                        <input value={form.month_1_label} onChange={e => setF('month_1_label', e.target.value)} placeholder="e.g. Apr 2026" style={inp} />
                    </div>
                    <div>
                        <label style={lbl}>Month 2 Label</label>
                        <input value={form.month_2_label} onChange={e => setF('month_2_label', e.target.value)} placeholder="e.g. May 2026" style={inp} />
                    </div>
                    <div>
                        <label style={lbl}>Month 3 Label</label>
                        <input value={form.month_3_label} onChange={e => setF('month_3_label', e.target.value)} placeholder="e.g. Jun 2026" style={inp} />
                    </div>
                    <div>
                        <label style={lbl}>Notes</label>
                        <input value={form.notes} onChange={e => setF('notes', e.target.value)} style={inp} />
                    </div>
                </div>

                {/* Product Lines */}
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Product Lines</div>
                        <button onClick={addLine} style={{ padding: '5px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                            + Add Product
                        </button>
                    </div>

                    {lines.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '16px 0' }}>No products added yet. Click + Add Product.</div>
                    )}

                    {lines.map((ln, i) => {
                        const prod = products.find(p => String(p.id) === String(ln.product_id));
                        return (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                <select value={ln.product_id} onChange={e => setLine(i, 'product_id', e.target.value)} style={inp}>
                                    <option value="">Select product…</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.design_code} — {p.design_name}</option>)}
                                </select>
                                <input type="number" min="0" placeholder={form.month_1_label || 'Month 1'} value={ln.month_1_qty}
                                    onChange={e => setLine(i, 'month_1_qty', e.target.value)} style={inp} />
                                <input type="number" min="0" placeholder={form.month_2_label || 'Month 2'} value={ln.month_2_qty}
                                    onChange={e => setLine(i, 'month_2_qty', e.target.value)} style={inp} />
                                <input type="number" min="0" placeholder={form.month_3_label || 'Month 3'} value={ln.month_3_qty}
                                    onChange={e => setLine(i, 'month_3_qty', e.target.value)} style={inp} />
                                <div style={{ fontSize: 11, color: prod ? '#10b981' : '#94a3b8', textAlign: 'center', fontWeight: 600 }}>
                                    {prod ? ROUTE_LABEL[prod.process_route] || prod.process_route : '—'}
                                </div>
                                <button onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, fontWeight: 700 }}>✕</button>
                            </div>
                        );
                    })}

                    {lines.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 32px', gap: 8, marginTop: 4 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Product</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{form.month_1_label || 'M1 (kg)'}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{form.month_2_label || 'M2 (kg)'}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{form.month_3_label || 'M3 (kg)'}</div>
                            <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>Route</div>
                            <div />
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 18px', background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
                    <button onClick={save} disabled={saving} style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                        {saving ? 'Saving…' : existing ? 'Update Forecast' : 'Create Forecast'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ForecastPage() {
    const navigate = useNavigate();
    const [forecasts, setForecasts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [msg, setMsg] = useState('');
    const [msgOk, setMsgOk] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            const [fRes, cRes, pRes] = await Promise.all([
                fetch(`${API}?${params}`, { credentials: 'include' }),
                fetch('/api/masters/customers/', { credentials: 'include' }),
                fetch('/api/masters/products/', { credentials: 'include' }),
            ]);
            const [fData, cData, pData] = await Promise.all([fRes.json(), cRes.json(), pRes.json()]);
            setForecasts(fData.forecasts || []);
            setCustomers(cData.customers || []);
            setProducts(pData.products || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line

    const confirm = async (id, title) => {
        if (!window.confirm(`Confirm forecast "${title}"? This cannot be edited after confirmation.`)) return;
        const r = await fetch(`${API}${id}/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'confirm' }),
        });
        const d = await r.json();
        setMsg(d.error || 'Forecast confirmed.'); setMsgOk(r.ok); load();
    };

    const del = async (id, title) => {
        if (!window.confirm(`Delete forecast "${title}"?`)) return;
        const r = await fetch(`${API}${id}/`, { method: 'DELETE', credentials: 'include' });
        const d = await r.json();
        setMsg(d.error || 'Deleted.'); setMsgOk(r.ok); load();
    };

    const openEdit = async (fc) => {
        const r = await fetch(`${API}${fc.id}/`, { credentials: 'include' });
        const d = await r.json();
        setEditing(d.forecast);
        setShowForm(true);
    };

    const filtered = forecasts.filter(fc =>
        !search ||
        fc.title.toLowerCase().includes(search.toLowerCase()) ||
        fc.customer_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ padding: 24, maxWidth: 1200 }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#7c3aed)', borderRadius: 12, padding: '20px 24px', marginBottom: 24, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>Customer Forecasts</div>
                    <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>3-month demand forecast per customer → drives procurement planning</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { setEditing(null); setShowForm(true); }}
                        style={{ padding: '9px 20px', background: '#fff', color: '#7c3aed', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                        + New Forecast
                    </button>
                </div>
            </div>

            {msg && (
                <div style={{ background: msgOk ? '#d1fae5' : '#fee2e2', color: msgOk ? '#065f46' : '#991b1b', padding: '9px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{msg}</span>
                    <span style={{ cursor: 'pointer', fontWeight: 700 }} onClick={() => setMsg('')}>✕</span>
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <input placeholder="Search by title or customer…" value={search} onChange={e => setSearch(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, width: 280, outline: 'none' }} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}>
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                </select>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px #0001' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Loading…</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#1e293b', color: '#fff' }}>
                                {['Forecast Title', 'Customer', 'Period', 'M1', 'M2', 'M3', 'Status', 'Actions'].map(h =>
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No forecasts found. Click + New Forecast to create one.</td></tr>
                            )}
                            {filtered.map((fc, i) => (
                                <tr key={fc.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px 14px' }}><b style={{ color: '#1e293b' }}>{fc.title}</b></td>
                                    <td style={{ padding: '10px 14px', color: '#475569' }}>{fc.customer_code} — {fc.customer_name}</td>
                                    <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{fc.period_from} → {fc.period_to}</td>
                                    <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{fc.month_1_label}</td>
                                    <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{fc.month_2_label}</td>
                                    <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{fc.month_3_label}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        {fc.status === 'confirmed'
                                            ? <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 10px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>✓ Confirmed</span>
                                            : <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>Draft</span>}
                                    </td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => navigate(`/planning/procurement-plan/${fc.id}`)}
                                                style={{ padding: '4px 10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>
                                                📦 Procure
                                            </button>
                                            {fc.status === 'draft' && (<>
                                                <button onClick={() => openEdit(fc)}
                                                    style={{ padding: '4px 10px', background: 'transparent', color: '#2563eb', border: '1px solid #2563eb', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>
                                                    Edit
                                                </button>
                                                <button onClick={() => confirm(fc.id, fc.title)}
                                                    style={{ padding: '4px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>
                                                    Confirm
                                                </button>
                                                <button onClick={() => del(fc.id, fc.title)}
                                                    style={{ padding: '4px 10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>
                                                    Delete
                                                </button>
                                            </>)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showForm && (
                <ForecastForm
                    customers={customers}
                    products={products}
                    existing={editing}
                    onSave={() => { setShowForm(false); setEditing(null); setMsg('Forecast saved.'); setMsgOk(true); load(); }}
                    onClose={() => { setShowForm(false); setEditing(null); }}
                />
            )}
        </div>
    );
}
