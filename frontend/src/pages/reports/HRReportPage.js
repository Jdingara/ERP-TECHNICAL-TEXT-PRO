// ============================================================
// FILE: pages/reports/HRReportPage.js
// PURPOSE: HR report — employee count, salary summary,
//          attendance breakdown, department distribution.
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

const API = '/api/reports/hr/';
const PIE_COLORS = ['primary.main','#2e7d32','#e65100','#6a1b9a','#00838f','#c62828'];
const ATTENDANCE_COLOR = { present: '#2e7d32', absent: '#c62828', half_day: '#e65100', leave: '#6a1b9a' };

function KpiCard({ title, value, color }) {
    return (
        <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            <Typography variant="h4" fontWeight="bold" color={color}>{value}</Typography>
        </Paper>
    );
}

function HRReportPage() {
    const { widths, Resizer } = useColumnResize("hrreport", [100, 180, 150, 80]);
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
            sheetName: 'Employees by Dept',
            rows: data.employees_by_dept.map(d => ({
                'Department': d.department,
                'Count':      d.count,
            })),
        },
        {
            sheetName: 'Salary Summary',
            rows: data.salary_summary.map(s => ({
                'Period':        s.period,
                'Employees':     s.employee_count,
                'Gross (₹)':     s.total_gross,
                'Net (₹)':       s.total_net,
                'PF (₹)':        s.total_pf,
                'ESI (₹)':       s.total_esi,
            })),
        },
        {
            sheetName: 'Salary Records',
            rows: data.recent_salary.map(s => ({
                'Employee':  s.employee,
                'Code':      s.emp_code,
                'Period':    s.period,
                'Gross (₹)': s.gross,
                'Net (₹)':   s.net,
                'Status':    s.status,
            })),
        },
    ];

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>HR Report</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>Employee strength, salary summary, and attendance analysis</Typography>
            <ReportToolbar title="HR_Report" printRef={printRef} onExcel={getExcelData} />
        <Box ref={printRef}>

            <Grid container spacing={3} mb={4}>
                <Grid item xs={6} md={6}><KpiCard title="Total Active Employees" value={data.total_employees} color="primary" /></Grid>
                <Grid item xs={6} md={6}><KpiCard title="Total Departments" value={data.total_departments} color="#2e7d32" /></Grid>
            </Grid>

            <ResizablePanelRowInner storageKey="hrreport_charts" defaultPercents={[50,50]}>
                {/* Employees by Department */}
                <ResizableChartPanel storageKey="hrreport_employees_by_department" title="Employees by Department" defaultHeight={280}>
                        {data.employees_by_dept.length === 0 ? (
                            <Typography color="text.secondary" align="center" py={4}>No department data yet</Typography>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.employees_by_dept} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis dataKey="department" type="category" tick={{ fontSize: 11 }} width={100} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Employees" fill="#1a237e" radius={[0,4,4,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ResizableChartPanel>

                {/* Attendance This Month */}
                <ResizableChartPanel storageKey="hrreport_attendance_this_month" title="Attendance This Month" defaultHeight={280}>
                        {data.attendance_this_month.length === 0 ? (
                            <Typography color="text.secondary" align="center" py={4}>No attendance records this month</Typography>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.attendance_this_month} dataKey="count" nameKey="status"
                                        cx="50%" cy="50%" outerRadius={85}
                                        label={({ status, count }) => `${status}: ${count}`}>
                                        {data.attendance_this_month.map((entry, i) => (
                                            <Cell key={i} fill={ATTENDANCE_COLOR[entry.status] || PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </ResizableChartPanel>
            </ResizablePanelRowInner>

            {/* Salary Summary */}
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={2}>Salary Summary (Last 6 Months)</Typography>
                {data.salary_summary.length === 0 ? (
                    <Typography color="text.secondary" align="center" py={3}>No salary records processed yet</Typography>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data.salary_summary}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                                <Tooltip formatter={v => [`₹${v.toLocaleString()}`, '']} />
                                <Bar dataKey="total_gross" name="Gross Salary" fill="#1a237e" radius={[4,4,0,0]} />
                                <Bar dataKey="total_net" name="Net Salary" fill="#2e7d32" radius={[4,4,0,0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        <TableContainer sx={{ mt: 2 }}>
                            <Table size="small">
                                <TableHead sx={{ backgroundColor: 'action.hover' }}>
                                    <TableRow>
                                        <TableCell><strong>Period</strong></TableCell>
                                        <TableCell align="right"><strong>Employees</strong></TableCell>
                                        <TableCell align="right"><strong>Gross (₹)</strong></TableCell>
                                        <TableCell align="right"><strong>Net (₹)</strong></TableCell>
                                        <TableCell align="right"><strong>PF (₹)</strong></TableCell>
                                        <TableCell align="right"><strong>ESI (₹)</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.salary_summary.map((s, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell><strong>{s.period}</strong></TableCell>
                                            <TableCell align="right">{s.employee_count}</TableCell>
                                            <TableCell align="right">₹{s.total_gross.toLocaleString()}</TableCell>
                                            <TableCell align="right">₹{s.total_net.toLocaleString()}</TableCell>
                                            <TableCell align="right">₹{s.total_pf.toLocaleString()}</TableCell>
                                            <TableCell align="right">₹{s.total_esi.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </Paper>

            {/* Recent Salary Records */}
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={2}>Recent Salary Records</Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: 'action.hover' }}>
                            <TableRow>
                                <TableCell><strong>Employee</strong></TableCell>
                                <TableCell><strong>Code</strong></TableCell>
                                <TableCell><strong>Period</strong></TableCell>
                                <TableCell align="right"><strong>Gross (₹)</strong></TableCell>
                                <TableCell align="right"><strong>Net (₹)</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.recent_salary.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ color:'text.secondary', py:3 }}>No salary records yet</TableCell></TableRow>
                            ) : data.recent_salary.map((s, i) => (
                                <TableRow key={i} hover>
                                    <TableCell><strong>{s.employee}</strong></TableCell>
                                    <TableCell>{s.emp_code}</TableCell>
                                    <TableCell>{s.period}</TableCell>
                                    <TableCell align="right">₹{s.gross.toLocaleString()}</TableCell>
                                    <TableCell align="right">₹{s.net.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Chip label={s.status.toUpperCase()} size="small" color={s.status === 'paid' ? 'success' : 'default'} />
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

export default HRReportPage;
