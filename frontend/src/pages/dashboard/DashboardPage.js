// ============================================================
// FILE: pages/dashboard/DashboardPage.js
// PURPOSE: Tableau-style Business Intelligence Dashboard
//          — gauges, composed charts, AR aging, P&L, alerts.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Alert, CircularProgress, Button, Divider,
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
import SpeedIcon            from '@mui/icons-material/Speed';
import { ResizableTable } from '../../components/common/ResizableTable';
import { ResizableChartPanel } from '../../components/common/ResizableChartPanel';
import { ResizablePanelRowInner } from '../../components/common/ResizablePanelRow';
import { useNavigate }      from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
    ComposedChart, Line, RadialBarChart, RadialBar,
} from 'recharts';

// ─── Color palette ──────────────────────────────────────────
const C = {
    navy:   'primary.main',
    green:  '#2e7d32',
    orange: '#e65100',
    red:    '#c62828',
    purple: '#6a1b9a',
    teal:   '#00695c',
    blue:   '#1565c0',
    amber:  '#f57f17',
};

// ─── Helpers ────────────────────────────────────────────────
const fmtK = (v) => {
    v = parseFloat(v || 0);
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000)   return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000)     return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v.toFixed(0)}`;
};
const fmtCur = (v) =>
    `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

// ─── Semi-circle Gauge ──────────────────────────────────────
function GaugeChart({ value, color, label, sub }) {
    const pct = Math.min(100, Math.max(0, parseFloat(value) || 0));
    const gaugeData = [{ value: pct, fill: color }];
    return (
        <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ position: 'relative', height: 140 }}>
                <ResponsiveContainer width="100%" height={140}>
                    <RadialBarChart
                        cx="50%" cy="85%"
                        innerRadius="70%" outerRadius="100%"
                        startAngle={180} endAngle={0}
                        data={gaugeData}>
                        <RadialBar
                            background={{ fill: '#eeeeee' }}
                            dataKey="value"
                            cornerRadius={8}
                            isAnimationActive
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
                <Box sx={{ position: 'absolute', bottom: 4, left: 0, right: 0 }}>
                    <Typography variant="h4" fontWeight="bold" color={color} lineHeight={1}>
                        {pct.toFixed(0)}%
                    </Typography>
                </Box>
            </Box>
            <Typography fontSize={12} color="text.secondary" fontWeight={600} mt={0.5}>{label}</Typography>
            {sub && <Typography fontSize={11} color="text.secondary">{sub}</Typography>}
        </Box>
    );
}

// ─── Financial gradient card with mini sparkline ────────────
function FinCard({ title, value, sub, icon, gradient, sparkData }) {
    return (
        <Card sx={{ borderRadius: 2.5, boxShadow: 3, background: gradient, color: 'white', overflow: 'hidden' }}>
            <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontSize={10} fontWeight={700} sx={{ opacity: 0.75, letterSpacing: 1 }}>
                            {title.toUpperCase()}
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" mt={0.3} letterSpacing={-0.5}>{value}</Typography>
                        {sub && (
                            <Typography fontSize={11} sx={{ opacity: 0.85, mt: 0.3 }}>{sub}</Typography>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                        <Box sx={{ opacity: 0.25 }}>
                            {React.cloneElement(icon, { sx: { fontSize: 34 } })}
                        </Box>
                        {sparkData && sparkData.length > 0 && (
                            <AreaChart width={72} height={28} data={sparkData}
                                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#fff" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="revenue"
                                    stroke="rgba(255,255,255,0.75)" strokeWidth={1.5}
                                    fill="url(#sg)" dot={false} />
                            </AreaChart>
                        )}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

// ─── Operations metric card ──────────────────────────────────
function MetricCard({ title, value, badge, badgeColor = 'default', sub, icon, color, onClick }) {
    return (
        <Card
            onClick={onClick}
            sx={{
                borderRadius: 2, boxShadow: 2, height: '100%',
                cursor: onClick ? 'pointer' : 'default',
                borderTop: `3px solid ${color}`,
                transition: '0.2s',
                '&:hover': onClick ? { boxShadow: 5, transform: 'translateY(-2px)' } : {},
            }}>
            <CardContent sx={{ pb: '12px !important', pt: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography fontSize={11} color="text.secondary" fontWeight={600} letterSpacing={0.5}>
                        {title.toUpperCase()}
                    </Typography>
                    <Box sx={{ backgroundColor: color + '18', p: 0.8, borderRadius: 1.5 }}>
                        {React.cloneElement(icon, { sx: { color, fontSize: 18 } })}
                    </Box>
                </Box>
                <Typography variant="h4" fontWeight="bold" color={color} mt={0.4} mb={0.5}>
                    {value}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                    {badge !== undefined && (
                        <Chip label={badge} size="small" color={badgeColor}
                            sx={{ fontSize: 10, height: 18 }} />
                    )}
                    {sub && <Typography fontSize={11} color="text.secondary">{sub}</Typography>}
                </Box>
            </CardContent>
        </Card>
    );
}

// ─── Chart panel ─────────────────────────────────────────────
function Panel({ title, subtitle, children, height = 300 }) {
    return (
        <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: 2, height: '100%' }}>
            <Typography variant="subtitle2" fontWeight="bold" color={C.navy} fontSize={14}>{title}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
            <Box mt={1.5} height={height}>{children}</Box>
        </Paper>
    );
}

// ─── Section label ───────────────────────────────────────────
function SectionLabel({ children, color = C.navy }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, mt: 2.5 }}>
            <Box sx={{ width: 4, height: 20, borderRadius: 1, background: color }} />
            <Typography fontWeight="bold" fontSize={14} color={color}>{children}</Typography>
        </Box>
    );
}

// ─── Currency tooltip ────────────────────────────────────────
const CurTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <Paper sx={{ p: 1.5, fontSize: 12, boxShadow: 3 }}>
            <Typography fontWeight="bold" fontSize={12} mb={0.5}>{label}</Typography>
            {payload.map((p, i) => (
                <Box key={i} sx={{ color: p.color || p.fill }}>
                    {p.name}: {String(p.name).toLowerCase().includes('orders') || String(p.name).toLowerCase().includes('count')
                        ? p.value : fmtK(p.value)}
                </Box>
            ))}
        </Paper>
    );
};

// ════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════
function DashboardPage() {
    const navigate = useNavigate();
    const [data,        setData]        = useState(null);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState('');
    const [lastRefresh, setLastRefresh] = useState('');

    useEffect(() => { fetchDashboard(); }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const res  = await fetch('/api/authentication/dashboard-summary/', { credentials: 'include' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || `Error ${res.status}`);
            setData(json);
            setLastRefresh(new Date().toLocaleTimeString('en-IN'));
        } catch (e) { setError(e.message); }
        finally     { setLoading(false); }
    };

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 12, flexDirection: 'column', gap: 2 }}>
            <CircularProgress size={48} />
            <Typography color="text.secondary">Loading dashboard…</Typography>
        </Box>
    );
    if (error) return <Alert severity="error">{error}</Alert>;

    // ── Derived data ──────────────────────────────────────────
    const monthlyRev = data.monthly_revenue || [];

    const collectionRate = data.total_invoiced > 0
        ? (data.total_paid / data.total_invoiced) * 100 : 0;

    const deliveredSO = data.so_status?.delivered || 0;
    const totalSO = Object.values(data.so_status || {}).reduce((a, b) => a + b, 0);
    const fulfillmentRate = totalSO > 0 ? (deliveredSO / totalSO) * 100 : 0;

    const soStatusPie = [
        { name: 'Draft',     value: data.so_status?.draft     || 0, fill: '#90a4ae' },
        { name: 'Confirmed', value: data.so_status?.confirmed || 0, fill: '#42a5f5' },
        { name: 'Partial',   value: data.so_status?.partial   || 0, fill: '#ffa726' },
        { name: 'Delivered', value: data.so_status?.delivered || 0, fill: '#66bb6a' },
        { name: 'Cancelled', value: data.so_status?.cancelled || 0, fill: '#ef5350' },
    ].filter(d => d.value > 0);

    const stockPie = [
        { name: 'Healthy', value: Math.max(0, (data.total_stock_items || 0) - (data.low_stock_count || 0)), fill: C.green },
        { name: 'Low',     value: data.low_stock_count || 0, fill: C.red },
    ];

    const arAgingData = [
        { name: 'Current',  value: data.ar_aging?.current  || 0, fill: C.green  },
        { name: '1–30 d',   value: data.ar_aging?.days_30  || 0, fill: C.amber  },
        { name: '31–60 d',  value: data.ar_aging?.days_60  || 0, fill: C.orange },
        { name: '60 d+',    value: data.ar_aging?.days_90p || 0, fill: C.red    },
    ];

    const plData = [
        { name: 'Income',  value: data.pl_income  || 0, fill: C.green },
        { name: 'Expense', value: data.pl_expense || 0, fill: C.red   },
        { name: 'Net P&L', value: Math.abs(data.pl_net || 0), fill: (data.pl_net || 0) >= 0 ? C.blue : C.red },
    ];

    const moduleData = [
        { name: 'Stock',    value: data.total_stock_items    || 0, fill: C.navy   },
        { name: 'Open POs', value: data.open_purchase_orders || 0, fill: C.green  },
        { name: 'Open SOs', value: data.open_sales_orders    || 0, fill: C.orange },
        { name: 'Work Ord', value: data.active_work_orders   || 0, fill: C.purple },
        { name: 'Staff',    value: data.total_employees      || 0, fill: C.teal   },
        { name: 'CAPAs',    value: data.open_capas           || 0, fill: C.red    },
        { name: 'R&D',      value: data.active_rd_projects   || 0, fill: C.blue   },
    ];

    const medAlerts = (data.open_capas || 0) + (data.expiring_certs || 0) + (data.near_expiry_batches || 0);

    const colRateColor = collectionRate >= 80 ? C.green : collectionRate >= 50 ? C.amber : C.red;
    const fulfillColor = fulfillmentRate >= 70 ? C.green : fulfillmentRate >= 40 ? C.amber : C.navy;

    return (
        <Box sx={{ pb: 5 }}>

            {/* ═══ HEADER BANNER ═══════════════════════════════ */}
            <Box sx={{
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark || '#0d1b4b'} 0%, ${theme.palette.primary.main} 60%, ${theme.palette.primary.light || theme.palette.primary.main} 100%)`,
                borderRadius: 2.5, p: 2.5, mb: 2.5, color: 'white',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <Box>
                    <Typography variant="h5" fontWeight="bold" letterSpacing={0.5}>
                        SASI ERP — Business Intelligence
                    </Typography>
                    <Typography fontSize={12} sx={{ opacity: 0.65, mt: 0.3 }}>
                        Medical &amp; Technical Textile · Live Dashboard
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Typography fontSize={11} sx={{ opacity: 0.55, mb: 0.8 }}>
                        Metrics refreshed: {lastRefresh}
                    </Typography>
                    <Button size="small" variant="outlined"
                        startIcon={<RefreshIcon />} onClick={fetchDashboard}
                        sx={{
                            color: 'white', borderColor: 'rgba(255,255,255,0.4)', fontSize: 12,
                            '&:hover': { borderColor: 'white', background: 'rgba(255,255,255,0.1)' },
                        }}>
                        Refresh
                    </Button>
                </Box>
            </Box>

            {/* ═══ ALERT BANNERS ═══════════════════════════════ */}
            {data.low_stock_count > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }} icon={<WarningAmberIcon />}
                    action={<Button size="small" color="inherit" onClick={() => navigate('/inventory/stock-list')}>VIEW</Button>}>
                    <strong>{data.low_stock_count} item(s)</strong> running low on stock
                </Alert>
            )}
            {medAlerts > 0 && (
                <Alert severity="error" sx={{ mb: 1 }} icon={<AssignmentLateIcon />}>
                    {data.open_capas > 0           && <><strong>{data.open_capas} open CAPA(s)</strong> &nbsp;·&nbsp; </>}
                    {data.expiring_certs > 0        && <><strong>{data.expiring_certs} cert(s) expiring</strong> &nbsp;·&nbsp; </>}
                    {data.near_expiry_batches > 0   && <><strong>{data.near_expiry_batches} batch(es) near expiry</strong></>}
                </Alert>
            )}
            {data.overdue_invoices > 0 && (
                <Alert severity="error" sx={{ mb: 1.5 }} icon={<ReceiptIcon />}
                    action={<Button size="small" color="inherit" onClick={() => navigate('/sales/invoices')}>VIEW AR</Button>}>
                    <strong>{data.overdue_invoices} overdue invoice(s)</strong> — AR attention needed
                </Alert>
            )}

            {/* ═══ SECTION 1 — FINANCIAL KPI CARDS ════════════ */}
            <SectionLabel color={C.red}>Financial Overview</SectionLabel>
            <Grid container spacing={2} mb={0.5}>
                {[
                    {
                        title: 'Total Invoiced',
                        value: fmtK(data.total_invoiced),
                        sub: fmtCur(data.total_invoiced),
                        icon: <ReceiptIcon />,
                        gradient: `linear-gradient(135deg, #0d1b4b 0%, ${C.navy} 100%)`,
                        sparkData: monthlyRev,
                    },
                    {
                        title: 'Collected (Paid)',
                        value: fmtK(data.total_paid),
                        sub: `${collectionRate.toFixed(0)}% collection rate`,
                        icon: <AccountBalanceIcon />,
                        gradient: `linear-gradient(135deg, #1b5e20 0%, ${C.green} 100%)`,
                        sparkData: monthlyRev,
                    },
                    {
                        title: 'Outstanding AR',
                        value: fmtK(data.outstanding_ar),
                        sub: `${data.overdue_invoices || 0} overdue invoices`,
                        icon: <TrendingUpIcon />,
                        gradient: `linear-gradient(135deg, #bf360c 0%, ${C.orange} 100%)`,
                    },
                    {
                        title: 'Net Profit / Loss',
                        value: fmtK(Math.abs(data.pl_net || 0)),
                        sub: (data.pl_net || 0) >= 0 ? '▲ Profit' : '▼ Loss',
                        icon: (data.pl_net || 0) >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />,
                        gradient: (data.pl_net || 0) >= 0
                            ? `linear-gradient(135deg, #00695c 0%, #00897b 100%)`
                            : `linear-gradient(135deg, ${C.red} 0%, #e53935 100%)`,
                        sparkData: monthlyRev,
                    },
                ].map((card, i) => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                        <FinCard {...card} />
                    </Grid>
                ))}
            </Grid>

            {/* ═══ SECTION 2 — REVENUE TREND + GAUGES ═════════ */}
            <SectionLabel color={C.blue}>Revenue & Performance</SectionLabel>
            <ResizablePanelRowInner storageKey="dash_s2" defaultPercents={[67, 33]}>
                <ResizableChartPanel storageKey="dash_revenue"
                    title="Monthly Revenue & Order Volume"
                    subtitle="Last 6 months — bars = revenue · line = order count"
                    defaultHeight={320}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyRev} margin={{ top: 5, right: 25, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={C.navy} stopOpacity={0.85} />
                                    <stop offset="95%" stopColor={C.navy} stopOpacity={0.15} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="rev" orientation="left" tickFormatter={v => fmtK(v)} tick={{ fontSize: 10 }} width={58} />
                            <YAxis yAxisId="ord" orientation="right" allowDecimals={false} tick={{ fontSize: 10 }} width={30} />
                            <Tooltip content={<CurTip />} />
                            <Bar yAxisId="rev" dataKey="revenue" name="Revenue" fill="url(#revGrad)" radius={[4, 4, 0, 0]} />
                            <Line yAxisId="ord" dataKey="orders" name="Orders (count)" stroke={C.orange} strokeWidth={2.5} dot={{ r: 4, fill: C.orange }} type="monotone" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ResizableChartPanel>

                <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <SpeedIcon sx={{ color: C.navy, fontSize: 18 }} />
                        <Typography fontWeight="bold" color={C.navy} fontSize={13}>Performance Gauges</Typography>
                    </Box>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <GaugeChart value={collectionRate} color={colRateColor} label="Collection Rate" sub={`${fmtK(data.total_paid)} collected`} />
                        </Grid>
                        <Grid item xs={6}>
                            <GaugeChart value={fulfillmentRate} color={fulfillColor} label="Order Fulfillment" sub={`${deliveredSO} of ${totalSO} delivered`} />
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: 'action.hover', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                        <Typography fontSize={10} fontWeight={700} color="text.secondary" letterSpacing={0.8} mb={1}>AR AGING SNAPSHOT</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            {[
                                { label: 'Current', value: data.ar_aging?.current  || 0, color: C.green  },
                                { label: '1–30d',   value: data.ar_aging?.days_30  || 0, color: C.amber  },
                                { label: '31–60d',  value: data.ar_aging?.days_60  || 0, color: C.orange },
                                { label: '60d+',    value: data.ar_aging?.days_90p || 0, color: C.red    },
                            ].map(b => (
                                <Box key={b.label} sx={{ textAlign: 'center' }}>
                                    <Typography fontSize={13} fontWeight="bold" color={b.color}>{fmtK(b.value)}</Typography>
                                    <Typography fontSize={10} color="text.secondary">{b.label}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Paper>
            </ResizablePanelRowInner>

            {/* ═══ SECTION 3 — AR AGING + SO STATUS + STOCK ═══ */}
            <SectionLabel color={C.red}>Accounts Receivable &amp; Stock</SectionLabel>
            <ResizablePanelRowInner storageKey="dash_s3" defaultPercents={[40, 33, 27]}>
                <ResizableChartPanel storageKey="dash_ar_aging" title="AR Aging Breakdown" subtitle="Outstanding receivables by age bucket" defaultHeight={260}>
                    {arAgingData.every(d => d.value === 0) ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Typography color="text.secondary" fontSize={12}>No outstanding AR</Typography>
                        </Box>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={arAgingData} margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                <XAxis type="number" tickFormatter={v => fmtK(v)} tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={48} />
                                <Tooltip content={<CurTip />} />
                                <Bar dataKey="value" name="Amount" radius={[0, 5, 5, 0]}>
                                    {arAgingData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ResizableChartPanel>

                <ResizableChartPanel storageKey="dash_so_status" title="Sales Order Status" subtitle="All orders — status breakdown" defaultHeight={260}>
                    {soStatusPie.length === 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Typography color="text.secondary" fontSize={12}>No sales orders yet</Typography>
                        </Box>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={soStatusPie} cx="50%" cy="50%" innerRadius={52} outerRadius={75} dataKey="value" paddingAngle={3} label={({ value }) => value > 0 ? value : ''}>
                                    {soStatusPie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                </Pie>
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </ResizableChartPanel>

                <ResizableChartPanel storageKey="dash_stock_health" title="Stock Health" subtitle="Normal vs low stock items" defaultHeight={260}>
                    {data.total_stock_items === 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Typography color="text.secondary" fontSize={12}>No stock data</Typography>
                        </Box>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={stockPie} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value" paddingAngle={3} label={({ value }) => value > 0 ? value : ''}>
                                    {stockPie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                </Pie>
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </ResizableChartPanel>
            </ResizablePanelRowInner>

            {/* ═══ SECTION 4 — P&L + MODULE ACTIVITY ══════════ */}
            <SectionLabel color={C.green}>Profit &amp; Loss / Module Activity</SectionLabel>
            <ResizablePanelRowInner storageKey="dash_s4" defaultPercents={[33, 67]}>
                <ResizableChartPanel storageKey="dash_pl" title="P&L Summary" subtitle="Posted journal entries — income vs expense" defaultHeight={280}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={plData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 10 }} width={58} />
                            <Tooltip content={<CurTip />} />
                            <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
                                {plData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ResizableChartPanel>

                <ResizableChartPanel storageKey="dash_module_activity" title="Live Module Activity" subtitle="Open / active records across all modules" defaultHeight={280}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={moduleData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                                {moduleData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ResizableChartPanel>
            </ResizablePanelRowInner>

            {/* ═══ SECTION 5 — OPERATIONS KPI CARDS ═══════════ */}
            <SectionLabel color={C.navy}>Core Operations</SectionLabel>
            <Grid container spacing={2} mb={0.5}>
                {[
                    { title: 'Stock Items',          value: data.total_stock_items,    badge: data.low_stock_count > 0 ? `${data.low_stock_count} Low` : 'All OK', badgeColor: data.low_stock_count > 0 ? 'error' : 'success', icon: <InventoryIcon />, color: C.navy,   sub: 'items in warehouse',    path: '/inventory/stock-list' },
                    { title: 'Open Purchase Orders', value: data.open_purchase_orders, badge: 'Draft + Confirmed', badgeColor: 'info',      icon: <ShoppingCartIcon />, color: C.green,  sub: 'pending procurement',   path: '/purchasing/purchase-orders' },
                    { title: 'Open Sales Orders',    value: data.open_sales_orders,    badge: 'Draft + Confirmed', badgeColor: 'warning',   icon: <PointOfSaleIcon />,  color: C.orange, sub: 'pending fulfilment',    path: '/sales/sales-orders' },
                    { title: 'Active Work Orders',   value: data.active_work_orders,   badge: 'In Progress',      badgeColor: 'secondary', icon: <FactoryIcon />,      color: C.purple, sub: 'on factory floor',      path: '/production/work-orders' },
                    { title: 'Total Employees',      value: data.total_employees,      badge: 'Active',           badgeColor: 'success',   icon: <PeopleIcon />,       color: C.teal,   sub: 'on payroll',            path: '/hr-payroll/employees' },
                ].map((c, i) => (
                    <Grid item xs={6} sm={4} md={12 / 5} key={i}>
                        <MetricCard {...c} onClick={() => navigate(c.path)} />
                    </Grid>
                ))}
            </Grid>

            {/* ═══ SECTION 6 — MEDICAL & TECHNICAL ════════════ */}
            <SectionLabel color="#c2185b">Medical &amp; Technical Textile</SectionLabel>
            <Grid container spacing={2} mb={0.5}>
                {[
                    { title: 'Open CAPAs',            value: data.open_capas,          badge: data.open_capas > 0 ? 'Action Required' : 'Clear',  badgeColor: data.open_capas > 0 ? 'error' : 'success',          icon: <AssignmentLateIcon />, color: data.open_capas > 0 ? C.red : C.green,          path: '/medical-textile/capa' },
                    { title: 'Expiring Certificates', value: data.expiring_certs,      badge: 'Within 90 days',  badgeColor: data.expiring_certs > 0 ? 'warning' : 'success',       icon: <VerifiedIcon />,       color: data.expiring_certs > 0 ? C.orange : C.green,       path: '/medical-textile/compliance' },
                    { title: 'Shelf Life Alerts',     value: data.near_expiry_batches, badge: 'Near/Past Expiry', badgeColor: data.near_expiry_batches > 0 ? 'error' : 'success',   icon: <EventBusyIcon />,      color: data.near_expiry_batches > 0 ? C.red : C.green,     path: '/medical-textile/shelf-life' },
                    { title: 'Pending Samples',       value: data.pending_samples,     badge: 'Prepared + Sent', badgeColor: 'info',                                                icon: <BiotechIcon />,        color: C.teal,                                              path: '/technical-textile/samples' },
                    { title: 'Active R&D Projects',   value: data.active_rd_projects,  badge: 'Active + Testing', badgeColor: 'primary',                                            icon: <ScienceIcon />,        color: C.blue,                                              path: '/technical-textile/rd-projects' },
                ].map((c, i) => (
                    <Grid item xs={6} sm={4} md={12 / 5} key={i}>
                        <MetricCard {...c} onClick={() => navigate(c.path)} />
                    </Grid>
                ))}
            </Grid>

            {/* ═══ LOW STOCK TABLE ══════════════════════════════ */}
            {data.low_stock_items?.length > 0 && (
                <>
                    <SectionLabel color={C.red}>Low Stock Alerts</SectionLabel>
                    <ResizableTable storageKey="dashboard">
                <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2, mb: 2 }}>
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: C.red }}>
                                <TableRow>
                                    {['Item Code', 'Item Name', 'Warehouse', 'Qty', 'Reorder Level', 'Status'].map(h => (
                                        <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>{h}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.low_stock_items.map((item, i) => (
                                    <TableRow key={i} sx={{ backgroundColor: i % 2 === 0 ? '#fff8f8' : 'white' }}>
                                        <TableCell><strong>{item.item_code}</strong></TableCell>
                                        <TableCell>{item.item_name}</TableCell>
                                        <TableCell>{item.warehouse}</TableCell>
                                        <TableCell sx={{ color: C.red, fontWeight: 'bold' }}>{item.quantity}</TableCell>
                                        <TableCell>{item.reorder_level}</TableCell>
                                        <TableCell>
                                            <Chip label="LOW" size="small" color="error" sx={{ fontSize: 10 }} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
            </ResizableTable>
                </>
            )}

            {/* ═══ QUICK ACTIONS ═══════════════════════════════ */}
            <SectionLabel color={C.navy}>Quick Actions</SectionLabel>
            <Grid container spacing={1.5} mb={2}>
                {[
                    { label: 'New Purchase Order', path: '/purchasing/create-purchase-order', color: C.green  },
                    { label: 'New Sales Order',    path: '/sales/create-sales-order',         color: C.orange },
                    { label: 'New Work Order',     path: '/production/create-work-order',     color: C.purple },
                    { label: 'Record Attendance',  path: '/hr-payroll/attendance',            color: C.teal   },
                    { label: 'Stock Movement',     path: '/inventory/stock-movement',         color: C.navy   },
                    { label: 'Create Invoice',     path: '/sales/invoices',                   color: C.red    },
                ].map(link => (
                    <Grid item xs={12} sm={6} md={4} key={link.path}>
                        <Button fullWidth variant="outlined" onClick={() => navigate(link.path)}
                            sx={{
                                py: 1.2, borderColor: link.color, color: link.color,
                                fontWeight: 'bold', borderRadius: 2, borderWidth: 1.5,
                                '&:hover': { backgroundColor: link.color + '10', borderColor: link.color },
                            }}>
                            {link.label}
                        </Button>
                    </Grid>
                ))}
            </Grid>

            {/* Reports */}
            <Grid container spacing={1.5} mb={3}>
                {[
                    { label: 'Production Report', path: '/reports/production', color: C.purple },
                    { label: 'Inventory Report',  path: '/reports/inventory',  color: C.navy   },
                    { label: 'Sales Report',      path: '/reports/sales',      color: C.orange },
                    { label: 'Finance Report',    path: '/reports/finance',    color: C.red    },
                    { label: 'HR Report',         path: '/reports/hr',         color: C.teal   },
                ].map(link => (
                    <Grid item xs={12} sm={6} md={2.4} key={link.path}>
                        <Button fullWidth variant="contained" onClick={() => navigate(link.path)}
                            sx={{
                                py: 1.2, backgroundColor: link.color, fontWeight: 'bold', borderRadius: 2,
                                '&:hover': { backgroundColor: link.color, opacity: 0.88 },
                            }}>
                            {link.label}
                        </Button>
                    </Grid>
                ))}
            </Grid>

            <Divider sx={{ mt: 2, mb: 1.5 }} />
            <Typography variant="caption" color="text.secondary">
                SASI ERP — Medical &amp; Technical Textile &nbsp;|&nbsp;
                Last refreshed: {lastRefresh} &nbsp;|&nbsp; Data updates on page load
            </Typography>
        </Box>
    );
}

export default DashboardPage;
