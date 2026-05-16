// PAGE: Chart of Accounts
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const CATEGORIES = ['', 'asset', 'liability', 'equity', 'income', 'expense'];
const CAT_COLOR = { asset:'#3b82f6', liability:'#ef4444', equity:'#8b5cf6', income:'#10b981', expense:'#f59e0b' };
const empty = { account_code:'', account_name:'', account_category:'asset', description:'', is_active:true };

const tableS = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const btn  = c => ({ background:c, color:'#fff', border:'none', padding:'8px 18px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 });
const sBtn = c => ({ background:c, color:'#fff', border:'none', padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:12, marginRight:4 });
const tag  = c => ({ background:c+'22', color:c, padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600 });

export default function ChartOfAccountsPage() {
    const pt = usePageTheme();
    const thS = { ...pt.th, textAlign:'left' };
    const tdS = { ...pt.cell, verticalAlign:'middle' };
    const emptyTd = { textAlign:'center', padding:40, color:pt.colors.muted };

    const [rows,   setRows]   = useState([]);
    const [search, setSearch] = useState('');
    const [cat,    setCat]    = useState('');
    const [modal,  setModal]  = useState(false);
    const [form,   setForm]   = useState(empty);
    const [editId, setEditId] = useState(null);
    const [msg,    setMsg]    = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (cat) p.set('category', cat);
        const r = await fetch(`/api/finance/accounts/?${p}`, { credentials:'include' });
        const d = await r.json();
        setRows(d.accounts || []);
    }, [search, cat]);

    useEffect(() => { load(); }, [load]);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = r  => { setForm({ account_code:r.account_code, account_name:r.account_name, account_category:r.account_category, description:r.description||'', is_active:r.is_active }); setEditId(r.id); setMsg(''); setModal(true); };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/finance/accounts/${editId}/` : '/api/finance/accounts/';
        const r = await fetch(url, { method:editId?'PUT':'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (r.ok) { setModal(false); load(); }
        else { const d = await r.json(); setMsg(d.error || JSON.stringify(d)); }
    };

    const inp = f => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });
    const lbl = { display:'block', fontSize:12, fontWeight:600, marginBottom:4, color:pt.colors.muted };
    const row = { marginBottom:14 };

    const totals = CATEGORIES.slice(1).reduce((acc, c) => {
        acc[c] = rows.filter(r=>r.account_category===c).length;
        return acc;
    }, {});

    return (
        <div style={{ padding:24 }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                        <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Chart of Accounts</h2>
                        <button onClick={openAdd} style={btn('#3b82f6')}>+ New Account</button>
                    </div>

                    {/* Summary pills */}
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
                        {CATEGORIES.slice(1).map(c=>(
                            <div key={c} onClick={()=>setCat(cat===c?'':c)} style={{ cursor:'pointer', padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, background:cat===c?CAT_COLOR[c]+'33':'#f1f5f9', color:CAT_COLOR[c], border:`1px solid ${CAT_COLOR[c]}44` }}>
                                {c.charAt(0).toUpperCase()+c.slice(1)} ({totals[c]||0})
                            </div>
                        ))}
                        {cat && <div onClick={()=>setCat('')} style={{ cursor:'pointer', padding:'6px 14px', borderRadius:20, fontSize:12, background:'#fee2e2', color:'#ef4444' }}>✕ Clear</div>}
                    </div>

                    <input placeholder="Search account code or name…" value={search} onChange={e=>setSearch(e.target.value)}
                        style={{ ...pt.inp, width:320, marginBottom:16 }} />

                    <div style={{ overflowX:'auto' }}>
                        <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                            {['Code','Account Name','Category','Description','Active','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map((r,i)=>(
                                <tr key={r.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                                    <td style={tdS}><b style={{ color:'#3b82f6', fontFamily:'monospace' }}>{r.account_code}</b></td>
                                    <td style={tdS}>{r.account_name}</td>
                                    <td style={tdS}><span style={tag(CAT_COLOR[r.account_category]||'#64748b')}>{r.account_category}</span></td>
                                    <td style={{ ...tdS, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.description||'—'}</td>
                                    <td style={tdS}><span style={tag(r.is_active?'#10b981':'#ef4444')}>{r.is_active?'Active':'Inactive'}</span></td>
                                    <td style={tdS}><button onClick={()=>openEdit(r)} style={sBtn('#3b82f6')}>Edit</button></td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={6} style={emptyTd}>No accounts found. Add your Chart of Accounts to get started.</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={{ ...pt.formPage, maxWidth:600 }}>
                    <div style={pt.formHeader}>
                        <button onClick={()=>setModal(false)} style={pt.backBtn}>← Back</button>
                        <h3 style={{ margin:0, fontSize:18 }}>{editId?'Edit Account':'New Account'}</h3>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:20 }}>
                        <div style={row}>
                            <label style={lbl}>Account Code *</label>
                            <input {...inp('account_code')} placeholder="e.g. 1100" style={pt.inp} />
                        </div>
                        <div style={row}>
                            <label style={lbl}>Account Name *</label>
                            <input {...inp('account_name')} placeholder="e.g. Accounts Receivable" style={pt.inp} />
                        </div>
                        <div style={row}>
                            <label style={lbl}>Category *</label>
                            <select {...inp('account_category')} style={pt.inp}>
                                {CATEGORIES.slice(1).map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                            </select>
                        </div>
                        <div style={row}>
                            <label style={lbl}>Active</label>
                            <select value={form.is_active?'true':'false'} onChange={e=>setForm(p=>({...p,is_active:e.target.value==='true'}))} style={pt.inp}>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                            </select>
                        </div>
                        <div style={{ ...row, gridColumn:'1 / -1' }}>
                            <label style={lbl}>Description</label>
                            <textarea {...inp('description')} rows={2} style={{ ...pt.inp, resize:'vertical' }} />
                        </div>
                    </div>
                    {msg && <div style={{ color:'#ef4444', marginTop:10, fontSize:13 }}>{msg}</div>}
                    <div style={{ marginTop:16, display:'flex', gap:10 }}>
                        <button onClick={save} disabled={saving} style={btn('#3b82f6')}>{saving?'Saving…':'Save Account'}</button>
                        <button onClick={()=>setModal(false)} style={btn('#64748b')}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
