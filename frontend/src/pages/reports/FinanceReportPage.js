// ============================================================
// FILE: pages/reports/FinanceReportPage.js
// PURPOSE: Finance report — accounts by category,
//          journal entry activity, monthly trends.
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
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import ReportToolbar from '../../components/common/ReportToolbar';

const API = '/api/reports/finance/';
const PIE_COLORS = ['primary.main','#2e7d32','#e65100','#6a1b9a','#c62828'];
const CATEGORY_COLOR = { asset:'primary.main', liability:'#c62828', equity:'#2e7d32', income:'#e65100', expense:'#6a1b9a' };

function KpiCard({ title, value, color }) {
    return (
        <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            <Typography variant="h4" fontWeight="bold" color={color}>{value}</Typography>
        </Paper>
    );
}

function FinanceReportPage() {
    const { widths, Resizer } = useColumnResize("financereport", [100, 180, 150, 80]);
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
            sheetName: 'Account Balances',
            rows: data.accounts_by_category.map(c => ({
                'Category':       c.category,
                'No. of Accounts': c.account_count,
                'Total Balance (₹)': c.total_balance,
            })),
        },
        {
            sheetName: 'Journal Entries',
            rows: data.recent_entries.map(e => ({
                'Entry No.':   e.entry_number,
                'Date':        e.entry_date,
                'Description': e.description,
                'Amount (₹)':  e.total_debit,
                'Status':      e.status,
            })),
        },
        {
            sheetName: 'Monthly Activity',
            rows: data.monthly_entries.map(m => ({
                'Month':        m.month,
                'Entries':      m.count,
                'Total Debit (₹)': m.total_debit,
            })),
        },
    ];

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Finance Report</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Accounts, journal entries, and financial activity summary</Typography>
            <ReportToolbar title="Finance_Report" printRef={printRef} onExcel={getExcelData} />
        <Box ref={printRef}>

            <Grid container spacing={3} mb={4}>
                <Grid item xs={6} md={4}><KpiCard title="Total Accounts" value={data.total_accounts} color="primary" /></Grid>
                <Grid item xs={6} md={4}><KpiCard title="Total Journal Entries" value={data.total_journal_entries} color="#6a1b9a" /></Grid>
                <Grid item xs={6} md={4}><KpiCard title="Posted Entries" value={data.posted_entries} color="#2e7d32" /></Grid>
            </Grid>

            <ResizablePanelRowInner storageKey="financereport_charts" defaultPercents={[50,50]}>
                {/* Accounts by Category Pie */}
                <ResizableChartPanel storageKey="financereport_accounts_by_category" title="Accounts by Category" defaultHeight={280}>
                        {data.accounts_by_category.length === 0 ? (
                            <Typography color="text.secondary" align="center" py={4}>No accounts yet</Typography>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.accounts_by_category} dataKey="account_count"
                                        nameKey="category" cx="50%" cy="50%" outerRadius={85}
                                        label={({ category, account_count }) => `${category}: ${account_count}`}>
                                        {data.accounts_by_category.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </ResizableChartPanel>

                {/* Monthly Journal Entry Activity */}
                <ResizableChartPanel storageKey="financereport_journal_entries___last_6_" title="Journal Entries — Last 6 Months" defaultHeight={280}>
                        {data.monthly_entries.length === 0 ? (
                            <Typography color="text.secondary" align="center" py={4}>No journal entries yet</Typography>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.monthly_entries}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Entries" fill="#6a1b9a" radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ResizableChartPanel>
            </ResizablePanelRowInner>

            {/* Account Balances by Category */}
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={2}>Account Balances by Category</Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: '#1e3a5f', '& th': { color: '#ffffff', fontWeight: 700, fontSize: 12.5 } }}>
                            <TableRow>
                                <TableCell><strong>Category</strong></TableCell>
                                <TableCell align="right"><strong>No. of Accounts</strong></TableCell>
                                <TableCell align="right"><strong>Total Balance (₹)</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.accounts_by_category.map((c, i) => (
                                <TableRow key={i} hover>
                                    <TableCell>
                                        <Chip label={c.category.toUpperCase()} size="small"
                                            sx={{ backgroundColor: CATEGORY_COLOR[c.category] || '#555', color: 'white' }} />
                                    </TableCell>
                                    <TableCell align="right">{c.account_count}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                        ₹{c.total_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Recent Journal Entries */}
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={2}>Recent Journal Entries (Last 30 Days)</Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: '#1e3a5f', '& th': { color: '#ffffff', fontWeight: 700, fontSize: 12.5 } }}>
                            <TableRow>
                                <TableCell><strong>Entry No.</strong></TableCell>
                                <TableCell><strong>Date</strong></TableCell>
                                <TableCell><strong>Description</strong></TableCell>
                                <TableCell align="right"><strong>Amount (₹)</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.recent_entries.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>No entries in last 30 days</TableCell></TableRow>
                            ) : data.recent_entries.map((e, i) => (
                                <TableRow key={i} hover>
                                    <TableCell><strong>{e.entry_number}</strong></TableCell>
                                    <TableCell>{e.entry_date}</TableCell>
                                    <TableCell>{e.description}</TableCell>
                                    <TableCell align="right">₹{e.total_debit.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Chip label={e.status.toUpperCase()} size="small" color={e.status === 'posted' ? 'success' : 'default'} />
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

export default FinanceReportPage;
