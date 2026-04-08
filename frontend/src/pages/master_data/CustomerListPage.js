// ============================================================
// FILE: pages/master_data/CustomerListPage.js
// PURPOSE: Shows list of all customers.
//          User can search, add new customer, edit details.
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

const CUSTOMER_TYPE_OPTIONS = [
    { value: 'domestic', label: 'Domestic' },
    { value: 'export',   label: 'Export' },
    { value: 'both',     label: 'Both Domestic & Export' },
];

const EMPTY_FORM = {
    customer_code: '', customer_name: '', customer_type: 'domestic',
    contact_person: '', phone: '', email: '', address: '',
    city: '', state: '', country: 'India', pincode: '',
    gstin: '', pan_number: '', credit_days: 30, credit_limit: 0,
};

function CustomerListPage() {
    const { widths, Resizer } = useColumnResize("customer_list", [100, 180, 150, 150, 150, 150, 150, 150, 80]);
    const [customers, setCustomers]     = useState([]);
    const [searchText, setSearchText]   = useState('');
    const [dialogOpen, setDialogOpen]   = useState(false);
    const [formData, setFormData]       = useState(EMPTY_FORM);
    const [editingId, setEditingId]     = useState(null);
    const [message, setMessage]         = useState('');
    const [messageType, setMessageType] = useState('success');

    useEffect(() => { fetchCustomers(); }, []);

    const fetchCustomers = async (search = '') => {
        const res = await fetch(`/api/master-data/customers/?search=${search}`, { credentials: 'include' });
        const data = await res.json();
        setCustomers(data.customers || []);
    };

    const handleSearch = (e) => { setSearchText(e.target.value); fetchCustomers(e.target.value); };
    const handleOpenAddDialog = () => { setFormData(EMPTY_FORM); setEditingId(null); setDialogOpen(true); };
    const handleOpenEditDialog = (c) => { setFormData({ ...c }); setEditingId(c.id); setDialogOpen(true); };

    const handleSave = async () => {
        const url = editingId
            ? `/api/master-data/customers/${editingId}/`
            : '/api/master-data/customers/';
        const method = editingId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(editingId ? 'Customer updated.' : 'Customer created.');
            setMessageType('success');
            setDialogOpen(false);
            fetchCustomers(searchText);
        } else {
            setMessage(data.message || 'Error saving customer.');
            setMessageType('error');
        }
    };

    const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const getTypeColor = (type) => type === 'export' ? 'warning' : type === 'both' ? 'success' : 'primary';

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Customers</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Manage all domestic and export customers
            </Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <TextField placeholder="Search customers..." value={searchText}
                    onChange={handleSearch} size="small" sx={{ width: 350 }} />
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddDialog}
                    sx={{ backgroundColor: 'primary.main' }}>Add Customer</Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color: "white", fontWeight: "bold", position: "relative", overflow: "hidden", whiteSpace: "nowrap" }} style={{ width: widths[0] }}>Code<Resizer index={0} /></TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold", position: "relative", overflow: "hidden", whiteSpace: "nowrap" }} style={{ width: widths[1] }}>Customer Name<Resizer index={1} /></TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold", position: "relative", overflow: "hidden", whiteSpace: "nowrap" }} style={{ width: widths[2] }}>Type<Resizer index={2} /></TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold", position: "relative", overflow: "hidden", whiteSpace: "nowrap" }} style={{ width: widths[3] }}>Contact<Resizer index={3} /></TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold", position: "relative", overflow: "hidden", whiteSpace: "nowrap" }} style={{ width: widths[4] }}>Phone<Resizer index={4} /></TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold", position: "relative", overflow: "hidden", whiteSpace: "nowrap" }} style={{ width: widths[5] }}>City<Resizer index={5} /></TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold", position: "relative", overflow: "hidden", whiteSpace: "nowrap" }} style={{ width: widths[6] }}>GSTIN<Resizer index={6} /></TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold", position: "relative", overflow: "hidden", whiteSpace: "nowrap" }} style={{ width: widths[7] }}>Credit Days<Resizer index={7} /></TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold", position: "relative", overflow: "hidden", whiteSpace: "nowrap" }} style={{ width: widths[8] }}>Actions<Resizer index={8} /></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No customers found. Click "Add Customer" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            customers.map((c) => (
                                <TableRow key={c.id} hover>
                                    <TableCell><strong>{c.customer_code}</strong></TableCell>
                                    <TableCell>{c.customer_name}</TableCell>
                                    <TableCell>
                                        <Chip label={c.customer_type} size="small"
                                            color={getTypeColor(c.customer_type)} variant="outlined" />
                                    </TableCell>
                                    <TableCell>{c.contact_person}</TableCell>
                                    <TableCell>{c.phone}</TableCell>
                                    <TableCell>{c.city}</TableCell>
                                    <TableCell>{c.gstin || '—'}</TableCell>
                                    <TableCell>{c.credit_days} days</TableCell>
                                    <TableCell>
                                        <IconButton size="small" onClick={() => handleOpenEditDialog(c)} sx={{ color: 'primary.main' }}>
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
                    {editingId ? 'Edit Customer' : 'Add New Customer'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                        <TextField
                            label="Customer Code"
                            value={editingId ? formData.customer_code : 'Auto-generated'}
                            disabled
                            helperText={editingId ? 'Read only — assigned on creation' : 'Auto-assigned when saved'}
                            sx={{ '& .MuiInputBase-input.Mui-disabled': {
                                WebkitTextFillColor: editingId ? '#1a1a1a' : '#888',
                                fontStyle: editingId ? 'normal' : 'italic',
                            }}}
                        />
                        <TextField label="Customer Name *" value={formData.customer_name}
                            onChange={(e) => handleChange('customer_name', e.target.value)} />
                        <FormControl>
                            <InputLabel>Customer Type</InputLabel>
                            <Select value={formData.customer_type} label="Customer Type"
                                onChange={(e) => handleChange('customer_type', e.target.value)}>
                                {CUSTOMER_TYPE_OPTIONS.map(opt => (
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
                        <TextField label="Credit Days" type="number" value={formData.credit_days}
                            onChange={(e) => handleChange('credit_days', e.target.value)} />
                        <TextField label="Credit Limit (₹)" type="number" value={formData.credit_limit}
                            onChange={(e) => handleChange('credit_limit', e.target.value)} />
                        <TextField label="Address" value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            multiline rows={2} sx={{ gridColumn: 'span 2' }} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>
                        {editingId ? 'Update Customer' : 'Save Customer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default CustomerListPage;
