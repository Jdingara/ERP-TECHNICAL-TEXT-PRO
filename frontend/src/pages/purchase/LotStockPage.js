// PAGE: Lot Stock — All lots with live balance quantities
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const STATUS_COLORS = {
    available:'#10b981', consumed:'#64748b', partial:'#f59e0b',
    blocked:'#ef4444', transferred:'#8b5cf6',
};

export default function LotStockPage() {
    const pt = usePageTheme();
    const emptyTd  = { textAlign:'center', padding:40, color: pt.colors.muted };
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const searchS  = { ...pt.inp, width: 300, outline: 'none' };
    const selectS  = { ...pt.inp, width: 'auto' };
    const formPage = { ...pt.formPage, maxWidth: 900 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;
    const [rows,   setRows]   = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [detail, setDetail] = useState(null);

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (status) p.set('status', status);
        const res = await fetch(`/api/purchase/lots/?${p}`, { credentials:'include' });
        const d = await res.json();
        setRows(d.lots||[]);
    }, [search, status]);

    useEffect(() => { load(); }, [load]);

    return (
        <div style={{ padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div>
                    <h2 style={{ margin:'0 0 4px', fontSize:22, fontWeight:700 }}>Lot Stock</h2>
                    <p style={{ margin:0, color: pt.colors.dimText, fontSize:13 }}>All raw material lots with live balance tracking</p>
                </div>
                <button onClick={load} style={btn('#3b82f6')}>↻ Refresh</button>
            </div>

            <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
                <input placeholder="Search lot number / material / color…" value={search}
                    onChange={e=>setSearch(e.target.value)} style={searchS} />
                <select value={status} onChange={e=>setStatus(e.target.value)} style={selectS}>
                    <option value="">All Status</option>
                    <option value="available">Available</option>
                    <option value="partial">Partial</option>
                    <option value="consumed">Consumed</option>
                    <option value="blocked">Blocked</option>
                </select>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
                {[
                    { label:'Total Lots', val:rows.length, color:'#3b82f6' },
                    { label:'Available', val:rows.filter(r=>r.status==='available').length, color:'#10b981' },
                    { label:'Partial', val:rows.filter(r=>r.status==='partial').length, color:'#f59e0b' },
                    { label:'Consumed', val:rows.filter(r=>r.status==='consumed').length, color: pt.colors.dimText },
                ].map(c=>(
                    <div key={c.label} style={{ background: pt.colors.card, border:`1px solid ${c.color}30`, borderRadius:10, padding:'14px 18px' }}>
                        <div style={{ fontSize:11, color: pt.colors.dimText, marginBottom:4 }}>{c.label}</div>
                        <div style={{ fontSize:28, fontWeight:700, color:c.color }}>{c.val}</div>
                    </div>
                ))}
            </div>

            <div style={{ overflowX:'auto' }}>
                <table style={tableS}><thead><tr style={{ background: pt.colors.inner, color:'#fff' }}>
                    {['LOT Number','Material','Color','GRN','Received Qty','Balance Qty','Location','Status','Received Date','Action'].map(h=>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r,i)=>(
                        <tr key={r.id} style={{ background:i%2===0?pt.colors.inner:'#fff' }}>
                            <td style={tdS}><b style={{ color:'#ec4899' }}>{r.lot_number}</b></td>
                            <td style={tdS}>{r.material_name}</td>
                            <td style={tdS}>{r.color_code&&<span style={tag('#f59e0b')}>{r.color_code}</span>} {r.color_name}</td>
                            <td style={tdS}>{r.grn_number}</td>
                            <td style={tdS}>{r.received_qty} {r.uom}</td>
                            <td style={tdS}><b style={{ color:r.balance_qty>0?'#10b981':'#94a3b8' }}>{r.balance_qty} {r.uom}</b></td>
                            <td style={tdS}>{r.location_name||'—'}</td>
                            <td style={tdS}><span style={tag(STATUS_COLORS[r.status]||'#64748b')}>{r.status}</span></td>
                            <td style={tdS}>{r.created_at?.slice(0,10)||'—'}</td>
                            <td style={tdS}><button onClick={()=>setDetail(detail?.id===r.id?null:r)} style={smallBtn('#3b82f6')}>Details</button></td>
                        </tr>
                    ))}
                    {rows.length===0 && <tr><td colSpan={10} style={emptyTd}>No lots found</td></tr>}
                </tbody></table>
            </div>

            {detail && (
                <div style={{ marginTop:24, background: pt.colors.inner, border: `1px solid ${pt.colors.border}`, borderRadius:12, padding:24, maxWidth:700 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                        <h3 style={{ margin:0, color:'#ec4899', fontSize:16 }}>Lot Details — {detail.lot_number}</h3>
                        <button onClick={()=>setDetail(null)} style={smallBtn('#64748b')}>✕ Close</button>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                        {[
                            ['LOT Number',detail.lot_number],['GRN Number',detail.grn_number],
                            ['Material',detail.material_name],['Color',`${detail.color_code||''} ${detail.color_name||''}`],
                            ['Vendor',detail.vendor_name],['Vendor LOT Ref',detail.vendor_lot_ref||'—'],
                            ['Location',detail.location_name||'—'],['Received Qty',`${detail.received_qty} ${detail.uom}`],
                            ['Balance Qty',`${detail.balance_qty} ${detail.uom}`],['Status',detail.status],
                        ].map(([label,val])=>(
                            <div key={label} style={{ background: pt.colors.card, borderRadius:8, padding:'10px 14px', border:'1px solid #f1f5f9' }}>
                                <div style={{ fontSize:11, color: pt.colors.dimText, marginBottom:4 }}>{label}</div>
                                <div style={{ fontWeight:600, fontSize:13 }}>{val}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const btn      = (bg) => ({ padding:'8px 18px', background:bg, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 });
const smallBtn = (bg) => ({ padding:'4px 10px', background:bg, color:'#fff', border:'none', borderRadius:5, cursor:'pointer', fontSize:12, marginRight:4 });
const tableS   = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const tag      = (bg) => ({ display:'inline-block', padding:'2px 8px', borderRadius:12, background:`${bg}20`, color:bg, fontSize:11, fontWeight:600 });
