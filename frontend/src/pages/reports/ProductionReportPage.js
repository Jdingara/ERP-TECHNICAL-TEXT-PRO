// PAGE: Production Report — process entries, output, rejection analysis
import { useState, useEffect, useCallback } from 'react';
import { printReport, exportCSV } from '../../utils/reportUtils';

export default function ProductionReportPage() {
    const [rows,    setRows]    = useState([]);
    const [summary, setSummary] = useState({});
    const [fromDate,setFromDate]= useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
    const [toDate,  setToDate]  = useState(new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams({ from_date: fromDate, to_date: toDate });
        const res = await fetch(`/api/reports/production/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.entries || []);
        setSummary(d.summary || {});
        setLoading(false);
    }, [fromDate, toDate]);

    useEffect(() => { load(); }, [load]);

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Production Report</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Process entries, output quantities, and rejection analysis</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, background: '#f8fafc', borderRadius: 10, padding: '12px 18px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>From:</span>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>To:</span>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <button onClick={load} disabled={loading} style={btn('#f97316')}>
                    {loading ? 'Loading…' : '📊 Generate'}
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button onClick={() => printReport({
                        title: 'Production Report',
                        subtitle: 'Process entries, output quantities and rejection analysis',
                        fromDate, toDate,
                        summaryCards: [
                            { label: 'Total Entries',    val: summary.total_entries  || 0, color: '#3b82f6' },
                            { label: 'Total Output',     val: summary.total_output   || 0, color: '#10b981' },
                            { label: 'Total Rejection',  val: summary.total_rejection|| 0, color: '#ef4444' },
                            { label: 'Rejection %',      val: `${summary.rejection_pct || 0}%`, color: '#f59e0b' },
                        ],
                        headers: ['Entry No', 'Date', 'Prod. Order', 'Process', 'Machine', 'Operator', 'Shift', 'Output Qty', 'Rejection', 'Batch'],
                        rows: rows.map(r => [r.process_entry_number, r.entry_date, r.prod_order_number || '—', r.process_name || '—', r.machine_code, r.operator || '—', r.shift, r.output_qty, r.rejection_qty || 0, r.batch_number || '—']),
                    })} style={btn('#1a237e')}>🖨 Print</button>
                    <button onClick={() => exportCSV({
                        filename: 'Production_Report',
                        summaryRows: [
                            ['Report', 'Production Report'],
                            ['Period', `${fromDate} to ${toDate}`],
                            ['Total Entries', summary.total_entries || 0],
                            ['Total Output', summary.total_output || 0],
                            ['Total Rejection', summary.total_rejection || 0],
                            ['Rejection %', `${summary.rejection_pct || 0}%`],
                        ],
                        headers: ['Entry No', 'Date', 'Prod. Order', 'Process', 'Machine', 'Operator', 'Shift', 'Output Qty', 'Rejection', 'Batch'],
                        rows: rows.map(r => [r.process_entry_number, r.entry_date, r.prod_order_number || '', r.process_name || '', r.machine_code, r.operator || '', r.shift, r.output_qty, r.rejection_qty || 0, r.batch_number || '']),
                    })} style={btn('#10b981')}>⬇ Excel</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Total Entries', val: summary.total_entries || 0, color: '#3b82f6' },
                    { label: 'Total Output', val: summary.total_output || 0, color: '#10b981' },
                    { label: 'Total Rejection', val: summary.total_rejection || 0, color: '#ef4444' },
                    { label: 'Rejection %', val: `${summary.rejection_pct || 0}%`, color: '#f59e0b' },
                ].map(c => (
                    <div key={c.label} style={{ background: '#fff', border: `1px solid ${c.color}25`, borderRadius: 10, padding: '14px 18px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: c.color }}>{c.val}</div>
                    </div>
                ))}
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['Entry No', 'Date', 'Prod. Order', 'Process', 'Machine', 'Operator', 'Shift', 'Output Qty', 'Rejection', 'Batch'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={tdS}><b style={{ color: '#f97316' }}>{r.process_entry_number}</b></td>
                            <td style={tdS}>{r.entry_date}</td>
                            <td style={tdS}>{r.prod_order_number || '—'}</td>
                            <td style={tdS}>{r.process_name || '—'}</td>
                            <td style={tdS}>{r.machine_code}</td>
                            <td style={tdS}>{r.operator || '—'}</td>
                            <td style={tdS}>{r.shift}</td>
                            <td style={tdS}><b style={{ color: '#10b981' }}>{r.output_qty}</b></td>
                            <td style={tdS}><span style={{ color: r.rejection_qty > 0 ? '#ef4444' : '#94a3b8' }}>{r.rejection_qty || 0}</span></td>
                            <td style={tdS}>{r.batch_number || '—'}</td>
                        </tr>
                    ))}
                    {rows.length === 0 && !loading && <tr><td colSpan={10} style={emptyTd}>No production entries for this period</td></tr>}
                </tbody></table>
            </div>
        </div>
    );
}

const btn     = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const tableS  = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thS     = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdS     = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const emptyTd = { textAlign: 'center', padding: 40, color: '#94a3b8' };
