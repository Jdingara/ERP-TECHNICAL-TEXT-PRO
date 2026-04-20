// PAGE: Stock Adjustments — Manual qty corrections on lots
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const empty = { lot_id:'', adjustment_qty:'', reason:'', remarks:'' };

export default function StockAdjustmentsPage() {
    const pt = usePageTheme();
    const emptyTd  = { textAlign:'center', padding:40, color: pt.colors.muted };
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const formPage = { ...pt.formPage, maxWidth: 700 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;
    const [rows,   setRows]   = useState([]);
    const [lots,   setLots]   = useState([]);
    const [modal,  setModal]  = useState(false);
    const [form,   setForm]   = useState(empty);
    const [saving, setSaving] = useState(false);
    const [msg,    setMsg]    = useState('');

    const load = useCallback(async () => {
        const res = await fetch('/api/lot-inventory/adjustments/', { credentials:'include' });
        const d = await res.json();
        setRows(d.adjustments||[]);
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/purchase/lots/?status=available', {credentials:'include'})
            .then(r=>r.json()).then(d=>setLots(d.lots||[]));
    }, []);

    const openAdd = () => { setForm(empty); setMsg(''); setModal(true); };

    const save = async () => {
        if (!form.lot_id||!form.adjustment_qty||!form.reason) {
            setMsg('Lot, quantity, and reason are required'); return;
        }
        setSaving(true);
        const res = await fetch('/api/lot-inventory/adjustments/', { method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error||'Error saving adjustment'); }
    };

    const inp = (f) => ({ value:form[f], onChange:e=>setForm(p=>({...p,[f]:e.target.value})) });
    const selectedLot = lots.find(l=>String(l.id)===String(form.lot_id));

    return (
        <div style={{ padding:24 }}>
            {!modal ? (
                <>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                        <div>
                            <h2 style={{ margin:'0 0 4px', fontSize:22, fontWeight:700 }}>Stock Adjustments</h2>
                            <p style={{ margin:0, color: pt.colors.dimText, fontSize:13 }}>Manually correct lot quantities (physical verification, damage, etc.)</p>
                        </div>
                        <button onClick={openAdd} style={btn('#f59e0b')}>+ New Adjustment</button>
                    </div>
                    <div style={{ overflowX:'auto' }}>
                        <table style={tableS}><thead><tr style={{ background: pt.colors.inner, color:'#fff' }}>
                            {['Date','LOT Number','Material','Before Qty','Adjustment','After Qty','Reason','Remarks','Done By'].map(h=>
                                <th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map((r,i)=>(
                                <tr key={r.id} style={{ background:i%2===0?pt.colors.inner:'#fff' }}>
                                    <td style={tdS}>{r.created_at?.slice(0,10)}</td>
                                    <td style={tdS}><b style={{ color:'#ec4899' }}>{r.lot_number}</b></td>
                                    <td style={tdS}>{r.material_name}</td>
                                    <td style={tdS}>{r.before_qty}</td>
                                    <td style={tdS}>
                                        <b style={{ color:Number(r.adjustment_qty)>=0?'#10b981':'#ef4444' }}>
                                            {Number(r.adjustment_qty)>=0?'+':''}{r.adjustment_qty}
                                        </b>
                                    </td>
                                    <td style={tdS}><b>{r.after_qty}</b></td>
                                    <td style={tdS}>{r.reason}</td>
                                    <td style={tdS}>{r.remarks||'—'}</td>
                                    <td style={tdS}>{r.created_by||'—'}</td>
                                </tr>
                            ))}
                            {rows.length===0 && <tr><td colSpan={9} style={emptyTd}>No adjustments yet</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={()=>setModal(false)} style={backBtnS}>← Back to Adjustments</button>
                        <h3 style={{ margin:0, fontSize:20, fontWeight:700 }}>New Stock Adjustment</h3>
                    </div>
                    <F label="Select LOT *">
                        <select style={inpS} {...inp('lot_id')}>
                            <option value="">Choose lot…</option>
                            {lots.map(l=>(
                                <option key={l.id} value={l.id}>
                                    {l.lot_number} — {l.material_name} (Balance: {l.balance_qty})
                                </option>
                            ))}
                        </select>
                    </F>
                    {selectedLot && (
                        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px', margin:'12px 0', fontSize:13 }}>
                            Current balance: <b style={{ color:'#10b981' }}>{selectedLot.balance_qty} {selectedLot.uom}</b>
                        </div>
                    )}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:14 }}>
                        <F label="Adjustment Qty * (use − for decrease)">
                            <input type="number" placeholder="e.g. −5 or +10" style={inpS} {...inp('adjustment_qty')} />
                        </F>
                        <F label="Reason *">
                            <select style={inpS} {...inp('reason')}>
                                <option value="">Select reason…</option>
                                <option value="physical_count">Physical Count Correction</option>
                                <option value="damage">Material Damage</option>
                                <option value="moisture_loss">Moisture Loss</option>
                                <option value="theft">Theft / Loss</option>
                                <option value="return_to_vendor">Return to Vendor</option>
                                <option value="other">Other</option>
                            </select>
                        </F>
                    </div>
                    <div style={{ marginTop:14 }}>
                        <F label="Remarks"><textarea style={{...inpS,height:70,resize:'vertical'}} {...inp('remarks')} /></F>
                    </div>
                    {msg && <div style={{ color:'#ef4444', marginTop:10, fontSize:13 }}>{msg}</div>}
                    <div style={{ display:'flex', gap:10, marginTop:24, justifyContent:'flex-end' }}>
                        <button onClick={()=>setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={save} disabled={saving} style={btn('#f59e0b')}>{saving?'Saving…':'Save Adjustment'}</button>
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
