// ============================================================
// FILE: pages/production/BatchListPage.js
// PURPOSE: View all production batches with expiry tracking.
//          Batches are auto-created when a Work Order is completed.
// ============================================================

import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableHead, TableRow,
    TableCell, TableBody, Chip, TextField, InputAdornment,
    Stack,
} from '@mui/material';
import SearchIcon    from '@mui/icons-material/Search';
import LayersIcon    from '@mui/icons-material/Layers';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useColumnResize } from '../../components/common/useColumnResize';

function expiryStatus(expiryDate) {
    if (!expiryDate) return null;
    const today  = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0)  return { label: 'Expired',     color: 'error',   days: daysLeft };
    if (daysLeft <= 30) return { label: `${daysLeft}d left`, color: 'warning', days: daysLeft };
    return { label: `${daysLeft}d left`, color: 'success', days: daysLeft };
}

export default function BatchListPage() {
    const { widths, Resizer } = useColumnResize('batch_list', [120, 150, 110, 200, 110, 130, 130, 150]);
    const [batches,  setBatches]  = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [search,   setSearch]   = useState('');
    const [filter,   setFilter]   = useState('all'); // all | expiring | expired

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const res  = await fetch('/api/production/batches/', { credentials: 'include' });
            const data = await res.json();
            setBatches(data.batches || []);
            setLoading(false);
        };
        load();
    }, []);

    const expiringSoon = batches.filter(b => {
        if (!b.expiry_date) return false;
        const s = expiryStatus(b.expiry_date);
        return s && s.days >= 0 && s.days <= 30;
    }).length;

    const expired = batches.filter(b => {
        if (!b.expiry_date) return false;
        const s = expiryStatus(b.expiry_date);
        return s && s.days < 0;
    }).length;

    const filtered = batches.filter(b => {
        const matchSearch = b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
                            b.item_name.toLowerCase().includes(search.toLowerCase()) ||
                            b.item_code.toLowerCase().includes(search.toLowerCase()) ||
                            b.work_order.toLowerCase().includes(search.toLowerCase());
        if (!matchSearch) return false;
        if (filter === 'expiring') {
            if (!b.expiry_date) return false;
            const s = expiryStatus(b.expiry_date);
            return s && s.days >= 0 && s.days <= 30;
        }
        if (filter === 'expired') {
            if (!b.expiry_date) return false;
            const s = expiryStatus(b.expiry_date);
            return s && s.days < 0;
        }
        return true;
    });

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                <LayersIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                <Box>
                    <Typography variant="h5" fontWeight={700}>Production Batches</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Auto-created when a Work Order is completed
                    </Typography>
                </Box>
            </Box>

            {/* KPI cards */}
            <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
                <Paper sx={{ p: 2, flex: 1, minWidth: 130, borderLeft: '4px solid #6366f1' }}>
                    <Typography fontSize={24} fontWeight={700} color="#6366f1">{batches.length}</Typography>
                    <Typography fontSize={12} color="text.secondary">Total Batches</Typography>
                </Paper>
                <Paper
                    onClick={() => setFilter(filter === 'expiring' ? 'all' : 'expiring')}
                    sx={{ p: 2, flex: 1, minWidth: 130, borderLeft: '4px solid #f97316', cursor: 'pointer',
                        backgroundColor: filter === 'expiring' ? '#f9731610' : 'background.paper' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography fontSize={24} fontWeight={700} color="#f97316">{expiringSoon}</Typography>
                        {expiringSoon > 0 && <WarningAmberIcon sx={{ color: '#f97316', fontSize: 20 }} />}
                    </Box>
                    <Typography fontSize={12} color="text.secondary">Expiring ≤ 30 days</Typography>
                </Paper>
                <Paper
                    onClick={() => setFilter(filter === 'expired' ? 'all' : 'expired')}
                    sx={{ p: 2, flex: 1, minWidth: 130, borderLeft: '4px solid #ef4444', cursor: 'pointer',
                        backgroundColor: filter === 'expired' ? '#ef444410' : 'background.paper' }}>
                    <Typography fontSize={24} fontWeight={700} color="#ef4444">{expired}</Typography>
                    <Typography fontSize={12} color="text.secondary">Expired</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, minWidth: 130, borderLeft: '4px solid #10b981' }}>
                    <Typography fontSize={24} fontWeight={700} color="#10b981">
                        {batches.filter(b => !b.expiry_date).length}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary">No Expiry</Typography>
                </Paper>
            </Box>

            {/* Search */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <TextField
                    placeholder="Search batch #, item, work order…"
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
                            {['Batch #','Work Order','Item Code','Item Name','Qty Produced','Production Date','Expiry Date','Shelf Life Status'].map((h, i) => (
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
                            <TableRow><TableCell colSpan={8} align="center">No batches found.</TableCell></TableRow>
                        ) : filtered.map(b => {
                            const expiry = b.expiry_date ? expiryStatus(b.expiry_date) : null;
                            return (
                                <TableRow key={b.id} hover>
                                    <TableCell>
                                        <Typography fontWeight={600} fontSize={13}>{b.batch_number}</Typography>
                                    </TableCell>
                                    <TableCell>{b.work_order}</TableCell>
                                    <TableCell>{b.item_code}</TableCell>
                                    <TableCell>{b.item_name}</TableCell>
                                    <TableCell align="right">{parseFloat(b.quantity_produced).toFixed(2)}</TableCell>
                                    <TableCell>{b.production_date}</TableCell>
                                    <TableCell>{b.expiry_date || '—'}</TableCell>
                                    <TableCell>
                                        {expiry ? (
                                            <Chip
                                                label={expiry.label}
                                                color={expiry.color}
                                                size="small"
                                                icon={expiry.days < 0 || expiry.days <= 30
                                                    ? <WarningAmberIcon style={{ fontSize: 14 }} />
                                                    : undefined}
                                            />
                                        ) : (
                                            <Typography fontSize={12} color="text.disabled">—</Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
