// ============================================================
// FILE: pages/sales/QuotationPage.js
// PURPOSE: Create and manage quotations.
//          Can be linked to a Customer Inquiry.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableHead, TableRow,
    TableCell, TableBody, Chip, IconButton, Tooltip,
    InputAdornment, Stack, TextField, Checkbox,
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import EditIcon         from '@mui/icons-material/Edit';
import DeleteIcon       from '@mui/icons-material/Delete';
import PrintIcon        from '@mui/icons-material/Print';
import SearchIcon       from '@mui/icons-material/Search';
import ShareIcon        from '@mui/icons-material/Share';
import ContentCopyIcon  from '@mui/icons-material/ContentCopy';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { useNavigate } from 'react-router-dom';
import { printQuotation } from '../../utils/printUtils';
import ShareWidget     from '../../components/common/ShareWidget';
import BulkShareDialog from '../../components/common/BulkShareDialog';

const STATUS_CHOICES = [
    { value: 'draft',    label: 'Draft',              color: 'default' },
    { value: 'sent',     label: 'Sent to Customer',   color: 'primary' },
    { value: 'accepted', label: 'Accepted',            color: 'success' },
    { value: 'rejected', label: 'Rejected',            color: 'error' },
    { value: 'expired',  label: 'Expired',             color: 'warning' },
];

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
    const [selected,     setSelected]     = useState(new Set());
    const [bulkOpen,     setBulkOpen]     = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const url = statusFilter
            ? `/api/sales/quotations/?status=${statusFilter}`
            : '/api/sales/quotations/';
        const res    = await fetch(url, { credentials: 'include' });
        const qtData = await res.json();
        setQuotations(qtData.quotations || []);
        setSelected(new Set());
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

    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === filtered.length) setSelected(new Set());
        else setSelected(new Set(filtered.map(q => q.id)));
    };

    const filtered = quotations.filter(q =>
        q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
        q.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        q.product_description.toLowerCase().includes(search.toLowerCase())
    );

    const bulkRows = filtered
        .filter(q => selected.has(q.id))
        .map(q => ({
            id:    q.id,
            title: `Quotation ${q.quotation_number}`,
            email: q.customer_email || '',
            phone: q.customer_phone || '',
            vars:  {
                customer_name:   q.customer_name,
                document_number: q.quotation_number,
                amount:          `₹${parseFloat(q.total_amount).toLocaleString('en-IN')}`,
                date:            q.date,
            },
        }));

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
                <Stack direction="row" spacing={1}>
                    {selected.size > 0 && (
                        <Button
                            variant="outlined"
                            startIcon={<ShareIcon />}
                            onClick={() => setBulkOpen(true)}
                            sx={{ textTransform: 'none', borderRadius: 2 }}
                        >
                            Share Selected ({selected.size})
                        </Button>
                    )}
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/sales/quotations/new')}>
                        New Quotation
                    </Button>
                </Stack>
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
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                />
            </Paper>

            {/* Table */}
            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: 'primary.main', color: 'primary.contrastText', fontSize: 12.5 } }}>
                            <TableCell padding="checkbox" sx={{ backgroundColor: 'primary.main' }}>
                                <Checkbox
                                    size="small"
                                    indeterminate={selected.size > 0 && selected.size < filtered.length}
                                    checked={filtered.length > 0 && selected.size === filtered.length}
                                    onChange={toggleAll}
                                    sx={{ color: 'primary.contrastText', '&.Mui-checked': { color: 'primary.contrastText' }, '&.MuiCheckbox-indeterminate': { color: 'primary.contrastText' } }}
                                />
                            </TableCell>
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
                            <TableRow><TableCell colSpan={10} align="center">Loading…</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={10} align="center">No quotations found.</TableCell></TableRow>
                        ) : filtered.map(qt => (
                            <TableRow key={qt.id} hover selected={selected.has(qt.id)}>
                                <TableCell padding="checkbox">
                                    <Checkbox size="small" checked={selected.has(qt.id)} onChange={() => toggleSelect(qt.id)} />
                                </TableCell>
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
                                        <Tooltip title="Duplicate — create new quotation with same details">
                                            <IconButton size="small" color="primary" onClick={() => navigate(`/sales/quotations/new?from=${qt.id}`)}>
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Print Quotation">
                                            <IconButton size="small" onClick={() => printQuotation(qt)}>
                                                <PrintIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <ShareWidget
                                            title={`Quotation ${qt.quotation_number}`}
                                            docType="quotation"
                                            vars={{
                                                customer_name:   qt.customer_name,
                                                document_number: qt.quotation_number,
                                                amount:          `₹${parseFloat(qt.total_amount).toLocaleString('en-IN')}`,
                                                date:            qt.date,
                                            }}
                                            email={qt.customer_email || ''}
                                            phone={qt.customer_phone || ''}
                                        />
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

            <BulkShareDialog
                open={bulkOpen}
                onClose={() => setBulkOpen(false)}
                docType="quotation"
                rows={bulkRows}
            />
        </Box>
    );
}
