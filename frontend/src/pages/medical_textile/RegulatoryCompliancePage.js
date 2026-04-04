// ============================================================
// FILE: pages/medical_textile/RegulatoryCompliancePage.js
// PURPOSE: Track certifications for medical textile products.
//          ISO 13485, FDA 510(k), CE Mark, BIS, NABL, etc.
//          Shows expiry alerts for certificates due for renewal.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, Alert, IconButton, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

const API       = '/api/medical-textile/compliance/';
const API_ITEMS = '/api/master-data/items/';

const STANDARDS = ['iso_13485','iso_9001','fda_510k','ce_mark','bis','nabl','who_gmp','other'];
const STATUS_COLOR = { active: 'success', expired: 'error', pending: 'warning', revoked: 'error' };
const EMPTY = { item_id:'', standard:'iso_13485', certificate_number:'', issuing_body:'', issue_date:'', expiry_date:'', status:'active', scope:'', notes:'' };

function RegulatoryCompliancePage() {
    const [records, setRecords] = useState([]);
    const [items, setItems]     = useState([]);
    const [dialog, setDialog]   = useState(false);
    const [editRec, setEditRec] = useState(null);
    const [form, setForm]       = useState(EMPTY);
    const [message, setMessage] = useState('');
    const [msgType, setMsgType] = useState('success');

    useEffect(() => { fetchAll(); }, []);
    const fetchAll = async () => {
        const [r, i] = await Promise.all([
            fetch(API,       { credentials:'include' }).then(x => x.json()),
            fetch(API_ITEMS, { credentials:'include' }).then(x => x.json()),
        ]);
        setRecords(r.records || []);
        setItems(i.items || []);
    };

    const f = field => e => setForm(p => ({ ...p, [field]: e.target.value }));

    const handleSave = async () => {
        if (!form.item_id || !form.issuing_body || !form.issue_date) {
            setMessage('Product, Issuing Body and Issue Date are required.'); setMsgType('error'); return;
        }
        const url    = editRec ? `${API.replace(/\/$/,'')}/${editRec.id}/` : API;
        const method = editRec ? 'PUT' : 'POST';
        const res    = await fetch(url, { method, headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(form) });
        const data   = await res.json();
        if (res.ok) {
            setMessage(editRec ? 'Record updated.' : 'Certificate added.'); setMsgType('success');
            setDialog(false); fetchAll();
        } else { setMessage(data.message || 'Error.'); setMsgType('error'); }
    };

    // Check if certificate is expiring within 90 days
    const isNearExpiry = (expiryDate) => {
        if (!expiryDate) return false;
        const days = Math.floor((new Date(expiryDate) - new Date()) / (1000*60*60*24));
        return days >= 0 && days < 90;
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="#1a237e" mb={1}>Regulatory Compliance</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Track ISO 13485, FDA, CE Mark, BIS certifications — expiry alerts included
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb:2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display:'flex', justifyContent:'flex-end', mb:2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setForm(EMPTY); setEditRec(null); setDialog(true); }}
                    sx={{ backgroundColor:'#1a237e' }}>
                    Add Certificate
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow:2, borderRadius:2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor:'#1a237e' }}>
                        <TableRow>
                            {['Product','Standard','Certificate No.','Issuing Body','Issue Date','Expiry Date','Status','Actions'].map(h => (
                                <TableCell key={h} sx={{ color:'white', fontWeight:'bold' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {records.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py:4, color:'text.secondary' }}>
                                No compliance records yet. Click "Add Certificate" to start.
                            </TableCell></TableRow>
                        ) : records.map(r => (
                            <TableRow key={r.id} hover sx={{ backgroundColor: isNearExpiry(r.expiry_date) ? '#fff8e1' : 'inherit' }}>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">{r.item_code}</Typography>
                                    <Typography variant="caption" color="text.secondary">{r.item_name}</Typography>
                                </TableCell>
                                <TableCell><strong>{r.standard.replace('_',' ').toUpperCase()}</strong></TableCell>
                                <TableCell>{r.certificate_number || '—'}</TableCell>
                                <TableCell>{r.issuing_body}</TableCell>
                                <TableCell>{r.issue_date}</TableCell>
                                <TableCell>
                                    {r.expiry_date || '—'}
                                    {isNearExpiry(r.expiry_date) && <Chip label="EXPIRING SOON" size="small" color="warning" sx={{ ml:1 }} />}
                                </TableCell>
                                <TableCell>
                                    <Chip label={r.status.toUpperCase()} size="small" color={STATUS_COLOR[r.status] || 'default'} />
                                </TableCell>
                                <TableCell>
                                    <IconButton size="small" sx={{ color:'#1a237e' }}
                                        onClick={() => { setForm(r); setEditRec(r); setDialog(true); }}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor:'#1a237e', color:'white' }}>
                    {editRec ? 'Edit Certificate' : 'Add Certificate'}
                </DialogTitle>
                <DialogContent sx={{ pt:3 }}>
                    <Box sx={{ display:'flex', flexDirection:'column', gap:2, mt:1 }}>
                        <TextField select label="Product *" value={form.item_id} onChange={f('item_id')}>
                            <MenuItem value=""><em>— Select Product —</em></MenuItem>
                            {items.map(i => <MenuItem key={i.id} value={i.id}>{i.item_code} — {i.item_name}</MenuItem>)}
                        </TextField>
                        <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2 }}>
                            <TextField select label="Standard" value={form.standard} onChange={f('standard')}>
                                {STANDARDS.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g,' ').toUpperCase()}</MenuItem>)}
                            </TextField>
                            <TextField select label="Status" value={form.status} onChange={f('status')}>
                                {['active','expired','pending','revoked'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </TextField>
                            <TextField label="Certificate Number" value={form.certificate_number} onChange={f('certificate_number')} />
                            <TextField label="Issuing Body *" value={form.issuing_body} onChange={f('issuing_body')} helperText="e.g. Bureau Veritas, SGS" />
                            <TextField label="Issue Date *" type="date" value={form.issue_date} onChange={f('issue_date')} InputLabelProps={{ shrink:true }} />
                            <TextField label="Expiry Date" type="date" value={form.expiry_date} onChange={f('expiry_date')} InputLabelProps={{ shrink:true }} />
                        </Box>
                        <TextField label="Scope" multiline rows={2} value={form.scope} onChange={f('scope')} helperText="Products/processes covered" />
                        <TextField label="Notes" value={form.notes} onChange={f('notes')} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p:2 }}>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor:'#1a237e' }}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default RegulatoryCompliancePage;
