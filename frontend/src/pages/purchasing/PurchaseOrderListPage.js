// ============================================================
// FILE: pages/purchasing/PurchaseOrderListPage.js
// PURPOSE: Shows all purchase orders with status.
//          User can view details or create new PO.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS = {
    draft:      'default',
    confirmed:  'primary',
    partial:    'warning',
    received:   'success',
    cancelled:  'error',
};

function PurchaseOrderListPage() {
    const [orders, setOrders]   = useState([]);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        const res = await fetch('http://127.0.0.1:8000/api/purchasing/purchase-orders/', { credentials: 'include' });
        const data = await res.json();
        setOrders(data.purchase_orders || []);
    };

    const handleConfirm = async (poId) => {
        const res = await fetch(`http://127.0.0.1:8000/api/purchasing/purchase-orders/${poId}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: 'confirmed' }),
        });
        if (res.ok) { setMessage('PO confirmed.'); fetchOrders(); }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="#1a237e" mb={1}>Purchase Orders</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Manage all purchase orders to suppliers
            </Typography>

            {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => navigate('/purchasing/create-purchase-order')}
                    sx={{ backgroundColor: '#1a237e' }}>
                    Create Purchase Order
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#1a237e' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>PO Number</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Supplier</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Warehouse</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Order Date</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Expected Date</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Total Amount</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No purchase orders yet. Click "Create Purchase Order" to start.
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map((po) => (
                                <TableRow key={po.id} hover>
                                    <TableCell><strong>{po.po_number}</strong></TableCell>
                                    <TableCell>{po.supplier_name}</TableCell>
                                    <TableCell>{po.warehouse_name}</TableCell>
                                    <TableCell>{po.order_date}</TableCell>
                                    <TableCell>{po.expected_date || '—'}</TableCell>
                                    <TableCell>₹ {parseFloat(po.total_amount).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Chip label={po.status} color={STATUS_COLORS[po.status]} size="small" />
                                    </TableCell>
                                    <TableCell>
                                        {po.status === 'draft' && (
                                            <Button size="small" variant="outlined" color="primary"
                                                onClick={() => handleConfirm(po.id)}>
                                                Confirm
                                            </Button>
                                        )}
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

export default PurchaseOrderListPage;
