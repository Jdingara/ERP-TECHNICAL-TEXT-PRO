// ============================================================
// FILE: pages/master_data/ItemListPage.js
// PURPOSE: Shows list of all items/products in the ERP.
//          User can search, add new item, edit, or deactivate.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { useColumnResize } from '../../components/common/useColumnResize';

function ItemListPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { widths, Resizer } = useColumnResize('items_list', [110, 200, 130, 150, 80, 110, 100, 70]);
    const [items, setItems]       = useState([]);
    const [searchText, setSearchText] = useState('');

    // Load items when page opens
    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async (search = '') => {
        const res = await fetch(`/api/master-data/items/?search=${search}`, { credentials: 'include' });
        const data = await res.json();
        setItems(data.items || []);
    };

    const handleSearch = (e) => {
        setSearchText(e.target.value);
        fetchItems(e.target.value);
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
                    onClick={() => navigate('/master-data/items/add')}
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
                                <TableCell key={label} sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', position: 'relative', userSelect: 'none', px: 2, py: 1 }} style={{ width: widths[i], backgroundColor: theme.palette.primary.main }}>
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
                                        <IconButton size="small" onClick={() => navigate(`/master-data/items/edit/${item.id}`)}
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
        </Box>
    );
}

export default ItemListPage;
