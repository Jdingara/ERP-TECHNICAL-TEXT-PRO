// PAGE: Daily Production Plan
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const today = new Date().toISOString().slice(0, 10);
const empty = { plan_date:today, prod_order_id:'', machine_id:'', process_id:'', operator:'', shift:'day', planned_qty:'', notes:'' };

export default function DailyPlanPage() {
    const pt = usePageTheme();
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const formPage = { ...pt.formPage, maxWidth: 900 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;
    const [rows,     setRows]     = useState([]);
    const [orders,   setOrders]   = useState([]);
    const [machines, setMachines] = useState([]);
    const [processes,setProc]     = useState([]);
    const [date,     setDate]     = useState(today);
    const [modal,    setModal]    = useState(false);
    const [form,     setForm]     = useState(empty);
    const [saving,   setSaving]   = useState(false);
    const [msg,      setMsg]      = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (date) p.set('date', date);
        const res = await fetch(`/api/planning/daily-plan/?${p}`, { credentials:'include' });
        const d = await res.json();
        setRows(d.plans||[]);
    }, [date]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/planning/production-orders/?status=released', {credentials:'include'}).then(r=>r.json()).then(d=>setOrders(d.orders||[]));
        fetch('/api/masters/machines/', {credentials:'include'}).then(r=>r.json()).then(d=>setMachines(d.machines||[]));
        fetch('/api/masters/processes/', {credentials:'include'}).then(r=>r.json()).then(d=>setProc(d.processes||[]));
    }, []);

    const openAdd = () => { setForm({...empty, plan_date:date}); setMsg(''); setModal(true); };

    const save = async () => {
        setSaving(true);
        const res = await fetch('/api/planning/daily-plan/', { method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error||'Error'); }
    };

    const del = async (id) => {
        if (!window.confirm('Remove this plan entry?')) return;
        await fetch(`/api/planning/daily-plan/${id}/`, { method:'DELETE', credentials:'include' });
        load();
    };

    const inp = (f) => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });
    const SHIFT_COLOR = { day:'#3b82f6', evening:'#f59e0b', night:'#8b5cf6' };

    return (
        <div style={{ padding:24 }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                        <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Daily Production Plan</h2>
                        <button onClick={openAdd} style={btn('#8b5cf6')}>+ Add Plan Entry</button>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24, background: pt.colors.inner, borderRadius:10, padding:'12px 18px' }}>
                        <span style={{ fontWeight:600, fontSize:13, color: pt.colors.muted }}>Plan Date:</span>
                        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                            style={{ padding:'6px 12px', borderRadius:8, border: `1px solid ${pt.colors.border}`, fontSize:14, fontWeight:600 }} />
                        <span style={{ color: pt.colors.dimText, fontSize:13 }}>{rows.length} entries planned</span>
                    </div>
                    {rows.length===0 ? (
                        <div style={{ textAlign:'center', padding:60, background: pt.colors.inner, borderRadius:12 }}>
                            <div style={{ fontSize:36, marginBottom:12 }}>📅</div>
                            <div style={{ fontWeight:600, color: pt.colors.muted }}>No plan for {date}</div>
                            <div style={{ color: pt.colors.muted, fontSize:13, marginTop:6 }}>Click "+ Add Plan Entry" to schedule production for this day.</div>
                        </div>
                    ) : (
                        <div style={{ overflowX:'auto' }}>
                            <table style={tableS}><thead><tr style={{ background: pt.colors.inner, color:'#fff' }}>
                                {['Production Order','Product','Machine','Process','Operator','Shift','Planned Qty','Actions'].map(h=>
                                    <th key={h} style={thS}>{h}</th>)}
                            </tr></thead><tbody>
                                {rows.map((r,i)=>(
                                    <tr key={r.id} style={{ background:i%2===0?pt.colors.inner:'#fff' }}>
                                        <td style={tdS}><b style={{ color:'#f59e0b' }}>{r.prod_order_number}</b></td>
                                        <td style={tdS}>{r.product_name}</td>
                                        <td style={tdS}>{r.machine_code} {r.machine_name&&`— ${r.machine_name}`}</td>
                                        <td style={tdS}>{r.process_name}</td>
                                        <td style={tdS}>{r.operator||'—'}</td>
                                        <td style={tdS}><span style={tag(SHIFT_COLOR[r.shift]||'#64748b')}>{r.shift}</span></td>
                                        <td style={tdS}><b>{r.planned_qty}</b></td>
                                        <td style={tdS}><button onClick={()=>del(r.id)} style={smallBtn('#ef4444')}>Remove</button></td>
                                    </tr>
                                ))}
                            </tbody></table>
                        </div>
                    )}
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={()=>setModal(false)} style={backBtnS}>← Back to Daily Plan</button>
                        <h3 style={{ margin:0, fontSize:20, fontWeight:700 }}>Add Plan Entry — {form.plan_date}</h3>
                    </div>
                    <div style={grid2}>
                        <F label="Production Order *">
                            <select style={inpS} {...inp('prod_order_id')}>
                                <option value="">Select production order…</option>
                                {orders.map(o=><option key={o.id} value={o.id}>{o.prod_order_number} — {o.product_name}</option>)}
                            </select>
                        </F>
                        <F label="Machine *">
                            <select style={inpS} {...inp('machine_id')}>
                                <option value="">Select machine…</option>
                                {machines.map(m=><option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
                            </select>
                        </F>
                        <F label="Process Stage">
                            <select style={inpS} {...inp('process_id')}>
                                <option value="">Select process…</option>
                                {processes.map(p=><option key={p.id} value={p.id}>{p.process_name}</option>)}
                            </select>
                        </F>
                        <F label="Shift *">
                            <select style={inpS} {...inp('shift')}>
                                <option value="day">Day</option>
                                <option value="evening">Evening</option>
                                <option value="night">Night</option>
                            </select>
                        </F>
                        <F label="Operator"><input style={inpS} {...inp('operator')} /></F>
                        <F label="Planned Qty *"><input type="number" style={inpS} {...inp('planned_qty')} /></F>
                    </div>
                    <F label="Notes"><textarea style={{...inpS,height:60,resize:'vertical'}} {...inp('notes')} /></F>
                    {msg && <div style={{ color:'#ef4444', marginTop:8 }}>{msg}</div>}
                    <div style={{ display:'flex', gap:10, marginTop:24, justifyContent:'flex-end' }}>
                        <button onClick={()=>setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={save} disabled={saving} style={btn('#8b5cf6')}>{saving?'Saving…':'Save'}</button>
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
const btn      = (bg) => ({ padding:'8px 18px', background:bg, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 });
const smallBtn = (bg) => ({ padding:'4px 10px', background:bg, color:'#fff', border:'none', borderRadius:5, cursor:'pointer', fontSize:12, marginRight:4 });
const tableS   = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const tag      = (bg) => ({ display:'inline-block', padding:'2px 8px', borderRadius:12, background:`${bg}20`, color:bg, fontSize:11, fontWeight:600 });
const grid2    = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 };
