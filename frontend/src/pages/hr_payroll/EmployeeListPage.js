// ============================================================
// FILE: pages/hr_payroll/EmployeeListPage.js
// PURPOSE: Shows all employees with department, designation.
//          User can add, edit employees and view salary details.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { useColumnResize } from '../../components/common/useColumnResize';

function EmployeeListPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { widths, Resizer } = useColumnResize("employee_list", [100, 180, 150, 80]);
    const [employees, setEmployees] = useState([]);
    const [searchText, setSearchText] = useState('');

    useEffect(() => { fetchEmployees(); }, []);

    const fetchEmployees = async (search = '') => {
        const res = await fetch(`/api/hr/employees/?search=${search}`, { credentials: 'include' });
        const data = await res.json();
        setEmployees(data.employees || []);
    };

    const handleSearch = (e) => { setSearchText(e.target.value); fetchEmployees(e.target.value); };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Employees</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>Manage all factory and office employees</Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <TextField placeholder="Search employees..." value={searchText} onChange={handleSearch} size="small" sx={{ width: 350 }} />
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/hr-payroll/employees/add')} sx={{ backgroundColor: 'primary.main' }}>
                    Add Employee
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            {['Code', 'Full Name', 'Department', 'Designation', 'Type', 'Phone', 'Joining Date', 'Gross Salary', 'Status', 'Actions'].map((h, i) => (
                                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', position: 'relative', userSelect: 'none', px: 2, py: 1 }} style={{ width: widths[i], backgroundColor: theme.palette.primary.main }}>
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
                                    <IconButton size="small" onClick={() => navigate(`/hr-payroll/employees/edit/${e.id}`)} sx={{ color: 'primary.main' }}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export default EmployeeListPage;
