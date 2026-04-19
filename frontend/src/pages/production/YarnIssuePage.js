// PAGE: Yarn Issue — Issue warp/weft yarn from store to production floor
import { useState, useEffect, useCallback } from 'react';

const empty = {
    production_order_id: '', lot_id: '', issued_qty: '', purpose: 'warp',
    issue_date: new Date().toISOString().slice(0, 10),
    shift: 'morning', machine_id: '', issued_by: '', notes: '',
};

export default function YarnIssuePage() {
    const [rows,    setRows]    = useState([]);
    const [orders,  setOrders]  = useState([]);
    const [lots,    setLots]    = useState([]);
    const [machines,setMachines]= useState([]);
    const [status,  setStatus]  = useState('');
    const [modal,   setModal]   = useState(false);
    const [form,    setForm]    = useState(empty);
    const [saving,  setSaving]  = useState(false);
    const [msg,     setMsg]     = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (status) p.set('status', status);
        const res = await fetch(`/api/production/yarn-issues/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.yarn_issues || []);
    }, [status]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/planning/production-orders/?status=released', { credentials: 'include' }).then(r => r.json()).then(d => setOrders(d.orders || []));
        fetch('/api/purchase/lots/?status=available', { credentials: 'include' }).then(r => r.json()).then(d => setLots(d.lots || []));
        fetch('/api/masters/machines/', { credentials: 'include' }).then(r => r.json()).then(d => setMachines(d.machines || []));
    }, []);

    const openAdd = () => { setForm(empty); setMsg(''); setModal(true); };

    const save = async () => {
        if (!form.production_order_id || !form.lot_id || !form.issued_qty) {
            setMsg('Production Order, Lot, and Issued Qty are required'); return;
        }
        setSaving(true);
        const res = await fetch('/api/production/yarn-issues/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const confirm = async (id) => {
        if (!window.confirm('Confirm this yarn issue? Lot balance will be deducted.')) return;
        const res = await fetch(`/api/production/yarn-issues/${id}/confirm/`, {
            method: 'POST', credentials: 'include',
        });
        if (res.ok) { load(); }
        else { const d = await res.json(); alert(d.error || 'Error'); }
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });
    const selectedLot = lots.find(l => String(l.id) === String(form.lot_id));

    const PURPOSE_COLOR = { warp: '#f97316', weft: '#3b82f6', other: '#64748b' };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Yarn Issue</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
                        Issue warp/weft yarn from store to production floor before starting a process
                    </p>
                </div>
                <button onClick={openAdd} style={btn('#f97316')}>+ New Yarn Issue</button>
            </div>

            <div style={{ marginBottom: 16 }}>
                <select value={status} onChange={e => setStatus(e.target.value)} style={selectS}>
                    <option value="">All Issues</option>
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['Issue No', 'Date', 'Production Order', 'Lot No', 'Material', 'Color', 'Purpose', 'Issued Qty', 'Machine', 'Shift', 'Issued By', 'Status', 'Actions'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={tdS}><b style={{ color: '#f97316' }}>{r.issue_number}</b></td>
                            <td style={tdS}>{r.issue_date}</td>
                            <td style={tdS}>{r.prod_order_number}</td>
                            <td style={tdS}><b style={{ color: '#ec4899' }}>{r.lot_number}</b></td>
                            <td style={tdS}>{r.material_name}</td>
                            <td style={tdS}>{r.color_code || '—'}</td>
                            <td style={tdS}><span style={tag(PURPOSE_COLOR[r.purpose] || '#64748b')}>{r.purpose}</span></td>
                            <td style={tdS}><b>{r.issued_qty}</b></td>
                            <td style={tdS}>{r.machine_code || '—'}</td>
                            <td style={tdS}>{r.shift}</td>
                            <td style={tdS}>{r.issued_by || '—'}</td>
                            <td style={tdS}><span style={tag(r.status === 'confirmed' ? '#10b981' : '#64748b')}>{r.status}</span></td>
                            <td style={tdS}>
                                {r.status === 'draft' && (
                                    <button onClick={() => confirm(r.id)} style={smallBtn('#10b981')}>Confirm</button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={13} style={emptyTd}>No yarn issues yet</td></tr>}
                </tbody></table>
            </div>

            {modal && (
                <div style={overlay}>
                    <div style={modalBox}>
                        <h3 style={{ margin: '0 0 20px', color: '#f97316' }}>New Yarn Issue</h3>
                        <div style={grid3}>
                            <F label="Production Order *">
                                <select style={inpS} {...inp('production_order_id')}>
                                    <option value="">Select production order…</option>
                                    {orders.map(o => <option key={o.id} value={o.id}>{o.prod_order_number} — {o.product_name}</option>)}
                                </select>
                            </F>
                            <F label="Issue Date *"><input type="date" style={inpS} {...inp('issue_date')} /></F>
                            <F label="Purpose *">
                                <select style={inpS} {...inp('purpose')}>
                                    <option value="warp">Warp Yarn Issue</option>
                                    <option value="weft">Weft / Filling Issue</option>
                                    <option value="other">Other Material Issue</option>
                                </select>
                            </F>
                        </div>

                        <F label="Lot to Issue *">
                            <select style={inpS} {...inp('lot_id')}>
                                <option value="">Select available lot…</option>
                                {lots.map(l => (
                                    <option key={l.id} value={l.id}>
                                        {l.lot_number} — {l.material_name} {l.color_code ? `[${l.color_code}]` : ''} (Balance: {l.balance_qty} {l.uom})
                                    </option>
                                ))}
                            </select>
                        </F>

                        {selectedLot && (
                            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', margin: '12px 0', fontSize: 13 }}>
                                Available balance: <b style={{ color: '#f97316' }}>{selectedLot.balance_qty} {selectedLot.uom}</b>
                            </div>
                        )}

                        <div style={{ ...grid3, marginTop: 14 }}>
                            <F label="Issued Qty *">
                                <input type="number" min="0.01"
                                    max={selectedLot ? selectedLot.balance_qty : undefined}
                                    style={inpS} {...inp('issued_qty')} />
                            </F>
                            <F label="Machine">
                                <select style={inpS} {...inp('machine_id')}>
                                    <option value="">Select machine…</option>
                                    {machines.map(m => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
                                </select>
                            </F>
                            <F label="Shift">
                                <select style={inpS} {...inp('shift')}>
                                    <option value="morning">Morning</option>
                                    <option value="afternoon">Afternoon</option>
                                    <option value="night">Night</option>
                                </select>
                            </F>
                            <F label="Issued By"><input style={inpS} {...inp('issued_by')} /></F>
                        </div>
                        <F label="Notes"><textarea style={{ ...inpS, height: 60, resize: 'vertical' }} {...inp('notes')} /></F>

                        {msg && <div style={{ color: '#ef4444', marginTop: 8, fontWeight: 600 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#f97316')}>{saving ? 'Saving…' : 'Save Issue'}</button>
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
const modalBox = { background: '#fff', borderRadius: 12, padding: 28, width: 780, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const grid3    = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 };
const inpS     = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' };
const selectS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' };
const tag      = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const emptyTd  = { textAlign: 'center', padding: 40, color: '#94a3b8' };
