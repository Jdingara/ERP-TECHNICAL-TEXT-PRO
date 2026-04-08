// ============================================================
// FILE: pages/sales/QuotationPage.js
// PURPOSE: Create and manage quotations.
//          Can be linked to a Customer Inquiry.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableHead, TableRow,
    TableCell, TableBody, Chip, IconButton, Tooltip,
    InputAdornment, Stack, TextField, MenuItem,
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import EditIcon         from '@mui/icons-material/Edit';
import DeleteIcon       from '@mui/icons-material/Delete';
import PrintIcon        from '@mui/icons-material/Print';
import SearchIcon       from '@mui/icons-material/Search';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { useNavigate } from 'react-router-dom';
import { printQuotation } from '../../utils/printUtils';

const STATUS_CHOICES = [
    { value: 'draft',    label: 'Draft',              color: 'default' },
    { value: 'sent',     label: 'Sent to Customer',   color: 'primary' },
    { value: 'accepted', label: 'Accepted',            color: 'success' },
    { value: 'rejected', label: 'Rejected',            color: 'error' },
    { value: 'expired',  label: 'Expired',             color: 'warning' },
];

// Business logic helpers
const canEdit   = (qt) => ['draft', 'sent'].includes(qt.status);
const canDelete = (qt) => qt.status === 'draft';

function StatusChip({ status }) {
    const s = STATUS_CHOICES.find(x => x.value === status);
    return <Chip label={s?.label || status} color={s?.color || 'default'} size="small" />;
}

export default function QuotationPage() {
    const navigate = useNavigate();
    const [quotations,   setQuotations]   = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [search,       setSearch]       = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const url = statusFilter
            ? `/api/sales/quotations/?status=${statusFilter}`
            : '/api/sales/quotations/';
        const res    = await fetch(url, { credentials: 'include' });
        const qtData = await res.json();
        setQuotations(qtData.quotations || []);
        setLoading(false);
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

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
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/sales/quotations/new')}>
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
                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        <Tooltip title="Print Quotation">
                                            <IconButton size="small" onClick={() => printQuotation(qt)}>
                                                <PrintIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={canEdit(qt) ? 'Edit' : 'Locked — accepted/rejected/expired quotations cannot be edited'}>
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => navigate(`/sales/quotations/edit/${qt.id}`)}
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
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
