// PAGE: QC Dashboard
import { useState, useEffect } from 'react';

export default function QCDashboardPage() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/quality/dashboard/', { credentials: 'include' })
            .then(r => r.json()).then(d => { setData(d); setLoading(false); });
    }, []);

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading QC dashboard…</div>;

    const kpi       = data?.kpi        || {};
    const pending   = data?.pending_batches || [];
    const defects   = data?.top_defects    || [];

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Quality Control Dashboard</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Today's QC summary and pending inspections</p>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Pending Inspections', val: kpi.pending_count || 0, color: '#f59e0b', icon: '⏳' },
                    { label: 'Passed Today', val: kpi.passed_today || 0, color: '#10b981', icon: '✅' },
                    { label: 'Failed Today', val: kpi.failed_today || 0, color: '#ef4444', icon: '❌' },
                    { label: 'Month Rejection %', val: `${kpi.month_rejection_pct || 0}%`, color: '#8b5cf6', icon: '📊' },
                ].map(c => (
                    <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px',
                        border: `1px solid ${c.color}25`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.val}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{c.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
                {/* Pending Inspections */}
                <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#f59e0b' }}>
                        ⏳ Batches Pending QC ({pending.length})
                    </h3>
                    {pending.length === 0 ? (
                        <div style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>✅ All batches inspected!</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead><tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                <th style={mth}>Batch No</th>
                                <th style={mth}>Product</th>
                                <th style={mth}>Qty</th>
                                <th style={mth}>Date</th>
                            </tr></thead>
                            <tbody>
                                {pending.map((b, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={mtd}><b style={{ color: '#3b82f6' }}>{b.batch_number}</b></td>
                                        <td style={mtd}>{b.product_name}</td>
                                        <td style={mtd}>{b.total_qty}</td>
                                        <td style={mtd}>{b.production_date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Top Defects */}
                <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#ef4444' }}>
                        🔴 Top Defects (This Month)
                    </h3>
                    {defects.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: 13 }}>No defects recorded this month</div>
                    ) : defects.map((d, i) => {
                        const maxCount = defects[0]?.total_count || 1;
                        const pct = Math.round((d.total_count / maxCount) * 100);
                        return (
                            <div key={i} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                                    <span style={{ fontWeight: 600 }}>{d.defect_name}</span>
                                    <span style={{ color: '#64748b' }}>{d.total_count} nos</span>
                                </div>
                                <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: '#ef4444', borderRadius: 4 }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Month Trend */}
            {(data?.month_trend || []).length > 0 && (
                <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginTop: 20 }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>This Month — Inspection Results</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr style={{ background: '#f8fafc' }}>
                            {['Date', 'Total Inspected', 'Passed', 'Failed', 'Rework', 'Pass Rate'].map(h =>
                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#475569' }}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {data.month_trend.map((t, i) => {
                                const passRate = t.total > 0 ? Math.round((t.passed / t.total) * 100) : 0;
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px 12px' }}>{t.date}</td>
                                        <td style={{ padding: '8px 12px' }}>{t.total}</td>
                                        <td style={{ padding: '8px 12px', color: '#10b981', fontWeight: 600 }}>{t.passed}</td>
                                        <td style={{ padding: '8px 12px', color: '#ef4444', fontWeight: 600 }}>{t.failed}</td>
                                        <td style={{ padding: '8px 12px', color: '#8b5cf6' }}>{t.rework}</td>
                                        <td style={{ padding: '8px 12px' }}>
                                            <span style={{ color: passRate >= 95 ? '#10b981' : passRate >= 85 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                                                {passRate}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const mth = { padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#475569' };
const mtd = { padding: '8px 10px', verticalAlign: 'middle' };
