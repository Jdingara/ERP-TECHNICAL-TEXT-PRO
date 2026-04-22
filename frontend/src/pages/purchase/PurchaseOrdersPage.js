// ============================================================
// PAGE: Purchase Orders
// Shows list of POs with status badges. Clicking opens detail.
// New PO form with line items. Confirm/Cancel actions.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';
import { printPurchaseOrder } from '../../utils/printUtils';
import { shareEmail, shareWhatsApp } from '../../utils/shareUtils';

/* eslint-disable no-undef */

const STATUS_COLOR = {
    draft: '#94a3b8', confirmed: '#3b82f6', partial: '#f59e0b',
    received: '#10b981', cancelled: '#ef4444',
};

export default function PurchaseOrdersPage() {
    const pt = usePageTheme();
    const emptyTd    = { textAlign: 'center', padding: 40, color: pt.colors.muted };
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const searchS  = { ...pt.inp, width: 260, outline: 'none' };
    const selectS  = { ...pt.inp, width: 'auto' };
    const formPage = { ...pt.formPage, maxWidth: 1100 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;
    const [rows,     setRows]     = useState([]);
    const [vendors,  setVendors]  = useState([]);
    const [yarns,    setYarns]    = useState([]);
    const [items,    setItems]    = useState([]);
    const [uoms,     setUoms]     = useState([]);
    const [filter,   setFilter]   = useState('');
    const [search,   setSearch]   = useState('');
    const [detail,   setDetail]   = useState(null);
    const [newPO,    setNewPO]    = useState(false);
    const [form,     setForm]     = useState({ vendor_id: '', order_date: today(), expected_date: '', notes: '' });
    const [lines,    setLines]    = useState([emptyLine()]);
    const [saving,   setSaving]   = useState(false);
    const [msg,      setMsg]      = useState('');

    function today() { return new Date().toISOString().split('T')[0]; }
    function emptyLine() { return { material_type: 'yarn', yarn_id: '', item_id: '', ordered_quantity: '', unit_price: '', uom_id: '', notes: '' }; }

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (filter) p.set('status', filter);
        if (search) p.set('search', search);
        const res = await fetch(`/api/purchase/po/?${p}`, { credentials: 'include' });
        const d = await res.json(); setRows(d.purchase_orders || []);
    }, [filter, search]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/masters/vendors/', { credentials: 'include' }).then(r => r.json()).then(d => setVendors(d.vendors || []));
        fetch('/api/masters/yarn/', { credentials: 'include' }).then(r => r.json()).then(d => setYarns(d.yarns || []));
        fetch('/api/masters/items/', { credentials: 'include' }).then(r => r.json()).then(d => setItems(d.items || []));
        fetch('/api/masters/uom/', { credentials: 'include' }).then(r => r.json()).then(d => setUoms(d.uoms || []));
    }, []);

    const openDetail = async (id) => {
        const res = await fetch(`/api/purchase/po/${id}/`, { credentials: 'include' });
        const d = await res.json(); setDetail(d.purchase_order);
    };

    const confirmPO = async (id) => {
        if (!window.confirm('Confirm this Purchase Order?')) return;
        await fetch(`/api/purchase/po/${id}/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'confirm' }),
        });
        load(); if (detail?.id === id) openDetail(id);
    };

    const cancelPO = async (id) => {
        if (!window.confirm('Cancel this PO?')) return;
        await fetch(`/api/purchase/po/${id}/`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'cancel' }),
        });
        load(); if (detail?.id === id) openDetail(id);
    };

    const savePO = async () => {
        if (!form.vendor_id) { setMsg('Please select a vendor'); return; }
        setSaving(true);
        const body = { ...form, lines: lines.filter(l => l.ordered_quantity) };
        const res = await fetch('/api/purchase/po/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        setSaving(false);
        if (res.ok) { setNewPO(false); setLines([emptyLine()]); setForm({ vendor_id: '', order_date: today(), expected_date: '', notes: '' }); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const addLine = () => setLines(p => [...p, emptyLine()]);
    const removeLine = (i) => setLines(p => p.filter((_, idx) => idx !== i));
    const updateLine = (i, field, val) => setLines(p => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

    return (
        <div style={{ padding: 24 }}>
            {!newPO ? (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Purchase Orders</h2>
                        <button onClick={() => { setMsg(''); setDetail(null); setNewPO(true); }} style={btn('#10b981')}>+ New Purchase Order</button>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <input placeholder="Search PO / vendor…" value={search} onChange={e => setSearch(e.target.value)} style={searchS} />
                        <select value={filter} onChange={e => setFilter(e.target.value)} style={selectS}>
                            <option value="">All Status</option>
                            {Object.keys(STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={tableS}><thead><tr style={{ background: pt.colors.inner, color: '#fff' }}>
                            {['PO Number', 'Vendor', 'Order Date', 'Expected Date', 'Status', 'Amount', 'Actions'].map(h =>
                                <th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map((r, i) => (
                                <tr key={r.id} style={{ background: i % 2 === 0 ? pt.colors.inner : pt.colors.card, cursor: 'pointer' }}
                                    onClick={() => setDetail(detail?.id === r.id ? null : null) || openDetail(r.id)}>
                                    <td style={tdS}><b style={{ color: '#3b82f6' }}>{r.po_number}</b></td>
                                    <td style={tdS}>{r.vendor_name}</td>
                                    <td style={tdS}>{r.order_date}</td>
                                    <td style={tdS}>{r.expected_date || '—'}</td>
                                    <td style={tdS}><span style={statusBadge(STATUS_COLOR[r.status])}>{r.status}</span></td>
                                    <td style={tdS}>₹{r.total_amount}</td>
                                    <td style={tdS} onClick={e => e.stopPropagation()}>
                                        {r.status === 'draft' && <button onClick={() => confirmPO(r.id)} style={smallBtn('#10b981')}>Confirm</button>}
                                        {!['received', 'cancelled'].includes(r.status) && <button onClick={() => cancelPO(r.id)} style={smallBtn('#ef4444')}>Cancel</button>}
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={7} style={emptyTd}>No purchase orders</td></tr>}
                        </tbody></table>
                    </div>

                    {detail && (
                        <div style={{ marginTop: 24, background: pt.colors.inner, border: `1px solid ${pt.colors.border}`, borderRadius: 12, padding: 24, maxWidth: 900 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <h3 style={{ margin: 0, color: '#3b82f6', fontSize: 16 }}>{detail.po_number}</h3>
                                    <span style={statusBadge(STATUS_COLOR[detail.status])}>{detail.status}</span>
                                </div>
                                <button onClick={() => setDetail(null)} style={smallBtn('#64748b')}>✕ Close</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                                {[['Vendor', detail.vendor_name], ['Order Date', detail.order_date], ['Expected', detail.expected_date || '—'], ['Total Amount', `₹${detail.total_amount}`]].map(([l, v]) => (
                                    <div key={l} style={{ background: pt.colors.card, borderRadius: 8, padding: '10px 14px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: 11, color: pt.colors.dimText, marginBottom: 3 }}>{l}</div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                            <b style={{ fontSize: 13 }}>Line Items:</b>
                            <table style={{ ...tableS, marginTop: 8 }}><thead><tr style={{ background: pt.colors.card, color: '#fff' }}>
                                {['Material', 'Type', 'Ordered Qty', 'Received', 'Pending', 'Unit Price', 'Total'].map(h =>
                                    <th key={h} style={{ ...thS, fontSize: 11, padding: '6px 10px' }}>{h}</th>)}
                            </tr></thead><tbody>
                                {(detail.lines || []).map((l, i) => (
                                    <tr key={i} style={{ background: i % 2 === 0 ? pt.colors.inner : pt.colors.card }}>
                                        <td style={{ ...tdS, padding: '6px 10px' }}>{l.material_name}</td>
                                        <td style={{ ...tdS, padding: '6px 10px' }}><span style={tag('#06b6d4')}>{l.material_type}</span></td>
                                        <td style={{ ...tdS, padding: '6px 10px' }}>{l.ordered_quantity} {l.uom_name}</td>
                                        <td style={{ ...tdS, padding: '6px 10px' }}>{l.received_quantity}</td>
                                        <td style={{ ...tdS, padding: '6px 10px' }}>{l.pending_quantity}</td>
                                        <td style={{ ...tdS, padding: '6px 10px' }}>₹{l.unit_price}</td>
                                        <td style={{ ...tdS, padding: '6px 10px' }}>₹{l.total_price}</td>
                                    </tr>
                                ))}
                            </tbody></table>
                            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                {detail.status === 'draft' && <button onClick={() => confirmPO(detail.id)} style={btn('#10b981')}>Confirm PO</button>}
                                {!['received', 'cancelled'].includes(detail.status) && <button onClick={() => cancelPO(detail.id)} style={btn('#ef4444')}>Cancel PO</button>}
                                <button onClick={() => printPurchaseOrder(detail)} style={btn('#1a237e')}>🖨 Print PO</button>
                                <button onClick={() => shareEmail({ email: detail.vendor_email, docType: 'po', data: { po_number: detail.po_number, vendor_name: detail.vendor_name, total_amount: detail.total_amount, expected_date: detail.expected_date || '—', order_date: detail.order_date } })} style={btn('#6366f1')}>📧 Email</button>
                                <button onClick={() => shareWhatsApp({ phone: detail.vendor_phone, docType: 'po', data: { po_number: detail.po_number, vendor_name: detail.vendor_name, total_amount: detail.total_amount, expected_date: detail.expected_date || '—', order_date: detail.order_date } })} style={btn('#25d366')}>💬 WhatsApp</button>
                                <button onClick={() => setDetail(null)} style={smallBtn('#64748b')}>Close</button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={() => setNewPO(false)} style={backBtnS}>← Back to Purchase Orders</button>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>New Purchase Order</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                        <F label="Vendor *">
                            <select style={inpS} value={form.vendor_id} onChange={e => setForm(p => ({ ...p, vendor_id: e.target.value }))}>
                                <option value="">-- Select Vendor --</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_code} — {v.vendor_name}</option>)}
                            </select>
                        </F>
                        <F label="Order Date"><input style={inpS} type="date" value={form.order_date} onChange={e => setForm(p => ({ ...p, order_date: e.target.value }))} /></F>
                        <F label="Expected Delivery"><input style={inpS} type="date" value={form.expected_date} onChange={e => setForm(p => ({ ...p, expected_date: e.target.value }))} /></F>
                    </div>

                    <b style={{ fontSize: 13 }}>Materials to Order:</b>
                    <div style={{ marginTop: 10, border: `1px solid ${pt.colors.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                        <table style={{ ...tableS, fontSize: 12 }}>
                            <thead><tr style={{ background: pt.colors.card, color: '#fff' }}>
                                {['Type', 'Material', 'Qty', 'Price/Unit', 'UOM', 'Notes', ''].map(h =>
                                    <th key={h} style={{ ...thS, fontSize: 11, padding: '8px 10px' }}>{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {lines.map((line, i) => (
                                    <tr key={i} style={{ background: i % 2 === 0 ? pt.colors.inner : pt.colors.card }}>
                                        <td style={{ padding: '6px 6px' }}>
                                            <select style={{ ...inpS, fontSize: 12, padding: '4px 8px' }}
                                                value={line.material_type}
                                                onChange={e => updateLine(i, 'material_type', e.target.value)}>
                                                <option value="yarn">Yarn</option>
                                                <option value="item">Item</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '6px 6px' }}>
                                            {line.material_type === 'yarn' ? (
                                                <select style={{ ...inpS, fontSize: 12, padding: '4px 8px' }}
                                                    value={line.yarn_id}
                                                    onChange={e => updateLine(i, 'yarn_id', e.target.value)}>
                                                    <option value="">-- Yarn --</option>
                                                    {yarns.map(y => <option key={y.id} value={y.id}>{y.item_code} — {y.item_name}</option>)}
                                                </select>
                                            ) : (
                                                <select style={{ ...inpS, fontSize: 12, padding: '4px 8px' }}
                                                    value={line.item_id}
                                                    onChange={e => updateLine(i, 'item_id', e.target.value)}>
                                                    <option value="">-- Item --</option>
                                                    {items.map(it => <option key={it.id} value={it.id}>{it.item_code} — {it.item_name}</option>)}
                                                </select>
                                            )}
                                        </td>
                                        <td style={{ padding: '6px 6px' }}>
                                            <input style={{ ...inpS, fontSize: 12, padding: '4px 8px', width: 80 }}
                                                type="number" step="0.001" placeholder="Qty"
                                                value={line.ordered_quantity}
                                                onChange={e => updateLine(i, 'ordered_quantity', e.target.value)} />
                                        </td>
                                        <td style={{ padding: '6px 6px' }}>
                                            <input style={{ ...inpS, fontSize: 12, padding: '4px 8px', width: 80 }}
                                                type="number" step="0.01" placeholder="Price"
                                                value={line.unit_price}
                                                onChange={e => updateLine(i, 'unit_price', e.target.value)} />
                                        </td>
                                        <td style={{ padding: '6px 6px' }}>
                                            <select style={{ ...inpS, fontSize: 12, padding: '4px 8px' }}
                                                value={line.uom_id}
                                                onChange={e => updateLine(i, 'uom_id', e.target.value)}>
                                                <option value="">UOM</option>
                                                {uoms.map(u => <option key={u.id} value={u.id}>{u.short_name}</option>)}
                                            </select>
                                        </td>
                                        <td style={{ padding: '6px 6px' }}>
                                            <input style={{ ...inpS, fontSize: 12, padding: '4px 8px', width: 100 }}
                                                placeholder="Notes"
                                                value={line.notes}
                                                onChange={e => updateLine(i, 'notes', e.target.value)} />
                                        </td>
                                        <td style={{ padding: '6px 6px' }}>
                                            <button onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ padding: '8px 10px' }}>
                            <button onClick={addLine} style={{ ...smallBtn('#3b82f6'), fontSize: 12 }}>+ Add Line</button>
                        </div>
                    </div>

                    <F label="Notes">
                        <textarea style={{ ...inpS, height: 60, resize: 'vertical' }}
                            value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                    </F>

                    {msg && <div style={{ color: '#ef4444', marginTop: 8 }}>{msg}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                        <button onClick={() => setNewPO(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={savePO} disabled={saving} style={btn('#10b981')}>{saving ? 'Saving…' : 'Save PO'}</button>
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
const tableS     = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const tag        = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const statusBadge = (bg) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 12, background: `${bg}25`, color: bg, fontSize: 11, fontWeight: 700, border: `1px solid ${bg}40` });
