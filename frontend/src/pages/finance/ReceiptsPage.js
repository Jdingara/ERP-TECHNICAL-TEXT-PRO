// PAGE: Receipt Vouchers (AR Receipts)
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const tableS = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const btn  = c => ({ background:c, color:'#fff', border:'none', padding:'8px 18px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 });
const sBtn = c => ({ background:c, color:'#fff', border:'none', padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:12, marginRight:4 });
const tag  = c => ({ background:c+'22', color:c, padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600 });
const STATUS_COLOR = { draft:'#64748b', posted:'#10b981', deposited:'#3b82f6', cleared:'#059669', bounced:'#ef4444', cancelled:'#94a3b8' };

const empty = { receipt_date: new Date().toISOString().slice(0,10), receipt_mode:'neft', customer_id:'', bank_account_id:'', amount:'', tcs_amount:'0', cheque_number:'', narration:'', reference:'' };

export default function ReceiptsPage() {
    const pt = usePageTheme();
    const thS = { ...pt.th, textAlign:'left' };
    const tdS = { ...pt.cell, verticalAlign:'middle' };
    const emptyTd = { textAlign:'center', padding:40, color:pt.colors.muted };

    const [rows,        setRows]        = useState([]);
    const [customers,   setCustomers]   = useState([]);
    const [bankAccounts,setBankAccounts]= useState([]);
    const [search,      setSearch]      = useState('');
    const [modal,       setModal]       = useState(false);
    const [form,        setForm]        = useState(empty);
    const [msg,         setMsg]         = useState('');
    const [saving,      setSaving]      = useState(false);

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        const r = await fetch(`/api/finance/receipts/?${p}`, { credentials:'include' });
        const d = await r.json();
        setRows(d.receipts || []);
    }, [search]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/masters/customers/', {credentials:'include'}).then(r=>r.json()).then(d=>setCustomers(d.customers||[]));
        fetch('/api/banking/accounts/', {credentials:'include'}).then(r=>r.json()).then(d=>setBankAccounts(d.bank_accounts||[]));
    }, []);

    const openAdd = () => { setForm(empty); setMsg(''); setModal(true); };

    const save = async () => {
        setSaving(true);
        const r = await fetch('/api/finance/receipts/', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (r.ok) { setModal(false); load(); }
        else { const d = await r.json(); setMsg(d.error || JSON.stringify(d)); }
    };

    const postReceipt = async (id) => {
        await fetch(`/api/finance/receipts/${id}/post/`, { method:'POST', credentials:'include' });
        load();
    };

    const inp = f => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });
    const lbl = { display:'block', fontSize:12, fontWeight:600, marginBottom:4, color:pt.colors.muted };
    const netAmt = Math.max(0, parseFloat(form.amount||0) - parseFloat(form.tcs_amount||0));

    return (
        <div style={{ padding:24 }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                        <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Receipt Vouchers</h2>
                        <button onClick={openAdd} style={btn('#10b981')}>+ New Receipt</button>
                    </div>
                    <input placeholder="Search receipt number / narration…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...pt.inp, width:320, marginBottom:16 }} />
                    <div style={{ overflowX:'auto' }}>
                        <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                            {['Receipt No','Date','Mode','Customer','Amount','TCS','Status','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map((r,i)=>(
                                <tr key={r.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                                    <td style={tdS}><b style={{ color:'#10b981' }}>{r.receipt_number}</b></td>
                                    <td style={tdS}>{r.receipt_date}</td>
                                    <td style={tdS}><span style={tag('#10b981')}>{r.receipt_mode?.toUpperCase()}</span></td>
                                    <td style={tdS}>{r.customer_name||'—'}</td>
                                    <td style={tdS}><b>₹{Number(r.amount||0).toLocaleString('en-IN')}</b></td>
                                    <td style={tdS}>{r.tcs_amount>0?`₹${Number(r.tcs_amount).toLocaleString('en-IN')}`:'—'}</td>
                                    <td style={tdS}><span style={tag(STATUS_COLOR[r.status]||'#64748b')}>{r.status}</span></td>
                                    <td style={tdS}>
                                        {r.status==='draft' && <button onClick={()=>postReceipt(r.id)} style={sBtn('#10b981')}>Post</button>}
                                    </td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={8} style={emptyTd}>No receipts found</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={{ ...pt.formPage, maxWidth:640 }}>
                    <div style={pt.formHeader}>
                        <button onClick={()=>setModal(false)} style={pt.backBtn}>← Back</button>
                        <h3 style={{ margin:0 }}>New Receipt Voucher</h3>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:20 }}>
                        <div>
                            <label style={lbl}>Receipt Date *</label>
                            <input type="date" {...inp('receipt_date')} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Receipt Mode *</label>
                            <select {...inp('receipt_mode')} style={pt.inp}>
                                {['cash','cheque','neft','rtgs','imps','upi','online'].map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Customer</label>
                            <select {...inp('customer_id')} style={pt.inp}>
                                <option value="">— Select Customer —</option>
                                {customers.map(c=><option key={c.id} value={c.id}>{c.customer_name || c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Bank Account</label>
                            <select {...inp('bank_account_id')} style={pt.inp}>
                                <option value="">— Cash / Default —</option>
                                {bankAccounts.map(b=><option key={b.id} value={b.id}>{b.account_name} ({b.bank_name})</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Amount Received (₹) *</label>
                            <input type="number" min="0" step="0.01" {...inp('amount')} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>TCS Collected (₹)</label>
                            <input type="number" min="0" step="0.01" {...inp('tcs_amount')} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Net (after TCS)</label>
                            <input type="number" value={netAmt.toFixed(2)} readOnly style={{ ...pt.inp, background:'#f8fafc', color:'#059669', fontWeight:700 }} />
                        </div>
                        {form.receipt_mode==='cheque' && (
                            <div>
                                <label style={lbl}>Cheque Number</label>
                                <input {...inp('cheque_number')} style={pt.inp} />
                            </div>
                        )}
                        <div>
                            <label style={lbl}>Reference</label>
                            <input {...inp('reference')} placeholder="Invoice no.…" style={pt.inp} />
                        </div>
                        <div style={{ gridColumn:'1/-1' }}>
                            <label style={lbl}>Narration</label>
                            <textarea {...inp('narration')} rows={2} style={{ ...pt.inp, resize:'vertical', width:'100%' }} />
                        </div>
                    </div>
                    {msg && <div style={{ color:'#ef4444', marginTop:10, fontSize:13 }}>{msg}</div>}
                    <div style={{ marginTop:16, display:'flex', gap:10 }}>
                        <button onClick={save} disabled={saving} style={btn('#10b981')}>{saving?'Saving…':'Save Receipt'}</button>
                        <button onClick={()=>setModal(false)} style={btn('#64748b')}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
