// PAGE: Lot Stock — All lots with live balance quantities
import { useState, useEffect, useCallback } from 'react';

const STATUS_COLORS = {
    available: '#10b981', consumed: '#64748b', partial: '#f59e0b',
    blocked: '#ef4444', transferred: '#8b5cf6',
};

export default function LotStockPage() {
    const [rows,   setRows]   = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [detail, setDetail] = useState(null);

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (status) p.set('status', status);
        const res = await fetch(`/api/purchase/lots/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.lots || []);
    }, [search, status]);

    useEffect(() => { load(); }, [load]);

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Lot Stock</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>All raw material lots with live balance tracking</p>
                </div>
                <button onClick={load} style={btn('#3b82f6')}>↻ Refresh</button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <input placeholder="Search lot number / material / color…" value={search}
                    onChange={e => setSearch(e.target.value)} style={searchS} />
                <select value={status} onChange={e => setStatus(e.target.value)} style={selectS}>
                    <option value="">All Status</option>
                    <option value="available">Available</option>
                    <option value="partial">Partial</option>
                    <option value="consumed">Consumed</option>
                    <option value="blocked">Blocked</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Total Lots', val: rows.length, color: '#3b82f6' },
                    { label: 'Available', val: rows.filter(r => r.status === 'available').length, color: '#10b981' },
                    { label: 'Partial', val: rows.filter(r => r.status === 'partial').length, color: '#f59e0b' },
                    { label: 'Consumed', val: rows.filter(r => r.status === 'consumed').length, color: '#64748b' },
                ].map(c => (
                    <div key={c.label} style={{ background: '#fff', border: `1px solid ${c.color}30`, borderRadius: 10, padding: '14px 18px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.val}</div>
                    </div>
                ))}
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['LOT Number', 'Material', 'Color', 'GRN', 'Received Qty', 'Balance Qty', 'Location', 'Status', 'Received Date', 'Action'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={tdS}><b style={{ color: '#ec4899' }}>{r.lot_number}</b></td>
                            <td style={tdS}>{r.material_name}</td>
                            <td style={tdS}>
                                {r.color_code && <span style={tag('#f59e0b')}>{r.color_code}</span>} {r.color_name}
                            </td>
                            <td style={tdS}>{r.grn_number}</td>
                            <td style={tdS}>{r.received_qty} {r.uom}</td>
                            <td style={tdS}><b style={{ color: r.balance_qty > 0 ? '#10b981' : '#94a3b8' }}>{r.balance_qty} {r.uom}</b></td>
                            <td style={tdS}>{r.location_name || '—'}</td>
                            <td style={tdS}>
                                <span style={tag(STATUS_COLORS[r.status] || '#64748b')}>{r.status}</span>
                            </td>
                            <td style={tdS}>{r.created_at?.slice(0, 10) || '—'}</td>
                            <td style={tdS}>
                                <button onClick={() => setDetail(r)} style={smallBtn('#3b82f6')}>Details</button>
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={10} style={emptyTd}>No lots found</td></tr>}
                </tbody></table>
            </div>

            {/* Detail Modal */}
            {detail && (
                <div style={overlay}>
                    <div style={{ ...modalBox, width: 560 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, color: '#ec4899' }}>Lot Details — {detail.lot_number}</h3>
                            <button onClick={() => setDetail(null)} style={smallBtn('#64748b')}>✕ Close</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            {[
                                ['LOT Number', detail.lot_number],
                                ['GRN Number', detail.grn_number],
                                ['Material', detail.material_name],
                                ['Color', `${detail.color_code || ''} ${detail.color_name || ''}`],
                                ['Vendor', detail.vendor_name],
                                ['Vendor LOT Ref', detail.vendor_lot_ref || '—'],
                                ['Location', detail.location_name || '—'],
                                ['Received Qty', `${detail.received_qty} ${detail.uom}`],
                                ['Balance Qty', `${detail.balance_qty} ${detail.uom}`],
                                ['Status', detail.status],
                            ].map(([label, val]) => (
                                <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{val}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const btn      = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const tableS   = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thS      = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdS      = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const overlay  = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 };
const modalBox = { background: '#fff', borderRadius: 12, padding: 28, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const searchS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 300, outline: 'none' };
const selectS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' };
const tag      = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const emptyTd  = { textAlign: 'center', padding: 40, color: '#94a3b8' };
