// PAGE: Inventory Report — Lot stock levels and movement summary
import { useState, useEffect, useCallback } from 'react';
import { printReport, exportCSV } from '../../utils/reportUtils';

export default function InventoryReportPage() {
    const [rows,    setRows]    = useState([]);
    const [summary, setSummary] = useState({});
    const [status,  setStatus]  = useState('');
    const [search,  setSearch]  = useState('');
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams();
        if (status) p.set('status', status);
        if (search) p.set('search', search);
        const res = await fetch(`/api/reports/lot-stock/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.lots || []);
        setSummary(d.summary || {});
        setLoading(false);
    }, [status, search]);

    useEffect(() => { load(); }, [load]);

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Lot Stock Report</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Current lot inventory with balance quantities</p>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24, background: '#f8fafc', borderRadius: 10, padding: '12px 18px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input placeholder="Search lot / material…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, width: 240 }} />
                <select value={status} onChange={e => setStatus(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                    <option value="">All Status</option>
                    <option value="available">Available</option>
                    <option value="partial">Partial</option>
                    <option value="consumed">Consumed</option>
                </select>
                <button onClick={load} disabled={loading} style={btn('#3b82f6')}>
                    {loading ? 'Loading…' : '📊 Generate'}
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button onClick={() => printReport({
                        title: 'Lot Stock Report',
                        subtitle: 'Current lot inventory with balance quantities',
                        summaryCards: [
                            { label: 'Total Lots',         val: summary.total_lots      || 0, color: '#3b82f6' },
                            { label: 'Available Lots',     val: summary.available_lots  || 0, color: '#10b981' },
                            { label: 'Total Received Qty', val: summary.total_received  || 0, color: '#f97316' },
                            { label: 'Total Balance Qty',  val: summary.total_balance   || 0, color: '#8b5cf6' },
                        ],
                        headers: ['LOT Number', 'Material', 'Color', 'Vendor', 'GRN', 'Received Qty', 'Balance Qty', 'Location', 'Status'],
                        rows: rows.map(r => [r.lot_number, r.material_name, `${r.color_code || ''} ${r.color_name || ''}`.trim() || '—', r.vendor_name, r.grn_number, `${r.received_qty} ${r.uom}`, r.balance_qty, r.location_name || '—', r.status]),
                    })} style={btn('#1a237e')}>🖨 Print</button>
                    <button onClick={() => exportCSV({
                        filename: 'Lot_Stock_Report',
                        summaryRows: [
                            ['Report', 'Lot Stock Report'],
                            ['Generated', new Date().toLocaleDateString('en-IN')],
                            ['Total Lots', summary.total_lots || 0],
                            ['Available Lots', summary.available_lots || 0],
                            ['Total Received Qty', summary.total_received || 0],
                            ['Total Balance Qty', summary.total_balance || 0],
                        ],
                        headers: ['LOT Number', 'Material', 'Color Code', 'Color Name', 'Vendor', 'GRN', 'Received Qty', 'UOM', 'Balance Qty', 'Location', 'Status'],
                        rows: rows.map(r => [r.lot_number, r.material_name, r.color_code || '', r.color_name || '', r.vendor_name, r.grn_number, r.received_qty, r.uom, r.balance_qty, r.location_name || '', r.status]),
                    })} style={btn('#10b981')}>⬇ Excel</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Total Lots', val: summary.total_lots || 0, color: '#3b82f6' },
                    { label: 'Available Lots', val: summary.available_lots || 0, color: '#10b981' },
                    { label: 'Total Received Qty', val: summary.total_received || 0, color: '#f97316' },
                    { label: 'Total Balance Qty', val: summary.total_balance || 0, color: '#8b5cf6' },
                ].map(c => (
                    <div key={c.label} style={{ background: '#fff', border: `1px solid ${c.color}25`, borderRadius: 10, padding: '14px 18px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: c.color }}>{c.val}</div>
                    </div>
                ))}
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['LOT Number', 'Material', 'Color', 'Vendor', 'GRN', 'Received Qty', 'Balance Qty', 'Location', 'Status'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => {
                        const STATUS_COLORS = { available: '#10b981', partial: '#f59e0b', consumed: '#64748b' };
                        return (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                <td style={tdS}><b style={{ color: '#ec4899' }}>{r.lot_number}</b></td>
                                <td style={tdS}>{r.material_name}</td>
                                <td style={tdS}>{r.color_code} {r.color_name}</td>
                                <td style={tdS}>{r.vendor_name}</td>
                                <td style={tdS}>{r.grn_number}</td>
                                <td style={tdS}>{r.received_qty} {r.uom}</td>
                                <td style={tdS}><b style={{ color: r.balance_qty > 0 ? '#10b981' : '#94a3b8' }}>{r.balance_qty}</b></td>
                                <td style={tdS}>{r.location_name || '—'}</td>
                                <td style={tdS}><span style={tag(STATUS_COLORS[r.status] || '#64748b')}>{r.status}</span></td>
                            </tr>
                        );
                    })}
                    {rows.length === 0 && !loading && <tr><td colSpan={9} style={emptyTd}>No lot records found</td></tr>}
                </tbody></table>
            </div>
        </div>
    );
}

const btn     = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const tableS  = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thS     = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdS     = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const tag     = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const emptyTd = { textAlign: 'center', padding: 40, color: '#94a3b8' };
