// ============================================================
// FILE: pages/inventory/StockMovementPage.js
// PURPOSE: Add stock in or out manually.
//          Shows history of all stock movements.
//          Used for receiving stock, issuing stock, adjustments.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    MenuItem, Select, InputLabel, FormControl, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const MOVEMENT_TYPE_OPTIONS = [
    { value: 'stock_in',        label: 'Stock In (Received)',           color: 'success' },
    { value: 'stock_out',       label: 'Stock Out (Issued)',            color: 'error'   },
    { value: 'adjustment_in',   label: 'Adjustment In (Manual +)',      color: 'info'    },
    { value: 'adjustment_out',  label: 'Adjustment Out (Manual -)',     color: 'warning' },
    { value: 'production_out',  label: 'Production Out (Used in prod)', color: 'warning' },
    { value: 'production_in',   label: 'Production In (Finished goods)',color: 'success' },
];

const EMPTY_FORM = {
    item_id: '', warehouse_id: '', movement_type: 'stock_in',
    quantity: '', reference_number: '', notes: '',
};

function StockMovementPage() {
    const [movements, setMovements]   = useState([]);
    const [items, setItems]           = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData]     = useState(EMPTY_FORM);
    const [message, setMessage]       = useState('');
    const [messageType, setMessageType] = useState('success');

    useEffect(() => {
        fetchMovements();
        fetchItems();
        fetchWarehouses();
    }, []);

    const fetchMovements = async () => {
        const res = await fetch('/api/inventory/movements/', { credentials: 'include' });
        const data = await res.json();
        setMovements(data.movements || []);
    };

    const fetchItems = async () => {
        const res = await fetch('/api/master-data/items/', { credentials: 'include' });
        const data = await res.json();
        setItems(data.items || []);
    };

    const fetchWarehouses = async () => {
        const res = await fetch('/api/master-data/warehouses/', { credentials: 'include' });
        const data = await res.json();
        setWarehouses(data.warehouses || []);
    };

    const handleSave = async () => {
        const res = await fetch('/api/inventory/movements/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('Stock movement saved successfully.');
            setMessageType('success');
            setDialogOpen(false);
            setFormData(EMPTY_FORM);
            fetchMovements();
        } else {
            setMessage(data.message || 'Error saving movement.');
            setMessageType('error');
        }
    };

    const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const getMovementColor = (type) => {
        const opt = MOVEMENT_TYPE_OPTIONS.find(o => o.value === type);
        return opt ? opt.color : 'default';
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>
                Stock Movement
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Record stock in, stock out, and adjustments
            </Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => setDialogOpen(true)}
                    sx={{ backgroundColor: 'primary.main' }}>
                    Add Movement
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Item Code</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Item Name</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Movement Type</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Quantity</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Warehouse</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Reference</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>By</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {movements.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No movements yet. Click "Add Movement" to record stock in or out.
                                </TableCell>
                            </TableRow>
                        ) : (
                            movements.map((m) => (
                                <TableRow key={m.id} hover>
                                    <TableCell>{m.created_at}</TableCell>
                                    <TableCell><strong>{m.item_code}</strong></TableCell>
                                    <TableCell>{m.item_name}</TableCell>
                                    <TableCell>
                                        <Chip label={m.movement_type.replace(/_/g, ' ')}
                                            color={getMovementColor(m.movement_type)}
                                            size="small" />
                                    </TableCell>
                                    <TableCell><strong>{m.quantity}</strong></TableCell>
                                    <TableCell>{m.warehouse}</TableCell>
                                    <TableCell>{m.reference_number || '—'}</TableCell>
                                    <TableCell>{m.created_by}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add Movement Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>
                    Add Stock Movement
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>

                        <FormControl fullWidth>
                            <InputLabel>Item *</InputLabel>
                            <Select value={formData.item_id} label="Item *"
                                onChange={(e) => handleChange('item_id', e.target.value)}>
                                {items.map(i => (
                                    <MenuItem key={i.id} value={i.id}>
                                        {i.item_code} — {i.item_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Warehouse *</InputLabel>
                            <Select value={formData.warehouse_id} label="Warehouse *"
                                onChange={(e) => handleChange('warehouse_id', e.target.value)}>
                                {warehouses.length === 0
                                    ? <MenuItem disabled>No warehouses — add one in Master Data</MenuItem>
                                    : warehouses.map(w => (
                                        <MenuItem key={w.id} value={w.id}>{w.code} — {w.name}</MenuItem>
                                    ))
                                }
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Movement Type *</InputLabel>
                            <Select value={formData.movement_type} label="Movement Type *"
                                onChange={(e) => handleChange('movement_type', e.target.value)}>
                                {MOVEMENT_TYPE_OPTIONS.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField label="Quantity *" type="number" value={formData.quantity}
                            onChange={(e) => handleChange('quantity', e.target.value)} fullWidth />

                        <TextField label="Reference Number (PO/WO/etc)" value={formData.reference_number}
                            onChange={(e) => handleChange('reference_number', e.target.value)} fullWidth />

                        <TextField label="Notes" value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            multiline rows={2} fullWidth />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>
                        Save Movement
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default StockMovementPage;
