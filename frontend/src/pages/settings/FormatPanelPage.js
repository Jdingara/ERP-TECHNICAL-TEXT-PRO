// ============================================================
// FILE: pages/settings/FormatPanelPage.js
// PURPOSE: Admin settings page — configure Financial Years
//          and Document Series auto-numbering formats.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, Card, CardContent, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Select, MenuItem, FormControl, InputLabel,
    Switch, FormControlLabel, Chip, Alert, CircularProgress,
    Divider, Tooltip, IconButton,
} from '@mui/material';
import EditIcon        from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon         from '@mui/icons-material/Add';
import RefreshIcon     from '@mui/icons-material/Refresh';
import RestoreIcon     from '@mui/icons-material/Restore';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SettingsIcon    from '@mui/icons-material/Settings';
import { useColumnResize } from '../../components/common/useColumnResize';

const API = '/api/master-data/settings';

// ─── Financial Year Panel ────────────────────────────────────
function FinancialYearPanel() {
    const { widths, Resizer } = useColumnResize("formatpanel", [100, 180, 150, 80]);
    const [years,    setYears]    = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [msg,      setMsg]      = useState('');
    const [msgType,  setMsgType]  = useState('success');
    const [open,     setOpen]     = useState(false);
    const [form,     setForm]     = useState({ label: '', start_date: '', end_date: '' });

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/financial-years/`, { credentials: 'include' });
            const json = await res.json();
            setYears(Array.isArray(json) ? json : []);
        } catch (e) { setYears([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const create = async () => {
        try {
            const res  = await fetch(`${API}/financial-years/`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message);
            setMsg(json.message); setMsgType('success');
            setOpen(false);
            setForm({ label: '', start_date: '', end_date: '' });
            load();
        } catch (e) { setMsg(e.message); setMsgType('error'); }
    };

    const activate = async (id, label) => {
        if (!window.confirm(`Activate "${label}"? All document counters will reset to starting number.`)) return;
        try {
            const res  = await fetch(`${API}/financial-years/${id}/activate/`, {
                method: 'POST', credentials: 'include',
            });
            const json = await res.json();
            setMsg(json.message); setMsgType(res.ok ? 'success' : 'error');
            load();
        } catch (e) { setMsg(e.message); setMsgType('error'); }
    };

    const deleteFY = async (id, label) => {
        if (!window.confirm(`Delete financial year "${label}"?`)) return;
        try {
            const res  = await fetch(`${API}/financial-years/${id}/delete/`, {
                method: 'DELETE', credentials: 'include',
            });
            const json = await res.json();
            setMsg(json.message); setMsgType(res.ok ? 'success' : 'error');
            load();
        } catch (e) { setMsg(e.message); setMsgType('error'); }
    };

    return (
        <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: 2, mb: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarMonthIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="bold" color="primary">Financial Year</Typography>
                </Box>
                <Button variant="contained" size="small" startIcon={<AddIcon />}
                    sx={{ backgroundColor: 'primary.main' }} onClick={() => setOpen(true)}>
                    New Financial Year
                </Button>
            </Box>

            {msg && <Alert severity={msgType} sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

            {loading ? <CircularProgress size={24} /> : (
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: 'action.hover' }}>
                            <TableRow>
                                {['Year Label', 'Start Date', 'End Date', 'Status', 'Actions'].map(h => (
                                    <TableCell key={h} sx={{ fontWeight: 'bold', fontSize: 12 }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {years.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                                        No financial years created yet. Click "New Financial Year" to add one.
                                    </TableCell>
                                </TableRow>
                            ) : years.map(fy => (
                                <TableRow key={fy.id} sx={{ backgroundColor: fy.is_active ? '#e8f5e9' : 'white' }}>
                                    <TableCell><strong>{fy.label}</strong></TableCell>
                                    <TableCell>{fy.start_date}</TableCell>
                                    <TableCell>{fy.end_date}</TableCell>
                                    <TableCell>
                                        {fy.is_active
                                            ? <Chip label="ACTIVE" size="small" color="success" icon={<CheckCircleIcon />} />
                                            : <Chip label="Inactive" size="small" variant="outlined" />}
                                    </TableCell>
                                    <TableCell>
                                        {!fy.is_active && (
                                            <>
                                                <Button size="small" variant="outlined" color="success"
                                                    sx={{ mr: 1, fontSize: 11 }}
                                                    onClick={() => activate(fy.id, fy.label)}>
                                                    Activate
                                                </Button>
                                                <Button size="small" variant="outlined" color="error"
                                                    sx={{ fontSize: 11 }}
                                                    onClick={() => deleteFY(fy.id, fy.label)}>
                                                    Delete
                                                </Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Create FY Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                    Create New Financial Year
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField label="Year Label *" placeholder="e.g., 2025-26"
                        value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
                        helperText="This label is used in document numbers when Include FY is ON" fullWidth size="small" />
                    <TextField label="Start Date *" type="date" InputLabelProps={{ shrink: true }}
                        value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                        fullWidth size="small" />
                    <TextField label="End Date *" type="date" InputLabelProps={{ shrink: true }}
                        value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                        fullWidth size="small" />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={create}
                        disabled={!form.label || !form.start_date || !form.end_date}
                        sx={{ backgroundColor: 'primary.main' }}>
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}


// ─── Document Series Panel ────────────────────────────────────
const PADDING_OPTIONS = [
    { value: 2, label: '01  (2 digits)' },
    { value: 3, label: '001 (3 digits)' },
    { value: 4, label: '0001 (4 digits)' },
    { value: 5, label: '00001 (5 digits)' },
];

const SEP_OPTIONS = [
    { value: '-',  label: 'Hyphen  —  PO-001' },
    { value: '/',  label: 'Slash   —  PO/001' },
    { value: '_',  label: 'Underscore — PO_001' },
    { value: '',   label: 'None    —  PO001' },
];

function DocumentSeriesPanel() {
    const [series,  setSeries]  = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg,     setMsg]     = useState('');
    const [msgType, setMsgType] = useState('success');
    const [editing, setEditing] = useState(null);   // series object being edited
    const [form,    setForm]    = useState({});

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/document-series/`, { credentials: 'include' });
            setSeries(await res.json());
        } catch (e) { setSeries([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const openEdit = (s) => {
        setEditing(s);
        setForm({
            prefix:          s.prefix,
            include_fy:      s.include_fy,
            separator:       s.separator,
            padding:         s.padding,
            starting_number: s.starting_number,
            is_enabled:      s.is_enabled,
        });
    };

    const save = async () => {
        try {
            const res  = await fetch(`${API}/document-series/${editing.id}/`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message);
            setMsg(`"${editing.label}" format updated.`); setMsgType('success');
            setEditing(null);
            load();
        } catch (e) { setMsg(e.message); setMsgType('error'); }
    };

    const reset = async (s) => {
        if (!window.confirm(`Reset counter for "${s.label}"? Next number will be ${s.starting_number}.`)) return;
        try {
            const res  = await fetch(`${API}/document-series/${s.id}/reset/`, {
                method: 'POST', credentials: 'include',
            });
            const json = await res.json();
            setMsg(json.message); setMsgType(res.ok ? 'success' : 'error');
            load();
        } catch (e) { setMsg(e.message); setMsgType('error'); }
    };

    // Preview inside edit dialog
    const previewNumber = () => {
        const parts = [];
        if (form.prefix) parts.push(form.prefix);
        if (form.include_fy) parts.push('25-26');  // example FY
        const n = Math.max((editing?.current_number || 0) + 1, parseInt(form.starting_number) || 1);
        parts.push(String(n).padStart(parseInt(form.padding) || 3, '0'));
        const sep = form.separator !== undefined ? form.separator : '-';
        return parts.join(sep) || '—';
    };

    return (
        <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: 2 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="bold" color="primary">Document Series Format</Typography>
                </Box>
                <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={load}>
                    Refresh
                </Button>
            </Box>

            {msg && <Alert severity={msgType} sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

            <Alert severity="info" sx={{ mb: 2 }}>
                <strong>How it works:</strong> Format = Prefix + Separator + Financial Year (optional) + Separator + Number.
                Example: <strong>PO-25-26-001</strong> (prefix=PO, FY=25-26, pad=3, sep=-)
            </Alert>

            {loading ? <CircularProgress size={24} /> : (
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: 'action.hover' }}>
                            <TableRow>
                                {['Document', 'Prefix', 'Sep', 'Inc. FY', 'Padding', 'Start', 'Current #', 'Preview', 'Status', 'Actions'].map(h => (
                                    <TableCell key={h} sx={{ fontWeight: 'bold', fontSize: 11, whiteSpace: 'nowrap' }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {series.map(s => (
                                <TableRow key={s.id} sx={{
                                    backgroundColor: s.is_enabled ? 'white' : '#fafafa',
                                    opacity: s.is_enabled ? 1 : 0.6,
                                }}>
                                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{s.label}</TableCell>
                                    <TableCell>
                                        <Chip label={s.prefix || '—'} size="small"
                                            sx={{ fontSize: 11, backgroundColor: '#e3f2fd' }} />
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>
                                        {s.separator === '' ? '(none)' : s.separator}
                                    </TableCell>
                                    <TableCell>
                                        {s.include_fy
                                            ? <Chip label="YES" size="small" color="primary" sx={{ fontSize: 10 }} />
                                            : <Chip label="NO"  size="small" variant="outlined" sx={{ fontSize: 10 }} />}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{`${s.padding}d`}</TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>{s.starting_number}</TableCell>
                                    <TableCell sx={{ fontSize: 12, color: '#666' }}>{s.current_number}</TableCell>
                                    <TableCell>
                                        <Chip label={s.preview} size="small"
                                            sx={{ fontSize: 11, backgroundColor: '#e8f5e9', fontFamily: 'monospace' }} />
                                    </TableCell>
                                    <TableCell>
                                        {s.is_enabled
                                            ? <Chip label="Auto ON" size="small" color="success" sx={{ fontSize: 10 }} />
                                            : <Chip label="Manual"  size="small" color="default" sx={{ fontSize: 10 }} />}
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title="Edit format">
                                            <IconButton size="small" onClick={() => openEdit(s)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Reset counter">
                                            <IconButton size="small" color="warning" onClick={() => reset(s)}>
                                                <RestoreIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
                    Edit Format — {editing?.label}
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5, mt: 1 }}>
                    <Grid container spacing={2}>

                        <Grid item xs={12}>
                            <TextField
                                label="Prefix"
                                placeholder="e.g., PO, INV, IT, CUS"
                                value={form.prefix || ''}
                                onChange={e => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
                                fullWidth size="small"
                                helperText="Short text that identifies the document type"
                            />
                        </Grid>

                        <Grid item xs={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Separator</InputLabel>
                                <Select value={form.separator ?? '-'} label="Separator"
                                    onChange={e => setForm({ ...form, separator: e.target.value })}>
                                    {SEP_OPTIONS.map(o => (
                                        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Number Padding</InputLabel>
                                <Select value={form.padding || 3} label="Number Padding"
                                    onChange={e => setForm({ ...form, padding: e.target.value })}>
                                    {PADDING_OPTIONS.map(o => (
                                        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={6}>
                            <TextField
                                label="Starting Number"
                                type="number"
                                value={form.starting_number || 1}
                                onChange={e => setForm({ ...form, starting_number: parseInt(e.target.value) || 1 })}
                                fullWidth size="small"
                                helperText="First number to issue"
                            />
                        </Grid>

                        <Grid item xs={6}>
                            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 1.5, height: '100%' }}>
                                <Typography fontSize={11} color="text.secondary" mb={0.5}>Include Financial Year?</Typography>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={form.include_fy || false}
                                            onChange={e => setForm({ ...form, include_fy: e.target.checked })}
                                            color="primary" size="small"
                                        />
                                    }
                                    label={form.include_fy ? 'Yes — FY included' : 'No — FY excluded'}
                                    sx={{ fontSize: 12 }}
                                />
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={form.is_enabled || false}
                                        onChange={e => setForm({ ...form, is_enabled: e.target.checked })}
                                        color="success"
                                    />
                                }
                                label={form.is_enabled ? 'Auto-numbering ON (code is generated automatically)' : 'Auto-numbering OFF (user types code manually)'}
                            />
                        </Grid>

                        {/* Live Preview */}
                        <Grid item xs={12}>
                            <Box sx={{ backgroundColor: '#f5f7ff', border: '1px solid #c5cae9', borderRadius: 1.5, p: 2, textAlign: 'center' }}>
                                <Typography fontSize={11} color="text.secondary" mb={0.5}>NEXT NUMBER PREVIEW</Typography>
                                <Typography variant="h5" fontWeight="bold" color="primary" fontFamily="monospace">
                                    {form.is_enabled ? previewNumber() : 'Manual entry'}
                                </Typography>
                                {form.include_fy && (
                                    <Typography fontSize={10} color="text.secondary" mt={0.5}>
                                        * FY shown as "25-26" — uses active Financial Year label
                                    </Typography>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setEditing(null)}>Cancel</Button>
                    <Button variant="contained" onClick={save}
                        sx={{ backgroundColor: 'primary.main' }}>
                        Save Format
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}


// ─── Main Page ───────────────────────────────────────────────
function FormatPanelPage() {
    return (
        <Box sx={{ pb: 4 }}>
            {/* Page header */}
            <Box sx={{
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark || theme.palette.primary.main} 0%, ${theme.palette.primary.main} 100%)`,
                borderRadius: 2, p: 2.5, mb: 3, color: 'white',
            }}>
                <Typography variant="h5" fontWeight="bold">Format Panel</Typography>
                <Typography fontSize={12} sx={{ opacity: 0.7, mt: 0.3 }}>
                    Configure auto-numbering formats for all document types · Admin only
                </Typography>
            </Box>

            <FinancialYearPanel />
            <DocumentSeriesPanel />
        </Box>
    );
}

export default FormatPanelPage;
