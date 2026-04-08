// ============================================================
// FILE: pages/technical_textile/TechnicalDataSheetPage.js
// PURPOSE: Create and manage Technical Data Sheets (TDS).
//          TDS is sent to customers with full product specs.
//          Links product + performance spec + approval info.
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
import { ResizableTable } from '../../components/common/ResizableTable';

const API       = '/api/technical-textile/data-sheets/';
const API_ITEMS = '/api/master-data/items/';
const API_SPECS = '/api/technical-textile/specs/';

const STATUS_COLOR = { draft: 'default', issued: 'success', revised: 'warning' };
const EMPTY = { item_id: '', spec_id: '', issue_date: '', revision_number: 'R0', prepared_by: '', approved_by: '', notes: '' };

function TechnicalDataSheetPage() {
    const [sheets, setSheets]   = useState([]);
    const [items, setItems]     = useState([]);
    const [specs, setSpecs]     = useState([]);
    const [dialog, setDialog]   = useState(false);
    const [viewDialog, setViewDialog] = useState(false);
    const [viewSheet, setViewSheet]   = useState(null);
    const [form, setForm]       = useState(EMPTY);
    const [message, setMessage] = useState('');
    const [msgType, setMsgType] = useState('success');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        const [sh, it, sp] = await Promise.all([
            fetch(API,       { credentials: 'include' }).then(r => r.json()),
            fetch(API_ITEMS, { credentials: 'include' }).then(r => r.json()),
            fetch(API_SPECS, { credentials: 'include' }).then(r => r.json()),
        ]);
        setSheets(sh.sheets || []);
        setItems(it.items || []);
        setSpecs(sp.specs || []);
    };

    const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

    // Filter specs for selected item
    const filteredSpecs = specs.filter(s => !form.item_id || String(s.item_id) === String(form.item_id));

    const handleSave = async () => {
        if (!form.item_id || !form.issue_date) {
            setMessage('Product and Issue Date are required.'); setMsgType('error'); return;
        }
        const res  = await fetch(API, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(`TDS created: ${data.tds.tds_number}`); setMsgType('success');
            setDialog(false); fetchAll();
        } else {
            setMessage(data.message || 'Error.'); setMsgType('error');
        }
    };

    const handleIssue = async (tds) => {
        const res = await fetch(`${API.replace(/\/$/, '')}/${tds.id}/issue/`, {
            method: 'POST', credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) { setMessage('TDS issued to customer.'); setMsgType('success'); fetchAll(); }
        else { setMessage(data.message); setMsgType('error'); }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Technical Data Sheets</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                TDS documents sent to customers with full product technical specifications
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setForm(EMPTY); setDialog(true); }}
                    sx={{ backgroundColor: 'primary.main' }}>
                    Create TDS
                </Button>
            </Box>

            <ResizableTable storageKey="technicaldatasheet">
                <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            {['TDS Number', 'Product', 'Revision', 'Issue Date', 'Prepared By', 'Approved By', 'Status', 'Actions'].map(h => (
                                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sheets.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                No TDS yet. Click "Create TDS" to generate a data sheet.
                            </TableCell></TableRow>
                        ) : sheets.map(s => (
                            <TableRow key={s.id} hover>
                                <TableCell><strong>{s.tds_number}</strong></TableCell>
                                <TableCell>
                                    <Typography variant="body2">{s.item_code}</Typography>
                                    <Typography variant="caption" color="text.secondary">{s.item_name}</Typography>
                                </TableCell>
                                <TableCell>{s.revision_number}</TableCell>
                                <TableCell>{s.issue_date}</TableCell>
                                <TableCell>{s.prepared_by || '—'}</TableCell>
                                <TableCell>{s.approved_by || '—'}</TableCell>
                                <TableCell>
                                    <Chip label={s.status.toUpperCase()} size="small" color={STATUS_COLOR[s.status] || 'default'} />
                                </TableCell>
                                <TableCell>
                                    <IconButton size="small" sx={{ color: 'primary.main' }}
                                        onClick={() => { setViewSheet(s); setViewDialog(true); }}>
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                    {s.status === 'draft' && (
                                        <IconButton size="small" sx={{ color: '#2e7d32', ml: 0.5 }}
                                            title="Issue TDS" onClick={() => handleIssue(s)}>
                                            <CheckCircleIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            </ResizableTable>

            {/* Create Dialog */}
            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>Create Technical Data Sheet</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField select label="Product *" value={form.item_id} onChange={f('item_id')}>
                            <MenuItem value=""><em>— Select Product —</em></MenuItem>
                            {items.map(i => <MenuItem key={i.id} value={i.id}>{i.item_code} — {i.item_name}</MenuItem>)}
                        </TextField>
                        <TextField select label="Link to Performance Spec (optional)" value={form.spec_id} onChange={f('spec_id')}>
                            <MenuItem value=""><em>— None —</em></MenuItem>
                            {filteredSpecs.map(s => <MenuItem key={s.id} value={s.id}>{s.item_code} — {s.spec_version}</MenuItem>)}
                        </TextField>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField label="Issue Date *" type="date" value={form.issue_date} onChange={f('issue_date')} InputLabelProps={{ shrink: true }} />
                            <TextField label="Revision Number" value={form.revision_number} onChange={f('revision_number')} />
                            <TextField label="Prepared By" value={form.prepared_by} onChange={f('prepared_by')} />
                            <TextField label="Approved By" value={form.approved_by} onChange={f('approved_by')} />
                        </Box>
                        <TextField label="Notes" multiline rows={2} value={form.notes} onChange={f('notes')} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>Create TDS</Button>
                </DialogActions>
            </Dialog>

            {/* View Dialog */}
            {viewSheet && (
                <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>{viewSheet.tds_number}</DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        {[
                            ['TDS Number', viewSheet.tds_number],
                            ['Product', `${viewSheet.item_code} — ${viewSheet.item_name}`],
                            ['Issue Date', viewSheet.issue_date],
                            ['Revision', viewSheet.revision_number],
                            ['Prepared By', viewSheet.prepared_by || '—'],
                            ['Approved By', viewSheet.approved_by || '—'],
                            ['Status', viewSheet.status],
                            ['Notes', viewSheet.notes || '—'],
                        ].map(([label, value]) => (
                            <Box key={label} sx={{ display: 'flex', mb: 1 }}>
                                <Typography variant="body2" fontWeight="bold" sx={{ width: 160, color: 'text.secondary' }}>{label}:</Typography>
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

export default TechnicalDataSheetPage;
