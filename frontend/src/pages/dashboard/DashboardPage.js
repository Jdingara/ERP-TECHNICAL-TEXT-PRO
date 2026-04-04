// ============================================================
// FILE: pages/dashboard/DashboardPage.js
// PURPOSE: Advanced Tableau-style dashboard — live KPIs, revenue
//          trend, P&L, AR aging, SO status, stock health, alerts.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Alert, CircularProgress, Button, Divider, LinearProgress,
} from '@mui/material';
import TrendingUpIcon       from '@mui/icons-material/TrendingUp';
import TrendingDownIcon     from '@mui/icons-material/TrendingDown';
import InventoryIcon        from '@mui/icons-material/Inventory';
import ShoppingCartIcon     from '@mui/icons-material/ShoppingCart';
import PointOfSaleIcon      from '@mui/icons-material/PointOfSale';
import FactoryIcon          from '@mui/icons-material/Factory';
import PeopleIcon           from '@mui/icons-material/People';
import WarningAmberIcon     from '@mui/icons-material/WarningAmber';
import VerifiedIcon         from '@mui/icons-material/Verified';
import BiotechIcon          from '@mui/icons-material/Biotech';
import ScienceIcon          from '@mui/icons-material/Science';
import AssignmentLateIcon   from '@mui/icons-material/AssignmentLate';
import EventBusyIcon        from '@mui/icons-material/EventBusy';
import ReceiptIcon          from '@mui/icons-material/Receipt';
import AccountBalanceIcon   from '@mui/icons-material/AccountBalance';
import RefreshIcon          from '@mui/icons-material/Refresh';
import { useNavigate }      from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
    ComposedChart, Line,
} from 'recharts';

// ─── helpers ────────────────────────────────────────────────
const fmtK = (v) => {
    v = parseFloat(v || 0);
    if (v >= 1000000) return `₹${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000)    return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v.toFixed(0)}`;
};
const fmtCur = (v) =>
    `₹ ${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

// ─── Financial KPI Card (big, gradient) ─────────────────────
function FinKpiCard({ title, value, sub, icon, gradient, trend }) {
    return (
        <Card sx={{
            borderRadius: 2.5, boxShadow: 3,
            background: gradient,
            color: 'white', position: 'relative', overflow: 'hidden',
        }}>
            <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography fontSize={11} fontWeight={500} sx={{ opacity: 0.85, mb: 0.5, letterSpacing: 0.5 }}>
                            {title.toUpperCase()}
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" letterSpacing={-0.5}>{value}</Typography>
                        {sub && <Typography fontSize={11} sx={{ opacity: 0.8, mt: 0.5 }}>{sub}</Typography>}
                    </Box>
                    <Box sx={{ opacity: 0.35, mt: 0.5 }}>
                        {React.cloneElement(icon, { sx: { fontSize: 42 } })}
                    </Box>
                </Box>
                {trend !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                        {trend >= 0
                            ? <TrendingUpIcon sx={{ fontSize: 14 }} />
                            : <TrendingDownIcon sx={{ fontSize: 14 }} />}
                        <Typography fontSize={11} sx={{ opacity: 0.9 }}>
                            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs last period
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Operations KPI Card ────────────────────────────────────
function OpsCard({ title, value, sub, icon, color, onClick }) {
    return (
        <Card
            sx={{ borderRadius: 2, boxShadow: 1.5, cursor: onClick ? 'pointer' : 'default',
                  '&:hover': onClick ? { boxShadow: 3, transform: 'translateY(-1px)', transition: 'all 0.2s' } : {} }}
            onClick={onClick}>
            <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary" fontSize={12}>{title}</Typography>
                        <Typography variant="h4" fontWeight="bold" color={color} mt={0.3}>{value}</Typography>
                        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
                    </Box>
                    <Box sx={{ backgroundColor: color + '18', p: 1.5, borderRadius: 2 }}>
                        {React.cloneElement(icon, { sx: { color, fontSize: 28 } })}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

// ─── Section Header ─────────────────────────────────────────
function SectionHeader({ children, color = '#1a237e' }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 3 }}>
            <Box sx={{ width: 4, height: 18, borderRadius: 1, backgroundColor: color }} />
            <Typography variant="h6" fontWeight="bold" color={color}>{children}</Typography>
        </Box>
    );
}

// ─── Chart Panel ────────────────────────────────────────────
function ChartPanel({ title, subtitle, children, height = 240 }) {
    return (
        <Paper sx={{ p: 2.5, borderRadius: 2.5, boxShadow: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold" color="#1a237e" fontSize={13}>{title}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
            <Box mt={1.5} height={height}>
                {children}
            </Box>
        </Paper>
    );
}

// ─── Custom Tooltip for currency charts ─────────────────────
const CurrencyTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <Paper sx={{ p: 1.5, boxShadow: 3, fontSize: 12 }}>
            <Typography fontWeight="bold" fontSize={12}>{label}</Typography>
            {payload.map((p, i) => (
                <Box key={i} sx={{ color: p.color }}>
                    {p.name}: {fmtK(p.value)}
                </Box>
            ))}
        </Paper>
    );
};

// ────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ────────────────────────────────────────────────────────────
function DashboardPage() {
    const navigate = useNavigate();
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => { fetchDashboard(); }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const res  = await fetch('/api/authentication/dashboard-summary/', { credentials: 'include' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
            setData(json);
        } catch (e) { setError(e.message); }
        finally     { setLoading(false); }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
    if (error)   return <Alert severity="error">{error}</Alert>;

    // ── Derived chart data ───────────────────────────────────
    const soStatusPie = [
        { name: 'Draft',     value: data.so_status?.draft || 0,     fill: '#90a4ae' },
        { name: 'Confirmed', value: data.so_status?.confirmed || 0,  fill: '#42a5f5' },
        { name: 'Partial',   value: data.so_status?.partial || 0,    fill: '#ffa726' },
        { name: 'Delivered', value: data.so_status?.delivered || 0,  fill: '#66bb6a' },
        { name: 'Cancelled', value: data.so_status?.cancelled || 0,  fill: '#ef5350' },
    ].filter(d => d.value > 0);

    const stockPie = [
        { name: 'Normal Stock',    value: Math.max(0, (data.total_stock_items || 0) - (data.low_stock_count || 0)), fill: '#2e7d32' },
        { name: 'Low Stock Alert', value: data.low_stock_count || 0, fill: '#e53935' },
    ];

    const arAgingData = [
        { name: 'Current (not due)', value: data.ar_aging?.current  || 0, fill: '#2e7d32' },
        { name: '1–30 days overdue', value: data.ar_aging?.days_30  || 0, fill: '#ffa726' },
        { name: '31–60 days',        value: data.ar_aging?.days_60  || 0, fill: '#ef5350' },
        { name: '60+ days',          value: data.ar_aging?.days_90p || 0, fill: '#b71c1c' },
    ];

    const plData = [
        { name: 'Income',  value: data.pl_income  || 0, fill: '#2e7d32' },
        { name: 'Expense', value: data.pl_expense || 0, fill: '#e53935' },
        { name: 'Net P&L', value: data.pl_net     || 0, fill: data.pl_net >= 0 ? '#1565c0' : '#b71c1c' },
    ];

    const monthlyRev = data.monthly_revenue || [];

    const medicalAlerts = (data.open_capas || 0) + (data.expiring_certs || 0) + (data.near_expiry_batches || 0);

    // Collection rate
    const collectionRate = data.total_invoiced > 0
        ? ((data.total_paid / data.total_invoiced) * 100).toFixed(0)
        : 0;

    return (
        <Box sx={{ pb: 4 }}>

            {/* ── Header ── */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight="bold" color="#1a237e">Business Dashboard</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Live overview — click any card to navigate
                    </Typography>
                </Box>
                <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={fetchDashboard}>
                    Refresh
                </Button>
            </Box>

            {/* ── Alert Banners ── */}
            {(data.low_stock_count > 0) && (
                <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 1.5 }}
                    action={<Button color="inherit" size="small" onClick={() => navigate('/inventory/stock-list')}>VIEW</Button>}>
                    <strong>{data.low_stock_count} item(s)</strong> are running low on stock.
                </Alert>
            )}
            {medicalAlerts > 0 && (
                <Alert severity="error" icon={<AssignmentLateIcon />} sx={{ mb: 1.5 }}>
                    Medical alerts:
                    {data.open_capas > 0           && <> <strong>{data.open_capas} open CAPA(s)</strong></>}
                    {data.expiring_certs > 0        && <> · <strong>{data.expiring_certs} cert(s) expiring soon</strong></>}
                    {data.near_expiry_batches > 0   && <> · <strong>{data.near_expiry_batches} batch(es) near expiry</strong></>}
                </Alert>
            )}
            {(data.overdue_invoices > 0) && (
                <Alert severity="error" icon={<ReceiptIcon />} sx={{ mb: 1.5 }}
                    action={<Button color="inherit" size="small" onClick={() => navigate('/sales/invoices')}>VIEW AR</Button>}>
                    <strong>{data.overdue_invoices} overdue invoice(s)</strong> — outstanding AR needs attention.
                </Alert>
            )}

            {/* ══════════════════════════════════════════════
                SECTION 1 — FINANCIAL OVERVIEW (gradient cards)
            ══════════════════════════════════════════════ */}
            <SectionHeader color="#c62828">Financial Overview</SectionHeader>
            <Grid container spacing={2.5} mb={1}>
                <Grid item xs={12} sm={6} md={3}>
                    <FinKpiCard
                        title="Total Invoiced"
                        value={fmtK(data.total_invoiced)}
                        sub={`${fmtCur(data.total_invoiced)} total billed`}
                        icon={<ReceiptIcon />}
                        gradient="linear-gradient(135deg, #1a237e 0%, #283593 100%)"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <FinKpiCard
                        title="Collected (Paid)"
                        value={fmtK(data.total_paid)}
                        sub={`${collectionRate}% collection rate`}
                        icon={<AccountBalanceIcon />}
                        gradient="linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <FinKpiCard
                        title="Outstanding AR"
                        value={fmtK(data.outstanding_ar)}
                        sub={data.overdue_invoices > 0 ? `${data.overdue_invoices} overdue` : 'No overdue invoices'}
                        icon={<TrendingUpIcon />}
                        gradient="linear-gradient(135deg, #e65100 0%, #bf360c 100%)"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <FinKpiCard
                        title="Net P&L"
                        value={fmtK(Math.abs(data.pl_net))}
                        sub={data.pl_net >= 0 ? 'Profit' : 'Loss'}
                        icon={data.pl_net >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                        gradient={data.pl_net >= 0
                            ? 'linear-gradient(135deg, #00695c 0%, #00897b 100%)'
                            : 'linear-gradient(135deg, #b71c1c 0%, #c62828 100%)'}
                    />
                </Grid>
            </Grid>

            {/* ══════════════════════════════════════════════
                SECTION 2 — CORE OPERATIONS KPIs
            ══════════════════════════════════════════════ */}
            <SectionHeader color="#1a237e">Core Operations</SectionHeader>
            <Grid container spacing={2} mb={1}>
                <Grid item xs={6} sm={4} md={12/5}>
                    <OpsCard title="Stock Items" value={data.total_stock_items}
                        sub={data.low_stock_count > 0 ? `${data.low_stock_count} low` : 'All OK'}
                        icon={<InventoryIcon />} color="#1a237e"
                        onClick={() => navigate('/inventory/stock-list')} />
                </Grid>
                <Grid item xs={6} sm={4} md={12/5}>
                    <OpsCard title="Open Purchase Orders" value={data.open_purchase_orders}
                        sub="Draft + Confirmed"
                        icon={<ShoppingCartIcon />} color="#2e7d32"
                        onClick={() => navigate('/purchasing/purchase-orders')} />
                </Grid>
                <Grid item xs={6} sm={4} md={12/5}>
                    <OpsCard title="Open Sales Orders" value={data.open_sales_orders}
                        sub="Draft + Confirmed"
                        icon={<PointOfSaleIcon />} color="#e65100"
                        onClick={() => navigate('/sales/sales-orders')} />
                </Grid>
                <Grid item xs={6} sm={4} md={12/5}>
                    <OpsCard title="Active Work Orders" value={data.active_work_orders}
                        sub="Confirmed + In Progress"
                        icon={<FactoryIcon />} color="#6a1b9a"
                        onClick={() => navigate('/production/work-orders')} />
                </Grid>
                <Grid item xs={6} sm={4} md={12/5}>
                    <OpsCard title="Total Employees" value={data.total_employees}
                        sub="Active employees"
                        icon={<PeopleIcon />} color="#00838f"
                        onClick={() => navigate('/hr-payroll/employees')} />
                </Grid>
            </Grid>

            {/* ══════════════════════════════════════════════
                SECTION 3 — REVENUE TREND + SO STATUS
            ══════════════════════════════════════════════ */}
            <SectionHeader color="#1565c0">Revenue & Sales Analytics</SectionHeader>
            <Grid container spacing={2.5} mb={1}>

                {/* Revenue Trend — Area Chart */}
                <Grid item xs={12} md={8}>
                    <ChartPanel
                        title="Monthly Revenue Trend"
                        subtitle="Last 6 months — confirmed/partial/delivered SOs"
                        height={220}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyRev} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#1a237e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#1a237e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 10 }} width={55} />
                                <Tooltip content={<CurrencyTooltip />} />
                                <Area type="monotone" dataKey="revenue" name="Revenue"
                                    stroke="#1a237e" strokeWidth={2.5}
                                    fill="url(#revGrad)" dot={{ r: 4, fill: '#1a237e' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartPanel>
                </Grid>

                {/* SO Status — Donut Pie */}
                <Grid item xs={12} md={4}>
                    <ChartPanel title="Sales Order Status" subtitle="All-time breakdown" height={220}>
                        {soStatusPie.length === 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <Typography color="text.secondary" fontSize={12}>No sales orders yet</Typography>
                            </Box>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={soStatusPie} cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={80}
                                        dataKey="value" paddingAngle={3}
                                        label={({ value }) => `${value}`}>
                                        {soStatusPie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                    </Pie>
                                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v, n) => [v, n]} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </ChartPanel>
                </Grid>
            </Grid>

            {/* ══════════════════════════════════════════════
                SECTION 4 — P&L + AR AGING
            ══════════════════════════════════════════════ */}
            <SectionHeader color="#c62828">Profit & Loss / Accounts Receivable</SectionHeader>
            <Grid container spacing={2.5} mb={1}>

                {/* P&L Bar Chart */}
                <Grid item xs={12} md={6}>
                    <ChartPanel
                        title="P&L Summary"
                        subtitle="Posted journal entries — income vs expense"
                        height={220}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={plData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 10 }} width={55} />
                                <Tooltip content={<CurrencyTooltip />} />
                                <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
                                    {plData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartPanel>
                </Grid>

                {/* AR Aging */}
                <Grid item xs={12} md={6}>
                    <ChartPanel
                        title="AR Aging Analysis"
                        subtitle="Outstanding receivables by overdue period"
                        height={220}>
                        {arAgingData.every(d => d.value === 0) ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <Typography color="text.secondary" fontSize={12}>No outstanding AR</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ mt: 1 }}>
                                {arAgingData.map((d) => {
                                    const total = arAgingData.reduce((s, x) => s + x.value, 0);
                                    const pct   = total > 0 ? (d.value / total) * 100 : 0;
                                    return (
                                        <Box key={d.name} mb={2}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography fontSize={12} color="text.secondary">{d.name}</Typography>
                                                <Typography fontSize={12} fontWeight="bold" color={d.fill}>
                                                    {fmtK(d.value)} ({pct.toFixed(0)}%)
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={pct}
                                                sx={{ height: 10, borderRadius: 5,
                                                    backgroundColor: d.fill + '25',
                                                    '& .MuiLinearProgress-bar': { backgroundColor: d.fill, borderRadius: 5 }
                                                }} />
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </ChartPanel>
                </Grid>
            </Grid>

            {/* ══════════════════════════════════════════════
                SECTION 5 — MODULE ACTIVITY + STOCK HEALTH
            ══════════════════════════════════════════════ */}
            <SectionHeader color="#2e7d32">Module Activity & Stock Health</SectionHeader>
            <Grid container spacing={2.5} mb={1}>

                {/* Module Activity Bar */}
                <Grid item xs={12} md={8}>
                    <ChartPanel title="Live Module Counts" subtitle="Current open/active records per module" height={210}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[
                                    { name: 'Stock',     value: data.total_stock_items,    fill: '#1a237e' },
                                    { name: 'Open POs',  value: data.open_purchase_orders, fill: '#2e7d32' },
                                    { name: 'Open SOs',  value: data.open_sales_orders,    fill: '#e65100' },
                                    { name: 'Work Ord.', value: data.active_work_orders,   fill: '#6a1b9a' },
                                    { name: 'Employees', value: data.total_employees,      fill: '#00838f' },
                                    { name: 'CAPAs',     value: data.open_capas,           fill: '#c62828' },
                                    { name: 'R&D',       value: data.active_rd_projects,   fill: '#00695c' },
                                ]}
                                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                                    {['#1a237e','#2e7d32','#e65100','#6a1b9a','#00838f','#c62828','#00695c'].map((fill, idx) => (
                                        <Cell key={idx} fill={fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartPanel>
                </Grid>

                {/* Stock Health Donut */}
                <Grid item xs={12} md={4}>
                    <ChartPanel title="Stock Health" subtitle="Normal vs low stock items" height={210}>
                        {data.total_stock_items === 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <Typography color="text.secondary" fontSize={12}>No stock data yet</Typography>
                            </Box>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stockPie} cx="50%" cy="50%"
                                        innerRadius={50} outerRadius={75}
                                        dataKey="value" paddingAngle={3}
                                        label={({ value }) => value > 0 ? `${value}` : ''}>
                                        {stockPie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                    </Pie>
                                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </ChartPanel>
                </Grid>
            </Grid>

            {/* ══════════════════════════════════════════════
                SECTION 6 — MEDICAL & TECHNICAL TEXTILE
            ══════════════════════════════════════════════ */}
            <SectionHeader color="#c2185b">Medical &amp; Technical Textile</SectionHeader>
            <Grid container spacing={2} mb={1}>
                {[
                    { title: 'Open CAPAs',           value: data.open_capas,         sub: 'Open + In Progress + Overdue', color: data.open_capas > 0 ? '#c62828' : '#2e7d32',  icon: <AssignmentLateIcon />, path: '/medical-textile/capa' },
                    { title: 'Expiring Certificates', value: data.expiring_certs,     sub: 'Expiring within 90 days',     color: data.expiring_certs > 0 ? '#e65100' : '#2e7d32', icon: <VerifiedIcon />,       path: '/medical-textile/compliance' },
                    { title: 'Shelf Life Alerts',    value: data.near_expiry_batches, sub: 'Near/past expiry batches',    color: data.near_expiry_batches > 0 ? '#c62828' : '#2e7d32', icon: <EventBusyIcon />,  path: '/medical-textile/shelf-life' },
                    { title: 'Pending Samples',      value: data.pending_samples,    sub: 'Prepared + Sent to customer', color: '#00695c',  icon: <BiotechIcon />, path: '/technical-textile/samples' },
                    { title: 'Active R&D Projects',  value: data.active_rd_projects, sub: 'Active + Testing phase',      color: '#1565c0', icon: <ScienceIcon />, path: '/technical-textile/rd-projects' },
                ].map(c => (
                    <Grid item xs={6} sm={4} md={12/5} key={c.title}>
                        <OpsCard {...c} onClick={() => navigate(c.path)} />
                    </Grid>
                ))}
            </Grid>

            {/* ══════════════════════════════════════════════
                SECTION 7 — LOW STOCK TABLE
            ══════════════════════════════════════════════ */}
            {data.low_stock_items?.length > 0 && (
                <>
                    <SectionHeader color="#e53935">Low Stock Alerts</SectionHeader>
                    <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2, mb: 2 }}>
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: '#e53935' }}>
                                <TableRow>
                                    {['Item Code', 'Item Name', 'Warehouse', 'Current Qty', 'Reorder Level', 'Status'].map(h => (
                                        <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.low_stock_items.map((item, i) => (
                                    <TableRow key={i} sx={{ backgroundColor: '#fff8f8' }}>
                                        <TableCell><strong>{item.item_code}</strong></TableCell>
                                        <TableCell>{item.item_name}</TableCell>
                                        <TableCell>{item.warehouse}</TableCell>
                                        <TableCell sx={{ color: '#e53935', fontWeight: 'bold' }}>{item.quantity}</TableCell>
                                        <TableCell>{item.reorder_level}</TableCell>
                                        <TableCell><Chip label="LOW STOCK" size="small" color="error" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}

            {/* ══════════════════════════════════════════════
                SECTION 8 — QUICK ACTIONS
            ══════════════════════════════════════════════ */}
            <SectionHeader color="#1a237e">Quick Actions</SectionHeader>
            <Grid container spacing={2} mb={3}>
                {[
                    { label: 'New Purchase Order', path: '/purchasing/create-purchase-order', color: '#2e7d32' },
                    { label: 'New Sales Order',    path: '/sales/create-sales-order',         color: '#e65100' },
                    { label: 'New Work Order',     path: '/production/create-work-order',     color: '#6a1b9a' },
                    { label: 'Record Attendance',  path: '/hr-payroll/attendance',            color: '#00838f' },
                    { label: 'Stock Movement',     path: '/inventory/stock-movement',         color: '#1a237e' },
                    { label: 'Create Invoice',     path: '/sales/invoices',                   color: '#c62828' },
                ].map(link => (
                    <Grid item xs={12} sm={6} md={4} key={link.path}>
                        <Button fullWidth variant="outlined" onClick={() => navigate(link.path)}
                            sx={{ py: 1.5, borderColor: link.color, color: link.color,
                                fontWeight: 'bold', borderRadius: 2,
                                '&:hover': { backgroundColor: link.color + '10', borderColor: link.color } }}>
                            {link.label}
                        </Button>
                    </Grid>
                ))}
            </Grid>

            {/* ── Reports Quick Links ── */}
            <Grid container spacing={2} mb={2}>
                {[
                    { label: 'Production Report', path: '/reports/production', color: '#6a1b9a' },
                    { label: 'Inventory Report',  path: '/reports/inventory',  color: '#1a237e' },
                    { label: 'Sales Report',      path: '/reports/sales',      color: '#e65100' },
                    { label: 'Finance Report',    path: '/reports/finance',    color: '#c62828' },
                    { label: 'HR Report',         path: '/reports/hr',         color: '#00838f' },
                ].map(link => (
                    <Grid item xs={12} sm={6} md={2.4} key={link.path}>
                        <Button fullWidth variant="contained" onClick={() => navigate(link.path)}
                            sx={{ py: 1.5, backgroundColor: link.color, fontWeight: 'bold', borderRadius: 2,
                                '&:hover': { backgroundColor: link.color, opacity: 0.9 } }}>
                            {link.label}
                        </Button>
                    </Grid>
                ))}
            </Grid>

            <Divider sx={{ mt: 3, mb: 2 }} />
            <Typography variant="caption" color="text.secondary">
                SASI ERP — Medical &amp; Technical Textile &nbsp;|&nbsp; Data refreshes on page load.
            </Typography>
        </Box>
    );
}

export default DashboardPage;
