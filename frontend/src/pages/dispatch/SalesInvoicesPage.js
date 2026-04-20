// PAGE: Sales Invoices
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const empty = { customer_id:'', dispatch_id:'', invoice_date:new Date().toISOString().slice(0,10), due_date:'', total_amount:'', tax_amount:'0', notes:'' };

export default function SalesInvoicesPage() {
    const pt = usePageTheme();
    const emptyTd  = { textAlign:'center', padding:40, color: pt.colors.muted };
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const searchS  = { ...pt.inp, width: 280, outline: 'none' };
    const formPage = { ...pt.formPage, maxWidth: 900 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;
    const [rows,       setRows]       = useState([]);
    const [customers,  setCustomers]  = useState([]);
    const [dispatches, setDispatches] = useState([]);
    const [search,     setSearch]     = useState('');
    const [modal,      setModal]      = useState(false);
    const [form,       setForm]       = useState(empty);
    const [editId,     setEditId]     = useState(null);
    const [saving,     setSaving]     = useState(false);
    const [msg,        setMsg]        = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        const res = await fetch(`/api/dispatch/invoices/?${p}`, { credentials:'include' });
        const d = await res.json();
        setRows(d.invoices||[]);
    }, [search]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/masters/customers/', {credentials:'include'}).then(r=>r.json()).then(d=>setCustomers(d.customers||[]));
        fetch('/api/dispatch/entries/?status=confirmed', {credentials:'include'}).then(r=>r.json()).then(d=>setDispatches(d.dispatches||[]));
    }, []);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => {
        setForm({ customer_id:r.customer_id, dispatch_id:r.dispatch_id||'', invoice_date:r.invoice_date,
            due_date:r.due_date||'', total_amount:r.total_amount, tax_amount:r.tax_amount||'0', notes:r.notes||'' });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/dispatch/invoices/${editId}/` : '/api/dispatch/invoices/';
        const res = await fetch(url, { method:editId?'PUT':'POST', credentials:'include',
            headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error||'Error saving'); }
    };

    const inp = (f) => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });
    const STATUS_COLOR = { draft:'#64748b', sent:'#3b82f6', paid:'#10b981', overdue:'#ef4444', cancelled:'#94a3b8' };
    const totalWithTax = (inv) => Number(inv.total_amount||0)+Number(inv.tax_amount||0);

    return (
        <div style={{ padding:24 }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                        <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Sales Invoices</h2>
                        <button onClick={openAdd} style={btn('#10b981')}>+ Create Invoice</button>
                    </div>
                    <div style={{ marginBottom:16 }}>
                        <input placeholder="Search invoice / customer…" value={search}
                            onChange={e=>setSearch(e.target.value)} style={searchS} />
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
                        {[
                            { label:'Total Invoices', val:rows.length, color:'#3b82f6' },
                            { label:'Paid', val:rows.filter(r=>r.status==='paid').length, color:'#10b981' },
                            { label:'Pending', val:rows.filter(r=>r.status==='sent').length, color:'#f59e0b' },
                            { label:'Overdue', val:rows.filter(r=>r.status==='overdue').length, color:'#ef4444' },
                        ].map(c=>(
                            <div key={c.label} style={{ background: pt.colors.card, border:`1px solid ${c.color}30`, borderRadius:10, padding:'14px 18px' }}>
                                <div style={{ fontSize:11, color: pt.colors.dimText, marginBottom:4 }}>{c.label}</div>
                                <div style={{ fontSize:26, fontWeight:700, color:c.color }}>{c.val}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ overflowX:'auto' }}>
                        <table style={tableS}><thead><tr style={{ background: pt.colors.inner, color:'#fff' }}>
                            {['Invoice No','Customer','Dispatch Ref','Invoice Date','Due Date','Amount','Tax','Total','Status','Actions'].map(h=>
                                <th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map((r,i)=>(
                                <tr key={r.id} style={{ background:i%2===0?pt.colors.inner:'#fff' }}>
                                    <td style={tdS}><b style={{ color:'#10b981' }}>{r.invoice_number}</b></td>
                                    <td style={tdS}>{r.customer_name}</td>
                                    <td style={tdS}>{r.dispatch_number||'—'}</td>
                                    <td style={tdS}>{r.invoice_date}</td>
                                    <td style={tdS}>{r.due_date||'—'}</td>
                                    <td style={tdS}>₹{Number(r.total_amount||0).toLocaleString('en-IN')}</td>
                                    <td style={tdS}>₹{Number(r.tax_amount||0).toLocaleString('en-IN')}</td>
                                    <td style={tdS}><b>₹{totalWithTax(r).toLocaleString('en-IN')}</b></td>
                                    <td style={tdS}><span style={tag(STATUS_COLOR[r.status]||'#64748b')}>{r.status||'draft'}</span></td>
                                    <td style={tdS}><button onClick={()=>openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button></td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={10} style={emptyTd}>No invoices yet</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={()=>setModal(false)} style={backBtnS}>← Back to Sales Invoices</button>
                        <h3 style={{ margin:0, fontSize:20, fontWeight:700 }}>{editId?'Edit Sales Invoice':'New Sales Invoice'}</h3>
                    </div>
                    <div style={grid2}>
                        <F label="Customer *">
                            <select style={inpS} {...inp('customer_id')}>
                                <option value="">Select customer…</option>
                                {customers.map(c=><option key={c.id} value={c.id}>{c.customer_name}</option>)}
                            </select>
                        </F>
                        <F label="Against Dispatch">
                            <select style={inpS} {...inp('dispatch_id')}>
                                <option value="">None / Direct Invoice</option>
                                {dispatches.map(d=><option key={d.id} value={d.id}>{d.dispatch_number} — {d.customer_name}</option>)}
                            </select>
                        </F>
                        <F label="Invoice Date *"><input type="date" style={inpS} {...inp('invoice_date')} /></F>
                        <F label="Due Date"><input type="date" style={inpS} {...inp('due_date')} /></F>
                        <F label="Amount (₹) *"><input type="number" style={inpS} {...inp('total_amount')} /></F>
                        <F label="Tax Amount (₹)"><input type="number" style={inpS} {...inp('tax_amount')} /></F>
                    </div>
                    <F label="Notes"><textarea style={{...inpS,height:60,resize:'vertical'}} {...inp('notes')} /></F>
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
const grid2    = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 };
