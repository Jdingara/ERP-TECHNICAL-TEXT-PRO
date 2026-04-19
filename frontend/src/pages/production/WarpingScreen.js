// ============================================================
// FILE: pages/production/WarpingScreen.js
// PURPOSE: Operator screen for Warping stage
//          Creates ProcessEntry + WarpingDetail (beams, ends, tension)
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000/api';

const SHIFT_COLORS = { morning: '#f59e0b', afternoon: '#3b82f6', night: '#8b5cf6' };
const STATUS_COLORS = { draft: '#f59e0b', confirmed: '#10b981', cancelled: '#ef4444' };

function WarpingScreen() {
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
        // warping specific
        beam_count: '1', total_ends: '', reed_count: '', warp_length_m: '',
        sizing_done: false, beam_numbers: '', warp_tension_g: '',
        lot_inputs: [],
    };
    const [form, setForm] = useState(blankForm);
    const [lotRow, setLotRow] = useState({ lot_id: '', quantity_used: '' });

    const load = useCallback(() => {
        fetch(`${API}/production/stages/warping/`, { credentials: 'include' })
            .then(r => r.json()).then(d => setEntries(d.entries || []));
    }, []);

    useEffect(() => {
        load();
        fetch(`${API}/planning/production-orders/?status=in_progress,planned`, { credentials: 'include' })
            .then(r => r.json()).then(d => setProdOrders(d.production_orders || []));
        fetch(`${API}/masters/machines/`, { credentials: 'include' })
            .then(r => r.json()).then(d => setMachines((d.machines || []).filter(m => m.machine_type === 'warping' || !m.machine_type)));
        fetch(`${API}/masters/processes/`, { credentials: 'include' })
            .then(r => r.json()).then(d => setProcesses((d.processes || []).filter(p =>
                p.process_name?.toLowerCase().includes('warp'))));
        fetch(`${API}/purchase/lots/?status=available`, { credentials: 'include' })
            .then(r => r.json()).then(d => setLots(d.lots || []));
    }, [load]);

    const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

    const addLotRow = () => {
        if (!lotRow.lot_id || !lotRow.quantity_used) return;
        setForm(f => ({ ...f, lot_inputs: [...f.lot_inputs, { ...lotRow }] }));
        setLotRow({ lot_id: '', quantity_used: '' });
    };

    const removeLotRow = (idx) =>
        setForm(f => ({ ...f, lot_inputs: f.lot_inputs.filter((_, i) => i !== idx) }));

    const submit = async () => {
        if (!form.production_order_id || !form.machine_id || !form.process_stage_id) {
            flash('Production Order, Machine and Process Stage are required.');
            return;
        }
        setLoading(true);
        try {
            const r = await fetch(`${API}/production/stages/warping/`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    beam_count: parseInt(form.beam_count) || 1,
                    total_ends: parseInt(form.total_ends) || 0,
                    warp_tension_g: parseInt(form.warp_tension_g) || 0,
                    output_quantity: parseFloat(form.output_quantity) || 0,
                    rejection_qty: parseFloat(form.rejection_qty) || 0,
                    warp_length_m: parseFloat(form.warp_length_m) || 0,
                }),
            });
            const d = await r.json();
            if (d.success) { flash('Warping entry saved.'); setShowForm(false); setForm(blankForm); load(); }
            else flash(d.error || 'Error saving entry.');
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
    const inp  = {
        padding: '8px 10px', borderRadius: 6, border: '1px solid #334155',
        backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 13, width: '100%', boxSizing: 'border-box',
    };

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: '#f1f5f9', minHeight: '100vh', backgroundColor: '#0b1120' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Warping Screen</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                        Beam setup · Warp yarn consumption · Tension settings
                    </p>
                </div>
                <button onClick={() => { setShowForm(true); setForm(blankForm); }}
                    style={{ padding: '9px 20px', borderRadius: 8, border: 'none', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                    + New Warping Entry
                </button>
            </div>

            {msg && <div style={{ padding: '10px 16px', borderRadius: 8, backgroundColor: msg.includes('Error') || msg.includes('required') || msg.includes('failed') ? '#7f1d1d' : '#14532d', color: '#fff', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

            {/* Form Modal */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ backgroundColor: '#1e293b', borderRadius: 12, width: '100%', maxWidth: 780, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 18 }}>New Warping Entry</h3>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            {/* Production Order */}
                            <div style={{ gridColumn: '1/-1' }}>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Production Order *</label>
                                <select value={form.production_order_id} onChange={e => setForm(f => ({ ...f, production_order_id: e.target.value }))} style={inp}>
                                    <option value="">— select —</option>
                                    {prodOrders.map(o => <option key={o.id} value={o.id}>{o.po_number} — {o.product_name}</option>)}
                                </select>
                            </div>

                            {/* Process Stage */}
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Process Stage *</label>
                                <select value={form.process_stage_id} onChange={e => setForm(f => ({ ...f, process_stage_id: e.target.value }))} style={inp}>
                                    <option value="">— select —</option>
                                    {processes.map(p => <option key={p.id} value={p.id}>{p.process_name}</option>)}
                                </select>
                            </div>

                            {/* Machine */}
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Warping Machine *</label>
                                <select value={form.machine_id} onChange={e => setForm(f => ({ ...f, machine_id: e.target.value }))} style={inp}>
                                    <option value="">— select —</option>
                                    {machines.map(m => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
                                </select>
                            </div>

                            {/* Date */}
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Entry Date</label>
                                <input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} style={inp} />
                            </div>

                            {/* Shift */}
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Shift</label>
                                <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))} style={inp}>
                                    <option value="morning">Morning</option>
                                    <option value="afternoon">Afternoon</option>
                                    <option value="night">Night</option>
                                </select>
                            </div>

                            {/* Operator */}
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Operator Name</label>
                                <input value={form.operator_name} onChange={e => setForm(f => ({ ...f, operator_name: e.target.value }))} style={inp} placeholder="e.g. Rajan" />
                            </div>
                        </div>

                        {/* Warping-Specific Parameters */}
                        <div style={{ margin: '20px 0 10px', padding: '14px 16px', backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e3a5f' }}>
                            <p style={{ margin: '0 0 12px', color: '#3b82f6', fontWeight: 600, fontSize: 13 }}>Warping Parameters</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Beam Count</label>
                                    <input type="number" value={form.beam_count} onChange={e => setForm(f => ({ ...f, beam_count: e.target.value }))} style={inp} placeholder="1" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Total Ends (threads)</label>
                                    <input type="number" value={form.total_ends} onChange={e => setForm(f => ({ ...f, total_ends: e.target.value }))} style={inp} placeholder="e.g. 3600" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Reed Count</label>
                                    <input value={form.reed_count} onChange={e => setForm(f => ({ ...f, reed_count: e.target.value }))} style={inp} placeholder="e.g. 60/10cm" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Warp Length (m)</label>
                                    <input type="number" value={form.warp_length_m} onChange={e => setForm(f => ({ ...f, warp_length_m: e.target.value }))} style={inp} placeholder="e.g. 500" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Warp Tension (g)</label>
                                    <input type="number" value={form.warp_tension_g} onChange={e => setForm(f => ({ ...f, warp_tension_g: e.target.value }))} style={inp} placeholder="e.g. 120" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Beam Numbers</label>
                                    <input value={form.beam_numbers} onChange={e => setForm(f => ({ ...f, beam_numbers: e.target.value }))} style={inp} placeholder="e.g. B001, B002" />
                                </div>
                                <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="checkbox" id="sizing" checked={form.sizing_done} onChange={e => setForm(f => ({ ...f, sizing_done: e.target.checked }))} />
                                    <label htmlFor="sizing" style={{ fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>Sizing Done (warp yarn sized before warping)</label>
                                </div>
                            </div>
                        </div>

                        {/* Output */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Output Qty (kg/m)</label>
                                <input type="number" value={form.output_quantity} onChange={e => setForm(f => ({ ...f, output_quantity: e.target.value }))} style={inp} placeholder="0" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Rejection Qty</label>
                                <input type="number" value={form.rejection_qty} onChange={e => setForm(f => ({ ...f, rejection_qty: e.target.value }))} style={inp} placeholder="0" />
                            </div>
                        </div>

                        {/* Lot Inputs */}
                        <div style={{ margin: '16px 0', padding: '14px 16px', backgroundColor: '#0f172a', borderRadius: 8 }}>
                            <p style={{ margin: '0 0 12px', color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>Warp Yarn Lots Consumed</p>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <select value={lotRow.lot_id} onChange={e => setLotRow(r => ({ ...r, lot_id: e.target.value }))}
                                    style={{ ...inp, flex: 2 }}>
                                    <option value="">— select lot —</option>
                                    {lots.map(l => <option key={l.id} value={l.id}>{l.lot_number} — {l.material_name} ({l.balance_qty} {l.uom})</option>)}
                                </select>
                                <input type="number" placeholder="Qty used" value={lotRow.quantity_used}
                                    onChange={e => setLotRow(r => ({ ...r, quantity_used: e.target.value }))}
                                    style={{ ...inp, flex: 1 }} />
                                <button onClick={addLotRow} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#1d4ed8', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Add</button>
                            </div>
                            {form.lot_inputs.map((l, i) => {
                                const lot = lots.find(x => String(x.id) === String(l.lot_id));
                                return (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: '#1e293b', borderRadius: 6, marginBottom: 4, fontSize: 13 }}>
                                        <span>{lot ? `${lot.lot_number} — ${lot.material_name}` : `Lot #${l.lot_id}`}</span>
                                        <span style={{ color: '#f59e0b' }}>{l.quantity_used} kg</span>
                                        <button onClick={() => removeLotRow(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
                                    </div>
                                );
                            })}
                        </div>

                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Notes</label>
                            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                style={{ ...inp, height: 60, resize: 'vertical' }} placeholder="Any remarks..." />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <button onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                            <button onClick={submit} disabled={loading} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                                {loading ? 'Saving…' : 'Save Warping Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Entries Table */}
            <div style={{ backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {['Entry #', 'Date', 'Prod. Order', 'Machine', 'Shift', 'Beams', 'Total Ends', 'Output (m)', 'Status', 'Actions'].map(h => (
                                <th key={h} style={th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {entries.length === 0 && (
                            <tr><td colSpan={10} style={{ ...cell, textAlign: 'center', color: '#475569', padding: 40 }}>No warping entries yet. Create one above.</td></tr>
                        )}
                        {entries.map(e => (
                            <tr key={e.id} style={{ ':hover': { backgroundColor: '#263146' } }}>
                                <td style={{ ...cell, color: '#60a5fa', fontWeight: 600 }}>{e.entry_number}</td>
                                <td style={cell}>{e.entry_date}</td>
                                <td style={cell}>{e.prod_order_number}<br /><span style={{ color: '#64748b', fontSize: 11 }}>{e.product_name}</span></td>
                                <td style={cell}>{e.machine_code}</td>
                                <td style={cell}>
                                    <span style={{ backgroundColor: SHIFT_COLORS[e.shift] + '22', color: SHIFT_COLORS[e.shift], padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{e.shift}</span>
                                </td>
                                <td style={{ ...cell, textAlign: 'center' }}>{e.warping?.beam_count ?? '—'}</td>
                                <td style={{ ...cell, textAlign: 'center' }}>{e.warping?.total_ends ?? '—'}</td>
                                <td style={{ ...cell, textAlign: 'right', fontWeight: 600 }}>{parseFloat(e.output_quantity).toFixed(1)}</td>
                                <td style={cell}>
                                    <span style={{ backgroundColor: STATUS_COLORS[e.status] + '22', color: STATUS_COLORS[e.status], padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{e.status}</span>
                                </td>
                                <td style={cell}>
                                    {e.status === 'draft' && (
                                        <button onClick={() => confirm(e.id)} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', backgroundColor: '#10b981', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                                            Confirm
                                        </button>
                                    )}
                                    {e.status === 'confirmed' && (
                                        <span style={{ color: '#10b981', fontSize: 12 }}>✓ Batch created</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default WarpingScreen;
