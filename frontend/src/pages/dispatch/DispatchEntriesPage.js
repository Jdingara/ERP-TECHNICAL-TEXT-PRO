// PAGE: Dispatch Entries — Create and manage dispatch records
import { useState, useEffect, useCallback } from 'react';

const emptyForm = {
    customer_id: '', dispatch_date: new Date().toISOString().slice(0, 10),
    vehicle_number: '', driver_name: '', lr_number: '', transporter: '', notes: '',
};

export default function DispatchEntriesPage() {
    const [rows,      setRows]      = useState([]);
    const [customers, setCustomers] = useState([]);
    const [batches,   setBatches]   = useState([]);   // finished batches available for dispatch
    const [search,    setSearch]    = useState('');
    const [status,    setStatus]    = useState('');
    const [modal,     setModal]     = useState(false);
    const [form,      setForm]      = useState(emptyForm);
    const [pickedBatches, setPickedBatches] = useState([]);  // [{batch_id, batch_number, product_name, balance_qty, dispatch_qty}]
    const [saving,    setSaving]    = useState(false);
    const [msg,       setMsg]       = useState('');
    const [detail,    setDetail]    = useState(null);

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (status) p.set('status', status);
        const res = await fetch(`/api/dispatch/entries/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.dispatches || []);
    }, [search, status]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/masters/customers/', { credentials: 'include' }).then(r => r.json()).then(d => setCustomers(d.customers || []));
        fetch('/api/production/batches/?status=finished', { credentials: 'include' }).then(r => r.json()).then(d => setBatches(d.batches || []));
    }, []);

    const openAdd = () => { setForm(emptyForm); setPickedBatches([]); setMsg(''); setModal(true); };

    const addBatch = (batch) => {
        if (pickedBatches.find(p => p.batch_id === batch.id)) return;
        setPickedBatches(prev => [...prev, {
            batch_id: batch.id, batch_number: batch.batch_number,
            product_name: batch.product_name, balance_qty: batch.balance_qty,
            uom_name: batch.uom_name || '', dispatch_qty: '',
        }]);
    };

    const removeBatch = (batch_id) => setPickedBatches(prev => prev.filter(p => p.batch_id !== batch_id));
    const updateBatchQty = (batch_id, val) => setPickedBatches(prev => prev.map(p => p.batch_id === batch_id ? { ...p, dispatch_qty: val } : p));

    const save = async () => {
        if (!form.customer_id) { setMsg('Customer is required'); return; }
        if (pickedBatches.length === 0) { setMsg('Add at least one batch to dispatch'); return; }
        const invalid = pickedBatches.find(p => !p.dispatch_qty || Number(p.dispatch_qty) <= 0);
        if (invalid) { setMsg(`Enter dispatch quantity for batch ${invalid.batch_number}`); return; }
        const over = pickedBatches.find(p => Number(p.dispatch_qty) > Number(p.balance_qty));
        if (over) { setMsg(`Dispatch qty for ${over.batch_number} exceeds balance (${over.balance_qty})`); return; }

        setSaving(true);
        const payload = { ...form, batches: pickedBatches.map(p => ({ batch_id: p.batch_id, dispatch_qty: p.dispatch_qty })) };
        const res = await fetch('/api/dispatch/entries/', { method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setSaving(false);
        if (res.ok) {
            setModal(false); load();
            fetch('/api/production/batches/?status=finished', { credentials: 'include' }).then(r => r.json()).then(d => setBatches(d.batches || []));
            const d = await res.json();
            if (d.dispatch_number) alert(`✅ Dispatch created: ${d.dispatch_number}`);
        } else { const d = await res.json(); setMsg(d.error || 'Error creating dispatch'); }
    };

    const confirmDispatch = async (id) => {
        if (!window.confirm('Confirm this dispatch? Batch quantities will be deducted.')) return;
        const res = await fetch(`/api/dispatch/entries/${id}/confirm/`, { method: 'POST', credentials: 'include' });
        if (res.ok) { load(); } else { const d = await res.json(); alert(d.error || 'Error'); }
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });
    const STATUS_COLOR = { draft: '#64748b', confirmed: '#10b981', cancelled: '#ef4444' };
    const unselectedBatches = batches.filter(b => !pickedBatches.find(p => p.batch_id === b.id));

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Dispatch Entries</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Ready-to-dispatch batches: <b style={{ color: '#10b981' }}>{batches.length}</b></p>
                </div>
                <button onClick={openAdd} style={btn('#8b5cf6')}>+ New Dispatch</button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <input placeholder="Search dispatch no / customer…" value={search}
                    onChange={e => setSearch(e.target.value)} style={searchS} />
                <select value={status} onChange={e => setStatus(e.target.value)} style={selectS}>
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['Dispatch No', 'Date', 'Customer', 'Vehicle', 'LR Number', 'Transporter', 'Status', 'Actions'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={tdS}><b style={{ color: '#8b5cf6', cursor: 'pointer' }} onClick={() => setDetail(r)}>{r.dispatch_number}</b></td>
                            <td style={tdS}>{r.dispatch_date}</td>
                            <td style={tdS}>{r.customer_name}</td>
                            <td style={tdS}>{r.vehicle_number || '—'}</td>
                            <td style={tdS}>{r.lr_number || '—'}</td>
                            <td style={tdS}>{r.transporter || '—'}</td>
                            <td style={tdS}><span style={tag(STATUS_COLOR[r.status] || '#64748b')}>{r.status}</span></td>
                            <td style={tdS}>
                                <button onClick={() => setDetail(r)} style={smallBtn('#3b82f6')}>View</button>
                                {r.status === 'draft' && (
                                    <button onClick={() => confirmDispatch(r.id)} style={smallBtn('#10b981')}>Confirm</button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={8} style={emptyTd}>No dispatches yet</td></tr>}
                </tbody></table>
            </div>

            {/* New Dispatch Modal */}
            {modal && (
                <div style={overlay}>
                    <div style={{ ...modalBox, width: 860 }}>
                        <h3 style={{ margin: '0 0 20px', color: '#8b5cf6' }}>New Dispatch Entry</h3>

                        <div style={grid3}>
                            <F label="Customer *">
                                <select style={inpS} {...inp('customer_id')}>
                                    <option value="">Select customer…</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                                </select>
                            </F>
                            <F label="Dispatch Date *"><input type="date" style={inpS} {...inp('dispatch_date')} /></F>
                            <F label="Vehicle Number"><input style={inpS} placeholder="e.g. TN01AB1234" {...inp('vehicle_number')} /></F>
                            <F label="Driver Name"><input style={inpS} {...inp('driver_name')} /></F>
                            <F label="LR Number"><input style={inpS} {...inp('lr_number')} /></F>
                            <F label="Transporter"><input style={inpS} {...inp('transporter')} /></F>
                        </div>

                        {/* Batch Picker */}
                        <div style={{ border: '2px solid #8b5cf6', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#8b5cf6', marginBottom: 12 }}>
                                📦 Select Batches to Dispatch
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <select style={{ ...inpS, maxWidth: 480 }}
                                    onChange={e => {
                                        const b = batches.find(x => String(x.id) === e.target.value);
                                        if (b) { addBatch(b); e.target.value = ''; }
                                    }}>
                                    <option value="">+ Add batch…</option>
                                    {unselectedBatches.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.batch_number} — {b.product_name} (Balance: {b.balance_qty} {b.uom_name})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {pickedBatches.length === 0 ? (
                                <div style={{ color: '#94a3b8', fontSize: 13, padding: '8px 0' }}>No batches selected yet.</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead><tr style={{ background: '#f5f3ff' }}>
                                        <th style={{ ...thS, fontSize: 11, color: '#5b21b6' }}>Batch No</th>
                                        <th style={{ ...thS, fontSize: 11, color: '#5b21b6' }}>Product</th>
                                        <th style={{ ...thS, fontSize: 11, color: '#5b21b6' }}>Balance</th>
                                        <th style={{ ...thS, fontSize: 11, color: '#5b21b6' }}>Dispatch Qty *</th>
                                        <th style={{ ...thS, fontSize: 11 }}></th>
                                    </tr></thead>
                                    <tbody>
                                        {pickedBatches.map(p => (
                                            <tr key={p.batch_id} style={{ borderBottom: '1px solid #ede9fe' }}>
                                                <td style={tdS}><b style={{ color: '#3b82f6' }}>{p.batch_number}</b></td>
                                                <td style={tdS}>{p.product_name}</td>
                                                <td style={tdS}>{p.balance_qty} {p.uom_name}</td>
                                                <td style={tdS}>
                                                    <input type="number" min="0.01" max={p.balance_qty}
                                                        value={p.dispatch_qty}
                                                        onChange={e => updateBatchQty(p.batch_id, e.target.value)}
                                                        style={{ width: 100, padding: '5px 8px', borderRadius: 6,
                                                            border: `1px solid ${Number(p.dispatch_qty) > Number(p.balance_qty) ? '#ef4444' : '#e2e8f0'}`,
                                                            fontSize: 13 }}
                                                    />
                                                </td>
                                                <td style={tdS}>
                                                    <button onClick={() => removeBatch(p.batch_id)}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <F label="Notes"><textarea style={{ ...inpS, height: 60, resize: 'vertical' }} {...inp('notes')} /></F>
                        {msg && <div style={{ color: '#ef4444', marginTop: 8, fontWeight: 600 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#8b5cf6')}>
                                {saving ? 'Saving…' : '🚚 Create Dispatch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detail && (
                <div style={overlay}>
                    <div style={{ ...modalBox, width: 540 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, color: '#8b5cf6' }}>{detail.dispatch_number}</h3>
                            <button onClick={() => setDetail(null)} style={smallBtn('#64748b')}>✕ Close</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[['Customer', detail.customer_name], ['Dispatch Date', detail.dispatch_date],
                              ['Vehicle', detail.vehicle_number || '—'], ['Driver', detail.driver_name || '—'],
                              ['LR Number', detail.lr_number || '—'], ['Transporter', detail.transporter || '—'],
                              ['Status', detail.status], ['Notes', detail.notes || '—'],
                            ].map(([l, v]) => (
                                <div key={l} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>{l}</div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const F        = ({ label, children }) => (<div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{label}</label>{children}</div>);
const btn      = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const tableS   = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thS      = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdS      = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const overlay  = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 };
const modalBox = { background: '#fff', borderRadius: 12, padding: 28, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const grid3    = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 };
const inpS     = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' };
const searchS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 260, outline: 'none' };
const selectS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' };
const tag      = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const emptyTd  = { textAlign: 'center', padding: 40, color: '#94a3b8' };
