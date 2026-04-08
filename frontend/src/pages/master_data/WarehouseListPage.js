// ============================================================
// FILE: pages/master_data/WarehouseListPage.js
// PURPOSE: Shows list of all warehouses.
//          User can add new warehouse and edit existing ones.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useColumnResize } from '../../components/common/useColumnResize';

const EMPTY_FORM = { code: '', name: '', address: '' };

function WarehouseListPage() {
    const { widths, Resizer } = useColumnResize("warehouse_list", [100, 180, 150, 80]);
    const [warehouses, setWarehouses]   = useState([]);
    const [dialogOpen, setDialogOpen]   = useState(false);
    const [formData, setFormData]       = useState(EMPTY_FORM);
    const [editingId, setEditingId]     = useState(null);
    const [message, setMessage]         = useState('');
    const [messageType, setMessageType] = useState('success');

    useEffect(() => { fetchWarehouses(); }, []);

    const fetchWarehouses = async () => {
        const res = await fetch('/api/master-data/warehouses/', { credentials: 'include' });
        const data = await res.json();
        setWarehouses(data.warehouses || []);
    };

    const handleOpenAdd = () => { setFormData(EMPTY_FORM); setEditingId(null); setDialogOpen(true); };
    const handleOpenEdit = (w) => { setFormData({ code: w.code, name: w.name, address: w.address }); setEditingId(w.id); setDialogOpen(true); };

    const handleSave = async () => {
        const url = editingId
            ? `/api/master-data/warehouses/${editingId}/`
            : '/api/master-data/warehouses/';
        const method = editingId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(editingId ? 'Warehouse updated.' : 'Warehouse created.');
            setMessageType('success');
            setDialogOpen(false);
            fetchWarehouses();
        } else {
            setMessage(data.message || 'Error saving warehouse.');
            setMessageType('error');
        }
    };

    const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Warehouses</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Manage stock storage locations
            </Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}
                    sx={{ backgroundColor: 'primary.main' }}>Add Warehouse</Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[0] }}>Code<Resizer index={0} /></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[1] }}>Warehouse Name<Resizer index={1} /></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[2] }}>Address<Resizer index={2} /></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",whiteSpace:"nowrap",position:"relative",userSelect:"none",px:2,py:1 }} style={{ width: widths[3] }}>Actions<Resizer index={3} /></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {warehouses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No warehouses yet. Click "Add Warehouse" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            warehouses.map((w) => (
                                <TableRow key={w.id} hover>
                                    <TableCell><strong>{w.code}</strong></TableCell>
                                    <TableCell>{w.name}</TableCell>
                                    <TableCell>{w.address || '—'}</TableCell>
                                    <TableCell>
                                        <IconButton size="small" onClick={() => handleOpenEdit(w)} sx={{ color: 'primary.main' }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>
                    {editingId ? 'Edit Warehouse' : 'Add New Warehouse'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField label="Warehouse Code * (e.g. WH-01)" value={formData.code}
                            onChange={(e) => handleChange('code', e.target.value)} disabled={!!editingId} />
                        <TextField label="Warehouse Name *" value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)} />
                        <TextField label="Address" value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)} multiline rows={2} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>
                        {editingId ? 'Update' : 'Save Warehouse'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default WarehouseListPage;
