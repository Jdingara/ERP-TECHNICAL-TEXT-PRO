// ============================================================
// FILE: pages/production/QualityCheckPage.js
// PURPOSE: Quality inspection results for work orders / batches.
//          Records yarn count, tensile strength, elongation, etc.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableHead, TableRow,
    TableCell, TableBody, Chip, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, MenuItem, IconButton, Tooltip,
    InputAdornment, Stack, Divider,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import SearchIcon     from '@mui/icons-material/Search';
import VerifiedIcon   from '@mui/icons-material/Verified';

const RESULT_COLORS = {
    pass:    'success',
    fail:    'error',
    pending: 'warning',
};

const EMPTY_FORM = {
    work_order_id: '', batch_id: '', check_date: '', checked_by: '',
    result: 'pending', remarks: '',
    yarn_count_actual: '', strength_value: '', elongation_percent: '', unevenness_percent: '',
};

export default function QualityCheckPage() {
    const [checks,       setChecks]      = useState([]);
    const [workOrders,   setWorkOrders]  = useState([]);
    const [batches,      setBatches]     = useState([]);
    const [loading,      setLoading]     = useState(true);
    const [search,       setSearch]      = useState('');
    const [resultFilter, setResultFilter] = useState('');
    const [dialogOpen,   setDialogOpen]  = useState(false);
    const [form,         setForm]        = useState(EMPTY_FORM);
    const [saving,       setSaving]      = useState(false);
    const [error,        setError]       = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const [qcRes, woRes, batchRes] = await Promise.all([
            fetch('/api/production/quality-checks/', { credentials: 'include' }),
            fetch('/api/production/work-orders/', { credentials: 'include' }),
            fetch('/api/production/batches/', { credentials: 'include' }),
        ]);
        const qcData    = await qcRes.json();
        const woData    = await woRes.json();
        const batchData = await batchRes.json();
        setChecks(qcData.quality_checks || []);
        setWorkOrders(woData.work_orders || []);
        setBatches(batchData.batches || []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        setForm(EMPTY_FORM);
        setError('');
        setDialogOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const res  = await fetch('/api/production/quality-checks/', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    batch_id:          form.batch_id || null,
                    strength_value:    form.strength_value || null,
                    elongation_percent: form.elongation_percent || null,
                    unevenness_percent: form.unevenness_percent || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || 'Save failed.'); return; }
            setDialogOpen(false);
            load();
        } catch { setError('Network error.'); }
        finally { setSaving(false); }
    };

    const tf = (k) => ({ value: form[k], onChange: (e) => setForm(p => ({ ...p, [k]: e.target.value })) });

    const filtered = checks.filter(c => {
        const matchSearch  = c.work_order.toLowerCase().includes(search.toLowerCase()) ||
                             c.checked_by.toLowerCase().includes(search.toLowerCase());
        const matchResult  = resultFilter ? c.result === resultFilter : true;
        return matchSearch && matchResult;
    });

    const passPct = checks.length > 0
        ? Math.round((checks.filter(c => c.result === 'pass').length / checks.length) * 100)
        : 0;

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <VerifiedIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h5" fontWeight={700}>Quality Checks</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Inspection results for production batches
                        </Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Record Check
                </Button>
            </Box>

            {/* KPI chips */}
            <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
                {['pass', 'fail', 'pending'].map(r => {
                    const count = checks.filter(c => c.result === r).length;
                    return (
                        <Chip
                            key={r}
                            label={`${r.charAt(0).toUpperCase() + r.slice(1)}: ${count}`}
                            color={resultFilter === r ? RESULT_COLORS[r] : 'default'}
                            variant={resultFilter === r ? 'filled' : 'outlined'}
                            onClick={() => setResultFilter(resultFilter === r ? '' : r)}
                            sx={{ cursor: 'pointer', fontWeight: 600 }}
                        />
                    );
                })}
                {checks.length > 0 && (
                    <Chip
                        label={`Pass Rate: ${passPct}%`}
                        color={passPct >= 90 ? 'success' : passPct >= 70 ? 'warning' : 'error'}
                        variant="filled"
                        sx={{ fontWeight: 700 }}
                    />
                )}
            </Box>

            {/* Search */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <TextField
                    placeholder="Search work order, inspector…"
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ minWidth: 300 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                />
            </Paper>

            {/* Table */}
            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: 'action.hover' } }}>
                            <TableCell>Work Order</TableCell>
                            <TableCell>Check Date</TableCell>
                            <TableCell>Checked By</TableCell>
                            <TableCell>Yarn Count</TableCell>
                            <TableCell>Strength (N)</TableCell>
                            <TableCell>Elongation %</TableCell>
                            <TableCell>Unevenness %</TableCell>
                            <TableCell>Result</TableCell>
                            <TableCell>Remarks</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={9} align="center">Loading…</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={9} align="center">No quality checks found.</TableCell></TableRow>
                        ) : filtered.map((c, i) => (
                            <TableRow key={i} hover>
                                <TableCell><Typography fontWeight={600} fontSize={13}>{c.work_order}</Typography></TableCell>
                                <TableCell>{c.check_date}</TableCell>
                                <TableCell>{c.checked_by}</TableCell>
                                <TableCell>{c.yarn_count_actual || '—'}</TableCell>
                                <TableCell>{c.strength_value || '—'}</TableCell>
                                <TableCell>{c.elongation_percent || '—'}</TableCell>
                                <TableCell>{c.unevenness_percent || '—'}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={c.result.charAt(0).toUpperCase() + c.result.slice(1)}
                                        color={RESULT_COLORS[c.result] || 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell sx={{ maxWidth: 160 }}>
                                    <Typography fontSize={12} noWrap>{c.remarks || '—'}</Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            {/* Create Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle fontWeight={700}>Record Quality Check</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} mt={0.5}>
                        {error && <Typography color="error" fontSize={13}>{error}</Typography>}

                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>WORK ORDER</Typography>
                        <Box display="flex" gap={2}>
                            <TextField select label="Work Order *" value={form.work_order_id}
                                onChange={e => setForm(p => ({ ...p, work_order_id: e.target.value }))} fullWidth>
                                {workOrders.map(wo => (
                                    <MenuItem key={wo.id} value={wo.id}>
                                        {wo.work_order_number} · {wo.finished_product}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField select label="Batch (optional)" value={form.batch_id}
                                onChange={e => setForm(p => ({ ...p, batch_id: e.target.value }))} fullWidth>
                                <MenuItem value="">— No Batch —</MenuItem>
                                {batches.map(b => (
                                    <MenuItem key={b.id} value={b.id}>{b.batch_number}</MenuItem>
                                ))}
                            </TextField>
                        </Box>
                        <Box display="flex" gap={2}>
                            <TextField label="Check Date *" {...tf('check_date')} type="date"
                                fullWidth InputLabelProps={{ shrink: true }} />
                            <TextField label="Checked By *" {...tf('checked_by')} fullWidth />
                        </Box>

                        <Divider />
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>TEXTILE PARAMETERS</Typography>
                        <Box display="flex" gap={2}>
                            <TextField label="Yarn Count (actual)" {...tf('yarn_count_actual')} fullWidth />
                            <TextField label="Strength Value (N)" {...tf('strength_value')} type="number" fullWidth />
                        </Box>
                        <Box display="flex" gap={2}>
                            <TextField label="Elongation %" {...tf('elongation_percent')} type="number" fullWidth />
                            <TextField label="Unevenness %" {...tf('unevenness_percent')} type="number" fullWidth />
                        </Box>

                        <Divider />
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>RESULT</Typography>
                        <TextField select label="Result *" {...tf('result')} fullWidth>
                            <MenuItem value="pass">Pass</MenuItem>
                            <MenuItem value="fail">Fail</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                        </TextField>
                        <TextField label="Remarks" {...tf('remarks')} fullWidth multiline rows={2} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save Check'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
