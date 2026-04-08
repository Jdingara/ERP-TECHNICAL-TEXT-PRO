// ============================================================
// FILE: pages/sales/InquiryListPage.js
// PURPOSE: View and manage customer inquiries (technical textile).
//          Inquiry → Quotation → Sales Order flow starting here.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableHead, TableRow,
    TableCell, TableBody, Chip, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, MenuItem, IconButton, Tooltip,
    InputAdornment, Stack, FormControlLabel, Switch, Divider,
} from '@mui/material';
import { useColumnResize } from '../../components/common/useColumnResize';
import AddIcon        from '@mui/icons-material/Add';
import EditIcon       from '@mui/icons-material/Edit';
import SearchIcon     from '@mui/icons-material/Search';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';

const STATUS_CHOICES = [
    { value: 'new',           label: 'New',           color: 'info' },
    { value: 'in_discussion', label: 'In Discussion',  color: 'primary' },
    { value: 'sampling',      label: 'Sampling',       color: 'warning' },
    { value: 'quoted',        label: 'Quoted',         color: 'secondary' },
    { value: 'won',           label: 'Won',            color: 'success' },
    { value: 'lost',          label: 'Lost',           color: 'error' },
];

const END_USE_CHOICES = [
    'geotextile','agrotextile','filtration','automotive','medical','protective','industrial','other'
];

const EMPTY_FORM = {
    customer_id: '', received_date: '', product_description: '',
    end_use: 'other', gsm_required: '', width_cm: '',
    tensile_requirement: '', coating_required: false, coating_type: '',
    color: '', quantity_required: '', unit: 'meters',
    target_price: '', required_by_date: '', assigned_to: '', notes: '',
};

function StatusChip({ status }) {
    const s = STATUS_CHOICES.find(x => x.value === status);
    return <Chip label={s?.label || status} color={s?.color || 'default'} size="small" />;
}

export default function InquiryListPage() {
    const { widths, Resizer } = useColumnResize('inquiry_list', [120, 160, 200, 120, 90, 110, 110, 90]);
    const [inquiries,   setInquiries]   = useState([]);
    const [customers,   setCustomers]   = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [search,      setSearch]      = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dialogOpen,  setDialogOpen]  = useState(false);
    const [editTarget,  setEditTarget]  = useState(null);
    const [form,        setForm]        = useState(EMPTY_FORM);
    const [saving,      setSaving]      = useState(false);
    const [error,       setError]       = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const url = statusFilter
            ? `/api/sales/inquiries/?status=${statusFilter}`
            : '/api/sales/inquiries/';
        const [inqRes, custRes] = await Promise.all([
            fetch(url, { credentials: 'include' }),
            fetch('/api/master-data/customers/', { credentials: 'include' }),
        ]);
        const inqData  = await inqRes.json();
        const custData = await custRes.json();
        setInquiries(inqData.inquiries || []);
        setCustomers(custData.customers || []);
        setLoading(false);
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setError('');
        setDialogOpen(true);
    };

    const openEdit = (inq) => {
        setEditTarget(inq);
        setForm({
            customer_id:         inq.customer_id,
            received_date:       inq.received_date,
            product_description: inq.product_description,
            end_use:             inq.end_use,
            gsm_required:        inq.gsm_required,
            width_cm:            inq.width_cm,
            tensile_requirement: inq.tensile_requirement,
            coating_required:    inq.coating_required,
            coating_type:        inq.coating_type,
            color:               inq.color,
            quantity_required:   inq.quantity_required,
            unit:                inq.unit,
            target_price:        inq.target_price,
            required_by_date:    inq.required_by_date,
            status:              inq.status,
            assigned_to:         inq.assigned_to,
            notes:               inq.notes,
        });
        setError('');
        setDialogOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const url    = editTarget ? `/api/sales/inquiries/${editTarget.id}/` : '/api/sales/inquiries/';
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

    const tf = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) });

    const filtered = inquiries.filter(i =>
        i.inquiry_number.toLowerCase().includes(search.toLowerCase()) ||
        i.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        i.product_description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <QuestionAnswerIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h5" fontWeight={700}>Customer Inquiries</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {inquiries.length} total inquiries
                        </Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    New Inquiry
                </Button>
            </Box>

            {/* Status KPI chips */}
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                {STATUS_CHOICES.map(s => {
                    const count = inquiries.filter(i => i.status === s.value).length;
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

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <TextField
                    placeholder="Search inquiry #, customer, description…"
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ minWidth: 320 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                />
            </Paper>

            {/* Table */}
            <Paper>
                <Table size="small" sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            {['Inquiry #','Customer','Product Description','End Use','Qty','Date','Status','Actions'].map((h, i) => (
                                <TableCell key={h} sx={{ color:'white', fontWeight:'bold', whiteSpace:'nowrap', position:'relative', userSelect:'none', backgroundColor:'primary.main', px:2, py:1 }} style={{ width: widths[i] }}>
                                    {h}<Resizer index={i} />
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={8} align="center">Loading…</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center">No inquiries found.</TableCell></TableRow>
                        ) : filtered.map(inq => (
                            <TableRow key={inq.id} hover>
                                <TableCell><Typography fontWeight={600} fontSize={12}>{inq.inquiry_number}</Typography></TableCell>
                                <TableCell>{inq.customer_name}</TableCell>
                                <TableCell sx={{ maxWidth: 200 }}>
                                    <Typography noWrap fontSize={13}>{inq.product_description}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip label={inq.end_use} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell>{inq.quantity_required} {inq.unit}</TableCell>
                                <TableCell>{inq.received_date}</TableCell>
                                <TableCell><StatusChip status={inq.status} /></TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Edit">
                                        <IconButton size="small" onClick={() => openEdit(inq)}><EditIcon fontSize="small" /></IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
                <DialogTitle fontWeight={700}>
                    {editTarget ? `Edit — ${editTarget.inquiry_number}` : 'New Customer Inquiry'}
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} mt={0.5}>
                        {error && <Typography color="error" fontSize={13}>{error}</Typography>}

                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>COMMERCIAL INFO</Typography>
                        <Box display="flex" gap={2}>
                            <TextField select label="Customer *" value={form.customer_id}
                                onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))} fullWidth>
                                {customers.map(c => <MenuItem key={c.id} value={c.id}>{c.customer_name}</MenuItem>)}
                            </TextField>
                            <TextField label="Received Date *" {...tf('received_date')} type="date"
                                fullWidth InputLabelProps={{ shrink: true }} />
                        </Box>
                        <TextField label="Product Description *" {...tf('product_description')} fullWidth />
                        <Box display="flex" gap={2}>
                            <TextField select label="End Use" {...tf('end_use')} fullWidth>
                                {END_USE_CHOICES.map(u => (
                                    <MenuItem key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</MenuItem>
                                ))}
                            </TextField>
                            <TextField label="Required By" {...tf('required_by_date')} type="date"
                                fullWidth InputLabelProps={{ shrink: true }} />
                        </Box>
                        <Box display="flex" gap={2}>
                            <TextField label="Quantity Required *" {...tf('quantity_required')} type="number" fullWidth />
                            <TextField label="Unit" {...tf('unit')} fullWidth />
                            <TextField label="Target Price / Unit" {...tf('target_price')} type="number" fullWidth />
                        </Box>

                        <Divider />
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>TECHNICAL SPECIFICATIONS</Typography>
                        <Box display="flex" gap={2}>
                            <TextField label="GSM Required" {...tf('gsm_required')} type="number" fullWidth />
                            <TextField label="Width (cm)" {...tf('width_cm')} type="number" fullWidth />
                            <TextField label="Color" {...tf('color')} fullWidth />
                        </Box>
                        <TextField label="Tensile Strength Requirement" {...tf('tensile_requirement')} fullWidth />
                        <Box display="flex" gap={2} alignItems="center">
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={form.coating_required}
                                        onChange={e => setForm(p => ({ ...p, coating_required: e.target.checked }))}
                                    />
                                }
                                label="Coating Required"
                            />
                            {form.coating_required && (
                                <TextField label="Coating Type" {...tf('coating_type')} fullWidth />
                            )}
                        </Box>

                        <Divider />
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>TRACKING</Typography>
                        <Box display="flex" gap={2}>
                            <TextField label="Assigned To" {...tf('assigned_to')} fullWidth />
                            {editTarget && (
                                <TextField select label="Status" {...tf('status')} fullWidth>
                                    {STATUS_CHOICES.map(s => (
                                        <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                                    ))}
                                </TextField>
                            )}
                        </Box>
                        <TextField label="Notes" {...tf('notes')} fullWidth multiline rows={2} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : editTarget ? 'Update' : 'Create Inquiry'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
