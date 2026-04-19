import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const ALERT_STYLE = {
    warning: { bg: '#fef3c7', border: '#f59e0b', icon: '⚠️', label: '#92400e' },
    error:   { bg: '#fee2e2', border: '#ef4444', icon: '🔴', label: '#991b1b' },
    info:    { bg: '#dbeafe', border: '#3b82f6', icon: 'ℹ️', label: '#1e40af' },
};

export default function FeedPage() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState('');
    const navigate = useNavigate();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/reports/feed/', { credentials: 'include' });
            setData(await r.json());
            setRefresh(new Date().toLocaleTimeString('en-IN'));
        } catch {}
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const alerts = data?.alerts || [];
    const ds     = data?.daily_summary || {};
    const trend  = (data?.weekly_trend || []).map(d => ({ ...d, output: parseFloat(d.output || 0) }));

    const summaryCards = [
        { label: 'Produced Today',   value: ds.produced_qty    || 0, color: '#10b981', icon: '🏭', link: '/production/entries' },
        { label: 'Rejected Today',   value: ds.rejected_qty    || 0, color: '#ef4444', icon: '❌', link: '/production/entries' },
        { label: 'Yarn Issues',      value: ds.yarn_issues     || 0, color: '#f59e0b', icon: '🧵', link: '/production/yarn-issues' },
        { label: 'Dispatched Today', value: ds.dispatched_count|| 0, color: '#3b82f6', icon: '🚚', link: '/dispatch/entries' },
        { label: 'Inspected Today',  value: ds.inspected_count || 0, color: '#8b5cf6', icon: '🔍', link: '/quality/inspections' },
        { label: 'Passed QC',        value: ds.passed_count    || 0, color: '#10b981', icon: '✅', link: '/quality/inspections' },
        { label: 'Failed QC',        value: ds.failed_count    || 0, color: '#ef4444', icon: '🚫', link: '/quality/inspections' },
    ];

    if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>Loading feed…</div>;

    return (
        <div style={{ padding: 24, maxWidth: 1100 }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius: 12, padding: '20px 28px', marginBottom: 28, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>Daily Feed</div>
                    <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>Live alerts + today's production summary — {ds.date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <button onClick={load} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        ↻ Refresh
                    </button>
                    {refresh && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>Updated: {refresh}</div>}
                </div>
            </div>

            {/* Alerts */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>
                    🔔 Alerts {alerts.length > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: 12, borderRadius: 20, padding: '2px 8px', marginLeft: 8 }}>{alerts.length}</span>}
                </div>
                {alerts.length === 0 ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px', color: '#065f46', fontSize: 14, fontWeight: 600 }}>
                        ✅ All clear — no alerts right now
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {alerts.map((a, i) => {
                            const style = ALERT_STYLE[a.type] || ALERT_STYLE.info;
                            return (
                                <div key={i}
                                    onClick={() => a.link && navigate(a.link)}
                                    style={{ background: style.bg, border: `1px solid ${style.border}`, borderLeft: `4px solid ${style.border}`, borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: a.link ? 'pointer' : 'default' }}>
                                    <span style={{ fontSize: 20 }}>{style.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: style.border, background: `${style.border}20`, padding: '1px 8px', borderRadius: 10, marginRight: 10 }}>{a.category}</span>
                                        <span style={{ fontSize: 13, color: style.label }}>{a.message}</span>
                                    </div>
                                    {a.link && <span style={{ fontSize: 12, color: style.border, fontWeight: 600 }}>→ View</span>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Daily Summary Cards */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>📊 Today's Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                    {summaryCards.map(c => (
                        <div key={c.label}
                            onClick={() => navigate(c.link)}
                            style={{ background: '#fff', border: `1px solid ${c.color}30`, borderTop: `3px solid ${c.color}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', textAlign: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px #0002'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                            <div style={{ fontSize: 22 }}>{c.icon}</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: c.color, margin: '6px 0' }}>{c.value}</div>
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{c.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Weekly Trend */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px #0001' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>📈 7-Day Production Output Trend</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>Confirmed process entry output for the last 7 days</div>
                {trend.every(t => t.output === 0) ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No production recorded in the last 7 days</div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                                formatter={(v) => [v, 'Output Qty']}
                                labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''}
                            />
                            <Bar dataKey="output" fill="#10b981" radius={[4, 4, 0, 0]} name="Output Qty" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
