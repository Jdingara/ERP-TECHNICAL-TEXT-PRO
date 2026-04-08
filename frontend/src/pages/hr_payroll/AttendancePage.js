// ============================================================
// FILE: pages/hr_payroll/AttendancePage.js
// PURPOSE: Mark and view daily attendance for all employees.
//          Shows present/absent/leave status per employee per day.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    MenuItem, Select, InputLabel, FormControl, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useColumnResize } from '../../components/common/useColumnResize';

const STATUS_OPTIONS = [
    { value: 'present',  label: 'Present',  color: 'success' },
    { value: 'absent',   label: 'Absent',   color: 'error'   },
    { value: 'half_day', label: 'Half Day', color: 'warning' },
    { value: 'leave',    label: 'Leave',    color: 'info'    },
    { value: 'holiday',  label: 'Holiday',  color: 'default' },
];

function AttendancePage() {
    const { widths, Resizer } = useColumnResize("attendance", [100, 180, 150, 150, 150, 150, 80]);
    const [attendance, setAttendance]   = useState([]);
    const [employees, setEmployees]     = useState([]);
    const [dateFilter, setDateFilter]   = useState(new Date().toISOString().split('T')[0]);
    const [dialogOpen, setDialogOpen]   = useState(false);
    const [message, setMessage]         = useState('');
    const [messageType, setMessageType] = useState('success');
    const [formData, setFormData]       = useState({
        employee_id: '', date: new Date().toISOString().split('T')[0],
        status: 'present', shift: '', overtime_hours: 0, notes: ''
    });

    useEffect(() => { fetchAttendance(); fetchEmployees(); }, [dateFilter]);

    const fetchAttendance = async () => {
        const res = await fetch(`/api/hr/attendance/?date=${dateFilter}`, { credentials: 'include' });
        const data = await res.json();
        setAttendance(data.attendance || []);
    };

    const fetchEmployees = async () => {
        const res = await fetch('/api/hr/employees/', { credentials: 'include' });
        const data = await res.json();
        setEmployees(data.employees || []);
    };

    const handleSave = async () => {
        const res = await fetch('/api/hr/attendance/', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('Attendance recorded.'); setMessageType('success');
            setDialogOpen(false); fetchAttendance();
        } else {
            setMessage(data.message || 'Error.'); setMessageType('error');
        }
    };

    const getStatusColor = (status) => STATUS_OPTIONS.find(o => o.value === status)?.color || 'default';

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Attendance</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>Daily employee attendance records</Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2 }}>
                <TextField label="Select Date" type="date" value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    InputLabelProps={{ shrink: true }} size="small" />
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => setDialogOpen(true)} sx={{ backgroundColor: 'primary.main' }}>
                    Mark Attendance
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[0] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Employee Code<Resizer index={0} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[1] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Employee Name<Resizer index={1} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[2] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Date<Resizer index={2} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[3] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Status<Resizer index={3} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[4] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Shift<Resizer index={4} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[5] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Overtime Hrs<Resizer index={5} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[6] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Notes<Resizer index={6} /></div></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {attendance.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No attendance records for {dateFilter}. Click "Mark Attendance" to add.
                                </TableCell>
                            </TableRow>
                        ) : attendance.map((a) => (
                            <TableRow key={a.id} hover>
                                <TableCell><strong>{a.employee_code}</strong></TableCell>
                                <TableCell>{a.employee_name}</TableCell>
                                <TableCell>{a.date}</TableCell>
                                <TableCell><Chip label={a.status} size="small" color={getStatusColor(a.status)} /></TableCell>
                                <TableCell>{a.shift || '—'}</TableCell>
                                <TableCell>{a.overtime_hours}</TableCell>
                                <TableCell>{a.notes || '—'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>Mark Attendance</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Employee *</InputLabel>
                            <Select value={formData.employee_id} label="Employee *"
                                onChange={(e) => setFormData(p => ({ ...p, employee_id: e.target.value }))}>
                                {employees.map(e => <MenuItem key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField label="Date *" type="date" value={formData.date}
                            onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                            InputLabelProps={{ shrink: true }} />
                        <FormControl fullWidth>
                            <InputLabel>Status *</InputLabel>
                            <Select value={formData.status} label="Status *"
                                onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}>
                                {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField label="Shift (Morning/Night/General)" value={formData.shift}
                            onChange={(e) => setFormData(p => ({ ...p, shift: e.target.value }))} />
                        <TextField label="Overtime Hours" type="number" value={formData.overtime_hours}
                            onChange={(e) => setFormData(p => ({ ...p, overtime_hours: e.target.value }))} />
                        <TextField label="Notes" value={formData.notes}
                            onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} multiline rows={2} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default AttendancePage;
