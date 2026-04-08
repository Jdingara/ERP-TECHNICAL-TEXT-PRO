// ============================================================
// FILE: pages/reports/SalesReportPage.js
// PURPOSE: Sales report — monthly sales chart, top customers,
//          order status breakdown, invoice summary.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Grid, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert
} from '@mui/material';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line
} from 'recharts';
import ReportToolbar from '../../components/common/ReportToolbar';

const API = '/api/reports/sales/';
const STATUS_COLOR = { draft:'default', confirmed:'primary', partial:'warning', delivered:'success', cancelled:'error' };

function KpiCard({ title, value, subtitle, color }) {
    return (
        <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            <Typography variant="h4" fontWeight="bold" color={color}>{value}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Paper>
    );
}

function SalesReportPage() {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');
    const printRef = useRef();

    useEffect(() => {
        fetch(API, { credentials: 'include' })
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => { setError('Failed to load report.'); setLoading(false); });
    }, []);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
    if (error)   return <Alert severity="error">{error}</Alert>;

    const getExcelData = () => [
        {
            sheetName: 'Sales Orders',
            rows: data.recent_orders.map(o => ({
                'SO Number':   o.so_number,
                'Customer':    o.customer,
                'Order Date':  o.order_date,
                'Amount (₹)':  o.total_amount,
                'Status':      o.status,
            })),
        },
        {
            sheetName: 'Top Customers',
            rows: data.top_customers.map(c => ({
                'Customer':      c.customer,
                'Orders':        c.order_count,
                'Total Value (₹)': c.total_value,
            })),
        },
        {
            sheetName: 'Monthly Sales',
            rows: data.monthly_sales.map(m => ({
                'Month':         m.month,
                'Orders':        m.order_count,
                'Total Value (₹)': m.total_value,
            })),
        },
    ];

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="#1a237e" mb={1}>Sales Report</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Monthly sales, top customers, and order status analysis</Typography>
            <ReportToolbar title="Sales_Report" printRef={printRef} onExcel={getExcelData} />
        <Box ref={printRef}>

            <Grid container spacing={3} mb={4}>
                <Grid item xs={6} md={3}><KpiCard title="Total Sales Orders" value={data.total_sales_orders} color="#1a237e" /></Grid>
                <Grid item xs={6} md={3}><KpiCard title="Delivered Orders" value={data.delivered_orders} color="#2e7d32" /></Grid>
                <Grid item xs={6} md={3}><KpiCard title="Pending Invoices" value={data.pending_invoices} color="#e65100" /></Grid>
                <Grid item xs={6} md={3}><KpiCard title="Paid Invoices" value={data.paid_invoices} color="#2e7d32" /></Grid>
            </Grid>

            {/* Monthly Sales Chart */}
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="#1a237e" mb={2}>Monthly Sales Value — Last 6 Months (₹)</Typography>
                {data.monthly_sales.length === 0 ? (
                    <Typography color="text.secondary" align="center" py={4}>No sales data yet</Typography>
                ) : (
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={data.monthly_sales}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                            <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Sales Value']} />
                            <Bar dataKey="total_value" name="Sales Value" fill="#e65100" radius={[4,4,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </Paper>

            <Grid container spacing={3} mb={3}>
                {/* Top Customers */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="#1a237e" mb={2}>Top 5 Customers by Order Value</Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead sx={{ backgroundColor: '#e8eaf6' }}>
                                    <TableRow>
                                        <TableCell><strong>Customer</strong></TableCell>
                                        <TableCell align="right"><strong>Orders</strong></TableCell>
                                        <TableCell align="right"><strong>Total Value (₹)</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.top_customers.length === 0 ? (
                                        <TableRow><TableCell colSpan={3} align="center" sx={{ color:'text.secondary' }}>No data yet</TableCell></TableRow>
                                    ) : data.top_customers.map((c, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell><strong>{c.customer}</strong></TableCell>
                                            <TableCell align="right">{c.order_count}</TableCell>
                                            <TableCell align="right">₹{c.total_value.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                {/* Status Breakdown */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="#1a237e" mb={2}>Orders by Status</Typography>
                        {data.sales_by_status.map(s => (
                            <Box key={s.status} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                <Chip label={s.status.toUpperCase()} size="small" color={STATUS_COLOR[s.status] || 'default'} />
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="body2" fontWeight="bold">{s.count} orders</Typography>
                                    <Typography variant="caption" color="text.secondary">₹{(s.total || 0).toLocaleString()}</Typography>
                                </Box>
                            </Box>
                        ))}
                    </Paper>
                </Grid>
            </Grid>

            {/* Recent Orders */}
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="#1a237e" mb={2}>Recent Sales Orders</Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: '#e8eaf6' }}>
                            <TableRow>
                                <TableCell><strong>SO Number</strong></TableCell>
                                <TableCell><strong>Customer</strong></TableCell>
                                <TableCell><strong>Order Date</strong></TableCell>
                                <TableCell align="right"><strong>Amount (₹)</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.recent_orders.map((o, i) => (
                                <TableRow key={i} hover>
                                    <TableCell><strong>{o.so_number}</strong></TableCell>
                                    <TableCell>{o.customer}</TableCell>
                                    <TableCell>{o.order_date}</TableCell>
                                    <TableCell align="right">₹{o.total_amount.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Chip label={o.status.toUpperCase()} size="small" color={STATUS_COLOR[o.status] || 'default'} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box> {/* end printRef Box */}
        </Box>
    );
}

export default SalesReportPage;
