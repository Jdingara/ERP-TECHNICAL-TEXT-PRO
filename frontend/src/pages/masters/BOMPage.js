// PAGE: BOM (Bill of Materials) — lists BOMs, links to ProductDesign
import { useState, useEffect, useCallback } from 'react';

export default function BOMPage() {
    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState(null);

    const load = async () => {
        const res = await fetch('/api/masters/bom/', { credentials:'include' });
        const d = await res.json(); setRows(d.boms||[]);
    };
    useEffect(() => { load(); }, []);

    const view = async (id) => {
        const res = await fetch(`/api/masters/bom/${id}/?include_lines=true`, { credentials:'include' });
        const d = await res.json(); setSelected(d.bom);
    };

    return (
        <div style={{ padding:24 }}>
            <h2 style={{ margin:'0 0 20px', fontSize:22, fontWeight:700 }}>Bill of Materials</h2>
            <p style={{ color:'#64748b', marginBottom:16 }}>
                BOM is created automatically when you add lines to a Product Design. Click View to see materials.
            </p>
            <div style={{ display:'flex', gap:24 }}>
                <div style={{ flex:1 }}>
                    <table style={tableS}><thead><tr style={{ background:'#1e293b', color:'#fff' }}>
                        {['Design Code','Product','Version','Lines','Action'].map(h=><th key={h} style={thS}>{h}</th>)}
                    </tr></thead><tbody>
                        {rows.map((r,i)=>(
                            <tr key={r.id} style={{ background: i%2===0?'#f8fafc':'#fff', cursor:'pointer' }}
                                onClick={()=>view(r.id)}>
                                <td style={tdS}><b>{r.design_code}</b></td>
                                <td style={tdS}>{r.design_name}</td>
                                <td style={tdS}><span style={tag('#14b8a6')}>{r.version}</span></td>
                                <td style={tdS}>{r.line_count} items</td>
                                <td style={tdS}><button style={smallBtn('#3b82f6')} onClick={e=>{e.stopPropagation();view(r.id);}}>View</button></td>
                            </tr>
                        ))}
                        {rows.length===0 && <tr><td colSpan={5} style={{ textAlign:'center',padding:40,color:'#94a3b8' }}>No BOMs. Add items to a Product Design first.</td></tr>}
                    </tbody></table>
                </div>
                {selected && (
                    <div style={{ width:380, background:'#f8fafc', borderRadius:12, padding:20, border:'1px solid #e2e8f0' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                            <b>{selected.design_code} — BOM</b>
                            <button onClick={()=>setSelected(null)} style={smallBtn('#64748b')}>✕</button>
                        </div>
                        <table style={{ ...tableS, fontSize:12 }}><thead><tr style={{ background:'#334155', color:'#fff' }}>
                            {['Material','Type','Qty','UOM','Stage'].map(h=><th key={h} style={{ ...thS, fontSize:11, padding:'6px 10px' }}>{h}</th>)}
                        </tr></thead><tbody>
                            {(selected.lines||[]).map((l,i)=>(
                                <tr key={i} style={{ background: i%2===0?'#fff':'#f1f5f9' }}>
                                    <td style={{ ...tdS, padding:'6px 10px' }}>{l.material_name}</td>
                                    <td style={{ ...tdS, padding:'6px 10px' }}><span style={tag('#6366f1')}>{l.material_type}</span></td>
                                    <td style={{ ...tdS, padding:'6px 10px' }}>{l.quantity}</td>
                                    <td style={{ ...tdS, padding:'6px 10px' }}>{l.uom_name}</td>
                                    <td style={{ ...tdS, padding:'6px 10px' }}>{l.process_name||'—'}</td>
                                </tr>
                            ))}
                            {(!selected.lines||selected.lines.length===0) && <tr><td colSpan={5} style={{ textAlign:'center',padding:20,color:'#94a3b8' }}>No lines</td></tr>}
                        </tbody></table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Shared styles ─────────────────────────────────────────────
const btn      = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const searchS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 280, outline: 'none' };
const selectS  = { padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 };
const tableS   = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thS      = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdS      = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const tag      = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const overlay  = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 };
const mBox     = { background: '#fff', borderRadius: 12, padding: 28, width: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const grid2    = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };
const inpS     = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' };
const F        = ({ label, children }) => (<div><label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:4 }}>{label}</label>{children}</div>);
