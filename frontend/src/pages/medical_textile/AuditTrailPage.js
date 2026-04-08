// ============================================================
// FILE: pages/medical_textile/AuditTrailPage.js
// PURPOSE: Shows complete audit log of all medical textile
//          module actions — who did what and when.
//          Read-only — entries are auto-created by the system.
//          Required for regulatory inspection (ISO 13485).
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip,
    Alert, TextField, MenuItem
} from '@mui/material';
import { useColumnResize } from '../../components/common/useColumnResize';

const API = '/api/medical-textile/audit-trail/';

const ACTION_COLOR = {
    created:  'success',
    updated:  'primary',
    approved: 'success',
    rejected: 'error',
    deleted:  'error',
    exported: 'warning',
};

function AuditTrailPage() {
    const { widths, Resizer } = useColumnResize("audittrail", [100, 180, 150, 80]);
    const [trails, setTrails]     = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [moduleFilter, setModuleFilter] = useState('');
    const [error, setError]       = useState('');

    useEffect(() => { fetchTrails(); }, []);

    const fetchTrails = async () => {
        try {
            const res  = await fetch(API, { credentials:'include' });
            const data = await res.json();
            setTrails(data.trails || []);
            setFiltered(data.trails || []);
        } catch { setError('Could not load audit trail.'); }
    };

    const handleFilter = (mod) => {
        setModuleFilter(mod);
        setFiltered(mod ? trails.filter(t => t.module === mod) : trails);
    };

    const modules = [...new Set(trails.map(t => t.module))];

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Audit Trail</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Complete activity log — auto-recorded. Read-only. Required for regulatory inspection.
            </Typography>

            {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}

            <Box sx={{ display:'flex', justifyContent:'flex-end', mb:2 }}>
                <TextField select label="Filter by Module" value={moduleFilter}
                    onChange={e => handleFilter(e.target.value)} size="small" sx={{ width:220 }}>
                    <MenuItem value="">All Modules</MenuItem>
                    {modules.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow:2, borderRadius:2 }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor:'primary.main' }}>
                        <TableRow>
                            {['Date & Time','Module','Record Reference','Action','Performed By','Details'].map(h => (
                                <TableCell key={h} sx={{ color:'white', fontWeight:'bold' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={6} align="center" sx={{ py:4, color:'text.secondary' }}>
                                No audit trail entries yet. Actions will be recorded automatically.
                            </TableCell></TableRow>
                        ) : filtered.map(t => (
                            <TableRow key={t.id} hover>
                                <TableCell sx={{ whiteSpace:'nowrap' }}>{t.performed_at}</TableCell>
                                <TableCell>
                                    <Chip label={t.module} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell><strong>{t.record_ref}</strong></TableCell>
                                <TableCell>
                                    <Chip label={t.action} size="small" color={ACTION_COLOR[t.action] || 'default'} />
                                </TableCell>
                                <TableCell>{t.performed_by}</TableCell>
                                <TableCell>{t.details || '—'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography variant="caption" color="text.secondary" sx={{ mt:2, display:'block' }}>
                Showing last 200 entries. All actions in the Medical Textile module are logged automatically.
            </Typography>
        </Box>
    );
}

export default AuditTrailPage;
