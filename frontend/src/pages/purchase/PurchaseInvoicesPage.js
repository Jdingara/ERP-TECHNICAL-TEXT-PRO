// PAGE: Purchase Invoices
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

/* eslint-disable no-undef */

const empty = { vendor_id:'', po_id:'', invoice_number:'', invoice_date:'', due_date:'', total_amount:'', notes:'' };

export default function PurchaseInvoicesPage() {
    const pt = usePageTheme();
    const emptyTd  = { textAlign:'center', padding:40, color: pt.colors.muted };
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const searchS  = { ...pt.inp, width: 320, outline: 'none' };
    const formPage = { ...pt.formPage, maxWidth: 900 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;
    const [rows,    setRows]    = useState([]);
    const [vendors, setVendors] = useState([]);
    const [pos,     setPOs]     = useState([]);
    const [search,  setSearch]  = useState('');
    const [modal,   setModal]   = useState(false);
    const [form,    setForm]    = useState(empty);
    const [editId,  setEditId]  = useState(null);
    const [saving,  setSaving]  = useState(false);
    const [msg,     setMsg]     = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        const res = await fetch(`/api/purchase/invoices/?${p}`, { credentials:'include' });
        const d = await res.json();
        setRows(d.invoices||[]);
    }, [search]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/masters/vendors/', {credentials:'include'}).then(r=>r.json()).then(d=>setVendors(d.vendors||[]));
        fetch('/api/purchase/orders/?status=confirmed', {credentials:'include'}).then(r=>r.json()).then(d=>setPOs(d.orders||[]));
    }, []);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => {
        setForm({ vendor_id:r.vendor_id, po_id:r.po_id||'', invoice_number:r.invoice_number,
            invoice_date:r.invoice_date, due_date:r.due_date||'', total_amount:r.total_amount, notes:r.notes||'' });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/purchase/invoices/${editId}/` : '/api/purchase/invoices/';
        const res = await fetch(url, { method:editId?'PUT':'POST', credentials:'include',
            headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error||'Error saving'); }
    };

    const inp = (f) => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });
    const STATUS_COLOR = { draft:'#64748b', confirmed:'#10b981', paid:'#3b82f6', overdue:'#ef4444' };

    return (
        <div style={{ padding:24 }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                        <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Purchase Invoices</h2>
                        <button onClick={openAdd} style={btn('#10b981')}>+ Add Invoice</button>
                    </div>
                    <div style={{ marginBottom:16 }}>
                        <input placeholder="Search invoice number / vendor…" value={search}
                            onChange={e=>setSearch(e.target.value)} style={searchS} />
                    </div>
                    <div style={{ overflowX:'auto' }}>
                        <table style={tableS}><thead><tr style={{ background: pt.colors.inner, color:'#fff' }}>
                            {['Invoice No','Vendor','PO Reference','Invoice Date','Due Date','Amount','Status','Actions'].map(h=>
                                <th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map((r,i)=>(
                                <tr key={r.id} style={{ background:i%2===0?pt.colors.inner:'#fff' }}>
                                    <td style={tdS}><b style={{ color:'#3b82f6' }}>{r.invoice_number}</b></td>
                                    <td style={tdS}>{r.vendor_name}</td>
                                    <td style={tdS}>{r.po_number||'—'}</td>
                                    <td style={tdS}>{r.invoice_date}</td>
                                    <td style={tdS}>{r.due_date||'—'}</td>
                                    <td style={tdS}><b>₹{Number(r.total_amount||0).toLocaleString('en-IN')}</b></td>
                                    <td style={tdS}><span style={tag(STATUS_COLOR[r.status]||'#64748b')}>{r.status||'draft'}</span></td>
                                    <td style={tdS}><button onClick={()=>openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button></td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={8} style={emptyTd}>No invoices found</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={()=>setModal(false)} style={backBtnS}>← Back to Invoices</button>
                        <h3 style={{ margin:0, fontSize:20, fontWeight:700 }}>{editId?'Edit Invoice':'Add Purchase Invoice'}</h3>
                    </div>
                    <div style={grid2}>
                        <F label="Vendor *">
                            <select style={inpS} {...inp('vendor_id')}>
                                <option value="">Select vendor…</option>
                                {vendors.map(v=><option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                            </select>
                        </F>
                        <F label="Against PO">
                            <select style={inpS} {...inp('po_id')}>
                                <option value="">None / Direct Invoice</option>
                                {pos.map(p=><option key={p.id} value={p.id}>{p.po_number}</option>)}
                            </select>
                        </F>
                        <F label="Invoice Number *"><input style={inpS} {...inp('invoice_number')} /></F>
                        <F label="Invoice Date *"><input type="date" style={inpS} {...inp('invoice_date')} /></F>
                        <F label="Due Date"><input type="date" style={inpS} {...inp('due_date')} /></F>
                        <F label="Total Amount (₹) *"><input type="number" style={inpS} {...inp('total_amount')} /></F>
                    </div>
                    <F label="Notes"><textarea style={{...inpS,height:70,resize:'vertical'}} {...inp('notes')} /></F>
                    {msg && <div style={{ color:'#ef4444', marginTop:8 }}>{msg}</div>}
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
