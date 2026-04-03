// ============================================================
// FILE: pages/inventory/StockListPage.js
// PURPOSE: Shows current stock levels for all items.
//          Low stock items are highlighted in red.
//          User can filter by warehouse or search by item.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, TextField, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, Alert,
    Button
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

function StockListPage() {
    const [stocks, setStocks]         = useState([]);
    const [searchText, setSearchText] = useState('');
    const [showLowOnly, setShowLowOnly] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { fetchStocks(); }, []);

    const fetchStocks = async (search = '', lowOnly = false) => {
        let url = `http://127.0.0.1:8000/api/inventory/stock/?search=${search}`;
        if (lowOnly) url += '&low_stock=1';
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        setStocks(data.stocks || []);
    };

    const handleSearch = (e) => {
        setSearchText(e.target.value);
        fetchStocks(e.target.value, showLowOnly);
    };

    const toggleLowStock = () => {
        const newVal = !showLowOnly;
        setShowLowOnly(newVal);
        fetchStocks(searchText, newVal);
    };

    const lowStockCount = stocks.filter(s => s.is_low_stock).length;

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="#1a237e" mb={1}>
                Stock List
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Current stock levels for all items across warehouses
            </Typography>

            {/* Low stock warning */}
            {lowStockCount > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}
                    icon={<WarningAmberIcon />}>
                    {lowStockCount} item(s) are below minimum stock level.
                </Alert>
            )}

            {/* Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2 }}>
                <TextField
                    placeholder="Search by item name or code..."
                    value={searchText}
                    onChange={handleSearch}
                    size="small"
                    sx={{ width: 350 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant={showLowOnly ? 'contained' : 'outlined'}
                        color="warning"
                        onClick={toggleLowStock}
                        size="small">
                        Low Stock Only
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />}
                        onClick={() => navigate('/inventory/stock-movement')}
                        sx={{ backgroundColor: '#1a237e' }}>
                        Add Stock Movement
                    </Button>
                </Box>
            </Box>

            {/* Stock Table */}
            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#1a237e' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Item Code</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Item Name</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Yarn Count</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Warehouse</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Unit</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Current Stock</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Min Stock</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {stocks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No stock records found. Add a stock movement to see stock here.
                                </TableCell>
                            </TableRow>
                        ) : (
                            stocks.map((s) => (
                                <TableRow key={s.id} hover
                                    sx={{ backgroundColor: s.is_low_stock ? '#fff3e0' : 'inherit' }}>
                                    <TableCell><strong>{s.item_code}</strong></TableCell>
                                    <TableCell>{s.item_name}</TableCell>
                                    <TableCell>
                                        <Chip label={s.item_type.replace('_', ' ')} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>{s.yarn_count || '—'}</TableCell>
                                    <TableCell>{s.warehouse}</TableCell>
                                    <TableCell>{s.unit}</TableCell>
                                    <TableCell>
                                        <Typography fontWeight="bold"
                                            color={s.is_low_stock ? 'error' : 'inherit'}>
                                            {s.quantity}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{s.minimum_stock}</TableCell>
                                    <TableCell>
                                        {s.is_low_stock
                                            ? <Chip label="Low Stock" color="error" size="small" icon={<WarningAmberIcon />} />
                                            : <Chip label="OK" color="success" size="small" />
                                        }
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

export default StockListPage;
