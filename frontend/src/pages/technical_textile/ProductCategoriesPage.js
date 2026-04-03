// ============================================================
// FILE: pages/technical_textile/ProductCategoriesPage.js
// PURPOSE: Manage Technical Textile product categories.
//          e.g. Geotextile, Agrotextile, Protective, Automotive
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, Alert, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const API = 'http://127.0.0.1:8000/api/technical-textile/categories/';
const EMPTY = { name: '', code: '', description: '', application: '' };

function ProductCategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [dialog, setDialog]         = useState(false);
    const [form, setForm]             = useState(EMPTY);
    const [editId, setEditId]         = useState(null);
    const [message, setMessage]       = useState('');
    const [msgType, setMsgType]       = useState('success');

    useEffect(() => { fetchCategories(); }, []);

    const fetchCategories = async () => {
        const res  = await fetch(API, { credentials: 'include' });
        const data = await res.json();
        setCategories(data.categories || []);
    };

    const openCreate = () => { setForm(EMPTY); setEditId(null); setDialog(true); };
    const openEdit   = (cat) => { setForm(cat); setEditId(cat.id); setDialog(true); };

    const handleSave = async () => {
        if (!form.name || !form.code) {
            setMessage('Name and Code are required.'); setMsgType('error'); return;
        }
        const url    = editId ? `${API.replace(/\/$/, '')}/${editId}/` : API;
        const method = editId ? 'PUT' : 'POST';
        const res    = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(editId ? 'Category updated.' : 'Category created.');
            setMsgType('success'); setDialog(false); fetchCategories();
        } else {
            setMessage(data.message || 'Error.'); setMsgType('error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this category?')) return;
        await fetch(`${API.replace(/\/$/, '')}/${id}/`, { method: 'DELETE', credentials: 'include' });
        fetchCategories();
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="#1a237e" mb={1}>Product Categories</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Technical textile categories — Geotextile, Agrotextile, Protective, Automotive, etc.
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ backgroundColor: '#1a237e' }}>
                    Add Category
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#1a237e' }}>
                        <TableRow>
                            {['Code', 'Category Name', 'Application Area', 'Description', 'Actions'].map(h => (
                                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {categories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No categories yet. Click "Add Category" to start.
                                </TableCell>
                            </TableRow>
                        ) : categories.map(cat => (
                            <TableRow key={cat.id} hover>
                                <TableCell><strong>{cat.code}</strong></TableCell>
                                <TableCell>{cat.name}</TableCell>
                                <TableCell>{cat.application}</TableCell>
                                <TableCell>{cat.description}</TableCell>
                                <TableCell>
                                    <IconButton size="small" sx={{ color: '#1a237e' }} onClick={() => openEdit(cat)}><EditIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => handleDelete(cat.id)}><DeleteIcon fontSize="small" /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: '#1a237e', color: 'white' }}>
                    {editId ? 'Edit Category' : 'Add Category'}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <TextField label="Category Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                            <TextField label="Code *" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} helperText="e.g. GEO, AGR, MED" />
                        </Box>
                        <TextField label="Application Area" value={form.application} onChange={e => setForm(p => ({ ...p, application: e.target.value }))} helperText="e.g. Road construction, Agriculture, Medical" />
                        <TextField label="Description" multiline rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: '#1a237e' }}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default ProductCategoriesPage;
