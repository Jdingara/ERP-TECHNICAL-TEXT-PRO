// ============================================================
// FILE: pages/dashboard/DashboardPage.js
// PURPOSE: Main dashboard — live KPI numbers from all modules.
//          Shows: stock, POs, SOs, work orders, employees,
//          medical textile alerts, technical textile stats,
//          low stock table, charts, and quick actions.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Alert, CircularProgress, Divider, Button
} from '@mui/material';
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
import AssessmentIcon       from '@mui/icons-material/Assessment';
import { useNavigate }      from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon, color, onClick }) {
    return (
        <Card
            sx={{ borderRadius: 2, boxShadow: 2, cursor: onClick ? 'pointer' : 'default',
                  '&:hover': onClick ? { boxShadow: 4 } : {} }}
            onClick={onClick}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary" mb={0.5}>{title}</Typography>
                        <Typography variant="h4" fontWeight="bold" color={color}>{value}</Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
                        )}
                    </Box>
                    <Box sx={{ backgroundColor: color + '18', p: 1.5, borderRadius: 2 }}>
                        {React.cloneElement(icon, { sx: { color, fontSize: 32 } })}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
}

// ─── Section Title ────────────────────────────────────────────
function SectionTitle({ children }) {
    return (
        <Typography variant="h6" fontWeight="bold" color="#1a237e" mb={2} mt={4}>
            {children}
        </Typography>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────
function DashboardPage() {
    const navigate = useNavigate();
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    useEffect(() => { fetchDashboard(); }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/authentication/dashboard-summary/', {
                credentials: 'include'
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || `Server error ${res.status}`);
            setData(json);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    // ── Chart data ──────────────────────────────────────────
    const moduleBarData = [
        { name: 'Stock Items',  value: data.total_stock_items,    fill: '#1a237e' },
        { name: 'Open POs',     value: data.open_purchase_orders, fill: '#2e7d32' },
        { name: 'Open SOs',     value: data.open_sales_orders,    fill: '#e65100' },
        { name: 'Work Orders',  value: data.active_work_orders,   fill: '#6a1b9a' },
        { name: 'Employees',    value: data.total_employees,      fill: '#00838f' },
        { name: 'Open CAPAs',   value: data.open_capas,           fill: '#c62828' },
        { name: 'R&D Projects', value: data.active_rd_projects,   fill: '#00695c' },
    ];

    const stockPieData = [
        { name: 'Normal Stock',    value: Math.max(0, data.total_stock_items - data.low_stock_count) },
        { name: 'Low Stock Alert', value: data.low_stock_count },
    ];
    const PIE_COLORS = ['#2e7d32', '#e53935'];

    // Medical alerts: show banner if any critical items
    const medicalAlerts = data.open_capas + data.expiring_certs + data.near_expiry_batches;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight="bold" color="#1a237e">Dashboard</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Live overview of your ERP — click any card to go to that module
                    </Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={fetchDashboard}>
                    Refresh
                </Button>
            </Box>

            {/* Low Stock Alert Banner */}
            {data.low_stock_count > 0 && (
                <Alert
                    severity="warning"
                    icon={<WarningAmberIcon />}
                    sx={{ mb: 2 }}
                    action={
                        <Button color="inherit" size="small" onClick={() => navigate('/inventory/stock-list')}>
                            VIEW STOCK
                        </Button>
                    }>
                    <strong>{data.low_stock_count} item(s)</strong> are running low on stock — reorder needed.
                </Alert>
            )}

            {/* Medical Textile Alert Banner */}
            {medicalAlerts > 0 && (
                <Alert
                    severity="error"
                    icon={<AssignmentLateIcon />}
                    sx={{ mb: 3 }}>
                    Medical Textile alerts:
                    {data.open_capas > 0 && <> &nbsp;<strong>{data.open_capas} open CAPA(s)</strong></>}
                    {data.expiring_certs > 0 && <> &nbsp;·&nbsp;<strong>{data.expiring_certs} certificate(s) expiring soon</strong></>}
                    {data.near_expiry_batches > 0 && <> &nbsp;·&nbsp;<strong>{data.near_expiry_batches} batch(es) near/past expiry</strong></>}
                </Alert>
            )}

            {/* ── Core KPI Cards ── */}
            <SectionTitle>Core Operations</SectionTitle>
            <Grid container spacing={3} mb={2}>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <KpiCard
                        title="Stock Items"
                        value={data.total_stock_items}
                        subtitle={data.low_stock_count > 0 ? `${data.low_stock_count} low stock` : 'All levels OK'}
                        icon={<InventoryIcon />}
                        color="#1a237e"
                        onClick={() => navigate('/inventory/stock-list')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <KpiCard
                        title="Open Purchase Orders"
                        value={data.open_purchase_orders}
                        subtitle="Draft + Confirmed + Partial"
                        icon={<ShoppingCartIcon />}
                        color="#2e7d32"
                        onClick={() => navigate('/purchasing/purchase-orders')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <KpiCard
                        title="Open Sales Orders"
                        value={data.open_sales_orders}
                        subtitle="Draft + Confirmed"
                        icon={<PointOfSaleIcon />}
                        color="#e65100"
                        onClick={() => navigate('/sales/sales-orders')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <KpiCard
                        title="Active Work Orders"
                        value={data.active_work_orders}
                        subtitle="Confirmed + In Progress"
                        icon={<FactoryIcon />}
                        color="#6a1b9a"
                        onClick={() => navigate('/production/work-orders')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <KpiCard
                        title="Total Employees"
                        value={data.total_employees}
                        subtitle="Active employees"
                        icon={<PeopleIcon />}
                        color="#00838f"
                        onClick={() => navigate('/hr-payroll/employees')}
                    />
                </Grid>
            </Grid>

            {/* ── Medical & Technical Textile KPI Cards ── */}
            <SectionTitle>Medical &amp; Technical Textile</SectionTitle>
            <Grid container spacing={3} mb={2}>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <KpiCard
                        title="Open CAPAs"
                        value={data.open_capas}
                        subtitle="Open + In Progress + Overdue"
                        icon={<AssignmentLateIcon />}
                        color={data.open_capas > 0 ? '#c62828' : '#2e7d32'}
                        onClick={() => navigate('/medical-textile/capa')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <KpiCard
                        title="Expiring Certificates"
                        value={data.expiring_certs}
                        subtitle="Expiring within 90 days"
                        icon={<VerifiedIcon />}
                        color={data.expiring_certs > 0 ? '#e65100' : '#2e7d32'}
                        onClick={() => navigate('/medical-textile/compliance')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <KpiCard
                        title="Shelf Life Alerts"
                        value={data.near_expiry_batches}
                        subtitle="Near expiry or expired batches"
                        icon={<EventBusyIcon />}
                        color={data.near_expiry_batches > 0 ? '#c62828' : '#2e7d32'}
                        onClick={() => navigate('/medical-textile/shelf-life')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <KpiCard
                        title="Pending Samples"
                        value={data.pending_samples}
                        subtitle="Prepared + Sent to customer"
                        icon={<BiotechIcon />}
                        color="#00695c"
                        onClick={() => navigate('/technical-textile/samples')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <KpiCard
                        title="Active R&D Projects"
                        value={data.active_rd_projects}
                        subtitle="Active + Testing phase"
                        icon={<ScienceIcon />}
                        color="#1565c0"
                        onClick={() => navigate('/technical-textile/rd-projects')}
                    />
                </Grid>
            </Grid>

            {/* ── Charts Row ── */}
            <SectionTitle>Module Activity Overview</SectionTitle>
            <Grid container spacing={3} mb={2}>
                {/* Bar Chart */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" mb={2} color="#1a237e">
                            Live Counts by Module
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={moduleBarData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                                    {moduleBarData.map((entry, index) => (
                                        <Cell key={index} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Pie Chart */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight="bold" mb={2} color="#1a237e">
                            Stock Health
                        </Typography>
                        {data.total_stock_items === 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                                <Typography color="text.secondary" variant="body2">No stock data yet</Typography>
                            </Box>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={stockPieData}
                                        cx="50%" cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        dataKey="value"
                                        label={({ name, value }) => value > 0 ? `${value}` : ''}>
                                        {stockPieData.map((_, index) => (
                                            <Cell key={index} fill={PIE_COLORS[index]} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* ── Low Stock Alert Table ── */}
            {data.low_stock_items.length > 0 && (
                <>
                    <SectionTitle>Low Stock Alerts</SectionTitle>
                    <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2, mb: 3 }}>
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: '#e53935' }}>
                                <TableRow>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Item Code</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Item Name</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Warehouse</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Current Qty</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Reorder Level</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.low_stock_items.map((item, i) => (
                                    <TableRow key={i} sx={{ backgroundColor: '#fff8f8' }}>
                                        <TableCell><strong>{item.item_code}</strong></TableCell>
                                        <TableCell>{item.item_name}</TableCell>
                                        <TableCell>{item.warehouse}</TableCell>
                                        <TableCell align="right" sx={{ color: '#e53935', fontWeight: 'bold' }}>
                                            {item.quantity}
                                        </TableCell>
                                        <TableCell align="right">{item.reorder_level}</TableCell>
                                        <TableCell>
                                            <Chip label="LOW STOCK" size="small" color="error" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}

            {/* ── Quick Actions ── */}
            <SectionTitle>Quick Actions</SectionTitle>
            <Grid container spacing={2} mb={3}>
                {[
                    { label: 'New Purchase Order', path: '/purchasing/create-purchase-order', color: '#2e7d32' },
                    { label: 'New Sales Order',    path: '/sales/create-sales-order',         color: '#e65100' },
                    { label: 'New Work Order',     path: '/production/create-work-order',     color: '#6a1b9a' },
                    { label: 'Record Attendance',  path: '/hr-payroll/attendance',            color: '#00838f' },
                    { label: 'Stock Movement',     path: '/inventory/stock-movement',         color: '#1a237e' },
                    { label: 'Journal Entry',      path: '/finance/journal-entries',          color: '#c62828' },
                ].map((link) => (
                    <Grid item xs={12} sm={6} md={4} key={link.path}>
                        <Button
                            fullWidth variant="outlined"
                            onClick={() => navigate(link.path)}
                            sx={{
                                py: 1.5, borderColor: link.color, color: link.color,
                                fontWeight: 'bold', borderRadius: 2,
                                '&:hover': { backgroundColor: link.color + '10', borderColor: link.color }
                            }}>
                            {link.label}
                        </Button>
                    </Grid>
                ))}
            </Grid>

            {/* ── Reports Quick Links ── */}
            <SectionTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssessmentIcon sx={{ color: '#1a237e' }} />
                    Reports
                </Box>
            </SectionTitle>
            <Grid container spacing={2}>
                {[
                    { label: 'Production Report', path: '/reports/production', color: '#6a1b9a' },
                    { label: 'Inventory Report',  path: '/reports/inventory',  color: '#1a237e' },
                    { label: 'Sales Report',      path: '/reports/sales',      color: '#e65100' },
                    { label: 'Finance Report',    path: '/reports/finance',    color: '#c62828' },
                    { label: 'HR Report',         path: '/reports/hr',         color: '#00838f' },
                ].map((link) => (
                    <Grid item xs={12} sm={6} md={2.4} key={link.path}>
                        <Button
                            fullWidth variant="contained"
                            onClick={() => navigate(link.path)}
                            sx={{
                                py: 1.5, backgroundColor: link.color, fontWeight: 'bold',
                                borderRadius: 2,
                                '&:hover': { backgroundColor: link.color, opacity: 0.9 }
                            }}>
                            {link.label}
                        </Button>
                    </Grid>
                ))}
            </Grid>

            <Divider sx={{ mt: 4, mb: 2 }} />
            <Typography variant="caption" color="text.secondary">
                SASI ERP — Medical &amp; Technical Textile &nbsp;|&nbsp; Data refreshes on page load. Click Refresh for latest.
            </Typography>
        </Box>
    );
}

export default DashboardPage;
