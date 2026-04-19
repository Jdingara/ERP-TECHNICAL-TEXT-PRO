// PAGE: Lot Inventory Dashboard
import { useState, useEffect } from 'react';

export default function LotDashboardPage() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/lot-inventory/dashboard/', { credentials: 'include' })
            .then(r => r.json()).then(d => { setData(d); setLoading(false); });
    }, []);

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading dashboard…</div>;

    const summary   = data?.summary   || {};
    const byStatus  = data?.by_status  || [];
    const byLocation = data?.by_location || [];

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Lot Inventory Dashboard</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Live view of all raw material lots</p>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Total Lots', val: summary.total_lots || 0, color: '#3b82f6', icon: '📦' },
                    { label: 'Available', val: summary.available_lots || 0, color: '#10b981', icon: '✅' },
                    { label: 'Partial', val: summary.partial_lots || 0, color: '#f59e0b', icon: '⚡' },
                    { label: 'Consumed', val: summary.consumed_lots || 0, color: '#64748b', icon: '🔲' },
                ].map(c => (
                    <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: `1px solid ${c.color}25`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.val}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{c.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* By Status */}
                <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Stock by Status</h3>
                    {byStatus.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: 13 }}>No data yet</div>
                    ) : byStatus.map(s => {
                        const STATUS_COLORS = { available: '#10b981', partial: '#f59e0b', consumed: '#64748b', blocked: '#ef4444' };
                        const color = STATUS_COLORS[s.status] || '#3b82f6';
                        const pct = summary.total_lots ? Math.round((s.count / summary.total_lots) * 100) : 0;
                        return (
                            <div key={s.status} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{s.status}</span>
                                    <span style={{ color: '#64748b' }}>{s.count} lots ({pct}%)</span>
                                </div>
                                <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* By Location */}
                <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Stock by Location</h3>
                    {byLocation.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: 13 }}>No location data yet</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead><tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                <th style={{ textAlign: 'left', padding: '6px 0', color: '#64748b', fontWeight: 600, fontSize: 11 }}>Location</th>
                                <th style={{ textAlign: 'right', padding: '6px 0', color: '#64748b', fontWeight: 600, fontSize: 11 }}>Lots</th>
                                <th style={{ textAlign: 'right', padding: '6px 0', color: '#64748b', fontWeight: 600, fontSize: 11 }}>Balance Qty</th>
                            </tr></thead>
                            <tbody>
                                {byLocation.map((l, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '8px 0', fontWeight: 600 }}>{l.location_name || 'Unassigned'}</td>
                                        <td style={{ padding: '8px 0', textAlign: 'right', color: '#3b82f6' }}>{l.count}</td>
                                        <td style={{ padding: '8px 0', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{l.total_balance}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Recent Lots */}
            {(data?.recent_lots || []).length > 0 && (
                <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginTop: 20 }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Recently Received Lots</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr style={{ background: '#f8fafc' }}>
                            {['LOT', 'Material', 'Color', 'Received Qty', 'Balance', 'Status', 'Date'].map(h =>
                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#475569' }}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {(data.recent_lots).map((l, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px 12px' }}><b style={{ color: '#ec4899' }}>{l.lot_number}</b></td>
                                    <td style={{ padding: '8px 12px' }}>{l.material_name}</td>
                                    <td style={{ padding: '8px 12px' }}>{l.color_code} {l.color_name}</td>
                                    <td style={{ padding: '8px 12px' }}>{l.received_qty}</td>
                                    <td style={{ padding: '8px 12px', color: '#10b981', fontWeight: 600 }}>{l.balance_qty}</td>
                                    <td style={{ padding: '8px 12px' }}>{l.status}</td>
                                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{l.created_at?.slice(0, 10)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
