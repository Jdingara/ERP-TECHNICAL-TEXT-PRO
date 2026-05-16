// PAGE: TDS/TCS Center — Sections, Deductions, Returns
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const tableS = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const btn  = c => ({ background:c, color:'#fff', border:'none', padding:'8px 18px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 });
const sBtn = c => ({ background:c, color:'#fff', border:'none', padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:12, marginRight:4 });
const tag  = c => ({ background:c+'22', color:c, padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600 });
const card = { background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', padding:'20px 24px', marginBottom:20 };
const tabBtn = (active) => ({ padding:'8px 20px', border:'none', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:600, background:active?'#8b5cf6':'#f1f5f9', color:active?'#fff':'#64748b' });

export default function TDSCenterPage() {
    const pt = usePageTheme();
    const thS = { ...pt.th, textAlign:'left' };
    const tdS = { ...pt.cell, verticalAlign:'middle' };
    const emptyTd = { textAlign:'center', padding:40, color:pt.colors.muted };

    const [activeTab,setActiveTab] = useState('sections');
    const [sections, setSections]  = useState([]);
    const [deductions,setDeductions]= useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [search,   setSearch]    = useState('');

    const loadSections = useCallback(() => {
        fetch('/api/tds-tcs/sections/', {credentials:'include'}).then(r=>r.json()).then(d=>setSections(d.tds_sections||[]));
    }, []);

    const loadDeductions = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        const r = await fetch(`/api/tds-tcs/deductions/?${p}`, {credentials:'include'});
        const d = await r.json();
        setDeductions(d.tds_deductions||[]);
    }, [search]);

    const loadDashboard = useCallback(() => {
        fetch('/api/tds-tcs/dashboard/', {credentials:'include'}).then(r=>r.json()).then(d=>setDashboard(d));
    }, []);

    useEffect(() => { loadSections(); loadDashboard(); }, [loadSections, loadDashboard]);
    useEffect(() => { if (activeTab==='deductions') loadDeductions(); }, [activeTab, loadDeductions]);

    const markDeposited = async (id) => {
        const challan = prompt('Enter Challan Number:');
        if (!challan) return;
        const r = await fetch(`/api/tds-tcs/deductions/${id}/deposit/`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ challan_number: challan, deposit_date: new Date().toISOString().slice(0,10) }) });
        if (r.ok) loadDeductions();
    };

    const fmt = n => `₹${Number(n||0).toLocaleString('en-IN')}`;

    return (
        <div style={{ padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>TDS / TCS Center</h2>
            </div>

            {/* Dashboard KPIs */}
            {dashboard && (
                <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:24 }}>
                    {[
                        ['TDS Deducted (FY)',fmt(dashboard.total_tds_deducted),'#8b5cf6'],
                        ['TDS Deposited',fmt(dashboard.total_tds_deposited),'#10b981'],
                        ['TDS Pending',fmt(dashboard.tds_pending),'#ef4444'],
                        ['TCS Collected',fmt(dashboard.total_tcs_collected),'#3b82f6'],
                    ].map(([l,v,c])=>(
                        <div key={l} style={{ background:c+'11', border:`1px solid ${c}33`, borderRadius:10, padding:'14px 20px', minWidth:160 }}>
                            <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>{l.toUpperCase()}</div>
                            <div style={{ fontSize:20, fontWeight:700, color:c, marginTop:4 }}>{v}</div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                {[['sections','TDS Sections'],['deductions','Deductions'],['returns','Returns']].map(([k,l])=>(
                    <button key={k} onClick={()=>setActiveTab(k)} style={tabBtn(activeTab===k)}>{l}</button>
                ))}
            </div>

            {activeTab==='sections' && (
                <div style={card}>
                    <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                        {['Section','Description','Rate (Ind/HUF)','Rate (Company)','No PAN %','Threshold','Salary?'].map(h=><th key={h} style={thS}>{h}</th>)}
                    </tr></thead><tbody>
                        {sections.map((s,i)=>(
                            <tr key={s.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                                <td style={tdS}><b style={{ color:'#8b5cf6' }}>Sec. {s.section_code}</b></td>
                                <td style={{ ...tdS, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.description}</td>
                                <td style={tdS}>{s.rate_individual_huf}%</td>
                                <td style={tdS}>{s.rate_company}%</td>
                                <td style={tdS}><span style={tag('#ef4444')}>{s.rate_no_pan||20}%</span></td>
                                <td style={tdS}>{fmt(s.threshold_individual)}</td>
                                <td style={tdS}>{s.is_salary_section ? <span style={tag('#6366f1')}>Salary</span> : '—'}</td>
                            </tr>
                        ))}
                        {sections.length===0 && <tr><td colSpan={7} style={emptyTd}>No TDS sections. Seed standard sections like 192, 194C, 194A, 194I, 194J.</td></tr>}
                    </tbody></table>
                </div>
            )}

            {activeTab==='deductions' && (
                <>
                    <input placeholder="Search by vendor / reference…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...pt.inp, width:300, marginBottom:16 }} />
                    <div style={card}>
                        <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                            {['Date','Section','Party','Gross','TDS Amount','Net','Challan','Status','Action'].map(h=><th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {deductions.map((d,i)=>(
                                <tr key={d.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                                    <td style={tdS}>{d.deduction_date}</td>
                                    <td style={tdS}><span style={tag('#8b5cf6')}>{d.section_code}</span></td>
                                    <td style={tdS}>{d.vendor_name||d.employee_name||'—'}</td>
                                    <td style={tdS}>{fmt(d.gross_amount)}</td>
                                    <td style={tdS}><b style={{ color:'#8b5cf6' }}>{fmt(d.tds_amount)}</b></td>
                                    <td style={tdS}>{fmt(d.net_amount)}</td>
                                    <td style={tdS}>{d.challan_number||<span style={{ color:'#ef4444' }}>Pending</span>}</td>
                                    <td style={tdS}><span style={tag(d.is_deposited?'#10b981':'#f59e0b')}>{d.is_deposited?'Deposited':'Pending'}</span></td>
                                    <td style={tdS}>{!d.is_deposited && <button onClick={()=>markDeposited(d.id)} style={sBtn('#10b981')}>Mark Deposited</button>}</td>
                                </tr>
                            ))}
                            {deductions.length===0 && <tr><td colSpan={9} style={emptyTd}>No TDS deductions found</td></tr>}
                        </tbody></table>
                    </div>
                </>
            )}

            {activeTab==='returns' && (
                <div style={card}>
                    <div style={{ marginBottom:16 }}>
                        <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>TDS Returns</div>
                        <div style={{ background:'#fef3c7', border:'1px solid #f59e0b44', borderRadius:8, padding:'12px 16px', fontSize:13, color:'#92400e' }}>
                            26Q / 27Q / 24Q filing integration is a stub — configure TRACES credentials in Settings to enable direct e-filing.
                        </div>
                    </div>
                    <div style={{ color:'#94a3b8', textAlign:'center', padding:30 }}>
                        TDS returns will be listed here once filing integration is enabled.
                    </div>
                </div>
            )}
        </div>
    );
}
