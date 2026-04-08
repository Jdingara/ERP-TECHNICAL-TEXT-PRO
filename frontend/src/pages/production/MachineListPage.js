// ============================================================
// FILE: pages/production/MachineListPage.js
// PURPOSE: List, create, edit, delete production machines.
//          Weaving / Knitting / Nonwoven / Coating / Finishing / Testing
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableHead, TableRow,
    TableCell, TableBody, Chip, IconButton, Tooltip,
    InputAdornment, Stack, TextField, MenuItem,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useColumnResize } from '../../components/common/useColumnResize';
import AddIcon             from '@mui/icons-material/Add';
import EditIcon            from '@mui/icons-material/Edit';
import DeleteIcon          from '@mui/icons-material/Delete';
import SearchIcon          from '@mui/icons-material/Search';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';

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
    { value: 'active',      label: 'Active',            color: 'success' },
    { value: 'idle',        label: 'Idle',              color: 'default' },
    { value: 'maintenance', label: 'Under Maintenance',  color: 'warning' },
    { value: 'breakdown',   label: 'Breakdown',          color: 'error' },
];

function StatusChip({ status }) {
    const s = STATUS_CHOICES.find(x => x.value === status);
    return <Chip label={s?.label || status} color={s?.color || 'default'} size="small" />;
}

export default function MachineListPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { widths, Resizer } = useColumnResize('machine_list', [110, 180, 130, 110, 130, 110, 90]);
    const [machines,   setMachines]   = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [search,     setSearch]     = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const url = typeFilter
            ? `/api/production/machines/?type=${typeFilter}`
            : '/api/production/machines/';
        const res  = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        setMachines(data.machines || []);
        setLoading(false);
    }, [typeFilter]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this machine?')) return;
        await fetch(`/api/production/machines/${id}/`, { method: 'DELETE', credentials: 'include' });
        load();
    };

    const filtered = machines.filter(m =>
        m.machine_code.toLowerCase().includes(search.toLowerCase()) ||
        m.machine_name.toLowerCase().includes(search.toLowerCase()) ||
        m.location.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <PrecisionManufacturingIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h5" fontWeight={700}>Machine Master</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {machines.length} machine{machines.length !== 1 ? 's' : ''} registered
                        </Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/production/machines/add')}>
                    Add Machine
                </Button>
            </Box>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                    placeholder="Search code, name, location…"
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ minWidth: 260 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                />
                <TextField
                    select size="small" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    sx={{ minWidth: 160 }} label="Machine Type">
                    <MenuItem value="">All Types</MenuItem>
                    {MACHINE_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </TextField>
            </Paper>

            {/* Table */}
            <Paper>
                <Table size="small" sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            {['Code','Name','Type','Capacity','Location','Status','Actions'].map((h, i) => (
                                <TableCell key={h} sx={{ color:'white', fontWeight:'bold', whiteSpace:'nowrap', position:'relative', userSelect:'none', px:2, py:1 }} style={{ width: widths[i], backgroundColor: theme.palette.primary.main }}>
                                    {h}<Resizer index={i} />
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} align="center">Loading…</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center">No machines found.</TableCell></TableRow>
                        ) : filtered.map(m => (
                            <TableRow key={m.id} hover>
                                <TableCell><Typography fontWeight={600} fontSize={13}>{m.machine_code}</Typography></TableCell>
                                <TableCell>{m.machine_name}</TableCell>
                                <TableCell>
                                    <Chip label={MACHINE_TYPES.find(t => t.value === m.machine_type)?.label || m.machine_type}
                                        size="small" variant="outlined" />
                                </TableCell>
                                <TableCell>{m.capacity ? `${m.capacity} ${m.capacity_unit}` : '—'}</TableCell>
                                <TableCell>{m.location || '—'}</TableCell>
                                <TableCell><StatusChip status={m.status} /></TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        <Tooltip title="Edit">
                                            <IconButton size="small" onClick={() => navigate(`/production/machines/edit/${m.id}`)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton size="small" color="error" onClick={() => handleDelete(m.id)}>
                                                <DeleteIcon fontSize="small" />
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
