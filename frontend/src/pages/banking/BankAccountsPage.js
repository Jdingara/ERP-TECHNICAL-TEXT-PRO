// PAGE: Bank Accounts + Transactions + Reconciliation
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const tableS = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const btn  = c => ({ background:c, color:'#fff', border:'none', padding:'8px 18px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 });
const sBtn = c => ({ background:c, color:'#fff', border:'none', padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:12, marginRight:4 });
const tag  = c => ({ background:c+'22', color:c, padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600 });
const card = { background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', padding:'20px 24px' };
const tabBtn = (active, color='#3b82f6') => ({ padding:'8px 20px', border:'none', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:600, background:active?color:'#f1f5f9', color:active?'#fff':'#64748b' });

const emptyAcct = { account_name:'', bank_name:'', account_number:'', ifsc_code:'', account_type:'current', opening_balance:'0' };

export default function BankAccountsPage() {
    const pt = usePageTheme();
    const thS = { ...pt.th, textAlign:'left' };
    const tdS = { ...pt.cell, verticalAlign:'middle' };
    const emptyTd = { textAlign:'center', padding:40, color:pt.colors.muted };

    const [activeTab,setActiveTab] = useState('accounts');
    const [accounts, setAccounts]  = useState([]);
    const [txns,     setTxns]      = useState([]);
    const [selected, setSelected]  = useState(null);
    const [modal,    setModal]     = useState(false);
    const [form,     setForm]      = useState(emptyAcct);
    const [editId,   setEditId]    = useState(null);
    const [msg,      setMsg]       = useState('');
    const [saving,   setSaving]    = useState(false);

    const loadAccounts = useCallback(() => {
        fetch('/api/banking/accounts/', {credentials:'include'}).then(r=>r.json()).then(d=>setAccounts(d.bank_accounts||[]));
    }, []);

    const loadTxns = useCallback(() => {
        const p = new URLSearchParams();
        if (selected) p.set('bank_account', selected);
        fetch(`/api/banking/transactions/?${p}`, {credentials:'include'}).then(r=>r.json()).then(d=>setTxns(d.transactions||[]));
    }, [selected]);

    useEffect(() => { loadAccounts(); }, [loadAccounts]);
    useEffect(() => { if (activeTab==='transactions') loadTxns(); }, [activeTab, loadTxns]);

    const openAdd  = () => { setForm(emptyAcct); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = a  => { setForm({ account_name:a.account_name, bank_name:a.bank_name, account_number:a.account_number, ifsc_code:a.ifsc_code, account_type:a.account_type, opening_balance:a.opening_balance }); setEditId(a.id); setMsg(''); setModal(true); };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/banking/accounts/${editId}/` : '/api/banking/accounts/';
        const r = await fetch(url, { method:editId?'PUT':'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (r.ok) { setModal(false); loadAccounts(); }
        else { const d = await r.json(); setMsg(d.error || JSON.stringify(d)); }
    };

    const inp = f => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });
    const lbl = { display:'block', fontSize:12, fontWeight:600, marginBottom:4, color:pt.colors.muted };
    const fmt = n => `₹${Number(n||0).toLocaleString('en-IN')}`;

    return (
        <div style={{ padding:24 }}>
            {modal ? (
                <div style={{ ...pt.formPage, maxWidth:640 }}>
                    <div style={pt.formHeader}>
                        <button onClick={()=>setModal(false)} style={pt.backBtn}>← Back</button>
                        <h3 style={{ margin:0 }}>{editId?'Edit':'New'} Bank Account</h3>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:20 }}>
                        <div style={{ gridColumn:'1/-1' }}>
                            <label style={lbl}>Account Label *</label>
                            <input {...inp('account_name')} placeholder="e.g. SBI Current Account - Main" style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Bank Name *</label>
                            <input {...inp('bank_name')} placeholder="State Bank of India" style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Account Type</label>
                            <select {...inp('account_type')} style={pt.inp}>
                                <option value="current">Current</option>
                                <option value="savings">Savings</option>
                                <option value="cc">Cash Credit</option>
                                <option value="od">Overdraft</option>
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Account Number *</label>
                            <input {...inp('account_number')} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>IFSC Code</label>
                            <input {...inp('ifsc_code')} placeholder="SBIN0001234" style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Opening Balance (₹)</label>
                            <input type="number" min="0" step="0.01" {...inp('opening_balance')} style={pt.inp} />
                        </div>
                    </div>
                    {msg && <div style={{ color:'#ef4444', fontSize:13, marginTop:10 }}>{msg}</div>}
                    <div style={{ marginTop:16, display:'flex', gap:10 }}>
                        <button onClick={save} disabled={saving} style={btn('#3b82f6')}>{saving?'Saving…':'Save Account'}</button>
                        <button onClick={()=>setModal(false)} style={btn('#64748b')}>Cancel</button>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                        <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Banking</h2>
                        {activeTab==='accounts' && <button onClick={openAdd} style={btn('#3b82f6')}>+ New Bank Account</button>}
                    </div>

                    <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                        {[['accounts','Bank Accounts'],['transactions','Transactions']].map(([k,l])=>(
                            <button key={k} onClick={()=>setActiveTab(k)} style={tabBtn(activeTab===k,'#3b82f6')}>{l}</button>
                        ))}
                    </div>

                    {activeTab==='accounts' && (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
                            {accounts.map(a=>(
                                <div key={a.id} style={{ ...card, cursor:'default' }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight:700, fontSize:15, color:'#1e293b' }}>{a.account_name}</div>
                                            <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{a.bank_name}</div>
                                        </div>
                                        <span style={tag('#3b82f6')}>{a.account_type}</span>
                                    </div>
                                    <div style={{ marginTop:12, fontFamily:'monospace', fontSize:13, color:'#475569', letterSpacing:2 }}>
                                        ···· {a.account_number?.slice(-4)||'????'}
                                    </div>
                                    <div style={{ marginTop:12, fontSize:11, color:'#94a3b8' }}>IFSC: {a.ifsc_code||'—'}</div>
                                    <div style={{ marginTop:4, fontSize:11, color:'#94a3b8' }}>Opening: {fmt(a.opening_balance)}</div>
                                    <div style={{ marginTop:12, display:'flex', gap:8 }}>
                                        <button onClick={()=>openEdit(a)} style={sBtn('#3b82f6')}>Edit</button>
                                        <button onClick={()=>{ setSelected(a.id); setActiveTab('transactions'); }} style={sBtn('#6366f1')}>Transactions</button>
                                    </div>
                                </div>
                            ))}
                            {accounts.length===0 && (
                                <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:'#94a3b8' }}>
                                    No bank accounts yet. Add your first bank account to start tracking.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab==='transactions' && (
                        <>
                            <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center' }}>
                                <select value={selected||''} onChange={e=>setSelected(e.target.value||null)} style={{ ...pt.inp, width:260 }}>
                                    <option value="">All Accounts</option>
                                    {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
                                </select>
                                <button onClick={loadTxns} style={{ ...btn('#6366f1'), padding:'8px 14px' }}>Refresh</button>
                            </div>
                            <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                                {['Date','Description','Type','Amount','Ref','Reconciled'].map(h=><th key={h} style={thS}>{h}</th>)}
                            </tr></thead><tbody>
                                {txns.map((t,i)=>(
                                    <tr key={t.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                                        <td style={tdS}>{t.transaction_date}</td>
                                        <td style={{ ...tdS, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.narration||t.description||'—'}</td>
                                        <td style={tdS}><span style={tag(t.transaction_type==='credit'?'#10b981':'#ef4444')}>{t.transaction_type}</span></td>
                                        <td style={{ ...tdS, fontWeight:700, color:t.transaction_type==='credit'?'#059669':'#ef4444' }}>
                                            {t.transaction_type==='credit'?'+':'-'}{fmt(t.amount)}
                                        </td>
                                        <td style={tdS}>{t.reference||'—'}</td>
                                        <td style={tdS}><span style={tag(t.is_reconciled?'#10b981':'#f59e0b')}>{t.is_reconciled?'✓ Done':'Pending'}</span></td>
                                    </tr>
                                ))}
                                {txns.length===0 && <tr><td colSpan={6} style={emptyTd}>No transactions found</td></tr>}
                            </tbody></table>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
