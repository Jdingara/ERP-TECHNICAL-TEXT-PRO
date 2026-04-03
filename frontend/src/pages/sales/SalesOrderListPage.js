// ============================================================
// FILE: pages/sales/SalesOrderListPage.js
// PURPOSE: Shows all sales orders with status.
//          User can confirm, deliver or create new orders.
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
    delivered:  'success',
    cancelled:  'error',
};

function SalesOrderListPage() {
    const [orders, setOrders]   = useState([]);
    const [message, setMessage] = useState('');
    const [msgType, setMsgType] = useState('success');
    const navigate = useNavigate();

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        const res = await fetch('http://127.0.0.1:8000/api/sales/orders/', { credentials: 'include' });
        const data = await res.json();
        setOrders(data.sales_orders || []);
    };

    const handleConfirm = async (soId) => {
        const res = await fetch(`http://127.0.0.1:8000/api/sales/orders/${soId}/`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ status: 'confirmed' }),
        });
        if (res.ok) { setMessage('Sales order confirmed.'); setMsgType('success'); fetchOrders(); }
    };

    const handleDeliver = async (soId) => {
        const res = await fetch(`http://127.0.0.1:8000/api/sales/orders/${soId}/deliver/`, {
            method: 'POST', credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) { setMessage('Delivery confirmed. Stock reduced.'); setMsgType('success'); fetchOrders(); }
        else { setMessage(data.message); setMsgType('error'); }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="#1a237e" mb={1}>Sales Orders</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Manage all customer sales orders
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => navigate('/sales/create-sales-order')}
                    sx={{ backgroundColor: '#1a237e' }}>
                    Create Sales Order
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#1a237e' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>SO Number</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Customer</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Warehouse</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Order Date</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Delivery Date</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Total Amount</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No sales orders yet. Click "Create Sales Order" to start.
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map((so) => (
                                <TableRow key={so.id} hover>
                                    <TableCell><strong>{so.so_number}</strong></TableCell>
                                    <TableCell>{so.customer_name}</TableCell>
                                    <TableCell>{so.warehouse_name}</TableCell>
                                    <TableCell>{so.order_date}</TableCell>
                                    <TableCell>{so.delivery_date || '—'}</TableCell>
                                    <TableCell>₹ {parseFloat(so.total_amount).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Chip label={so.status} color={STATUS_COLORS[so.status]} size="small" />
                                    </TableCell>
                                    <TableCell sx={{ display: 'flex', gap: 1 }}>
                                        {so.status === 'draft' && (
                                            <Button size="small" variant="outlined"
                                                onClick={() => handleConfirm(so.id)}>
                                                Confirm
                                            </Button>
                                        )}
                                        {so.status === 'confirmed' && (
                                            <Button size="small" variant="contained" color="success"
                                                onClick={() => handleDeliver(so.id)}>
                                                Deliver
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

export default SalesOrderListPage;
