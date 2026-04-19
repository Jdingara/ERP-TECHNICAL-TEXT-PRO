// PAGE: Batches — All production batches with QC status
import { useState, useEffect, useCallback } from 'react';

export default function BatchesPage() {
    const [rows,   setRows]   = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [detail, setDetail] = useState(null);

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        if (status) p.set('status', status);
        const res = await fetch(`/api/production/batches/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.batches || []);
    }, [search, status]);

    useEffect(() => { load(); }, [load]);

    const STATUS_COLOR = {
        qc_pending: '#f59e0b', finished: '#10b981', qc_failed: '#ef4444',
        rework: '#8b5cf6', dispatched: '#3b82f6', partial: '#f97316',
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Batches</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>All finished goods batches ready for QC and dispatch</p>
                </div>
                <button onClick={load} style={btn('#3b82f6')}>↻ Refresh</button>
            </div>

            {/* Status Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                    { label: 'QC Pending', key: 'qc_pending', color: '#f59e0b' },
                    { label: 'Finished', key: 'finished', color: '#10b981' },
                    { label: 'QC Failed', key: 'qc_failed', color: '#ef4444' },
                    { label: 'Rework', key: 'rework', color: '#8b5cf6' },
                    { label: 'Dispatched', key: 'dispatched', color: '#3b82f6' },
                ].map(c => (
                    <div key={c.key} onClick={() => setStatus(status === c.key ? '' : c.key)}
                        style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                            border: `2px solid ${status === c.key ? c.color : c.color + '30'}`,
                            transition: 'border-color 0.2s' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>
                            {rows.filter(r => r.status === c.key).length}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{c.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <input placeholder="Search batch number / product…" value={search}
                    onChange={e => setSearch(e.target.value)} style={searchS} />
                <select value={status} onChange={e => setStatus(e.target.value)} style={selectS}>
                    <option value="">All Status</option>
                    <option value="qc_pending">QC Pending</option>
                    <option value="finished">Finished</option>
                    <option value="qc_failed">QC Failed</option>
                    <option value="rework">Rework</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="partial">Partial</option>
                </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['Batch No', 'Product', 'Production Date', 'Total Qty', 'Balance Qty', 'Process Entry', 'Status', 'Action'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={tdS}><b style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => setDetail(r)}>{r.batch_number}</b></td>
                            <td style={tdS}>{r.product_name}</td>
                            <td style={tdS}>{r.production_date}</td>
                            <td style={tdS}>{r.total_qty} {r.uom_name}</td>
                            <td style={tdS}><b style={{ color: r.balance_qty > 0 ? '#10b981' : '#94a3b8' }}>{r.balance_qty}</b></td>
                            <td style={tdS}>{r.process_entry_number || '—'}</td>
                            <td style={tdS}><span style={tag(STATUS_COLOR[r.status] || '#64748b')}>{r.status?.replace('_', ' ')}</span></td>
                            <td style={tdS}>
                                <button onClick={() => setDetail(r)} style={smallBtn('#3b82f6')}>Details</button>
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={8} style={emptyTd}>No batches found</td></tr>}
                </tbody></table>
            </div>

            {detail && (
                <div style={overlay}>
                    <div style={{ ...modalBox, width: 560 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, color: '#3b82f6' }}>Batch — {detail.batch_number}</h3>
                            <button onClick={() => setDetail(null)} style={smallBtn('#64748b')}>✕ Close</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[['Batch Number', detail.batch_number], ['Product', detail.product_name],
                              ['Production Date', detail.production_date], ['Process Entry', detail.process_entry_number || '—'],
                              ['Total Qty', `${detail.total_qty} ${detail.uom_name || ''}`],
                              ['Balance Qty', `${detail.balance_qty} ${detail.uom_name || ''}`],
                              ['Status', detail.status?.replace('_', ' ')],
                              ['Dispatched To', detail.customer_name || 'Not dispatched yet'],
                            ].map(([l, v]) => (
                                <div key={l} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>{l}</div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
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
const searchS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 280, outline: 'none' };
const selectS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' };
const tag      = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const emptyTd  = { textAlign: 'center', padding: 40, color: '#94a3b8' };
