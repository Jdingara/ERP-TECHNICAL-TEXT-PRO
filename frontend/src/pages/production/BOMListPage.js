// ============================================================
// FILE: pages/production/BOMListPage.js
// PURPOSE: Bill of Materials - recipe for making each product.
//          Shows finished product + all raw materials needed.
//          Includes waste percentage (critical for spinning).
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Select, InputLabel, FormControl,
    Alert, Divider, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useColumnResize } from '../../components/common/useColumnResize';

const EMPTY_LINE = { raw_material_id: '', quantity: '', waste_percent: 0, notes: '' };

function BOMListPage() {
    const { widths, Resizer } = useColumnResize("bom_list", [100, 180, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 80]);
    const [boms, setBoms]               = useState([]);
    const [items, setItems]             = useState([]);
    const [dialogOpen, setDialogOpen]   = useState(false);
    const [viewDialog, setViewDialog]   = useState(false);
    const [selectedBom, setSelectedBom] = useState(null);
    const [message, setMessage]         = useState('');
    const [messageType, setMessageType] = useState('success');

    const [bomName, setBomName]                     = useState('');
    const [finishedProductId, setFinishedProductId] = useState('');
    const [quantityProduced, setQuantityProduced]   = useState(100);
    const [notes, setNotes]                         = useState('');
    const [lines, setLines]                         = useState([{ ...EMPTY_LINE }]);

    useEffect(() => { fetchBoms(); fetchItems(); }, []);

    const fetchBoms = async () => {
        const res = await fetch('/api/production/bom/', { credentials: 'include' });
        const data = await res.json();
        setBoms(data.boms || []);
    };

    const fetchItems = async () => {
        const res = await fetch('/api/master-data/items/', { credentials: 'include' });
        const data = await res.json();
        setItems(data.items || []);
    };

    const handleViewBom = async (bomId) => {
        const res = await fetch(`/api/production/bom/${bomId}/`, { credentials: 'include' });
        const data = await res.json();
        setSelectedBom(data.bom);
        setViewDialog(true);
    };

    const addLine = () => setLines(prev => [...prev, { ...EMPTY_LINE }]);
    const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i));
    const updateLine = (i, field, value) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

    const handleSave = async () => {
        if (!finishedProductId || !bomName) {
            setMessage('Please fill in BOM Name and Finished Product.'); setMessageType('error'); return;
        }
        const payload = {
            bom_name: bomName, finished_product_id: finishedProductId,
            quantity_produced: quantityProduced, notes,
            lines: lines.filter(l => l.raw_material_id).map(l => ({
                raw_material_id: l.raw_material_id,
                quantity: l.quantity,
                waste_percent: l.waste_percent || 0,
                notes: l.notes,
            })),
        };
        const res = await fetch('/api/production/bom/', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('BOM created successfully.'); setMessageType('success');
            setDialogOpen(false); fetchBoms();
        } else {
            setMessage(data.message || 'Error.'); setMessageType('error');
        }
    };

    const finishedGoods = items.filter(i => ['finished_goods', 'semi_finished'].includes(i.item_type));
    const rawMaterials  = items.filter(i => i.item_type === 'raw_material');

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Bill of Materials</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Recipe for each product — what raw materials are needed and how much
            </Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setDialogOpen(true); setBomName(''); setFinishedProductId(''); setLines([{ ...EMPTY_LINE }]); }}
                    sx={{ backgroundColor: 'primary.main' }}>
                    Create BOM
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[0] }}>BOM Name<Resizer index={0} /></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[1] }}>Finished Product<Resizer index={1} /></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[2] }}>Qty Produced<Resizer index={2} /></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[3] }}>Status<Resizer index={3} /></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[4] }}>Actions<Resizer index={4} /></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {boms.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No BOMs yet. Click "Create BOM" to define your production recipes.
                                </TableCell>
                            </TableRow>
                        ) : boms.map((b) => (
                            <TableRow key={b.id} hover>
                                <TableCell><strong>{b.bom_name}</strong></TableCell>
                                <TableCell>{b.finished_product_code} — {b.finished_product}</TableCell>
                                <TableCell>{b.quantity_produced}</TableCell>
                                <TableCell><Chip label={b.status} size="small" color={b.status === 'active' ? 'success' : 'default'} /></TableCell>
                                <TableCell>
                                    <IconButton size="small" sx={{ color: 'primary.main' }} onClick={() => handleViewBom(b.id)}>
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create BOM Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>Create Bill of Materials</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 3, mt: 1 }}>
                        <TextField label="BOM Name *" value={bomName} onChange={(e) => setBomName(e.target.value)} sx={{ gridColumn: 'span 2' }} />
                        <TextField label="Quantity Produced" type="number" value={quantityProduced} onChange={(e) => setQuantityProduced(e.target.value)} />
                        <FormControl sx={{ gridColumn: 'span 2' }}>
                            <InputLabel>Finished Product *</InputLabel>
                            <Select value={finishedProductId} label="Finished Product *" onChange={(e) => setFinishedProductId(e.target.value)}>
                                {finishedGoods.map(i => <MenuItem key={i.id} value={i.id}>{i.item_code} — {i.item_name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography fontWeight="bold" color="primary">Raw Materials Required</Typography>
                        <Button size="small" startIcon={<AddIcon />} onClick={addLine} variant="outlined">Add Material</Button>
                    </Box>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: 'action.hover' }}>
                            <TableRow>
                                <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[5] }}>Raw Material *<Resizer index={5} /></TableCell>
                                <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[6] }}>Quantity *<Resizer index={6} /></TableCell>
                                <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[7] }}>Waste % (for spinning)<Resizer index={7} /></TableCell>
                                <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[8] }}>Qty incl. Waste<Resizer index={8} /></TableCell>
                                <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[9] }}>Notes<Resizer index={9} /></TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.map((line, i) => {
                                const qtyWithWaste = (parseFloat(line.quantity || 0) * (1 + parseFloat(line.waste_percent || 0) / 100)).toFixed(3);
                                return (
                                    <TableRow key={i}>
                                        <TableCell sx={{ minWidth: 220 }}>
                                            <FormControl fullWidth size="small">
                                                <Select value={line.raw_material_id}
                                                    onChange={(e) => updateLine(i, 'raw_material_id', e.target.value)} displayEmpty>
                                                    <MenuItem value="">-- Select --</MenuItem>
                                                    {rawMaterials.map(item => (
                                                        <MenuItem key={item.id} value={item.id}>{item.item_code} — {item.item_name}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>
                                        <TableCell sx={{ width: 100 }}>
                                            <TextField size="small" type="number" value={line.quantity}
                                                onChange={(e) => updateLine(i, 'quantity', e.target.value)} />
                                        </TableCell>
                                        <TableCell sx={{ width: 130 }}>
                                            <TextField size="small" type="number" value={line.waste_percent}
                                                onChange={(e) => updateLine(i, 'waste_percent', e.target.value)}
                                                InputProps={{ endAdornment: '%' }} />
                                        </TableCell>
                                        <TableCell sx={{ width: 100 }}>
                                            <strong style={{ color: '#e65100' }}>{qtyWithWaste}</strong>
                                        </TableCell>
                                        <TableCell>
                                            <TextField size="small" value={line.notes}
                                                onChange={(e) => updateLine(i, 'notes', e.target.value)} />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton size="small" color="error" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>Save BOM</Button>
                </DialogActions>
            </Dialog>

            {/* View BOM Dialog */}
            {selectedBom && (
                <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
                    <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>
                        BOM: {selectedBom.bom_name}
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        <Typography variant="body1" mb={2}>
                            <strong>Finished Product:</strong> {selectedBom.finished_product_code} — {selectedBom.finished_product}<br />
                            <strong>Quantity Produced:</strong> {selectedBom.quantity_produced}
                        </Typography>
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: 'action.hover' }}>
                                <TableRow>
                                    <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[10] }}>Raw Material<Resizer index={10} /></TableCell>
                                    <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[11] }}>Quantity<Resizer index={11} /></TableCell>
                                    <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[12] }}>Waste %<Resizer index={12} /></TableCell>
                                    <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[13] }}>Qty incl. Waste<Resizer index={13} /></TableCell>
                                    <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[14] }}>Unit<Resizer index={14} /></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedBom.lines?.map((line, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{line.raw_material_code} — {line.raw_material_name}</TableCell>
                                        <TableCell>{line.quantity}</TableCell>
                                        <TableCell>{line.waste_percent}%</TableCell>
                                        <TableCell><strong style={{ color: '#e65100' }}>{line.quantity_with_waste}</strong></TableCell>
                                        <TableCell>{line.unit}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setViewDialog(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
}

export default BOMListPage;
