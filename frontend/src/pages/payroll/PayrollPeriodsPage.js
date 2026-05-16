// PAGE: Payroll Periods — run payroll, view payslips
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const tableS = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const btn  = c => ({ background:c, color:'#fff', border:'none', padding:'8px 18px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 });
const sBtn = c => ({ background:c, color:'#fff', border:'none', padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:12, marginRight:4 });
const tag  = c => ({ background:c+'22', color:c, padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600 });
const card = { background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', padding:'20px 24px', marginBottom:20 };
const STATUS_COLOR = { draft:'#64748b', processing:'#f59e0b', posted:'#10b981', paid:'#3b82f6' };

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const emptyForm = { period_month: new Date().getMonth()+1, period_year: new Date().getFullYear(), working_days:26, period_name:'' };

export default function PayrollPeriodsPage() {
    const pt = usePageTheme();
    const thS = { ...pt.th, textAlign:'left' };
    const tdS = { ...pt.cell, verticalAlign:'middle' };
    const emptyTd = { textAlign:'center', padding:40, color:pt.colors.muted };

    const [rows,    setRows]    = useState([]);
    const [payslips,setPayslips]= useState([]);
    const [modal,   setModal]   = useState(false);
    const [detail,  setDetail]  = useState(null);
    const [form,    setForm]    = useState(emptyForm);
    const [msg,     setMsg]     = useState('');
    const [saving,  setSaving]  = useState(false);
    const [running, setRunning] = useState(false);

    const load = useCallback(() => {
        fetch('/api/payroll/payroll-periods/', {credentials:'include'}).then(r=>r.json()).then(d=>setRows(d.payroll_periods||[]));
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setForm(emptyForm); setMsg(''); setModal(true); };

    const save = async () => {
        setSaving(true);
        const payload = { ...form, period_name: form.period_name || `${MONTHS[form.period_month-1]} ${form.period_year}` };
        const r = await fetch('/api/payroll/payroll-periods/', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
        setSaving(false);
        if (r.ok) { setModal(false); load(); }
        else { const d = await r.json(); setMsg(d.error || JSON.stringify(d)); }
    };

    const runPayroll = async (id) => {
        setRunning(true);
        const r = await fetch(`/api/payroll/payroll-periods/${id}/run/`, { method:'POST', credentials:'include' });
        setRunning(false);
        const d = await r.json();
        if (r.ok) { load(); alert(`Payroll run complete. ${d.payslips_created||0} payslips created.`); }
        else { alert(d.error || 'Error running payroll'); }
    };

    const postPayroll = async (id) => {
        const r = await fetch(`/api/payroll/payroll-periods/${id}/post/`, { method:'POST', credentials:'include' });
        if (r.ok) load();
    };

    const viewPayslips = async (period) => {
        setDetail(period);
        const r = await fetch(`/api/payroll/payslips/?period=${period.id}`, {credentials:'include'});
        const d = await r.json();
        setPayslips(d.payslips||[]);
    };

    const approvePayslip = async (id) => {
        const r = await fetch(`/api/payroll/payslips/${id}/approve/`, { method:'POST', credentials:'include' });
        if (r.ok) { const pp = detail; viewPayslips(pp); }
    };

    const lbl = { display:'block', fontSize:12, fontWeight:600, marginBottom:4, color:pt.colors.muted };
    const fmt = n => `₹${Number(n||0).toLocaleString('en-IN')}`;

    if (detail) return (
        <div style={{ padding:24 }}>
            <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:20 }}>
                <button onClick={()=>setDetail(null)} style={btn('#64748b')}>← Payroll Periods</button>
                <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Payslips — {detail.period_name}</h2>
                <span style={tag(STATUS_COLOR[detail.status]||'#64748b')}>{detail.status}</span>
            </div>
            <div style={{ display:'flex', gap:16, marginBottom:20, flexWrap:'wrap' }}>
                {[['Employees',detail.payslips_count||payslips.length,'#6366f1'],['Gross',fmt(detail.total_gross),'#10b981'],['Deductions',fmt(detail.total_deductions),'#ef4444'],['Net',fmt(detail.total_net),'#3b82f6']].map(([l,v,c])=>(
                    <div key={l} style={{ background:c+'11', border:`1px solid ${c}33`, borderRadius:10, padding:'14px 20px', minWidth:140 }}>
                        <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>{l.toUpperCase()}</div>
                        <div style={{ fontSize:20, fontWeight:700, color:c, marginTop:4 }}>{v}</div>
                    </div>
                ))}
            </div>
            <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                {['Employee','Gross','PF (Ee)','ESI (Ee)','PT','TDS','Net Salary','Status','Action'].map(h=><th key={h} style={thS}>{h}</th>)}
            </tr></thead><tbody>
                {payslips.map((p,i)=>(
                    <tr key={p.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                        <td style={tdS}><b>{p.employee_name}</b><div style={{ fontSize:11, color:'#94a3b8' }}>{p.employee_code}</div></td>
                        <td style={tdS}>{fmt(p.gross_earnings)}</td>
                        <td style={tdS}>{p.pf_employee>0?fmt(p.pf_employee):'—'}</td>
                        <td style={tdS}>{p.esi_employee>0?fmt(p.esi_employee):'—'}</td>
                        <td style={tdS}>{p.professional_tax>0?fmt(p.professional_tax):'—'}</td>
                        <td style={tdS}>{p.tds_on_salary>0?fmt(p.tds_on_salary):'—'}</td>
                        <td style={tdS}><b style={{ color:'#059669' }}>{fmt(p.net_salary)}</b></td>
                        <td style={tdS}><span style={tag(p.status==='approved'?'#10b981':'#f59e0b')}>{p.status}</span></td>
                        <td style={tdS}>{p.status==='draft' && <button onClick={()=>approvePayslip(p.id)} style={sBtn('#10b981')}>Approve</button>}</td>
                    </tr>
                ))}
                {payslips.length===0 && <tr><td colSpan={9} style={emptyTd}>No payslips yet. Run Payroll to generate.</td></tr>}
            </tbody></table>
        </div>
    );

    return (
        <div style={{ padding:24 }}>
            {modal ? (
                <div style={{ ...pt.formPage, maxWidth:500 }}>
                    <div style={pt.formHeader}>
                        <button onClick={()=>setModal(false)} style={pt.backBtn}>← Back</button>
                        <h3 style={{ margin:0 }}>New Payroll Period</h3>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:20 }}>
                        <div>
                            <label style={lbl}>Month *</label>
                            <select value={form.period_month} onChange={e=>setForm(p=>({...p,period_month:parseInt(e.target.value)}))} style={pt.inp}>
                                {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Year *</label>
                            <select value={form.period_year} onChange={e=>setForm(p=>({...p,period_year:parseInt(e.target.value)}))} style={pt.inp}>
                                {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Working Days</label>
                            <input type="number" min="1" max="31" value={form.working_days} onChange={e=>setForm(p=>({...p,working_days:parseInt(e.target.value)}))} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Period Name (optional)</label>
                            <input value={form.period_name} onChange={e=>setForm(p=>({...p,period_name:e.target.value}))} placeholder="Auto-generated if blank" style={pt.inp} />
                        </div>
                    </div>
                    {msg && <div style={{ color:'#ef4444', fontSize:13, marginTop:10 }}>{msg}</div>}
                    <div style={{ marginTop:16, display:'flex', gap:10 }}>
                        <button onClick={save} disabled={saving} style={btn('#6366f1')}>{saving?'Creating…':'Create Period'}</button>
                        <button onClick={()=>setModal(false)} style={btn('#64748b')}>Cancel</button>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                        <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Payroll Periods</h2>
                        <button onClick={openAdd} style={btn('#6366f1')}>+ New Period</button>
                    </div>
                    <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                        {['Period','Working Days','Gross','PF','ESI','Net','Status','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                    </tr></thead><tbody>
                        {rows.map((r,i)=>(
                            <tr key={r.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                                <td style={tdS}><b style={{ color:'#6366f1' }}>{r.period_name}</b></td>
                                <td style={tdS}>{r.working_days}</td>
                                <td style={tdS}>{fmt(r.total_gross)}</td>
                                <td style={tdS}>{fmt(r.total_pf_employee)}</td>
                                <td style={tdS}>{fmt(r.total_esi_employee)}</td>
                                <td style={tdS}><b style={{ color:'#059669' }}>{fmt(r.total_net)}</b></td>
                                <td style={tdS}><span style={tag(STATUS_COLOR[r.status]||'#64748b')}>{r.status}</span></td>
                                <td style={tdS}>
                                    <button onClick={()=>viewPayslips(r)} style={sBtn('#6366f1')}>View</button>
                                    {r.status==='draft' && <button onClick={()=>runPayroll(r.id)} disabled={running} style={sBtn('#f59e0b')}>{running?'Running…':'Run'}</button>}
                                    {r.status==='processing' && <button onClick={()=>postPayroll(r.id)} style={sBtn('#10b981')}>Post</button>}
                                </td>
                            </tr>
                        ))}
                        {rows.length===0 && <tr><td colSpan={8} style={emptyTd}>No payroll periods yet. Create a period and run payroll.</td></tr>}
                    </tbody></table>
                </>
            )}
        </div>
    );
}
