// ============================================================
// FILE: pages/technical_textile/TestingLabPage.js
// PURPOSE: Record actual lab test results for products.
//          Tests: physical, mechanical, chemical, flammability.
//          Result: Pass / Fail / Pending
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
import { useColumnResize } from '../../components/common/useColumnResize';

const API       = '/api/technical-textile/testing-lab/';
const API_ITEMS = '/api/master-data/items/';

const RESULT_COLOR = { pass: 'success', fail: 'error', pending: 'warning' };
const TEST_TYPES   = ['physical', 'mechanical', 'chemical', 'flammability', 'biological', 'other'];

const EMPTY = {
    item_id: '', test_type: 'physical', test_date: '', tested_by: '', lab_name: '',
    gsm_actual: '', tensile_warp_actual: '', tensile_weft_actual: '',
    elongation_warp_actual: '', elongation_weft_actual: '',
    tear_strength_actual: '', air_permeability_actual: '',
    overall_result: 'pending', remarks: '', standard_used: '',
};

function TestingLabPage() {
    const { widths, Resizer } = useColumnResize("testinglab", [100, 180, 150, 80]);
    const [records, setRecords] = useState([]);
    const [items, setItems]     = useState([]);
    const [dialog, setDialog]   = useState(false);
    const [viewDialog, setViewDialog] = useState(false);
    const [viewRecord, setViewRecord] = useState(null);
    const [form, setForm]       = useState(EMPTY);
    const [message, setMessage] = useState('');
    const [msgType, setMsgType] = useState('success');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        const [r, i] = await Promise.all([
            fetch(API,       { credentials: 'include' }).then(res => res.json()),
            fetch(API_ITEMS, { credentials: 'include' }).then(res => res.json()),
        ]);
        setRecords(r.records || []);
        setItems(i.items || []);
    };

    const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

    const handleSave = async () => {
        if (!form.item_id || !form.test_date || !form.tested_by) {
            setMessage('Product, Test Date, and Tested By are required.'); setMsgType('error'); return;
        }
        const res  = await fetch(API, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(`Test record created: ${data.record.test_number}`); setMsgType('success');
            setDialog(false); fetchAll();
        } else {
            setMessage(data.message || 'Error.'); setMsgType('error');
        }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Testing Lab</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Record actual lab test results — compare against performance specs
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setForm(EMPTY); setDialog(true); }}
                    sx={{ backgroundColor: 'primary.main' }}>
                    Add Test Record
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            {['Test No.', 'Product', 'Test Type', 'Test Date', 'Tested By', 'Lab', 'GSM', 'Tensile W/F', 'Result', 'Actions'].map(h => (
                                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {records.length === 0 ? (
                            <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                No test records yet. Click "Add Test Record" to start.
                            </TableCell></TableRow>
                        ) : records.map(r => (
                            <TableRow key={r.id} hover>
                                <TableCell><strong>{r.test_number}</strong></TableCell>
                                <TableCell>
                                    <Typography variant="body2">{r.item_code}</Typography>
                                    <Typography variant="caption" color="text.secondary">{r.item_name}</Typography>
                                </TableCell>
                                <TableCell>{r.test_type}</TableCell>
                                <TableCell>{r.test_date}</TableCell>
                                <TableCell>{r.tested_by}</TableCell>
                                <TableCell>{r.lab_name || '—'}</TableCell>
                                <TableCell>{r.gsm_actual || '—'}</TableCell>
                                <TableCell>{r.tensile_warp_actual || '—'} / {r.tensile_weft_actual || '—'}</TableCell>
                                <TableCell>
                                    <Chip label={r.overall_result.toUpperCase()} size="small"
                                        color={RESULT_COLOR[r.overall_result] || 'default'} />
                                </TableCell>
                                <TableCell>
                                    <IconButton size="small" sx={{ color: 'primary.main' }}
                                        onClick={() => { setViewRecord(r); setViewDialog(true); }}>
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create Dialog */}
            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>Add Test Record</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mt: 1 }}>
                        <TextField select label="Product *" value={form.item_id} onChange={f('item_id')} sx={{ gridColumn: 'span 2' }}>
                            <MenuItem value=""><em>— Select Product —</em></MenuItem>
                            {items.map(i => <MenuItem key={i.id} value={i.id}>{i.item_code} — {i.item_name}</MenuItem>)}
                        </TextField>
                        <TextField select label="Test Type" value={form.test_type} onChange={f('test_type')}>
                            {TEST_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </TextField>
                        <TextField label="Test Date *" type="date" value={form.test_date} onChange={f('test_date')} InputLabelProps={{ shrink: true }} />
                        <TextField label="Tested By *" value={form.tested_by} onChange={f('tested_by')} />
                        <TextField label="Lab Name" value={form.lab_name} onChange={f('lab_name')} />
                        <TextField label="Standard Used" value={form.standard_used} onChange={f('standard_used')} helperText="e.g. IS 1954, ASTM D5261" sx={{ gridColumn: 'span 2' }} />
                        <TextField select label="Overall Result" value={form.overall_result} onChange={f('overall_result')}>
                            {['pending', 'pass', 'fail'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </TextField>
                    </Box>

                    <Divider sx={{ my: 2 }} />
                    <Typography fontWeight="bold" color="primary" mb={2}>Actual Test Values</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                        <TextField label="GSM Actual (g/m²)" type="number" value={form.gsm_actual} onChange={f('gsm_actual')} />
                        <TextField label="Tensile Warp Actual (N)" type="number" value={form.tensile_warp_actual} onChange={f('tensile_warp_actual')} />
                        <TextField label="Tensile Weft Actual (N)" type="number" value={form.tensile_weft_actual} onChange={f('tensile_weft_actual')} />
                        <TextField label="Elongation Warp Actual (%)" type="number" value={form.elongation_warp_actual} onChange={f('elongation_warp_actual')} />
                        <TextField label="Elongation Weft Actual (%)" type="number" value={form.elongation_weft_actual} onChange={f('elongation_weft_actual')} />
                        <TextField label="Tear Strength Actual (N)" type="number" value={form.tear_strength_actual} onChange={f('tear_strength_actual')} />
                        <TextField label="Air Permeability Actual (mm/s)" type="number" value={form.air_permeability_actual} onChange={f('air_permeability_actual')} />
                    </Box>
                    <TextField fullWidth label="Remarks" multiline rows={2} value={form.remarks} onChange={f('remarks')} sx={{ mt: 2 }} />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>Save Test Record</Button>
                </DialogActions>
            </Dialog>

            {/* View Dialog */}
            {viewRecord && (
                <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>{viewRecord.test_number}</DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        {[
                            ['Product', `${viewRecord.item_code} — ${viewRecord.item_name}`],
                            ['Test Type', viewRecord.test_type],
                            ['Test Date', viewRecord.test_date],
                            ['Tested By', viewRecord.tested_by],
                            ['Lab', viewRecord.lab_name || '—'],
                            ['Standard', viewRecord.standard_used || '—'],
                            ['GSM Actual', viewRecord.gsm_actual || '—'],
                            ['Tensile Warp', viewRecord.tensile_warp_actual || '—'],
                            ['Tensile Weft', viewRecord.tensile_weft_actual || '—'],
                            ['Elongation Warp', viewRecord.elongation_warp_actual || '—'],
                            ['Elongation Weft', viewRecord.elongation_weft_actual || '—'],
                            ['Tear Strength', viewRecord.tear_strength_actual || '—'],
                            ['Air Permeability', viewRecord.air_permeability_actual || '—'],
                            ['Result', viewRecord.overall_result.toUpperCase()],
                            ['Remarks', viewRecord.remarks || '—'],
                        ].map(([label, value]) => (
                            <Box key={label} sx={{ display: 'flex', mb: 1 }}>
                                <Typography variant="body2" fontWeight="bold" sx={{ width: 170, color: 'text.secondary' }}>{label}:</Typography>
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

export default TestingLabPage;
