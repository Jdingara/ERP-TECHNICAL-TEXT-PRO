// ============================================================
// FILE: pages/hr_payroll/SalaryPage.js
// PURPOSE: Process and view monthly salary for employees.
//          Auto-calculates based on attendance + salary structure.
//          Shows gross earnings, deductions (PF, ESI), net pay.
// ============================================================

import { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Select, InputLabel, FormControl, Alert,
    IconButton, Tooltip, Stack,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import DeleteIcon    from '@mui/icons-material/Delete';
import PrintIcon     from '@mui/icons-material/Print';
import { printSalarySlip } from '../../utils/printUtils';

const MONTHS = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' },   { value: 4, label: 'April' },
    { value: 5, label: 'May' },     { value: 6, label: 'June' },
    { value: 7, label: 'July' },    { value: 8, label: 'August' },
    { value: 9, label: 'September'}, { value: 10, label: 'October' },
    { value: 11, label: 'November'}, { value: 12, label: 'December' },
];

const canDelete = (s) => s.status === 'draft';

function SalaryPage() {
    const [salaries,    setSalaries]    = useState([]);
    const [employees,   setEmployees]   = useState([]);
    const [dialogOpen,  setDialogOpen]  = useState(false);
    const [message,     setMessage]     = useState('');
    const [messageType, setMessageType] = useState('success');
    const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
    const [yearFilter,  setYearFilter]  = useState(new Date().getFullYear());
    const [formData,    setFormData]    = useState({
        employee_id: '', month: new Date().getMonth() + 1,
        year: new Date().getFullYear(), working_days: 26, other_deduction: 0
    });

    useEffect(() => { fetchSalaries(); fetchEmployees(); }, [monthFilter, yearFilter]); // eslint-disable-line

    const fetchSalaries = async () => {
        const res  = await fetch(`/api/hr/salary/?month=${monthFilter}&year=${yearFilter}`, { credentials: 'include' });
        const data = await res.json();
        setSalaries(data.salaries || []);
    };

    const fetchEmployees = async () => {
        const res  = await fetch('/api/hr/employees/', { credentials: 'include' });
        const data = await res.json();
        setEmployees(data.employees || []);
    };

    const handleProcess = async () => {
        const res  = await fetch('/api/hr/salary/', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('Salary processed successfully.'); setMessageType('success');
            setDialogOpen(false); fetchSalaries();
        } else {
            setMessage(data.message || 'Error.'); setMessageType('error');
        }
    };

    const handleMarkPaid = async (salaryId) => {
        const res = await fetch(`/api/hr/salary/${salaryId}/paid/`, {
            method: 'POST', credentials: 'include',
        });
        if (res.ok) { setMessage('Salary marked as paid.'); setMessageType('success'); fetchSalaries(); }
    };

    const handleDelete = async (s) => {
        if (!canDelete(s)) return;
        if (!window.confirm(`Delete salary record for ${s.employee_name}?`)) return;
        const res  = await fetch(`/api/hr/salary/${s.id}/`, {
            method: 'DELETE', credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) { setMessage('Salary record deleted.'); setMessageType('success'); fetchSalaries(); }
        else { setMessage(data.message || 'Delete failed.'); setMessageType('error'); }
    };

    const monthLabel = (m) => MONTHS.find(x => x.value === parseInt(m))?.label || m;

    const fmt = (val) => parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Salary Processing</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Calculate and process monthly salaries — auto deducts PF (12%) and ESI (0.75%)
            </Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl size="small" sx={{ width: 150 }}>
                        <InputLabel>Month</InputLabel>
                        <Select value={monthFilter} label="Month" onChange={(e) => setMonthFilter(e.target.value)}>
                            {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField label="Year" type="number" size="small" value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)} sx={{ width: 100 }} />
                </Box>
                <Button variant="contained" startIcon={<CalculateIcon />}
                    onClick={() => setDialogOpen(true)} sx={{ backgroundColor: 'primary.main' }}>
                    Process Salary
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Employee</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Department</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Present Days</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Gross (₹)</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">PF (₹)</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">ESI (₹)</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Net Pay (₹)</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {salaries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No salary records. Click "Process Salary" to calculate.
                                </TableCell>
                            </TableRow>
                        ) : salaries.map((s) => (
                            <TableRow key={s.id} hover>
                                <TableCell><strong>{s.employee_code}</strong> — {s.employee_name}</TableCell>
                                <TableCell>{s.department}</TableCell>
                                <TableCell>{s.present_days} / {s.working_days}</TableCell>
                                <TableCell align="right">{fmt(s.gross_earnings)}</TableCell>
                                <TableCell align="right">{fmt(s.pf_deduction)}</TableCell>
                                <TableCell align="right">{fmt(s.esi_deduction)}</TableCell>
                                <TableCell align="right"><strong>{fmt(s.net_salary)}</strong></TableCell>
                                <TableCell>
                                    <Chip label={s.status} size="small" color={s.status === 'paid' ? 'success' : 'warning'} />
                                </TableCell>
                                <TableCell>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        {s.status === 'draft' && (
                                            <Button size="small" variant="contained" color="success"
                                                onClick={() => handleMarkPaid(s.id)}>Mark Paid</Button>
                                        )}
                                        <Tooltip title={`Print Salary Slip — ${monthLabel(s.month)} ${s.year}`}>
                                            <IconButton size="small" onClick={() => printSalarySlip(s)}>
                                                <PrintIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        {canDelete(s) && (
                                            <Tooltip title="Delete Draft">
                                                <IconButton size="small" color="error" onClick={() => handleDelete(s)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Process Salary Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>Process Salary</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Employee *</InputLabel>
                            <Select value={formData.employee_id} label="Employee *"
                                onChange={(e) => setFormData(p => ({ ...p, employee_id: e.target.value }))}>
                                {employees.map(e => <MenuItem key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Month *</InputLabel>
                            <Select value={formData.month} label="Month *"
                                onChange={(e) => setFormData(p => ({ ...p, month: e.target.value }))}>
                                {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField label="Year *" type="number" value={formData.year}
                            onChange={(e) => setFormData(p => ({ ...p, year: e.target.value }))} />
                        <TextField label="Working Days in Month" type="number" value={formData.working_days}
                            onChange={(e) => setFormData(p => ({ ...p, working_days: e.target.value }))} />
                        <TextField label="Other Deductions (₹)" type="number" value={formData.other_deduction}
                            onChange={(e) => setFormData(p => ({ ...p, other_deduction: e.target.value }))} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleProcess} sx={{ backgroundColor: 'primary.main' }}>
                        Calculate & Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default SalaryPage;
