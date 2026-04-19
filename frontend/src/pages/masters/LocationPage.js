// PAGE: Location Master
import { useState, useEffect } from 'react';

const TYPES = ['raw_material','wip','finished','dispatch'];
const empty = { name:'', code:'', location_type:'raw_material' };

export default function LocationPage() {
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const load = async () => {
        const res = await fetch('/api/masters/locations/', { credentials:'include' });
        const d = await res.json(); setRows(d.locations||[]);
    };
    useEffect(() => { load(); }, []);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => { setForm({ name:r.name, code:r.code, location_type:r.location_type }); setEditId(r.id); setMsg(''); setModal(true); };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/masters/locations/${editId}/` : '/api/masters/locations/';
        const res = await fetch(url, { method: editId?'PUT':'POST', credentials:'include',
            headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); } else { const d = await res.json(); setMsg(d.error||'Error'); }
    };
    const del = async (id) => { if(!window.confirm('Deactivate?')) return; await fetch(`/api/masters/locations/${id}/`, {method:'DELETE',credentials:'include'}); load(); };
    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({...p, [f]: e.target.value})) });

    const typeColor = { raw_material:'#10b981', wip:'#f59e0b', finished:'#3b82f6', dispatch:'#8b5cf6' };

    return (
        <div style={{ padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Locations</h2>
                <button onClick={openAdd} style={btn('#3b82f6')}>+ Add Location</button>
            </div>
            <table style={tableS}><thead><tr style={{ background:'#1e293b', color:'#fff' }}>
                {['Code','Name','Type','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
            </tr></thead><tbody>
                {rows.map((r,i)=>(
                    <tr key={r.id} style={{ background: i%2===0?'#f8fafc':'#fff' }}>
                        <td style={tdS}><b>{r.code}</b></td>
                        <td style={tdS}>{r.name}</td>
                        <td style={tdS}><span style={tag(typeColor[r.location_type]||'#64748b')}>{r.location_type}</span></td>
                        <td style={tdS}>
                            <button onClick={()=>openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                            <button onClick={()=>del(r.id)} style={smallBtn('#ef4444')}>Del</button>
                        </td>
                    </tr>
                ))}
                {rows.length===0 && <tr><td colSpan={4} style={{ textAlign:'center',padding:40,color:'#94a3b8' }}>No locations</td></tr>}
            </tbody></table>
            {modal && (
                <div style={overlay}><div style={{ ...mBox, width:440 }}>
                    <h3 style={{ margin:'0 0 20px' }}>{editId?'Edit Location':'Add Location'}</h3>
                    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                        <F label="Location Code *"><input style={inpS} {...inp('code')} /></F>
                        <F label="Location Name *"><input style={inpS} {...inp('name')} /></F>
                        <F label="Type">
                            <select style={inpS} {...inp('location_type')}>
                                {TYPES.map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
                            </select>
                        </F>
                    </div>
                    {msg && <div style={{ color:'#ef4444', marginTop:8 }}>{msg}</div>}
                    <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                        <button onClick={()=>setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={save} disabled={saving} style={btn('#3b82f6')}>{saving?'Saving…':'Save'}</button>
                    </div>
                </div></div>
            )}
        </div>
    );
}

// ── Shared styles ─────────────────────────────────────────────
const btn      = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const searchS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 280, outline: 'none' };
const selectS  = { padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 };
const tableS   = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thS      = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdS      = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const tag      = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const overlay  = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 };
const mBox     = { background: '#fff', borderRadius: 12, padding: 28, width: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const grid2    = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };
const inpS     = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' };
const F        = ({ label, children }) => (<div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:4 }}>{label}</label>{children}</div>);
