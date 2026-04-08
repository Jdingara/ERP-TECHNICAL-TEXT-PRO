// FILE: pages/hr_payroll/EmployeeFormPage.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Paper, MenuItem, Select, InputLabel, FormControl, Alert, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useParams } from 'react-router-dom';

const GENDER_OPTIONS   = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }];
const EMP_TYPE_OPTIONS = [
    { value: 'permanent',  label: 'Permanent' },
    { value: 'contract',   label: 'Contract' },
    { value: 'daily_wage', label: 'Daily Wage' },
    { value: 'trainee',    label: 'Trainee' },
];
const EMPTY_FORM = {
    employee_code: '', first_name: '', last_name: '', gender: 'male',
    date_of_birth: '', phone: '', email: '', address: '',
    department_id: '', designation: '', employment_type: 'permanent',
    date_of_joining: '', basic_salary: 0, hra: 0, da: 0, other_allowance: 0,
    bank_name: '', bank_account: '', ifsc_code: '',
    pan_number: '', aadhar_number: '', pf_number: '', esi_number: '',
};

function EmployeeFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [form, setForm]     = useState(EMPTY_FORM);
    const [departments, setDepartments] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    useEffect(() => {
        fetchDepartments();
        if (isEdit) fetchEmployee();
    }, [id]); // eslint-disable-line

    const fetchEmployee = async () => {
        const res  = await fetch(`/api/hr/employees/${id}/`, { credentials: 'include' });
        const data = await res.json();
        if (data.employee) setForm(data.employee);
    };
    const fetchDepartments = async () => {
        const res  = await fetch('/api/hr/departments/', { credentials: 'include' });
        const data = await res.json();
        setDepartments(data.departments || []);
    };

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

    const handleSave = async () => {
        setSaving(true); setError('');
        const url = isEdit ? `/api/hr/employees/${id}/` : '/api/hr/employees/';
        const res = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ...form, department_id: form.department_id || null }),
        });
        const data = await res.json();
        if (res.ok) navigate('/hr-payroll/employees');
        else { setError(data.message || 'Error saving.'); setSaving(false); }
    };

    const tf = (label, field, extra = {}) => (
        <TextField label={label} value={form[field] ?? ''} onChange={e => set(field, e.target.value)} {...extra} />
    );

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/hr-payroll/employees')} variant="outlined" size="small">Back to Employees</Button>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>{isEdit ? 'Edit Employee' : 'Add New Employee'}</Typography>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ backgroundColor: 'primary.main' }}>
                    {saving ? 'Saving…' : (isEdit ? 'Update Employee' : 'Save Employee')}
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Personal Information</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField label="Employee Code" value={isEdit ? form.employee_code : 'Auto-generated'} disabled
                        helperText={isEdit ? 'Read only' : 'Auto-assigned'} />
                    {tf('First Name *', 'first_name')}
                    {tf('Last Name *', 'last_name')}
                    <FormControl>
                        <InputLabel>Gender</InputLabel>
                        <Select value={form.gender} label="Gender" onChange={e => set('gender', e.target.value)}>
                            {GENDER_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {tf('Date of Birth', 'date_of_birth', { type: 'date', InputLabelProps: { shrink: true } })}
                    {tf('Phone', 'phone')}
                    {tf('Email', 'email', { type: 'email' })}
                    {tf('Address', 'address', { multiline: true, rows: 2, sx: { gridColumn: 'span 2' } })}
                </Box>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Employment Details</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <FormControl>
                        <InputLabel>Department</InputLabel>
                        <Select value={form.department_id || ''} label="Department" onChange={e => set('department_id', e.target.value)}>
                            <MenuItem value="">-- None --</MenuItem>
                            {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {tf('Designation', 'designation')}
                    <FormControl>
                        <InputLabel>Employment Type</InputLabel>
                        <Select value={form.employment_type} label="Employment Type" onChange={e => set('employment_type', e.target.value)}>
                            {EMP_TYPE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {tf('Date of Joining', 'date_of_joining', { type: 'date', InputLabelProps: { shrink: true } })}
                </Box>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Salary Details</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {tf('Basic Salary (₹)', 'basic_salary', { type: 'number' })}
                    {tf('HRA (₹)', 'hra', { type: 'number' })}
                    {tf('DA (₹)', 'da', { type: 'number' })}
                    {tf('Other Allowance (₹)', 'other_allowance', { type: 'number' })}
                </Box>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Bank & Statutory Details</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {tf('Bank Name', 'bank_name')}
                    {tf('Bank Account Number', 'bank_account')}
                    {tf('IFSC Code', 'ifsc_code')}
                    {tf('PAN Number', 'pan_number')}
                    {tf('Aadhar Number', 'aadhar_number')}
                    {tf('PF Number', 'pf_number')}
                    {tf('ESI Number', 'esi_number')}
                </Box>
            </Paper>
        </Box>
    );
}
export default EmployeeFormPage;
