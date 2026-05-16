// PAGE: GST Center — GST Rates, HSN Codes, GSTR-1, GSTR-3B
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const tableS = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const btn  = c => ({ background:c, color:'#fff', border:'none', padding:'8px 18px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 });
const sBtn = c => ({ background:c, color:'#fff', border:'none', padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:12, marginRight:4 });
const tag  = c => ({ background:c+'22', color:c, padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600 });
const card = { background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', padding:'20px 24px', marginBottom:20 };
const tabBtn = (active) => ({ padding:'8px 20px', border:'none', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:600, background:active?'#10b981':'#f1f5f9', color:active?'#fff':'#64748b' });

const emptyRate = { rate_name:'', total_rate:'', cgst_rate:'', sgst_rate:'', igst_rate:'', cess_rate:'0' };

export default function GSTCenterPage() {
    const pt = usePageTheme();
    const thS = { ...pt.th, textAlign:'left' };
    const tdS = { ...pt.cell, verticalAlign:'middle' };
    const emptyTd = { textAlign:'center', padding:40, color:pt.colors.muted };

    const [activeTab,setActiveTab] = useState('rates');
    const [rates,    setRates]     = useState([]);
    const [hsn,      setHSN]       = useState([]);
    const [gstr1,    setGSTR1]     = useState([]);
    const [gstr3b,   setGSTR3B]   = useState([]);
    const [modal,    setModal]     = useState(false);
    const [form,     setForm]      = useState(emptyRate);
    const [editId,   setEditId]    = useState(null);
    const [msg,      setMsg]       = useState('');
    const [saving,   setSaving]    = useState(false);
    const [period,   setPeriod]    = useState({ month: new Date().getMonth()+1, year: new Date().getFullYear() });

    useEffect(() => {
        fetch('/api/gst/rates/', {credentials:'include'}).then(r=>r.json()).then(d=>setRates(d.gst_rates||[]));
        fetch('/api/gst/hsn/', {credentials:'include'}).then(r=>r.json()).then(d=>setHSN(d.hsn_codes||[]));
    }, []);

    useEffect(() => {
        const p = new URLSearchParams({ month: period.month, year: period.year });
        fetch(`/api/gst/gstr1/?${p}`, {credentials:'include'}).then(r=>r.json()).then(d=>setGSTR1(d.gstr1_summaries||[]));
        fetch(`/api/gst/gstr3b/?${p}`, {credentials:'include'}).then(r=>r.json()).then(d=>setGSTR3B(d.gstr3b_summaries||[]));
    }, [period]);

    const openAdd  = () => { setForm(emptyRate); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = r  => { setForm({ rate_name:r.rate_name, total_rate:r.total_rate, cgst_rate:r.cgst_rate, sgst_rate:r.sgst_rate, igst_rate:r.igst_rate, cess_rate:r.cess_rate||'0' }); setEditId(r.id); setMsg(''); setModal(true); };

    const autoSplit = (total) => {
        const half = (parseFloat(total)||0) / 2;
        setForm(p=>({ ...p, total_rate:total, cgst_rate:String(half), sgst_rate:String(half), igst_rate:total }));
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/gst/rates/${editId}/` : '/api/gst/rates/';
        const r = await fetch(url, { method:editId?'PUT':'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (r.ok) { setModal(false); fetch('/api/gst/rates/', {credentials:'include'}).then(res=>res.json()).then(d=>setRates(d.gst_rates||[])); }
        else { const d = await r.json(); setMsg(d.error || JSON.stringify(d)); }
    };

    const inp = f => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });
    const lbl = { display:'block', fontSize:12, fontWeight:600, marginBottom:4, color:pt.colors.muted };
    const fmt = n => `₹${Number(n||0).toLocaleString('en-IN')}`;

    return (
        <div style={{ padding:24 }}>
            {modal ? (
                <div style={{ ...pt.formPage, maxWidth:600 }}>
                    <div style={pt.formHeader}>
                        <button onClick={()=>setModal(false)} style={pt.backBtn}>← Back</button>
                        <h3 style={{ margin:0 }}>{editId?'Edit':'New'} GST Rate</h3>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:20 }}>
                        <div style={{ gridColumn:'1/-1' }}>
                            <label style={lbl}>Rate Name *</label>
                            <input {...inp('rate_name')} placeholder="e.g. GST 18%" style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Total Rate (%) *</label>
                            <input type="number" step="0.01" value={form.total_rate} onChange={e=>autoSplit(e.target.value)} placeholder="18" style={pt.inp} />
                            <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>CGST/SGST auto-split when changed</div>
                        </div>
                        <div>
                            <label style={lbl}>Cess (%)</label>
                            <input type="number" step="0.01" {...inp('cess_rate')} placeholder="0" style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>CGST Rate (%)</label>
                            <input type="number" step="0.01" {...inp('cgst_rate')} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>SGST Rate (%)</label>
                            <input type="number" step="0.01" {...inp('sgst_rate')} style={pt.inp} />
                        </div>
                        <div style={{ gridColumn:'1/-1' }}>
                            <label style={lbl}>IGST Rate (%) — for inter-state</label>
                            <input type="number" step="0.01" {...inp('igst_rate')} style={pt.inp} />
                        </div>
                    </div>
                    {msg && <div style={{ color:'#ef4444', fontSize:13, marginTop:10 }}>{msg}</div>}
                    <div style={{ marginTop:16, display:'flex', gap:10 }}>
                        <button onClick={save} disabled={saving} style={btn('#10b981')}>{saving?'Saving…':'Save Rate'}</button>
                        <button onClick={()=>setModal(false)} style={btn('#64748b')}>Cancel</button>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                        <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>GST Center</h2>
                        {activeTab==='rates' && <button onClick={openAdd} style={btn('#10b981')}>+ New GST Rate</button>}
                    </div>

                    <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                        {[['rates','GST Rates'],['hsn','HSN/SAC Codes'],['gstr1','GSTR-1'],['gstr3b','GSTR-3B']].map(([k,l])=>(
                            <button key={k} onClick={()=>setActiveTab(k)} style={tabBtn(activeTab===k)}>{l}</button>
                        ))}
                    </div>

                    {activeTab==='rates' && (
                        <div style={card}>
                            <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                                {['Rate Name','Total %','CGST %','SGST %','IGST %','Cess %','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                            </tr></thead><tbody>
                                {rates.map((r,i)=>(
                                    <tr key={r.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                                        <td style={tdS}><b>{r.rate_name}</b></td>
                                        <td style={tdS}><span style={tag('#10b981')}>{r.total_rate}%</span></td>
                                        <td style={tdS}>{r.cgst_rate}%</td>
                                        <td style={tdS}>{r.sgst_rate}%</td>
                                        <td style={tdS}>{r.igst_rate}%</td>
                                        <td style={tdS}>{r.cess_rate||0}%</td>
                                        <td style={tdS}><button onClick={()=>openEdit(r)} style={sBtn('#3b82f6')}>Edit</button></td>
                                    </tr>
                                ))}
                                {rates.length===0 && <tr><td colSpan={7} style={emptyTd}>No GST rates. Add GST 5%, 12%, 18%, 28% to start.</td></tr>}
                            </tbody></table>
                        </div>
                    )}

                    {activeTab==='hsn' && (
                        <div style={card}>
                            <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                                {['HSN Code','Description','GST Rate','Unit'].map(h=><th key={h} style={thS}>{h}</th>)}
                            </tr></thead><tbody>
                                {hsn.map((h,i)=>(
                                    <tr key={h.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                                        <td style={tdS}><b style={{ fontFamily:'monospace', color:'#1e40af' }}>{h.hsn_code}</b></td>
                                        <td style={tdS}>{h.description}</td>
                                        <td style={tdS}>{h.gst_rate_name || '—'}</td>
                                        <td style={tdS}>{h.uom || '—'}</td>
                                    </tr>
                                ))}
                                {hsn.length===0 && <tr><td colSpan={4} style={emptyTd}>No HSN codes configured</td></tr>}
                            </tbody></table>
                        </div>
                    )}

                    {(activeTab==='gstr1'||activeTab==='gstr3b') && (
                        <>
                            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16 }}>
                                <select value={period.month} onChange={e=>setPeriod(p=>({...p,month:parseInt(e.target.value)}))} style={{ ...pt.inp, width:140 }}>
                                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=>(
                                        <option key={i+1} value={i+1}>{m}</option>
                                    ))}
                                </select>
                                <select value={period.year} onChange={e=>setPeriod(p=>({...p,year:parseInt(e.target.value)}))} style={{ ...pt.inp, width:110 }}>
                                    {[2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>

                            {activeTab==='gstr1' && (
                                <div style={card}>
                                    <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>GSTR-1 Summary</div>
                                    {gstr1.length===0 ? (
                                        <div style={{ color:'#94a3b8', textAlign:'center', padding:30 }}>
                                            No GSTR-1 data for this period. Generate GSTR-1 from GST Ledger entries.
                                        </div>
                                    ) : gstr1.map(g=>(
                                        <div key={g.id} style={{ padding:'12px 0', borderBottom:'1px solid #f1f5f9' }}>
                                            <div style={{ display:'flex', justifyContent:'space-between' }}>
                                                <span style={{ fontWeight:600 }}>GSTIN: {g.gstin}</span>
                                                <span style={tag(g.status==='filed'?'#10b981':'#f59e0b')}>{g.status}</span>
                                            </div>
                                            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginTop:10, fontSize:12 }}>
                                                {[['Taxable',g.taxable_value],['CGST',g.cgst_amount],['SGST',g.sgst_amount],['IGST',g.igst_amount]].map(([l,v])=>(
                                                    <div key={l}><div style={{ color:'#94a3b8' }}>{l}</div><div style={{ fontWeight:700 }}>{fmt(v)}</div></div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab==='gstr3b' && (
                                <div style={card}>
                                    <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>GSTR-3B Summary</div>
                                    <div style={{ background:'#fef3c7', border:'1px solid #f59e0b44', borderRadius:8, padding:'12px 16px', marginBottom:16, fontSize:13 }}>
                                        GSTR-3B filing integration is a stub. Configure your GSP credentials in Settings → GST Portal to enable direct filing.
                                    </div>
                                    {gstr3b.length===0 ? (
                                        <div style={{ color:'#94a3b8', textAlign:'center', padding:30 }}>No GSTR-3B data for this period</div>
                                    ) : gstr3b.map(g=>(
                                        <div key={g.id} style={{ padding:'12px 0', borderBottom:'1px solid #f1f5f9' }}>
                                            <div style={{ display:'flex', justifyContent:'space-between' }}>
                                                <span style={{ fontWeight:600 }}>Period: {g.period_month}/{g.period_year}</span>
                                                <span style={tag(g.status==='filed'?'#10b981':'#f59e0b')}>{g.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
