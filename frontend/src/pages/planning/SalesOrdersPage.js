// PAGE: Sales Orders
import { useState, useEffect, useCallback } from 'react';

const empty = { customer_id: '', product_id: '', order_quantity: '', uom_id: '', required_date: '', priority: 'normal', notes: '' };

export default function SalesOrdersPage() {
    const [rows,      setRows]      = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products,  setProducts]  = useState([]);
    const [uoms,      setUoms]      = useState([]);
    const [search,    setSearch]    = useState('');
    const [status,    setStatus]    = useState('');
    const [modal,     setModal]     = useState(false);
    const [form,      setForm]      = useState(empty);
    const [editId,    setEditId]    = useState(null);
    const [saving,    setSaving]    = useState(false);
    const [msg,       setMsg]       = useState('');
    const [detail,    setDetail]    = useState(null);

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (status) p.set('status', status);
        const res = await fetch(`/api/planning/sales-orders/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.orders || []);
    }, [search, status]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/masters/customers/', { credentials: 'include' }).then(r => r.json()).then(d => setCustomers(d.customers || []));
        fetch('/api/masters/products/', { credentials: 'include' }).then(r => r.json()).then(d => setProducts(d.products || []));
        fetch('/api/masters/uom/', { credentials: 'include' }).then(r => r.json()).then(d => setUoms(d.uoms || []));
    }, []);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => {
        setForm({ customer_id: r.customer_id, product_id: r.product_id, order_quantity: r.order_quantity,
            uom_id: r.uom_id || '', required_date: r.required_date || '', priority: r.priority || 'normal', notes: r.notes || '' });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/planning/sales-orders/${editId}/` : '/api/planning/sales-orders/';
        const res = await fetch(url, { method: editId ? 'PUT' : 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const action = async (id, act) => {
        if (!window.confirm(`${act} this sales order?`)) return;
        await fetch(`/api/planning/sales-orders/${id}/`, { method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: act }) });
        load();
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });
    const STATUS_COLOR = { draft: '#64748b', confirmed: '#3b82f6', in_production: '#f59e0b', dispatched: '#10b981', cancelled: '#ef4444' };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Sales Orders</h2>
                <button onClick={openAdd} style={btn('#3b82f6')}>+ New Sales Order</button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <input placeholder="Search SO number / customer…" value={search}
                    onChange={e => setSearch(e.target.value)} style={searchS} />
                <select value={status} onChange={e => setStatus(e.target.value)} style={selectS}>
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_production">In Production</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['SO Number', 'Customer', 'Product', 'Qty', 'Required Date', 'Priority', 'Status', 'Actions'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={tdS}><b style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => setDetail(r)}>{r.so_number}</b></td>
                            <td style={tdS}>{r.customer_name}</td>
                            <td style={tdS}>{r.product_name}</td>
                            <td style={tdS}>{r.order_quantity} {r.uom_name}</td>
                            <td style={tdS}>{r.required_date || '—'}</td>
                            <td style={tdS}>
                                <span style={tag(r.priority === 'urgent' ? '#ef4444' : r.priority === 'high' ? '#f59e0b' : '#10b981')}>
                                    {r.priority}
                                </span>
                            </td>
                            <td style={tdS}><span style={tag(STATUS_COLOR[r.status] || '#64748b')}>{r.status}</span></td>
                            <td style={tdS}>
                                {r.status === 'draft' && <>
                                    <button onClick={() => openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                    <button onClick={() => action(r.id, 'confirm')} style={smallBtn('#10b981')}>Confirm</button>
                                </>}
                                {r.status === 'confirmed' && (
                                    <button onClick={() => action(r.id, 'cancel')} style={smallBtn('#ef4444')}>Cancel</button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={8} style={emptyTd}>No sales orders found</td></tr>}
                </tbody></table>
            </div>

            {/* Add/Edit Modal */}
            {modal && (
                <div style={overlay}>
                    <div style={modalBox}>
                        <h3 style={{ margin: '0 0 20px' }}>{editId ? 'Edit Sales Order' : 'New Sales Order'}</h3>
                        <div style={grid2}>
                            <F label="Customer *">
                                <select style={inpS} {...inp('customer_id')}>
                                    <option value="">Select customer…</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                                </select>
                            </F>
                            <F label="Product *">
                                <select style={inpS} {...inp('product_id')}>
                                    <option value="">Select product…</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                                </select>
                            </F>
                            <F label="Order Qty *"><input type="number" style={inpS} {...inp('order_quantity')} /></F>
                            <F label="UOM">
                                <select style={inpS} {...inp('uom_id')}>
                                    <option value="">Select UOM…</option>
                                    {uoms.map(u => <option key={u.id} value={u.id}>{u.uom_name}</option>)}
                                </select>
                            </F>
                            <F label="Required Date"><input type="date" style={inpS} {...inp('required_date')} /></F>
                            <F label="Priority">
                                <select style={inpS} {...inp('priority')}>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </F>
                        </div>
                        <F label="Notes"><textarea style={{ ...inpS, height: 60, resize: 'vertical' }} {...inp('notes')} /></F>
                        {msg && <div style={{ color: '#ef4444', marginTop: 8 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#3b82f6')}>{saving ? 'Saving…' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Panel */}
            {detail && (
                <div style={overlay}>
                    <div style={{ ...modalBox, width: 500 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, color: '#3b82f6' }}>{detail.so_number}</h3>
                            <button onClick={() => setDetail(null)} style={smallBtn('#64748b')}>✕ Close</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[['Customer', detail.customer_name], ['Product', detail.product_name], ['Order Qty', `${detail.order_quantity} ${detail.uom_name || ''}`],
                              ['Required Date', detail.required_date || '—'], ['Priority', detail.priority], ['Status', detail.status],
                              ['Notes', detail.notes || '—']].map(([l, v]) => (
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
const modalBox = { background: '#fff', borderRadius: 12, padding: 28, width: 700, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const grid2    = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
const inpS     = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' };
const searchS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 280, outline: 'none' };
const selectS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' };
const tag      = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const emptyTd  = { textAlign: 'center', padding: 40, color: '#94a3b8' };
