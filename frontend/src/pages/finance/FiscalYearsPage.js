// PAGE: Fiscal Years + Accounting Periods
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const tableS = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const btn  = c => ({ background:c, color:'#fff', border:'none', padding:'8px 18px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 });
const sBtn = c => ({ background:c, color:'#fff', border:'none', padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:12, marginRight:4 });
const tag  = c => ({ background:c+'22', color:c, padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600 });
const card = { background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', padding:'20px 24px', marginBottom:20 };

const emptyForm = { year_name:'', start_date:'', end_date:'', is_active:false };

export default function FiscalYearsPage() {
    const pt = usePageTheme();
    const thS = { ...pt.th, textAlign:'left' };
    const tdS = { ...pt.cell, verticalAlign:'middle' };
    const emptyTd = { textAlign:'center', padding:40, color:pt.colors.muted };

    const [rows,    setRows]    = useState([]);
    const [periods, setPeriods] = useState([]);
    const [selFY,   setSelFY]   = useState(null);
    const [modal,   setModal]   = useState(false);
    const [form,    setForm]    = useState(emptyForm);
    const [msg,     setMsg]     = useState('');
    const [saving,  setSaving]  = useState(false);

    const load = useCallback(() => {
        fetch('/api/finance/fiscal-years/', {credentials:'include'}).then(r=>r.json()).then(d=>setRows(d.fiscal_years||[]));
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        // Auto-suggest April-March
        const now = new Date();
        const fy_start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear()-1;
        setForm({ year_name:`${fy_start}-${String(fy_start+1).slice(2)}`, start_date:`${fy_start}-04-01`, end_date:`${fy_start+1}-03-31`, is_active:false });
        setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const r = await fetch('/api/finance/fiscal-years/', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (r.ok) { setModal(false); load(); }
        else { const d = await r.json(); setMsg(d.error || JSON.stringify(d)); }
    };

    const viewPeriods = async (fy) => {
        setSelFY(fy);
        const r = await fetch(`/api/finance/fiscal-years/${fy.id}/periods/`, {credentials:'include'});
        const d = await r.json();
        setPeriods(d.accounting_periods||[]);
    };

    const lbl = { display:'block', fontSize:12, fontWeight:600, marginBottom:4, color:pt.colors.muted };

    if (selFY) return (
        <div style={{ padding:24 }}>
            <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:20 }}>
                <button onClick={()=>setSelFY(null)} style={btn('#64748b')}>← Fiscal Years</button>
                <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Accounting Periods — {selFY.year_name}</h2>
                <span style={tag(selFY.is_active?'#10b981':'#64748b')}>{selFY.is_active?'Active':'Inactive'}</span>
                {selFY.is_closed && <span style={tag('#ef4444')}>Closed</span>}
            </div>
            <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                {['Period','#','Start Date','End Date','Status'].map(h=><th key={h} style={thS}>{h}</th>)}
            </tr></thead><tbody>
                {periods.map((p,i)=>(
                    <tr key={p.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                        <td style={tdS}><b>{p.period_name}</b></td>
                        <td style={tdS}>{p.period_number}</td>
                        <td style={tdS}>{p.start_date}</td>
                        <td style={tdS}>{p.end_date}</td>
                        <td style={tdS}><span style={tag(p.is_closed?'#ef4444':'#10b981')}>{p.is_closed?'Closed':'Open'}</span></td>
                    </tr>
                ))}
                {periods.length===0 && <tr><td colSpan={5} style={emptyTd}>No periods. Periods are auto-created when the Fiscal Year is saved.</td></tr>}
            </tbody></table>
        </div>
    );

    return (
        <div style={{ padding:24 }}>
            {modal ? (
                <div style={{ ...pt.formPage, maxWidth:500 }}>
                    <div style={pt.formHeader}>
                        <button onClick={()=>setModal(false)} style={pt.backBtn}>← Back</button>
                        <h3 style={{ margin:0 }}>New Fiscal Year</h3>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:20 }}>
                        <div style={{ gridColumn:'1/-1' }}>
                            <label style={lbl}>Year Name *</label>
                            <input value={form.year_name} onChange={e=>setForm(p=>({...p,year_name:e.target.value}))} placeholder="e.g. 2025-26" style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Start Date *</label>
                            <input type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>End Date *</label>
                            <input type="date" value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} style={pt.inp} />
                        </div>
                        <div style={{ gridColumn:'1/-1' }}>
                            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                                <input type="checkbox" checked={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.checked}))} />
                                <span style={{ fontSize:13 }}>Set as Active Fiscal Year (deactivates others)</span>
                            </label>
                        </div>
                        <div style={{ gridColumn:'1/-1', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#166534' }}>
                            12 monthly Accounting Periods will be auto-created for this fiscal year.
                        </div>
                    </div>
                    {msg && <div style={{ color:'#ef4444', fontSize:13, marginTop:10 }}>{msg}</div>}
                    <div style={{ marginTop:16, display:'flex', gap:10 }}>
                        <button onClick={save} disabled={saving} style={btn('#6366f1')}>{saving?'Creating…':'Create Fiscal Year'}</button>
                        <button onClick={()=>setModal(false)} style={btn('#64748b')}>Cancel</button>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                        <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Fiscal Years</h2>
                        <button onClick={openAdd} style={btn('#6366f1')}>+ New Fiscal Year</button>
                    </div>
                    <div style={card}>
                        <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                            {['Year','Start','End','Active','Closed','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map((r,i)=>(
                                <tr key={r.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                                    <td style={tdS}><b style={{ color:'#6366f1' }}>{r.year_name}</b></td>
                                    <td style={tdS}>{r.start_date}</td>
                                    <td style={tdS}>{r.end_date}</td>
                                    <td style={tdS}><span style={tag(r.is_active?'#10b981':'#64748b')}>{r.is_active?'Active':'—'}</span></td>
                                    <td style={tdS}><span style={tag(r.is_closed?'#ef4444':'#64748b')}>{r.is_closed?'Closed':'Open'}</span></td>
                                    <td style={tdS}><button onClick={()=>viewPeriods(r)} style={sBtn('#6366f1')}>View Periods</button></td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={6} style={emptyTd}>No fiscal years. Create your first fiscal year to begin accounting.</td></tr>}
                        </tbody></table>
                    </div>
                </>
            )}
        </div>
    );
}
