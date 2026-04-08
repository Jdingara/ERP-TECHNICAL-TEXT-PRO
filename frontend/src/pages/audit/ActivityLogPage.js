// FILE: pages/audit/ActivityLogPage.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Chip, TextField, MenuItem, Select,
    FormControl, InputLabel, Button, Collapse, IconButton, CircularProgress,
    Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FilterAltIcon       from '@mui/icons-material/FilterAlt';
import RefreshIcon         from '@mui/icons-material/Refresh';
import ExpandMoreIcon      from '@mui/icons-material/ExpandMore';
import ExpandLessIcon      from '@mui/icons-material/ExpandLess';

// ── Action colours ────────────────────────────────────────────
const ACTION_COLOR = {
    'Created':      'success',
    'Updated':      'warning',
    'Deleted':      'error',
    'Status Changed': 'info',
    'Posted':       'primary',
    'Delivered':    'primary',
    'Confirmed':    'success',
    'Completed':    'success',
    'Marked Paid':  'success',
};

function ChangesRow({ changes }) {
    // changes may be {changes: [...]} or {data: ..., customer: ..., etc.}
    const list = changes?.changes;
    if (list && Array.isArray(list) && list.length > 0) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {list.map((c, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" minWidth={100}>
                            {c.field}
                        </Typography>
                        <Chip label={c.before || '(empty)'} size="small" color="error" variant="outlined"
                              sx={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }} />
                        <Typography variant="caption" color="text.secondary">→</Typography>
                        <Chip label={c.after || '(empty)'} size="small" color="success" variant="outlined"
                              sx={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }} />
                    </Box>
                ))}
            </Box>
        );
    }
    // For create / delete — show key-value pairs
    const entries = Object.entries(changes || {}).filter(([k]) => k !== 'changes');
    if (entries.length === 0) return <Typography variant="caption" color="text.secondary">—</Typography>;
    return (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {entries.map(([k, v]) => (
                <Chip key={k} label={`${k.replace(/_/g, ' ')}: ${v}`} size="small" variant="outlined"
                      sx={{ fontSize: 11 }} />
            ))}
        </Box>
    );
}

function LogRow({ log }) {
    const [open, setOpen] = useState(false);
    const hasChanges = log.changes && Object.keys(log.changes).length > 0;

    return (
        <>
            <TableRow hover sx={{ '& td': { py: 0.8 } }}>
                <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: 13 }}>
                    {log.timestamp.replace('T', ' ').slice(0, 19)}
                </TableCell>
                <TableCell>
                    <Typography variant="body2" fontWeight={600}>{log.user}</Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2">{log.module}</Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" fontWeight={600} color="primary.main">{log.object_repr}</Typography>
                </TableCell>
                <TableCell>
                    <Chip
                        label={log.action}
                        size="small"
                        color={ACTION_COLOR[log.action] || 'default'}
                        sx={{ fontWeight: 600, fontSize: 12 }}
                    />
                </TableCell>
                <TableCell align="center">
                    {hasChanges ? (
                        <Tooltip title={open ? 'Hide details' : 'Show details'}>
                            <IconButton size="small" onClick={() => setOpen(v => !v)}>
                                {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                    ) : '—'}
                </TableCell>
            </TableRow>
            {hasChanges && (
                <TableRow>
                    <TableCell colSpan={6} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 1.5, px: 2, backgroundColor: 'action.hover', borderRadius: 1, mb: 0.5 }}>
                                <ChangesRow changes={log.changes} />
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

function ActivityLogPage() {
    const theme = useTheme();
    const [logs,    setLogs]    = useState([]);
    const [meta,    setMeta]    = useState({ modules: [], actions: [], users: [] });
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        module: '', action: '', user_id: '', from_date: '', to_date: '', search: '',
    });

    const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));

    const fetchLogs = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        fetch(`/api/authentication/audit-logs/?${params}`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                setLogs(data.logs || []);
                setMeta({
                    modules: data.modules || [],
                    actions: data.actions || [],
                    users:   data.users   || [],
                });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [filters]);

    useEffect(() => { fetchLogs(); }, []);   // initial load only

    const handleApply = () => fetchLogs();
    const handleClear = () => {
        setFilters({ module: '', action: '', user_id: '', from_date: '', to_date: '', search: '' });
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>Activity Log</Typography>
                <Button startIcon={<RefreshIcon />} variant="outlined" size="small" onClick={fetchLogs}>
                    Refresh
                </Button>
            </Box>

            {/* Filters */}
            <Paper sx={{ p: 2, borderRadius: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <FilterAltIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2" fontWeight={700}>Filters</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1.5 }}>
                    <TextField size="small" label="Search record" value={filters.search}
                        onChange={e => setF('search', e.target.value)} />

                    <FormControl size="small">
                        <InputLabel>Module</InputLabel>
                        <Select value={filters.module} label="Module" onChange={e => setF('module', e.target.value)}>
                            <MenuItem value="">All Modules</MenuItem>
                            {meta.modules.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl size="small">
                        <InputLabel>Action</InputLabel>
                        <Select value={filters.action} label="Action" onChange={e => setF('action', e.target.value)}>
                            <MenuItem value="">All Actions</MenuItem>
                            {meta.actions.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl size="small">
                        <InputLabel>User</InputLabel>
                        <Select value={filters.user_id} label="User" onChange={e => setF('user_id', e.target.value)}>
                            <MenuItem value="">All Users</MenuItem>
                            {meta.users.map(u => <MenuItem key={u.id} value={u.id}>{u.username}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <TextField size="small" label="From Date" type="date" value={filters.from_date}
                        onChange={e => setF('from_date', e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" label="To Date" type="date" value={filters.to_date}
                        onChange={e => setF('to_date', e.target.value)} InputLabelProps={{ shrink: true }} />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                    <Button variant="contained" size="small" startIcon={<FilterAltIcon />} onClick={handleApply}
                        sx={{ backgroundColor: 'primary.main' }}>Apply Filters</Button>
                    <Button variant="outlined" size="small" onClick={handleClear}>Clear</Button>
                </Box>
            </Paper>

            {/* Log count */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                    Showing <strong>{logs.length}</strong> log entries
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Click the expand icon on any row to see before / after details
                </Typography>
            </Box>

            {/* Table */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
            ) : (
                <Paper sx={{ borderRadius: 2 }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {['Timestamp', 'User', 'Module', 'Record', 'Action', 'Details'].map((h, i) => (
                                        <TableCell key={h}
                                            style={{ backgroundColor: theme.palette.primary.main }}
                                            sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap',
                                                  width: i === 5 ? 60 : undefined }}>
                                            {h}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                            No activity log entries found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map(log => <LogRow key={log.id} log={log} />)
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
        </Box>
    );
}

export default ActivityLogPage;
