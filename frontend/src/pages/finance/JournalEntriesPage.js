// PAGE: Journal Entries
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const tableS = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const btn  = c => ({ background:c, color:'#fff', border:'none', padding:'8px 18px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 });
const sBtn = c => ({ background:c, color:'#fff', border:'none', padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:12, marginRight:4 });
const tag  = c => ({ background:c+'22', color:c, padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600 });
const STATUS_COLOR = { draft:'#64748b', posted:'#10b981', reversed:'#ef4444' };

const emptyLine = { account_id:'', description:'', debit_amount:'0', credit_amount:'0' };
const emptyForm = { entry_date: new Date().toISOString().slice(0,10), description:'', reference:'', lines:[{...emptyLine},{...emptyLine}] };

export default function JournalEntriesPage() {
    const pt = usePageTheme();
    const thS = { ...pt.th, textAlign:'left' };
    const tdS = { ...pt.cell, verticalAlign:'middle' };
    const emptyTd = { textAlign:'center', padding:40, color:pt.colors.muted };

    const [rows,    setRows]    = useState([]);
    const [accounts,setAccounts]= useState([]);
    const [search,  setSearch]  = useState('');
    const [status,  setStatus]  = useState('');
    const [modal,   setModal]   = useState(false);
    const [detail,  setDetail]  = useState(null);
    const [form,    setForm]    = useState(emptyForm);
    const [msg,     setMsg]     = useState('');
    const [saving,  setSaving]  = useState(false);

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (status) p.set('status', status);
        const r = await fetch(`/api/finance/journal-entries/?${p}`, { credentials:'include' });
        const d = await r.json();
        setRows(d.journal_entries || []);
    }, [search, status]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/finance/accounts/', { credentials:'include' }).then(r=>r.json()).then(d=>setAccounts(d.accounts||[]));
    }, []);

    const openDetail = async (je) => {
        const r = await fetch(`/api/finance/journal-entries/${je.id}/`, { credentials:'include' });
        const d = await r.json();
        setDetail(d);
    };

    const openNew = () => { setForm({ ...emptyForm, lines:[{...emptyLine},{...emptyLine}] }); setMsg(''); setModal(true); };

    const addLine = () => setForm(p=>({ ...p, lines:[...p.lines, {...emptyLine}] }));
    const removeLine = i => setForm(p=>({ ...p, lines:p.lines.filter((_,idx)=>idx!==i) }));
    const setLine = (i, field, val) => setForm(p=>({ ...p, lines:p.lines.map((l,idx)=>idx===i?{...l,[field]:val}:l) }));

    const totalDr = form.lines.reduce((s,l)=>s+parseFloat(l.debit_amount||0), 0);
    const totalCr = form.lines.reduce((s,l)=>s+parseFloat(l.credit_amount||0), 0);
    const balanced = Math.abs(totalDr - totalCr) < 0.01;

    const save = async () => {
        if (!balanced) { setMsg('Journal entry must balance: Total Debits must equal Total Credits.'); return; }
        setSaving(true);
        const r = await fetch('/api/finance/journal-entries/', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (r.ok) { setModal(false); load(); }
        else { const d = await r.json(); setMsg(d.error || JSON.stringify(d)); }
    };

    const postJE = async (id) => {
        await fetch(`/api/finance/journal-entries/${id}/post/`, { method:'POST', credentials:'include' });
        load();
        if (detail && detail.id === id) setDetail(null);
    };

    const lbl = { display:'block', fontSize:12, fontWeight:600, marginBottom:4, color:pt.colors.muted };

    if (detail) return (
        <div style={{ padding:24 }}>
            <button onClick={()=>setDetail(null)} style={btn('#64748b')}>← Back to List</button>
            <div style={{ marginTop:20, background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', padding:24 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                    <div>
                        <h3 style={{ margin:0, fontSize:18 }}>{detail.entry_number}</h3>
                        <div style={{ color:pt.colors.muted, fontSize:13, marginTop:4 }}>{detail.description}</div>
                        <div style={{ color:pt.colors.muted, fontSize:12 }}>Date: {detail.entry_date} | Ref: {detail.reference||'—'}</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <span style={tag(STATUS_COLOR[detail.status]||'#64748b')}>{detail.status}</span>
                        {detail.status==='draft' && <button onClick={()=>postJE(detail.id)} style={btn('#10b981')}>Post Entry</button>}
                    </div>
                </div>
                <table style={{ ...tableS, marginTop:8 }}><thead><tr style={{ background:'#f8fafc' }}>
                    {['Account','Description','Debit (₹)','Credit (₹)'].map(h=><th key={h} style={{ ...thS, padding:'8px 12px' }}>{h}</th>)}
                </tr></thead><tbody>
                    {(detail.lines||[]).map((l,i)=>(
                        <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                            <td style={{ padding:'8px 12px', fontFamily:'monospace', color:'#1e40af' }}>{l.account_code} — {l.account_name}</td>
                            <td style={{ padding:'8px 12px', color:'#64748b' }}>{l.description||'—'}</td>
                            <td style={{ padding:'8px 12px', textAlign:'right', fontWeight: l.debit_amount>0?700:400, color: l.debit_amount>0?'#1e40af':'#94a3b8' }}>
                                {l.debit_amount>0 ? `₹${Number(l.debit_amount).toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td style={{ padding:'8px 12px', textAlign:'right', fontWeight: l.credit_amount>0?700:400, color: l.credit_amount>0?'#059669':'#94a3b8' }}>
                                {l.credit_amount>0 ? `₹${Number(l.credit_amount).toLocaleString('en-IN')}` : '—'}
                            </td>
                        </tr>
                    ))}
                    <tr style={{ background:'#f8fafc', fontWeight:700 }}>
                        <td colSpan={2} style={{ padding:'8px 12px' }}>Total</td>
                        <td style={{ padding:'8px 12px', textAlign:'right', color:'#1e40af' }}>₹{Number(detail.total_debits||0).toLocaleString('en-IN')}</td>
                        <td style={{ padding:'8px 12px', textAlign:'right', color:'#059669' }}>₹{Number(detail.total_credits||0).toLocaleString('en-IN')}</td>
                    </tr>
                </tbody></table>
            </div>
        </div>
    );

    if (modal) return (
        <div style={{ padding:24 }}>
            <div style={{ ...pt.formPage, maxWidth:900 }}>
                <div style={pt.formHeader}>
                    <button onClick={()=>setModal(false)} style={pt.backBtn}>← Back</button>
                    <h3 style={{ margin:0 }}>New Journal Entry</h3>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginTop:20 }}>
                    <div>
                        <label style={lbl}>Date *</label>
                        <input type="date" value={form.entry_date} onChange={e=>setForm(p=>({...p,entry_date:e.target.value}))} style={pt.inp} />
                    </div>
                    <div>
                        <label style={lbl}>Reference</label>
                        <input value={form.reference} onChange={e=>setForm(p=>({...p,reference:e.target.value}))} placeholder="Invoice / PO no." style={pt.inp} />
                    </div>
                    <div style={{ gridColumn:'1/-1' }}>
                        <label style={lbl}>Description *</label>
                        <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Narration…" style={{ ...pt.inp, width:'100%' }} />
                    </div>
                </div>

                <div style={{ marginTop:20 }}>
                    <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                        {['Account','Description','Debit (₹)','Credit (₹)',''].map(h=><th key={h} style={{ ...thS, padding:'8px 10px' }}>{h}</th>)}
                    </tr></thead><tbody>
                        {form.lines.map((l,i)=>(
                            <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                                <td style={{ padding:'4px 6px' }}>
                                    <select value={l.account_id} onChange={e=>setLine(i,'account_id',e.target.value)} style={{ ...pt.inp, padding:'4px 8px', fontSize:12 }}>
                                        <option value="">— Select Account —</option>
                                        {accounts.map(a=><option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>)}
                                    </select>
                                </td>
                                <td style={{ padding:'4px 6px' }}>
                                    <input value={l.description} onChange={e=>setLine(i,'description',e.target.value)} placeholder="Line note" style={{ ...pt.inp, padding:'4px 8px', fontSize:12 }} />
                                </td>
                                <td style={{ padding:'4px 6px' }}>
                                    <input type="number" min="0" step="0.01" value={l.debit_amount} onChange={e=>setLine(i,'debit_amount',e.target.value)} style={{ ...pt.inp, padding:'4px 8px', fontSize:12, textAlign:'right' }} />
                                </td>
                                <td style={{ padding:'4px 6px' }}>
                                    <input type="number" min="0" step="0.01" value={l.credit_amount} onChange={e=>setLine(i,'credit_amount',e.target.value)} style={{ ...pt.inp, padding:'4px 8px', fontSize:12, textAlign:'right' }} />
                                </td>
                                <td style={{ padding:'4px 6px' }}>
                                    {form.lines.length > 2 && <button onClick={()=>removeLine(i)} style={{ background:'#fee2e2', color:'#ef4444', border:'none', borderRadius:4, padding:'3px 8px', cursor:'pointer' }}>✕</button>}
                                </td>
                            </tr>
                        ))}
                        <tr style={{ background:'#f8fafc', fontWeight:700 }}>
                            <td colSpan={2} style={{ padding:'8px 10px', fontSize:12 }}>
                                <button onClick={addLine} style={{ ...btn('#6366f1'), padding:'4px 12px', fontSize:12 }}>+ Add Line</button>
                            </td>
                            <td style={{ padding:'8px 10px', textAlign:'right', color: balanced?'#10b981':'#ef4444' }}>₹{totalDr.toLocaleString('en-IN')}</td>
                            <td style={{ padding:'8px 10px', textAlign:'right', color: balanced?'#10b981':'#ef4444' }}>₹{totalCr.toLocaleString('en-IN')}</td>
                            <td />
                        </tr>
                    </tbody></table>
                    {!balanced && <div style={{ color:'#ef4444', fontSize:12, marginTop:8 }}>⚠ Debits and Credits must match (diff: {Math.abs(totalDr-totalCr).toFixed(2)})</div>}
                </div>

                {msg && <div style={{ color:'#ef4444', marginTop:12, fontSize:13 }}>{msg}</div>}
                <div style={{ marginTop:16, display:'flex', gap:10 }}>
                    <button onClick={save} disabled={saving||!balanced} style={btn(balanced?'#10b981':'#94a3b8')}>{saving?'Saving…':'Save as Draft'}</button>
                    <button onClick={()=>setModal(false)} style={btn('#64748b')}>Cancel</button>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Journal Entries</h2>
                <button onClick={openNew} style={btn('#6366f1')}>+ New Entry</button>
            </div>
            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <input placeholder="Search entry number / description…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...pt.inp, width:300 }} />
                <select value={status} onChange={e=>setStatus(e.target.value)} style={{ ...pt.inp, width:140 }}>
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="posted">Posted</option>
                    <option value="reversed">Reversed</option>
                </select>
            </div>
            <div style={{ overflowX:'auto' }}>
                <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                    {['Entry No','Date','Description','Reference','Status','Dr Total','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r,i)=>(
                        <tr key={r.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                            <td style={tdS}><b style={{ color:'#6366f1', cursor:'pointer' }} onClick={()=>openDetail(r)}>{r.entry_number}</b></td>
                            <td style={tdS}>{r.entry_date}</td>
                            <td style={{ ...tdS, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.description}</td>
                            <td style={tdS}>{r.reference||'—'}</td>
                            <td style={tdS}><span style={tag(STATUS_COLOR[r.status]||'#64748b')}>{r.status}</span></td>
                            <td style={tdS}>₹{Number(r.total_debits||0).toLocaleString('en-IN')}</td>
                            <td style={tdS}>
                                <button onClick={()=>openDetail(r)} style={sBtn('#6366f1')}>View</button>
                                {r.status==='draft' && <button onClick={()=>postJE(r.id)} style={sBtn('#10b981')}>Post</button>}
                            </td>
                        </tr>
                    ))}
                    {rows.length===0 && <tr><td colSpan={7} style={emptyTd}>No journal entries found</td></tr>}
                </tbody></table>
            </div>
        </div>
    );
}
