// PAGE: Dashboard — Buying House ERP
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTheme } from '../../hooks/usePageTheme';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const CO_STATUS_COLORS = {
    draft: '#94a3b8', confirmed: '#3b82f6', in_production: '#f59e0b',
    inspected: '#8b5cf6', shipped: '#06b6d4', delivered: '#10b981', cancelled: '#94a3b8',
};
const PD_STATUS_COLORS = {
    draft: '#94a3b8', open: '#3b82f6', vendor_assigned: '#f59e0b',
    sample_in_progress: '#f97316', sample_received: '#8b5cf6',
    testing: '#06b6d4', approved: '#10b981', rejected: '#ef4444', cancelled: '#94a3b8',
};

export default function DashboardPage() {
    const pt  = usePageTheme();
    const nav = useNavigate();
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const res  = await fetch('/api/finance/dashboard/', { credentials: 'include' });
            const json = await res.json();
            setData(json);
            setRefresh(new Date().toLocaleTimeString());
        } catch { /* silent — show empty */ }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const card = pt.colors.card;
    const border = pt.colors.border || '#e2e8f0';
    const text   = pt.colors.text;
    const dim    = pt.colors.dimText;
    const muted  = pt.colors.muted;

    if (loading) return <div style={{ textAlign: 'center', padding: 80, color: dim, fontSize: 15 }}>Loading dashboard…</div>;

    const d = data || {};
    const pd  = d.pd  || {};
    const co  = d.co  || {};
    const fo  = d.fo  || {};
    const shp = d.shipment || {};
    const psi = d.psi || {};
    const fin = d.finance || {};

    const kpis = [
        { label: 'Active PD Requests',  value: pd.active || 0,              color: '#8b5cf6', icon: '🔬', link: '/product-development',           sub: `${pd.total || 0} total` },
        { label: 'Customer Orders',      value: co.total || 0,               color: '#10b981', icon: '📋', link: '/orders/co',                     sub: `${(co.by_status || {}).confirmed || 0} confirmed` },
        { label: 'In Production',        value: (co.by_status || {}).in_production || 0, color: '#f59e0b', icon: '🏭', link: '/orders/co',         sub: 'COs in factory' },
        { label: 'Factory Orders',       value: fo.total || 0,               color: '#f97316', icon: '📦', link: '/orders/co',                     sub: `${(fo.by_status || {}).confirmed || 0} confirmed` },
        { label: 'Shipments In Transit', value: shp.in_transit || 0,         color: '#06b6d4', icon: '🚢', link: '/shipment/shipments',            sub: `${shp.due_in_30_days || 0} arriving ≤30 days` },
        { label: 'PSI Pass Rate',        value: psi.pass_rate != null ? `${psi.pass_rate}%` : '—', color: '#14b8a6', icon: '✅', link: '/shipment/psi', sub: `${psi.total_inspected || 0} inspected` },
        { label: 'Receivable',           value: `$${(fin.total_receivable || 0).toLocaleString()}`, color: '#10b981', icon: '💰', link: '/finance/sales-invoices', sub: `$${(fin.overdue_receivable || 0).toLocaleString()} overdue` },
        { label: 'T&A Overdue',          value: d.ta_overdue || 0,           color: '#ef4444', icon: '⏰', link: '/orders/co',                     sub: 'Milestones past due' },
    ];

    // Monthly order value chart
    const monthly = (d.monthly || []).map(m => ({ month: m.month, Value: m.value, Orders: m.orders }));

    // CO status pie
    const coPie = Object.entries(co.by_status || {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v, color: CO_STATUS_COLORS[k] || '#94a3b8' }));

    // PD status pie
    const pdPie = Object.entries(pd.by_status || {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v, color: PD_STATUS_COLORS[k] || '#94a3b8' }));

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', borderRadius: 14, padding: '20px 28px', marginBottom: 28, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>Buying House ERP — Dashboard</div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Live overview · PD → Orders → Shipment → Finance</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <button onClick={load} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        ↻ Refresh
                    </button>
                    {refresh && <div style={{ fontSize: 11, opacity: 0.55, marginTop: 6 }}>Updated: {refresh}</div>}
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14, marginBottom: 28 }}>
                {kpis.map(k => (
                    <div key={k.label} onClick={() => nav(k.link)}
                        style={{ background: card, border: `1px solid ${k.color}30`, borderLeft: `4px solid ${k.color}`, borderRadius: 12, padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 20px ${k.color}25`}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 11, color: dim, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</div>
                            <span style={{ fontSize: 18 }}>{k.icon}</span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: 11, color: muted, marginTop: 8 }}>{k.sub}</div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, marginBottom: 20 }}>

                {/* Monthly Order Value */}
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Monthly Order Value</div>
                    <div style={{ fontSize: 12, color: dim, marginBottom: 20 }}>Last 6 months — FOB value of customer orders</div>
                    {monthly.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: muted }}>No orders yet</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={monthly} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={border} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: dim }} />
                                <YAxis tick={{ fontSize: 11, fill: dim }} />
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${border}`, background: card, color: text }} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="Value" fill="#10b981" radius={[4,4,0,0]} name="Order Value (USD)" />
                                <Bar dataKey="Orders" fill="#3b82f6" radius={[4,4,0,0]} name="# Orders" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* CO Status Pie */}
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>CO Status</div>
                    <div style={{ fontSize: 12, color: dim, marginBottom: 16 }}>Customer orders by status</div>
                    {coPie.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: muted }}>No orders yet</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={coPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                                    {coPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8, background: card, color: text }} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Second row: PD Pie + Finance + Flow */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 20 }}>

                {/* PD Pipeline Pie */}
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>PD Pipeline</div>
                    <div style={{ fontSize: 12, color: dim, marginBottom: 16 }}>PD requests by stage</div>
                    {pdPie.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: muted }}>No PD requests yet</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={pdPie} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3}>
                                    {pdPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8, background: card, color: text }} />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Finance snapshot */}
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Finance Snapshot</div>
                    {[
                        { label: 'Total Receivable', val: `$${(fin.total_receivable || 0).toLocaleString()}`, color: '#10b981' },
                        { label: 'Overdue Receivable', val: `$${(fin.overdue_receivable || 0).toLocaleString()}`, color: '#ef4444' },
                        { label: 'Total Payable', val: (fin.total_payable || 0).toLocaleString(), color: '#f59e0b' },
                        { label: 'Net Position', val: `$${(fin.net_position || 0).toLocaleString()}`, color: (fin.net_position || 0) >= 0 ? '#10b981' : '#ef4444' },
                    ].map(r => (
                        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
                            <span style={{ fontSize: 13, color: dim }}>{r.label}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.val}</span>
                        </div>
                    ))}
                    <button onClick={() => nav('/finance/payments')} style={{ marginTop: 16, width: '100%', padding: '8px', background: '#a855f715', color: '#a855f7', border: '1px solid #a855f7', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        View Payments →
                    </button>
                </div>

                {/* Workflow flow */}
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Workflow Flow</div>
                    {[
                        { label: 'PD Requests', value: pd.total || 0, color: '#8b5cf6', link: '/product-development' },
                        { label: 'Customer Orders', value: co.total || 0, color: '#10b981', link: '/orders/co' },
                        { label: 'Factory Orders', value: fo.total || 0, color: '#f59e0b', link: '/orders/co' },
                        { label: 'Shipments', value: shp.total || 0, color: '#06b6d4', link: '/shipment/shipments' },
                        { label: 'Sales Invoices', value: 0, color: '#a855f7', link: '/finance/sales-invoices' },
                    ].map((step, i, arr) => (
                        <div key={step.label}>
                            <div onClick={() => nav(step.link)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderRadius: 8, cursor: 'pointer', background: `${step.color}10`, marginBottom: 4 }}
                                onMouseEnter={e => e.currentTarget.style.background = `${step.color}22`}
                                onMouseLeave={e => e.currentTarget.style.background = `${step.color}10`}>
                                <span style={{ fontSize: 13, color: text }}>{step.label}</span>
                                <span style={{ fontWeight: 700, color: step.color, fontSize: 16 }}>{step.value}</span>
                            </div>
                            {i < arr.length - 1 && <div style={{ textAlign: 'center', color: muted, fontSize: 12, lineHeight: 1, marginBottom: 4 }}>↓</div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent COs */}
            {(d.recent_cos || []).length > 0 && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>Recent Customer Orders</div>
                        <button onClick={() => nav('/orders/co')} style={{ fontSize: 12, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All →</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(d.recent_cos || []).map(r => {
                            const sc = CO_STATUS_COLORS[r.status] || '#94a3b8';
                            return (
                                <div key={r.id} onClick={() => nav(`/orders/co/${r.id}`)}
                                    style={{ display: 'grid', gridTemplateColumns: '140px 1fr 120px 100px', gap: 12, alignItems: 'center', padding: '10px 14px', borderRadius: 8, border: `1px solid ${border}`, cursor: 'pointer' }}
                                    onMouseEnter={e => e.currentTarget.style.background = `${sc}08`}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <span style={{ fontWeight: 700, color: '#10b981', fontSize: 13 }}>{r.co_number}</span>
                                    <span style={{ fontSize: 13, color: text }}>{r.customer_name || '—'}</span>
                                    <span style={{ fontSize: 12, color: dim }}>{r.order_date}</span>
                                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${sc}20`, color: sc, fontSize: 11, fontWeight: 600 }}>
                                        {r.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
