// ============================================================
// FILE: src/pages/reports/ReportViewPage.js
// PURPOSE: Run and display a saved report template inline.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Chip, IconButton, Tooltip, TextField, InputAdornment,
} from '@mui/material';
import ArrowBackIcon        from '@mui/icons-material/ArrowBack';
import FileDownloadIcon     from '@mui/icons-material/FileDownload';
import PrintIcon            from '@mui/icons-material/Print';
import RefreshIcon          from '@mui/icons-material/Refresh';
import SearchIcon           from '@mui/icons-material/Search';
import ArrowUpwardIcon      from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon    from '@mui/icons-material/ArrowDownward';

const API = '/api/reports/maker/templates/';

export default function ReportViewPage() {
    const { id }      = useParams();
    const navigate    = useNavigate();

    const [tmpl,    setTmpl]    = useState(null);
    const [rows,    setRows]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [search,  setSearch]  = useState('');
    const [sortCol, setSortCol] = useState(null);
    const [sortDir, setSortDir] = useState('asc');

    const runReport = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch template metadata — response is { template: {...} }
            const metaRes  = await fetch(`${API}${id}/`, { credentials: 'include' });
            const metaData = await metaRes.json();
            if (!metaRes.ok) { setError(metaData.message || 'Report not found.'); setLoading(false); return; }
            setTmpl(metaData.template);

            // Run the report — POST endpoint
            const runRes  = await fetch(`${API}${id}/run/`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const runData = await runRes.json();
            if (!runRes.ok) { setError(runData.message || 'Failed to run report.'); setLoading(false); return; }
            setRows(runData.rows || []);
        } catch (e) {
            setError('Network error — could not load report.');
        }
        setLoading(false);
    }, [id]);

    useEffect(() => { runReport(); }, [runReport]);

    const handleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    };

    const handleExportCSV = async () => {
        const res  = await fetch(`${API}${id}/export/`, { credentials: 'include' });
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${(tmpl?.name || 'report').replace(/\s+/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Filter rows by search
    const columns = tmpl?.columns || [];
    const filtered = rows.filter(row =>
        columns.some(col => String(row[col] ?? '').toLowerCase().includes(search.toLowerCase()))
    );

    // Sort
    const sorted = sortCol
        ? [...filtered].sort((a, b) => {
            const av = String(a[sortCol] ?? '');
            const bv = String(b[sortCol] ?? '');
            const cmp = av.localeCompare(bv, undefined, { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
          })
        : filtered;

    const colLabel = (col) => col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <Box sx={{ p: 3 }}>

            {/* ── Header ── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/reports/my-reports')}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                    My Reports
                </Button>

                <Box sx={{ flexGrow: 1 }}>
                    {tmpl && (
                        <>
                            <Typography variant="h5" fontWeight={700}>{tmpl.name}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                                {tmpl.description && (
                                    <Typography variant="body2" color="text.secondary">{tmpl.description}</Typography>
                                )}
                                <Chip label={tmpl.source_label || tmpl.source_key} size="small" variant="outlined" />
                            </Box>
                        </>
                    )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={runReport} disabled={loading}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="outlined"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportCSV}
                        disabled={loading || rows.length === 0}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                        Export CSV
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<PrintIcon />}
                        onClick={() => window.print()}
                        disabled={loading || rows.length === 0}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                        Print / PDF
                    </Button>
                </Box>
            </Box>

            {/* ── Error ── */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* ── Loading ── */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* ── Results ── */}
            {!loading && !error && (
                <>
                    {/* Search + row count */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <TextField
                            size="small"
                            placeholder="Search results…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            sx={{ width: 280 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            {sorted.length} row{sorted.length !== 1 ? 's' : ''}
                            {search && ` (filtered from ${rows.length})`}
                        </Typography>
                    </Box>

                    {sorted.length === 0 ? (
                        <Box sx={{
                            textAlign: 'center', py: 6,
                            border: '2px dashed', borderColor: 'divider', borderRadius: 2,
                        }}>
                            <Typography color="text.secondary">
                                {search ? 'No rows match your search.' : 'This report returned no data.'}
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        {columns.map(col => (
                                            <TableCell
                                                key={col}
                                                onClick={() => handleSort(col)}
                                                sx={{
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    bgcolor: 'action.hover',
                                                    whiteSpace: 'nowrap',
                                                    '&:hover': { bgcolor: 'action.selected' },
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    {colLabel(col)}
                                                    {sortCol === col
                                                        ? sortDir === 'asc'
                                                            ? <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                                                            : <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                                                        : null}
                                                </Box>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sorted.map((row, i) => (
                                        <TableRow key={i} hover>
                                            {columns.map(col => (
                                                <TableCell key={col} sx={{ maxWidth: 260 }}>
                                                    <Typography variant="body2" noWrap title={String(row[col] ?? '')}>
                                                        {row[col] ?? '—'}
                                                    </Typography>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </>
            )}

            {/* Print styles */}
            <style>{`
                @media print {
                    body > * { display: none !important; }
                    #root { display: block !important; }
                    button, .MuiIconButton-root { display: none !important; }
                }
            `}</style>
        </Box>
    );
}
