// PAGE: Item Master (chemicals, PVC, accessories)
import { useState, useEffect, useCallback } from 'react';

const TYPES = ['chemical','pvc','fabric','accessory','other'];
const empty = { item_code:'', item_name:'', item_type:'chemical', uom_id:'', reorder_level:'0' };

export default function ItemMasterPage() {
    const [rows,   setRows]   = useState([]);
    const [uoms,   setUoms]   = useState([]);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [modal,  setModal]  = useState(false);
    const [form,   setForm]   = useState(empty);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg,    setMsg]    = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if(filter) p.set('item_type', filter);
        if(search) p.set('search', search);
        const res = await fetch(`/api/masters/items/?${p}`, { credentials:'include' });
        const d = await res.json(); setRows(d.items||[]);
    }, [filter, search]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { fetch('/api/masters/uom/', {credentials:'include'}).then(r=>r.json()).then(d=>setUoms(d.uoms||[])); }, []);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => { setForm({ item_code:r.item_code, item_name:r.item_name, item_type:r.item_type, uom_id:r.uom_id||'', reorder_level:r.reorder_level });
        setEditId(r.id); setMsg(''); setModal(true); };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/masters/items/${editId}/` : '/api/masters/items/';
        const res = await fetch(url, { method:editId?'PUT':'POST', credentials:'include',
            headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); } else { const d = await res.json(); setMsg(d.error||'Error'); }
    };
    const del = async (id) => { if(!window.confirm('Deactivate?')) return; await fetch(`/api/masters/items/${id}/`, {method:'DELETE',credentials:'include'}); load(); };
    const inp = (f) => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });

    return (
        <div style={{ padding:'24px 28px', fontFamily:'Inter, sans-serif', color:'#f1f5f9', minHeight:'100vh', backgroundColor:'#0b1120' }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                        <div>
                            <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Item Master</h2>
                            <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>Chemicals, PVC, fabrics and accessories</p>
                        </div>
                        <button onClick={openAdd} style={btn('#8b5cf6')}>+ Add Item</button>
                    </div>
                    <div style={{ display:'flex', gap:12, marginBottom:16 }}>
                        <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={searchS} />
                        <select value={filter} onChange={e=>setFilter(e.target.value)} style={selectS}>
                            <option value="">All Types</option>
                            {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div style={{ backgroundColor:'#1e293b', borderRadius:12, overflow:'hidden' }}>
                        <table style={tableS}><thead><tr>
                            {['Code','Name','Type','UOM','Reorder Level','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map(r=>(
                                <tr key={r.id}>
                                    <td style={{ ...tdS, fontWeight:600 }}>{r.item_code}</td>
                                    <td style={tdS}>{r.item_name}</td>
                                    <td style={tdS}><span style={tag('#8b5cf6')}>{r.item_type}</span></td>
                                    <td style={tdS}>{r.uom_name}</td>
                                    <td style={tdS}>{r.reorder_level}</td>
                                    <td style={tdS}>
                                        <button onClick={()=>openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                        <button onClick={()=>del(r.id)} style={smallBtn('#ef4444')}>Del</button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={6} style={{ textAlign:'center',padding:40,color:'#475569' }}>No items</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={()=>setModal(false)} style={backBtnS}>← Back to Items</button>
                        <h3 style={{ margin:0, fontSize:20, fontWeight:700 }}>{editId?'Edit Item':'Add Item'}</h3>
                    </div>
                    <div style={grid2}>
                        <F label="Item Code *"><input style={inpS} {...inp('item_code')} /></F>
                        <F label="Item Name *"><input style={inpS} {...inp('item_name')} /></F>
                        <F label="Type">
                            <select style={inpS} {...inp('item_type')}>{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
                        </F>
                        <F label="UOM">
                            <select style={inpS} {...inp('uom_id')}>
                                <option value="">-- Select --</option>
                                {uoms.map(u=><option key={u.id} value={u.id}>{u.short_name}</option>)}
                            </select>
                        </F>
                        <F label="Reorder Level"><input style={inpS} type="number" {...inp('reorder_level')} /></F>
                    </div>
                    {msg && <div style={{ color:'#ef4444', marginTop:8, fontSize:13 }}>{msg}</div>}
                    <div style={{ display:'flex', gap:10, marginTop:24, justifyContent:'flex-end' }}>
                        <button onClick={()=>setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={save} disabled={saving} style={btn('#8b5cf6')}>{saving?'Saving…':'Save'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const F        = ({label,children}) => (<div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#94a3b8',marginBottom:4}}>{label}</label>{children}</div>);
const btn      = (bg) => ({ padding:'8px 18px', background:bg, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 });
const smallBtn = (bg) => ({ padding:'4px 10px', background:bg, color:'#fff', border:'none', borderRadius:5, cursor:'pointer', fontSize:12, marginRight:4 });
const searchS  = { padding:'8px 14px', borderRadius:8, border:'1px solid #334155', backgroundColor:'#0f172a', color:'#f1f5f9', fontSize:13, width:280, outline:'none' };
const selectS  = { padding:'8px 12px', borderRadius:8, border:'1px solid #334155', backgroundColor:'#0f172a', color:'#f1f5f9', fontSize:13 };
const tableS   = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const thS      = { padding:'10px 14px', textAlign:'left', fontWeight:600, fontSize:11, backgroundColor:'#0f172a', color:'#94a3b8', textTransform:'uppercase' };
const tdS      = { padding:'10px 14px', borderBottom:'1px solid #1e293b', verticalAlign:'middle', color:'#f1f5f9' };
const tag      = (bg) => ({ display:'inline-block', padding:'2px 8px', borderRadius:12, background:`${bg}20`, color:bg, fontSize:11, fontWeight:600 });
const inpS     = { width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #334155', backgroundColor:'#0f172a', color:'#f1f5f9', fontSize:13, boxSizing:'border-box' };
const grid2    = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 };
const formPage   = { backgroundColor:'#1e293b', borderRadius:12, padding:28, maxWidth:900 };
const formHeader = { display:'flex', alignItems:'center', gap:14, marginBottom:24, paddingBottom:16, borderBottom:'1px solid #334155' };
const backBtnS   = { padding:'7px 16px', background:'#0f172a', color:'#94a3b8', border:'1px solid #334155', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 };
