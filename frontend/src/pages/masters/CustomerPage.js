// PAGE: Customer Master
import { useState, useEffect, useCallback } from 'react';

const empty = { customer_code:'', customer_name:'', contact_person:'', phone:'', email:'',
    address:'', city:'', state:'', gstin:'', credit_days:'30', credit_limit:'0' };

export default function CustomerPage() {
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams(); if (search) p.set('search', search);
        const res = await fetch(`/api/masters/customers/?${p}`, { credentials: 'include' });
        const d = await res.json(); setRows(d.customers || []);
    }, [search]);

    useEffect(() => { load(); }, [load]);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => { setForm({ customer_code:r.customer_code, customer_name:r.customer_name,
        contact_person:r.contact_person, phone:r.phone, email:r.email, address:r.address,
        city:r.city, state:r.state, gstin:r.gstin, credit_days:r.credit_days, credit_limit:r.credit_limit });
        setEditId(r.id); setMsg(''); setModal(true); };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/masters/customers/${editId}/` : '/api/masters/customers/';
        const res = await fetch(url, { method: editId?'PUT':'POST', credentials:'include',
            headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); } else { const d = await res.json(); setMsg(d.error||'Error'); }
    };
    const del = async (id) => { if(!window.confirm('Deactivate?')) return; await fetch(`/api/masters/customers/${id}/`, {method:'DELETE',credentials:'include'}); load(); };
    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({...p, [f]: e.target.value})) });

    return (
        <div style={{ padding:'24px 28px', fontFamily:'Inter, sans-serif', color:'#f1f5f9', minHeight:'100vh', backgroundColor:'#0b1120' }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                        <div>
                            <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Customers</h2>
                            <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:13 }}>Customer master with credit terms</p>
                        </div>
                        <button onClick={openAdd} style={btn('#10b981')}>+ Add Customer</button>
                    </div>
                    <div style={{ marginBottom:16 }}>
                        <input placeholder="Search code / name…" value={search} onChange={e=>setSearch(e.target.value)} style={searchS} />
                    </div>
                    <div style={{ backgroundColor:'#1e293b', borderRadius:12, overflow:'hidden', overflowX:'auto' }}>
                        <table style={tableS}><thead><tr>
                            {['Code','Name','Contact','Phone','GSTIN','City','Credit Days','Credit Limit','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map(r=>(
                                <tr key={r.id}>
                                    <td style={{ ...tdS, fontWeight:600 }}>{r.customer_code}</td>
                                    <td style={tdS}>{r.customer_name}</td>
                                    <td style={tdS}>{r.contact_person}</td>
                                    <td style={tdS}>{r.phone}</td>
                                    <td style={tdS}>{r.gstin}</td>
                                    <td style={tdS}>{r.city}</td>
                                    <td style={tdS}>{r.credit_days}d</td>
                                    <td style={tdS}>₹{r.credit_limit}</td>
                                    <td style={tdS}>
                                        <button onClick={()=>openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                        <button onClick={()=>del(r.id)} style={smallBtn('#ef4444')}>Del</button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={9} style={{ textAlign:'center',padding:40,color:'#475569' }}>No customers</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={()=>setModal(false)} style={backBtnS}>← Back to Customers</button>
                        <h3 style={{ margin:0, fontSize:20, fontWeight:700 }}>{editId?'Edit Customer':'Add Customer'}</h3>
                    </div>
                    <div style={grid2}>
                        <F label="Code *"><input style={inpS} {...inp('customer_code')} /></F>
                        <F label="Name *"><input style={inpS} {...inp('customer_name')} /></F>
                        <F label="Contact Person"><input style={inpS} {...inp('contact_person')} /></F>
                        <F label="Phone"><input style={inpS} {...inp('phone')} /></F>
                        <F label="Email"><input style={inpS} {...inp('email')} /></F>
                        <F label="GSTIN"><input style={inpS} {...inp('gstin')} /></F>
                        <F label="City"><input style={inpS} {...inp('city')} /></F>
                        <F label="State"><input style={inpS} {...inp('state')} /></F>
                        <F label="Credit Days"><input style={inpS} type="number" {...inp('credit_days')} /></F>
                        <F label="Credit Limit (₹)"><input style={inpS} type="number" {...inp('credit_limit')} /></F>
                    </div>
                    <F label="Address"><textarea style={{ ...inpS, height:70, resize:'vertical' }} {...inp('address')} /></F>
                    {msg && <div style={{ color:'#ef4444', marginTop:8, fontSize:13 }}>{msg}</div>}
                    <div style={{ display:'flex', gap:10, marginTop:24, justifyContent:'flex-end' }}>
                        <button onClick={()=>setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={save} disabled={saving} style={btn('#10b981')}>{saving?'Saving…':'Save'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const F        = ({ label, children }) => (<div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'#94a3b8', marginBottom:4 }}>{label}</label>{children}</div>);
const btn      = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const searchS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 13, width: 280, outline: 'none' };
const tableS   = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thS      = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, backgroundColor: '#0f172a', color: '#94a3b8', textTransform: 'uppercase' };
const tdS      = { padding: '10px 14px', borderBottom: '1px solid #1e293b', verticalAlign: 'middle', color: '#f1f5f9' };
const inpS     = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box' };
const grid2    = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
const formPage = { backgroundColor: '#1e293b', borderRadius: 12, padding: 28, maxWidth: 900 };
const formHeader = { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #334155' };
const backBtnS = { padding: '7px 16px', background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
