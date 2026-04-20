// PAGE: Process Master (production steps in sequence)
import { useState, useEffect } from 'react';

const empty = { process_code:'', process_name:'', sequence:'1', machine_type:'', description:'' };

export default function ProcessPage() {
    const [rows,   setRows]   = useState([]);
    const [modal,  setModal]  = useState(false);
    const [form,   setForm]   = useState(empty);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg,    setMsg]    = useState('');

    const load = async () => {
        const res = await fetch('/api/masters/processes/', { credentials:'include' });
        const d = await res.json(); setRows(d.processes||[]);
    };
    useEffect(() => { load(); }, []);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => { setForm({ process_code:r.process_code, process_name:r.process_name,
        sequence:r.sequence, machine_type:r.machine_type, description:r.description });
        setEditId(r.id); setMsg(''); setModal(true); };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/masters/processes/${editId}/` : '/api/masters/processes/';
        const res = await fetch(url, { method:editId?'PUT':'POST', credentials:'include',
            headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); } else { const d = await res.json(); setMsg(d.error||'Error'); }
    };
    const del = async (id) => { if(!window.confirm('Deactivate?')) return; await fetch(`/api/masters/processes/${id}/`, {method:'DELETE',credentials:'include'}); load(); };
    const inp = (f) => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });

    return (
        <div style={{ padding:'24px 28px', fontFamily:'Inter, sans-serif', color:'#f1f5f9', minHeight:'100vh', backgroundColor:'#0b1120' }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                        <div>
                            <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Processes</h2>
                            <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>Production steps and their machine types</p>
                        </div>
                        <button onClick={openAdd} style={btn('#6366f1')}>+ Add Process</button>
                    </div>
                    <div style={{ backgroundColor:'#1e293b', borderRadius:12, overflow:'hidden' }}>
                        <table style={tableS}><thead><tr>
                            {['Seq','Code','Name','Machine Type','Description','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map(r=>(
                                <tr key={r.id}>
                                    <td style={{ ...tdS, color:'#6366f1', fontWeight:700, fontSize:16 }}>{r.sequence}</td>
                                    <td style={{ ...tdS, fontWeight:600 }}>{r.process_code}</td>
                                    <td style={tdS}>{r.process_name}</td>
                                    <td style={tdS}><span style={tag('#6366f1')}>{r.machine_type||'—'}</span></td>
                                    <td style={{ ...tdS, color:'#94a3b8' }}>{r.description}</td>
                                    <td style={tdS}>
                                        <button onClick={()=>openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                        <button onClick={()=>del(r.id)} style={smallBtn('#ef4444')}>Del</button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={6} style={{ textAlign:'center',padding:40,color:'#475569' }}>No processes</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={()=>setModal(false)} style={backBtnS}>← Back to Processes</button>
                        <h3 style={{ margin:0, fontSize:20, fontWeight:700 }}>{editId?'Edit Process':'Add Process'}</h3>
                    </div>
                    <div style={grid2}>
                        <F label="Process Code *"><input style={inpS} {...inp('process_code')} /></F>
                        <F label="Process Name *"><input style={inpS} {...inp('process_name')} /></F>
                        <F label="Sequence No"><input style={inpS} type="number" {...inp('sequence')} /></F>
                        <F label="Machine Type"><input style={inpS} placeholder="e.g. weaving" {...inp('machine_type')} /></F>
                    </div>
                    <F label="Description"><textarea style={{...inpS,height:70,resize:'vertical'}} {...inp('description')} /></F>
                    {msg && <div style={{ color:'#ef4444', marginTop:8, fontSize:13 }}>{msg}</div>}
                    <div style={{ display:'flex', gap:10, marginTop:24, justifyContent:'flex-end' }}>
                        <button onClick={()=>setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={save} disabled={saving} style={btn('#6366f1')}>{saving?'Saving…':'Save'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const F        = ({label,children}) => (<div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#94a3b8',marginBottom:4}}>{label}</label>{children}</div>);
const btn      = (bg) => ({ padding:'8px 18px', background:bg, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 });
const smallBtn = (bg) => ({ padding:'4px 10px', background:bg, color:'#fff', border:'none', borderRadius:5, cursor:'pointer', fontSize:12, marginRight:4 });
const tableS   = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const thS      = { padding:'10px 14px', textAlign:'left', fontWeight:600, fontSize:11, backgroundColor:'#0f172a', color:'#94a3b8', textTransform:'uppercase' };
const tdS      = { padding:'10px 14px', borderBottom:'1px solid #1e293b', verticalAlign:'middle', color:'#f1f5f9' };
const tag      = (bg) => ({ display:'inline-block', padding:'2px 8px', borderRadius:12, background:`${bg}20`, color:bg, fontSize:11, fontWeight:600 });
const inpS     = { width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #334155', backgroundColor:'#0f172a', color:'#f1f5f9', fontSize:13, boxSizing:'border-box' };
const grid2    = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 };
const formPage   = { backgroundColor:'#1e293b', borderRadius:12, padding:28, maxWidth:700 };
const formHeader = { display:'flex', alignItems:'center', gap:14, marginBottom:24, paddingBottom:16, borderBottom:'1px solid #334155' };
const backBtnS   = { padding:'7px 16px', background:'#0f172a', color:'#94a3b8', border:'1px solid #334155', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 };
