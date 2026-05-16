// PAGE: Payment Vouchers (AP Payments)
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const tableS = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const btn  = c => ({ background:c, color:'#fff', border:'none', padding:'8px 18px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 });
const sBtn = c => ({ background:c, color:'#fff', border:'none', padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:12, marginRight:4 });
const tag  = c => ({ background:c+'22', color:c, padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600 });
const STATUS_COLOR = { draft:'#64748b', posted:'#10b981', cleared:'#3b82f6', bounced:'#ef4444', cancelled:'#ef4444' };

const empty = { payment_date: new Date().toISOString().slice(0,10), payment_mode:'neft', party_type:'vendor', vendor_id:'', employee_id:'', bank_account_id:'', amount:'', tds_amount:'0', net_amount:'', cheque_number:'', narration:'', reference:'' };

export default function PaymentsPage() {
    const pt = usePageTheme();
    const thS = { ...pt.th, textAlign:'left' };
    const tdS = { ...pt.cell, verticalAlign:'middle' };
    const emptyTd = { textAlign:'center', padding:40, color:pt.colors.muted };

    const [rows,        setRows]        = useState([]);
    const [vendors,     setVendors]     = useState([]);
    const [employees,   setEmployees]   = useState([]);
    const [bankAccounts,setBankAccounts]= useState([]);
    const [search,      setSearch]      = useState('');
    const [modal,       setModal]       = useState(false);
    const [form,        setForm]        = useState(empty);
    const [editId,      setEditId]      = useState(null);
    const [msg,         setMsg]         = useState('');
    const [saving,      setSaving]      = useState(false);

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        const r = await fetch(`/api/finance/payments/?${p}`, { credentials:'include' });
        const d = await r.json();
        setRows(d.payments || []);
    }, [search]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/masters/vendors/', {credentials:'include'}).then(r=>r.json()).then(d=>setVendors(d.vendors||[]));
        fetch('/api/payroll/employees/', {credentials:'include'}).then(r=>r.json()).then(d=>setEmployees(d.employees||[]));
        fetch('/api/banking/accounts/', {credentials:'include'}).then(r=>r.json()).then(d=>setBankAccounts(d.bank_accounts||[]));
    }, []);

    const openAdd = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };

    const handleAmountChange = (val) => {
        const tds = parseFloat(form.tds_amount || 0);
        const amt = parseFloat(val || 0);
        setForm(p => ({ ...p, amount: val, net_amount: String(Math.max(0, amt - tds).toFixed(2)) }));
    };
    const handleTDSChange = (val) => {
        const tds = parseFloat(val || 0);
        const amt = parseFloat(form.amount || 0);
        setForm(p => ({ ...p, tds_amount: val, net_amount: String(Math.max(0, amt - tds).toFixed(2)) }));
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/finance/payments/${editId}/` : '/api/finance/payments/';
        const r = await fetch(url, { method:editId?'PUT':'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (r.ok) { setModal(false); load(); }
        else { const d = await r.json(); setMsg(d.error || JSON.stringify(d)); }
    };

    const postPayment = async (id) => {
        const r = await fetch(`/api/finance/payments/${id}/post/`, { method:'POST', credentials:'include' });
        if (r.ok) load();
    };

    const inp = f => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });
    const lbl = { display:'block', fontSize:12, fontWeight:600, marginBottom:4, color:pt.colors.muted };

    return (
        <div style={{ padding:24 }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                        <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Payment Vouchers</h2>
                        <button onClick={openAdd} style={btn('#6366f1')}>+ New Payment</button>
                    </div>
                    <input placeholder="Search payment number / narration…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...pt.inp, width:320, marginBottom:16 }} />
                    <div style={{ overflowX:'auto' }}>
                        <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                            {['Pay No','Date','Mode','Party','Amount','TDS','Net','Status','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map((r,i)=>(
                                <tr key={r.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                                    <td style={tdS}><b style={{ color:'#6366f1' }}>{r.payment_number}</b></td>
                                    <td style={tdS}>{r.payment_date}</td>
                                    <td style={tdS}><span style={tag('#6366f1')}>{r.payment_mode?.toUpperCase()}</span></td>
                                    <td style={tdS}>{r.vendor_name || r.employee_name || '—'}</td>
                                    <td style={tdS}>₹{Number(r.amount||0).toLocaleString('en-IN')}</td>
                                    <td style={tdS}>{r.tds_amount>0?`₹${Number(r.tds_amount).toLocaleString('en-IN')}`:'—'}</td>
                                    <td style={tdS}><b>₹{Number(r.net_amount||0).toLocaleString('en-IN')}</b></td>
                                    <td style={tdS}><span style={tag(STATUS_COLOR[r.status]||'#64748b')}>{r.status}</span></td>
                                    <td style={tdS}>
                                        {r.status==='draft' && <button onClick={()=>postPayment(r.id)} style={sBtn('#10b981')}>Post</button>}
                                    </td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={9} style={emptyTd}>No payments found</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={{ ...pt.formPage, maxWidth:700 }}>
                    <div style={pt.formHeader}>
                        <button onClick={()=>setModal(false)} style={pt.backBtn}>← Back</button>
                        <h3 style={{ margin:0 }}>New Payment Voucher</h3>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:20 }}>
                        <div>
                            <label style={lbl}>Payment Date *</label>
                            <input type="date" {...inp('payment_date')} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Payment Mode *</label>
                            <select {...inp('payment_mode')} style={pt.inp}>
                                {['cash','cheque','neft','rtgs','imps','upi','dd'].map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Party Type *</label>
                            <select {...inp('party_type')} style={pt.inp}>
                                <option value="vendor">Vendor</option>
                                <option value="employee">Employee</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>{form.party_type==='employee'?'Employee':'Vendor'}</label>
                            {form.party_type==='employee' ? (
                                <select value={form.employee_id} onChange={e=>setForm(p=>({...p,employee_id:e.target.value}))} style={pt.inp}>
                                    <option value="">— Select Employee —</option>
                                    {employees.map(e=><option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
                                </select>
                            ) : (
                                <select value={form.vendor_id} onChange={e=>setForm(p=>({...p,vendor_id:e.target.value}))} style={pt.inp}>
                                    <option value="">— Select Vendor —</option>
                                    {vendors.map(v=><option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                                </select>
                            )}
                        </div>
                        <div>
                            <label style={lbl}>Bank Account</label>
                            <select {...inp('bank_account_id')} style={pt.inp}>
                                <option value="">— Cash / Default —</option>
                                {bankAccounts.map(b=><option key={b.id} value={b.id}>{b.account_name} ({b.bank_name})</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Amount (₹) *</label>
                            <input type="number" min="0" step="0.01" value={form.amount} onChange={e=>handleAmountChange(e.target.value)} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>TDS Deducted (₹)</label>
                            <input type="number" min="0" step="0.01" value={form.tds_amount} onChange={e=>handleTDSChange(e.target.value)} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Net Payment (₹)</label>
                            <input type="number" value={form.net_amount} readOnly style={{ ...pt.inp, background:'#f8fafc', color:'#059669', fontWeight:700 }} />
                        </div>
                        {form.payment_mode==='cheque' && <>
                            <div>
                                <label style={lbl}>Cheque Number</label>
                                <input {...inp('cheque_number')} style={pt.inp} />
                            </div>
                        </>}
                        <div>
                            <label style={lbl}>Reference</label>
                            <input {...inp('reference')} placeholder="Invoice no., PO no.…" style={pt.inp} />
                        </div>
                        <div style={{ gridColumn:'1/-1' }}>
                            <label style={lbl}>Narration</label>
                            <textarea {...inp('narration')} rows={2} style={{ ...pt.inp, resize:'vertical', width:'100%' }} />
                        </div>
                    </div>
                    {msg && <div style={{ color:'#ef4444', marginTop:10, fontSize:13 }}>{msg}</div>}
                    <div style={{ marginTop:16, display:'flex', gap:10 }}>
                        <button onClick={save} disabled={saving} style={btn('#6366f1')}>{saving?'Saving…':'Save Payment'}</button>
                        <button onClick={()=>setModal(false)} style={btn('#64748b')}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
