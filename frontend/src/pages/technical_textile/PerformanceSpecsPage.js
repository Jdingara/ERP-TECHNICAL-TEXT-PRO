// ============================================================
// FILE: pages/technical_textile/PerformanceSpecsPage.js
// PURPOSE: Define performance specifications for each product.
//          GSM, tensile strength, elongation, tear strength, etc.
//          These specs are used in TDS and quality sign-off.
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
import DeleteIcon from '@mui/icons-material/Delete';

const API_SPECS = '/api/technical-textile/specs/';
const API_CATS  = '/api/technical-textile/categories/';
const API_ITEMS = '/api/master-data/items/';

const STATUS_COLOR = { draft: 'default', approved: 'success', archived: 'warning' };

const EMPTY = {
    item_id: '', category_id: '', spec_version: 'v1.0', status: 'draft',
    gsm: '', width_cm: '', thickness_mm: '',
    tensile_strength_warp: '', tensile_strength_weft: '',
    elongation_warp: '', elongation_weft: '',
    tear_strength: '', burst_strength: '', air_permeability: '',
    composition: '', standard_reference: '', notes: '',
};

function PerformanceSpecsPage() {
    const [specs, setSpecs]         = useState([]);
    const [items, setItems]         = useState([]);
    const [categories, setCategories] = useState([]);
    const [dialog, setDialog]       = useState(false);
    const [viewDialog, setViewDialog] = useState(false);
    const [viewSpec, setViewSpec]   = useState(null);
    const [form, setForm]           = useState(EMPTY);
    const [message, setMessage]     = useState('');
    const [msgType, setMsgType]     = useState('success');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        const [s, i, c] = await Promise.all([
            fetch(API_SPECS, { credentials: 'include' }).then(r => r.json()),
            fetch(API_ITEMS, { credentials: 'include' }).then(r => r.json()),
            fetch(API_CATS,  { credentials: 'include' }).then(r => r.json()),
        ]);
        setSpecs(s.specs || []);
        setItems(i.items || []);
        setCategories(c.categories || []);
    };

    const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

    const handleSave = async () => {
        if (!form.item_id) { setMessage('Select a product.'); setMsgType('error'); return; }
        const res  = await fetch(API_SPECS, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('Performance spec saved.'); setMsgType('success');
            setDialog(false); fetchAll();
        } else {
            setMessage(data.message || 'Error.'); setMsgType('error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this spec?')) return;
        await fetch(`${API_SPECS.replace(/\/$/, '')}/${id}/`, { method: 'DELETE', credentials: 'include' });
        fetchAll();
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Performance Specifications</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Define technical specs per product — GSM, tensile, elongation, tear strength, etc.
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setForm(EMPTY); setDialog(true); }}
                    sx={{ backgroundColor: 'primary.main' }}>
                    Add Spec
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            {['Product', 'Category', 'Version', 'GSM', 'Tensile W/F (N)', 'Elongation W/F (%)', 'Standard', 'Status', 'Actions'].map(h => (
                                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {specs.length === 0 ? (
                            <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                No specs yet. Click "Add Spec" to define product specifications.
                            </TableCell></TableRow>
                        ) : specs.map(s => (
                            <TableRow key={s.id} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">{s.item_code}</Typography>
                                    <Typography variant="caption" color="text.secondary">{s.item_name}</Typography>
                                </TableCell>
                                <TableCell>{s.category || '—'}</TableCell>
                                <TableCell>{s.spec_version}</TableCell>
                                <TableCell>{s.gsm || '—'}</TableCell>
                                <TableCell>{s.tensile_strength_warp || '—'} / {s.tensile_strength_weft || '—'}</TableCell>
                                <TableCell>{s.elongation_warp || '—'} / {s.elongation_weft || '—'}</TableCell>
                                <TableCell>{s.standard_reference || '—'}</TableCell>
                                <TableCell>
                                    <Chip label={s.status.toUpperCase()} size="small" color={STATUS_COLOR[s.status] || 'default'} />
                                </TableCell>
                                <TableCell>
                                    <IconButton size="small" sx={{ color: 'primary.main' }} onClick={() => { setViewSpec(s); setViewDialog(true); }}>
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create Dialog */}
            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>Add Performance Specification</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mt: 1 }}>
                        <TextField select label="Product *" value={form.item_id} onChange={f('item_id')} sx={{ gridColumn: 'span 2' }}>
                            <MenuItem value=""><em>— Select Product —</em></MenuItem>
                            {items.map(i => <MenuItem key={i.id} value={i.id}>{i.item_code} — {i.item_name}</MenuItem>)}
                        </TextField>
                        <TextField select label="Category" value={form.category_id} onChange={f('category_id')}>
                            <MenuItem value=""><em>— None —</em></MenuItem>
                            {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </TextField>
                        <TextField label="Version" value={form.spec_version} onChange={f('spec_version')} />
                        <TextField select label="Status" value={form.status} onChange={f('status')}>
                            {['draft', 'approved', 'archived'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </TextField>
                        <TextField label="Composition" value={form.composition} onChange={f('composition')} helperText="e.g. 100% PP" />
                    </Box>

                    <Divider sx={{ my: 2 }} />
                    <Typography fontWeight="bold" color="primary" mb={2}>Physical Properties</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                        <TextField label="GSM (g/m²)" type="number" value={form.gsm} onChange={f('gsm')} />
                        <TextField label="Width (cm)" type="number" value={form.width_cm} onChange={f('width_cm')} />
                        <TextField label="Thickness (mm)" type="number" value={form.thickness_mm} onChange={f('thickness_mm')} />
                    </Box>

                    <Divider sx={{ my: 2 }} />
                    <Typography fontWeight="bold" color="primary" mb={2}>Strength Properties</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                        <TextField label="Tensile Strength Warp (N)" type="number" value={form.tensile_strength_warp} onChange={f('tensile_strength_warp')} />
                        <TextField label="Tensile Strength Weft (N)" type="number" value={form.tensile_strength_weft} onChange={f('tensile_strength_weft')} />
                        <TextField label="Tear Strength (N)" type="number" value={form.tear_strength} onChange={f('tear_strength')} />
                        <TextField label="Elongation Warp (%)" type="number" value={form.elongation_warp} onChange={f('elongation_warp')} />
                        <TextField label="Elongation Weft (%)" type="number" value={form.elongation_weft} onChange={f('elongation_weft')} />
                        <TextField label="Burst Strength (kPa)" type="number" value={form.burst_strength} onChange={f('burst_strength')} />
                        <TextField label="Air Permeability (mm/s)" type="number" value={form.air_permeability} onChange={f('air_permeability')} />
                        <TextField label="Standard Reference" value={form.standard_reference} onChange={f('standard_reference')} helperText="e.g. IS 14715, ASTM D4595" sx={{ gridColumn: 'span 2' }} />
                    </Box>
                    <TextField fullWidth label="Notes" multiline rows={2} value={form.notes} onChange={f('notes')} sx={{ mt: 2 }} />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>Save Spec</Button>
                </DialogActions>
            </Dialog>

            {/* View Dialog */}
            {viewSpec && (
                <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>
                        {viewSpec.item_code} — {viewSpec.spec_version}
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        {[
                            ['Product', `${viewSpec.item_code} — ${viewSpec.item_name}`],
                            ['Category', viewSpec.category || '—'],
                            ['Composition', viewSpec.composition || '—'],
                            ['GSM (g/m²)', viewSpec.gsm || '—'],
                            ['Width (cm)', viewSpec.width_cm || '—'],
                            ['Thickness (mm)', viewSpec.thickness_mm || '—'],
                            ['Tensile Warp (N)', viewSpec.tensile_strength_warp || '—'],
                            ['Tensile Weft (N)', viewSpec.tensile_strength_weft || '—'],
                            ['Elongation Warp (%)', viewSpec.elongation_warp || '—'],
                            ['Elongation Weft (%)', viewSpec.elongation_weft || '—'],
                            ['Tear Strength (N)', viewSpec.tear_strength || '—'],
                            ['Burst Strength (kPa)', viewSpec.burst_strength || '—'],
                            ['Air Permeability (mm/s)', viewSpec.air_permeability || '—'],
                            ['Standard Reference', viewSpec.standard_reference || '—'],
                            ['Notes', viewSpec.notes || '—'],
                        ].map(([label, value]) => (
                            <Box key={label} sx={{ display: 'flex', mb: 1 }}>
                                <Typography variant="body2" fontWeight="bold" sx={{ width: 200, color: 'text.secondary' }}>{label}:</Typography>
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

export default PerformanceSpecsPage;
