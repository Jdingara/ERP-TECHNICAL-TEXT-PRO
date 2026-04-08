// ============================================================
// FILE: pages/medical_textile/ShelfLifeTrackingPage.js
// PURPOSE: Track expiry dates for medical textile batches.
//          Shows alerts for near-expiry (< 90 days) and expired.
//          Sorted by expiry date — soonest first.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, Alert, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const API         = '/api/medical-textile/shelf-life/';
const API_BATCHES = '/api/production/batches/';
const API_ITEMS   = '/api/master-data/items/';

const STATUS_COLOR = { valid:'success', near_expiry:'warning', expired:'error', recalled:'error' };
const EMPTY = { batch_id:'', item_id:'', manufacture_date:'', expiry_date:'', shelf_life_months:'24', storage_condition:'', quantity_remaining:'', notes:'' };

function ShelfLifeTrackingPage() {
    const [records, setRecords] = useState([]);
    const [batches, setBatches] = useState([]);
    const [items, setItems]     = useState([]);
    const [dialog, setDialog]   = useState(false);
    const [form, setForm]       = useState(EMPTY);
    const [message, setMessage] = useState('');
    const [msgType, setMsgType] = useState('success');

    useEffect(() => { fetchAll(); }, []);
    const fetchAll = async () => {
        const [r, b, i] = await Promise.all([
            fetch(API,         { credentials:'include' }).then(x => x.json()),
            fetch(API_BATCHES, { credentials:'include' }).then(x => x.json()),
            fetch(API_ITEMS,   { credentials:'include' }).then(x => x.json()),
        ]);
        setRecords(r.records || []);
        setBatches(b.batches || []);
        setItems(i.items || []);
    };

    const f = field => e => setForm(p => ({ ...p, [field]: e.target.value }));

    // Calculate days until expiry
    const daysLeft = (expiryDate) => {
        const days = Math.floor((new Date(expiryDate) - new Date()) / (1000*60*60*24));
        return days;
    };

    const handleSave = async () => {
        if (!form.batch_id || !form.item_id || !form.manufacture_date || !form.expiry_date) {
            setMessage('Batch, Product, Manufacture Date and Expiry Date are required.'); setMsgType('error'); return;
        }
        const res  = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(form) });
        const data = await res.json();
        if (res.ok) {
            setMessage('Shelf life record added.'); setMsgType('success'); setDialog(false); fetchAll();
        } else { setMessage(data.message || 'Error.'); setMsgType('error'); }
    };

    const nearExpiryCount = records.filter(r => r.status === 'near_expiry').length;
    const expiredCount    = records.filter(r => r.status === 'expired').length;

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Shelf Life Tracking</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Track expiry dates for all medical textile batches — sorted by soonest expiry
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb:2 }} onClose={() => setMessage('')}>{message}</Alert>}

            {/* Alert summary */}
            {(nearExpiryCount > 0 || expiredCount > 0) && (
                <Box sx={{ display:'flex', gap:2, mb:3 }}>
                    {expiredCount > 0 && (
                        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ flex:1 }}>
                            <strong>{expiredCount} batch(es) EXPIRED</strong> — take action immediately
                        </Alert>
                    )}
                    {nearExpiryCount > 0 && (
                        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ flex:1 }}>
                            <strong>{nearExpiryCount} batch(es) expiring within 90 days</strong> — plan dispatch or disposal
                        </Alert>
                    )}
                </Box>
            )}

            <Box sx={{ display:'flex', justifyContent:'flex-end', mb:2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setForm(EMPTY); setDialog(true); }}
                    sx={{ backgroundColor:'primary.main' }}>
                    Add Shelf Life Record
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow:2, borderRadius:2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor:'primary.main' }}>
                        <TableRow>
                            {['Batch','Product','Mfg Date','Expiry Date','Shelf Life','Days Left','Qty Remaining','Storage','Status'].map(h => (
                                <TableCell key={h} sx={{ color:'white', fontWeight:'bold' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {records.length === 0 ? (
                            <TableRow><TableCell colSpan={9} align="center" sx={{ py:4, color:'text.secondary' }}>
                                No shelf life records. Click "Add Shelf Life Record" to track expiry.
                            </TableCell></TableRow>
                        ) : records.map(r => {
                            const days = daysLeft(r.expiry_date);
                            return (
                                <TableRow key={r.id} hover
                                    sx={{ backgroundColor: r.status === 'expired' ? '#fff0f0' : r.status === 'near_expiry' ? '#fffde7' : 'inherit' }}>
                                    <TableCell><strong>{r.batch_number}</strong></TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{r.item_code}</Typography>
                                        <Typography variant="caption" color="text.secondary">{r.item_name}</Typography>
                                    </TableCell>
                                    <TableCell>{r.manufacture_date}</TableCell>
                                    <TableCell><strong>{r.expiry_date}</strong></TableCell>
                                    <TableCell>{r.shelf_life_months} months</TableCell>
                                    <TableCell>
                                        <Typography variant="body2"
                                            sx={{ color: days < 0 ? 'error.main' : days < 90 ? 'warning.main' : 'success.main', fontWeight:'bold' }}>
                                            {days < 0 ? `${Math.abs(days)} days ago` : `${days} days`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{r.quantity_remaining}</TableCell>
                                    <TableCell>{r.storage_condition || '—'}</TableCell>
                                    <TableCell>
                                        <Chip label={r.status.replace('_',' ').toUpperCase()} size="small" color={STATUS_COLOR[r.status] || 'default'} />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor:'primary.main', color:'white' }}>Add Shelf Life Record</DialogTitle>
                <DialogContent sx={{ pt:3 }}>
                    <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, mt:1 }}>
                        <TextField select label="Batch *" value={form.batch_id} onChange={f('batch_id')} sx={{ gridColumn:'span 2' }}>
                            <MenuItem value=""><em>— Select Batch —</em></MenuItem>
                            {batches.map(b => <MenuItem key={b.id} value={b.id}>{b.batch_number} — {b.item_name}</MenuItem>)}
                        </TextField>
                        <TextField select label="Product *" value={form.item_id} onChange={f('item_id')} sx={{ gridColumn:'span 2' }}>
                            <MenuItem value=""><em>— Select Product —</em></MenuItem>
                            {items.map(i => <MenuItem key={i.id} value={i.id}>{i.item_code} — {i.item_name}</MenuItem>)}
                        </TextField>
                        <TextField label="Manufacture Date *" type="date" value={form.manufacture_date} onChange={f('manufacture_date')} InputLabelProps={{ shrink:true }} />
                        <TextField label="Expiry Date *" type="date" value={form.expiry_date} onChange={f('expiry_date')} InputLabelProps={{ shrink:true }} />
                        <TextField label="Shelf Life (Months) *" type="number" value={form.shelf_life_months} onChange={f('shelf_life_months')} />
                        <TextField label="Quantity Remaining" type="number" value={form.quantity_remaining} onChange={f('quantity_remaining')} />
                        <TextField label="Storage Condition" value={form.storage_condition} onChange={f('storage_condition')} helperText="e.g. Store below 25°C, dry place" sx={{ gridColumn:'span 2' }} />
                        <TextField label="Notes" value={form.notes} onChange={f('notes')} sx={{ gridColumn:'span 2' }} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p:2 }}>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor:'primary.main' }}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default ShelfLifeTrackingPage;
