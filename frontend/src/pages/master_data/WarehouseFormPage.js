// FILE: pages/master_data/WarehouseFormPage.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Paper, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useParams } from 'react-router-dom';

function WarehouseFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [form, setForm]     = useState({ code: '', name: '', address: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    useEffect(() => { if (isEdit) fetchWarehouse(); }, [id]); // eslint-disable-line

    const fetchWarehouse = async () => {
        const res  = await fetch(`/api/master-data/warehouses/${id}/`, { credentials: 'include' });
        const data = await res.json();
        if (data.warehouse) setForm({ code: data.warehouse.code, name: data.warehouse.name, address: data.warehouse.address || '' });
    };

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

    const handleSave = async () => {
        setSaving(true); setError('');
        const url = isEdit ? `/api/master-data/warehouses/${id}/` : '/api/master-data/warehouses/';
        const res = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) navigate('/master-data/warehouses');
        else { setError(data.message || 'Error saving.'); setSaving(false); }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/master-data/warehouses')} variant="outlined" size="small">Back to Warehouses</Button>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>{isEdit ? 'Edit Warehouse' : 'Add New Warehouse'}</Typography>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ backgroundColor: 'primary.main' }}>
                    {saving ? 'Saving…' : (isEdit ? 'Update Warehouse' : 'Save Warehouse')}
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Paper sx={{ p: 3, borderRadius: 2, maxWidth: 600 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField label="Warehouse Code * (e.g. WH-01)" value={form.code}
                        onChange={e => set('code', e.target.value)} disabled={isEdit}
                        helperText={isEdit ? 'Code cannot be changed after creation' : ''} />
                    <TextField label="Warehouse Name *" value={form.name}
                        onChange={e => set('name', e.target.value)} />
                    <TextField label="Address / Location" value={form.address}
                        onChange={e => set('address', e.target.value)}
                        multiline rows={3} />
                </Box>
            </Paper>
        </Box>
    );
}
export default WarehouseFormPage;
