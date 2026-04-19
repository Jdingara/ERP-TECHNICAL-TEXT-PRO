// PAGE: Unit of Measure Master
import { useState, useEffect } from 'react';

const empty = { name:'', short_name:'' };

export default function UOMPage() {
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const load = async () => {
        const res = await fetch('/api/masters/uom/', { credentials:'include' });
        const d = await res.json(); setRows(d.uoms||[]);
    };
    useEffect(() => { load(); }, []);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => { setForm({ name:r.name, short_name:r.short_name }); setEditId(r.id); setMsg(''); setModal(true); };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/masters/uom/${editId}/` : '/api/masters/uom/';
        const res = await fetch(url, { method: editId?'PUT':'POST', credentials:'include',
            headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); } else { const d = await res.json(); setMsg(d.error||'Error'); }
    };
    const del = async (id) => { if(!window.confirm('Deactivate?')) return; await fetch(`/api/masters/uom/${id}/`, {method:'DELETE',credentials:'include'}); load(); };
    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({...p, [f]: e.target.value})) });

    return (
        <div style={{ padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Units of Measure</h2>
                <button onClick={openAdd} style={btn('#06b6d4')}>+ Add UOM</button>
            </div>
            <div style={{ maxWidth:500 }}>
                <table style={tableS}><thead><tr style={{ background:'#1e293b', color:'#fff' }}>
                    {['Short Name','Full Name','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r,i)=>(
                        <tr key={r.id} style={{ background: i%2===0?'#f8fafc':'#fff' }}>
                            <td style={tdS}><span style={tag('#06b6d4')}>{r.short_name}</span></td>
                            <td style={tdS}>{r.name}</td>
                            <td style={tdS}>
                                <button onClick={()=>openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                <button onClick={()=>del(r.id)} style={smallBtn('#ef4444')}>Del</button>
                            </td>
                        </tr>
                    ))}
                    {rows.length===0 && <tr><td colSpan={3} style={{ textAlign:'center',padding:40,color:'#94a3b8' }}>No UOMs</td></tr>}
                </tbody></table>
            </div>
            {modal && (
                <div style={overlay}><div style={{ ...mBox, width:380 }}>
                    <h3 style={{ margin:'0 0 20px' }}>{editId?'Edit UOM':'Add UOM'}</h3>
                    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                        <F label="Full Name (e.g. Kilogram)"><input style={inpS} {...inp('name')} /></F>
                        <F label="Short Name (e.g. Kg)"><input style={inpS} {...inp('short_name')} /></F>
                    </div>
                    {msg && <div style={{ color:'#ef4444', marginTop:8 }}>{msg}</div>}
                    <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                        <button onClick={()=>setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={save} disabled={saving} style={btn('#06b6d4')}>{saving?'Saving…':'Save'}</button>
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
