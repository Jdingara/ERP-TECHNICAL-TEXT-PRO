// PAGE: Customer Order Detail — Tabs: Overview | Items | Factory Orders | T&A | Costing
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const CO_STATUS = {
    draft: '#64748b', confirmed: '#3b82f6', in_production: '#f59e0b',
    inspected: '#8b5cf6', shipped: '#06b6d4', delivered: '#10b981', cancelled: '#94a3b8',
};
const CO_STATUSES = Object.entries(CO_STATUS).map(([v]) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

const FO_STATUS = {
    draft: '#64748b', sent: '#3b82f6', confirmed: '#10b981', cutting: '#f59e0b',
    sewing: '#f97316', finishing: '#8b5cf6', qc_passed: '#06b6d4',
    ready_to_ship: '#ec4899', shipped: '#10b981', cancelled: '#94a3b8',
};
const FO_STATUSES = Object.entries(FO_STATUS).map(([v]) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

const TA_STATUS_COLOR = { pending: '#64748b', in_progress: '#f59e0b', completed: '#10b981', delayed: '#ef4444' };

export default function CustomerOrderDetailPage() {
    const { id } = useParams();
    const nav = useNavigate();
    const pt = usePageTheme();
    const inpS = { ...pt.inp };
    const [co, setCo]     = useState(null);
    const [tab, setTab]   = useState('overview');
    const [loading, setLoading] = useState(true);
    const [vendors, setVendors] = useState([]);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/orders/co/${id}/`, { credentials: 'include' });
        const d = await res.json();
        setCo(d.customer_order);
        setLoading(false);
    }, [id]);

    const loadVendors = useCallback(async () => {
        const res = await fetch('/api/masters/vendors/', { credentials: 'include' });
        const d = await res.json();
        setVendors(d.vendors || []);
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadVendors(); }, [loadVendors]);

    if (loading) return <div style={{ padding: 40, color: pt.colors.text }}>Loading…</div>;
    if (!co) return <div style={{ padding: 40, color: '#ef4444' }}>Order not found.</div>;

    const statusColor = CO_STATUS[co.status] || '#64748b';

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
                <button onClick={() => nav('/orders/co')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: pt.colors.dimText, fontSize: 13 }}>← Back</button>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{co.co_number}</h2>
                <span style={tag(statusColor)}>{co.status.replace(/_/g, ' ')}</span>
                {co.customer_po_ref && <span style={{ fontSize: 13, color: pt.colors.dimText }}>Customer PO: {co.customer_po_ref}</span>}
            </div>
            <p style={{ margin: '0 0 20px', color: pt.colors.dimText, fontSize: 14 }}>{co.customer_name} {co.brand_name ? `· ${co.brand_name}` : ''}</p>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `2px solid ${pt.colors.border || '#e2e8f0'}`, marginBottom: 24 }}>
                {['overview', 'items', 'factory_orders', 'ta', 'costing'].map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: tab === t ? 700 : 400, fontSize: 13, color: tab === t ? '#10b981' : pt.colors.dimText, borderBottom: tab === t ? '2px solid #10b981' : '2px solid transparent', marginBottom: -2 }}>
                        { { overview: 'Overview', items: `Items (${co.items?.length || 0})`, factory_orders: `Factory Orders (${co.factory_orders?.length || 0})`, ta: `T&A (${co.ta_milestones?.length || 0})`, costing: 'Costing' }[t] }
                    </button>
                ))}
            </div>

            {tab === 'overview'        && <OverviewTab co={co} inpS={inpS} pt={pt} reload={load} />}
            {tab === 'items'           && <ItemsTab co={co} inpS={inpS} pt={pt} reload={load} />}
            {tab === 'factory_orders'  && <FactoryOrdersTab co={co} inpS={inpS} pt={pt} reload={load} vendors={vendors} />}
            {tab === 'ta'              && <TATab co={co} inpS={inpS} pt={pt} reload={load} />}
            {tab === 'costing'         && <CostingTab co={co} inpS={inpS} pt={pt} />}
        </div>
    );
}


// ── Overview Tab ──────────────────────────────────────────────
function OverviewTab({ co, inpS, pt, reload }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ status: co.status, customer_po_ref: co.customer_po_ref, ship_by_date: co.ship_by_date || '', ex_factory_date: co.ex_factory_date || '', currency: co.currency, notes: co.notes });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        await fetch(`/api/orders/co/${co.id}/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, ship_by_date: form.ship_by_date || null, ex_factory_date: form.ex_factory_date || null }),
        });
        setSaving(false); setEditing(false); reload();
    };
    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    const totalQty = co.items?.reduce((s, i) => s + parseFloat(i.quantity || 0), 0) || 0;
    const totalVal = co.items?.reduce((s, i) => s + parseFloat(i.line_total || 0), 0) || 0;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                {!editing
                    ? <button onClick={() => setEditing(true)} style={smallBtn('#3b82f6')}>Edit</button>
                    : <><button onClick={() => setEditing(false)} style={smallBtn('#64748b')}>Cancel</button>
                       <button onClick={save} disabled={saving} style={{ ...smallBtn('#10b981'), marginLeft: 8 }}>{saving ? 'Saving…' : 'Save'}</button></>
                }
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Total Qty', value: totalQty.toLocaleString() },
                    { label: 'Total Value', value: `${co.currency} ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                    { label: 'Factory Orders', value: co.factory_orders?.length || 0 },
                    { label: 'T&A Milestones', value: co.ta_milestones?.length || 0 },
                ].map(c => (
                    <div key={c.label} style={{ background: pt.colors.card, borderRadius: 12, padding: '16px 20px', border: `1px solid ${pt.colors.border || '#e2e8f0'}` }}>
                        <div style={{ fontSize: 12, color: pt.colors.dimText, marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{c.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {editing ? (
                    <>
                        <FLabel label="Status"><select style={inpS} {...inp('status')}>{CO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></FLabel>
                        <FLabel label="Currency"><select style={inpS} {...inp('currency')}>{['USD','EUR','GBP','AUD','INR'].map(c => <option key={c}>{c}</option>)}</select></FLabel>
                        <FLabel label="Customer PO Ref"><input style={inpS} {...inp('customer_po_ref')} /></FLabel>
                        <FLabel label="Ship By Date"><input type="date" style={inpS} {...inp('ship_by_date')} /></FLabel>
                        <FLabel label="Ex-Factory Date"><input type="date" style={inpS} {...inp('ex_factory_date')} /></FLabel>
                        <FLabel label="Notes" span={2}><textarea style={{ ...inpS, height: 70, resize: 'vertical', width: '100%' }} {...inp('notes')} /></FLabel>
                    </>
                ) : (
                    <>
                        <InfoRow label="CO Number" value={co.co_number} bold />
                        <InfoRow label="Status" value={<span style={tag(CO_STATUS[co.status] || '#64748b')}>{co.status.replace(/_/g,' ')}</span>} />
                        <InfoRow label="Customer" value={co.customer_name || '—'} />
                        <InfoRow label="Brand" value={co.brand_name || '—'} />
                        <InfoRow label="Category" value={co.category_name || '—'} />
                        <InfoRow label="Currency" value={co.currency} />
                        <InfoRow label="Customer PO Ref" value={co.customer_po_ref || '—'} />
                        <InfoRow label="Linked PD" value={co.pd_number || '—'} />
                        <InfoRow label="Order Date" value={co.order_date} />
                        <InfoRow label="Ship By" value={co.ship_by_date || '—'} />
                        <InfoRow label="Ex-Factory" value={co.ex_factory_date || '—'} />
                        <InfoRow label="Notes" value={co.notes || '—'} span={2} />
                    </>
                )}
            </div>
        </div>
    );
}


// ── Items Tab ─────────────────────────────────────────────────
function ItemsTab({ co, inpS, pt, reload }) {
    const [addModal, setAddModal] = useState(false);
    const [form, setForm] = useState({ style_ref: '', description: '', color: '', size: '', quantity: '', unit_price: '' });
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const addItem = async () => {
        setSaving(true);
        await fetch(`/api/orders/co/${co.id}/items/`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, unit_price: form.unit_price || null }),
        });
        setSaving(false); setAddModal(false); setForm({ style_ref: '', description: '', color: '', size: '', quantity: '', unit_price: '' }); reload();
    };

    const updateItem = async (id) => {
        await fetch(`/api/orders/co-items/${id}/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...editForm, unit_price: editForm.unit_price || null }),
        });
        setEditingId(null); reload();
    };

    const deleteItem = async (id) => {
        if (!window.confirm('Delete this item?')) return;
        await fetch(`/api/orders/co-items/${id}/`, { method: 'DELETE', credentials: 'include' });
        reload();
    };

    const thS = { ...pt.th, textAlign: 'left' };
    const tdS = { ...pt.cell, verticalAlign: 'middle' };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={() => setAddModal(true)} style={btn('#3b82f6')}>+ Add Item</button>
            </div>
            <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr>
                        {['Style Ref', 'Description', 'Color', 'Size', 'Qty', 'Unit Price', 'Line Total', ''].map(h => <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {(co.items || []).map(item => (
                            <tr key={item.id}>
                                {editingId === item.id ? (
                                    <>
                                        {['style_ref','description','color','size'].map(f => (
                                            <td key={f} style={tdS}><input style={{ ...inpS, minWidth: 80 }} value={editForm[f]} onChange={e => setEditForm(p => ({ ...p, [f]: e.target.value }))} /></td>
                                        ))}
                                        <td style={tdS}><input type="number" style={{ ...inpS, width: 80 }} value={editForm.quantity} onChange={e => setEditForm(p => ({ ...p, quantity: e.target.value }))} /></td>
                                        <td style={tdS}><input type="number" style={{ ...inpS, width: 90 }} value={editForm.unit_price} onChange={e => setEditForm(p => ({ ...p, unit_price: e.target.value }))} /></td>
                                        <td style={tdS}>—</td>
                                        <td style={tdS}>
                                            <button onClick={() => updateItem(item.id)} style={smallBtn('#10b981')}>Save</button>
                                            <button onClick={() => setEditingId(null)} style={smallBtn('#64748b')}>Cancel</button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ ...tdS, color: pt.colors.dimText }}>{item.style_ref || '—'}</td>
                                        <td style={tdS}>{item.description}</td>
                                        <td style={tdS}>{item.color || '—'}</td>
                                        <td style={tdS}>{item.size || '—'}</td>
                                        <td style={tdS}>{item.quantity}</td>
                                        <td style={tdS}>{item.unit_price ? `${co.currency} ${item.unit_price}` : '—'}</td>
                                        <td style={{ ...tdS, fontWeight: 600 }}>{item.line_total > 0 ? `${co.currency} ${Number(item.line_total).toLocaleString()}` : '—'}</td>
                                        <td style={tdS}>
                                            <button onClick={() => { setEditingId(item.id); setEditForm({ style_ref: item.style_ref, description: item.description, color: item.color, size: item.size, quantity: item.quantity, unit_price: item.unit_price || '' }); }} style={smallBtn('#3b82f6')}>Edit</button>
                                            <button onClick={() => deleteItem(item.id)} style={smallBtn('#ef4444')}>Del</button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                        {(co.items || []).length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: pt.colors.muted }}>No items</td></tr>}
                        {(co.items || []).length > 0 && (
                            <tr style={{ borderTop: `2px solid ${pt.colors.border || '#e2e8f0'}`, fontWeight: 700 }}>
                                <td colSpan={4} style={tdS}></td>
                                <td style={tdS}>{(co.items || []).reduce((s, i) => s + parseFloat(i.quantity || 0), 0).toLocaleString()}</td>
                                <td style={tdS}></td>
                                <td style={tdS}>{co.currency} {(co.items || []).reduce((s, i) => s + parseFloat(i.line_total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={tdS}></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {addModal && (
                <div style={overlay}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 560 }}>
                        <h3 style={{ margin: '0 0 16px' }}>Add Item</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <FLabel label="Style Ref"><input style={inpS} value={form.style_ref} onChange={e => setForm(p => ({ ...p, style_ref: e.target.value }))} /></FLabel>
                            <FLabel label="Description *"><input style={inpS} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></FLabel>
                            <FLabel label="Color"><input style={inpS} value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} /></FLabel>
                            <FLabel label="Size"><input style={inpS} value={form.size} onChange={e => setForm(p => ({ ...p, size: e.target.value }))} /></FLabel>
                            <FLabel label="Quantity *"><input type="number" style={inpS} value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></FLabel>
                            <FLabel label={`Unit Price (${co.currency})`}><input type="number" style={inpS} value={form.unit_price} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} /></FLabel>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setAddModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={addItem} disabled={saving} style={btn('#3b82f6')}>{saving ? 'Adding…' : 'Add Item'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


// ── Factory Orders Tab ────────────────────────────────────────
function FactoryOrdersTab({ co, inpS, pt, reload, vendors }) {
    const nav = useNavigate();
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ vendor_id: '', order_date: new Date().toISOString().split('T')[0], ex_factory_date: '', status: 'sent', currency: 'INR', notes: '', items: [] });
    const [saving, setSaving] = useState(false);

    const addFOItem = () => setForm(p => ({ ...p, items: [...p.items, { style_ref: '', description: '', color: '', size: '', quantity: '', unit_cost: '' }] }));
    const removeFOItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
    const updateFOItem = (idx, f, v) => setForm(p => { const items = [...p.items]; items[idx] = { ...items[idx], [f]: v }; return { ...p, items }; });

    const save = async () => {
        setSaving(true);
        const payload = { ...form, customer_order_id: co.id, vendor_id: form.vendor_id || null, ex_factory_date: form.ex_factory_date || null, items: form.items.map(i => ({ ...i, unit_cost: i.unit_cost || null })) };
        await fetch('/api/orders/fo/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        setSaving(false); setModal(false); reload();
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={() => setModal(true)} style={btn('#f59e0b')}>+ Create Factory Order</button>
            </div>

            {(co.factory_orders || []).length === 0 && <div style={{ color: pt.colors.muted, textAlign: 'center', padding: 40 }}>No factory orders yet.</div>}

            {(co.factory_orders || []).map(fo => {
                const sc = FO_STATUS[fo.status] || '#64748b';
                return (
                    <div key={fo.id} style={{ background: pt.colors.card, border: `1px solid ${pt.colors.border || '#e2e8f0'}`, borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: 15, color: '#f59e0b' }}>{fo.fo_number}</span>
                                <span style={{ marginLeft: 12, color: pt.colors.dimText, fontSize: 13 }}>{fo.vendor_name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={tag(sc)}>{fo.status.replace(/_/g,' ')}</span>
                                <FOStatusUpdate fo={fo} inpS={inpS} reload={reload} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12, fontSize: 13 }}>
                            <div><span style={{ color: pt.colors.dimText }}>Order Date:</span> {fo.order_date}</div>
                            <div><span style={{ color: pt.colors.dimText }}>Ex-Factory:</span> {fo.ex_factory_date || '—'}</div>
                            <div><span style={{ color: pt.colors.dimText }}>Qty:</span> {fo.total_qty}</div>
                            <div><span style={{ color: pt.colors.dimText }}>Cost:</span> {fo.currency} {Number(fo.total_cost).toLocaleString()}</div>
                        </div>
                    </div>
                );
            })}

            {modal && (
                <div style={overlay}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '80%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 16px' }}>Create Factory Order</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <FLabel label="Vendor *">
                                <select style={inpS} value={form.vendor_id} onChange={e => setForm(p => ({ ...p, vendor_id: e.target.value }))}>
                                    <option value="">— Select Vendor/Factory —</option>
                                    {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                                </select>
                            </FLabel>
                            <FLabel label="Status"><select style={inpS} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>{FO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></FLabel>
                            <FLabel label="Order Date *"><input type="date" style={inpS} value={form.order_date} onChange={e => setForm(p => ({ ...p, order_date: e.target.value }))} /></FLabel>
                            <FLabel label="Ex-Factory Date"><input type="date" style={inpS} value={form.ex_factory_date} onChange={e => setForm(p => ({ ...p, ex_factory_date: e.target.value }))} /></FLabel>
                            <FLabel label="Currency"><select style={inpS} value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>{['INR','USD','EUR'].map(c => <option key={c}>{c}</option>)}</select></FLabel>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><strong style={{ fontSize: 14 }}>Items</strong><button onClick={addFOItem} style={smallBtn('#f59e0b')}>+ Item</button></div>
                            {form.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                                    <FLabel label={idx === 0 ? 'Style' : ''}><input style={inpS} value={item.style_ref} onChange={e => updateFOItem(idx, 'style_ref', e.target.value)} /></FLabel>
                                    <FLabel label={idx === 0 ? 'Description *' : ''}><input style={inpS} value={item.description} onChange={e => updateFOItem(idx, 'description', e.target.value)} /></FLabel>
                                    <FLabel label={idx === 0 ? 'Color' : ''}><input style={inpS} value={item.color} onChange={e => updateFOItem(idx, 'color', e.target.value)} /></FLabel>
                                    <FLabel label={idx === 0 ? 'Size' : ''}><input style={inpS} value={item.size} onChange={e => updateFOItem(idx, 'size', e.target.value)} /></FLabel>
                                    <FLabel label={idx === 0 ? 'Qty *' : ''}><input type="number" style={inpS} value={item.quantity} onChange={e => updateFOItem(idx, 'quantity', e.target.value)} /></FLabel>
                                    <FLabel label={idx === 0 ? 'Unit Cost' : ''}><input type="number" style={inpS} value={item.unit_cost} onChange={e => updateFOItem(idx, 'unit_cost', e.target.value)} /></FLabel>
                                    <button onClick={() => removeFOItem(idx)} style={{ ...smallBtn('#ef4444'), marginBottom: 2 }}>✕</button>
                                </div>
                            ))}
                        </div>
                        <FLabel label="Notes"><textarea style={{ ...inpS, height: 60, resize: 'vertical', width: '100%' }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></FLabel>
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#f59e0b')}>{saving ? 'Creating…' : 'Create Factory Order'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FOStatusUpdate({ fo, inpS, reload }) {
    const [editing, setEditing] = useState(false);
    const [status, setStatus] = useState(fo.status);
    const update = async () => {
        await fetch(`/api/orders/fo/${fo.id}/`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        setEditing(false); reload();
    };
    if (!editing) return <button onClick={() => setEditing(true)} style={smallBtn('#3b82f6')}>Update Status</button>;
    return (
        <div style={{ display: 'flex', gap: 6 }}>
            <select style={{ ...inpS, padding: '3px 8px', fontSize: 12 }} value={status} onChange={e => setStatus(e.target.value)}>
                {FO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={update} style={smallBtn('#10b981')}>Save</button>
            <button onClick={() => setEditing(false)} style={smallBtn('#64748b')}>✕</button>
        </div>
    );
}


// ── T&A Tab ───────────────────────────────────────────────────
function TATab({ co, inpS, pt, reload }) {
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ milestone_name: '', planned_date: '', responsible: '', notes: '' });
    const [saving, setSaving] = useState(false);

    const TEMPLATE_MILESTONES = [
        'Order Confirmation', 'Fabric Booking', 'Trim Booking', 'Fabric In-house',
        'Cutting Start', 'Sewing Start', 'Finishing', 'Pre-Production Sample',
        'PP Sample Approval', 'Production Complete', 'Pre-Shipment Inspection',
        'Ex-Factory', 'Vessel Booking', 'Shipment', 'Delivery',
    ];

    const addMilestone = async () => {
        setSaving(true);
        await fetch('/api/orders/ta-milestones/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, customer_order_id: co.id }),
        });
        setSaving(false); setModal(false); setForm({ milestone_name: '', planned_date: '', responsible: '', notes: '' }); reload();
    };

    const updateMilestone = async (id, data) => {
        await fetch(`/api/orders/ta-milestones/${id}/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
        });
        reload();
    };

    const deleteMilestone = async (id) => {
        if (!window.confirm('Delete milestone?')) return;
        await fetch(`/api/orders/ta-milestones/${id}/`, { method: 'DELETE', credentials: 'include' });
        reload();
    };

    const milestones = co.ta_milestones || [];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={() => setModal(true)} style={btn('#ec4899')}>+ Add Milestone</button>
            </div>

            {milestones.length === 0 && <div style={{ color: pt.colors.muted, textAlign: 'center', padding: 40 }}>No T&A milestones. Add milestones to track production timeline.</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {milestones.map((m, idx) => {
                    const sc = TA_STATUS_COLOR[m.status] || '#64748b';
                    const isLate = !m.actual_date && m.planned_date < new Date().toISOString().split('T')[0];
                    return (
                        <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 140px 140px 140px 100px auto', gap: 12, alignItems: 'center', background: pt.colors.card, borderRadius: 10, padding: '12px 16px', border: `1px solid ${isLate && m.status === 'pending' ? '#ef444440' : pt.colors.border || '#e2e8f0'}` }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${sc}20`, border: `2px solid ${sc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: sc, fontWeight: 700 }}>{idx + 1}</div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{m.milestone_name}{m.responsible && <span style={{ fontWeight: 400, color: pt.colors.dimText, fontSize: 12 }}> · {m.responsible}</span>}</div>
                            <div style={{ fontSize: 12, color: pt.colors.dimText }}>Planned: <strong style={{ color: isLate && m.status === 'pending' ? '#ef4444' : pt.colors.text }}>{m.planned_date}</strong></div>
                            <div style={{ fontSize: 12, color: pt.colors.dimText }}>Actual: {m.actual_date ? <strong style={{ color: '#10b981' }}>{m.actual_date}</strong> : '—'}</div>
                            <div>
                                <select style={{ ...inpS, padding: '3px 8px', fontSize: 11 }} value={m.status} onChange={e => updateMilestone(m.id, { status: e.target.value })}>
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="delayed">Delayed</option>
                                </select>
                            </div>
                            <span style={tag(sc)}>{m.status.replace(/_/g,' ')}</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {!m.actual_date && (
                                    <button onClick={() => { const d = window.prompt('Actual date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]); if (d) updateMilestone(m.id, { actual_date: d, status: 'completed' }); }} style={smallBtn('#10b981')}>✓</button>
                                )}
                                <button onClick={() => deleteMilestone(m.id)} style={smallBtn('#ef4444')}>✕</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {modal && (
                <div style={overlay}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 500 }}>
                        <h3 style={{ margin: '0 0 16px' }}>Add T&A Milestone</h3>
                        <FLabel label="Milestone Name *">
                            <select style={{ ...inpS, marginBottom: 8 }} value={form.milestone_name} onChange={e => setForm(p => ({ ...p, milestone_name: e.target.value }))}>
                                <option value="">— Select or type below —</option>
                                {TEMPLATE_MILESTONES.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <input style={inpS} placeholder="Or type custom milestone" value={form.milestone_name} onChange={e => setForm(p => ({ ...p, milestone_name: e.target.value }))} />
                        </FLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '12px 0' }}>
                            <FLabel label="Planned Date *"><input type="date" style={inpS} value={form.planned_date} onChange={e => setForm(p => ({ ...p, planned_date: e.target.value }))} /></FLabel>
                            <FLabel label="Responsible"><input style={inpS} placeholder="Factory / BHF / Agent" value={form.responsible} onChange={e => setForm(p => ({ ...p, responsible: e.target.value }))} /></FLabel>
                        </div>
                        <FLabel label="Notes"><textarea style={{ ...inpS, height: 60, resize: 'vertical', width: '100%' }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></FLabel>
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={addMilestone} disabled={saving} style={btn('#ec4899')}>{saving ? 'Adding…' : 'Add Milestone'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


// ── Costing Tab ───────────────────────────────────────────────
function CostingTab({ co, inpS, pt }) {
    const [sheet, setSheet]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg]       = useState('');

    const emptySheet = {
        currency: co.currency || 'USD',
        fob_price_per_pc: '', total_quantity: co.items?.reduce((s, i) => s + parseFloat(i.quantity || 0), 0) || '',
        fabric_cost: '', trim_cost: '', embroidery_print: '', washing_finishing: '',
        cm_cost: '', testing_cost: '', inspection_cost: '', freight_cost: '', other_cost: '',
        commission_pct: '', notes: '',
    };
    const [form, setForm] = useState(emptySheet);

    const load = async () => {
        setLoading(true);
        const res = await fetch(`/api/shipment/costing/${co.id}/`, { credentials: 'include' });
        const d = await res.json();
        if (d.costing_sheet) {
            setSheet(d.costing_sheet);
            setForm({
                currency: d.costing_sheet.currency,
                fob_price_per_pc: d.costing_sheet.fob_price_per_pc,
                total_quantity: d.costing_sheet.total_quantity,
                fabric_cost: d.costing_sheet.fabric_cost,
                trim_cost: d.costing_sheet.trim_cost,
                embroidery_print: d.costing_sheet.embroidery_print,
                washing_finishing: d.costing_sheet.washing_finishing,
                cm_cost: d.costing_sheet.cm_cost,
                testing_cost: d.costing_sheet.testing_cost,
                inspection_cost: d.costing_sheet.inspection_cost,
                freight_cost: d.costing_sheet.freight_cost,
                other_cost: d.costing_sheet.other_cost,
                commission_pct: d.costing_sheet.commission_pct,
                notes: d.costing_sheet.notes,
            });
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, [co.id]);

    const save = async () => {
        setSaving(true); setMsg('');
        const payload = {};
        for (const k of Object.keys(form)) payload[k] = isNaN(form[k]) || form[k] === '' ? form[k] : Number(form[k]);
        const res = await fetch(`/api/shipment/costing/${co.id}/`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        setSaving(false);
        if (res.ok) { const d = await res.json(); setSheet(d.costing_sheet); setMsg('Saved.'); }
        else setMsg('Error saving.');
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    // Live preview from form values
    const fob  = parseFloat(form.fob_price_per_pc) || 0;
    const qty  = parseInt(form.total_quantity)     || 0;
    const costs = ['fabric_cost','trim_cost','embroidery_print','washing_finishing','cm_cost','testing_cost','inspection_cost','freight_cost','other_cost'];
    const totalCostPP = costs.reduce((s, k) => s + (parseFloat(form[k]) || 0), 0);
    const commPP = fob * (parseFloat(form.commission_pct) || 0) / 100;
    const totalWithComm = totalCostPP + commPP;
    const marginPP = fob - totalWithComm;
    const marginPct = fob ? (marginPP / fob * 100) : 0;

    const cur = form.currency || 'USD';
    const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });

    const COST_ROWS = [
        { key: 'fabric_cost',       label: 'Fabric Cost' },
        { key: 'trim_cost',         label: 'Trims & Accessories' },
        { key: 'embroidery_print',  label: 'Embroidery / Print' },
        { key: 'washing_finishing', label: 'Washing / Finishing' },
        { key: 'cm_cost',           label: 'Cut & Make (CM)' },
        { key: 'testing_cost',      label: 'Testing' },
        { key: 'inspection_cost',   label: 'Inspection (PSI)' },
        { key: 'freight_cost',      label: 'Freight / Logistics' },
        { key: 'other_cost',        label: 'Other Costs' },
    ];

    if (loading) return <div style={{ padding: 40, color: pt.colors.dimText }}>Loading costing sheet…</div>;

    return (
        <div>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'FOB Price / pc', value: `${cur} ${fmt(fob)}`, color: '#10b981' },
                    { label: 'Total Cost / pc (incl. comm)', value: `${cur} ${fmt(totalWithComm)}`, color: '#f59e0b' },
                    { label: 'Margin / pc', value: `${cur} ${fmt(marginPP)}`, color: marginPP >= 0 ? '#10b981' : '#ef4444' },
                    { label: 'Margin %', value: `${marginPct.toFixed(2)}%`, color: marginPct >= 0 ? '#10b981' : '#ef4444' },
                ].map(c => (
                    <div key={c.label} style={{ background: pt.colors.card, borderRadius: 12, padding: '16px 20px', border: `1px solid ${pt.colors.border || '#e2e8f0'}` }}>
                        <div style={{ fontSize: 12, color: pt.colors.dimText, marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                {/* Left — inputs */}
                <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: pt.colors.dimText, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>Revenue</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                        <FLabel label="Currency">
                            <select style={inpS} {...inp('currency')}>
                                {['USD','EUR','GBP','AUD','INR'].map(c => <option key={c}>{c}</option>)}
                            </select>
                        </FLabel>
                        <FLabel label="FOB Price / pc"><input type="number" style={inpS} placeholder="0.00" {...inp('fob_price_per_pc')} /></FLabel>
                        <FLabel label="Total Qty"><input type="number" style={inpS} placeholder="0" {...inp('total_quantity')} /></FLabel>
                    </div>

                    <p style={{ fontSize: 12, fontWeight: 700, color: pt.colors.dimText, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>Cost Breakdown (per piece)</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                        {COST_ROWS.map(r => (
                            <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 8, alignItems: 'center' }}>
                                <FLabel label={r.label}><input type="number" style={inpS} placeholder="0.0000" step="0.0001" {...inp(r.key)} /></FLabel>
                            </div>
                        ))}
                    </div>

                    <p style={{ fontSize: 12, fontWeight: 700, color: pt.colors.dimText, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>Commission</p>
                    <FLabel label="BH Commission (%)"><input type="number" style={{ ...inpS, maxWidth: 140 }} placeholder="0.00" step="0.01" {...inp('commission_pct')} /></FLabel>
                    <div style={{ marginTop: 16 }}>
                        <FLabel label="Notes"><textarea style={{ ...inpS, height: 60, resize: 'vertical', width: '100%' }} {...inp('notes')} /></FLabel>
                    </div>
                    {msg && <div style={{ color: msg === 'Saved.' ? '#10b981' : '#ef4444', fontSize: 13, marginTop: 8 }}>{msg}</div>}
                    <button onClick={save} disabled={saving} style={{ ...btn('#10b981'), marginTop: 16 }}>{saving ? 'Saving…' : 'Save Costing Sheet'}</button>
                </div>

                {/* Right — waterfall breakdown */}
                <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: pt.colors.dimText, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>Cost Waterfall</p>
                    <div style={{ background: pt.colors.card, borderRadius: 12, padding: '16px 20px', border: `1px solid ${pt.colors.border || '#e2e8f0'}` }}>
                        {COST_ROWS.map(r => {
                            const v = parseFloat(form[r.key]) || 0;
                            const pct = fob ? (v / fob * 100) : 0;
                            return (
                                <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${pt.colors.border || '#e2e8f0'}` }}>
                                    <span style={{ fontSize: 13 }}>{r.label}</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>{cur} {fmt(v)}</span>
                                        <span style={{ fontSize: 11, color: pt.colors.dimText, marginLeft: 8 }}>({pct.toFixed(1)}%)</span>
                                    </div>
                                </div>
                            );
                        })}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${pt.colors.border || '#e2e8f0'}` }}>
                            <span style={{ fontSize: 13 }}>BH Commission ({form.commission_pct || 0}%)</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{cur} {fmt(commPP)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', fontWeight: 700 }}>
                            <span>Total Cost / pc</span>
                            <span style={{ color: '#f59e0b' }}>{cur} {fmt(totalWithComm)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: 700, borderTop: `2px solid ${pt.colors.border || '#e2e8f0'}` }}>
                            <span>Margin / pc</span>
                            <span style={{ color: marginPP >= 0 ? '#10b981' : '#ef4444' }}>{cur} {fmt(marginPP)} ({marginPct.toFixed(2)}%)</span>
                        </div>

                        {qty > 0 && (
                            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `2px solid ${pt.colors.border || '#e2e8f0'}` }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: pt.colors.dimText, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Total Order ({qty.toLocaleString()} pcs)</p>
                                {[
                                    { label: 'Total Revenue', val: fob * qty, color: '#10b981' },
                                    { label: 'Total Cost', val: totalWithComm * qty, color: '#f59e0b' },
                                    { label: 'Total Margin', val: marginPP * qty, color: marginPP >= 0 ? '#10b981' : '#ef4444' },
                                ].map(r => (
                                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14, fontWeight: 600 }}>
                                        <span>{r.label}</span>
                                        <span style={{ color: r.color }}>{cur} {r.val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


// ── Helpers ───────────────────────────────────────────────────
function FLabel({ label, children, span }) {
    const { settings } = useSettings();
    const muted = settings.themeMode === 'dark' ? '#94a3b8' : '#475569';
    return <div style={span ? { gridColumn: `span ${span}` } : {}}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 4 }}>{label}</label>{children}</div>;
}
function InfoRow({ label, value, bold, span }) {
    return <div style={span ? { gridColumn: `span ${span}` } : {}}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{label}</div><div style={{ fontSize: 14, fontWeight: bold ? 700 : 400 }}>{value}</div></div>;
}
const btn      = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const tag      = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const overlay  = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
