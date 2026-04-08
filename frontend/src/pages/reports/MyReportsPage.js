// ============================================================
// FILE: src/pages/reports/MyReportsPage.js
// PURPOSE: Shows all published report templates — click to run.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Card, CardContent, CardActionArea,
    Chip, Grid, TextField, InputAdornment, CircularProgress, Button,
} from '@mui/material';
import SearchIcon       from '@mui/icons-material/Search';
import PlayArrowIcon    from '@mui/icons-material/PlayArrow';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AssessmentIcon   from '@mui/icons-material/Assessment';
import BuildIcon        from '@mui/icons-material/Build';

const API = '/api/reports/maker/templates/';

export default function MyReportsPage() {
    const navigate = useNavigate();
    const [reports,  setReports]  = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [search,   setSearch]   = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch(API, { credentials: 'include' });
            const data = await res.json();
            setReports((data.templates || []).filter(t => t.is_published));
        } catch { setReports([]); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleExportCSV = async (e, tmpl) => {
        e.stopPropagation();
        const res  = await fetch(`${API}${tmpl.id}/export/`, { credentials: 'include' });
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${tmpl.name.replace(/\s+/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filtered = reports.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.source_label || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>

            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <AssessmentIcon sx={{ fontSize: 28, color: '#a78bfa' }} />
                    <Box>
                        <Typography variant="h5" fontWeight={700}>My Reports</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Published custom reports — click any card to run
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<BuildIcon />}
                    onClick={() => navigate('/reports/maker/list')}
                    sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                    Report Maker
                </Button>
            </Box>

            {/* Search */}
            <TextField
                size="small"
                placeholder="Search reports…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{ mb: 3, width: 320 }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                    ),
                }}
            />

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
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
                        {search
                            ? 'No reports match your search.'
                            : 'No published reports yet. Create and publish one in Report Maker.'}
                    </Typography>
                    <Button variant="outlined" startIcon={<BuildIcon />}
                        onClick={() => navigate('/reports/maker/list')}
                        sx={{ textTransform: 'none', borderRadius: 2 }}>
                        Go to Report Maker
                    </Button>
                </Box>
            )}

            {/* Report Cards */}
            <Grid container spacing={2}>
                {filtered.map(tmpl => (
                    <Grid item xs={12} sm={6} md={4} key={tmpl.id}>
                        <Card variant="outlined" sx={{
                            borderRadius: 2, height: '100%',
                            transition: 'box-shadow 0.2s, border-color 0.2s',
                            '&:hover': { boxShadow: 4, borderColor: 'primary.main' },
                        }}>
                            <CardActionArea
                                sx={{ height: '100%', p: 0 }}
                                onClick={() => navigate(`/reports/maker?tmpl=${tmpl.id}`)}
                            >
                                <CardContent sx={{ p: 2.5 }}>
                                    {/* Source chip */}
                                    <Chip
                                        label={tmpl.source_label || tmpl.source_key}
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        sx={{ fontSize: 10, mb: 1.5 }}
                                    />

                                    {/* Name */}
                                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                                        {tmpl.name}
                                    </Typography>

                                    {/* Description */}
                                    {tmpl.description && (
                                        <Typography variant="body2" color="text.secondary"
                                            sx={{ mb: 1.5, lineHeight: 1.4 }}>
                                            {tmpl.description}
                                        </Typography>
                                    )}

                                    {/* Footer */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
                                        <Typography variant="caption" color="text.disabled">
                                            {Array.isArray(tmpl.columns) ? tmpl.columns.length : 0} columns
                                            {tmpl.updated_at ? ` · ${new Date(tmpl.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }} onClick={e => e.stopPropagation()}>
                                            <Box
                                                sx={{
                                                    display: 'flex', alignItems: 'center', gap: 0.4,
                                                    px: 1, py: 0.3, borderRadius: 1,
                                                    bgcolor: 'action.hover', cursor: 'pointer', fontSize: 12,
                                                    '&:hover': { bgcolor: 'action.selected' },
                                                }}
                                                onClick={(e) => handleExportCSV(e, tmpl)}
                                            >
                                                <FileDownloadIcon sx={{ fontSize: 14 }} />
                                                CSV
                                            </Box>
                                            <Box sx={{
                                                display: 'flex', alignItems: 'center', gap: 0.4,
                                                px: 1, py: 0.3, borderRadius: 1,
                                                bgcolor: 'primary.main', color: 'white',
                                                cursor: 'pointer', fontSize: 12,
                                                '&:hover': { bgcolor: 'primary.dark' },
                                            }}
                                                onClick={() => navigate(`/reports/maker?tmpl=${tmpl.id}`)}>
                                                <PlayArrowIcon sx={{ fontSize: 14 }} />
                                                Run
                                            </Box>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </CardActionArea>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
