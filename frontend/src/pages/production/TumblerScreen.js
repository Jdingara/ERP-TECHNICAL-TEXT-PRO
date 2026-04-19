// ============================================================
// FILE: pages/production/TumblerScreen.js
// PURPOSE: Tumbler stage — temperature, duration, softener dosage
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000/api';
const STATUS_COLORS = { draft: '#f59e0b', confirmed: '#10b981', cancelled: '#ef4444' };

function TumblerScreen() {
    const [entries, setEntries]     = useState([]);
    const [prodOrders, setProdOrders] = useState([]);
    const [machines, setMachines]   = useState([]);
    const [processes, setProcesses] = useState([]);
    const [lots, setLots]           = useState([]);
    const [showForm, setShowForm]   = useState(false);
    const [loading, setLoading]     = useState(false);
    const [msg, setMsg]             = useState('');

    const blankForm = {
        production_order_id: '', process_stage_id: '', machine_id: '',
        entry_date: new Date().toISOString().slice(0, 10), shift: 'morning',
        operator_name: '', output_quantity: '', rejection_qty: '', notes: '',
        temp_celsius: '80', duration_minutes: '45',
        softener_name: '', softener_qty_kg: '', anti_wrinkle: '',
        lot_inputs: [],
    };
    const [form, setForm] = useState(blankForm);
    const [lotRow, setLotRow] = useState({ lot_id: '', quantity_used: '' });

    const load = useCallback(() => {
        fetch(`${API}/production/stages/tumbler/`, { credentials: 'include' })
            .then(r => r.json()).then(d => setEntries(d.entries || []));
    }, []);

    useEffect(() => {
        load();
        fetch(`${API}/planning/production-orders/`, { credentials: 'include' })
            .then(r => r.json()).then(d => setProdOrders(d.production_orders || []));
        fetch(`${API}/masters/machines/`, { credentials: 'include' })
            .then(r => r.json()).then(d => setMachines(d.machines || []));
        fetch(`${API}/masters/processes/`, { credentials: 'include' })
            .then(r => r.json()).then(d => setProcesses((d.processes || []).filter(p =>
                p.process_name?.toLowerCase().includes('tumbler') ||
                p.process_name?.toLowerCase().includes('drum'))));
        fetch(`${API}/purchase/lots/?status=available`, { credentials: 'include' })
            .then(r => r.json()).then(d => setLots(d.lots || []));
    }, [load]);

    const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

    const submit = async () => {
        if (!form.production_order_id || !form.machine_id || !form.process_stage_id) {
            flash('Production Order, Machine and Process Stage are required.'); return;
        }
        setLoading(true);
        try {
            const r = await fetch(`${API}/production/stages/tumbler/`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    temp_celsius: parseInt(form.temp_celsius) || 0,
                    duration_minutes: parseInt(form.duration_minutes) || 0,
                    softener_qty_kg: parseFloat(form.softener_qty_kg) || 0,
                    output_quantity: parseFloat(form.output_quantity) || 0,
                    rejection_qty: parseFloat(form.rejection_qty) || 0,
                }),
            });
            const d = await r.json();
            if (d.success) { flash('Tumbler entry saved.'); setShowForm(false); setForm(blankForm); load(); }
            else flash(d.error || 'Error.');
        } finally { setLoading(false); }
    };

    const confirm = async (id) => {
        const r = await fetch(`${API}/production/entries/${id}/confirm/`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: '{}',
        });
        const d = await r.json();
        if (d.success) { flash('Confirmed! Batch created.'); load(); }
        else flash(d.error || 'Confirm failed.');
    };

    const cell = { padding: '10px 14px', borderBottom: '1px solid #1e293b', fontSize: 13 };
    const th   = { ...cell, backgroundColor: '#0f172a', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 };
    const inp  = { padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 13, width: '100%', boxSizing: 'border-box' };

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: '#f1f5f9', minHeight: '100vh', backgroundColor: '#0b1120' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Tumbler Screen</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Temperature · Duration · Softener dosage</p>
                </div>
                <button onClick={() => { setShowForm(true); setForm(blankForm); }}
                    style={{ padding: '9px 20px', borderRadius: 8, border: 'none', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                    + New Tumbler Entry
                </button>
            </div>

            {msg && <div style={{ padding: '10px 16px', borderRadius: 8, backgroundColor: msg.includes('Error') || msg.includes('required') || msg.includes('failed') ? '#7f1d1d' : '#14532d', color: '#fff', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

            {showForm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ backgroundColor: '#1e293b', borderRadius: 12, width: '100%', maxWidth: 740, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>New Tumbler Entry</h3>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Production Order *</label>
                                <select value={form.production_order_id} onChange={e => setForm(f => ({ ...f, production_order_id: e.target.value }))} style={inp}>
                                    <option value="">— select —</option>
                                    {prodOrders.map(o => <option key={o.id} value={o.id}>{o.po_number} — {o.product_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Process Stage *</label>
                                <select value={form.process_stage_id} onChange={e => setForm(f => ({ ...f, process_stage_id: e.target.value }))} style={inp}>
                                    <option value="">— select —</option>
                                    {processes.map(p => <option key={p.id} value={p.id}>{p.process_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Tumbler Machine *</label>
                                <select value={form.machine_id} onChange={e => setForm(f => ({ ...f, machine_id: e.target.value }))} style={inp}>
                                    <option value="">— select —</option>
                                    {machines.map(m => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Shift</label>
                                <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))} style={inp}>
                                    <option value="morning">Morning</option>
                                    <option value="afternoon">Afternoon</option>
                                    <option value="night">Night</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Entry Date</label>
                                <input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} style={inp} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Operator</label>
                                <input value={form.operator_name} onChange={e => setForm(f => ({ ...f, operator_name: e.target.value }))} style={inp} placeholder="Operator name" />
                            </div>
                        </div>

                        {/* Tumbler Params */}
                        <div style={{ margin: '0 0 14px', padding: '16px', backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #312e81' }}>
                            <p style={{ margin: '0 0 14px', color: '#8b5cf6', fontWeight: 700, fontSize: 13 }}>Tumbler Parameters</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Temperature (°C)</label>
                                    <input type="number" value={form.temp_celsius} onChange={e => setForm(f => ({ ...f, temp_celsius: e.target.value }))} style={inp} placeholder="e.g. 80" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Duration (minutes)</label>
                                    <input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} style={inp} placeholder="e.g. 45" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Softener Name</label>
                                    <input value={form.softener_name} onChange={e => setForm(f => ({ ...f, softener_name: e.target.value }))} style={inp} placeholder="e.g. Silicone Softener" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Softener Qty (kg)</label>
                                    <input type="number" step="0.1" value={form.softener_qty_kg} onChange={e => setForm(f => ({ ...f, softener_qty_kg: e.target.value }))} style={inp} placeholder="e.g. 2.5" />
                                </div>
                                <div style={{ gridColumn: '1/-1' }}>
                                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Anti-Wrinkle Agent</label>
                                    <input value={form.anti_wrinkle} onChange={e => setForm(f => ({ ...f, anti_wrinkle: e.target.value }))} style={inp} placeholder="e.g. Crease Resist 5g/L" />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Output Qty (kg)</label>
                                <input type="number" value={form.output_quantity} onChange={e => setForm(f => ({ ...f, output_quantity: e.target.value }))} style={inp} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Rejection Qty</label>
                                <input type="number" value={form.rejection_qty} onChange={e => setForm(f => ({ ...f, rejection_qty: e.target.value }))} style={inp} />
                            </div>
                        </div>

                        {/* Input lots */}
                        <div style={{ margin: '0 0 14px', padding: '14px 16px', backgroundColor: '#0f172a', borderRadius: 8 }}>
                            <p style={{ margin: '0 0 10px', color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>Input Lots</p>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <select value={lotRow.lot_id} onChange={e => setLotRow(r => ({ ...r, lot_id: e.target.value }))} style={{ ...inp, flex: 2 }}>
                                    <option value="">— select lot —</option>
                                    {lots.map(l => <option key={l.id} value={l.id}>{l.lot_number} — {l.material_name} ({l.balance_qty})</option>)}
                                </select>
                                <input type="number" placeholder="Qty" value={lotRow.quantity_used}
                                    onChange={e => setLotRow(r => ({ ...r, quantity_used: e.target.value }))}
                                    style={{ ...inp, flex: 1 }} />
                                <button onClick={() => {
                                    if (!lotRow.lot_id || !lotRow.quantity_used) return;
                                    setForm(f => ({ ...f, lot_inputs: [...f.lot_inputs, { ...lotRow }] }));
                                    setLotRow({ lot_id: '', quantity_used: '' });
                                }} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#1d4ed8', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Add</button>
                            </div>
                            {form.lot_inputs.map((l, i) => {
                                const lot = lots.find(x => String(x.id) === String(l.lot_id));
                                return (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: '#1e293b', borderRadius: 6, marginBottom: 4, fontSize: 13 }}>
                                        <span>{lot ? `${lot.lot_number} — ${lot.material_name}` : `Lot #${l.lot_id}`}</span>
                                        <span style={{ color: '#f59e0b' }}>{l.quantity_used}</span>
                                        <button onClick={() => setForm(f => ({ ...f, lot_inputs: f.lot_inputs.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
                                    </div>
                                );
                            })}
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Notes</label>
                            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                style={{ ...inp, height: 55, resize: 'vertical' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <button onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                            <button onClick={submit} disabled={loading} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                                {loading ? 'Saving…' : 'Save Tumbler Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {['Entry #', 'Date', 'Prod. Order', 'Machine', 'Shift', 'Temp °C', 'Duration min', 'Softener', 'Qty kg', 'Output', 'Status', ''].map(h => (
                                <th key={h} style={th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {entries.length === 0 && (
                            <tr><td colSpan={12} style={{ ...cell, textAlign: 'center', color: '#475569', padding: 40 }}>No tumbler entries yet.</td></tr>
                        )}
                        {entries.map(e => (
                            <tr key={e.id}>
                                <td style={{ ...cell, color: '#a78bfa', fontWeight: 600 }}>{e.entry_number}</td>
                                <td style={cell}>{e.entry_date}</td>
                                <td style={cell}>{e.prod_order_number}</td>
                                <td style={cell}>{e.machine_code}</td>
                                <td style={cell}>{e.shift}</td>
                                <td style={{ ...cell, textAlign: 'center', color: '#f97316', fontWeight: 700 }}>{e.tumbler?.temp_celsius ?? '—'}</td>
                                <td style={{ ...cell, textAlign: 'center' }}>{e.tumbler?.duration_minutes ?? '—'}</td>
                                <td style={cell}>{e.tumbler?.softener_name || '—'}</td>
                                <td style={{ ...cell, textAlign: 'center' }}>{e.tumbler?.softener_qty_kg ?? '—'}</td>
                                <td style={{ ...cell, textAlign: 'right', fontWeight: 600 }}>{parseFloat(e.output_quantity).toFixed(1)}</td>
                                <td style={cell}>
                                    <span style={{ backgroundColor: STATUS_COLORS[e.status] + '22', color: STATUS_COLORS[e.status], padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{e.status}</span>
                                </td>
                                <td style={cell}>
                                    {e.status === 'draft' && (
                                        <button onClick={() => confirm(e.id)} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', backgroundColor: '#10b981', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Confirm</button>
                                    )}
                                    {e.status === 'confirmed' && <span style={{ color: '#10b981', fontSize: 12 }}>✓</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default TumblerScreen;
