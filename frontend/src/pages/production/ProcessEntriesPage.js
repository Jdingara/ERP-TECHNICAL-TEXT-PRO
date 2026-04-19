// ============================================================
// PAGE: Process Entries — The production core screen
// Worker picks lots → enters output qty → system creates batch
// and writes traceability record automatically
// ============================================================
import { useState, useEffect, useCallback } from 'react';

const emptyForm = {
    prod_order_id: '', process_id: '', machine_id: '', operator: '',
    shift: 'day', entry_date: new Date().toISOString().slice(0, 10),
    output_qty: '', rejection_qty: '0', notes: '',
};

export default function ProcessEntriesPage() {
    const [rows,     setRows]     = useState([]);
    const [orders,   setOrders]   = useState([]);
    const [machines, setMachines] = useState([]);
    const [processes,setProc]     = useState([]);
    const [availLots,setAvailLots]= useState([]);
    const [status,   setStatus]   = useState('');
    const [modal,    setModal]    = useState(false);
    const [form,     setForm]     = useState(emptyForm);
    const [lotPicks, setLotPicks] = useState([]);   // [{lot_id, lot_number, material_name, balance_qty, uom, qty_to_use}]
    const [saving,   setSaving]   = useState(false);
    const [msg,      setMsg]      = useState('');
    const [detail,   setDetail]   = useState(null);

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (status) p.set('status', status);
        const res = await fetch(`/api/production/entries/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.entries || []);
    }, [status]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        fetch('/api/planning/production-orders/?status=released', { credentials: 'include' }).then(r => r.json()).then(d => setOrders(d.orders || []));
        fetch('/api/masters/machines/', { credentials: 'include' }).then(r => r.json()).then(d => setMachines(d.machines || []));
        fetch('/api/masters/processes/', { credentials: 'include' }).then(r => r.json()).then(d => setProc(d.processes || []));
        fetch('/api/purchase/lots/?status=available', { credentials: 'include' }).then(r => r.json()).then(d => setAvailLots(d.lots || []));
    }, []);

    const openAdd = () => {
        setForm(emptyForm); setLotPicks([]); setMsg(''); setModal(true);
    };

    // Add lot to the picker table
    const addLot = (lot) => {
        if (lotPicks.find(p => p.lot_id === lot.id)) return;
        setLotPicks(prev => [...prev, {
            lot_id: lot.id, lot_number: lot.lot_number,
            material_name: lot.material_name, color_code: lot.color_code || '',
            balance_qty: lot.balance_qty, uom: lot.uom, qty_to_use: '',
        }]);
    };

    const removeLot = (lot_id) => setLotPicks(prev => prev.filter(p => p.lot_id !== lot_id));

    const updateLotQty = (lot_id, val) => {
        setLotPicks(prev => prev.map(p => p.lot_id === lot_id ? { ...p, qty_to_use: val } : p));
    };

    const save = async () => {
        if (!form.prod_order_id || !form.machine_id || !form.output_qty) {
            setMsg('Production order, machine, and output qty are required'); return;
        }
        if (lotPicks.length === 0) {
            setMsg('Add at least one input lot'); return;
        }
        const invalidLot = lotPicks.find(p => !p.qty_to_use || Number(p.qty_to_use) <= 0);
        if (invalidLot) {
            setMsg(`Enter quantity for lot ${invalidLot.lot_number}`); return;
        }
        const overLot = lotPicks.find(p => Number(p.qty_to_use) > Number(p.balance_qty));
        if (overLot) {
            setMsg(`Qty for ${overLot.lot_number} exceeds balance (${overLot.balance_qty})`); return;
        }

        setSaving(true);
        const payload = {
            ...form,
            input_lots: lotPicks.map(p => ({ lot_id: p.lot_id, qty_to_use: p.qty_to_use })),
        };
        const res = await fetch('/api/production/entries/', { method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setSaving(false);
        if (res.ok) {
            const d = await res.json();
            setModal(false);
            load();
            // refresh available lots
            fetch('/api/purchase/lots/?status=available', { credentials: 'include' }).then(r => r.json()).then(d => setAvailLots(d.lots || []));
            if (d.batch_number) alert(`✅ Entry saved!\nBatch created: ${d.batch_number}`);
        } else {
            const d = await res.json();
            setMsg(d.error || 'Error saving entry');
        }
    };

    const confirmEntry = async (id) => {
        if (!window.confirm('Confirm this process entry? Lots will be consumed and a batch will be created.')) return;
        const res = await fetch(`/api/production/entries/${id}/confirm/`, { method: 'POST', credentials: 'include' });
        if (res.ok) { load(); const d = await res.json(); if (d.batch_number) alert(`Batch created: ${d.batch_number}`); }
        else { const d = await res.json(); alert(d.error || 'Error'); }
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    const STATUS_COLOR = { draft: '#64748b', confirmed: '#10b981', cancelled: '#ef4444' };
    const SHIFT_COLOR  = { day: '#3b82f6', evening: '#f59e0b', night: '#8b5cf6' };

    // Available lots not yet in picker
    const unselectedLots = availLots.filter(l => !lotPicks.find(p => p.lot_id === l.id));

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Process Entries</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Record production — pick input lots, enter output quantity, create batch</p>
                </div>
                <button onClick={openAdd} style={btn('#f97316')}>+ New Process Entry</button>
            </div>

            <div style={{ marginBottom: 16 }}>
                <select value={status} onChange={e => setStatus(e.target.value)} style={selectS}>
                    <option value="">All Entries</option>
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['Entry No', 'Date', 'Prod. Order', 'Process', 'Machine', 'Operator', 'Shift', 'Output Qty', 'Rejection', 'Batch Created', 'Status', 'Actions'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={tdS}><b style={{ color: '#f97316', cursor: 'pointer' }} onClick={() => setDetail(r)}>{r.process_entry_number}</b></td>
                            <td style={tdS}>{r.entry_date}</td>
                            <td style={tdS}>{r.prod_order_number || '—'}</td>
                            <td style={tdS}>{r.process_name || '—'}</td>
                            <td style={tdS}>{r.machine_code}</td>
                            <td style={tdS}>{r.operator || '—'}</td>
                            <td style={tdS}><span style={tag(SHIFT_COLOR[r.shift] || '#64748b')}>{r.shift}</span></td>
                            <td style={tdS}><b style={{ color: '#10b981' }}>{r.output_qty}</b></td>
                            <td style={tdS}><span style={{ color: r.rejection_qty > 0 ? '#ef4444' : '#94a3b8' }}>{r.rejection_qty || 0}</span></td>
                            <td style={tdS}>{r.batch_number ? <b style={{ color: '#3b82f6' }}>{r.batch_number}</b> : '—'}</td>
                            <td style={tdS}><span style={tag(STATUS_COLOR[r.status] || '#64748b')}>{r.status}</span></td>
                            <td style={tdS}>
                                {r.status === 'draft' && (
                                    <button onClick={() => confirmEntry(r.id)} style={smallBtn('#10b981')}>Confirm</button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={12} style={emptyTd}>No process entries yet</td></tr>}
                </tbody></table>
            </div>

            {/* Add Modal */}
            {modal && (
                <div style={overlay}>
                    <div style={{ ...modalBox, width: 900 }}>
                        <h3 style={{ margin: '0 0 20px', color: '#f97316' }}>New Process Entry</h3>

                        {/* Header Fields */}
                        <div style={grid3}>
                            <F label="Production Order *">
                                <select style={inpS} {...inp('prod_order_id')}>
                                    <option value="">Select production order…</option>
                                    {orders.map(o => <option key={o.id} value={o.id}>{o.prod_order_number} — {o.product_name}</option>)}
                                </select>
                            </F>
                            <F label="Process Stage">
                                <select style={inpS} {...inp('process_id')}>
                                    <option value="">Select process…</option>
                                    {processes.map(p => <option key={p.id} value={p.id}>{p.process_name}</option>)}
                                </select>
                            </F>
                            <F label="Machine *">
                                <select style={inpS} {...inp('machine_id')}>
                                    <option value="">Select machine…</option>
                                    {machines.map(m => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
                                </select>
                            </F>
                            <F label="Operator"><input style={inpS} {...inp('operator')} /></F>
                            <F label="Shift">
                                <select style={inpS} {...inp('shift')}>
                                    <option value="day">Day</option>
                                    <option value="evening">Evening</option>
                                    <option value="night">Night</option>
                                </select>
                            </F>
                            <F label="Entry Date *"><input type="date" style={inpS} {...inp('entry_date')} /></F>
                        </div>

                        {/* LOT PICKER */}
                        <div style={{ border: '2px solid #f97316', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#f97316', marginBottom: 12 }}>
                                📦 Input Lots — Select lots consumed in this process
                            </div>

                            {/* Available lots dropdown */}
                            <div style={{ marginBottom: 12 }}>
                                <select style={{ ...inpS, maxWidth: 480 }}
                                    onChange={e => {
                                        const lot = availLots.find(l => String(l.id) === e.target.value);
                                        if (lot) { addLot(lot); e.target.value = ''; }
                                    }}>
                                    <option value="">+ Add lot to this entry…</option>
                                    {unselectedLots.map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.lot_number} — {l.material_name} {l.color_code ? `[${l.color_code}]` : ''} (Balance: {l.balance_qty} {l.uom})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {lotPicks.length === 0 ? (
                                <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>No lots selected yet. Use the dropdown above to add lots.</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead><tr style={{ background: '#fff7ed' }}>
                                        <th style={{ ...thS, fontSize: 11, color: '#9a3412' }}>LOT Number</th>
                                        <th style={{ ...thS, fontSize: 11, color: '#9a3412' }}>Material</th>
                                        <th style={{ ...thS, fontSize: 11, color: '#9a3412' }}>Color</th>
                                        <th style={{ ...thS, fontSize: 11, color: '#9a3412' }}>Available</th>
                                        <th style={{ ...thS, fontSize: 11, color: '#9a3412' }}>Qty to Use *</th>
                                        <th style={{ ...thS, fontSize: 11, color: '#9a3412' }}></th>
                                    </tr></thead>
                                    <tbody>
                                        {lotPicks.map(p => (
                                            <tr key={p.lot_id} style={{ borderBottom: '1px solid #fed7aa' }}>
                                                <td style={tdS}><b style={{ color: '#ec4899' }}>{p.lot_number}</b></td>
                                                <td style={tdS}>{p.material_name}</td>
                                                <td style={tdS}>{p.color_code || '—'}</td>
                                                <td style={tdS}>{p.balance_qty} {p.uom}</td>
                                                <td style={tdS}>
                                                    <input type="number" min="0.01" max={p.balance_qty}
                                                        value={p.qty_to_use}
                                                        onChange={e => updateLotQty(p.lot_id, e.target.value)}
                                                        style={{ width: 100, padding: '5px 8px', borderRadius: 6,
                                                            border: `1px solid ${Number(p.qty_to_use) > Number(p.balance_qty) ? '#ef4444' : '#e2e8f0'}`,
                                                            fontSize: 13 }}
                                                    />
                                                </td>
                                                <td style={tdS}>
                                                    <button onClick={() => removeLot(p.lot_id)}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Output */}
                        <div style={grid3}>
                            <F label="Output Qty *"><input type="number" style={inpS} {...inp('output_qty')} /></F>
                            <F label="Rejection Qty"><input type="number" style={inpS} {...inp('rejection_qty')} /></F>
                            <F label="Notes"><input style={inpS} {...inp('notes')} /></F>
                        </div>

                        {msg && <div style={{ color: '#ef4444', marginTop: 8, fontWeight: 600 }}>{msg}</div>}
                        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 13, color: '#9a3412' }}>
                            ⚡ Saving will create a new batch and deduct quantities from selected lots. Make sure lot quantities are correct before saving.
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#f97316')}>
                                {saving ? 'Saving…' : '✅ Save & Create Batch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detail && (
                <div style={overlay}>
                    <div style={{ ...modalBox, width: 600 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, color: '#f97316' }}>{detail.process_entry_number}</h3>
                            <button onClick={() => setDetail(null)} style={smallBtn('#64748b')}>✕ Close</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[['Date', detail.entry_date], ['Production Order', detail.prod_order_number || '—'],
                              ['Process', detail.process_name || '—'], ['Machine', detail.machine_code],
                              ['Operator', detail.operator || '—'], ['Shift', detail.shift],
                              ['Output Qty', detail.output_qty], ['Rejection', detail.rejection_qty || 0],
                              ['Batch Created', detail.batch_number || '—'], ['Status', detail.status]
                            ].map(([l, v]) => (
                                <div key={l} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>{l}</div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
                                </div>
                            ))}
                        </div>
                        {detail.notes && <div style={{ marginTop: 14, background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>Notes</div>
                            <div style={{ fontSize: 13 }}>{detail.notes}</div>
                        </div>}
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
const selectS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' };
const tag      = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const emptyTd  = { textAlign: 'center', padding: 40, color: '#94a3b8' };
