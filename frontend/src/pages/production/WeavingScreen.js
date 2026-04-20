// ============================================================
// FILE: pages/production/WeavingScreen.js
// PURPOSE: Operator screen for Weaving stage
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const SHIFT_COLORS  = { morning: '#f59e0b', afternoon: '#3b82f6', night: '#8b5cf6' };
const STATUS_COLORS = { draft: '#f59e0b', confirmed: '#10b981', cancelled: '#ef4444' };

function WeavingScreen() {
    const pt = usePageTheme();
    const [entries, setEntries]       = useState([]);
    const [prodOrders, setProdOrders] = useState([]);
    const [machines, setMachines]     = useState([]);
    const [processes, setProcesses]   = useState([]);
    const [beams, setBeams]           = useState([]);
    const [lots, setLots]             = useState([]);
    const [showForm, setShowForm]     = useState(false);
    const [loading, setLoading]       = useState(false);
    const [msg, setMsg]               = useState('');

    const blankForm = {
        production_order_id: '', process_stage_id: '', machine_id: '',
        entry_date: new Date().toISOString().slice(0, 10), shift: 'morning',
        operator_name: '', output_quantity: '', rejection_qty: '', notes: '',
        beam_outward_id: '', loom_rpm: '', picks_per_cm: '',
        weft_pattern: 'plain', fabric_width_cm: '', efficiency_pct: '',
        lot_inputs: [],
    };
    const [form, setForm] = useState(blankForm);
    const [lotRow, setLotRow] = useState({ lot_id: '', quantity_used: '' });

    const load = useCallback(() => {
        fetch('/api/production/stages/weaving/', { credentials: 'include' })
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
                p.process_name?.toLowerCase().includes('weav') || p.process_name?.toLowerCase().includes('loom'))));
        fetch('/api/production/beams/', { credentials: 'include' })
            .then(r => r.json()).then(d => setBeams(d.beams || []));
        fetch('/api/purchase/lots/?status=available', { credentials: 'include' })
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
            flash('Production Order, Machine and Process Stage are required.'); return;
        }
        setLoading(true);
        try {
            const r = await fetch('/api/production/stages/weaving/', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    beam_outward_id: form.beam_outward_id || null,
                    loom_rpm: parseInt(form.loom_rpm) || 0,
                    picks_per_cm: parseFloat(form.picks_per_cm) || 0,
                    fabric_width_cm: parseFloat(form.fabric_width_cm) || 0,
                    efficiency_pct: parseFloat(form.efficiency_pct) || 0,
                    output_quantity: parseFloat(form.output_quantity) || 0,
                    rejection_qty: parseFloat(form.rejection_qty) || 0,
                }),
            });
            const d = await r.json();
            if (d.success) { flash('Weaving entry saved.'); setShowForm(false); setForm(blankForm); load(); }
            else flash(d.error || 'Error saving entry.');
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
                            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Weaving Screen</h2>
                            <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>Loom-wise output · Beam allocation · RPM · Picks/cm</p>
                        </div>
                        <button onClick={() => { setShowForm(true); setForm(blankForm); }}
                            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                            + New Weaving Entry
                        </button>
                    </div>

                    {msg && <div style={{ padding: '10px 16px', borderRadius: 8, backgroundColor: msg.includes('Error') || msg.includes('required') || msg.includes('failed') ? '#7f1d1d' : '#14532d', color: '#fff', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

                    <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {['Entry #', 'Date', 'Prod. Order', 'Machine', 'Beam', 'RPM', 'Picks/cm', 'Output (m)', 'Efficiency', 'Status', 'Actions'].map(h => (
                                        <th key={h} style={th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {entries.length === 0 && (
                                    <tr><td colSpan={11} style={{ ...cell, textAlign: 'center', color: pt.colors.muted, padding: 40 }}>No weaving entries yet.</td></tr>
                                )}
                                {entries.map(e => (
                                    <tr key={e.id}>
                                        <td style={{ ...cell, color: '#34d399', fontWeight: 600 }}>{e.entry_number}</td>
                                        <td style={cell}>{e.entry_date}</td>
                                        <td style={cell}>{e.prod_order_number}<br /><span style={{ color: pt.colors.dimText, fontSize: 11 }}>{e.product_name}</span></td>
                                        <td style={cell}>{e.machine_code}</td>
                                        <td style={cell}>{e.weaving?.beam_outward ?? '—'}</td>
                                        <td style={{ ...cell, textAlign: 'center' }}>{e.weaving?.loom_rpm ?? '—'}</td>
                                        <td style={{ ...cell, textAlign: 'center' }}>{e.weaving?.picks_per_cm ?? '—'}</td>
                                        <td style={{ ...cell, textAlign: 'right', fontWeight: 600 }}>{parseFloat(e.output_quantity).toFixed(1)}</td>
                                        <td style={{ ...cell, textAlign: 'center', color: '#10b981' }}>
                                            {e.weaving?.efficiency_pct ? `${e.weaving.efficiency_pct}%` : '—'}
                                        </td>
                                        <td style={cell}>
                                            <span style={{ backgroundColor: STATUS_COLORS[e.status] + '22', color: STATUS_COLORS[e.status], padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{e.status}</span>
                                        </td>
                                        <td style={cell}>
                                            {e.status === 'draft' && (
                                                <button onClick={() => confirm(e.id)} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', backgroundColor: '#10b981', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Confirm</button>
                                            )}
                                            {e.status === 'confirmed' && <span style={{ color: '#10b981', fontSize: 12 }}>✓ Batch</span>}
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
                            ← Back to Weaving
                        </button>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>New Weaving Entry</h3>
                    </div>

                    {msg && <div style={{ padding: '10px 16px', borderRadius: 8, backgroundColor: '#7f1d1d', color: '#fff', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
                            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Loom Machine *</label>
                            <select value={form.machine_id} onChange={e => setForm(f => ({ ...f, machine_id: e.target.value }))} style={inp}>
                                <option value="">— select —</option>
                                {machines.map(m => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Beam (from Warping)</label>
                            <select value={form.beam_outward_id} onChange={e => setForm(f => ({ ...f, beam_outward_id: e.target.value }))} style={inp}>
                                <option value="">— select beam —</option>
                                {beams.map(b => <option key={b.id} value={b.id}>{b.beam_number} ({b.quantity} kg)</option>)}
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
                            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Operator Name</label>
                            <input value={form.operator_name} onChange={e => setForm(f => ({ ...f, operator_name: e.target.value }))} style={inp} placeholder="e.g. Kumar" />
                        </div>
                    </div>

                    <div style={{ margin: '20px 0 10px', padding: '14px 16px', backgroundColor: pt.colors.inner, borderRadius: 8, border: '1px solid #14532d' }}>
                        <p style={{ margin: '0 0 12px', color: '#10b981', fontWeight: 600, fontSize: 13 }}>Weaving Parameters</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Loom RPM</label>
                                <input type="number" value={form.loom_rpm} onChange={e => setForm(f => ({ ...f, loom_rpm: e.target.value }))} style={inp} placeholder="e.g. 350" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Picks / cm</label>
                                <input type="number" step="0.1" value={form.picks_per_cm} onChange={e => setForm(f => ({ ...f, picks_per_cm: e.target.value }))} style={inp} placeholder="e.g. 16.5" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Weft Pattern</label>
                                <select value={form.weft_pattern} onChange={e => setForm(f => ({ ...f, weft_pattern: e.target.value }))} style={inp}>
                                    <option value="plain">Plain</option>
                                    <option value="twill">Twill</option>
                                    <option value="satin">Satin</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Fabric Width (cm)</label>
                                <input type="number" value={form.fabric_width_cm} onChange={e => setForm(f => ({ ...f, fabric_width_cm: e.target.value }))} style={inp} placeholder="e.g. 160" />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Efficiency %</label>
                                <input type="number" value={form.efficiency_pct} onChange={e => setForm(f => ({ ...f, efficiency_pct: e.target.value }))} style={inp} placeholder="e.g. 87.5" />
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

                    <div style={{ margin: '0 0 14px', padding: '14px 16px', backgroundColor: pt.colors.inner, borderRadius: 8 }}>
                        <p style={{ margin: '0 0 12px', color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>Weft Yarn Lots Used</p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <select value={lotRow.lot_id} onChange={e => setLotRow(r => ({ ...r, lot_id: e.target.value }))} style={{ ...inp, flex: 2 }}>
                                <option value="">— select lot —</option>
                                {lots.map(l => <option key={l.id} value={l.id}>{l.lot_number} — {l.material_name} ({l.balance_qty})</option>)}
                            </select>
                            <input type="number" placeholder="Qty" value={lotRow.quantity_used}
                                onChange={e => setLotRow(r => ({ ...r, quantity_used: e.target.value }))}
                                style={{ ...inp, flex: 1 }} />
                            <button onClick={addLotRow} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#1d4ed8', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Add</button>
                        </div>
                        {form.lot_inputs.map((l, i) => {
                            const lot = lots.find(x => String(x.id) === String(l.lot_id));
                            return (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: pt.colors.card, borderRadius: 6, marginBottom: 4, fontSize: 13 }}>
                                    <span>{lot ? `${lot.lot_number} — ${lot.material_name}` : `Lot #${l.lot_id}`}</span>
                                    <span style={{ color: '#f59e0b' }}>{l.quantity_used}</span>
                                    <button onClick={() => removeLotRow(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
                                </div>
                            );
                        })}
                    </div>

                    <div>
                        <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Notes</label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            style={{ ...inp, height: 55, resize: 'vertical' }} placeholder="Any loom-specific notes..." />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                        <button onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${pt.colors.border}`, backgroundColor: 'transparent', color: pt.colors.muted, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                        <button onClick={submit} disabled={loading} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                            {loading ? 'Saving…' : 'Save Weaving Entry'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WeavingScreen;
