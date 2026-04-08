// ============================================================
// FILE: src/pages/reports/ReportMakerListPage.js
// PURPOSE: List all saved report templates — run, edit, export, delete.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, IconButton, Chip, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, InputAdornment, CircularProgress,
} from '@mui/material';
import AddIcon              from '@mui/icons-material/Add';
import SearchIcon           from '@mui/icons-material/Search';
import PlayArrowIcon        from '@mui/icons-material/PlayArrow';
import EditIcon             from '@mui/icons-material/Edit';
import DeleteIcon           from '@mui/icons-material/Delete';
import FileDownloadIcon     from '@mui/icons-material/FileDownload';
import PublicIcon           from '@mui/icons-material/Public';
import PublicOffIcon        from '@mui/icons-material/PublicOff';
import AssessmentIcon       from '@mui/icons-material/Assessment';
import BuildIcon            from '@mui/icons-material/Build';

const API = '/api/reports/maker/templates/';

export default function ReportMakerListPage() {
    const navigate = useNavigate();
    const [templates,  setTemplates]  = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [search,     setSearch]     = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch(API, { credentials: 'include' });
            const data = await res.json();
            setTemplates(data.templates || []);
        } catch { setTemplates([]); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await fetch(`${API}${deleteTarget.id}/`, { method: 'DELETE', credentials: 'include' });
        setDeleteTarget(null);
        load();
    };

    const handleExportCSV = async (tmpl) => {
        const res  = await fetch(`${API}${tmpl.id}/export/`, { credentials: 'include' });
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${tmpl.name.replace(/\s+/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePublishToggle = async (tmpl) => {
        await fetch(`${API}${tmpl.id}/`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...tmpl, is_published: !tmpl.is_published }),
        });
        load();
    };

    const filtered = templates.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.source_label || '').toLowerCase().includes(search.toLowerCase())
    );

    const published   = filtered.filter(t => t.is_published);
    const unpublished = filtered.filter(t => !t.is_published);

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>

            {/* ── Header ── */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <BuildIcon sx={{ fontSize: 28, color: '#a78bfa' }} />
                    <Box>
                        <Typography variant="h5" fontWeight={700}>Report Maker</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {templates.length} saved report{templates.length !== 1 ? 's' : ''}
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/reports/maker')}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                    New Report
                </Button>
            </Box>

            {/* ── Search ── */}
            <TextField
                size="small"
                placeholder="Search reports…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{ mb: 3, width: 340 }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                    ),
                }}
            />

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && filtered.length === 0 && (
                <Box sx={{
                    textAlign: 'center', py: 8,
                    border: '2px dashed', borderColor: 'divider', borderRadius: 3,
                }}>
                    <AssessmentIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary" mb={2}>
                        {search ? 'No reports match your search.' : 'No saved reports yet.'}
                    </Typography>
                    {!search && (
                        <Button variant="outlined" startIcon={<AddIcon />}
                            onClick={() => navigate('/reports/maker')}
                            sx={{ textTransform: 'none', borderRadius: 2 }}>
                            Create your first report
                        </Button>
                    )}
                </Box>
            )}

            {/* ── Published section ── */}
            {published.length > 0 && (
                <Box mb={4}>
                    <Typography variant="subtitle2" fontWeight={700} color="success.main"
                        sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PublicIcon fontSize="small" /> Published Reports
                        <Chip label={published.length} size="small" color="success" sx={{ ml: 1 }} />
                    </Typography>
                    <ReportTable rows={published} navigate={navigate}
                        onExport={handleExportCSV} onDelete={setDeleteTarget}
                        onPublishToggle={handlePublishToggle} />
                </Box>
            )}

            {/* ── Draft section ── */}
            {unpublished.length > 0 && (
                <Box>
                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary"
                        sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PublicOffIcon fontSize="small" /> Draft Reports
                        <Chip label={unpublished.length} size="small" sx={{ ml: 1 }} />
                    </Typography>
                    <ReportTable rows={unpublished} navigate={navigate}
                        onExport={handleExportCSV} onDelete={setDeleteTarget}
                        onPublishToggle={handlePublishToggle} />
                </Box>
            )}

            {/* ── Delete confirm ── */}
            <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Report</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
                        This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ── Sub-component: table of template rows ──
function ReportTable({ rows, navigate, onExport, onDelete, onPublishToggle }) {
    return (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                        <TableCell>Report Name</TableCell>
                        <TableCell>Data Source</TableCell>
                        <TableCell>Columns</TableCell>
                        <TableCell>Created By</TableCell>
                        <TableCell>Last Updated</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map(tmpl => (
                        <TableRow key={tmpl.id} hover>
                            <TableCell>
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>{tmpl.name}</Typography>
                                    {tmpl.description && (
                                        <Typography variant="caption" color="text.secondary">
                                            {tmpl.description}
                                        </Typography>
                                    )}
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={tmpl.source_label || tmpl.source_key}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: 11 }}
                                />
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                    {Array.isArray(tmpl.columns) ? tmpl.columns.length : 0} columns
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2">
                                    {tmpl.created_by_name || 'System'}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                    {tmpl.updated_at
                                        ? new Date(tmpl.updated_at).toLocaleDateString('en-IN', {
                                            day: '2-digit', month: 'short', year: 'numeric'
                                          })
                                        : '—'}
                                </Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                    <Tooltip title="Run report">
                                        <IconButton size="small" color="primary"
                                            onClick={() => navigate(`/reports/maker?tmpl=${tmpl.id}`)}>
                                            <PlayArrowIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Edit">
                                        <IconButton size="small"
                                            onClick={() => navigate(`/reports/maker?edit=${tmpl.id}`)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Export CSV">
                                        <IconButton size="small" color="success"
                                            onClick={() => onExport(tmpl)}>
                                            <FileDownloadIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={tmpl.is_published ? 'Unpublish' : 'Publish to Reports section'}>
                                        <IconButton size="small"
                                            sx={{ color: tmpl.is_published ? 'success.main' : 'text.disabled' }}
                                            onClick={() => onPublishToggle(tmpl)}>
                                            {tmpl.is_published ? <PublicIcon fontSize="small" /> : <PublicOffIcon fontSize="small" />}
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton size="small" color="error"
                                            onClick={() => onDelete(tmpl)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
