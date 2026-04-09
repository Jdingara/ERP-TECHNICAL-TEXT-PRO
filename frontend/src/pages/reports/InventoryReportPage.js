// ============================================================
// FILE: pages/reports/InventoryReportPage.js
// PURPOSE: Inventory report — stock levels, low stock,
//          movement summary, top stock items.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Grid, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert
} from '@mui/material';
import { ResizableChartPanel } from '../../components/common/ResizableChartPanel';
import { ResizablePanelRowInner } from '../../components/common/ResizablePanelRow';
import { useColumnResize } from '../../components/common/useColumnResize';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import ReportToolbar from '../../components/common/ReportToolbar';

const API = '/api/reports/inventory/';
const PIE_COLORS = ['primary.main','#2e7d32','#e65100','#6a1b9a','#00838f','#c62828'];

function KpiCard({ title, value, color }) {
    return (
        <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            <Typography variant="h4" fontWeight="bold" color={color}>{value}</Typography>
        </Paper>
    );
}

function InventoryReportPage() {
    const { widths, Resizer } = useColumnResize("inventoryreport", [100, 180, 150, 80]);
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
            sheetName: 'Top Stock Items',
            rows: data.top_stock_items.map(t => ({
                'Item Code': t.item_code,
                'Item Name': t.item_name,
                'Type':      t.item_type,
                'Total Qty': t.total_qty,
            })),
        },
        {
            sheetName: 'Low Stock Items',
            rows: data.low_stock_items.map(l => ({
                'Item Code':   l.item_code,
                'Item Name':   l.item_name,
                'Warehouse':   l.warehouse,
                'Current Qty': l.quantity,
            })),
        },
        {
            sheetName: 'Movement Summary',
            rows: data.movement_summary.map(m => ({
                'Movement Type': m.movement_type,
                'Count':         m.count,
                'Total Qty':     m.total_qty,
            })),
        },
    ];

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Inventory Report</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Stock levels, movements, and low stock analysis</Typography>
            <ReportToolbar title="Inventory_Report" printRef={printRef} onExcel={getExcelData} />
        <Box ref={printRef}>

            <Grid container spacing={3} mb={4}>
                <Grid item xs={6} md={6}><KpiCard title="Total Stock Items" value={data.total_stock_items} color="primary" /></Grid>
                <Grid item xs={6} md={6}><KpiCard title="Low Stock Items" value={data.low_stock_count} color="#e53935" /></Grid>
            </Grid>

            <ResizablePanelRowInner storageKey="inventoryreport_charts" defaultPercents={[50,50]}>
                {/* Stock by Item Type Pie */}
                <ResizableChartPanel storageKey="inventoryreport_stock_by_item_type" title="Stock by Item Type" defaultHeight={280}>
                        {data.stock_by_type.length === 0 ? (
                            <Typography color="text.secondary" align="center" py={4}>No stock data yet</Typography>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.stock_by_type} dataKey="total_items" nameKey="item_type"
                                        cx="50%" cy="50%" outerRadius={80} label={({ item_type, total_items }) => `${item_type}: ${total_items}`}>
                                        {data.stock_by_type.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </ResizableChartPanel>

                {/* Movement Summary */}
                <ResizableChartPanel storageKey="inventoryreport_stock_movements__last_30_" title="Stock Movements (Last 30 Days)" defaultHeight={280}>
                        {data.movement_summary.length === 0 ? (
                            <Typography color="text.secondary" align="center" py={4}>No movements in last 30 days</Typography>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.movement_summary} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="movement_type" type="category" tick={{ fontSize: 11 }} width={110} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Count" fill="#1a237e" radius={[0,4,4,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ResizableChartPanel>
            </ResizablePanelRowInner>

            {/* Low Stock Alert Table */}
            {data.low_stock_items.length > 0 && (
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="#e53935" mb={2}>Low Stock Items (Qty ≤ 10)</Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: '#ffebee' }}>
                                <TableRow>
                                    <TableCell><strong>Item Code</strong></TableCell>
                                    <TableCell><strong>Item Name</strong></TableCell>
                                    <TableCell><strong>Warehouse</strong></TableCell>
                                    <TableCell align="right"><strong>Current Qty</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.low_stock_items.map((item, i) => (
                                    <TableRow key={i} sx={{ backgroundColor: '#fff8f8' }}>
                                        <TableCell><strong>{item.item_code}</strong></TableCell>
                                        <TableCell>{item.item_name}</TableCell>
                                        <TableCell>{item.warehouse}</TableCell>
                                        <TableCell align="right" sx={{ color: '#e53935', fontWeight: 'bold' }}>{item.quantity}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Top Stock Items */}
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={2}>Top 10 Items by Stock Quantity</Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: '#1e3a5f', '& th': { color: '#ffffff', fontWeight: 700, fontSize: 12.5 } }}>
                            <TableRow>
                                <TableCell><strong>Item Code</strong></TableCell>
                                <TableCell><strong>Item Name</strong></TableCell>
                                <TableCell><strong>Type</strong></TableCell>
                                <TableCell align="right"><strong>Total Qty</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.top_stock_items.map((t, i) => (
                                <TableRow key={i} hover>
                                    <TableCell><strong>{t.item_code}</strong></TableCell>
                                    <TableCell>{t.item_name}</TableCell>
                                    <TableCell><Chip label={t.item_type} size="small" variant="outlined" /></TableCell>
                                    <TableCell align="right">{t.total_qty.toFixed(2)}</TableCell>
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

export default InventoryReportPage;
