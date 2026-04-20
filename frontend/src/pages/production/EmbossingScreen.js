// ============================================================
// FILE: pages/production/EmbossingScreen.js
// PURPOSE: Embossing stage — pattern code, pressure, temp, speed
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const STATUS_COLORS = { draft: '#f59e0b', confirmed: '#10b981', cancelled: '#ef4444' };

function EmbossingScreen() {
    const pt = usePageTheme();
    const [entries, setEntries]       = useState([]);
    const [prodOrders, setProdOrders] = useState([]);
    const [machines, setMachines]     = useState([]);
    const [processes, setProcesses]   = useState([]);
    const [lots, setLots]             = useState([]);
    const [showForm, setShowForm]     = useState(false);
    const [loading, setLoading]       = useState(false);
    const [msg, setMsg]               = useState('');

    const blankForm = {
        production_order_id: '', process_stage_id: '', machine_id: '',
        entry_date: new Date().toISOString().slice(0, 10), shift: 'morning',
        operator_name: '', output_quantity: '', rejection_qty: '', notes: '',
        pattern_code: '', pressure_bar: '', temp_celsius: '', speed_mpm: '',
        lot_inputs: [],
    };
    const [form, setForm] = useState(blankForm);
    const [lotRow, setLotRow] = useState({ lot_id: '', quantity_used: '' });

    const load = useCallback(() => {
        fetch('/api/production/stages/embossing/', { credentials: 'include' })
            .then(r => r.json()).then(d => setEntries(d.entries || []));
    }, []);

    useEffect(() => {
        load();
        fetch('/api/planning/production-orders/', { credentials: 'include' })
            .then(r => r.json()).then(d => setProdOrders(d.production_orders || []));
        fetch('/api/masters/machines/', { credentials: 'include' })
            .then(r => r.json()).then(d => setMachines(d.machines || []));
        fetch('/api/masters/processes/', { credentials: 'include' })
            .then(r => r.json()).then(d => setProcesses((d.processes || []).filter(p =>
                p.process_name?.toLowerCase().includes('emboss'))));
        fetch('/api/purchase/lots/?status=available', { credentials: 'include' })
            .then(r => r.json()).then(d => setLots(d.lots || []));
    }, [load]);

    const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

    const submit = async () => {
        if (!form.production_order_id || !form.machine_id || !form.process_stage_id) {
            flash('Production Order, Machine and Process Stage are required.'); return;
        }
        setLoading(true);
        try {
            const r = await fetch('/api/production/stages/embossing/', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    pressure_bar: parseFloat(form.pressure_bar) || 0,
                    temp_celsius: parseInt(form.temp_celsius) || 0,
                    speed_mpm: parseFloat(form.speed_mpm) || 0,
                    output_quantity: parseFloat(form.output_quantity) || 0,
                    rejection_qty: parseFloat(form.rejection_qty) || 0,
                }),
            });
            const d = await r.json();
            if (d.success) { flash('Embossing entry saved.'); setShowForm(false); setForm(blankForm); load(); }
            else flash(d.error || 'Error.');
        } finally { setLoading(false); }
    };

    const confirm = async (id) => {
        const r = await fetch(`/api/production/entries/${id}/confirm/`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: '{}',
        });
        const d = await r.json();
        if (d.success) { flash('Confirmed! Batch created.'); load(); }
        else flash(d.error || 'Confirm failed.');
    };

    const cell = { padding: '10px 14px', borderBottom: `1px solid ${pt.colors.border}`, fontSize: 13 };
    const th   = { ...cell, backgroundColor: pt.colors.inner, color: pt.colors.muted, fontWeight: 600, textTransform: 'uppercase', fontSize: 11 };
    const inp  = { padding: '8px 10px', borderRadius: 6, border: `1px solid ${pt.colors.border}`, backgroundColor: pt.colors.inner, color: pt.colors.text, fontSize: 13, width: '100%', boxSizing: 'border-box' };

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            {!showForm ? (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Embossing Screen</h2>
                            <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>Pattern code · Pressure · Temperature · Speed</p>
                        </div>
                        <button onClick={() => { setShowForm(true); setForm(blankForm); }}
                            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', backgroundColor: '#f97316', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                            + New Embossing Entry
                        </button>
                    </div>

                    {msg && <div style={{ padding: '10px 16px', borderRadius: 8, backgroundColor: msg.includes('Error') || msg.includes('required') || msg.includes('failed') ? '#7f1d1d' : '#14532d', color: '#fff', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

                    <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {['Entry #', 'Date', 'Prod. Order', 'Machine', 'Pattern Code', 'Pressure (bar)', 'Temp (°C)', 'Speed m/min', 'Output m', 'Status', ''].map(h => (
                                        <th key={h} style={th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {entries.length === 0 && (
                                    <tr><td colSpan={11} style={{ ...cell, textAlign: 'center', color: pt.colors.muted, padding: 40 }}>No embossing entries yet.</td></tr>
                                )}
                                {entries.map(e => (
                                    <tr key={e.id}>
                                        <td style={{ ...cell, color: '#fb923c', fontWeight: 600 }}>{e.entry_number}</td>
                                        <td style={cell}>{e.entry_date}</td>
                                        <td style={cell}>{e.prod_order_number}</td>
                                        <td style={cell}>{e.machine_code}</td>
                                        <td style={cell}>
                                            <span style={{ backgroundColor: '#c2410c22', color: '#fb923c', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                                                {e.embossing?.pattern_code || '—'}
                                            </span>
                                        </td>
                                        <td style={{ ...cell, textAlign: 'center' }}>{e.embossing?.pressure_bar ?? '—'}</td>
                                        <td style={{ ...cell, textAlign: 'center', color: '#f97316' }}>{e.embossing?.temp_celsius ?? '—'}</td>
                                        <td style={{ ...cell, textAlign: 'center' }}>{e.embossing?.speed_mpm ?? '—'}</td>
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
                </>
            ) : (
                <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, padding: 28, maxWidth: 860 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${pt.colors.border}` }}>
                        <button onClick={() => setShowForm(false)}
                            style={{ padding: '7px 16px', background: '#0f172a', color: pt.colors.muted, border: `1px solid ${pt.colors.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            ← Back to Embossing
                        </button>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>New Embossing Entry</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div style={{ gridColumn: '1/-1' }}>
                            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Production Order *</label>
                            <select value={form.production_order_id} onChange={e => setForm(f => ({ ...f, production_order_id: e.target.value }))} style={inp}>
                                <option value="">— select —</option>
                                {prodOrders.map(o => <option key={o.id} value={o.id}>{o.po_number} — {o.product_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Process Stage *</label>
                            <select value={form.process_stage_id} onChange={e => setForm(f => ({ ...f, process_stage_id: e.target.value }))} style={inp}>
                                <option value="">— select —</option>
                                {processes.map(p => <option key={p.id} value={p.id}>{p.process_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Machine *</label>
                            <select value={form.machine_id} onChange={e => setForm(f => ({ ...f, machine_id: e.target.value }))} style={inp}>
                                <option value="">— select —</option>
                                {machines.map(m => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Shift</label>
                            <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))} style={inp}>
                                <option value="morning">Morning</option>
                                <option value="afternoon">Afternoon</option>
                                <option value="night">Night</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Entry Date</label>
                            <input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} style={inp} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Operator</label>
                            <input value={form.operator_name} onChange={e => setForm(f => ({ ...f, operator_name: e.target.value }))} style={inp} placeholder="Operator name" />
                        </div>
                    </div>

                    <div style={{ margin: '0 0 14px', padding: '16px', backgroundColor: pt.colors.inner, borderRadius: 8, border: '1px solid #9a3412' }}>
                        <p style={{ margin: '0 0 14px', color: '#f97316', fontWeight: 700, fontSize: 13 }}>Embossing Parameters</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Pattern Code</label>
                                <input value={form.pattern_code} onChange={e => setForm(f => ({ ...f, pattern_code: e.target.value }))} style={inp} placeholder="e.g. EMB-001, DIAMOND-3D" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Pressure (bar)</label>
                                <input type="number" step="0.1" value={form.pressure_bar} onChange={e => setForm(f => ({ ...f, pressure_bar: e.target.value }))} style={inp} placeholder="e.g. 5.5" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Temperature (°C)</label>
                                <input type="number" value={form.temp_celsius} onChange={e => setForm(f => ({ ...f, temp_celsius: e.target.value }))} style={{ ...inp, borderColor: '#f9731640', color: '#fb923c' }} placeholder="e.g. 180" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Speed (m/min)</label>
                                <input type="number" step="0.1" value={form.speed_mpm} onChange={e => setForm(f => ({ ...f, speed_mpm: e.target.value }))} style={inp} placeholder="e.g. 12.0" />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div>
                            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Output (m)</label>
                            <input type="number" value={form.output_quantity} onChange={e => setForm(f => ({ ...f, output_quantity: e.target.value }))} style={inp} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Rejection (m)</label>
                            <input type="number" value={form.rejection_qty} onChange={e => setForm(f => ({ ...f, rejection_qty: e.target.value }))} style={inp} />
                        </div>
                    </div>

                    <div style={{ margin: '0 0 14px', padding: '14px 16px', backgroundColor: pt.colors.inner, borderRadius: 8 }}>
                        <p style={{ margin: '0 0 10px', color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>Input Lots / Batches</p>
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
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: pt.colors.card, borderRadius: 6, marginBottom: 4, fontSize: 13 }}>
                                    <span>{lot ? `${lot.lot_number} — ${lot.material_name}` : `Lot #${l.lot_id}`}</span>
                                    <span style={{ color: '#f59e0b' }}>{l.quantity_used}</span>
                                    <button onClick={() => setForm(f => ({ ...f, lot_inputs: f.lot_inputs.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
                                </div>
                            );
                        })}
                    </div>

                    <div>
                        <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Notes</label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            style={{ ...inp, height: 55, resize: 'vertical' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                        <button onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${pt.colors.border}`, backgroundColor: 'transparent', color: pt.colors.muted, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                        <button onClick={submit} disabled={loading} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', backgroundColor: '#f97316', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                            {loading ? 'Saving…' : 'Save Embossing Entry'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EmbossingScreen;
