// FILE: pages/sales/SalesInvoiceFormPage.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Paper, MenuItem, Select, InputLabel, FormControl, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate } from 'react-router-dom';

function SalesInvoiceFormPage() {
    const navigate = useNavigate();
    const [soList, setSoList]   = useState([]);
    const [form, setForm]       = useState({
        sales_order_id: '', invoice_date: new Date().toISOString().split('T')[0],
        due_date: '', tax_amount: '0', notes: '',
    });
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState('');

    useEffect(() => {
        fetch('/api/sales/orders/?status=delivered', { credentials: 'include' })
            .then(r => r.json())
            .then(data => setSoList(data.sales_orders || []));
    }, []);

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

    const selectedSO = soList.find(s => s.id === parseInt(form.sales_order_id));

    const handleSave = async () => {
        if (!form.sales_order_id || !form.invoice_date || !form.due_date) {
            setError('Sales order, invoice date and due date are required.'); return;
        }
        setSaving(true); setError('');
        const subtotal = parseFloat(selectedSO?.total_amount || 0);
        const tax      = parseFloat(form.tax_amount || 0);
        const res = await fetch('/api/sales/invoices/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                sales_order_id: parseInt(form.sales_order_id),
                invoice_date:   form.invoice_date,
                due_date:       form.due_date,
                subtotal,
                tax_amount:     tax,
                total_amount:   subtotal + tax,
                notes:          form.notes,
            }),
        });
        const data = await res.json();
        if (res.ok) navigate('/sales/invoices');
        else { setError(data.message || 'Error creating invoice.'); setSaving(false); }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/sales/invoices')} variant="outlined" size="small">Back to Invoices</Button>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>Create New Invoice</Typography>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ backgroundColor: 'primary.main' }}>
                    {saving ? 'Saving…' : 'Create Invoice'}
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ p: 3, borderRadius: 2, maxWidth: 700 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl>
                        <InputLabel>Sales Order (delivered only) *</InputLabel>
                        <Select value={form.sales_order_id} label="Sales Order (delivered only) *"
                            onChange={e => set('sales_order_id', e.target.value)}>
                            <MenuItem value="">-- Select Sales Order --</MenuItem>
                            {soList.map(s => (
                                <MenuItem key={s.id} value={s.id}>
                                    {s.so_number} — {s.customer_name} — ₹{parseFloat(s.total_amount || 0).toLocaleString('en-IN')}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {selectedSO && (
                        <Box sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="body2"><strong>Customer:</strong> {selectedSO.customer_name}</Typography>
                            <Typography variant="body2"><strong>SO Amount:</strong> ₹{parseFloat(selectedSO.total_amount || 0).toLocaleString('en-IN')}</Typography>
                        </Box>
                    )}

                    <TextField label="Invoice Date *" type="date" value={form.invoice_date}
                        onChange={e => set('invoice_date', e.target.value)}
                        InputLabelProps={{ shrink: true }} />
                    <TextField label="Due Date *" type="date" value={form.due_date}
                        onChange={e => set('due_date', e.target.value)}
                        InputLabelProps={{ shrink: true }} />
                    <TextField label="Tax Amount (₹)" type="number" value={form.tax_amount}
                        onChange={e => set('tax_amount', e.target.value)} />

                    {form.sales_order_id && (
                        <TextField label="Total Amount (₹)" disabled
                            value={(parseFloat(selectedSO?.total_amount || 0) + parseFloat(form.tax_amount || 0)).toLocaleString('en-IN')} />
                    )}

                    <TextField label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)}
                        multiline rows={3} />
                </Box>
            </Paper>
        </Box>
    );
}
export default SalesInvoiceFormPage;
