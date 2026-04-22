// PAGE: Reconciliation Report — Yarn Issued vs Output vs Rejection vs Variance
import { useState, useEffect, useCallback } from 'react';
import { printReport, exportCSV } from '../../utils/reportUtils';

export default function ReconciliationReportPage() {
    const [rows,    setRows]    = useState([]);
    const [fromDate,setFromDate]= useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
    const [toDate,  setToDate]  = useState(new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams({ from_date: fromDate, to_date: toDate });
        const res = await fetch(`/api/reports/reconciliation/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.rows || []);
        setLoading(false);
    }, [fromDate, toDate]);

    useEffect(() => { load(); }, [load]);

    const totals = rows.reduce((acc, r) => ({
        planned:    acc.planned    + Number(r.planned_qty   || 0),
        issued:     acc.issued     + Number(r.issued_qty    || 0),
        output:     acc.output     + Number(r.output_qty    || 0),
        rejection:  acc.rejection  + Number(r.rejection_qty || 0),
        variance:   acc.variance   + Number(r.variance      || 0),
    }), { planned: 0, issued: 0, output: 0, rejection: 0, variance: 0 });

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Reconciliation Report</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
                    Production Order × Yarn Issued → Output → Rejection → Variance
                </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, background: '#f8fafc', borderRadius: 10, padding: '12px 18px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>From:</span>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: '#475569' }}>To:</span>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <button onClick={load} disabled={loading} style={btn('#8b5cf6')}>
                    {loading ? 'Loading…' : '📊 Generate'}
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button onClick={() => printReport({
                        title: 'Reconciliation Report',
                        subtitle: 'Production Order × Yarn Issued → Output → Rejection → Variance',
                        fromDate, toDate,
                        summaryCards: rows.length > 0 ? [
                            { label: 'Total Planned',   val: totals.planned.toFixed(2),   color: '#3b82f6' },
                            { label: 'Total Issued',    val: totals.issued.toFixed(2),    color: '#f97316' },
                            { label: 'Total Output',    val: totals.output.toFixed(2),    color: '#10b981' },
                            { label: 'Total Rejection', val: totals.rejection.toFixed(2), color: '#ef4444' },
                            { label: 'Total Variance',  val: (totals.variance > 0 ? '+' : '') + totals.variance.toFixed(3), color: totals.variance > 0 ? '#f59e0b' : '#10b981' },
                        ] : [],
                        headers: ['Production Order', 'Product', 'Status', 'Planned Qty', 'Yarn Issued', 'Output Qty', 'Rejection', 'Variance'],
                        rows: rows.map(r => [r.prod_order_number, r.product_name, r.status, r.planned_qty, r.issued_qty, r.output_qty, r.rejection_qty, (Number(r.variance || 0) > 0 ? '+' : '') + Number(r.variance || 0).toFixed(3)]),
                        footerRow: rows.length > 0 ? ['TOTAL', '', '', totals.planned.toFixed(2), totals.issued.toFixed(2), totals.output.toFixed(2), totals.rejection.toFixed(2), (totals.variance > 0 ? '+' : '') + totals.variance.toFixed(3)] : null,
                    })} style={btn('#1a237e')}>🖨 Print</button>
                    <button onClick={() => exportCSV({
                        filename: 'Reconciliation_Report',
                        summaryRows: [
                            ['Report', 'Reconciliation Report'],
                            ['Period', `${fromDate} to ${toDate}`],
                            ['Total Planned', totals.planned.toFixed(2)],
                            ['Total Issued', totals.issued.toFixed(2)],
                            ['Total Output', totals.output.toFixed(2)],
                            ['Total Rejection', totals.rejection.toFixed(2)],
                            ['Total Variance', totals.variance.toFixed(3)],
                        ],
                        headers: ['Production Order', 'Product', 'Status', 'Planned Qty', 'Yarn Issued', 'Output Qty', 'Rejection', 'Variance'],
                        rows: rows.map(r => [r.prod_order_number, r.product_name, r.status, r.planned_qty, r.issued_qty, r.output_qty, r.rejection_qty, Number(r.variance || 0).toFixed(3)]),
                    })} style={btn('#10b981')}>⬇ Excel</button>
                </div>
            </div>

            {/* Summary Totals */}
            {rows.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
                    {[
                        { label: 'Total Planned', val: totals.planned.toFixed(2), color: '#3b82f6' },
                        { label: 'Total Issued', val: totals.issued.toFixed(2), color: '#f97316' },
                        { label: 'Total Output', val: totals.output.toFixed(2), color: '#10b981' },
                        { label: 'Total Rejection', val: totals.rejection.toFixed(2), color: '#ef4444' },
                        { label: 'Total Variance', val: totals.variance.toFixed(2), color: totals.variance > 0 ? '#f59e0b' : '#10b981' },
                    ].map(c => (
                        <div key={c.label} style={{ background: '#fff', border: `1px solid ${c.color}25`, borderRadius: 10, padding: '12px 16px' }}>
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{c.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.val}</div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['Production Order', 'Product', 'Status', 'Planned Qty', 'Yarn Issued', 'Output Qty', 'Rejection', 'Variance'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => {
                        const variance = Number(r.variance || 0);
                        return (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                <td style={tdS}><b style={{ color: '#f59e0b' }}>{r.prod_order_number}</b></td>
                                <td style={tdS}>{r.product_name}</td>
                                <td style={tdS}><span style={tag(STATUS_COLOR[r.status] || '#64748b')}>{r.status}</span></td>
                                <td style={tdS}>{r.planned_qty}</td>
                                <td style={tdS}><b style={{ color: '#f97316' }}>{r.issued_qty}</b></td>
                                <td style={tdS}><b style={{ color: '#10b981' }}>{r.output_qty}</b></td>
                                <td style={tdS}><span style={{ color: Number(r.rejection_qty) > 0 ? '#ef4444' : '#94a3b8' }}>{r.rejection_qty}</span></td>
                                <td style={tdS}>
                                    <b style={{ color: variance > 0 ? '#f59e0b' : variance < 0 ? '#ef4444' : '#10b981' }}>
                                        {variance > 0 ? '+' : ''}{variance.toFixed(3)}
                                    </b>
                                </td>
                            </tr>
                        );
                    })}
                    {rows.length === 0 && !loading && (
                        <tr><td colSpan={8} style={emptyTd}>No production orders for this period</td></tr>
                    )}
                </tbody>
                {/* Totals Row */}
                {rows.length > 0 && (
                    <tfoot>
                        <tr style={{ background: '#1e293b', color: '#fff', fontWeight: 700 }}>
                            <td style={{ ...thS, color: '#fff' }} colSpan={3}>TOTAL</td>
                            <td style={{ ...thS, color: '#93c5fd' }}>{totals.planned.toFixed(2)}</td>
                            <td style={{ ...thS, color: '#fdba74' }}>{totals.issued.toFixed(2)}</td>
                            <td style={{ ...thS, color: '#6ee7b7' }}>{totals.output.toFixed(2)}</td>
                            <td style={{ ...thS, color: '#fca5a5' }}>{totals.rejection.toFixed(2)}</td>
                            <td style={{ ...thS, color: totals.variance > 0 ? '#fde68a' : '#6ee7b7' }}>
                                {totals.variance > 0 ? '+' : ''}{totals.variance.toFixed(3)}
                            </td>
                        </tr>
                    </tfoot>
                )}
                </table>
            </div>

            {rows.length > 0 && (
                <div style={{ marginTop: 16, fontSize: 12, color: '#64748b', background: '#f8fafc', borderRadius: 8, padding: '10px 16px' }}>
                    <b>Variance</b> = Yarn Issued − Output − Rejection. Positive variance = unaccounted material. Negative = reporting mismatch.
                </div>
            )}
        </div>
    );
}

const STATUS_COLOR = { draft: '#64748b', released: '#3b82f6', in_progress: '#f59e0b', completed: '#10b981', cancelled: '#ef4444' };
const btn     = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const tableS  = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thS     = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdS     = { padding: '10px 14px', textAlign: 'left', fontSize: 13, borderBottom: '1px solid #f1f5f9' };
const tag     = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const emptyTd = { textAlign: 'center', padding: 40, color: '#94a3b8' };
