// FILE: pages/production/MachineFormPage.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Paper, MenuItem, Select, InputLabel, FormControl, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useParams } from 'react-router-dom';

const MACHINE_TYPES = [
    { value: 'weaving',   label: 'Weaving' },
    { value: 'knitting',  label: 'Knitting' },
    { value: 'nonwoven',  label: 'Nonwoven' },
    { value: 'coating',   label: 'Coating' },
    { value: 'finishing', label: 'Finishing' },
    { value: 'testing',   label: 'Testing / Lab' },
    { value: 'other',     label: 'Other' },
];
const STATUS_CHOICES = [
    { value: 'active',      label: 'Active' },
    { value: 'idle',        label: 'Idle' },
    { value: 'maintenance', label: 'Under Maintenance' },
    { value: 'breakdown',   label: 'Breakdown' },
];
const EMPTY_FORM = {
    machine_code: '', machine_name: '', machine_type: 'weaving',
    capacity: '', capacity_unit: '', location: '', status: 'active',
    purchase_date: '', notes: '',
};

function MachineFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [form, setForm]     = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    useEffect(() => { if (isEdit) fetchMachine(); }, [id]); // eslint-disable-line

    const fetchMachine = async () => {
        const res  = await fetch(`/api/production/machines/${id}/`, { credentials: 'include' });
        const data = await res.json();
        if (data.machine) setForm(data.machine);
    };

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

    const handleSave = async () => {
        setSaving(true); setError('');
        const url = isEdit ? `/api/production/machines/${id}/` : '/api/production/machines/';
        const res = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) navigate('/production/machines');
        else { setError(data.message || 'Error saving.'); setSaving(false); }
    };

    const tf = (label, field, extra = {}) => (
        <TextField label={label} value={form[field] ?? ''} onChange={e => set(field, e.target.value)} {...extra} />
    );

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/production/machines')} variant="outlined" size="small">Back to Machines</Button>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>{isEdit ? 'Edit Machine' : 'Add New Machine'}</Typography>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ backgroundColor: 'primary.main' }}>
                    {saving ? 'Saving…' : (isEdit ? 'Update Machine' : 'Save Machine')}
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {tf('Machine Code *', 'machine_code')}
                    {tf('Machine Name *', 'machine_name')}
                    <FormControl>
                        <InputLabel>Machine Type</InputLabel>
                        <Select value={form.machine_type} label="Machine Type" onChange={e => set('machine_type', e.target.value)}>
                            {MACHINE_TYPES.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl>
                        <InputLabel>Status</InputLabel>
                        <Select value={form.status} label="Status" onChange={e => set('status', e.target.value)}>
                            {STATUS_CHOICES.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {tf('Capacity', 'capacity')}
                    {tf('Capacity Unit (e.g. kg/day)', 'capacity_unit')}
                    {tf('Location / Department', 'location')}
                    {tf('Purchase Date', 'purchase_date', { type: 'date', InputLabelProps: { shrink: true } })}
                    {tf('Notes', 'notes', { multiline: true, rows: 3, sx: { gridColumn: 'span 2' } })}
                </Box>
            </Paper>
        </Box>
    );
}
export default MachineFormPage;
