// PAGE: Company Settings — Financial Year, Module Flags, TAN/CIN
import { useState, useEffect } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const btn  = c => ({ background:c, color:'#fff', border:'none', padding:'8px 20px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 });
const card = { background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', padding:'24px', marginBottom:20 };
const sec  = { fontSize:15, fontWeight:700, marginBottom:16, color:'#334155', borderBottom:'1px solid #f1f5f9', paddingBottom:8 };
const lbl  = { display:'block', fontSize:12, fontWeight:600, marginBottom:4, color:'#64748b' };
const row  = { marginBottom:14 };
const toggleRow = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f8fafc' };
const toggleLbl = { fontSize:13, fontWeight:500, color:'#334155' };

function Toggle({ checked, onChange, color='#10b981' }) {
    return (
        <div onClick={onChange} style={{ width:44, height:24, borderRadius:12, background:checked?color:'#cbd5e1', cursor:'pointer', position:'relative', transition:'background 0.2s' }}>
            <div style={{ width:20, height:20, borderRadius:10, background:'#fff', position:'absolute', top:2, left:checked?22:2, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
        </div>
    );
}

const defaultSettings = {
    fy_start_month: 4,
    tan_number: '', cin_number: '', msme_number: '', udyam_number: '', esic_code: '', pf_establishment: '',
    module_gst: true, module_tds: true, module_tcs: false, module_payroll: true,
    module_banking: true, module_budget: false, module_fixed_assets: false, module_multi_currency: false,
    default_currency: 'INR',
};

export default function CompanySettingsPage() {
    const pt = usePageTheme();
    const [form,    setForm]    = useState(defaultSettings);
    const [msg,     setMsg]     = useState('');
    const [success, setSuccess] = useState(false);
    const [saving,  setSaving]  = useState(false);

    useEffect(() => {
        fetch('/api/finance/company-settings/', {credentials:'include'}).then(r=>r.json()).then(d=>{
            if (d.settings) setForm(prev => ({ ...prev, ...d.settings }));
        });
    }, []);

    const save = async () => {
        setSaving(true); setMsg(''); setSuccess(false);
        const r = await fetch('/api/finance/company-settings/', { method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (r.ok) { setSuccess(true); setTimeout(()=>setSuccess(false), 3000); }
        else { const d = await r.json(); setMsg(d.error || 'Error saving settings'); }
    };

    const inp  = (f) => ({ value:form[f]||'', onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });
    const tog  = (f) => () => setForm(p=>({...p,[f]:!p[f]}));

    const FY_OPTIONS = [
        { value:4,  label:'April – March (India Standard)' },
        { value:1,  label:'January – December (Calendar Year)' },
        { value:7,  label:'July – June' },
        { value:10, label:'October – September' },
    ];

    const MODULES = [
        { key:'module_gst',           label:'GST (CGST/SGST/IGST)',          desc:'GST ledger, GSTR-1/3B, HSN/SAC codes' },
        { key:'module_tds',           label:'TDS (Tax Deducted at Source)',   desc:'Sections 192/194C/194A/194I/194J, 26Q/24Q returns' },
        { key:'module_tcs',           label:'TCS (Tax Collected at Source)',  desc:'Section 206C, Form 27EQ' },
        { key:'module_payroll',       label:'HR & Payroll',                  desc:'Employees, PF, ESI, Professional Tax, payslips' },
        { key:'module_banking',       label:'Banking',                       desc:'Bank accounts, cheques, reconciliation' },
        { key:'module_budget',        label:'Budget & Cost Control',         desc:'Budget lines, variance reports' },
        { key:'module_fixed_assets',  label:'Fixed Assets',                  desc:'Asset register, depreciation' },
        { key:'module_multi_currency',label:'Multi Currency',                desc:'Foreign exchange, USD/EUR invoices' },
    ];

    return (
        <div style={{ padding:24, maxWidth:800 }}>
            <h2 style={{ margin:'0 0 20px', fontSize:22, fontWeight:700 }}>Company Settings</h2>

            {/* Financial Year */}
            <div style={card}>
                <div style={sec}>Financial Year</div>
                <div style={row}>
                    <label style={lbl}>Financial Year Start Month</label>
                    <select value={form.fy_start_month} onChange={e=>setForm(p=>({...p,fy_start_month:parseInt(e.target.value)}))} style={{ ...pt.inp, maxWidth:320 }}>
                        {FY_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                        This determines how Fiscal Years and Accounting Periods are created.
                    </div>
                </div>
                <div style={row}>
                    <label style={lbl}>Default Currency</label>
                    <select value={form.default_currency} onChange={e=>setForm(p=>({...p,default_currency:e.target.value}))} style={{ ...pt.inp, maxWidth:200 }}>
                        <option value="INR">INR — Indian Rupee</option>
                        <option value="USD">USD — US Dollar</option>
                        <option value="EUR">EUR — Euro</option>
                        <option value="GBP">GBP — British Pound</option>
                    </select>
                </div>
            </div>

            {/* India Tax Registration */}
            <div style={card}>
                <div style={sec}>India Tax Registration Numbers</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    {[
                        ['tan_number','TAN (Tax Deduction Account No.)','BLRS12345A'],
                        ['cin_number','CIN (Company Identification No.)','U74999TN2020PTC123456'],
                        ['msme_number','MSME Registration No.',''],
                        ['udyam_number','Udyam Registration No.','UDYAM-TN-00-0000001'],
                        ['esic_code','ESIC Establishment Code',''],
                        ['pf_establishment','PF Establishment Code / EPFO No.',''],
                    ].map(([f,label,placeholder])=>(
                        <div key={f} style={row}>
                            <label style={lbl}>{label}</label>
                            <input {...inp(f)} placeholder={placeholder} style={pt.inp} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Module Flags */}
            <div style={card}>
                <div style={sec}>Module Feature Flags</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginBottom:14 }}>
                    Disabled modules hide their menu items and skip their validations. Existing data is preserved.
                </div>
                {MODULES.map(m=>(
                    <div key={m.key} style={toggleRow}>
                        <div>
                            <div style={toggleLbl}>{m.label}</div>
                            <div style={{ fontSize:11, color:'#94a3b8' }}>{m.desc}</div>
                        </div>
                        <Toggle checked={form[m.key]||false} onChange={tog(m.key)} color={form[m.key]?'#10b981':'#cbd5e1'} />
                    </div>
                ))}
            </div>

            {msg && <div style={{ color:'#ef4444', marginBottom:12, fontSize:13 }}>{msg}</div>}
            {success && <div style={{ color:'#10b981', marginBottom:12, fontSize:13, fontWeight:600 }}>✓ Settings saved successfully</div>}
            <button onClick={save} disabled={saving} style={btn('#6366f1')}>{saving?'Saving…':'Save Settings'}</button>
        </div>
    );
}
