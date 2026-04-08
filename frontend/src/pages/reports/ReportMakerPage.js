// FILE: pages/reports/ReportMakerPage.js
import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Button, Paper, Chip, Checkbox, FormControlLabel,
    TextField, MenuItem, Select, FormControl, InputLabel, Alert,
    CircularProgress, Table, TableHead, TableRow, TableCell, TableBody,
    TableContainer, Dialog, DialogTitle, DialogContent, DialogActions,
    Divider, Tooltip, IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PlayArrowIcon    from '@mui/icons-material/PlayArrow';
import SaveIcon         from '@mui/icons-material/Save';
import PrintIcon        from '@mui/icons-material/Print';
import DownloadIcon     from '@mui/icons-material/Download';
import ArrowBackIcon    from '@mui/icons-material/ArrowBack';
import CheckBoxIcon     from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import PublishIcon      from '@mui/icons-material/Publish';
import { useNavigate }  from 'react-router-dom';

const STEPS = ['1. Choose Data Source', '2. Select Columns', '3. Set Filters & Run'];
const GROUP_ORDER = ['Sales', 'Purchasing', 'Production', 'Inventory', 'HR & Payroll', 'Master Data'];
const GROUP_COLORS = {
    'Sales':       '#f59e0b',
    'Purchasing':  '#10b981',
    'Production':  '#f97316',
    'Inventory':   '#3b82f6',
    'HR & Payroll':'#8b5cf6',
    'Master Data': '#06b6d4',
};

// ── Sort helper ──────────────────────────────────────────────
function sortRows(rows, col, dir) {
    if (!col) return rows;
    return [...rows].sort((a, b) => {
        const av = a[col] || '', bv = b[col] || '';
        const n = parseFloat(av) - parseFloat(bv);
        const cmp = isNaN(n) ? av.localeCompare(bv) : n;
        return dir === 'asc' ? cmp : -cmp;
    });
}

export default function ReportMakerPage() {
    const theme    = useTheme();
    const navigate = useNavigate();
    const printRef = useRef();

    const [step,       setStep]       = useState(0);
    const [sources,    setSources]    = useState({});
    const [sourceKey,  setSourceKey]  = useState('');
    const [columns,    setColumns]    = useState([]);     // selected column keys
    const [filters,    setFilters]    = useState({});
    const [rows,       setRows]       = useState(null);   // null = not run yet
    const [running,    setRunning]    = useState(false);
    const [error,      setError]      = useState('');
    const [sortCol,    setSortCol]    = useState('');
    const [sortDir,    setSortDir]    = useState('asc');
    const [saveOpen,   setSaveOpen]   = useState(false);
    const [saveName,   setSaveName]   = useState('');
    const [saveDesc,   setSaveDesc]   = useState('');
    const [savePublish,setSavePublish]= useState(false);
    const [saving,     setSaving]     = useState(false);
    const [saveMsg,    setSaveMsg]    = useState('');

    useEffect(() => {
        fetch('/api/reports/maker/sources/', { credentials: 'include' })
            .then(r => r.json())
            .then(d => setSources(d.sources || {}));
    }, []);

    const source = sources[sourceKey];

    // ── Step navigation ─────────────────────────────────────
    const goStep = (n) => {
        if (n === 1 && !sourceKey) return;
        if (n === 2 && columns.length === 0) {
            // auto-select all on first time entering step 2
            if (source) setColumns(source.fields.map(f => f.key));
        }
        setStep(n);
    };

    const pickSource = (key) => {
        setSourceKey(key);
        setColumns(sources[key].fields.map(f => f.key)); // default all selected
        setFilters({});
        setRows(null);
        setStep(1);
    };

    // ── Column toggle ────────────────────────────────────────
    const toggleCol = (key) =>
        setColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const selectAllCols  = () => setColumns(source.fields.map(f => f.key));
    const deselectAllCols = () => setColumns([]);

    // ── Run report ───────────────────────────────────────────
    const runReport = async () => {
        setRunning(true); setError(''); setRows(null);
        try {
            const res = await fetch('/api/reports/maker/run/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ source_key: sourceKey, columns, filters }),
            });
            const data = await res.json();
            if (res.ok) setRows(data.rows || []);
            else setError(data.message || 'Error running report.');
        } catch { setError('Network error.'); }
        setRunning(false);
    };

    // ── Sort ────────────────────────────────────────────────
    const handleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    };

    const displayRows = rows ? sortRows(rows, sortCol, sortDir) : [];

    // ── Column labels map ───────────────────────────────────
    const colLabelMap = source
        ? Object.fromEntries(source.fields.map(f => [f.key, f.label]))
        : {};

    // ── Print ────────────────────────────────────────────────
    const handlePrint = () => window.print();

    // ── Export CSV (frontend) ────────────────────────────────
    const handleExportCSV = () => {
        if (!rows || rows.length === 0) return;
        const headers = columns.map(k => colLabelMap[k] || k);
        const csvRows = [
            headers.join(','),
            ...displayRows.map(row =>
                columns.map(k => `"${(row[k] || '').replace(/"/g, '""')}"`).join(',')
            ),
        ];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `${saveName || 'report'}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    // ── Save ────────────────────────────────────────────────
    const handleSave = async () => {
        if (!saveName.trim()) return;
        setSaving(true);
        const res = await fetch('/api/reports/maker/templates/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                name: saveName, description: saveDesc,
                source_key: sourceKey, columns, filters,
                is_published: savePublish,
            }),
        });
        const data = await res.json();
        setSaving(false);
        if (res.ok) {
            setSaveMsg('Report saved! ' + (savePublish ? 'It now appears in the Reports section.' : ''));
            setSaveOpen(false);
            setSaveName(''); setSaveDesc(''); setSavePublish(false);
        } else {
            setError(data.message || 'Error saving.');
        }
    };

    // ── Grouped source cards ─────────────────────────────────
    const grouped = {};
    Object.entries(sources).forEach(([key, src]) => {
        if (!grouped[src.group]) grouped[src.group] = [];
        grouped[src.group].push({ key, ...src });
    });

    // ─────────────────────────────────────────────────────────
    return (
        <Box>
            {/* Print-only styles */}
            <style>{`
                @media print {
                    body > * { display: none !important; }
                    #report-print-area { display: block !important; }
                    #report-print-area { position: fixed; top:0; left:0; width:100%; }
                }
                @media screen { #report-print-area { display: block; } }
            `}</style>

            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} variant="outlined" size="small"
                    onClick={() => navigate('/reports/maker/list')}>My Reports</Button>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>Report Maker</Typography>
                {rows !== null && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button startIcon={<PrintIcon />} variant="outlined" size="small" onClick={handlePrint}>Print</Button>
                        <Button startIcon={<DownloadIcon />} variant="outlined" size="small" onClick={handleExportCSV}>Export CSV</Button>
                        <Button startIcon={<SaveIcon />} variant="contained" size="small"
                            onClick={() => setSaveOpen(true)} sx={{ backgroundColor: 'primary.main' }}>
                            Save Report
                        </Button>
                    </Box>
                )}
            </Box>

            {saveMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveMsg('')}>{saveMsg}</Alert>}
            {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {/* Step tabs */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                {STEPS.map((s, i) => (
                    <Box key={i} onClick={() => goStep(i)}
                        sx={{
                            px: 2.5, py: 1, borderRadius: 2, cursor: 'pointer', userSelect: 'none',
                            backgroundColor: step === i ? 'primary.main' : 'action.hover',
                            color: step === i ? 'white' : 'text.secondary',
                            fontWeight: step === i ? 700 : 400,
                            fontSize: 13, transition: 'all 0.15s',
                            opacity: (i === 1 && !sourceKey) ? 0.4 : 1,
                            pointerEvents: (i === 1 && !sourceKey) ? 'none' : 'auto',
                        }}>
                        {s}
                    </Box>
                ))}
            </Box>

            {/* ── STEP 0: Choose Source ── */}
            {step === 0 && (
                <Box>
                    {GROUP_ORDER.map(group => {
                        const items = grouped[group] || [];
                        if (!items.length) return null;
                        return (
                            <Box key={group} mb={3}>
                                <Typography variant="subtitle2" fontWeight={700} mb={1.5}
                                    sx={{ color: GROUP_COLORS[group], textTransform: 'uppercase', letterSpacing: 1 }}>
                                    {group}
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 1.5 }}>
                                    {items.map(src => (
                                        <Paper key={src.key} onClick={() => pickSource(src.key)}
                                            sx={{
                                                p: 2, borderRadius: 2, cursor: 'pointer',
                                                border: '2px solid',
                                                borderColor: sourceKey === src.key ? GROUP_COLORS[group] : 'transparent',
                                                backgroundColor: sourceKey === src.key ? `${GROUP_COLORS[group]}15` : 'background.paper',
                                                transition: 'all 0.15s',
                                                '&:hover': { borderColor: GROUP_COLORS[group], backgroundColor: `${GROUP_COLORS[group]}0d` },
                                            }}>
                                            <Typography variant="body2" fontWeight={700} mb={0.5}>{src.label}</Typography>
                                            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                                {src.description}
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {src.modules.map(m => (
                                                    <Chip key={m} label={m} size="small"
                                                        sx={{ fontSize: 10, backgroundColor: `${GROUP_COLORS[group]}22`,
                                                              color: GROUP_COLORS[group], fontWeight: 600 }} />
                                                ))}
                                            </Box>
                                        </Paper>
                                    ))}
                                </Box>
                            </Box>
                        );
                    })}
                    {sourceKey && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                            <Button variant="contained" onClick={() => goStep(1)}
                                sx={{ backgroundColor: 'primary.main' }}>
                                Next: Select Columns →
                            </Button>
                        </Box>
                    )}
                </Box>
            )}

            {/* ── STEP 1: Select Columns ── */}
            {step === 1 && source && (
                <Box>
                    <Paper sx={{ p: 3, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight={700} color="primary">
                                {source.label} — Choose Columns
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button size="small" startIcon={<CheckBoxIcon />} onClick={selectAllCols}>Select All</Button>
                                <Button size="small" startIcon={<CheckBoxOutlineBlankIcon />} onClick={deselectAllCols}>Deselect All</Button>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 0.5 }}>
                            {source.fields.map(f => (
                                <FormControlLabel key={f.key}
                                    control={
                                        <Checkbox size="small" checked={columns.includes(f.key)}
                                            onChange={() => toggleCol(f.key)} />
                                    }
                                    label={<Typography variant="body2">{f.label}</Typography>}
                                />
                            ))}
                        </Box>
                        <Typography variant="caption" color="text.secondary" mt={1} display="block">
                            {columns.length} of {source.fields.length} columns selected
                        </Typography>
                    </Paper>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Button variant="outlined" onClick={() => setStep(0)}>← Back</Button>
                        <Button variant="contained" disabled={columns.length === 0}
                            onClick={() => setStep(2)} sx={{ backgroundColor: 'primary.main' }}>
                            Next: Set Filters & Run →
                        </Button>
                    </Box>
                </Box>
            )}

            {/* ── STEP 2: Filters + Run + Results ── */}
            {step === 2 && source && (
                <Box>
                    {/* Filters */}
                    <Paper sx={{ p: 2.5, borderRadius: 2, mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} color="primary" mb={1.5}>
                            Filters (all optional)
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 1.5 }}>
                            {source.filter_fields.map(ff => (
                                <Box key={ff.key}>
                                    {ff.type === 'select' ? (
                                        <FormControl size="small" fullWidth>
                                            <InputLabel>{ff.label}</InputLabel>
                                            <Select value={filters[ff.key] || ''} label={ff.label}
                                                onChange={e => setFilters(p => ({ ...p, [ff.key]: e.target.value }))}>
                                                <MenuItem value="">All</MenuItem>
                                                {(ff.options || []).map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    ) : ff.type === 'date' ? (
                                        <TextField size="small" fullWidth label={ff.label} type="date"
                                            value={filters[ff.key] || ''}
                                            onChange={e => setFilters(p => ({ ...p, [ff.key]: e.target.value }))}
                                            InputLabelProps={{ shrink: true }} />
                                    ) : (
                                        <TextField size="small" fullWidth label={ff.label}
                                            value={filters[ff.key] || ''}
                                            onChange={e => setFilters(p => ({ ...p, [ff.key]: e.target.value }))} />
                                    )}
                                </Box>
                            ))}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={runReport}
                                disabled={running} sx={{ backgroundColor: 'primary.main' }}>
                                {running ? 'Running…' : 'Run Report'}
                            </Button>
                            <Button variant="outlined" onClick={() => setFilters({})}>Clear Filters</Button>
                            <Button variant="outlined" onClick={() => setStep(1)}>← Edit Columns</Button>
                        </Box>
                    </Paper>

                    {/* Results */}
                    {running && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <CircularProgress />
                        </Box>
                    )}

                    {rows !== null && !running && (
                        <Box id="report-print-area">
                            {/* Print header */}
                            <Box sx={{ display: 'none', '@media print': { display: 'block' }, mb: 2 }}>
                                <Typography variant="h6" fontWeight={700}>{saveName || source.label}</Typography>
                                <Typography variant="caption">Generated: {new Date().toLocaleString()}</Typography>
                                <Divider sx={{ my: 1 }} />
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    <strong>{rows.length}</strong> rows — click any column header to sort
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, '@media print': { display: 'none' } }}>
                                    <Button size="small" startIcon={<PrintIcon />} variant="outlined" onClick={handlePrint}>Print</Button>
                                    <Button size="small" startIcon={<DownloadIcon />} variant="outlined" onClick={handleExportCSV}>Export CSV</Button>
                                    <Button size="small" startIcon={<SaveIcon />} variant="contained"
                                        onClick={() => setSaveOpen(true)} sx={{ backgroundColor: 'primary.main' }}>
                                        Save Report
                                    </Button>
                                </Box>
                            </Box>

                            <Paper sx={{ borderRadius: 2 }}>
                                <TableContainer sx={{ maxHeight: 560 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                {columns.map(k => (
                                                    <TableCell key={k}
                                                        style={{ backgroundColor: theme.palette.primary.main, cursor: 'pointer' }}
                                                        sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', userSelect: 'none' }}
                                                        onClick={() => handleSort(k)}>
                                                        {colLabelMap[k] || k}
                                                        {sortCol === k && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rows.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={columns.length} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                                        No data found for the selected filters.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                displayRows.map((row, i) => (
                                                    <TableRow key={i} hover>
                                                        {columns.map(k => (
                                                            <TableCell key={k} sx={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                                                                {row[k] || '—'}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </Box>
                    )}
                </Box>
            )}

            {/* Save Dialog */}
            <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Save Report</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField label="Report Name *" value={saveName}
                            onChange={e => setSaveName(e.target.value)} autoFocus />
                        <TextField label="Description (optional)" value={saveDesc}
                            onChange={e => setSaveDesc(e.target.value)} multiline rows={2} />
                        <FormControlLabel
                            control={<Checkbox checked={savePublish}
                                onChange={e => setSavePublish(e.target.checked)} />}
                            label={
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>Publish to Reports section</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        When checked, this report appears under Reports in the sidebar
                                    </Typography>
                                </Box>
                            }
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSaveOpen(false)}>Cancel</Button>
                    <Button variant="contained" startIcon={<SaveIcon />} disabled={!saveName.trim() || saving}
                        onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
