// PAGE: Quality Report (mapped to /reports/quality in App.js)
import { useState, useEffect, useCallback } from 'react';
import { printReport, exportCSV } from '../../utils/reportUtils';

export default function SalesReportPage() {
    const [rows,    setRows]    = useState([]);
    const [summary, setSummary] = useState({});
    const [fromDate,setFromDate]= useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
    const [toDate,  setToDate]  = useState(new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams({ from_date: fromDate, to_date: toDate });
        const res = await fetch(`/api/reports/quality/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.inspections || []);
        setSummary(d.summary || {});
        setLoading(false);
    }, [fromDate, toDate]);

    useEffect(() => { load(); }, [load]);

    const RESULT_COLOR = { pass: '#10b981', fail: '#ef4444', rework: '#8b5cf6', conditional_pass: '#f59e0b' };

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Quality Report</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Inspection results, rejection rates, and defect analysis</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, background: '#f8fafc', borderRadius: 10, padding: '12px 18px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>From:</span>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>To:</span>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <button onClick={load} disabled={loading} style={btn('#10b981')}>
                    {loading ? 'Loading…' : '📊 Generate'}
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button onClick={() => printReport({
                        title: 'Quality Report',
                        subtitle: 'Inspection results, rejection rates and defect analysis',
                        fromDate, toDate,
                        summaryCards: [
                            { label: 'Total Inspected', val: summary.total_inspected || 0, color: '#3b82f6' },
                            { label: 'Passed',          val: summary.passed          || 0, color: '#10b981' },
                            { label: 'Failed',          val: summary.failed          || 0, color: '#ef4444' },
                            { label: 'Rework',          val: summary.rework          || 0, color: '#8b5cf6' },
                            { label: 'Pass Rate',       val: `${summary.pass_rate    || 0}%`, color: '#f59e0b' },
                        ],
                        headers: ['Date', 'Batch', 'Product', 'Inspector', 'Result', 'Defect Type', 'Defect Count', 'Remarks'],
                        rows: rows.map(r => [r.inspection_date, r.batch_number, r.product_name, r.inspector || '—', (r.result || '').replace('_', ' '), r.defect_name || '—', r.defect_count || '—', r.remarks || '']),
                    })} style={btn('#1a237e')}>🖨 Print</button>
                    <button onClick={() => exportCSV({
                        filename: 'Quality_Report',
                        summaryRows: [
                            ['Report', 'Quality Report'],
                            ['Period', `${fromDate} to ${toDate}`],
                            ['Total Inspected', summary.total_inspected || 0],
                            ['Passed', summary.passed || 0],
                            ['Failed', summary.failed || 0],
                            ['Rework', summary.rework || 0],
                            ['Pass Rate', `${summary.pass_rate || 0}%`],
                        ],
                        headers: ['Date', 'Batch', 'Product', 'Inspector', 'Result', 'Defect Type', 'Defect Count', 'Remarks'],
                        rows: rows.map(r => [r.inspection_date, r.batch_number, r.product_name, r.inspector || '', (r.result || '').replace('_', ' '), r.defect_name || '', r.defect_count || '', r.remarks || '']),
                    })} style={btn('#10b981')}>⬇ Excel</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Total Inspected', val: summary.total_inspected || 0, color: '#3b82f6' },
                    { label: 'Passed', val: summary.passed || 0, color: '#10b981' },
                    { label: 'Failed', val: summary.failed || 0, color: '#ef4444' },
                    { label: 'Rework', val: summary.rework || 0, color: '#8b5cf6' },
                    { label: 'Pass Rate', val: `${summary.pass_rate || 0}%`, color: '#f59e0b' },
                ].map(c => (
                    <div key={c.label} style={{ background: '#fff', border: `1px solid ${c.color}25`, borderRadius: 10, padding: '14px 18px' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.val}</div>
                    </div>
                ))}
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['Date', 'Batch', 'Product', 'Inspector', 'Result', 'Defect Type', 'Defect Count', 'Remarks'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={tdS}>{r.inspection_date}</td>
                            <td style={tdS}><b style={{ color: '#3b82f6' }}>{r.batch_number}</b></td>
                            <td style={tdS}>{r.product_name}</td>
                            <td style={tdS}>{r.inspector || '—'}</td>
                            <td style={tdS}><span style={tag(RESULT_COLOR[r.result] || '#64748b')}>{r.result?.replace('_', ' ')}</span></td>
                            <td style={tdS}>{r.defect_name || '—'}</td>
                            <td style={tdS}>{r.defect_count || '—'}</td>
                            <td style={tdS}>{r.remarks || '—'}</td>
                        </tr>
                    ))}
                    {rows.length === 0 && !loading && <tr><td colSpan={8} style={emptyTd}>No inspections for this period</td></tr>}
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
