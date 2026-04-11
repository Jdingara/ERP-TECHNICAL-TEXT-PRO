// ============================================================
// FILE: pages/sales/InquiryListPage.js
// PURPOSE: View and manage customer inquiries (technical textile).
//          Inquiry → Quotation → Sales Order flow starting here.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableHead, TableRow,
    TableCell, TableBody, Chip, IconButton, Tooltip,
    InputAdornment, Stack,
} from '@mui/material';
import { TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useColumnResize } from '../../components/common/useColumnResize';
import AddIcon             from '@mui/icons-material/Add';
import EditIcon            from '@mui/icons-material/Edit';
import SearchIcon          from '@mui/icons-material/Search';
import ContentCopyIcon     from '@mui/icons-material/ContentCopy';
import QuestionAnswerIcon  from '@mui/icons-material/QuestionAnswer';

const STATUS_CHOICES = [
    { value: 'new',           label: 'New',           color: 'info' },
    { value: 'in_discussion', label: 'In Discussion',  color: 'primary' },
    { value: 'sampling',      label: 'Sampling',       color: 'warning' },
    { value: 'quoted',        label: 'Quoted',         color: 'secondary' },
    { value: 'won',           label: 'Won',            color: 'success' },
    { value: 'lost',          label: 'Lost',           color: 'error' },
];

function StatusChip({ status }) {
    const s = STATUS_CHOICES.find(x => x.value === status);
    return <Chip label={s?.label || status} color={s?.color || 'default'} size="small" />;
}

export default function InquiryListPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { widths, Resizer } = useColumnResize('inquiry_list', [120, 160, 200, 120, 90, 110, 110, 90]);
    const [inquiries,    setInquiries]    = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [search,       setSearch]       = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const url = statusFilter
            ? `/api/sales/inquiries/?status=${statusFilter}`
            : '/api/sales/inquiries/';
        const res     = await fetch(url, { credentials: 'include' });
        const inqData = await res.json();
        setInquiries(inqData.inquiries || []);
        setLoading(false);
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

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
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/sales/inquiries/new')}>
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
                                <TableCell key={h} sx={{ color:'white', fontWeight:'bold', whiteSpace:'nowrap', position:'relative', userSelect:'none', px:2, py:1 }} style={{ width: widths[i], backgroundColor: theme.palette.primary.main }}>
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
                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        <Tooltip title="Duplicate — create new inquiry with same details">
                                            <IconButton size="small" color="primary" onClick={() => navigate(`/sales/inquiries/new?from=${inq.id}`)}>
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Edit">
                                            <IconButton size="small" onClick={() => navigate(`/sales/inquiries/edit/${inq.id}`)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
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
