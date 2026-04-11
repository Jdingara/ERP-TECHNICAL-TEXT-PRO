// ============================================================
// FILE: pages/analytics/CustomerIntelligencePage.js
// PURPOSE: Customer Intelligence Analytics dashboard.
//          Tabs: Overview | RFM Segmentation | Churn Risk |
//                Sales Forecast | Product Intelligence | What-If
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Grid, Card, CardContent,
    Tabs, Tab, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress,
    Alert, Tooltip, LinearProgress, Button, Slider,
    FormControl, InputLabel, Select, MenuItem,
    ToggleButton, ToggleButtonGroup, Checkbox, ListItemText,
    OutlinedInput,
} from '@mui/material';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import TrendingDownIcon  from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon  from '@mui/icons-material/TrendingFlat';
import PeopleIcon        from '@mui/icons-material/People';
import AttachMoneyIcon   from '@mui/icons-material/AttachMoney';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import InsightsIcon      from '@mui/icons-material/Insights';
import CategoryIcon      from '@mui/icons-material/Category';
import ScienceIcon       from '@mui/icons-material/Science';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const API = '/api/analytics';

const fmt = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
const fmtCr = (n) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000)   return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${fmt(n)}`;
};

const SEGMENT_ORDER = ['Champion', 'Loyal', 'Promising', 'New Customer', 'Need Attention', 'Occasional', 'About to Churn', 'At Risk', 'Lost'];
const SEGMENT_COLORS = {
    'Champion':      '#1b5e20',
    'Loyal':         '#2e7d32',
    'Promising':     '#1565c0',
    'New Customer':  '#0277bd',
    'Need Attention':'#e65100',
    'Occasional':    '#546e7a',
    'About to Churn':'#c62828',
    'At Risk':       '#b71c1c',
    'Lost':          '#4a148c',
};

const TREND_ICON = {
    growing:  <TrendingUpIcon fontSize="small" sx={{ color: '#2e7d32' }} />,
    declining:<TrendingDownIcon fontSize="small" sx={{ color: '#b71c1c' }} />,
    stable:   <TrendingFlatIcon fontSize="small" sx={{ color: '#546e7a' }} />,
    new:      <TrendingUpIcon fontSize="small" sx={{ color: '#1565c0' }} />,
};

// ── KPI Card ─────────────────────────────────────────────────
function KPICard({ label, value, sub, icon, color }) {
    return (
        <Card sx={{ borderRadius: 2, boxShadow: 2, height: '100%' }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="body2" color="text.secondary" fontSize={12}>{label}</Typography>
                        <Typography variant="h5" fontWeight="bold" color={color || 'primary.main'} mt={0.5}>
                            {value}
                        </Typography>
                        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
                    </Box>
                    <Box sx={{ color: color || 'primary.main', opacity: 0.8, mt: 0.5 }}>{icon}</Box>
                </Box>
            </CardContent>
        </Card>
    );
}

// ── Overview Tab ──────────────────────────────────────────────
function OverviewTab({ summary, rfmData, churnData }) {
    if (!summary) return <CircularProgress />;

    const segEntries = rfmData?.segments
        ? SEGMENT_ORDER.filter(s => rfmData.segments[s]).map(s => ({
            name: s, ...rfmData.segments[s], fill: SEGMENT_COLORS[s],
          }))
        : [];

    const riskBreakdown = churnData?.summary
        ? ['Critical', 'High', 'Medium', 'Low']
            .filter(r => churnData.summary[r])
            .map(r => ({ name: r, value: churnData.summary[r].count }))
        : [];

    const RISK_COLORS = { Critical: '#b71c1c', High: '#e65100', Medium: '#f57f17', Low: '#2e7d32' };

    return (
        <Box>
            {/* KPI row */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={6} sm={3}>
                    <KPICard label="Total Customers" value={summary.total_customers}
                        sub={`${summary.active_this_fy} active this FY`}
                        icon={<PeopleIcon />} />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <KPICard label="FY Revenue" value={fmtCr(summary.fy_revenue)}
                        sub={`${summary.yoy_growth_pct > 0 ? '+' : ''}${summary.yoy_growth_pct}% vs last FY`}
                        icon={<AttachMoneyIcon />}
                        color={summary.yoy_growth_pct >= 0 ? '#2e7d32' : '#b71c1c'} />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <KPICard label="Repeat Rate" value={`${summary.repeat_customer_rate}%`}
                        sub="Customers with 2+ orders"
                        icon={<InsightsIcon />} color="#1565c0" />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <KPICard label="Avg Order Value" value={fmtCr(summary.average_order_value)}
                        sub={`${summary.total_orders} total orders`}
                        icon={<TrendingUpIcon />} color="#7b1fa2" />
                </Grid>
            </Grid>

            <Grid container spacing={2}>
                {/* Segment donut */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
                        <Typography fontWeight={700} mb={2}>Customer Segments</Typography>
                        {segEntries.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={segEntries} dataKey="count" nameKey="name"
                                        cx="50%" cy="50%" outerRadius={90} label={({ name, count }) => `${name}: ${count}`}>
                                        {segEntries.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                    </Pie>
                                    <RechartsTip formatter={(val, name) => [val, name]} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Typography color="text.secondary" textAlign="center" py={4}>No order data yet</Typography>
                        )}
                    </Paper>
                </Grid>

                {/* Churn risk donut */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
                        <Typography fontWeight={700} mb={2}>Churn Risk Breakdown</Typography>
                        {riskBreakdown.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={riskBreakdown} dataKey="value" nameKey="name"
                                            cx="50%" cy="50%" outerRadius={80}>
                                            {riskBreakdown.map((r, i) => <Cell key={i} fill={RISK_COLORS[r.name]} />)}
                                        </Pie>
                                        <RechartsTip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                                <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                                    {['Critical','High','Medium','Low'].map(r => {
                                        const s = churnData.summary[r];
                                        if (!s) return null;
                                        return (
                                            <Chip key={r} size="small"
                                                label={`${r}: ${s.count} (₹${fmt(s.revenue_at_risk)} at risk)`}
                                                sx={{ backgroundColor: RISK_COLORS[r], color: 'white', fontSize: 11 }} />
                                        );
                                    })}
                                </Box>
                            </>
                        ) : (
                            <Typography color="text.secondary" textAlign="center" py={4}>No order data yet</Typography>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}

// ── RFM Tab ───────────────────────────────────────────────────
function RFMTab({ data }) {
    const [filterSeg, setFilterSeg] = useState('');

    if (!data) return <CircularProgress />;
    const { customers, segments } = data;

    const segEntries = SEGMENT_ORDER.filter(s => segments[s]).map(s => ({
        name: s, ...segments[s], fill: SEGMENT_COLORS[s],
    }));

    const filtered = filterSeg
        ? customers.filter(c => c.segment === filterSeg)
        : customers;

    return (
        <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
                <strong>RFM</strong> scores each customer on <strong>Recency</strong> (how recently they ordered),
                <strong> Frequency</strong> (how often), and <strong>Monetary</strong> (how much they spend).
                Score 5 = best, 1 = worst.
            </Alert>

            {/* Segment chips */}
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Chip label="All" size="small"
                    variant={filterSeg === '' ? 'filled' : 'outlined'}
                    onClick={() => setFilterSeg('')} sx={{ cursor: 'pointer', fontWeight: 600 }} />
                {segEntries.map(s => (
                    <Chip key={s.name} size="small"
                        label={`${s.name} (${s.count})`}
                        variant={filterSeg === s.name ? 'filled' : 'outlined'}
                        onClick={() => setFilterSeg(filterSeg === s.name ? '' : s.name)}
                        sx={{ cursor: 'pointer', backgroundColor: filterSeg === s.name ? s.fill : undefined,
                              color: filterSeg === s.name ? 'white' : undefined, fontWeight: 600 }} />
                ))}
            </Box>

            {/* Bar chart — segment revenue */}
            {segEntries.length > 0 && (
                <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                    <Typography fontWeight={700} mb={1} fontSize={13}>Revenue by Segment</Typography>
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={segEntries} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tickFormatter={v => fmtCr(v)} tick={{ fontSize: 10 }} width={70} />
                            <RechartsTip formatter={v => fmtCr(v)} />
                            <Bar dataKey="revenue" name="Revenue">
                                {segEntries.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Paper>
            )}

            {/* Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            {['Customer', 'City', 'Segment', 'R', 'F', 'M', 'Score', 'Last Order', 'Orders', 'Avg Cycle', 'Total Spend'].map(h => (
                                <TableCell key={h} sx={{ color: 'white', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>No customers found.</TableCell></TableRow>
                        ) : filtered.map(c => (
                            <TableRow key={c.customer_id} hover>
                                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{c.customer_name}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{c.city || '—'}</TableCell>
                                <TableCell>
                                    <Chip label={c.segment} size="small"
                                        sx={{ backgroundColor: c.segment_color, color: 'white', fontSize: 10, fontWeight: 700 }} />
                                </TableCell>
                                <TableCell align="center">
                                    <Box sx={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: `hsl(${(c.r_score - 1) * 30}, 70%, 45%)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>
                                        {c.r_score}
                                    </Box>
                                </TableCell>
                                <TableCell align="center">
                                    <Box sx={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: `hsl(${(c.f_score - 1) * 30}, 70%, 45%)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>
                                        {c.f_score}
                                    </Box>
                                </TableCell>
                                <TableCell align="center">
                                    <Box sx={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: `hsl(${(c.m_score - 1) * 30}, 70%, 45%)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>
                                        {c.m_score}
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{c.rfm_score}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{c.last_order}</TableCell>
                                <TableCell align="center" sx={{ fontSize: 12 }}>{c.order_count}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{c.avg_order_gap_days ? `${c.avg_order_gap_days}d` : '—'}</TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>₹{fmt(c.total_spend)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

// ── Churn Tab ─────────────────────────────────────────────────
function ChurnTab({ data }) {
    const [filterRisk, setFilterRisk] = useState('');

    if (!data) return <CircularProgress />;
    const { customers, summary } = data;

    const filtered = filterRisk
        ? customers.filter(c => c.churn_risk === filterRisk)
        : customers;

    const totalAtRisk = Object.values(summary).reduce((s, v) => s + (v.revenue_at_risk || 0), 0);

    return (
        <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Churn Risk</strong> is calculated by comparing each customer's last purchase date against
                their average purchase cycle. The longer they are overdue, the higher the risk.
            </Alert>

            {/* Risk summary cards */}
            <Grid container spacing={2} mb={2}>
                {['Critical', 'High', 'Medium', 'Low'].map(r => {
                    const s = summary[r] || { count: 0, revenue_at_risk: 0 };
                    const colors = { Critical: '#b71c1c', High: '#e65100', Medium: '#f57f17', Low: '#2e7d32' };
                    return (
                        <Grid item xs={6} sm={3} key={r}>
                            <Card sx={{ borderRadius: 2, borderLeft: `4px solid ${colors[r]}`, cursor: 'pointer',
                                boxShadow: filterRisk === r ? 4 : 1 }}
                                onClick={() => setFilterRisk(filterRisk === r ? '' : r)}>
                                <CardContent sx={{ py: 1.5 }}>
                                    <Typography fontSize={12} color="text.secondary">{r} Risk</Typography>
                                    <Typography fontWeight={700} fontSize={22} color={colors[r]}>{s.count}</Typography>
                                    <Typography fontSize={11} color="text.secondary">₹{fmt(s.revenue_at_risk)} at risk</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2, backgroundColor: 'rgba(183,28,28,0.05)', border: '1px solid rgba(183,28,28,0.2)' }}>
                <Typography fontSize={13} fontWeight={600} color="#b71c1c">
                    Total Revenue at Risk (3-month projection): ₹{fmt(totalAtRisk)}
                </Typography>
            </Paper>

            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            {['Customer', 'City', 'Risk', 'Risk %', 'Last Order', 'Recency', 'Avg Cycle', 'Days Overdue', 'Orders', 'Monthly Revenue', '3-Mo At Risk'].map(h => (
                                <TableCell key={h} sx={{ color: 'white', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>No customers found.</TableCell></TableRow>
                        ) : filtered.map(c => (
                            <TableRow key={c.customer_id} hover>
                                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{c.customer_name}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{c.city || '—'}</TableCell>
                                <TableCell>
                                    <Chip label={c.churn_risk} size="small"
                                        sx={{ backgroundColor: c.churn_risk_color, color: 'white', fontSize: 10, fontWeight: 700 }} />
                                </TableCell>
                                <TableCell sx={{ minWidth: 90 }}>
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <LinearProgress variant="determinate" value={c.churn_risk_pct}
                                            sx={{ flexGrow: 1, height: 6, borderRadius: 3,
                                                '& .MuiLinearProgress-bar': { backgroundColor: c.churn_risk_color } }} />
                                        <Typography fontSize={10}>{c.churn_risk_pct}%</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{c.last_order}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{c.recency_days}d</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{c.avg_cycle_days}d</TableCell>
                                <TableCell sx={{ fontSize: 12, color: c.days_overdue > 0 ? '#b71c1c' : 'inherit', fontWeight: c.days_overdue > 0 ? 700 : 400 }}>
                                    {c.days_overdue > 0 ? `+${c.days_overdue}d` : 'On track'}
                                </TableCell>
                                <TableCell align="center" sx={{ fontSize: 12 }}>{c.order_count}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>₹{fmt(c.monthly_revenue)}</TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 700, color: '#b71c1c' }}>₹{fmt(c.revenue_at_risk)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

// ── Forecast Tab ──────────────────────────────────────────────
function ForecastTab({ data }) {
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [custData, setCustData] = useState(null);
    const [loading, setLoading] = useState(false);

    const loadCustomer = useCallback(async (cid) => {
        if (!cid) { setCustData(null); return; }
        setLoading(true);
        const res  = await fetch(`${API}/forecast/?customer_id=${cid}`, { credentials: 'include' });
        const json = await res.json();
        setCustData(json);
        setLoading(false);
    }, []);

    useEffect(() => { loadCustomer(selectedCustomer); }, [selectedCustomer, loadCustomer]);

    if (!data) return <CircularProgress />;

    const displayData = custData || data;
    const chartData   = [...(displayData.history || []), ...(displayData.forecast || [])];

    const trendColor = { growing: '#2e7d32', declining: '#b71c1c', stable: '#546e7a' };

    return (
        <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
                The shaded area shows <strong>actual monthly revenue</strong>.
                The dashed line shows <strong>3-month forecast</strong> based on linear trend regression.
            </Alert>

            {/* Customer filter */}
            <Box display="flex" gap={2} alignItems="center" mb={2}>
                <FormControl size="small" sx={{ minWidth: 280 }}>
                    <InputLabel>Filter by Customer (optional)</InputLabel>
                    <Select value={selectedCustomer} label="Filter by Customer (optional)"
                        onChange={e => setSelectedCustomer(e.target.value)}>
                        <MenuItem value=""><em>All Customers (Overall)</em></MenuItem>
                        {(data.top_customers || []).map(c => (
                            <MenuItem key={c.customer_id} value={c.customer_id}>
                                {c.customer_name} — ₹{fmt(c.revenue)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {displayData.trend && (
                    <Chip
                        icon={TREND_ICON[displayData.trend]}
                        label={`Trend: ${displayData.trend}`}
                        size="small"
                        sx={{ fontWeight: 700, color: trendColor[displayData.trend] || '#546e7a',
                              border: `1px solid ${trendColor[displayData.trend] || '#546e7a'}` }}
                        variant="outlined"
                    />
                )}
            </Box>

            {loading ? <CircularProgress size={24} /> : (
                <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                    <Typography fontWeight={700} mb={1}>Monthly Revenue + Forecast</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#1565c0" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#1565c0" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis tickFormatter={v => fmtCr(v)} tick={{ fontSize: 10 }} width={70} />
                            <RechartsTip formatter={v => fmtCr(v)} />
                            <Area type="monotone" dataKey="revenue" name="Revenue"
                                stroke="#1565c0" fill="url(#revGrad)" strokeWidth={2}
                                strokeDasharray={(d) => d.forecasted ? '5 5' : '0'}
                                dot={(props) => {
                                    if (props.payload?.forecasted) {
                                        return <circle key={props.key} cx={props.cx} cy={props.cy} r={5}
                                            fill="#f57f17" stroke="white" strokeWidth={2} />;
                                    }
                                    return <circle key={props.key} cx={props.cx} cy={props.cy} r={3}
                                        fill="#1565c0" stroke="white" strokeWidth={1} />;
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                    <Typography fontSize={11} color="text.secondary" textAlign="right">
                        Orange dots = forecasted months
                    </Typography>
                </Paper>
            )}

            {/* Top customers table */}
            {!selectedCustomer && (
                <Paper sx={{ borderRadius: 2, boxShadow: 1 }}>
                    <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography fontWeight={700} fontSize={13}>Top 15 Customers by Revenue</Typography>
                    </Box>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: 'action.hover' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>#</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Customer</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Code</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>Revenue</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: 11 }}>Orders</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>Avg per Order</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(data.top_customers || []).map((c, i) => (
                                <TableRow key={c.customer_id} hover
                                    sx={{ cursor: 'pointer', backgroundColor: selectedCustomer === c.customer_id ? 'action.selected' : undefined }}
                                    onClick={() => setSelectedCustomer(c.customer_id)}>
                                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{i + 1}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{c.customer_name}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{c.customer_code}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>₹{fmt(c.revenue)}</TableCell>
                                    <TableCell align="center" sx={{ fontSize: 12 }}>{c.orders}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: 12 }}>₹{fmt(c.revenue / c.orders)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            )}
        </Box>
    );
}

// ── Products Tab ──────────────────────────────────────────────
function ProductsTab({ data }) {
    const [sortBy, setSortBy] = useState('revenue');
    const [filterTrend, setFilterTrend] = useState('');

    if (!data) return <CircularProgress />;
    const { products } = data;

    const filtered = (filterTrend ? products.filter(p => p.trend === filterTrend) : products)
        .slice().sort((a, b) => b[sortBy] - a[sortBy]);

    const TREND_COLORS = { growing: '#1b5e20', stable: '#546e7a', declining: '#b71c1c', new: '#0277bd' };

    return (
        <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Repeat Rate</strong> = % of customers who bought this product more than once.
                <strong> Trend</strong> compares first-half vs second-half revenue across the product's history.
            </Alert>

            <Box display="flex" gap={2} flexWrap="wrap" mb={2} alignItems="center">
                <ToggleButtonGroup size="small" exclusive value={sortBy} onChange={(_, v) => v && setSortBy(v)}>
                    <ToggleButton value="revenue">By Revenue</ToggleButton>
                    <ToggleButton value="customer_count">By Customers</ToggleButton>
                    <ToggleButton value="repeat_rate">By Repeat Rate</ToggleButton>
                </ToggleButtonGroup>
                <Box display="flex" gap={1}>
                    {['', 'growing', 'stable', 'declining', 'new'].map(t => (
                        <Chip key={t || 'all'} size="small"
                            label={t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All'}
                            onClick={() => setFilterTrend(t)}
                            variant={filterTrend === t ? 'filled' : 'outlined'}
                            sx={{ cursor: 'pointer', fontWeight: 600,
                                  backgroundColor: filterTrend === t && t ? TREND_COLORS[t] : undefined,
                                  color: filterTrend === t && t ? 'white' : undefined }} />
                    ))}
                </Box>
            </Box>

            {/* Top 8 bar chart */}
            {filtered.length > 0 && (
                <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                    <Typography fontWeight={700} mb={1} fontSize={13}>Top Products by {sortBy === 'revenue' ? 'Revenue' : sortBy === 'customer_count' ? 'Customer Count' : 'Repeat Rate'}</Typography>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={filtered.slice(0, 8)} layout="vertical" margin={{ left: 120, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={sortBy === 'revenue' ? v => fmtCr(v) : v => v} tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="item_name" tick={{ fontSize: 11 }} width={120} />
                            <RechartsTip formatter={sortBy === 'revenue' ? v => fmtCr(v) : v => v} />
                            <Bar dataKey={sortBy} name={sortBy} fill="#1565c0" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Paper>
            )}

            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            {['Product', 'Code', 'Type', 'Revenue', 'Qty Sold', 'Customers', 'Repeat Rate', 'Orders', 'Trend'].map(h => (
                                <TableCell key={h} sx={{ color: 'white', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>No products found.</TableCell></TableRow>
                        ) : filtered.map(p => (
                            <TableRow key={p.item_id} hover>
                                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{p.item_name}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{p.item_code}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{p.item_type}</TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>₹{fmt(p.revenue)}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{fmt(p.quantity)}</TableCell>
                                <TableCell align="center" sx={{ fontSize: 12 }}>{p.customer_count}</TableCell>
                                <TableCell sx={{ minWidth: 90 }}>
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <LinearProgress variant="determinate" value={p.repeat_rate}
                                            sx={{ flexGrow: 1, height: 6, borderRadius: 3,
                                                '& .MuiLinearProgress-bar': { backgroundColor: p.repeat_rate > 50 ? '#2e7d32' : '#1565c0' } }} />
                                        <Typography fontSize={10}>{p.repeat_rate}%</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="center" sx={{ fontSize: 12 }}>{p.order_count}</TableCell>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        {TREND_ICON[p.trend]}
                                        <Typography fontSize={11} color={TREND_COLORS[p.trend]}
                                            sx={{ textTransform: 'capitalize' }}>{p.trend}</Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

// ── What-If Tab ───────────────────────────────────────────────
function WhatIfTab({ rfmData }) {
    const [scenario, setScenario] = useState('price_change');
    const [pricePct, setPricePct] = useState(0);
    const [selectedCusts, setSelectedCusts] = useState([]);
    const [upsellAmount, setUpsellAmount] = useState(100000);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const customers = rfmData?.customers || [];

    const run = async () => {
        setLoading(true);
        const body = { scenario };
        if (scenario === 'price_change') body.change_pct = pricePct;
        if (scenario === 'lose_customers') body.customer_ids = selectedCusts;
        if (scenario === 'upsell') { body.customer_ids = selectedCusts; body.target_amount = upsellAmount; }

        const res = await fetch(`${API}/whatif/`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json = await res.json();
        setResult(json);
        setLoading(false);
    };

    const impact = result
        ? result.projected_revenue - result.current_revenue
        : 0;
    const impactPct = result && result.current_revenue
        ? ((impact / result.current_revenue) * 100).toFixed(1)
        : 0;

    const MULTI_SELECT_PROPS = {
        input: <OutlinedInput label="Select Customers" />,
        renderValue: (sel) => `${sel.length} customer(s) selected`,
        MenuProps: { PaperProps: { style: { maxHeight: 300 } } },
    };

    return (
        <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
                <strong>What-If Simulator</strong> lets you explore scenarios and instantly see revenue impact.
                All calculations are based on the last 12 months of order data.
            </Alert>

            <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
                <Typography fontWeight={700} mb={2}>Choose a Scenario</Typography>

                <ToggleButtonGroup exclusive value={scenario}
                    onChange={(_, v) => { if (v) { setScenario(v); setResult(null); } }}
                    sx={{ mb: 3 }}>
                    <ToggleButton value="price_change">Price Change</ToggleButton>
                    <ToggleButton value="lose_customers">Lose Customers</ToggleButton>
                    <ToggleButton value="upsell">Upsell Target</ToggleButton>
                </ToggleButtonGroup>

                {/* Scenario inputs */}
                {scenario === 'price_change' && (
                    <Box>
                        <Typography fontSize={14} mb={1} fontWeight={600}>
                            Price Change: {pricePct > 0 ? '+' : ''}{pricePct}%
                        </Typography>
                        <Slider value={pricePct} min={-30} max={30} step={1}
                            onChange={(_, v) => { setPricePct(v); setResult(null); }}
                            marks={[{ value: -30, label: '-30%' }, { value: 0, label: '0' }, { value: 30, label: '+30%' }]}
                            valueLabelDisplay="auto"
                            sx={{ color: pricePct >= 0 ? '#2e7d32' : '#b71c1c', mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                            Assumes volume stays constant. Move slider to see revenue impact.
                        </Typography>
                    </Box>
                )}

                {scenario === 'lose_customers' && (
                    <Box>
                        <Typography fontSize={14} mb={1} fontWeight={600}>Which customers would you lose?</Typography>
                        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                            <InputLabel>Select Customers</InputLabel>
                            <Select multiple value={selectedCusts}
                                onChange={e => { setSelectedCusts(e.target.value); setResult(null); }}
                                {...MULTI_SELECT_PROPS}>
                                {customers.map(c => (
                                    <MenuItem key={c.customer_id} value={c.customer_id}>
                                        <Checkbox checked={selectedCusts.includes(c.customer_id)} size="small" />
                                        <ListItemText
                                            primary={c.customer_name}
                                            secondary={`${c.segment} — ₹${fmt(c.total_spend)}`}
                                        />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary">
                            Shows how much revenue you'd lose if these customers stopped ordering.
                        </Typography>
                    </Box>
                )}

                {scenario === 'upsell' && (
                    <Box>
                        <Typography fontSize={14} mb={1} fontWeight={600}>
                            Target customers to upsell, and set a new annual target per customer:
                        </Typography>
                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                            <InputLabel>Select Target Customers</InputLabel>
                            <Select multiple value={selectedCusts}
                                onChange={e => { setSelectedCusts(e.target.value); setResult(null); }}
                                {...MULTI_SELECT_PROPS}>
                                {customers.map(c => (
                                    <MenuItem key={c.customer_id} value={c.customer_id}>
                                        <Checkbox checked={selectedCusts.includes(c.customer_id)} size="small" />
                                        <ListItemText
                                            primary={c.customer_name}
                                            secondary={`${c.segment} — current: ₹${fmt(c.total_spend)}`}
                                        />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography fontSize={14} mb={1} fontWeight={600}>
                            Target Annual Revenue per Customer: ₹{fmt(upsellAmount)}
                        </Typography>
                        <Slider value={upsellAmount} min={10000} max={5000000} step={10000}
                            onChange={(_, v) => { setUpsellAmount(v); setResult(null); }}
                            valueLabelDisplay="auto"
                            valueLabelFormat={v => fmtCr(v)}
                            sx={{ mb: 2 }} />
                    </Box>
                )}

                <Button variant="contained" onClick={run} disabled={loading || (scenario !== 'price_change' && selectedCusts.length === 0)}>
                    {loading ? <CircularProgress size={20} /> : 'Run Simulation'}
                </Button>
            </Paper>

            {/* Result */}
            {result && (
                <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography fontWeight={700} mb={2} fontSize={16}>Simulation Result</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <Box textAlign="center" p={2} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                <Typography fontSize={12} color="text.secondary">Current Revenue (12 mo)</Typography>
                                <Typography variant="h5" fontWeight={700} color="primary.main">{fmtCr(result.current_revenue)}</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Box textAlign="center" p={2} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                <Typography fontSize={12} color="text.secondary">Projected Revenue</Typography>
                                <Typography variant="h5" fontWeight={700} color={impact >= 0 ? '#2e7d32' : '#b71c1c'}>
                                    {fmtCr(result.projected_revenue)}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Box textAlign="center" p={2} sx={{ border: '2px solid', borderColor: impact >= 0 ? '#2e7d32' : '#b71c1c', borderRadius: 2 }}>
                                <Typography fontSize={12} color="text.secondary">Impact</Typography>
                                <Typography variant="h5" fontWeight={700} color={impact >= 0 ? '#2e7d32' : '#b71c1c'}>
                                    {impact >= 0 ? '+' : ''}{fmtCr(impact)}
                                </Typography>
                                <Typography fontSize={12} color={impact >= 0 ? '#2e7d32' : '#b71c1c'}>
                                    {impactPct > 0 ? '+' : ''}{impactPct}%
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Scenario-specific details */}
                    {result.scenario === 'lose_customers' && result.customer_names?.length > 0 && (
                        <Box mt={2}>
                            <Typography fontSize={13} color="text.secondary">
                                Customers removed: {result.customer_names.join(', ')}
                            </Typography>
                            <Typography fontSize={13} fontWeight={600} color="#b71c1c" mt={0.5}>
                                Revenue lost: ₹{fmt(result.lost_revenue)} ({result.lost_pct}% of annual revenue)
                            </Typography>
                        </Box>
                    )}
                    {result.scenario === 'upsell' && (
                        <Box mt={2}>
                            <Typography fontSize={13} color="text.secondary">
                                Current revenue from selected customers: ₹{fmt(result.current_from_targets)}
                            </Typography>
                            <Typography fontSize={13} fontWeight={600} color="#2e7d32" mt={0.5}>
                                Projected upsell total: ₹{fmt(result.upsell_total)}
                                {' '}({selectedCusts.length} customers × ₹{fmt(upsellAmount)})
                            </Typography>
                        </Box>
                    )}

                    {/* Visual bar */}
                    <Box mt={2}>
                        <Box display="flex" height={16} borderRadius={2} overflow="hidden">
                            <Box sx={{ flexGrow: result.current_revenue, backgroundColor: '#1565c0' }} />
                            {impact > 0 && <Box sx={{ flexGrow: impact, backgroundColor: '#2e7d32' }} />}
                            {impact < 0 && <Box sx={{ flexGrow: Math.abs(impact), backgroundColor: '#e0e0e0' }} />}
                        </Box>
                        <Box display="flex" justifyContent="space-between" mt={0.5}>
                            <Typography fontSize={11} color="text.secondary">Current</Typography>
                            <Typography fontSize={11} color={impact >= 0 ? '#2e7d32' : '#b71c1c'} fontWeight={700}>
                                {impact >= 0 ? `+${fmtCr(impact)}` : fmtCr(impact)} change
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            )}
        </Box>
    );
}


// ── Main Page ─────────────────────────────────────────────────
export default function CustomerIntelligencePage() {
    const [tab,       setTab]       = useState(0);
    const [summary,   setSummary]   = useState(null);
    const [rfmData,   setRfmData]   = useState(null);
    const [churnData, setChurnData] = useState(null);
    const [foreData,  setForeData]  = useState(null);
    const [prodData,  setProdData]  = useState(null);
    const [error,     setError]     = useState('');

    useEffect(() => {
        const load = async (url, setter) => {
            try {
                const res  = await fetch(url, { credentials: 'include' });
                const json = await res.json();
                setter(json);
            } catch (e) {
                setError('Failed to load analytics data. Make sure the backend is running.');
            }
        };
        load(`${API}/summary/`,  setSummary);
        load(`${API}/rfm/`,      setRfmData);
        load(`${API}/churn/`,    setChurnData);
        load(`${API}/forecast/`, setForeData);
        load(`${API}/products/`, setProdData);
    }, []);

    const TABS = [
        { label: 'Overview',     icon: <InsightsIcon fontSize="small" /> },
        { label: 'RFM Segments', icon: <PeopleIcon fontSize="small" /> },
        { label: 'Churn Risk',   icon: <WarningAmberIcon fontSize="small" /> },
        { label: 'Forecast',     icon: <TrendingUpIcon fontSize="small" /> },
        { label: 'Products',     icon: <CategoryIcon fontSize="small" /> },
        { label: 'What-If',      icon: <ScienceIcon fontSize="small" /> },
    ];

    return (
        <Box sx={{ pb: 4 }}>
            {/* Header */}
            <Box sx={{
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark || theme.palette.primary.main} 0%, ${theme.palette.primary.main} 100%)`,
                borderRadius: 2, p: 2.5, mb: 3, color: 'white',
            }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <InsightsIcon sx={{ fontSize: 32 }} />
                    <Box>
                        <Typography variant="h5" fontWeight="bold">Customer Intelligence</Typography>
                        <Typography fontSize={12} sx={{ opacity: 0.75, mt: 0.3 }}>
                            RFM Segmentation · Churn Prediction · Sales Forecast · Product Analytics · What-If Simulation
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Tabs */}
            <Paper sx={{ borderRadius: 2, mb: 2 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
                    {TABS.map((t, i) => (
                        <Tab key={i} icon={t.icon} iconPosition="start" label={t.label}
                            sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }} />
                    ))}
                </Tabs>
            </Paper>

            {/* Tab panels */}
            <Box>
                {tab === 0 && <OverviewTab summary={summary} rfmData={rfmData} churnData={churnData} />}
                {tab === 1 && <RFMTab data={rfmData} />}
                {tab === 2 && <ChurnTab data={churnData} />}
                {tab === 3 && <ForecastTab data={foreData} />}
                {tab === 4 && <ProductsTab data={prodData} />}
                {tab === 5 && <WhatIfTab rfmData={rfmData} />}
            </Box>
        </Box>
    );
}
