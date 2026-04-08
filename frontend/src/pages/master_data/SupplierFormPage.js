// FILE: pages/master_data/SupplierFormPage.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Paper, MenuItem, Select, InputLabel, FormControl, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useParams } from 'react-router-dom';

const TYPE_OPTIONS = [
    { value: 'yarn_supplier',        label: 'Yarn Supplier' },
    { value: 'chemical_supplier',    label: 'Chemical Supplier' },
    { value: 'machine_supplier',     label: 'Machine Supplier' },
    { value: 'spare_parts_supplier', label: 'Spare Parts Supplier' },
    { value: 'other',                label: 'Other' },
];
const EMPTY_FORM = {
    supplier_code: '', supplier_name: '', supplier_type: 'yarn_supplier',
    contact_person: '', phone: '', email: '', address: '',
    city: '', state: '', country: 'India', pincode: '',
    gstin: '', pan_number: '', payment_days: 30,
};

function SupplierFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [form, setForm]     = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    useEffect(() => { if (isEdit) fetchSupplier(); }, [id]); // eslint-disable-line

    const fetchSupplier = async () => {
        const res  = await fetch(`/api/master-data/suppliers/${id}/`, { credentials: 'include' });
        const data = await res.json();
        if (data.supplier) setForm(data.supplier);
    };

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

    const handleSave = async () => {
        setSaving(true); setError('');
        const url = isEdit ? `/api/master-data/suppliers/${id}/` : '/api/master-data/suppliers/';
        const res = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) navigate('/master-data/suppliers');
        else { setError(data.message || 'Error saving.'); setSaving(false); }
    };

    const tf = (label, field, extra = {}) => (
        <TextField label={label} value={form[field]} onChange={e => set(field, e.target.value)} {...extra} />
    );

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/master-data/suppliers')} variant="outlined" size="small">Back to Suppliers</Button>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>{isEdit ? 'Edit Supplier' : 'Add New Supplier'}</Typography>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ backgroundColor: 'primary.main' }}>
                    {saving ? 'Saving…' : (isEdit ? 'Update Supplier' : 'Save Supplier')}
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField label="Supplier Code" value={isEdit ? form.supplier_code : 'Auto-generated'} disabled
                        helperText={isEdit ? 'Read only' : 'Auto-assigned when saved'} />
                    {tf('Supplier Name *', 'supplier_name')}
                    <FormControl>
                        <InputLabel>Supplier Type</InputLabel>
                        <Select value={form.supplier_type} label="Supplier Type" onChange={e => set('supplier_type', e.target.value)}>
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
                    {tf('Payment Days (Credit)', 'payment_days', { type: 'number' })}
                    {tf('Address', 'address', { multiline: true, rows: 3, sx: { gridColumn: 'span 2' } })}
                </Box>
            </Paper>
        </Box>
    );
}
export default SupplierFormPage;
