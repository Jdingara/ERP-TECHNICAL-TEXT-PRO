// ============================================================
// FILE: pages/medical_textile/CAPAManagementPage.js
// PURPOSE: CAPA = Corrective and Preventive Actions.
//          Required by ISO 13485. Raised when something goes
//          wrong — customer complaint, audit finding, failure.
//          Tracks root cause, action taken, and closure.
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
import { useColumnResize } from '../../components/common/useColumnResize';

const API = '/api/medical-textile/capa/';

const STATUS_COLOR = { open:'error', in_progress:'warning', closed:'success', overdue:'error' };
const SOURCES = ['customer_complaint','internal_audit','external_audit','product_failure','supplier_issue','process_deviation','other'];
const EMPTY = { capa_type:'corrective', source:'customer_complaint', description:'', root_cause:'', responsible_person:'', target_date:'' };

function CAPAManagementPage() {
    const { widths, Resizer } = useColumnResize("capamanagement", [100, 180, 150, 80]);
    const [capas, setCapas]         = useState([]);
    const [dialog, setDialog]       = useState(false);
    const [closeDialog, setCloseDialog] = useState(false);
    const [viewDialog, setViewDialog]   = useState(false);
    const [selectedCapa, setSelectedCapa] = useState(null);
    const [form, setForm]           = useState(EMPTY);
    const [closeForm, setCloseForm] = useState({ status:'closed', action_taken:'', root_cause:'', effectiveness_check:'' });
    const [message, setMessage]     = useState('');
    const [msgType, setMsgType]     = useState('success');

    useEffect(() => { fetchCapas(); }, []);
    const fetchCapas = async () => {
        const res  = await fetch(API, { credentials:'include' });
        const data = await res.json();
        setCapas(data.capas || []);
    };

    const f  = field => e => setForm(p => ({ ...p, [field]: e.target.value }));
    const fc = field => e => setCloseForm(p => ({ ...p, [field]: e.target.value }));

    const handleCreate = async () => {
        if (!form.description) { setMessage('Description is required.'); setMsgType('error'); return; }
        const res  = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(form) });
        const data = await res.json();
        if (res.ok) {
            setMessage(`CAPA created: ${data.capa.capa_number}`); setMsgType('success'); setDialog(false); fetchCapas();
        } else { setMessage(data.message || 'Error.'); setMsgType('error'); }
    };

    const handleClose = async () => {
        const res  = await fetch(`${API.replace(/\/$/,'')}/${selectedCapa.id}/close/`, {
            method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(closeForm),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('CAPA updated.'); setMsgType('success'); setCloseDialog(false); fetchCapas();
        } else { setMessage(data.message || 'Error.'); setMsgType('error'); }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>CAPA Management</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Corrective & Preventive Actions — ISO 13485 required. Track issues from root cause to closure.
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb:2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display:'flex', justifyContent:'flex-end', mb:2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setForm(EMPTY); setDialog(true); }}
                    sx={{ backgroundColor:'primary.main' }}>
                    Raise CAPA
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow:2, borderRadius:2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor:'primary.main' }}>
                        <TableRow>
                            {['CAPA No.','Type','Source','Description','Responsible','Target Date','Status','Actions'].map(h => (
                                <TableCell key={h} sx={{ color:'white', fontWeight:'bold' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {capas.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center" sx={{ py:4, color:'text.secondary' }}>
                                No CAPAs raised yet. Click "Raise CAPA" when an issue is found.
                            </TableCell></TableRow>
                        ) : capas.map(c => (
                            <TableRow key={c.id} hover>
                                <TableCell><strong>{c.capa_number}</strong></TableCell>
                                <TableCell>{c.capa_type}</TableCell>
                                <TableCell>{c.source.replace(/_/g,' ')}</TableCell>
                                <TableCell sx={{ maxWidth:200 }}>
                                    <Typography variant="body2" noWrap>{c.description}</Typography>
                                </TableCell>
                                <TableCell>{c.responsible_person || '—'}</TableCell>
                                <TableCell>{c.target_date || '—'}</TableCell>
                                <TableCell>
                                    <Chip label={c.status.replace('_',' ').toUpperCase()} size="small" color={STATUS_COLOR[c.status] || 'default'} />
                                </TableCell>
                                <TableCell>
                                    <IconButton size="small" sx={{ color:'primary.main' }} onClick={() => { setSelectedCapa(c); setViewDialog(true); }}>
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                    {c.status !== 'closed' && (
                                        <IconButton size="small" sx={{ color:'#2e7d32', ml:0.5 }} title="Update / Close"
                                            onClick={() => { setSelectedCapa(c); setCloseForm({ status:'closed', action_taken:'', root_cause: c.root_cause, effectiveness_check:'' }); setCloseDialog(true); }}>
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
                <DialogTitle sx={{ backgroundColor:'primary.main', color:'white' }}>Raise CAPA</DialogTitle>
                <DialogContent sx={{ pt:3 }}>
                    <Box sx={{ display:'flex', flexDirection:'column', gap:2, mt:1 }}>
                        <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2 }}>
                            <TextField select label="Type" value={form.capa_type} onChange={f('capa_type')}>
                                <MenuItem value="corrective">Corrective Action</MenuItem>
                                <MenuItem value="preventive">Preventive Action</MenuItem>
                            </TextField>
                            <TextField select label="Source" value={form.source} onChange={f('source')}>
                                {SOURCES.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g,' ')}</MenuItem>)}
                            </TextField>
                        </Box>
                        <TextField label="Description *" multiline rows={3} value={form.description} onChange={f('description')} helperText="Describe the problem or issue" />
                        <TextField label="Root Cause (if known)" multiline rows={2} value={form.root_cause} onChange={f('root_cause')} />
                        <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2 }}>
                            <TextField label="Responsible Person" value={form.responsible_person} onChange={f('responsible_person')} />
                            <TextField label="Target Closure Date" type="date" value={form.target_date} onChange={f('target_date')} InputLabelProps={{ shrink:true }} />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p:2 }}>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} sx={{ backgroundColor:'primary.main' }}>Raise CAPA</Button>
                </DialogActions>
            </Dialog>

            {/* Close/Update Dialog */}
            <Dialog open={closeDialog} onClose={() => setCloseDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor:'#2e7d32', color:'white' }}>Update CAPA: {selectedCapa?.capa_number}</DialogTitle>
                <DialogContent sx={{ pt:3 }}>
                    <Box sx={{ display:'flex', flexDirection:'column', gap:2, mt:1 }}>
                        <TextField select label="Status" value={closeForm.status} onChange={fc('status')}>
                            {['open','in_progress','closed','overdue'].map(s => <MenuItem key={s} value={s}>{s.replace('_',' ')}</MenuItem>)}
                        </TextField>
                        <TextField label="Root Cause" multiline rows={2} value={closeForm.root_cause} onChange={fc('root_cause')} />
                        <TextField label="Action Taken" multiline rows={3} value={closeForm.action_taken} onChange={fc('action_taken')} helperText="What was done to fix/prevent this?" />
                        <TextField label="Effectiveness Check" multiline rows={2} value={closeForm.effectiveness_check} onChange={fc('effectiveness_check')} helperText="Was the action effective?" />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p:2 }}>
                    <Button onClick={() => setCloseDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleClose} sx={{ backgroundColor:'#2e7d32' }}>Update CAPA</Button>
                </DialogActions>
            </Dialog>

            {/* View Dialog */}
            {selectedCapa && (
                <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ backgroundColor:'primary.main', color:'white' }}>{selectedCapa.capa_number}</DialogTitle>
                    <DialogContent sx={{ pt:3 }}>
                        {[
                            ['Type', selectedCapa.capa_type],
                            ['Source', selectedCapa.source.replace(/_/g,' ')],
                            ['Description', selectedCapa.description],
                            ['Root Cause', selectedCapa.root_cause || '—'],
                            ['Action Taken', selectedCapa.action_taken || '—'],
                            ['Responsible', selectedCapa.responsible_person || '—'],
                            ['Target Date', selectedCapa.target_date || '—'],
                            ['Closed Date', selectedCapa.closed_date || '—'],
                            ['Status', selectedCapa.status],
                            ['Effectiveness', selectedCapa.effectiveness_check || '—'],
                        ].map(([l, v]) => (
                            <Box key={l} sx={{ display:'flex', mb:0.8, alignItems:'flex-start' }}>
                                <Typography variant="body2" fontWeight="bold" sx={{ width:150, color:'text.secondary', flexShrink:0 }}>{l}:</Typography>
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

export default CAPAManagementPage;
