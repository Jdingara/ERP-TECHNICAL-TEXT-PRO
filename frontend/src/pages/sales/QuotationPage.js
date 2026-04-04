// ============================================================
// FILE: pages/sales/QuotationPage.js
// PURPOSE: Create and manage quotations.
//          Can be linked to a Customer Inquiry.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableHead, TableRow,
    TableCell, TableBody, Chip, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, MenuItem, IconButton, Tooltip,
    InputAdornment, Stack, Divider,
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import EditIcon         from '@mui/icons-material/Edit';
import DeleteIcon       from '@mui/icons-material/Delete';
import PrintIcon        from '@mui/icons-material/Print';
import SearchIcon       from '@mui/icons-material/Search';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { printQuotation } from '../../utils/printUtils';

const STATUS_CHOICES = [
    { value: 'draft',    label: 'Draft',              color: 'default' },
    { value: 'sent',     label: 'Sent to Customer',   color: 'primary' },
    { value: 'accepted', label: 'Accepted',            color: 'success' },
    { value: 'rejected', label: 'Rejected',            color: 'error' },
    { value: 'expired',  label: 'Expired',             color: 'warning' },
];

const EMPTY_FORM = {
    inquiry_id: '', customer_id: '', date: '', valid_until: '',
    product_description: '', gsm: '', width_cm: '',
    quantity: '', unit: 'meters', unit_price: '',
    lead_time_days: 30, spec_notes: '', payment_terms: '', delivery_terms: '',
};

// Business logic helpers
const canEdit   = (qt) => ['draft', 'sent'].includes(qt.status);
const canDelete = (qt) => qt.status === 'draft';

function StatusChip({ status }) {
    const s = STATUS_CHOICES.find(x => x.value === status);
    return <Chip label={s?.label || status} color={s?.color || 'default'} size="small" />;
}

export default function QuotationPage() {
    const [quotations,    setQuotations]    = useState([]);
    const [inquiries,     setInquiries]     = useState([]);
    const [customers,     setCustomers]     = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [search,        setSearch]        = useState('');
    const [statusFilter,  setStatusFilter]  = useState('');
    const [dialogOpen,    setDialogOpen]    = useState(false);
    const [editTarget,    setEditTarget]    = useState(null);
    const [form,          setForm]          = useState(EMPTY_FORM);
    const [saving,        setSaving]        = useState(false);
    const [error,         setError]         = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const url = statusFilter
            ? `/api/sales/quotations/?status=${statusFilter}`
            : '/api/sales/quotations/';
        const [qtRes, inqRes, custRes] = await Promise.all([
            fetch(url, { credentials: 'include' }),
            fetch('/api/sales/inquiries/', { credentials: 'include' }),
            fetch('/api/master-data/customers/', { credentials: 'include' }),
        ]);
        const qtData   = await qtRes.json();
        const inqData  = await inqRes.json();
        const custData = await custRes.json();
        setQuotations(qtData.quotations || []);
        setInquiries(inqData.inquiries || []);
        setCustomers(custData.customers || []);
        setLoading(false);
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    // When inquiry is selected, prefill customer and product info
    const handleInquiryChange = (inquiry_id) => {
        const inq = inquiries.find(i => i.id === parseInt(inquiry_id));
        if (inq) {
            setForm(p => ({
                ...p,
                inquiry_id,
                customer_id:         inq.customer_id,
                product_description: inq.product_description,
                gsm:                 inq.gsm_required || '',
                width_cm:            inq.width_cm || '',
                quantity:            inq.quantity_required || '',
                unit:                inq.unit || 'meters',
            }));
        } else {
            setForm(p => ({ ...p, inquiry_id }));
        }
    };

    const openCreate = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setError('');
        setDialogOpen(true);
    };

    const openEdit = (qt) => {
        if (!canEdit(qt)) return;
        setEditTarget(qt);
        setForm({
            inquiry_id:          qt.inquiry_id || '',
            customer_id:         qt.customer_id,
            date:                qt.date,
            valid_until:         qt.valid_until,
            product_description: qt.product_description,
            gsm:                 qt.gsm,
            width_cm:            qt.width_cm,
            quantity:            qt.quantity,
            unit:                qt.unit,
            unit_price:          qt.unit_price,
            lead_time_days:      qt.lead_time_days,
            spec_notes:          qt.spec_notes,
            payment_terms:       qt.payment_terms,
            delivery_terms:      qt.delivery_terms,
            status:              qt.status,
        });
        setError('');
        setDialogOpen(true);
    };

    const handleDelete = async (qt) => {
        if (!canDelete(qt)) return;
        if (!window.confirm(`Delete quotation ${qt.quotation_number}?`)) return;
        const res  = await fetch(`/api/sales/quotations/${qt.id}/`, {
            method: 'DELETE', credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) { load(); }
        else { alert(data.message || 'Delete failed.'); }
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const url    = editTarget ? `/api/sales/quotations/${editTarget.id}/` : '/api/sales/quotations/';
            const method = editTarget ? 'PUT' : 'POST';
            const res    = await fetch(url, {
                method,
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || 'Save failed.'); return; }
            setDialogOpen(false);
            load();
        } catch { setError('Network error.'); }
        finally { setSaving(false); }
    };

    const tf = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) });

    const totalAmount = form.quantity && form.unit_price
        ? (parseFloat(form.quantity) * parseFloat(form.unit_price)).toFixed(2)
        : '—';

    const filtered = quotations.filter(q =>
        q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
        q.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        q.product_description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <RequestQuoteIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h5" fontWeight={700}>Quotations</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {quotations.length} quotation{quotations.length !== 1 ? 's' : ''}
                        </Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    New Quotation
                </Button>
            </Box>

            {/* Status filter chips */}
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                {STATUS_CHOICES.map(s => {
                    const count = quotations.filter(q => q.status === s.value).length;
                    return (
                        <Chip
                            key={s.value}
                            label={`${s.label}: ${count}`}
                            color={statusFilter === s.value ? s.color : 'default'}
                            variant={statusFilter === s.value ? 'filled' : 'outlined'}
                            size="small"
                            onClick={() => setStatusFilter(statusFilter === s.value ? '' : s.value)}
                            sx={{ cursor: 'pointer', fontWeight: 600 }}
                        />
                    );
                })}
            </Box>

            {/* Search */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <TextField
                    placeholder="Search quotation #, customer, description…"
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ minWidth: 320 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                />
            </Paper>

            {/* Table */}
            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: 'action.hover' } }}>
                            <TableCell>Quotation #</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell>Product</TableCell>
                            <TableCell>Qty</TableCell>
                            <TableCell align="right">Unit Price</TableCell>
                            <TableCell align="right">Total</TableCell>
                            <TableCell>Valid Until</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={9} align="center">Loading…</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={9} align="center">No quotations found.</TableCell></TableRow>
                        ) : filtered.map(qt => (
                            <TableRow key={qt.id} hover>
                                <TableCell><Typography fontWeight={600} fontSize={12}>{qt.quotation_number}</Typography></TableCell>
                                <TableCell>{qt.customer_name}</TableCell>
                                <TableCell sx={{ maxWidth: 180 }}>
                                    <Typography noWrap fontSize={13}>{qt.product_description}</Typography>
                                    {qt.inquiry_number && (
                                        <Typography fontSize={11} color="text.secondary">Ref: {qt.inquiry_number}</Typography>
                                    )}
                                </TableCell>
                                <TableCell>{qt.quantity} {qt.unit}</TableCell>
                                <TableCell align="right">₹{parseFloat(qt.unit_price).toFixed(2)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>₹{parseFloat(qt.total_amount).toFixed(2)}</TableCell>
                                <TableCell>{qt.valid_until}</TableCell>
                                <TableCell><StatusChip status={qt.status} /></TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Print Quotation">
                                        <IconButton size="small" onClick={() => printQuotation(qt)}>
                                            <PrintIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={canEdit(qt) ? 'Edit' : 'Locked — accepted/rejected/expired quotations cannot be edited'}>
                                        <span>
                                            <IconButton
                                                size="small"
                                                onClick={() => openEdit(qt)}
                                                disabled={!canEdit(qt)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    {canDelete(qt) && (
                                        <Tooltip title="Delete Draft">
                                            <IconButton size="small" color="error" onClick={() => handleDelete(qt)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            {/* Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
                <DialogTitle fontWeight={700}>
                    {editTarget ? `Edit — ${editTarget.quotation_number}` : 'New Quotation'}
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} mt={0.5}>
                        {error && <Typography color="error" fontSize={13}>{error}</Typography>}

                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>LINKED INQUIRY (OPTIONAL)</Typography>
                        <TextField select label="Link to Inquiry" value={form.inquiry_id}
                            onChange={e => handleInquiryChange(e.target.value)} fullWidth>
                            <MenuItem value="">— No inquiry —</MenuItem>
                            {inquiries.map(i => (
                                <MenuItem key={i.id} value={i.id}>
                                    {i.inquiry_number} · {i.customer_name} · {i.product_description.slice(0, 40)}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Divider />
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>CUSTOMER & DATES</Typography>
                        <Box display="flex" gap={2}>
                            <TextField select label="Customer *" value={form.customer_id}
                                onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))} fullWidth>
                                {customers.map(c => <MenuItem key={c.id} value={c.id}>{c.customer_name}</MenuItem>)}
                            </TextField>
                            <TextField label="Quotation Date *" {...tf('date')} type="date"
                                fullWidth InputLabelProps={{ shrink: true }} />
                            <TextField label="Valid Until *" {...tf('valid_until')} type="date"
                                fullWidth InputLabelProps={{ shrink: true }} />
                        </Box>

                        <Divider />
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>PRODUCT DETAILS</Typography>
                        <TextField label="Product Description *" {...tf('product_description')} fullWidth />
                        <Box display="flex" gap={2}>
                            <TextField label="GSM" {...tf('gsm')} type="number" fullWidth />
                            <TextField label="Width (cm)" {...tf('width_cm')} type="number" fullWidth />
                        </Box>

                        <Divider />
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>PRICING</Typography>
                        <Box display="flex" gap={2} alignItems="center">
                            <TextField label="Quantity *" {...tf('quantity')} type="number" fullWidth />
                            <TextField label="Unit" {...tf('unit')} fullWidth />
                            <TextField label="Unit Price (₹) *" {...tf('unit_price')} type="number" fullWidth />
                            <Box minWidth={100}>
                                <Typography fontSize={11} color="text.secondary">Total Amount</Typography>
                                <Typography fontWeight={700} fontSize={16}>₹{totalAmount}</Typography>
                            </Box>
                        </Box>
                        <TextField label="Lead Time (days)" {...tf('lead_time_days')} type="number" sx={{ maxWidth: 200 }} />

                        <Divider />
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>TERMS</Typography>
                        <TextField label="Payment Terms" {...tf('payment_terms')} fullWidth />
                        <TextField label="Delivery Terms" {...tf('delivery_terms')} fullWidth />
                        <TextField label="Technical / Spec Notes" {...tf('spec_notes')} fullWidth multiline rows={2} />

                        {editTarget && (
                            <>
                                <Divider />
                                <TextField select label="Status" {...tf('status')} sx={{ maxWidth: 220 }}>
                                    {STATUS_CHOICES.map(s => (
                                        <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                                    ))}
                                </TextField>
                            </>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : editTarget ? 'Update' : 'Create Quotation'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
