// ============================================================
// FILE: pages/master_data/SupplierListPage.js
// PURPOSE: Shows list of all suppliers.
//          User can search, add new supplier, edit details.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, MenuItem, Select, InputLabel, FormControl, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useColumnResize } from '../../components/common/useColumnResize';

const SUPPLIER_TYPE_OPTIONS = [
    { value: 'yarn_supplier',        label: 'Yarn Supplier' },
    { value: 'chemical_supplier',    label: 'Chemical Supplier' },
    { value: 'machine_supplier',     label: 'Machine Supplier' },
    { value: 'spare_parts_supplier', label: 'Spare Parts Supplier' },
    { value: 'other',                label: 'Other' },
];

const EMPTY_FORM = {
    supplier_code: '', supplier_name: '', supplier_type: 'yarn_supplier',
    contact_person: '', phone: '', email: '', address: '',
    city: '', state: '', country: 'India', pincode: '',
    gstin: '', pan_number: '', payment_days: 30,
};

function SupplierListPage() {
    const { widths, Resizer } = useColumnResize("supplier_list", [100, 180, 150, 150, 150, 150, 150, 150, 80]);
    const [suppliers, setSuppliers]     = useState([]);
    const [searchText, setSearchText]   = useState('');
    const [dialogOpen, setDialogOpen]   = useState(false);
    const [formData, setFormData]       = useState(EMPTY_FORM);
    const [editingId, setEditingId]     = useState(null);
    const [message, setMessage]         = useState('');
    const [messageType, setMessageType] = useState('success');

    useEffect(() => { fetchSuppliers(); }, []);

    const fetchSuppliers = async (search = '') => {
        const res = await fetch(`/api/master-data/suppliers/?search=${search}`, { credentials: 'include' });
        const data = await res.json();
        setSuppliers(data.suppliers || []);
    };

    const handleSearch = (e) => { setSearchText(e.target.value); fetchSuppliers(e.target.value); };

    const handleOpenAddDialog = () => { setFormData(EMPTY_FORM); setEditingId(null); setDialogOpen(true); };

    const handleOpenEditDialog = (s) => {
        setFormData({ ...s });
        setEditingId(s.id);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        const url = editingId
            ? `/api/master-data/suppliers/${editingId}/`
            : '/api/master-data/suppliers/';
        const method = editingId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(editingId ? 'Supplier updated.' : 'Supplier created.');
            setMessageType('success');
            setDialogOpen(false);
            fetchSuppliers(searchText);
        } else {
            setMessage(data.message || 'Error saving supplier.');
            setMessageType('error');
        }
    };

    const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Suppliers</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Manage all raw material and spare parts suppliers
            </Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <TextField placeholder="Search suppliers..." value={searchText}
                    onChange={handleSearch} size="small" sx={{ width: 350 }} />
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddDialog}
                    sx={{ backgroundColor: 'primary.main' }}>Add Supplier</Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[0] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Code<Resizer index={0} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[1] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Supplier Name<Resizer index={1} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[2] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Type<Resizer index={2} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[3] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Contact<Resizer index={3} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[4] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Phone<Resizer index={4} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[5] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>City<Resizer index={5} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[6] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>GSTIN<Resizer index={6} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[7] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Credit Days<Resizer index={7} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[8] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Actions<Resizer index={8} /></div></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {suppliers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No suppliers found. Click "Add Supplier" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            suppliers.map((s) => (
                                <TableRow key={s.id} hover>
                                    <TableCell><strong>{s.supplier_code}</strong></TableCell>
                                    <TableCell>{s.supplier_name}</TableCell>
                                    <TableCell>
                                        <Chip label={s.supplier_type.replace('_', ' ')} size="small" variant="outlined" color="success" />
                                    </TableCell>
                                    <TableCell>{s.contact_person}</TableCell>
                                    <TableCell>{s.phone}</TableCell>
                                    <TableCell>{s.city}</TableCell>
                                    <TableCell>{s.gstin || '—'}</TableCell>
                                    <TableCell>{s.payment_days} days</TableCell>
                                    <TableCell>
                                        <IconButton size="small" onClick={() => handleOpenEditDialog(s)} sx={{ color: 'primary.main' }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>
                    {editingId ? 'Edit Supplier' : 'Add New Supplier'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                        <TextField
                            label="Supplier Code"
                            value={editingId ? formData.supplier_code : 'Auto-generated'}
                            disabled
                            helperText={editingId ? 'Read only — assigned on creation' : 'Auto-assigned when saved'}
                            sx={{ '& .MuiInputBase-input.Mui-disabled': {
                                WebkitTextFillColor: editingId ? '#1a1a1a' : '#888',
                                fontStyle: editingId ? 'normal' : 'italic',
                            }}}
                        />
                        <TextField label="Supplier Name *" value={formData.supplier_name}
                            onChange={(e) => handleChange('supplier_name', e.target.value)} />
                        <FormControl>
                            <InputLabel>Supplier Type</InputLabel>
                            <Select value={formData.supplier_type} label="Supplier Type"
                                onChange={(e) => handleChange('supplier_type', e.target.value)}>
                                {SUPPLIER_TYPE_OPTIONS.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField label="Contact Person" value={formData.contact_person}
                            onChange={(e) => handleChange('contact_person', e.target.value)} />
                        <TextField label="Phone" value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)} />
                        <TextField label="Email" value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)} />
                        <TextField label="City" value={formData.city}
                            onChange={(e) => handleChange('city', e.target.value)} />
                        <TextField label="State" value={formData.state}
                            onChange={(e) => handleChange('state', e.target.value)} />
                        <TextField label="Country" value={formData.country}
                            onChange={(e) => handleChange('country', e.target.value)} />
                        <TextField label="Pincode" value={formData.pincode}
                            onChange={(e) => handleChange('pincode', e.target.value)} />
                        <TextField label="GSTIN" value={formData.gstin}
                            onChange={(e) => handleChange('gstin', e.target.value)} />
                        <TextField label="PAN Number" value={formData.pan_number}
                            onChange={(e) => handleChange('pan_number', e.target.value)} />
                        <TextField label="Payment Days (Credit)" type="number" value={formData.payment_days}
                            onChange={(e) => handleChange('payment_days', e.target.value)} />
                        <TextField label="Address" value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            multiline rows={2} sx={{ gridColumn: 'span 2' }} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>
                        {editingId ? 'Update Supplier' : 'Save Supplier'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default SupplierListPage;
