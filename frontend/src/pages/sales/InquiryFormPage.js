// FILE: pages/sales/InquiryFormPage.js
import { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Paper, MenuItem, Select, InputLabel, FormControl, Alert, FormControlLabel, Switch } from '@mui/material';
import ArrowBackIcon  from '@mui/icons-material/ArrowBack';
import SaveIcon       from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

const STATUS_CHOICES = [
    { value: 'new',           label: 'New' },
    { value: 'in_discussion', label: 'In Discussion' },
    { value: 'sampling',      label: 'Sampling' },
    { value: 'quoted',        label: 'Quoted' },
    { value: 'won',           label: 'Won' },
    { value: 'lost',          label: 'Lost' },
];
const END_USE_CHOICES = ['geotextile','agrotextile','filtration','automotive','medical','protective','industrial','other'];
const TODAY = new Date().toISOString().split('T')[0];
const EMPTY_FORM = {
    customer_id: '', received_date: TODAY,
    product_description: '', end_use: '', gsm_required: '', width_cm: '',
    tensile_requirement: '', coating_required: false, coating_type: '',
    color: '', quantity_required: '', unit: 'meters',
    target_price: '', required_by_date: '', assigned_to: '', notes: '', status: 'new',
};

function InquiryFormPage() {
    const { id }             = useParams();
    const [searchParams]     = useSearchParams();
    const fromId             = searchParams.get('from');   // duplicate source id
    const navigate           = useNavigate();
    const isEdit             = Boolean(id);
    const isDuplicate        = Boolean(fromId);

    const [form,       setForm]       = useState(EMPTY_FORM);
    const [sourceNum,  setSourceNum]  = useState('');      // original inquiry number for banner
    const [customers,  setCustomers]  = useState([]);
    const [saving,     setSaving]     = useState(false);
    const [error,      setError]      = useState('');

    useEffect(() => {
        fetchCustomers();
        if (isEdit)      fetchInquiry(id);
        else if (fromId) fetchAndDuplicate(fromId);
    }, [id, fromId]); // eslint-disable-line

    const fetchInquiry = async (targetId) => {
        const res  = await fetch(`/api/sales/inquiries/${targetId}/`, { credentials: 'include' });
        const data = await res.json();
        if (data.inquiry) setForm(data.inquiry);
    };

    const fetchAndDuplicate = async (sourceId) => {
        const res  = await fetch(`/api/sales/inquiries/${sourceId}/`, { credentials: 'include' });
        const data = await res.json();
        if (data.inquiry) {
            setSourceNum(data.inquiry.inquiry_number || '');
            setForm({
                ...data.inquiry,
                received_date:  TODAY,   // reset to today
                required_by_date: '',    // clear date — probably outdated
                status:         'new',   // always start fresh
            });
        }
    };

    const fetchCustomers = async () => {
        const res  = await fetch('/api/master-data/customers/', { credentials: 'include' });
        const data = await res.json();
        setCustomers(data.customers || []);
    };

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

    const handleSave = async () => {
        setSaving(true); setError('');
        const url = isEdit ? `/api/sales/inquiries/${id}/` : '/api/sales/inquiries/';
        const res = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) navigate('/sales/inquiries');
        else { setError(data.message || 'Error saving.'); setSaving(false); }
    };

    const tf = (label, field, extra = {}) => (
        <TextField label={label} value={form[field] ?? ''} onChange={e => set(field, e.target.value)} {...extra} />
    );

    const pageTitle = isEdit ? 'Edit Inquiry' : isDuplicate ? 'Duplicate Inquiry' : 'New Customer Inquiry';

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/sales/inquiries')} variant="outlined" size="small">Back to Inquiries</Button>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>{pageTitle}</Typography>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ backgroundColor: 'primary.main' }}>
                    {saving ? 'Saving…' : (isEdit ? 'Update Inquiry' : 'Save Inquiry')}
                </Button>
            </Box>

            {/* Duplicate banner */}
            {isDuplicate && sourceNum && (
                <Alert icon={<ContentCopyIcon fontSize="small" />} severity="info" sx={{ mb: 2 }}>
                    Duplicated from <strong>{sourceNum}</strong> — all fields are pre-filled. Review, adjust if needed, then save as a new inquiry.
                </Alert>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Basic Details</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <FormControl>
                        <InputLabel>Customer *</InputLabel>
                        <Select value={form.customer_id || ''} label="Customer *" onChange={e => set('customer_id', e.target.value)}>
                            {customers.map(c => <MenuItem key={c.id} value={c.id}>{c.customer_name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {tf('Received Date', 'received_date', { type: 'date', InputLabelProps: { shrink: true } })}
                    {tf('Product Description *', 'product_description', { sx: { gridColumn: 'span 2' } })}
                    <FormControl>
                        <InputLabel>End Use</InputLabel>
                        <Select value={form.end_use || ''} label="End Use" onChange={e => set('end_use', e.target.value)}>
                            {END_USE_CHOICES.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl>
                        <InputLabel>Status</InputLabel>
                        <Select value={form.status} label="Status" onChange={e => set('status', e.target.value)}>
                            {STATUS_CHOICES.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Technical Specifications</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {tf('GSM Required', 'gsm_required', { type: 'number' })}
                    {tf('Width (cm)', 'width_cm', { type: 'number' })}
                    {tf('Tensile Requirement', 'tensile_requirement')}
                    {tf('Color', 'color')}
                    <Box sx={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <FormControlLabel
                            control={<Switch checked={form.coating_required} onChange={e => set('coating_required', e.target.checked)} />}
                            label="Coating Required" />
                        {form.coating_required && (
                            <TextField label="Coating Type" value={form.coating_type} onChange={e => set('coating_type', e.target.value)} size="small" sx={{ flex: 1 }} />
                        )}
                    </Box>
                </Box>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Commercial Details</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {tf('Quantity Required', 'quantity_required', { type: 'number' })}
                    <FormControl>
                        <InputLabel>Unit</InputLabel>
                        <Select value={form.unit} label="Unit" onChange={e => set('unit', e.target.value)}>
                            {['meters','kg','rolls','pieces'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {tf('Target Price (₹/unit)', 'target_price', { type: 'number' })}
                    {tf('Required By Date', 'required_by_date', { type: 'date', InputLabelProps: { shrink: true } })}
                    {tf('Assigned To', 'assigned_to')}
                    {tf('Notes', 'notes', { multiline: true, rows: 3, sx: { gridColumn: 'span 2' } })}
                </Box>
            </Paper>
        </Box>
    );
}
export default InquiryFormPage;
