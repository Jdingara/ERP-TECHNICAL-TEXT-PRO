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
import FileDownloadIcon    from '@mui/icons-material/FileDownload';

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

function ChangesRow({ changes, action }) {
    const list = changes?.changes;

    // ── UPDATED: before → after table ────────────────────────
    if (Array.isArray(list)) {
        if (list.length === 0) {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                    <Typography variant="caption">
                        ℹ️ Record was saved — no field values were modified.
                    </Typography>
                </Box>
            );
        }
        return (
            <Box sx={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                    <thead>
                        <tr>
                            {['Field', 'Before (Old Value)', 'After (New Value)'].map(h => (
                                <th key={h} style={{
                                    textAlign: 'left', padding: '6px 14px',
                                    backgroundColor: '#1e3a5f', color: '#ffffff',
                                    fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap',
                                }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((c, i) => (
                            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                                <td style={{ padding: '6px 14px', fontWeight: 600, whiteSpace: 'nowrap', color: '#334155' }}>
                                    {c.field}
                                </td>
                                <td style={{ padding: '6px 14px' }}>
                                    <span style={{
                                        display: 'inline-block', padding: '2px 10px',
                                        borderRadius: 12, fontSize: 12,
                                        backgroundColor: '#fee2e2', color: '#991b1b',
                                        border: '1px solid #fca5a5', maxWidth: 280,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {c.before !== '' && c.before != null ? c.before : '(empty)'}
                                    </span>
                                </td>
                                <td style={{ padding: '6px 14px' }}>
                                    <span style={{
                                        display: 'inline-block', padding: '2px 10px',
                                        borderRadius: 12, fontSize: 12,
                                        backgroundColor: '#dcfce7', color: '#166534',
                                        border: '1px solid #86efac', maxWidth: 280,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {c.after !== '' && c.after != null ? c.after : '(empty)'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Box>
        );
    }

    // ── CREATED / DELETED: key-value snapshot ─────────────────
    const entries = Object.entries(changes || {}).filter(([k]) => k !== 'changes');
    if (entries.length === 0) {
        return <Typography variant="caption" color="text.secondary">No detail recorded.</Typography>;
    }
    return (
        <Box sx={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                    <tr>
                        {['Field', 'Value'].map(h => (
                            <th key={h} style={{
                                textAlign: 'left', padding: '6px 14px',
                                backgroundColor: '#1e3a5f', color: '#ffffff',
                                fontWeight: 700, fontSize: 12,
                            }}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {entries.map(([k, v], i) => (
                        <tr key={k} style={{ backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                            <td style={{ padding: '6px 14px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                                {k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </td>
                            <td style={{ padding: '6px 14px', color: '#475569' }}>{String(v)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
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
                            <Box sx={{ py: 1.5, px: 2, mb: 0.5 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary"
                                    sx={{ display: 'block', mb: 1, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                    Change Details — {log.action} on {log.object_repr}
                                </Typography>
                                <ChangesRow changes={log.changes} action={log.action} />
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
                <Tooltip title="Download last 200 log entries as CSV — send this to your support team when reporting a problem">
                    <Button
                        startIcon={<FileDownloadIcon />}
                        variant="outlined"
                        size="small"
                        color="success"
                        onClick={async () => {
                            const res  = await fetch('/api/authentication/support-log/', { credentials: 'include' });
                            const blob = await res.blob();
                            const url  = URL.createObjectURL(blob);
                            const a    = document.createElement('a');
                            a.href     = url;
                            a.download = `SASI_ERP_Support_Log_${new Date().toISOString().slice(0,10)}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                    >
                        Download Support Log
                    </Button>
                </Tooltip>
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
