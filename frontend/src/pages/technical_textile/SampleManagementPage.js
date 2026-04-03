// ============================================================
// FILE: pages/technical_textile/SampleManagementPage.js
// PURPOSE: Track samples sent to customers for approval.
//          Status flow: Prepared → Sent → Approved / Rejected
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, Alert, IconButton, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';

const API       = 'http://127.0.0.1:8000/api/technical-textile/samples/';
const API_ITEMS = 'http://127.0.0.1:8000/api/master-data/items/';
const API_CUSTS = 'http://127.0.0.1:8000/api/master-data/customers/';

const STATUS_COLOR = {
    prepared: 'default', sent: 'primary', approved: 'success',
    rejected: 'error', revision: 'warning',
};

const EMPTY = { item_id: '', customer_id: '', quantity: '', sent_date: '', status: 'prepared', internal_notes: '' };

function SampleManagementPage() {
    const [samples, setSamples]     = useState([]);
    const [items, setItems]         = useState([]);
    const [customers, setCustomers] = useState([]);
    const [dialog, setDialog]       = useState(false);
    const [statusDialog, setStatusDialog] = useState(false);
    const [selectedSample, setSelectedSample] = useState(null);
    const [newStatus, setNewStatus]     = useState('');
    const [remarks, setRemarks]         = useState('');
    const [form, setForm]           = useState(EMPTY);
    const [message, setMessage]     = useState('');
    const [msgType, setMsgType]     = useState('success');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        const [s, i, c] = await Promise.all([
            fetch(API, { credentials: 'include' }).then(r => r.json()),
            fetch(API_ITEMS, { credentials: 'include' }).then(r => r.json()),
            fetch(API_CUSTS, { credentials: 'include' }).then(r => r.json()),
        ]);
        setSamples(s.samples || []);
        setItems(i.items || []);
        setCustomers(c.customers || []);
    };

    const handleSave = async () => {
        if (!form.item_id || !form.customer_id || !form.quantity) {
            setMessage('Product, Customer and Quantity are required.'); setMsgType('error'); return;
        }
        const res  = await fetch(API, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(`Sample created: ${data.sample.sample_number}`);
            setMsgType('success'); setDialog(false); fetchAll();
        } else {
            setMessage(data.message || 'Error.'); setMsgType('error');
        }
    };

    const openStatusUpdate = (sample, status) => {
        setSelectedSample(sample); setNewStatus(status); setRemarks(''); setStatusDialog(true);
    };

    const handleStatusUpdate = async () => {
        const res = await fetch(`${API.replace(/\/$/, '')}/${selectedSample.id}/status/`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus, customer_remarks: remarks }),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(`Sample marked as ${newStatus}.`); setMsgType('success');
            setStatusDialog(false); fetchAll();
        } else {
            setMessage(data.message || 'Error.'); setMsgType('error');
        }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="#1a237e" mb={1}>Sample Management</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Track product samples sent to customers — approval status, feedback, and history
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setForm(EMPTY); setDialog(true); }}
                    sx={{ backgroundColor: '#1a237e' }}>
                    New Sample
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#1a237e' }}>
                        <TableRow>
                            {['Sample No.', 'Product', 'Customer', 'Qty', 'Sent Date', 'Approved Date', 'Status', 'Actions'].map(h => (
                                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {samples.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                No samples yet. Click "New Sample" to start tracking.
                            </TableCell></TableRow>
                        ) : samples.map(s => (
                            <TableRow key={s.id} hover>
                                <TableCell><strong>{s.sample_number}</strong></TableCell>
                                <TableCell>
                                    <Typography variant="body2">{s.item_code}</Typography>
                                    <Typography variant="caption" color="text.secondary">{s.item_name}</Typography>
                                </TableCell>
                                <TableCell>{s.customer_name}</TableCell>
                                <TableCell>{s.quantity}</TableCell>
                                <TableCell>{s.sent_date || '—'}</TableCell>
                                <TableCell>{s.approved_date || '—'}</TableCell>
                                <TableCell>
                                    <Chip label={s.status.toUpperCase()} size="small" color={STATUS_COLOR[s.status] || 'default'} />
                                </TableCell>
                                <TableCell>
                                    {s.status !== 'approved' && s.status !== 'rejected' && (
                                        <>
                                            <IconButton size="small" sx={{ color: '#2e7d32' }}
                                                title="Mark Approved"
                                                onClick={() => openStatusUpdate(s, 'approved')}>
                                                <ThumbUpIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" color="error"
                                                title="Mark Rejected"
                                                onClick={() => openStatusUpdate(s, 'rejected')}>
                                                <ThumbDownIcon fontSize="small" />
                                            </IconButton>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create Dialog */}
            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: '#1a237e', color: 'white' }}>New Sample</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField select label="Product *" value={form.item_id} onChange={e => setForm(p => ({ ...p, item_id: e.target.value }))}>
                            <MenuItem value=""><em>— Select Product —</em></MenuItem>
                            {items.map(i => <MenuItem key={i.id} value={i.id}>{i.item_code} — {i.item_name}</MenuItem>)}
                        </TextField>
                        <TextField select label="Customer *" value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}>
                            <MenuItem value=""><em>— Select Customer —</em></MenuItem>
                            {customers.map(c => <MenuItem key={c.id} value={c.id}>{c.company_name}</MenuItem>)}
                        </TextField>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField label="Quantity *" type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
                            <TextField label="Sent Date" type="date" value={form.sent_date} onChange={e => setForm(p => ({ ...p, sent_date: e.target.value }))} InputLabelProps={{ shrink: true }} />
                        </Box>
                        <TextField label="Internal Notes" multiline rows={2} value={form.internal_notes} onChange={e => setForm(p => ({ ...p, internal_notes: e.target.value }))} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: '#1a237e' }}>Create Sample</Button>
                </DialogActions>
            </Dialog>

            {/* Status Update Dialog */}
            <Dialog open={statusDialog} onClose={() => setStatusDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: newStatus === 'approved' ? '#2e7d32' : '#c62828', color: 'white' }}>
                    Mark Sample as {newStatus === 'approved' ? 'Approved' : 'Rejected'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <TextField fullWidth label="Customer Remarks / Feedback" multiline rows={3}
                        value={remarks} onChange={e => setRemarks(e.target.value)}
                        helperText="Enter customer feedback or reason for rejection" />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setStatusDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleStatusUpdate}
                        sx={{ backgroundColor: newStatus === 'approved' ? '#2e7d32' : '#c62828' }}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default SampleManagementPage;
