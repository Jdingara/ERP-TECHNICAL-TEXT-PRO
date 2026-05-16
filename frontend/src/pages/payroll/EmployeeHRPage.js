// PAGE: Employee HR — list, create, statutory details
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const tableS = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const btn  = c => ({ background:c, color:'#fff', border:'none', padding:'8px 18px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 });
const sBtn = c => ({ background:c, color:'#fff', border:'none', padding:'3px 10px', borderRadius:4, cursor:'pointer', fontSize:12, marginRight:4 });
const tag  = c => ({ background:c+'22', color:c, padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600 });
const STATUS_COLOR = { active:'#10b981', inactive:'#64748b', resigned:'#f59e0b', terminated:'#ef4444' };

const empty = { employee_code:'', first_name:'', last_name:'', gender:'male', date_of_joining: new Date().toISOString().slice(0,10), employment_type:'permanent', designation:'', department_id:'', basic_salary:'', hra:'0', da:'0' };

export default function EmployeeHRPage() {
    const pt = usePageTheme();
    const thS = { ...pt.th, textAlign:'left' };
    const tdS = { ...pt.cell, verticalAlign:'middle' };
    const emptyTd = { textAlign:'center', padding:40, color:pt.colors.muted };

    const [rows,   setRows]   = useState([]);
    const [depts,  setDepts]  = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('active');
    const [modal,  setModal]  = useState(false);
    const [form,   setForm]   = useState(empty);
    const [editId, setEditId] = useState(null);
    const [msg,    setMsg]    = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (status) p.set('status', status);
        const r = await fetch(`/api/payroll/employees/?${p}`, {credentials:'include'});
        const d = await r.json();
        setRows(d.employees||[]);
    }, [search, status]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/payroll/departments/', {credentials:'include'}).then(r=>r.json()).then(d=>setDepts(d.departments||[]));
    }, []);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = r  => {
        setForm({ employee_code:r.employee_code, first_name:r.first_name, last_name:r.last_name, gender:r.gender, date_of_joining:r.date_of_joining, employment_type:r.employment_type, designation:r.designation||'', department_id:r.department_id||'', basic_salary:r.basic_salary, hra:r.hra||'0', da:r.da||'0' });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/payroll/employees/${editId}/` : '/api/payroll/employees/';
        const r = await fetch(url, { method:editId?'PUT':'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (r.ok) { setModal(false); load(); }
        else { const d = await r.json(); setMsg(d.error || JSON.stringify(d)); }
    };

    const inp = f => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });
    const lbl = { display:'block', fontSize:12, fontWeight:600, marginBottom:4, color:pt.colors.muted };
    const fmt = n => `₹${Number(n||0).toLocaleString('en-IN')}`;

    return (
        <div style={{ padding:24 }}>
            {modal ? (
                <div style={{ ...pt.formPage, maxWidth:700 }}>
                    <div style={pt.formHeader}>
                        <button onClick={()=>setModal(false)} style={pt.backBtn}>← Back</button>
                        <h3 style={{ margin:0 }}>{editId?'Edit':'New'} Employee</h3>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:20 }}>
                        <div>
                            <label style={lbl}>Employee Code *</label>
                            <input {...inp('employee_code')} placeholder="EMP001" style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Gender</label>
                            <select {...inp('gender')} style={pt.inp}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>First Name *</label>
                            <input {...inp('first_name')} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Last Name *</label>
                            <input {...inp('last_name')} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Date of Joining *</label>
                            <input type="date" {...inp('date_of_joining')} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Employment Type</label>
                            <select {...inp('employment_type')} style={pt.inp}>
                                <option value="permanent">Permanent</option>
                                <option value="contract">Contract</option>
                                <option value="daily_wage">Daily Wage</option>
                                <option value="trainee">Trainee</option>
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Department</label>
                            <select {...inp('department_id')} style={pt.inp}>
                                <option value="">— Select —</option>
                                {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Designation</label>
                            <input {...inp('designation')} placeholder="e.g. Weaving Operator" style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>Basic Salary (₹) *</label>
                            <input type="number" min="0" step="0.01" {...inp('basic_salary')} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>HRA (₹)</label>
                            <input type="number" min="0" step="0.01" {...inp('hra')} style={pt.inp} />
                        </div>
                        <div>
                            <label style={lbl}>DA (₹)</label>
                            <input type="number" min="0" step="0.01" {...inp('da')} style={pt.inp} />
                        </div>
                    </div>
                    {msg && <div style={{ color:'#ef4444', fontSize:13, marginTop:10 }}>{msg}</div>}
                    <div style={{ marginTop:16, display:'flex', gap:10 }}>
                        <button onClick={save} disabled={saving} style={btn('#10b981')}>{saving?'Saving…':'Save Employee'}</button>
                        <button onClick={()=>setModal(false)} style={btn('#64748b')}>Cancel</button>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                        <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Employees</h2>
                        <button onClick={openAdd} style={btn('#10b981')}>+ New Employee</button>
                    </div>
                    <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                        <input placeholder="Search name / code / PAN…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...pt.inp, width:280 }} />
                        <select value={status} onChange={e=>setStatus(e.target.value)} style={{ ...pt.inp, width:150 }}>
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="resigned">Resigned</option>
                        </select>
                    </div>
                    <div style={{ overflowX:'auto' }}>
                        <table style={tableS}><thead><tr style={{ background:pt.colors.inner, color:'#fff' }}>
                            {['Code','Name','Department','Designation','Type','Basic Salary','Status','Actions'].map(h=><th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map((r,i)=>(
                                <tr key={r.id} style={{ background:i%2===0?pt.colors.inner+'11':'#fff' }}>
                                    <td style={tdS}><b style={{ fontFamily:'monospace', color:'#6366f1' }}>{r.employee_code}</b></td>
                                    <td style={tdS}><b>{r.full_name || `${r.first_name} ${r.last_name}`}</b></td>
                                    <td style={tdS}>{r.department_name||'—'}</td>
                                    <td style={tdS}>{r.designation||'—'}</td>
                                    <td style={tdS}><span style={tag('#3b82f6')}>{r.employment_type}</span></td>
                                    <td style={tdS}>{fmt(r.basic_salary)}</td>
                                    <td style={tdS}><span style={tag(STATUS_COLOR[r.status]||'#64748b')}>{r.status}</span></td>
                                    <td style={tdS}><button onClick={()=>openEdit(r)} style={sBtn('#3b82f6')}>Edit</button></td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={8} style={emptyTd}>No employees found</td></tr>}
                        </tbody></table>
                    </div>
                </>
            )}
        </div>
    );
}
