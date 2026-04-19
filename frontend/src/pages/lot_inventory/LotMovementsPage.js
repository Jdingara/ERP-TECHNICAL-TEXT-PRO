// PAGE: Lot Movements — History of all lot transfers and movements
import { useState, useEffect, useCallback } from 'react';

export default function LotMovementsPage() {
    const [rows,   setRows]   = useState([]);
    const [search, setSearch] = useState('');
    const [type,   setType]   = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (type)   p.set('movement_type', type);
        const res = await fetch(`/api/lot-inventory/movements/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.movements || []);
    }, [search, type]);

    useEffect(() => { load(); }, [load]);

    const TYPE_COLOR = {
        received: '#10b981', consumed: '#ef4444', transferred: '#3b82f6',
        adjusted: '#f59e0b', returned: '#8b5cf6',
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Lot Movements</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Complete history of all lot transactions</p>
                </div>
                <button onClick={load} style={btn('#3b82f6')}>↻ Refresh</button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <input placeholder="Search lot number…" value={search}
                    onChange={e => setSearch(e.target.value)} style={searchS} />
                <select value={type} onChange={e => setType(e.target.value)} style={selectS}>
                    <option value="">All Types</option>
                    <option value="received">Received</option>
                    <option value="consumed">Consumed</option>
                    <option value="transferred">Transferred</option>
                    <option value="adjusted">Adjusted</option>
                    <option value="returned">Returned</option>
                </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['Date', 'LOT Number', 'Material', 'Movement Type', 'Qty', 'From Location', 'To Location', 'Reference', 'Remarks'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={tdS}>{r.movement_date || r.created_at?.slice(0, 10)}</td>
                            <td style={tdS}><b style={{ color: '#ec4899' }}>{r.lot_number}</b></td>
                            <td style={tdS}>{r.material_name}</td>
                            <td style={tdS}>
                                <span style={tag(TYPE_COLOR[r.movement_type] || '#64748b')}>{r.movement_type}</span>
                            </td>
                            <td style={tdS}><b>{r.quantity}</b> {r.uom}</td>
                            <td style={tdS}>{r.from_location || '—'}</td>
                            <td style={tdS}>{r.to_location || '—'}</td>
                            <td style={tdS}>{r.reference_number || '—'}</td>
                            <td style={tdS}>{r.remarks || '—'}</td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={9} style={emptyTd}>No movements found</td></tr>}
                </tbody></table>
            </div>
        </div>
    );
}

const btn     = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const tableS  = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thS     = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdS     = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const searchS = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 280, outline: 'none' };
const selectS = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' };
const tag     = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const emptyTd = { textAlign: 'center', padding: 40, color: '#94a3b8' };
