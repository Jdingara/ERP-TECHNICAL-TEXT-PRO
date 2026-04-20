// ============================================================
// FILE: pages/production/StenterScreen.js
// PURPOSE: Stenter stage — temperature zones, speed, width setting
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const API = 'http://localhost:8000/api';
const STATUS_COLORS = { draft: '#f59e0b', confirmed: '#10b981', cancelled: '#ef4444' };

function TempZone({ label, value, onChange }) {
    const pt = usePageTheme();
    const inp = { padding: '8px 10px', borderRadius: 6, border: `1px solid ${pt.colors.border}`, backgroundColor: pt.colors.inner, color: pt.colors.text, fontSize: 13, width: '100%', boxSizing: 'border-box' };
    const color = value >= 180 ? '#ef4444' : value >= 150 ? '#f59e0b' : '#10b981';
    return (
        <div>
            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>{label} (°C)</label>
            <div style={{ position: 'relative' }}>
                <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ ...inp, paddingRight: 40 }} placeholder="150" />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color, fontSize: 12, fontWeight: 700 }}>°C</span>
            </div>
        </div>
    );
}

function StenterScreen() {
    const pt = usePageTheme();
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
        temp_zone1: '150', temp_zone2: '160', temp_zone3: '165', temp_zone4: '155',
        speed_mpm: '', width_cm: '', overfeed_pct: '', chemical_recipe: '',
        lot_inputs: [],
    };
    const [form, setForm] = useState(blankForm);
    const [lotRow, setLotRow] = useState({ lot_id: '', quantity_used: '' });

    const load = useCallback(() => {
        fetch(`${API}/production/stages/stenter/`, { credentials: 'include' })
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
                p.process_name?.toLowerCase().includes('stenter') ||
                p.process_name?.toLowerCase().includes('heat'))));
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
            const r = await fetch(`${API}/production/stages/stenter/`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    temp_zone1: parseInt(form.temp_zone1) || 0,
                    temp_zone2: parseInt(form.temp_zone2) || 0,
                    temp_zone3: parseInt(form.temp_zone3) || 0,
                    temp_zone4: parseInt(form.temp_zone4) || 0,
                    speed_mpm: parseFloat(form.speed_mpm) || 0,
                    width_cm: parseFloat(form.width_cm) || 0,
                    overfeed_pct: parseFloat(form.overfeed_pct) || 0,
                    output_quantity: parseFloat(form.output_quantity) || 0,
                    rejection_qty: parseFloat(form.rejection_qty) || 0,
                }),
            });
            const d = await r.json();
            if (d.success) { flash('Stenter entry saved.'); setShowForm(false); setForm(blankForm); load(); }
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

    const cell = { padding: '10px 14px', borderBottom: `1px solid ${pt.colors.border}`, fontSize: 13 };
    const th   = { ...cell, backgroundColor: pt.colors.inner, color: pt.colors.muted, fontWeight: 600, textTransform: 'uppercase', fontSize: 11 };
    const inp  = { padding: '8px 10px', borderRadius: 6, border: `1px solid ${pt.colors.border}`, backgroundColor: pt.colors.inner, color: pt.colors.text, fontSize: 13, width: '100%', boxSizing: 'border-box' };

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Stenter Screen</h2>
                    <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>Temperature zones · Speed · Width · Overfeed</p>
                </div>
                <button onClick={() => { setShowForm(true); setForm(blankForm); }}
                    style={{ padding: '9px 20px', borderRadius: 8, border: 'none', backgroundColor: '#f59e0b', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                    + New Stenter Entry
                </button>
            </div>

            {msg && <div style={{ padding: '10px 16px', borderRadius: 8, backgroundColor: msg.includes('Error') || msg.includes('required') || msg.includes('failed') ? '#7f1d1d' : '#14532d', color: '#fff', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

            {showForm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, width: '100%', maxWidth: 820, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>New Stenter Entry</h3>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: pt.colors.muted, fontSize: 20, cursor: 'pointer' }}>✕</button>
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
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Stenter Machine *</label>
                                <select value={form.machine_id} onChange={e => setForm(f => ({ ...f, machine_id: e.target.value }))} style={inp}>
                                    <option value="">— select —</option>
                                    {machines.map(m => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Entry Date</label>
                                <input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} style={inp} />
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
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Operator</label>
                                <input value={form.operator_name} onChange={e => setForm(f => ({ ...f, operator_name: e.target.value }))} style={inp} placeholder="Operator name" />
                            </div>
                        </div>

                        {/* Temperature Panel */}
                        <div style={{ margin: '0 0 14px', padding: '16px', backgroundColor: pt.colors.inner, borderRadius: 8, border: '1px solid #7c2d12' }}>
                            <p style={{ margin: '0 0 14px', color: '#f97316', fontWeight: 700, fontSize: 13 }}>Temperature Zones</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                                <TempZone label="Zone 1" value={form.temp_zone1} onChange={v => setForm(f => ({ ...f, temp_zone1: v }))} />
                                <TempZone label="Zone 2" value={form.temp_zone2} onChange={v => setForm(f => ({ ...f, temp_zone2: v }))} />
                                <TempZone label="Zone 3" value={form.temp_zone3} onChange={v => setForm(f => ({ ...f, temp_zone3: v }))} />
                                <TempZone label="Zone 4" value={form.temp_zone4} onChange={v => setForm(f => ({ ...f, temp_zone4: v }))} />
                            </div>
                        </div>

                        {/* Process Params */}
                        <div style={{ margin: '0 0 14px', padding: '16px', backgroundColor: pt.colors.inner, borderRadius: 8, border: '1px solid #1e3a5f' }}>
                            <p style={{ margin: '0 0 14px', color: '#3b82f6', fontWeight: 600, fontSize: 13 }}>Process Parameters</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Speed (m/min)</label>
                                    <input type="number" step="0.1" value={form.speed_mpm} onChange={e => setForm(f => ({ ...f, speed_mpm: e.target.value }))} style={inp} placeholder="e.g. 15.5" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Width (cm)</label>
                                    <input type="number" value={form.width_cm} onChange={e => setForm(f => ({ ...f, width_cm: e.target.value }))} style={inp} placeholder="e.g. 160" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Overfeed %</label>
                                    <input type="number" step="0.1" value={form.overfeed_pct} onChange={e => setForm(f => ({ ...f, overfeed_pct: e.target.value }))} style={inp} placeholder="e.g. 3.5" />
                                </div>
                                <div style={{ gridColumn: '1/-1' }}>
                                    <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Chemical Recipe</label>
                                    <input value={form.chemical_recipe} onChange={e => setForm(f => ({ ...f, chemical_recipe: e.target.value }))} style={inp} placeholder="e.g. Softener 20g/L + Anti-wrinkle 10g/L" />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Output (m)</label>
                                <input type="number" value={form.output_quantity} onChange={e => setForm(f => ({ ...f, output_quantity: e.target.value }))} style={inp} placeholder="0" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Rejection (m)</label>
                                <input type="number" value={form.rejection_qty} onChange={e => setForm(f => ({ ...f, rejection_qty: e.target.value }))} style={inp} placeholder="0" />
                            </div>
                        </div>

                        {/* Batch input lots */}
                        <div style={{ margin: '0 0 14px', padding: '14px 16px', backgroundColor: pt.colors.inner, borderRadius: 8 }}>
                            <p style={{ margin: '0 0 10px', color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>Input Batches / Lots</p>
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

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <button onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${pt.colors.border}`, backgroundColor: 'transparent', color: pt.colors.muted, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                            <button onClick={submit} disabled={loading} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', backgroundColor: '#f59e0b', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                                {loading ? 'Saving…' : 'Save Stenter Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {['Entry #', 'Date', 'Prod. Order', 'Machine', 'Z1°C', 'Z2°C', 'Z3°C', 'Speed m/min', 'Width cm', 'Output m', 'Status', ''].map(h => (
                                <th key={h} style={th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {entries.length === 0 && (
                            <tr><td colSpan={12} style={{ ...cell, textAlign: 'center', color: pt.colors.muted, padding: 40 }}>No stenter entries yet.</td></tr>
                        )}
                        {entries.map(e => (
                            <tr key={e.id}>
                                <td style={{ ...cell, color: '#fbbf24', fontWeight: 600 }}>{e.entry_number}</td>
                                <td style={cell}>{e.entry_date}</td>
                                <td style={cell}>{e.prod_order_number}<br /><span style={{ color: pt.colors.dimText, fontSize: 11 }}>{e.product_name}</span></td>
                                <td style={cell}>{e.machine_code}</td>
                                <td style={{ ...cell, textAlign: 'center', color: '#f97316' }}>{e.stenter?.temp_zone1 ?? '—'}</td>
                                <td style={{ ...cell, textAlign: 'center', color: '#f97316' }}>{e.stenter?.temp_zone2 ?? '—'}</td>
                                <td style={{ ...cell, textAlign: 'center', color: '#f97316' }}>{e.stenter?.temp_zone3 ?? '—'}</td>
                                <td style={{ ...cell, textAlign: 'center' }}>{e.stenter?.speed_mpm ?? '—'}</td>
                                <td style={{ ...cell, textAlign: 'center' }}>{e.stenter?.width_cm ?? '—'}</td>
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

export default StenterScreen;
