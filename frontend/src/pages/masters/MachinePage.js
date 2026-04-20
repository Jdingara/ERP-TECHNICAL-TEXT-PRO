// PAGE: Machine Master
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const TYPES = ['warping','weaving','stenter','tumbler','embossing','lamination','inspection','other'];
const empty = { machine_code:'', machine_name:'', machine_type:'weaving', location_id:'', capacity_per_day:'0', uom_id:'' };

export default function MachinePage() {
    const pt = usePageTheme();
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const selectS  = { ...pt.inp, width: 'auto' };
    const formPage = { ...pt.formPage, maxWidth: 900 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;
    const [rows,      setRows]      = useState([]);
    const [locations, setLocations] = useState([]);
    const [uoms,      setUoms]      = useState([]);
    const [filter,    setFilter]    = useState('');
    const [modal,     setModal]     = useState(false);
    const [form,      setForm]      = useState(empty);
    const [editId,    setEditId]    = useState(null);
    const [saving,    setSaving]    = useState(false);
    const [msg,       setMsg]       = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams(); if(filter) p.set('machine_type', filter);
        const res = await fetch(`/api/masters/machines/?${p}`, { credentials:'include' });
        const d = await res.json(); setRows(d.machines||[]);
    }, [filter]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/masters/locations/?is_active=true', {credentials:'include'}).then(r=>r.json()).then(d=>setLocations(d.locations||[]));
        fetch('/api/masters/uom/', {credentials:'include'}).then(r=>r.json()).then(d=>setUoms(d.uoms||[]));
    }, []);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => {
        setForm({ machine_code:r.machine_code, machine_name:r.machine_name,
            machine_type:r.machine_type, location_id:r.location_id||'',
            capacity_per_day:r.capacity_per_day, uom_id:r.uom_id||'' });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/masters/machines/${editId}/` : '/api/masters/machines/';
        const res = await fetch(url, { method:editId?'PUT':'POST', credentials:'include',
            headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); } else { const d = await res.json(); setMsg(d.error||'Error'); }
    };

    const del = async (id) => {
        if(!window.confirm('Deactivate?')) return;
        await fetch(`/api/masters/machines/${id}/`, {method:'DELETE',credentials:'include'}); load();
    };
    const inp = (f) => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });

    return (
        <div style={{ padding:'24px 28px', fontFamily:'Inter, sans-serif', color: pt.colors.text, minHeight:'100vh', backgroundColor: pt.colors.outer }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                        <div>
                            <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Machines</h2>
                            <p style={{ margin:'4px 0 0', color: pt.colors.dimText, fontSize:13 }}>Production machines and their capacity</p>
                        </div>
                        <button onClick={openAdd} style={btn('#f97316')}>+ Add Machine</button>
                    </div>
                    <div style={{ marginBottom:16 }}>
                        <select value={filter} onChange={e=>setFilter(e.target.value)} style={selectS}>
                            <option value="">All Types</option>
                            {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div style={{ backgroundColor: pt.colors.card, borderRadius:12, overflow:'hidden' }}>
                        <table style={tableS}><thead><tr>
                            {['Code','Name','Type','Location','Capacity/Day','UOM','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map(r=>(
                                <tr key={r.id}>
                                    <td style={{ ...tdS, fontWeight:600 }}>{r.machine_code}</td>
                                    <td style={tdS}>{r.machine_name}</td>
                                    <td style={tdS}><span style={tag('#f97316')}>{r.machine_type}</span></td>
                                    <td style={tdS}>{r.location_name}</td>
                                    <td style={tdS}>{r.capacity_per_day}</td>
                                    <td style={tdS}>{r.uom_name}</td>
                                    <td style={tdS}>
                                        <button onClick={()=>openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                        <button onClick={()=>del(r.id)} style={smallBtn('#ef4444')}>Del</button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={7} style={{ textAlign:'center',padding:40,color: pt.colors.muted }}>No machines</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={()=>setModal(false)} style={backBtnS}>← Back to Machines</button>
                        <h3 style={{ margin:0, fontSize:20, fontWeight:700 }}>{editId?'Edit Machine':'Add Machine'}</h3>
                    </div>
                    <div style={grid2}>
                        <F label="Machine Code *"><input style={inpS} {...inp('machine_code')} /></F>
                        <F label="Machine Name *"><input style={inpS} {...inp('machine_name')} /></F>
                        <F label="Machine Type">
                            <select style={inpS} {...inp('machine_type')}>{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
                        </F>
                        <F label="Location">
                            <select style={inpS} {...inp('location_id')}>
                                <option value="">-- Select --</option>
                                {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </F>
                        <F label="Capacity per Day"><input style={inpS} type="number" {...inp('capacity_per_day')} /></F>
                        <F label="UOM">
                            <select style={inpS} {...inp('uom_id')}>
                                <option value="">-- Select --</option>
                                {uoms.map(u=><option key={u.id} value={u.id}>{u.short_name}</option>)}
                            </select>
                        </F>
                    </div>
                    {msg && <div style={{ color:'#ef4444', marginTop:8, fontSize:13 }}>{msg}</div>}
                    <div style={{ display:'flex', gap:10, marginTop:24, justifyContent:'flex-end' }}>
                        <button onClick={()=>setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={save} disabled={saving} style={btn('#f97316')}>{saving?'Saving…':'Save'}</button>
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
