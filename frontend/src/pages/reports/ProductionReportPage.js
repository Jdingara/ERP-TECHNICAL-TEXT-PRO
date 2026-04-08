// ============================================================
// FILE: pages/reports/ProductionReportPage.js
// PURPOSE: Production report — work orders, batches,
//          monthly output chart, top produced items.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Grid, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert
} from '@mui/material';
import { ResizableTable } from '../../components/common/ResizableTable';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts';
import ReportToolbar from '../../components/common/ReportToolbar';

const API = '/api/reports/production/';
const STATUS_COLOR = { draft:'default', confirmed:'primary', in_progress:'warning', completed:'success', cancelled:'error' };

function KpiCard({ title, value, color }) {
    return (
        <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            <Typography variant="h4" fontWeight="bold" color={color}>{value}</Typography>
        </Paper>
    );
}

function ProductionReportPage() {
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState('');
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
            sheetName: 'Work Orders by Status',
            rows: data.wo_by_status.map(s => ({
                'Status': s.status,
                'Count':  s.count,
            })),
        },
        {
            sheetName: 'Top Produced Items',
            rows: data.top_items.map(t => ({
                'Item Code':      t.item_code,
                'Item Name':      t.item_name,
                'Total Produced': t.total_produced,
            })),
        },
        {
            sheetName: 'Recent Batches',
            rows: data.recent_batches.map(b => ({
                'Batch Number':    b.batch_number,
                'Item Code':       b.item_code,
                'Item Name':       b.item_name,
                'Qty Produced':    b.quantity_produced,
                'Production Date': b.production_date,
            })),
        },
        {
            sheetName: 'Monthly Production',
            rows: data.monthly_production.map(m => ({
                'Month':      m.month,
                'Total Qty':  m.total_qty,
                'Batch Count': m.batch_count,
            })),
        },
    ];

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Production Report</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Work orders, batches, and monthly output summary</Typography>
            <ReportToolbar title="Production_Report" printRef={printRef} onExcel={getExcelData} />
        <Box ref={printRef}>

            {/* KPI Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={6} md={4}><KpiCard title="Total Work Orders" value={data.total_work_orders} color="primary" /></Grid>
                <Grid item xs={6} md={4}><KpiCard title="Completed Work Orders" value={data.completed_work_orders} color="#2e7d32" /></Grid>
                <Grid item xs={6} md={4}><KpiCard title="Total Batches" value={data.total_batches} color="#6a1b9a" /></Grid>
            </Grid>

            <Grid container spacing={3} mb={4}>
                {/* Monthly Production Chart */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={2}>Monthly Production Output (Last 6 Months)</Typography>
                        {data.monthly_production.length === 0 ? (
                            <Typography color="text.secondary" align="center" py={4}>No production data yet</Typography>
                        ) : (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={data.monthly_production}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="total_qty" name="Qty Produced" fill="#1a237e" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Paper>
                </Grid>

                {/* Work Order Status */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={2}>Work Orders by Status</Typography>
                        {data.wo_by_status.map(s => (
                            <Box key={s.status} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                <Chip label={s.status.replace('_',' ').toUpperCase()} size="small" color={STATUS_COLOR[s.status] || 'default'} />
                                <Typography fontWeight="bold">{s.count}</Typography>
                            </Box>
                        ))}
                    </Paper>
                </Grid>
            </Grid>

            {/* Top Produced Items */}
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={2}>Top 5 Produced Items</Typography>
                <ResizableTable storageKey="productionreport">
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: 'action.hover' }}>
                            <TableRow>
                                <TableCell><strong>Item Code</strong></TableCell>
                                <TableCell><strong>Item Name</strong></TableCell>
                                <TableCell align="right"><strong>Total Produced</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.top_items.map((t, i) => (
                                <TableRow key={i} hover>
                                    <TableCell><strong>{t.item_code}</strong></TableCell>
                                    <TableCell>{t.item_name}</TableCell>
                                    <TableCell align="right">{t.total_produced.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </ResizableTable>
            </Paper>

            {/* Recent Batches */}
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={2}>Recent Batches</Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: 'action.hover' }}>
                            <TableRow>
                                <TableCell><strong>Batch Number</strong></TableCell>
                                <TableCell><strong>Item</strong></TableCell>
                                <TableCell align="right"><strong>Qty Produced</strong></TableCell>
                                <TableCell><strong>Production Date</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.recent_batches.map((b, i) => (
                                <TableRow key={i} hover>
                                    <TableCell><strong>{b.batch_number}</strong></TableCell>
                                    <TableCell>{b.item_code} — {b.item_name}</TableCell>
                                    <TableCell align="right">{b.quantity_produced}</TableCell>
                                    <TableCell>{b.production_date}</TableCell>
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

export default ProductionReportPage;
