// PAGE: QC Inspections — Create and view quality inspection records
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

/* eslint-disable no-undef */

const empty = { batch_id:'', inspection_date:new Date().toISOString().slice(0,10), inspector:'', result:'pass', defect_type_id:'', defect_count:'0', remarks:'' };

export default function InspectionsPage() {
    const pt = usePageTheme();
    const emptyTd  = { textAlign:'center', padding:40, color: pt.colors.muted };
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const searchS  = { ...pt.inp, width: 260, outline: 'none' };
    const selectS  = { ...pt.inp, width: 'auto' };
    const formPage = { ...pt.formPage, maxWidth: 900 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;
    const [rows,        setRows]        = useState([]);
    const [batches,     setBatches]     = useState([]);
    const [defectTypes, setDefectTypes] = useState([]);
    const [search,      setSearch]      = useState('');
    const [result,      setResult]      = useState('');
    const [modal,       setModal]       = useState(false);
    const [form,        setForm]        = useState(empty);
    const [saving,      setSaving]      = useState(false);
    const [msg,         setMsg]         = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (result) p.set('result', result);
        const res = await fetch(`/api/quality/inspections/?${p}`, { credentials:'include' });
        const d = await res.json();
        setRows(d.inspections||[]);
    }, [search, result]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/production/batches/?status=qc_pending', {credentials:'include'}).then(r=>r.json()).then(d=>setBatches(d.batches||[]));
        fetch('/api/quality/defect-types/', {credentials:'include'}).then(r=>r.json()).then(d=>setDefectTypes(d.defect_types||[]));
    }, []);

    const openAdd = () => { setForm(empty); setMsg(''); setModal(true); };

    const save = async () => {
        if (!form.batch_id||!form.result) { setMsg('Batch and result are required'); return; }
        setSaving(true);
        const res = await fetch('/api/quality/inspections/', { method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (res.ok) {
            setModal(false); load();
            fetch('/api/production/batches/?status=qc_pending', {credentials:'include'}).then(r=>r.json()).then(d=>setBatches(d.batches||[]));
        } else { const d = await res.json(); setMsg(d.error||'Error'); }
    };

    const inp = (f) => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });
    const RESULT_COLOR = { pass:'#10b981', fail:'#ef4444', rework:'#8b5cf6', conditional_pass:'#f59e0b' };

    return (
        <div style={{ padding:24 }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                        <div>
                            <h2 style={{ margin:'0 0 4px', fontSize:22, fontWeight:700 }}>QC Inspections</h2>
                            <p style={{ margin:0, color: pt.colors.dimText, fontSize:13 }}>
                                Pending batches: <b style={{ color:'#f59e0b' }}>{batches.length}</b>
                            </p>
                        </div>
                        <button onClick={openAdd} style={btn('#10b981')}>+ New Inspection</button>
                    </div>
                    <div style={{ display:'flex', gap:12, marginBottom:20 }}>
                        <input placeholder="Search batch / inspector…" value={search}
                            onChange={e=>setSearch(e.target.value)} style={searchS} />
                        <select value={result} onChange={e=>setResult(e.target.value)} style={selectS}>
                            <option value="">All Results</option>
                            <option value="pass">Pass</option>
                            <option value="fail">Fail</option>
                            <option value="rework">Rework</option>
                            <option value="conditional_pass">Conditional Pass</option>
                        </select>
                    </div>
                    {batches.length>0 && (
                        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
                            <div style={{ fontWeight:600, fontSize:13, color:'#92400e', marginBottom:8 }}>
                                ⏳ {batches.length} batch(es) waiting for inspection:
                            </div>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                                {batches.slice(0,10).map(b=>(
                                    <button key={b.id} onClick={()=>{ setForm(p=>({...p,batch_id:b.id})); setModal(true); setMsg(''); }}
                                        style={{ padding:'4px 12px', background:'#f59e0b', color:'#fff', border:'none', borderRadius:20, fontSize:12, cursor:'pointer', fontWeight:600 }}>
                                        {b.batch_number}
                                    </button>
                                ))}
                                {batches.length>10 && <span style={{ fontSize:12, color:'#92400e' }}>+{batches.length-10} more</span>}
                            </div>
                        </div>
                    )}
                    <div style={{ overflowX:'auto' }}>
                        <table style={tableS}><thead><tr style={{ background: pt.colors.inner, color:'#fff' }}>
                            {['Inspection No','Date','Batch','Product','Inspector','Result','Defect Type','Defect Count','Remarks'].map(h=>
                                <th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map((r,i)=>(
                                <tr key={r.id} style={{ background:i%2===0?pt.colors.inner:'#fff' }}>
                                    <td style={tdS}>{r.inspection_number||`INS-${r.id}`}</td>
                                    <td style={tdS}>{r.inspection_date}</td>
                                    <td style={tdS}><b style={{ color:'#3b82f6' }}>{r.batch_number}</b></td>
                                    <td style={tdS}>{r.product_name}</td>
                                    <td style={tdS}>{r.inspector||'—'}</td>
                                    <td style={tdS}><span style={tag(RESULT_COLOR[r.result]||'#64748b')}>{r.result?.replace('_',' ')}</span></td>
                                    <td style={tdS}>{r.defect_name||'—'}</td>
                                    <td style={tdS}>{r.defect_count||'—'}</td>
                                    <td style={tdS}>{r.remarks||'—'}</td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={9} style={emptyTd}>No inspections recorded</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={()=>setModal(false)} style={backBtnS}>← Back to Inspections</button>
                        <h3 style={{ margin:0, fontSize:20, fontWeight:700, color:'#10b981' }}>New QC Inspection</h3>
                    </div>
                    <div style={grid2}>
                        <F label="Batch *">
                            <select style={inpS} {...inp('batch_id')}>
                                <option value="">Select batch…</option>
                                {batches.map(b=><option key={b.id} value={b.id}>{b.batch_number} — {b.product_name}</option>)}
                            </select>
                        </F>
                        <F label="Inspection Date *"><input type="date" style={inpS} {...inp('inspection_date')} /></F>
                        <F label="Inspector Name"><input style={inpS} {...inp('inspector')} /></F>
                        <F label="Result *">
                            <select style={inpS} {...inp('result')}>
                                <option value="pass">✅ Pass</option>
                                <option value="conditional_pass">⚠️ Conditional Pass</option>
                                <option value="rework">🔄 Rework</option>
                                <option value="fail">❌ Fail</option>
                            </select>
                        </F>
                        <F label="Defect Type (if any)">
                            <select style={inpS} {...inp('defect_type_id')}>
                                <option value="">None</option>
                                {defectTypes.map(d=><option key={d.id} value={d.id}>{d.defect_name}</option>)}
                            </select>
                        </F>
                        <F label="Defect Count"><input type="number" style={inpS} {...inp('defect_count')} /></F>
                    </div>
                    <F label="Remarks"><textarea style={{...inpS,height:70,resize:'vertical'}} {...inp('remarks')} /></F>
                    <div style={{ marginTop:12, fontSize:12, color: pt.colors.dimText, background: pt.colors.inner, borderRadius:8, padding:'8px 12px' }}>
                        <b>Pass</b> → Finished &nbsp;|&nbsp; <b>Fail</b> → QC Failed &nbsp;|&nbsp; <b>Rework</b> → Rework &nbsp;|&nbsp; <b>Conditional Pass</b> → Finished
                    </div>
                    {msg && <div style={{ color:'#ef4444', marginTop:8 }}>{msg}</div>}
                    <div style={{ display:'flex', gap:10, marginTop:24, justifyContent:'flex-end' }}>
                        <button onClick={()=>setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={save} disabled={saving} style={btn('#10b981')}>{saving?'Saving…':'Save Inspection'}</button>
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
