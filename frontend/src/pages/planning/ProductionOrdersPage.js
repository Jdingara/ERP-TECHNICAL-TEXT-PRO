// PAGE: Production Orders
import { useState, useEffect, useCallback } from 'react';

const empty = { so_id: '', product_id: '', planned_quantity: '', uom_id: '', planned_start_date: '', planned_end_date: '', notes: '' };

export default function ProductionOrdersPage() {
    const [rows,     setRows]     = useState([]);
    const [sos,      setSOs]      = useState([]);
    const [products, setProducts] = useState([]);
    const [uoms,     setUoms]     = useState([]);
    const [status,   setStatus]   = useState('');
    const [modal,    setModal]    = useState(false);
    const [form,     setForm]     = useState(empty);
    const [editId,   setEditId]   = useState(null);
    const [saving,   setSaving]   = useState(false);
    const [msg,      setMsg]      = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (status) p.set('status', status);
        const res = await fetch(`/api/planning/production-orders/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.orders || []);
    }, [status]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/planning/sales-orders/?status=confirmed', { credentials: 'include' }).then(r => r.json()).then(d => setSOs(d.orders || []));
        fetch('/api/masters/products/', { credentials: 'include' }).then(r => r.json()).then(d => setProducts(d.products || []));
        fetch('/api/masters/uom/', { credentials: 'include' }).then(r => r.json()).then(d => setUoms(d.uoms || []));
    }, []);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => {
        setForm({ so_id: r.so_id || '', product_id: r.product_id, planned_quantity: r.planned_quantity,
            uom_id: r.uom_id || '', planned_start_date: r.planned_start_date || '',
            planned_end_date: r.planned_end_date || '', notes: r.notes || '' });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/planning/production-orders/${editId}/` : '/api/planning/production-orders/';
        const res = await fetch(url, { method: editId ? 'PUT' : 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const action = async (id, act) => {
        if (!window.confirm(`${act} this production order?`)) return;
        await fetch(`/api/planning/production-orders/${id}/`, { method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: act }) });
        load();
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    const STATUS_COLOR = { draft: '#64748b', released: '#3b82f6', in_progress: '#f59e0b', completed: '#10b981', cancelled: '#ef4444' };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Production Orders</h2>
                <button onClick={openAdd} style={btn('#f59e0b')}>+ New Production Order</button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <select value={status} onChange={e => setStatus(e.target.value)} style={selectS}>
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="released">Released</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['PO Number', 'SO Ref', 'Product', 'Planned Qty', 'Produced Qty', 'Start Date', 'End Date', 'Status', 'Actions'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={tdS}><b style={{ color: '#f59e0b' }}>{r.prod_order_number}</b></td>
                            <td style={tdS}>{r.so_number || '—'}</td>
                            <td style={tdS}>{r.product_name}</td>
                            <td style={tdS}>{r.planned_quantity} {r.uom_name}</td>
                            <td style={tdS}><b style={{ color: '#10b981' }}>{r.produced_qty || 0}</b></td>
                            <td style={tdS}>{r.planned_start_date || '—'}</td>
                            <td style={tdS}>{r.planned_end_date || '—'}</td>
                            <td style={tdS}><span style={tag(STATUS_COLOR[r.status] || '#64748b')}>{r.status}</span></td>
                            <td style={tdS}>
                                {r.status === 'draft' && <>
                                    <button onClick={() => openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                    <button onClick={() => action(r.id, 'release')} style={smallBtn('#10b981')}>Release</button>
                                </>}
                                {r.status === 'released' && (
                                    <button onClick={() => action(r.id, 'cancel')} style={smallBtn('#ef4444')}>Cancel</button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={9} style={emptyTd}>No production orders found</td></tr>}
                </tbody></table>
            </div>

            {modal && (
                <div style={overlay}>
                    <div style={modalBox}>
                        <h3 style={{ margin: '0 0 20px' }}>{editId ? 'Edit Production Order' : 'New Production Order'}</h3>
                        <div style={grid2}>
                            <F label="Against Sales Order">
                                <select style={inpS} {...inp('so_id')}>
                                    <option value="">None / Independent</option>
                                    {sos.map(s => <option key={s.id} value={s.id}>{s.so_number} — {s.customer_name}</option>)}
                                </select>
                            </F>
                            <F label="Product *">
                                <select style={inpS} {...inp('product_id')}>
                                    <option value="">Select product…</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                </select>
                            </F>
                            <F label="Planned Qty *"><input type="number" style={inpS} {...inp('planned_quantity')} /></F>
                            <F label="UOM">
                                <select style={inpS} {...inp('uom_id')}>
                                    <option value="">Select UOM…</option>
                                    {uoms.map(u => <option key={u.id} value={u.id}>{u.uom_name}</option>)}
                                </select>
                            </F>
                            <F label="Planned Start Date"><input type="date" style={inpS} {...inp('planned_start_date')} /></F>
                            <F label="Planned End Date"><input type="date" style={inpS} {...inp('planned_end_date')} /></F>
                        </div>
                        <F label="Notes"><textarea style={{ ...inpS, height: 60, resize: 'vertical' }} {...inp('notes')} /></F>
                        {msg && <div style={{ color: '#ef4444', marginTop: 8 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#f59e0b')}>{saving ? 'Saving…' : 'Save'}</button>
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
const modalBox = { background: '#fff', borderRadius: 12, padding: 28, width: 700, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const grid2    = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
const inpS     = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' };
const selectS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' };
const tag      = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const emptyTd  = { textAlign: 'center', padding: 40, color: '#94a3b8' };
