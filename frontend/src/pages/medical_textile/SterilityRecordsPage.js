// ============================================================
// FILE: pages/medical_textile/SterilityRecordsPage.js
// PURPOSE: Record sterilization process for each batch.
//          Methods: EO Gas, Gamma, Steam, Dry Heat, E-Beam.
//          Required for surgical and wound care products.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, Alert, IconButton, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { ResizableTable } from '../../components/common/ResizableTable';

const API         = '/api/medical-textile/sterility/';
const API_BATCHES = '/api/production/batches/';

const METHODS = ['eo_gas','gamma','steam','dry_heat','e_beam','other'];
const RESULT_COLOR = { pass:'success', fail:'error', pending:'warning' };

const EMPTY = {
    batch_id:'', sterilization_method:'eo_gas', sterilization_date:'',
    sterilized_by:'', cycle_number:'', temperature:'', exposure_time_min:'',
    test_result:'pending', test_date:'', tested_by:'', certificate_number:'', remarks:'',
};

function SterilityRecordsPage() {
    const [records, setRecords] = useState([]);
    const [batches, setBatches] = useState([]);
    const [dialog, setDialog]   = useState(false);
    const [viewDialog, setViewDialog] = useState(false);
    const [viewRec, setViewRec] = useState(null);
    const [form, setForm]       = useState(EMPTY);
    const [message, setMessage] = useState('');
    const [msgType, setMsgType] = useState('success');

    useEffect(() => { fetchAll(); }, []);
    const fetchAll = async () => {
        const [r, b] = await Promise.all([
            fetch(API,         { credentials:'include' }).then(x => x.json()),
            fetch(API_BATCHES, { credentials:'include' }).then(x => x.json()),
        ]);
        setRecords(r.records || []);
        setBatches(b.batches || []);
    };

    const f = field => e => setForm(p => ({ ...p, [field]: e.target.value }));

    const handleSave = async () => {
        if (!form.batch_id || !form.sterilization_date) {
            setMessage('Batch and Sterilization Date are required.'); setMsgType('error'); return;
        }
        const res  = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(form) });
        const data = await res.json();
        if (res.ok) {
            setMessage('Sterility record added.'); setMsgType('success'); setDialog(false); fetchAll();
        } else { setMessage(data.message || 'Error.'); setMsgType('error'); }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Sterility Records</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Sterilization process records for surgical and wound care product batches
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb:2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display:'flex', justifyContent:'flex-end', mb:2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setForm(EMPTY); setDialog(true); }}
                    sx={{ backgroundColor:'primary.main' }}>
                    Add Sterility Record
                </Button>
            </Box>

            <ResizableTable storageKey="sterilityrecords">
                <TableContainer component={Paper} sx={{ boxShadow:2, borderRadius:2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor:'primary.main' }}>
                        <TableRow>
                            {['Batch','Method','Sterilization Date','Sterilized By','Cycle No.','Temp (°C)','Time (min)','Result','Actions'].map(h => (
                                <TableCell key={h} sx={{ color:'white', fontWeight:'bold' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {records.length === 0 ? (
                            <TableRow><TableCell colSpan={9} align="center" sx={{ py:4, color:'text.secondary' }}>
                                No sterility records yet. Click "Add Sterility Record" to start.
                            </TableCell></TableRow>
                        ) : records.map(r => (
                            <TableRow key={r.id} hover>
                                <TableCell><strong>{r.batch_number}</strong></TableCell>
                                <TableCell>{r.sterilization_method.replace('_',' ').toUpperCase()}</TableCell>
                                <TableCell>{r.sterilization_date}</TableCell>
                                <TableCell>{r.sterilized_by || '—'}</TableCell>
                                <TableCell>{r.cycle_number || '—'}</TableCell>
                                <TableCell>{r.temperature || '—'}</TableCell>
                                <TableCell>{r.exposure_time_min || '—'}</TableCell>
                                <TableCell>
                                    <Chip label={r.test_result.toUpperCase()} size="small" color={RESULT_COLOR[r.test_result] || 'default'} />
                                </TableCell>
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
            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor:'primary.main', color:'white' }}>Add Sterility Record</DialogTitle>
                <DialogContent sx={{ pt:3 }}>
                    <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2, mt:1 }}>
                        <TextField select label="Batch *" value={form.batch_id} onChange={f('batch_id')} sx={{ gridColumn:'span 2' }}>
                            <MenuItem value=""><em>— Select Batch —</em></MenuItem>
                            {batches.map(b => <MenuItem key={b.id} value={b.id}>{b.batch_number} — {b.item_name}</MenuItem>)}
                        </TextField>
                        <TextField select label="Sterilization Method" value={form.sterilization_method} onChange={f('sterilization_method')}>
                            {METHODS.map(m => <MenuItem key={m} value={m}>{m.replace('_',' ').toUpperCase()}</MenuItem>)}
                        </TextField>
                        <TextField label="Sterilization Date *" type="date" value={form.sterilization_date} onChange={f('sterilization_date')} InputLabelProps={{ shrink:true }} />
                        <TextField label="Sterilized By" value={form.sterilized_by} onChange={f('sterilized_by')} helperText="Company or department" />
                        <TextField label="Cycle Number" value={form.cycle_number} onChange={f('cycle_number')} />
                        <TextField label="Temperature (°C)" type="number" value={form.temperature} onChange={f('temperature')} />
                        <TextField label="Exposure Time (min)" type="number" value={form.exposure_time_min} onChange={f('exposure_time_min')} />
                        <TextField select label="Test Result" value={form.test_result} onChange={f('test_result')}>
                            {['pending','pass','fail'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </TextField>
                        <TextField label="Test Date" type="date" value={form.test_date} onChange={f('test_date')} InputLabelProps={{ shrink:true }} />
                        <TextField label="Tested By" value={form.tested_by} onChange={f('tested_by')} />
                        <TextField label="Certificate Number" value={form.certificate_number} onChange={f('certificate_number')} />
                        <TextField label="Remarks" value={form.remarks} onChange={f('remarks')} sx={{ gridColumn:'span 2' }} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p:2 }}>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor:'primary.main' }}>Save</Button>
                </DialogActions>
            </Dialog>

            {viewRec && (
                <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ backgroundColor:'primary.main', color:'white' }}>Sterility: {viewRec.batch_number}</DialogTitle>
                    <DialogContent sx={{ pt:3 }}>
                        {[
                            ['Batch', viewRec.batch_number],
                            ['Method', viewRec.sterilization_method],
                            ['Date', viewRec.sterilization_date],
                            ['Sterilized By', viewRec.sterilized_by || '—'],
                            ['Cycle Number', viewRec.cycle_number || '—'],
                            ['Temperature', viewRec.temperature ? `${viewRec.temperature} °C` : '—'],
                            ['Exposure Time', viewRec.exposure_time_min ? `${viewRec.exposure_time_min} min` : '—'],
                            ['Test Result', viewRec.test_result.toUpperCase()],
                            ['Test Date', viewRec.test_date || '—'],
                            ['Tested By', viewRec.tested_by || '—'],
                            ['Certificate No.', viewRec.certificate_number || '—'],
                            ['Remarks', viewRec.remarks || '—'],
                        ].map(([l, v]) => (
                            <Box key={l} sx={{ display:'flex', mb:0.8 }}>
                                <Typography variant="body2" fontWeight="bold" sx={{ width:160, color:'text.secondary', flexShrink:0 }}>{l}:</Typography>
                                <Typography variant="body2">{v}</Typography>
                            </Box>
                        ))}
                    </DialogContent>
                    <DialogActions><Button onClick={() => setViewDialog(false)}>Close</Button></DialogActions>
                </Dialog>
            )}
        </Box>
    );
}

export default SterilityRecordsPage;
