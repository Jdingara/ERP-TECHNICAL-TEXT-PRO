// FILE: pages/production/BOMFormPage.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Paper, MenuItem, Select, InputLabel, FormControl, Alert, IconButton, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';

const EMPTY_LINE = { raw_material_id: '', quantity: '', waste_percent: 0, notes: '' };

function BOMFormPage() {
    const navigate = useNavigate();
    const [items, setItems]                   = useState([]);
    const [bomName, setBomName]               = useState('');
    const [finishedProductId, setFinishedProductId] = useState('');
    const [quantityProduced, setQuantityProduced]   = useState(100);
    const [notes, setNotes]                   = useState('');
    const [lines, setLines]                   = useState([{ ...EMPTY_LINE }]);
    const [saving, setSaving]                 = useState(false);
    const [error, setError]                   = useState('');

    useEffect(() => {
        fetch('/api/master-data/items/', { credentials: 'include' })
            .then(r => r.json())
            .then(data => setItems(data.items || []));
    }, []);

    const finishedGoods = items.filter(i => ['finished_goods', 'semi_finished'].includes(i.item_type));
    const rawMaterials  = items.filter(i => !['finished_goods'].includes(i.item_type));

    const addLine    = () => setLines(p => [...p, { ...EMPTY_LINE }]);
    const removeLine = (i) => setLines(p => p.filter((_, idx) => idx !== i));
    const updateLine = (i, field, value) => setLines(p => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

    const handleSave = async () => {
        if (!finishedProductId || !bomName) {
            setError('BOM Name and Finished Product are required.'); return;
        }
        setSaving(true); setError('');
        const payload = {
            bom_name: bomName, finished_product_id: finishedProductId,
            quantity_produced: quantityProduced, notes,
            lines: lines.filter(l => l.raw_material_id).map(l => ({
                raw_material_id: l.raw_material_id,
                quantity:        l.quantity,
                waste_percent:   l.waste_percent || 0,
                notes:           l.notes,
            })),
        };
        const res = await fetch('/api/production/bom/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) navigate('/production/bill-of-materials');
        else { setError(data.message || 'Error saving BOM.'); setSaving(false); }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/production/bill-of-materials')} variant="outlined" size="small">Back to BOM</Button>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>Create Bill of Materials</Typography>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ backgroundColor: 'primary.main' }}>
                    {saving ? 'Saving…' : 'Save BOM'}
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary" mb={2}>BOM Header</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField label="BOM Name *" value={bomName} onChange={e => setBomName(e.target.value)} />
                    <FormControl>
                        <InputLabel>Finished Product *</InputLabel>
                        <Select value={finishedProductId} label="Finished Product *" onChange={e => setFinishedProductId(e.target.value)}>
                            {finishedGoods.map(i => <MenuItem key={i.id} value={i.id}>{i.item_code} — {i.item_name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField label="Quantity Produced (batch size)" type="number" value={quantityProduced}
                        onChange={e => setQuantityProduced(e.target.value)} />
                    <TextField label="Notes" value={notes} onChange={e => setNotes(e.target.value)} multiline rows={2} />
                </Box>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} color="primary">Raw Materials Required</Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={addLine}>Add Material</Button>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1.5fr 40px', gap: 1, mb: 1, px: 1 }}>
                    {['Raw Material', 'Quantity', 'Waste %', 'Notes', ''].map(h => (
                        <Typography key={h} variant="caption" fontWeight={700} color="text.secondary">{h}</Typography>
                    ))}
                </Box>
                <Divider sx={{ mb: 1 }} />

                {lines.map((line, i) => (
                    <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1.5fr 40px', gap: 1, mb: 1 }}>
                        <FormControl size="small">
                            <Select value={line.raw_material_id} displayEmpty
                                onChange={e => updateLine(i, 'raw_material_id', e.target.value)}>
                                <MenuItem value=""><em>Select material...</em></MenuItem>
                                {rawMaterials.map(m => <MenuItem key={m.id} value={m.id}>{m.item_code} — {m.item_name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" type="number" label="Qty" value={line.quantity}
                            onChange={e => updateLine(i, 'quantity', e.target.value)} />
                        <TextField size="small" type="number" label="Waste %" value={line.waste_percent}
                            onChange={e => updateLine(i, 'waste_percent', e.target.value)} />
                        <TextField size="small" label="Notes" value={line.notes}
                            onChange={e => updateLine(i, 'notes', e.target.value)} />
                        <IconButton size="small" color="error" onClick={() => removeLine(i)} disabled={lines.length <= 1}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                ))}
            </Paper>
        </Box>
    );
}
export default BOMFormPage;
