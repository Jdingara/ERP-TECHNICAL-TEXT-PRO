// FILE: pages/sales/QuotationFormPage.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Paper, MenuItem, Select, InputLabel, FormControl, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useParams } from 'react-router-dom';

const EMPTY_FORM = {
    inquiry_id: '', customer_id: '', date: new Date().toISOString().split('T')[0],
    valid_until: '', product_description: '', gsm: '', width_cm: '',
    quantity: '', unit: 'meters', unit_price: '',
    lead_time_days: 30, spec_notes: '', payment_terms: '', delivery_terms: '',
};

function QuotationFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [form, setForm]         = useState(EMPTY_FORM);
    const [inquiries, setInquiries] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState('');

    useEffect(() => {
        Promise.all([
            fetch('/api/sales/inquiries/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/master-data/customers/', { credentials: 'include' }).then(r => r.json()),
        ]).then(([inqData, custData]) => {
            setInquiries(inqData.inquiries || []);
            setCustomers(custData.customers || []);
        });
        if (isEdit) fetchQuotation();
    }, [id]); // eslint-disable-line

    const fetchQuotation = async () => {
        const res  = await fetch(`/api/sales/quotations/${id}/`, { credentials: 'include' });
        const data = await res.json();
        if (data.quotation) setForm(data.quotation);
    };

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

    // When inquiry is selected, prefill customer + product
    const handleInquiryChange = (inquiryId) => {
        set('inquiry_id', inquiryId);
        const inq = inquiries.find(i => i.id === parseInt(inquiryId));
        if (inq) {
            setForm(p => ({
                ...p,
                inquiry_id:          inquiryId,
                customer_id:         inq.customer_id || p.customer_id,
                product_description: inq.product_description || p.product_description,
                gsm:                 inq.gsm_required || p.gsm,
                width_cm:            inq.width_cm || p.width_cm,
                quantity:            inq.quantity_required || p.quantity,
                unit:                inq.unit || p.unit,
            }));
        }
    };

    const handleSave = async () => {
        setSaving(true); setError('');
        const url    = isEdit ? `/api/sales/quotations/${id}/` : '/api/sales/quotations/';
        const method = isEdit ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                ...form,
                inquiry_id:  form.inquiry_id  || null,
                customer_id: form.customer_id || null,
            }),
        });
        const data = await res.json();
        if (res.ok) navigate('/sales/quotations');
        else { setError(data.message || 'Error saving.'); setSaving(false); }
    };

    const tf = (label, field, extra = {}) => (
        <TextField label={label} value={form[field] ?? ''} onChange={e => set(field, e.target.value)} {...extra} />
    );

    const total = (parseFloat(form.quantity || 0) * parseFloat(form.unit_price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/sales/quotations')} variant="outlined" size="small">Back to Quotations</Button>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>{isEdit ? 'Edit Quotation' : 'New Quotation'}</Typography>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ backgroundColor: 'primary.main' }}>
                    {saving ? 'Saving…' : (isEdit ? 'Update Quotation' : 'Save Quotation')}
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Linked Inquiry & Customer</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <FormControl>
                        <InputLabel>Linked Inquiry (optional)</InputLabel>
                        <Select value={form.inquiry_id || ''} label="Linked Inquiry (optional)"
                            onChange={e => handleInquiryChange(e.target.value)}>
                            <MenuItem value="">-- None --</MenuItem>
                            {inquiries.map(i => <MenuItem key={i.id} value={i.id}>{i.inquiry_number} — {i.customer_name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl>
                        <InputLabel>Customer *</InputLabel>
                        <Select value={form.customer_id || ''} label="Customer *" onChange={e => set('customer_id', e.target.value)}>
                            <MenuItem value="">-- Select --</MenuItem>
                            {customers.map(c => <MenuItem key={c.id} value={c.id}>{c.customer_name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {tf('Quotation Date *', 'date', { type: 'date', InputLabelProps: { shrink: true } })}
                    {tf('Valid Until *', 'valid_until', { type: 'date', InputLabelProps: { shrink: true } })}
                </Box>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Product Specification</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {tf('Product Description *', 'product_description', { sx: { gridColumn: 'span 2' } })}
                    {tf('GSM', 'gsm')}
                    {tf('Width (cm)', 'width_cm')}
                    {tf('Spec / Technical Notes', 'spec_notes', { multiline: true, rows: 3, sx: { gridColumn: 'span 2' } })}
                </Box>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Pricing & Quantity</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {tf('Quantity *', 'quantity', { type: 'number' })}
                    <FormControl>
                        <InputLabel>Unit</InputLabel>
                        <Select value={form.unit} label="Unit" onChange={e => set('unit', e.target.value)}>
                            {['meters','kg','rolls','pieces'].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {tf('Unit Price (₹) *', 'unit_price', { type: 'number' })}
                    <TextField label="Total Amount (₹)" value={total} disabled />
                    {tf('Lead Time (days)', 'lead_time_days', { type: 'number' })}
                </Box>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>Terms</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {tf('Payment Terms', 'payment_terms')}
                    {tf('Delivery Terms', 'delivery_terms')}
                </Box>
            </Paper>
        </Box>
    );
}
export default QuotationFormPage;
