// ============================================================
// FILE: pages/master_data/ItemListPage.js
// PURPOSE: Shows list of all items/products in the ERP.
//          User can search, add new item, edit, or deactivate.
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

// Item type options for dropdown
const ITEM_TYPE_OPTIONS = [
    { value: 'raw_material',   label: 'Raw Material' },
    { value: 'finished_goods', label: 'Finished Goods' },
    { value: 'semi_finished',  label: 'Semi Finished' },
    { value: 'spare_parts',    label: 'Spare Parts' },
    { value: 'consumable',     label: 'Consumable' },
    { value: 'packing',        label: 'Packing Material' },
];

// Empty form state
const EMPTY_FORM = {
    item_code: '', item_name: '', item_type: 'raw_material',
    category_id: '', unit_id: '', description: '',
    hsn_code: '', yarn_count: '', composition: '',
    minimum_stock: 0, standard_price: 0,
};

function ItemListPage() {
    const { widths, Resizer } = useColumnResize('items_list', [110, 200, 130, 150, 80, 110, 100, 70]);
    const [items, setItems]           = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits]           = useState([]);
    const [searchText, setSearchText] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData]     = useState(EMPTY_FORM);
    const [editingId, setEditingId]   = useState(null);
    const [message, setMessage]       = useState('');
    const [messageType, setMessageType] = useState('success');

    // Load items, categories, units when page opens
    useEffect(() => {
        fetchItems();
        fetchCategories();
        fetchUnits();
    }, []);

    const fetchItems = async (search = '') => {
        const res = await fetch(`/api/master-data/items/?search=${search}`, { credentials: 'include' });
        const data = await res.json();
        setItems(data.items || []);
    };

    const fetchCategories = async () => {
        const res = await fetch('/api/master-data/categories/', { credentials: 'include' });
        const data = await res.json();
        setCategories(data.categories || []);
    };

    const fetchUnits = async () => {
        const res = await fetch('/api/master-data/units/', { credentials: 'include' });
        const data = await res.json();
        setUnits(data.units || []);
    };

    const handleSearch = (e) => {
        setSearchText(e.target.value);
        fetchItems(e.target.value);
    };

    const handleOpenAddDialog = () => {
        setFormData(EMPTY_FORM);
        setEditingId(null);
        setDialogOpen(true);
    };

    const handleOpenEditDialog = (item) => {
        setFormData({
            item_code: item.item_code, item_name: item.item_name,
            item_type: item.item_type, category_id: item.category_id || '',
            unit_id: item.unit_id || '', description: item.description,
            hsn_code: item.hsn_code, yarn_count: item.yarn_count,
            composition: item.composition, minimum_stock: item.minimum_stock,
            standard_price: item.standard_price,
        });
        setEditingId(item.id);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        const url = editingId
            ? `/api/master-data/items/${editingId}/`
            : '/api/master-data/items/';
        const method = editingId ? 'PUT' : 'POST';

        // Convert empty strings to null for ID fields (database requires null not "")
        const cleanedData = {
            ...formData,
            category_id: formData.category_id || null,
            unit_id:     formData.unit_id || null,
        };

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(cleanedData),
        });
        const data = await res.json();

        if (res.ok) {
            setMessage(editingId ? 'Item updated successfully.' : 'Item created successfully.');
            setMessageType('success');
            setDialogOpen(false);
            fetchItems(searchText);
        } else {
            setMessage(data.message || 'Error saving item.');
            setMessageType('error');
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Box>
            {/* Page Title */}
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>
                Items / Products
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Manage all raw materials, finished goods, spare parts
            </Typography>

            {/* Success/Error message */}
            {message && (
                <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>
                    {message}
                </Alert>
            )}

            {/* Search and Add button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <TextField
                    placeholder="Search by item name or code..."
                    value={searchText}
                    onChange={handleSearch}
                    size="small"
                    sx={{ width: 350 }}
                />
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={handleOpenAddDialog}
                    sx={{ backgroundColor: 'primary.main' }}>
                    Add Item
                </Button>
            </Box>

            {/* Items Table */}
            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: 'fixed' }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            {['Item Code','Item Name','Type','Category','Unit','Yarn Count','Min Stock','Actions'].map((label, i) => (
                                <TableCell key={label} sx={{ color: 'white', fontWeight: 'bold', position: 'relative', overflow: 'hidden', whiteSpace: 'nowrap' }} style={{ width: widths[i] }}>
                                    {label}<Resizer index={i} />
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No items found. Click "Add Item" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id} hover>
                                    <TableCell><strong>{item.item_code}</strong></TableCell>
                                    <TableCell>{item.item_name}</TableCell>
                                    <TableCell>
                                        <Chip label={item.item_type.replace('_', ' ')} size="small"
                                            color="primary" variant="outlined" />
                                    </TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell>{item.unit_of_measure}</TableCell>
                                    <TableCell>{item.yarn_count || '—'}</TableCell>
                                    <TableCell>{item.minimum_stock}</TableCell>
                                    <TableCell>
                                        <IconButton size="small" onClick={() => handleOpenEditDialog(item)}
                                            sx={{ color: 'primary.main' }}>
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
                    {editingId ? 'Edit Item' : 'Add New Item'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                        <TextField
                            label="Item Code"
                            value={editingId ? formData.item_code : 'Auto-generated'}
                            disabled
                            helperText={editingId ? 'Read only — assigned on creation' : 'Auto-assigned when saved'}
                            sx={{ '& .MuiInputBase-input.Mui-disabled': {
                                WebkitTextFillColor: editingId ? '#1a1a1a' : '#888',
                                fontStyle: editingId ? 'normal' : 'italic',
                            }}}
                        />
                        <TextField label="Item Name *" value={formData.item_name}
                            onChange={(e) => handleChange('item_name', e.target.value)} />

                        <FormControl>
                            <InputLabel>Item Type *</InputLabel>
                            <Select value={formData.item_type} label="Item Type *"
                                onChange={(e) => handleChange('item_type', e.target.value)}>
                                {ITEM_TYPE_OPTIONS.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl>
                            <InputLabel>Category</InputLabel>
                            <Select value={formData.category_id} label="Category"
                                onChange={(e) => handleChange('category_id', e.target.value)}>
                                <MenuItem value="">-- None --</MenuItem>
                                {categories.map(c => (
                                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl>
                            <InputLabel>Unit of Measure</InputLabel>
                            <Select value={formData.unit_id} label="Unit of Measure"
                                onChange={(e) => handleChange('unit_id', e.target.value)}>
                                <MenuItem value="">-- None --</MenuItem>
                                {units.map(u => (
                                    <MenuItem key={u.id} value={u.id}>{u.name} ({u.short_name})</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField label="HSN Code" value={formData.hsn_code}
                            onChange={(e) => handleChange('hsn_code', e.target.value)} />
                        <TextField label="Yarn Count (e.g. 30s Ne)" value={formData.yarn_count}
                            onChange={(e) => handleChange('yarn_count', e.target.value)} />
                        <TextField label="Composition (e.g. 100% Cotton)" value={formData.composition}
                            onChange={(e) => handleChange('composition', e.target.value)} />
                        <TextField label="Minimum Stock" type="number" value={formData.minimum_stock}
                            onChange={(e) => handleChange('minimum_stock', e.target.value)} />
                        <TextField label="Standard Price" type="number" value={formData.standard_price}
                            onChange={(e) => handleChange('standard_price', e.target.value)} />
                        <TextField label="Description" value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            multiline rows={2} sx={{ gridColumn: 'span 2' }} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}
                        sx={{ backgroundColor: 'primary.main' }}>
                        {editingId ? 'Update Item' : 'Save Item'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default ItemListPage;
