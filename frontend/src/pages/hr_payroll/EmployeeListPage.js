// ============================================================
// FILE: pages/hr_payroll/EmployeeListPage.js
// PURPOSE: Shows all employees with department, designation.
//          User can add, edit employees and view salary details.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, MenuItem, Select, InputLabel, FormControl, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useColumnResize } from '../../components/common/useColumnResize';

const GENDER_OPTIONS      = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }];
const EMP_TYPE_OPTIONS    = [
    { value: 'permanent',  label: 'Permanent'  },
    { value: 'contract',   label: 'Contract'   },
    { value: 'daily_wage', label: 'Daily Wage' },
    { value: 'trainee',    label: 'Trainee'    },
];

const EMPTY_FORM = {
    employee_code: '', first_name: '', last_name: '', gender: 'male',
    date_of_birth: '', phone: '', email: '', address: '',
    department_id: '', designation: '', employment_type: 'permanent',
    date_of_joining: '', basic_salary: 0, hra: 0, da: 0, other_allowance: 0,
    bank_name: '', bank_account: '', ifsc_code: '',
    pan_number: '', aadhar_number: '', pf_number: '', esi_number: '',
};

function EmployeeListPage() {
    const { widths, Resizer } = useColumnResize("employee_list", [100, 180, 150, 80]);
    const [employees, setEmployees]     = useState([]);
    const [departments, setDepartments] = useState([]);
    const [searchText, setSearchText]   = useState('');
    const [dialogOpen, setDialogOpen]   = useState(false);
    const [formData, setFormData]       = useState(EMPTY_FORM);
    const [editingId, setEditingId]     = useState(null);
    const [message, setMessage]         = useState('');
    const [messageType, setMessageType] = useState('success');

    useEffect(() => { fetchEmployees(); fetchDepartments(); }, []);

    const fetchEmployees = async (search = '') => {
        const res = await fetch(`/api/hr/employees/?search=${search}`, { credentials: 'include' });
        const data = await res.json();
        setEmployees(data.employees || []);
    };

    const fetchDepartments = async () => {
        const res = await fetch('/api/hr/departments/', { credentials: 'include' });
        const data = await res.json();
        setDepartments(data.departments || []);
    };

    const handleSearch = (e) => { setSearchText(e.target.value); fetchEmployees(e.target.value); };
    const handleOpenAdd = () => { setFormData(EMPTY_FORM); setEditingId(null); setDialogOpen(true); };
    const handleOpenEdit = (emp) => {
        setFormData({ ...emp, department_id: emp.department_id || '' });
        setEditingId(emp.id);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        const url    = editingId ? `/api/hr/employees/${editingId}/` : '/api/hr/employees/';
        const method = editingId ? 'PUT' : 'POST';
        const cleanedData = { ...formData, department_id: formData.department_id || null };
        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(cleanedData),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(editingId ? 'Employee updated.' : 'Employee created.');
            setMessageType('success'); setDialogOpen(false); fetchEmployees(searchText);
        } else {
            setMessage(data.message || 'Error.'); setMessageType('error');
        }
    };

    const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Employees</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>Manage all factory and office employees</Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <TextField placeholder="Search employees..." value={searchText} onChange={handleSearch} size="small" sx={{ width: 350 }} />
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ backgroundColor: 'primary.main' }}>
                    Add Employee
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            {['Code', 'Full Name', 'Department', 'Designation', 'Type', 'Phone', 'Joining Date', 'Gross Salary', 'Status', 'Actions'].map((h, i) => (
                                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', position: 'relative', userSelect: 'none', backgroundColor: 'primary.main', px: 2, py: 1 }} style={{ width: widths[i] }}>
                                    {h}<Resizer index={i} />
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {employees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No employees found. Click "Add Employee" to create one.
                                </TableCell>
                            </TableRow>
                        ) : employees.map((e) => (
                            <TableRow key={e.id} hover>
                                <TableCell><strong>{e.employee_code}</strong></TableCell>
                                <TableCell>{e.full_name}</TableCell>
                                <TableCell>{e.department || '—'}</TableCell>
                                <TableCell>{e.designation || '—'}</TableCell>
                                <TableCell><Chip label={e.employment_type} size="small" variant="outlined" /></TableCell>
                                <TableCell>{e.phone}</TableCell>
                                <TableCell>{e.date_of_joining}</TableCell>
                                <TableCell>₹ {parseFloat(e.gross_salary).toLocaleString()}</TableCell>
                                <TableCell><Chip label={e.status} size="small" color={e.status === 'active' ? 'success' : 'default'} /></TableCell>
                                <TableCell>
                                    <IconButton size="small" onClick={() => handleOpenEdit(e)} sx={{ color: 'primary.main' }}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>
                    {editingId ? 'Edit Employee' : 'Add New Employee'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mt: 1 }}>
                        <TextField
                            label="Employee Code"
                            value={editingId ? formData.employee_code : 'Auto-generated'}
                            disabled
                            helperText={editingId ? 'Read only — assigned on creation' : 'Auto-assigned when saved'}
                            sx={{ '& .MuiInputBase-input.Mui-disabled': {
                                WebkitTextFillColor: editingId ? '#1a1a1a' : '#888',
                                fontStyle: editingId ? 'normal' : 'italic',
                            }}}
                        />
                        <TextField label="First Name *" value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} />
                        <TextField label="Last Name" value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} />

                        <FormControl>
                            <InputLabel>Gender</InputLabel>
                            <Select value={formData.gender} label="Gender" onChange={(e) => handleChange('gender', e.target.value)}>
                                {GENDER_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField label="Date of Birth" type="date" value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} InputLabelProps={{ shrink: true }} />
                        <TextField label="Phone" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                        <TextField label="Email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} />

                        <FormControl>
                            <InputLabel>Department</InputLabel>
                            <Select value={formData.department_id} label="Department" onChange={(e) => handleChange('department_id', e.target.value)}>
                                <MenuItem value="">-- None --</MenuItem>
                                {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField label="Designation" value={formData.designation} onChange={(e) => handleChange('designation', e.target.value)} />

                        <FormControl>
                            <InputLabel>Employment Type</InputLabel>
                            <Select value={formData.employment_type} label="Employment Type" onChange={(e) => handleChange('employment_type', e.target.value)}>
                                {EMP_TYPE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField label="Date of Joining *" type="date" value={formData.date_of_joining} onChange={(e) => handleChange('date_of_joining', e.target.value)} InputLabelProps={{ shrink: true }} />

                        {/* Salary fields */}
                        <TextField label="Basic Salary (₹)" type="number" value={formData.basic_salary} onChange={(e) => handleChange('basic_salary', e.target.value)} />
                        <TextField label="HRA (₹)" type="number" value={formData.hra} onChange={(e) => handleChange('hra', e.target.value)} />
                        <TextField label="DA (₹)" type="number" value={formData.da} onChange={(e) => handleChange('da', e.target.value)} />
                        <TextField label="Other Allowance (₹)" type="number" value={formData.other_allowance} onChange={(e) => handleChange('other_allowance', e.target.value)} />

                        {/* Bank details */}
                        <TextField label="Bank Name" value={formData.bank_name} onChange={(e) => handleChange('bank_name', e.target.value)} />
                        <TextField label="Bank Account Number" value={formData.bank_account} onChange={(e) => handleChange('bank_account', e.target.value)} />
                        <TextField label="IFSC Code" value={formData.ifsc_code} onChange={(e) => handleChange('ifsc_code', e.target.value)} />
                        <TextField label="PAN Number" value={formData.pan_number} onChange={(e) => handleChange('pan_number', e.target.value)} />
                        <TextField label="PF Number" value={formData.pf_number} onChange={(e) => handleChange('pf_number', e.target.value)} />
                        <TextField label="ESI Number" value={formData.esi_number} onChange={(e) => handleChange('esi_number', e.target.value)} />

                        <TextField label="Address" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} multiline rows={2} sx={{ gridColumn: 'span 3' }} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>
                        {editingId ? 'Update Employee' : 'Save Employee'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default EmployeeListPage;
