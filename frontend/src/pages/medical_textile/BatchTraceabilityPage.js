// ============================================================
// FILE: pages/medical_textile/BatchTraceabilityPage.js
// PURPOSE: Full traceability per production batch.
//          Links raw material lots → production → QC → dispatch.
//          Critical for recalls and ISO 13485 compliance.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, Alert, IconButton, Chip, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { ResizableTable } from '../../components/common/ResizableTable';

const API        = '/api/medical-textile/traceability/';
const API_BATCHES = '/api/production/batches/';
const API_ITEMS  = '/api/master-data/items/';

const EMPTY = {
    batch_id:'', item_id:'', raw_material_lot:'', supplier_batch_ref:'', raw_material_coa:'',
    production_date:'', production_line:'', operator_name:'', supervisor_name:'',
    qc_passed: false, qc_checked_by:'', qc_date:'', qc_remarks:'',
    dispatched_to:'', dispatch_date:'', invoice_reference:'', notes:'',
};

function BatchTraceabilityPage() {
    const [records, setRecords]   = useState([]);
    const [batches, setBatches]   = useState([]);
    const [items, setItems]       = useState([]);
    const [dialog, setDialog]     = useState(false);
    const [viewDialog, setViewDialog] = useState(false);
    const [viewRec, setViewRec]   = useState(null);
    const [form, setForm]         = useState(EMPTY);
    const [message, setMessage]   = useState('');
    const [msgType, setMsgType]   = useState('success');

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

    const handleSave = async () => {
        if (!form.batch_id || !form.item_id || !form.production_date) {
            setMessage('Batch, Product and Production Date are required.'); setMsgType('error'); return;
        }
        const res  = await fetch(API, {
            method:'POST', headers:{'Content-Type':'application/json'},
            credentials:'include', body: JSON.stringify({ ...form, qc_passed: form.qc_passed === 'true' || form.qc_passed === true }),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('Traceability record created.'); setMsgType('success');
            setDialog(false); fetchAll();
        } else { setMessage(data.message || 'Error.'); setMsgType('error'); }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Batch Traceability</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Complete traceability: raw material lots → production → QC → customer dispatch
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb:2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display:'flex', justifyContent:'flex-end', mb:2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setForm(EMPTY); setDialog(true); }}
                    sx={{ backgroundColor:'primary.main' }}>
                    Add Traceability Record
                </Button>
            </Box>

            <ResizableTable storageKey="batchtraceability">
                <TableContainer component={Paper} sx={{ boxShadow:2, borderRadius:2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor:'primary.main' }}>
                        <TableRow>
                            {['Batch Number','Product','Production Date','Operator','QC Passed','Dispatched To','Actions'].map(h => (
                                <TableCell key={h} sx={{ color:'white', fontWeight:'bold' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {records.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py:4, color:'text.secondary' }}>
                                No traceability records yet. Click "Add Traceability Record" to start.
                            </TableCell></TableRow>
                        ) : records.map(r => (
                            <TableRow key={r.id} hover>
                                <TableCell><strong>{r.batch_number}</strong></TableCell>
                                <TableCell>
                                    <Typography variant="body2">{r.item_code}</Typography>
                                    <Typography variant="caption" color="text.secondary">{r.item_name}</Typography>
                                </TableCell>
                                <TableCell>{r.production_date}</TableCell>
                                <TableCell>{r.operator_name || '—'}</TableCell>
                                <TableCell>
                                    <Chip label={r.qc_passed ? 'YES' : 'NO'} size="small" color={r.qc_passed ? 'success' : 'error'} />
                                </TableCell>
                                <TableCell>{r.dispatched_to || '—'}</TableCell>
                                <TableCell>
                                    <IconButton size="small" sx={{ color:'primary.main' }} onClick={() => { setViewRec(r); setViewDialog(true); }}>
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            </ResizableTable>

            {/* Create Dialog */}
            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ backgroundColor:'primary.main', color:'white' }}>Add Traceability Record</DialogTitle>
                <DialogContent sx={{ pt:3 }}>
                    <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, mt:1 }}>
                        <TextField select label="Batch *" value={form.batch_id} onChange={f('batch_id')}>
                            <MenuItem value=""><em>— Select Batch —</em></MenuItem>
                            {batches.map(b => <MenuItem key={b.id} value={b.id}>{b.batch_number} — {b.item_name}</MenuItem>)}
                        </TextField>
                        <TextField select label="Product *" value={form.item_id} onChange={f('item_id')}>
                            <MenuItem value=""><em>— Select Product —</em></MenuItem>
                            {items.map(i => <MenuItem key={i.id} value={i.id}>{i.item_code} — {i.item_name}</MenuItem>)}
                        </TextField>
                    </Box>

                    <Divider sx={{ my:2 }}><Typography variant="caption" color="text.secondary">RAW MATERIAL INFO</Typography></Divider>
                    <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:2 }}>
                        <TextField label="Raw Material Lot Numbers" value={form.raw_material_lot} onChange={f('raw_material_lot')} />
                        <TextField label="Supplier Batch Reference" value={form.supplier_batch_ref} onChange={f('supplier_batch_ref')} />
                        <TextField label="COA Reference" value={form.raw_material_coa} onChange={f('raw_material_coa')} helperText="Certificate of Analysis" />
                    </Box>

                    <Divider sx={{ my:2 }}><Typography variant="caption" color="text.secondary">PRODUCTION INFO</Typography></Divider>
                    <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:2 }}>
                        <TextField label="Production Date *" type="date" value={form.production_date} onChange={f('production_date')} InputLabelProps={{ shrink:true }} />
                        <TextField label="Production Line" value={form.production_line} onChange={f('production_line')} />
                        <TextField label="Operator Name" value={form.operator_name} onChange={f('operator_name')} />
                        <TextField label="Supervisor Name" value={form.supervisor_name} onChange={f('supervisor_name')} />
                    </Box>

                    <Divider sx={{ my:2 }}><Typography variant="caption" color="text.secondary">QC SIGN-OFF</Typography></Divider>
                    <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:2 }}>
                        <TextField select label="QC Passed?" value={form.qc_passed} onChange={f('qc_passed')}>
                            <MenuItem value={false}>No</MenuItem>
                            <MenuItem value={true}>Yes</MenuItem>
                        </TextField>
                        <TextField label="QC Checked By" value={form.qc_checked_by} onChange={f('qc_checked_by')} />
                        <TextField label="QC Date" type="date" value={form.qc_date} onChange={f('qc_date')} InputLabelProps={{ shrink:true }} />
                        <TextField label="QC Remarks" value={form.qc_remarks} onChange={f('qc_remarks')} sx={{ gridColumn:'span 3' }} />
                    </Box>

                    <Divider sx={{ my:2 }}><Typography variant="caption" color="text.secondary">DISPATCH INFO</Typography></Divider>
                    <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:2 }}>
                        <TextField label="Dispatched To" value={form.dispatched_to} onChange={f('dispatched_to')} helperText="Customer / hospital" />
                        <TextField label="Dispatch Date" type="date" value={form.dispatch_date} onChange={f('dispatch_date')} InputLabelProps={{ shrink:true }} />
                        <TextField label="Invoice Reference" value={form.invoice_reference} onChange={f('invoice_reference')} />
                    </Box>
                    <TextField fullWidth label="Notes" multiline rows={2} value={form.notes} onChange={f('notes')} sx={{ mt:2 }} />
                </DialogContent>
                <DialogActions sx={{ p:2 }}>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor:'primary.main' }}>Save Record</Button>
                </DialogActions>
            </Dialog>

            {/* View Dialog */}
            {viewRec && (
                <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ backgroundColor:'primary.main', color:'white' }}>Batch: {viewRec.batch_number}</DialogTitle>
                    <DialogContent sx={{ pt:3 }}>
                        {[
                            ['Product', `${viewRec.item_code} — ${viewRec.item_name}`],
                            ['Raw Material Lot', viewRec.raw_material_lot || '—'],
                            ['Supplier Batch Ref', viewRec.supplier_batch_ref || '—'],
                            ['COA', viewRec.raw_material_coa || '—'],
                            ['Production Date', viewRec.production_date],
                            ['Production Line', viewRec.production_line || '—'],
                            ['Operator', viewRec.operator_name || '—'],
                            ['Supervisor', viewRec.supervisor_name || '—'],
                            ['QC Passed', viewRec.qc_passed ? 'YES' : 'NO'],
                            ['QC By', viewRec.qc_checked_by || '—'],
                            ['QC Date', viewRec.qc_date || '—'],
                            ['QC Remarks', viewRec.qc_remarks || '—'],
                            ['Dispatched To', viewRec.dispatched_to || '—'],
                            ['Dispatch Date', viewRec.dispatch_date || '—'],
                            ['Invoice Ref', viewRec.invoice_reference || '—'],
                        ].map(([label, value]) => (
                            <Box key={label} sx={{ display:'flex', mb:0.8 }}>
                                <Typography variant="body2" fontWeight="bold" sx={{ width:160, color:'text.secondary', flexShrink:0 }}>{label}:</Typography>
                                <Typography variant="body2">{value}</Typography>
                            </Box>
                        ))}
                    </DialogContent>
                    <DialogActions><Button onClick={() => setViewDialog(false)}>Close</Button></DialogActions>
                </Dialog>
            )}
        </Box>
    );
}

export default BatchTraceabilityPage;
