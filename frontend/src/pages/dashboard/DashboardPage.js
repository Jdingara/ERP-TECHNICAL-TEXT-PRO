import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const PROD_STATUS_COLORS = {
    draft:       '#94a3b8',
    planned:     '#3b82f6',
    in_progress: '#f59e0b',
    completed:   '#10b981',
    cancelled:   '#ef4444',
};

export default function DashboardPage() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [refresh, setRefresh] = useState('');
    const navigate = useNavigate();

    const load = async () => {
        setLoading(true);
        try {
            const res  = await fetch('/api/authentication/dashboard-summary/', { credentials: 'include' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Failed');
            setData(json);
            setRefresh(new Date().toLocaleTimeString('en-IN'));
        } catch (e) { setError(e.message); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 15 }}>Loading dashboard…</div>;
    if (error)   return <div style={{ padding: 24, color: '#ef4444' }}>{error}</div>;

    const d = data || {};

    // KPI cards definition
    const kpis = [
        { label: 'Available Lots',       value: d.available_lots       || 0, color: '#10b981', icon: '📦', link: '/lot-inventory/dashboard',       sub: `${d.low_stock_lots || 0} low stock` },
        { label: 'Open Purchase Orders', value: d.open_purchase_orders || 0, color: '#3b82f6', icon: '🛒', link: '/purchase/orders',               sub: 'Pending receipt' },
        { label: 'Open Sales Orders',    value: d.open_sales_orders    || 0, color: '#8b5cf6', icon: '📋', link: '/planning/sales-orders',          sub: 'In planning' },
        { label: 'Open Prod. Orders',    value: d.open_production_orders|| 0, color: '#f59e0b', icon: '🏭', link: '/planning/production-orders',    sub: 'Pending production' },
        { label: 'WIP Batches',          value: d.wip_batches          || 0, color: '#f97316', icon: '⚙️', link: '/production/batches',            sub: 'On production floor' },
        { label: 'QC Pending',           value: d.qc_pending           || 0, color: '#ef4444', icon: '🔍', link: '/quality/dashboard',             sub: 'Awaiting inspection' },
        { label: 'Inspections Today',    value: d.inspections_today    || 0, color: '#06b6d4', icon: '✅', link: '/quality/inspections',           sub: `${d.rejected_today || 0} rejected` },
        { label: 'Dispatched Today',     value: d.dispatched_today     || 0, color: '#64748b', icon: '🚚', link: '/dispatch/entries',              sub: 'Batches shipped' },
    ];

    // Monthly production chart
    const monthlyData = (d.monthly_production || []).map(m => ({
        month: m.month,
        Output: parseFloat(m.output_qty) || 0,
        Orders: m.orders || 0,
    }));

    // Production status pie
    const prodStatus = d.prod_status || {};
    const statusPie = Object.entries(prodStatus)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k.replace('_', ' '), value: v, color: PROD_STATUS_COLORS[k] || '#94a3b8' }));

    return (
        <div style={{ padding: 24, maxWidth: 1300 }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius: 12, padding: '20px 28px', marginBottom: 28, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>MEI TEXZ ERP — Business Intelligence</div>
                    <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>Technical Textile · Live Dashboard</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <button onClick={load} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        ↻ Refresh
                    </button>
                    {refresh && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>Last updated: {refresh}</div>}
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
                {kpis.map(k => (
                    <div key={k.label}
                        onClick={() => navigate(k.link)}
                        style={{ background: '#fff', border: `1px solid ${k.color}30`, borderLeft: `4px solid ${k.color}`, borderRadius: 10, padding: '16px 20px', cursor: 'pointer', boxShadow: '0 1px 4px #0001', transition: 'box-shadow 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px #0002'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px #0001'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>{k.label}</div>
                            <span style={{ fontSize: 20 }}>{k.icon}</span>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>{k.sub}</div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 28 }}>

                {/* Monthly Production Chart */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px #0001' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Monthly Production Output</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>Last 6 months — output quantity vs production orders</div>
                    {monthlyData.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No production data yet</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={monthlyData} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="Output" fill="#10b981" radius={[4, 4, 0, 0]} name="Output Qty" />
                                <Bar dataKey="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Prod. Orders" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Production Status Pie */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px #0001' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Production Order Status</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Current breakdown by status</div>
                    {statusPie.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No production orders yet</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                                    {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Flow Summary */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px #0001' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Production Flow Summary</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Purchase Orders', value: d.open_purchase_orders || 0, color: '#3b82f6', link: '/purchase/orders' },
                        { label: 'Lots in Stock',   value: d.available_lots       || 0, color: '#10b981', link: '/lot-inventory/dashboard' },
                        { label: 'Prod. Orders',    value: d.open_production_orders||0, color: '#f59e0b', link: '/planning/production-orders' },
                        { label: 'WIP Batches',     value: d.wip_batches          || 0, color: '#f97316', link: '/production/batches' },
                        { label: 'QC Pending',      value: d.qc_pending           || 0, color: '#ef4444', link: '/quality/inspections' },
                        { label: 'Dispatched',      value: d.dispatched_today     || 0, color: '#64748b', link: '/dispatch/entries' },
                    ].map((step, i, arr) => (
                        <div key={step.label} style={{ display: 'flex', alignItems: 'center' }}>
                            <div onClick={() => navigate(step.link)}
                                style={{ textAlign: 'center', cursor: 'pointer', padding: '12px 20px', borderRadius: 10, border: `2px solid ${step.color}`, minWidth: 100 }}
                                onMouseEnter={e => e.currentTarget.style.background = `${step.color}10`}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{ fontSize: 26, fontWeight: 800, color: step.color }}>{step.value}</div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 600 }}>{step.label}</div>
                            </div>
                            {i < arr.length - 1 && (
                                <div style={{ fontSize: 20, color: '#cbd5e1', padding: '0 6px' }}>→</div>
                            )}
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 14, fontSize: 12, color: '#94a3b8' }}>
                    Click any box to navigate to that module. Flow: Purchase → Lot Stock → Production → Batches → Quality → Dispatch
                </div>
            </div>
        </div>
    );
}
