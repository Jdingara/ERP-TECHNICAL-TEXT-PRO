// PAGE: Product / Design Master
import { useState, useEffect, useCallback } from 'react';

const empty = { design_code:'', design_name:'', category:'', gsm:'', width_cm:'', composition:'', customer_ref:'' };

export default function ProductPage() {
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams(); if(search) p.set('search', search);
        const res = await fetch(`/api/masters/products/?${p}`, { credentials:'include' });
        const d = await res.json(); setRows(d.products||[]);
    }, [search]);
    useEffect(() => { load(); }, [load]);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => { setForm({ design_code:r.design_code, design_name:r.design_name,
        category:r.category, gsm:r.gsm||'', width_cm:r.width_cm||'', composition:r.composition, customer_ref:r.customer_ref });
        setEditId(r.id); setMsg(''); setModal(true); };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/masters/products/${editId}/` : '/api/masters/products/';
        const res = await fetch(url, { method:editId?'PUT':'POST', credentials:'include',
            headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); } else { const d = await res.json(); setMsg(d.error||'Error'); }
    };
    const del = async (id) => { if(!window.confirm('Deactivate?')) return; await fetch(`/api/masters/products/${id}/`, {method:'DELETE',credentials:'include'}); load(); };
    const inp = (f) => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });

    return (
        <div style={{ padding:'24px 28px', fontFamily:'Inter, sans-serif', color:'#f1f5f9', minHeight:'100vh', backgroundColor:'#0b1120' }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                        <div>
                            <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Products / Designs</h2>
                            <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>Fabric design codes and specifications</p>
                        </div>
                        <button onClick={openAdd} style={btn('#14b8a6')}>+ Add Product</button>
                    </div>
                    <div style={{ marginBottom:16 }}>
                        <input placeholder="Search design code / name…" value={search} onChange={e=>setSearch(e.target.value)} style={searchS} />
                    </div>
                    <div style={{ backgroundColor:'#1e293b', borderRadius:12, overflow:'hidden' }}>
                        <table style={tableS}><thead><tr>
                            {['Design Code','Name','Category','GSM','Width (cm)','Composition','Customer Ref','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map(r=>(
                                <tr key={r.id}>
                                    <td style={{ ...tdS, color:'#14b8a6', fontWeight:600 }}>{r.design_code}</td>
                                    <td style={tdS}>{r.design_name}</td>
                                    <td style={tdS}><span style={tag('#14b8a6')}>{r.category||'—'}</span></td>
                                    <td style={tdS}>{r.gsm||'—'}</td>
                                    <td style={tdS}>{r.width_cm||'—'}</td>
                                    <td style={tdS}>{r.composition}</td>
                                    <td style={tdS}>{r.customer_ref}</td>
                                    <td style={tdS}>
                                        <button onClick={()=>openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                        <button onClick={()=>del(r.id)} style={smallBtn('#ef4444')}>Del</button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={8} style={{ textAlign:'center',padding:40,color:'#475569' }}>No products</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={()=>setModal(false)} style={backBtnS}>← Back to Products</button>
                        <h3 style={{ margin:0, fontSize:20, fontWeight:700 }}>{editId?'Edit Product':'Add Product'}</h3>
                    </div>
                    <div style={grid2}>
                        <F label="Design Code *"><input style={inpS} {...inp('design_code')} /></F>
                        <F label="Design Name *"><input style={inpS} {...inp('design_name')} /></F>
                        <F label="Category"><input style={inpS} {...inp('category')} /></F>
                        <F label="Customer Ref"><input style={inpS} {...inp('customer_ref')} /></F>
                        <F label="GSM"><input style={inpS} type="number" step="0.01" {...inp('gsm')} /></F>
                        <F label="Width (cm)"><input style={inpS} type="number" step="0.01" {...inp('width_cm')} /></F>
                        <div style={{ gridColumn:'1/-1' }}>
                            <F label="Composition"><input style={inpS} placeholder="e.g. 60% Polyester 40% Cotton" {...inp('composition')} /></F>
                        </div>
                    </div>
                    {msg && <div style={{ color:'#ef4444', marginTop:8, fontSize:13 }}>{msg}</div>}
                    <div style={{ display:'flex', gap:10, marginTop:24, justifyContent:'flex-end' }}>
                        <button onClick={()=>setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={save} disabled={saving} style={btn('#14b8a6')}>{saving?'Saving…':'Save'}</button>
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
const tableS   = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const thS      = { padding:'10px 14px', textAlign:'left', fontWeight:600, fontSize:11, backgroundColor:'#0f172a', color:'#94a3b8', textTransform:'uppercase' };
const tdS      = { padding:'10px 14px', borderBottom:'1px solid #1e293b', verticalAlign:'middle', color:'#f1f5f9' };
const tag      = (bg) => ({ display:'inline-block', padding:'2px 8px', borderRadius:12, background:`${bg}20`, color:bg, fontSize:11, fontWeight:600 });
const inpS     = { width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #334155', backgroundColor:'#0f172a', color:'#f1f5f9', fontSize:13, boxSizing:'border-box' };
const grid2    = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 };
const formPage   = { backgroundColor:'#1e293b', borderRadius:12, padding:28, maxWidth:900 };
const formHeader = { display:'flex', alignItems:'center', gap:14, marginBottom:24, paddingBottom:16, borderBottom:'1px solid #334155' };
const backBtnS   = { padding:'7px 16px', background:'#0f172a', color:'#94a3b8', border:'1px solid #334155', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 };
