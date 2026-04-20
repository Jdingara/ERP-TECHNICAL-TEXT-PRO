// PAGE: Beams — Warp beam tracking for weaving/technical textile
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const empty = { beam_number:'', batch_id:'', machine_id:'', yarn_count:'', warp_ends:'', reed_width:'', beam_length:'', beam_weight:'', operator:'', beam_date:new Date().toISOString().slice(0,10), status:'prepared', notes:'' };

export default function BeamsPage() {
    const pt = usePageTheme();
    const emptyTd  = { textAlign:'center', padding:40, color: pt.colors.muted };
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const searchS  = { ...pt.inp, width: 280, outline: 'none' };
    const formPage = { ...pt.formPage, maxWidth: 1000 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;
    const [rows,    setRows]    = useState([]);
    const [batches, setBatches] = useState([]);
    const [machines,setMachines]= useState([]);
    const [search,  setSearch]  = useState('');
    const [modal,   setModal]   = useState(false);
    const [form,    setForm]    = useState(empty);
    const [editId,  setEditId]  = useState(null);
    const [saving,  setSaving]  = useState(false);
    const [msg,     setMsg]     = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        const res = await fetch(`/api/production/beams/?${p}`, { credentials:'include' });
        const d = await res.json();
        setRows(d.beams||[]);
    }, [search]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/production/batches/?status=finished', {credentials:'include'}).then(r=>r.json()).then(d=>setBatches(d.batches||[]));
        fetch('/api/masters/machines/', {credentials:'include'}).then(r=>r.json()).then(d=>setMachines(d.machines||[]));
    }, []);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => {
        setForm({ beam_number:r.beam_number, batch_id:r.batch_id||'', machine_id:r.machine_id||'',
            yarn_count:r.yarn_count||'', warp_ends:r.warp_ends||'', reed_width:r.reed_width||'',
            beam_length:r.beam_length||'', beam_weight:r.beam_weight||'', operator:r.operator||'',
            beam_date:r.beam_date, status:r.status, notes:r.notes||'' });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/production/beams/${editId}/` : '/api/production/beams/';
        const res = await fetch(url, { method:editId?'PUT':'POST', credentials:'include',
            headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error||'Error'); }
    };

    const inp = (f) => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });
    const STATUS_COLOR = { prepared:'#f59e0b', loaded:'#3b82f6', completed:'#10b981', scrapped:'#ef4444' };

    return (
        <div style={{ padding:24 }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                        <div>
                            <h2 style={{ margin:'0 0 4px', fontSize:22, fontWeight:700 }}>Beams</h2>
                            <p style={{ margin:0, color: pt.colors.dimText, fontSize:13 }}>Warp beam records for weaving machines</p>
                        </div>
                        <button onClick={openAdd} style={btn('#8b5cf6')}>+ New Beam</button>
                    </div>
                    <div style={{ marginBottom:16 }}>
                        <input placeholder="Search beam number…" value={search}
                            onChange={e=>setSearch(e.target.value)} style={searchS} />
                    </div>
                    <div style={{ overflowX:'auto' }}>
                        <table style={tableS}><thead><tr style={{ background: pt.colors.inner, color:'#fff' }}>
                            {['Beam No','Date','Batch Ref','Machine','Yarn Count','Warp Ends','Width (cm)','Length (m)','Weight (kg)','Operator','Status','Actions'].map(h=>
                                <th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map((r,i)=>(
                                <tr key={r.id} style={{ background:i%2===0?pt.colors.inner:'#fff' }}>
                                    <td style={tdS}><b style={{ color:'#8b5cf6' }}>{r.beam_number}</b></td>
                                    <td style={tdS}>{r.beam_date}</td>
                                    <td style={tdS}>{r.batch_number||'—'}</td>
                                    <td style={tdS}>{r.machine_code||'—'}</td>
                                    <td style={tdS}>{r.yarn_count||'—'}</td>
                                    <td style={tdS}>{r.warp_ends||'—'}</td>
                                    <td style={tdS}>{r.reed_width||'—'}</td>
                                    <td style={tdS}>{r.beam_length||'—'}</td>
                                    <td style={tdS}>{r.beam_weight||'—'}</td>
                                    <td style={tdS}>{r.operator||'—'}</td>
                                    <td style={tdS}><span style={tag(STATUS_COLOR[r.status]||'#64748b')}>{r.status}</span></td>
                                    <td style={tdS}><button onClick={()=>openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button></td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={12} style={emptyTd}>No beams recorded yet</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={()=>setModal(false)} style={backBtnS}>← Back to Beams</button>
                        <h3 style={{ margin:0, fontSize:20, fontWeight:700 }}>{editId?'Edit Beam':'New Beam Record'}</h3>
                    </div>
                    <div style={grid3}>
                        <F label="Beam Number *"><input style={inpS} {...inp('beam_number')} /></F>
                        <F label="Date *"><input type="date" style={inpS} {...inp('beam_date')} /></F>
                        <F label="Status">
                            <select style={inpS} {...inp('status')}>
                                <option value="prepared">Prepared</option>
                                <option value="loaded">Loaded on Machine</option>
                                <option value="completed">Completed</option>
                                <option value="scrapped">Scrapped</option>
                            </select>
                        </F>
                        <F label="Batch Reference">
                            <select style={inpS} {...inp('batch_id')}>
                                <option value="">None</option>
                                {batches.map(b=><option key={b.id} value={b.id}>{b.batch_number}</option>)}
                            </select>
                        </F>
                        <F label="Machine">
                            <select style={inpS} {...inp('machine_id')}>
                                <option value="">None</option>
                                {machines.map(m=><option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
                            </select>
                        </F>
                        <F label="Operator"><input style={inpS} {...inp('operator')} /></F>
                        <F label="Yarn Count"><input style={inpS} placeholder="e.g. 40/2" {...inp('yarn_count')} /></F>
                        <F label="Warp Ends"><input type="number" style={inpS} {...inp('warp_ends')} /></F>
                        <F label="Reed Width (cm)"><input type="number" style={inpS} {...inp('reed_width')} /></F>
                        <F label="Beam Length (m)"><input type="number" style={inpS} {...inp('beam_length')} /></F>
                        <F label="Beam Weight (kg)"><input type="number" style={inpS} {...inp('beam_weight')} /></F>
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
const grid3    = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:16 };
