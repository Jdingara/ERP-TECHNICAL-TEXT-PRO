// FILE: pages/master_data/CustomerFormPage.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Paper, MenuItem, Select, InputLabel, FormControl, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useParams } from 'react-router-dom';

const TYPE_OPTIONS = [
    { value: 'domestic', label: 'Domestic' },
    { value: 'export',   label: 'Export' },
    { value: 'both',     label: 'Both Domestic & Export' },
];
const EMPTY_FORM = {
    customer_code: '', customer_name: '', customer_type: 'domestic',
    contact_person: '', phone: '', email: '', address: '',
    city: '', state: '', country: 'India', pincode: '',
    gstin: '', pan_number: '', credit_days: 30, credit_limit: 0,
};

function CustomerFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [form, setForm]     = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    useEffect(() => { if (isEdit) fetchCustomer(); }, [id]); // eslint-disable-line

    const fetchCustomer = async () => {
        const res  = await fetch(`/api/master-data/customers/${id}/`, { credentials: 'include' });
        const data = await res.json();
        if (data.customer) setForm(data.customer);
    };

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

    const handleSave = async () => {
        setSaving(true); setError('');
        const url = isEdit ? `/api/master-data/customers/${id}/` : '/api/master-data/customers/';
        const res = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) navigate('/master-data/customers');
        else { setError(data.message || 'Error saving.'); setSaving(false); }
    };

    const tf = (label, field, extra = {}) => (
        <TextField label={label} value={form[field]} onChange={e => set(field, e.target.value)} {...extra} />
    );

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/master-data/customers')} variant="outlined" size="small">Back to Customers</Button>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>{isEdit ? 'Edit Customer' : 'Add New Customer'}</Typography>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ backgroundColor: 'primary.main' }}>
                    {saving ? 'Saving…' : (isEdit ? 'Update Customer' : 'Save Customer')}
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField label="Customer Code" value={isEdit ? form.customer_code : 'Auto-generated'} disabled
                        helperText={isEdit ? 'Read only' : 'Auto-assigned when saved'} />
                    {tf('Customer Name *', 'customer_name')}
                    <FormControl>
                        <InputLabel>Customer Type *</InputLabel>
                        <Select value={form.customer_type} label="Customer Type *" onChange={e => set('customer_type', e.target.value)}>
                            {TYPE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {tf('Contact Person', 'contact_person')}
                    {tf('Phone', 'phone')}
                    {tf('Email', 'email', { type: 'email' })}
                    {tf('City', 'city')}
                    {tf('State', 'state')}
                    {tf('Country', 'country')}
                    {tf('Pincode', 'pincode')}
                    {tf('GSTIN', 'gstin')}
                    {tf('PAN Number', 'pan_number')}
                    {tf('Credit Days', 'credit_days', { type: 'number' })}
                    {tf('Credit Limit (₹)', 'credit_limit', { type: 'number' })}
                    {tf('Address', 'address', { multiline: true, rows: 3, sx: { gridColumn: 'span 2' } })}
                </Box>
            </Paper>
        </Box>
    );
}
export default CustomerFormPage;
