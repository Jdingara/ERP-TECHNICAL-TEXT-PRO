// PAGE: Vendor Master
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const empty = { vendor_code:'', vendor_name:'', vendor_type:'raw_material',
    contact_person:'', phone:'', email:'', address:'',
    city:'', state:'', gstin:'', pan_number:'', credit_days:'30' };

export default function VendorPage() {
    const pt = usePageTheme();
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const searchS  = { ...pt.inp, width: 300, outline: 'none' };
    const formPage = { ...pt.formPage, maxWidth: 900 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;
    const [rows,   setRows]   = useState([]);
    const [search, setSearch] = useState('');
    const [modal,  setModal]  = useState(false);
    const [form,   setForm]   = useState(empty);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg,    setMsg]    = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams(); if (search) p.set('search', search);
        const res = await fetch(`/api/masters/vendors/?${p}`, { credentials:'include' });
        const d = await res.json(); setRows(d.vendors || []);
    }, [search]);

    useEffect(() => { load(); }, [load]);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => {
        setForm({ vendor_code:r.vendor_code, vendor_name:r.vendor_name, vendor_type:r.vendor_type,
            contact_person:r.contact_person, phone:r.phone, email:r.email, address:r.address,
            city:r.city, state:r.state, gstin:r.gstin, pan_number:r.pan_number, credit_days:r.credit_days });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/masters/vendors/${editId}/` : '/api/masters/vendors/';
        const res = await fetch(url, { method:editId?'PUT':'POST', credentials:'include',
            headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); } else { const d = await res.json(); setMsg(d.error||'Error'); }
    };

    const del = async (id) => {
        if (!window.confirm('Deactivate this vendor?')) return;
        await fetch(`/api/masters/vendors/${id}/`, { method:'DELETE', credentials:'include' }); load();
    };
    const inp = (f) => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });

    return (
        <div style={{ padding:'24px 28px', fontFamily:'Inter, sans-serif', color: pt.colors.text, minHeight:'100vh', backgroundColor: pt.colors.outer }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                        <div>
                            <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Vendors</h2>
                            <p style={{ margin:'4px 0 0', color: pt.colors.dimText, fontSize:13 }}>Suppliers and job-work vendors</p>
                        </div>
                        <button onClick={openAdd} style={btn('#10b981')}>+ Add Vendor</button>
                    </div>
                    <div style={{ marginBottom:16 }}>
                        <input placeholder="Search code / name / GSTIN…" value={search}
                            onChange={e=>setSearch(e.target.value)} style={searchS} />
                    </div>
                    <div style={{ backgroundColor: pt.colors.card, borderRadius:12, overflow:'hidden', overflowX:'auto' }}>
                        <table style={tableS}><thead><tr>
                            {['Code','Name','Type','Contact','Phone','GSTIN','City','Credit Days','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map(r=>(
                                <tr key={r.id}>
                                    <td style={{ ...tdS, fontWeight:600 }}>{r.vendor_code}</td>
                                    <td style={tdS}>{r.vendor_name}</td>
                                    <td style={tdS}><span style={tag('#10b981')}>{r.vendor_type}</span></td>
                                    <td style={tdS}>{r.contact_person}</td>
                                    <td style={tdS}>{r.phone}</td>
                                    <td style={tdS}>{r.gstin}</td>
                                    <td style={tdS}>{r.city}</td>
                                    <td style={tdS}>{r.credit_days} days</td>
                                    <td style={tdS}>
                                        <button onClick={()=>openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                        <button onClick={()=>del(r.id)} style={smallBtn('#ef4444')}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={9} style={{ textAlign:'center',padding:40,color: pt.colors.muted }}>No vendors found</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={()=>setModal(false)} style={backBtnS}>← Back to Vendors</button>
                        <h3 style={{ margin:0, fontSize:20, fontWeight:700 }}>{editId?'Edit Vendor':'Add Vendor'}</h3>
                    </div>
                    <div style={grid2}>
                        <F label="Vendor Code *"><input style={inpS} {...inp('vendor_code')} /></F>
                        <F label="Vendor Name *"><input style={inpS} {...inp('vendor_name')} /></F>
                        <F label="Type">
                            <select style={inpS} {...inp('vendor_type')}>
                                <option value="raw_material">Raw Material Supplier</option>
                                <option value="job_work">Job Work Vendor</option>
                                <option value="both">Both</option>
                            </select>
                        </F>
                        <F label="Contact Person"><input style={inpS} {...inp('contact_person')} /></F>
                        <F label="Phone"><input style={inpS} {...inp('phone')} /></F>
                        <F label="Email"><input style={inpS} {...inp('email')} /></F>
                        <F label="GSTIN"><input style={inpS} {...inp('gstin')} /></F>
                        <F label="PAN Number"><input style={inpS} {...inp('pan_number')} /></F>
                        <F label="City"><input style={inpS} {...inp('city')} /></F>
                        <F label="State"><input style={inpS} {...inp('state')} /></F>
                        <F label="Credit Days"><input style={inpS} type="number" {...inp('credit_days')} /></F>
                    </div>
                    <F label="Address"><textarea style={{...inpS,height:70,resize:'vertical'}} {...inp('address')} /></F>
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
