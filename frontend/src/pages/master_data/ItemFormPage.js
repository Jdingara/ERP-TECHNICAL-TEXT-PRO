// FILE: pages/master_data/ItemFormPage.js
// PURPOSE: Full-page form to add or edit an Item/Product.
//          Accessed via "Add Item" or edit icon on ItemListPage.

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Paper,
    MenuItem, Select, InputLabel, FormControl, Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useParams } from 'react-router-dom';

const ITEM_TYPE_OPTIONS = [
    { value: 'raw_material',   label: 'Raw Material' },
    { value: 'finished_goods', label: 'Finished Goods' },
    { value: 'semi_finished',  label: 'Semi Finished' },
    { value: 'spare_parts',    label: 'Spare Parts' },
    { value: 'consumable',     label: 'Consumable' },
    { value: 'packing',        label: 'Packing Material' },
];

const EMPTY_FORM = {
    item_code: '', item_name: '', item_type: 'raw_material',
    category_id: '', unit_id: '', description: '',
    hsn_code: '', yarn_count: '', composition: '',
    minimum_stock: 0, standard_price: 0,
};

function ItemFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [formData, setFormData]     = useState(EMPTY_FORM);
    const [categories, setCategories] = useState([]);
    const [units, setUnits]           = useState([]);
    const [saving, setSaving]         = useState(false);
    const [error, setError]           = useState('');

    useEffect(() => {
        fetchCategories();
        fetchUnits();
        if (isEdit) fetchItem();
    }, [id]); // eslint-disable-line

    const fetchItem = async () => {
        const res  = await fetch(`/api/master-data/items/${id}/`, { credentials: 'include' });
        const data = await res.json();
        if (data.item) setFormData(data.item);
    };
    const fetchCategories = async () => {
        const res  = await fetch('/api/master-data/categories/', { credentials: 'include' });
        const data = await res.json();
        setCategories(data.categories || []);
    };
    const fetchUnits = async () => {
        const res  = await fetch('/api/master-data/units/', { credentials: 'include' });
        const data = await res.json();
        setUnits(data.units || []);
    };

    const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const handleSave = async () => {
        setSaving(true); setError('');
        const url    = isEdit ? `/api/master-data/items/${id}/` : '/api/master-data/items/';
        const method = isEdit ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                ...formData,
                category_id: formData.category_id || null,
                unit_id:     formData.unit_id || null,
            }),
        });
        const data = await res.json();
        if (res.ok) navigate('/master-data/items');
        else { setError(data.message || 'Error saving item.'); setSaving(false); }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/master-data/items')} variant="outlined" size="small">
                    Back to Items
                </Button>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>
                    {isEdit ? 'Edit Item' : 'Add New Item'}
                </Typography>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}
                    sx={{ backgroundColor: 'primary.main' }}>
                    {saving ? 'Saving…' : (isEdit ? 'Update Item' : 'Save Item')}
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                        label="Item Code"
                        value={isEdit ? formData.item_code : 'Auto-generated'}
                        disabled
                        helperText={isEdit ? 'Read only — assigned on creation' : 'Auto-assigned when saved'}
                    />
                    <TextField label="Item Name *" value={formData.item_name}
                        onChange={e => set('item_name', e.target.value)} />

                    <FormControl>
                        <InputLabel>Item Type *</InputLabel>
                        <Select value={formData.item_type} label="Item Type *"
                            onChange={e => set('item_type', e.target.value)}>
                            {ITEM_TYPE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl>
                        <InputLabel>Category</InputLabel>
                        <Select value={formData.category_id} label="Category"
                            onChange={e => set('category_id', e.target.value)}>
                            <MenuItem value="">-- None --</MenuItem>
                            {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl>
                        <InputLabel>Unit of Measure</InputLabel>
                        <Select value={formData.unit_id} label="Unit of Measure"
                            onChange={e => set('unit_id', e.target.value)}>
                            <MenuItem value="">-- None --</MenuItem>
                            {units.map(u => <MenuItem key={u.id} value={u.id}>{u.name} ({u.short_name})</MenuItem>)}
                        </Select>
                    </FormControl>

                    <TextField label="HSN Code" value={formData.hsn_code}
                        onChange={e => set('hsn_code', e.target.value)} />
                    <TextField label="Yarn Count (e.g. 30s Ne)" value={formData.yarn_count}
                        onChange={e => set('yarn_count', e.target.value)} />
                    <TextField label="Composition (e.g. 100% Cotton)" value={formData.composition}
                        onChange={e => set('composition', e.target.value)} />
                    <TextField label="Minimum Stock" type="number" value={formData.minimum_stock}
                        onChange={e => set('minimum_stock', e.target.value)} />
                    <TextField label="Standard Price (₹)" type="number" value={formData.standard_price}
                        onChange={e => set('standard_price', e.target.value)} />
                    <TextField label="Description" value={formData.description}
                        onChange={e => set('description', e.target.value)}
                        multiline rows={3} sx={{ gridColumn: 'span 2' }} />
                </Box>
            </Paper>
        </Box>
    );
}

export default ItemFormPage;
