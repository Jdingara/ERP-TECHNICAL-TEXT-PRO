// ============================================================
// FILE: pages/technical_textile/RDProjectsPage.js
// PURPOSE: Track Research & Development projects.
//          New product development, trials, objectives, outcomes.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, Alert, IconButton, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';

const API      = 'http://127.0.0.1:8000/api/technical-textile/rd-projects/';
const API_CATS = 'http://127.0.0.1:8000/api/technical-textile/categories/';

const STATUS_COLOR = {
    planning: 'default', in_progress: 'primary', testing: 'warning',
    completed: 'success', on_hold: 'error', cancelled: 'error',
};

const STATUSES = ['planning', 'in_progress', 'testing', 'completed', 'on_hold', 'cancelled'];

const EMPTY = {
    project_name: '', objective: '', target_product: '', category_id: '',
    start_date: '', target_end_date: '', status: 'planning',
    lead_engineer: '', budget: '',
};

function RDProjectsPage() {
    const [projects, setProjects]   = useState([]);
    const [categories, setCategories] = useState([]);
    const [dialog, setDialog]       = useState(false);
    const [viewDialog, setViewDialog] = useState(false);
    const [viewProj, setViewProj]   = useState(null);
    const [completeDialog, setCompleteDialog] = useState(false);
    const [selectedProj, setSelectedProj]     = useState(null);
    const [outcome, setOutcome]     = useState('');
    const [newStatus, setNewStatus] = useState('completed');
    const [form, setForm]           = useState(EMPTY);
    const [message, setMessage]     = useState('');
    const [msgType, setMsgType]     = useState('success');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        const [p, c] = await Promise.all([
            fetch(API,      { credentials: 'include' }).then(r => r.json()),
            fetch(API_CATS, { credentials: 'include' }).then(r => r.json()),
        ]);
        setProjects(p.projects || []);
        setCategories(c.categories || []);
    };

    const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

    const handleSave = async () => {
        if (!form.project_name || !form.objective || !form.start_date) {
            setMessage('Project Name, Objective and Start Date are required.'); setMsgType('error'); return;
        }
        const res  = await fetch(API, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(`R&D project created: ${data.project.project_number}`); setMsgType('success');
            setDialog(false); fetchAll();
        } else {
            setMessage(data.message || 'Error.'); setMsgType('error');
        }
    };

    const handleStatusUpdate = async () => {
        const res = await fetch(`${API.replace(/\/$/, '')}/${selectedProj.id}/status/`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ status: newStatus, outcome }),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('Project status updated.'); setMsgType('success');
            setCompleteDialog(false); fetchAll();
        } else {
            setMessage(data.message); setMsgType('error');
        }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="#1a237e" mb={1}>R&D Projects</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Research & Development — new product development, trials, and innovation projects
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setForm(EMPTY); setDialog(true); }}
                    sx={{ backgroundColor: '#1a237e' }}>
                    New R&D Project
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#1a237e' }}>
                        <TableRow>
                            {['Project No.', 'Project Name', 'Target Product', 'Lead Engineer', 'Start Date', 'Target End', 'Status', 'Actions'].map(h => (
                                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {projects.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                No R&D projects yet. Click "New R&D Project" to start.
                            </TableCell></TableRow>
                        ) : projects.map(p => (
                            <TableRow key={p.id} hover>
                                <TableCell><strong>{p.project_number}</strong></TableCell>
                                <TableCell>{p.project_name}</TableCell>
                                <TableCell>{p.target_product || '—'}</TableCell>
                                <TableCell>{p.lead_engineer || '—'}</TableCell>
                                <TableCell>{p.start_date}</TableCell>
                                <TableCell>{p.target_end_date || '—'}</TableCell>
                                <TableCell>
                                    <Chip label={p.status.replace('_', ' ').toUpperCase()} size="small"
                                        color={STATUS_COLOR[p.status] || 'default'} />
                                </TableCell>
                                <TableCell>
                                    <IconButton size="small" sx={{ color: '#1a237e' }}
                                        onClick={() => { setViewProj(p); setViewDialog(true); }}>
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                    {p.status !== 'completed' && p.status !== 'cancelled' && (
                                        <IconButton size="small" sx={{ color: '#2e7d32', ml: 0.5 }}
                                            title="Update Status"
                                            onClick={() => { setSelectedProj(p); setOutcome(p.outcome); setNewStatus('completed'); setCompleteDialog(true); }}>
                                            <CheckCircleIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create Dialog */}
            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: '#1a237e', color: 'white' }}>New R&D Project</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField label="Project Name *" value={form.project_name} onChange={f('project_name')} />
                        <TextField label="Objective *" multiline rows={2} value={form.objective} onChange={f('objective')} helperText="What are you trying to achieve?" />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField label="Target Product" value={form.target_product} onChange={f('target_product')} helperText="Product being developed" />
                            <TextField select label="Category" value={form.category_id} onChange={f('category_id')}>
                                <MenuItem value=""><em>— None —</em></MenuItem>
                                {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                            </TextField>
                            <TextField label="Start Date *" type="date" value={form.start_date} onChange={f('start_date')} InputLabelProps={{ shrink: true }} />
                            <TextField label="Target End Date" type="date" value={form.target_end_date} onChange={f('target_end_date')} InputLabelProps={{ shrink: true }} />
                            <TextField label="Lead Engineer" value={form.lead_engineer} onChange={f('lead_engineer')} />
                            <TextField label="Budget (₹)" type="number" value={form.budget} onChange={f('budget')} />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: '#1a237e' }}>Create Project</Button>
                </DialogActions>
            </Dialog>

            {/* Status Update Dialog */}
            <Dialog open={completeDialog} onClose={() => setCompleteDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: '#2e7d32', color: 'white' }}>Update Project Status</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <TextField select fullWidth label="New Status" value={newStatus}
                        onChange={e => setNewStatus(e.target.value)} sx={{ mb: 2 }}>
                        {STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
                    </TextField>
                    <TextField fullWidth label="Outcome / Notes" multiline rows={3}
                        value={outcome} onChange={e => setOutcome(e.target.value)}
                        helperText="Describe what was achieved or why it was stopped" />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCompleteDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleStatusUpdate} sx={{ backgroundColor: '#2e7d32' }}>Update</Button>
                </DialogActions>
            </Dialog>

            {/* View Dialog */}
            {viewProj && (
                <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ backgroundColor: '#1a237e', color: 'white' }}>{viewProj.project_number}</DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        {[
                            ['Project Name', viewProj.project_name],
                            ['Objective', viewProj.objective],
                            ['Target Product', viewProj.target_product || '—'],
                            ['Category', viewProj.category || '—'],
                            ['Lead Engineer', viewProj.lead_engineer || '—'],
                            ['Budget', viewProj.budget ? `₹${viewProj.budget}` : '—'],
                            ['Start Date', viewProj.start_date],
                            ['Target End', viewProj.target_end_date || '—'],
                            ['Actual End', viewProj.actual_end_date || '—'],
                            ['Status', viewProj.status],
                            ['Outcome', viewProj.outcome || '—'],
                        ].map(([label, value]) => (
                            <Box key={label} sx={{ display: 'flex', mb: 1, alignItems: 'flex-start' }}>
                                <Typography variant="body2" fontWeight="bold" sx={{ width: 150, color: 'text.secondary', flexShrink: 0 }}>{label}:</Typography>
                                <Typography variant="body2">{value}</Typography>
                            </Box>
                        ))}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setViewDialog(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
}

export default RDProjectsPage;
