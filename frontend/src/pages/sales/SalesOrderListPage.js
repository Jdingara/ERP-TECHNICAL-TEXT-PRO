// ============================================================
// FILE: pages/sales/SalesOrderListPage.js
// PURPOSE: Shows all sales orders with status.
//          User can confirm, deliver, print or delete orders.
// ============================================================

import { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, Alert,
    IconButton, Tooltip, Stack,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import PrintIcon      from '@mui/icons-material/Print';
import DeleteIcon     from '@mui/icons-material/Delete';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useColumnResize } from '../../components/common/useColumnResize';
import { useNavigate } from 'react-router-dom';
import { printSalesOrder, printDeliveryChallan } from '../../utils/printUtils';

const STATUS_COLORS = {
    draft:      'default',
    confirmed:  'primary',
    partial:    'warning',
    delivered:  'success',
    cancelled:  'error',
};

const canDelete = (so) => so.status === 'draft';

function SalesOrderListPage() {
    const { widths, Resizer } = useColumnResize("salesorder_list", [100, 180, 150, 150, 150, 150, 150, 80]);
    const [orders,  setOrders]  = useState([]);
    const [message, setMessage] = useState('');
    const [msgType, setMsgType] = useState('success');
    const navigate = useNavigate();

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        const res  = await fetch('/api/sales/orders/', { credentials: 'include' });
        const data = await res.json();
        setOrders(data.sales_orders || []);
    };

    // Fetch SO with lines for printing
    const fetchDetail = async (soId) => {
        const res  = await fetch(`/api/sales/orders/${soId}/`, { credentials: 'include' });
        const data = await res.json();
        return data.sales_order || null;
    };

    const handleConfirm = async (soId) => {
        const res = await fetch(`/api/sales/orders/${soId}/`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ status: 'confirmed' }),
        });
        if (res.ok) { setMessage('Sales order confirmed.'); setMsgType('success'); fetchOrders(); }
    };

    const handleDeliver = async (soId) => {
        const res  = await fetch(`/api/sales/orders/${soId}/deliver/`, {
            method: 'POST', credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) { setMessage('Delivery confirmed. Stock reduced.'); setMsgType('success'); fetchOrders(); }
        else { setMessage(data.message); setMsgType('error'); }
    };

    const handleDelete = async (so) => {
        if (!canDelete(so)) return;
        if (!window.confirm(`Delete sales order ${so.so_number}?`)) return;
        const res  = await fetch(`/api/sales/orders/${so.id}/`, {
            method: 'DELETE', credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) { setMessage('Sales order deleted.'); setMsgType('success'); fetchOrders(); }
        else { setMessage(data.message || 'Delete failed.'); setMsgType('error'); }
    };

    const handlePrintSO = async (so) => {
        const detail = await fetchDetail(so.id);
        if (detail) printSalesOrder(detail);
    };

    const handlePrintChallan = async (so) => {
        const detail = await fetchDetail(so.id);
        if (detail) printDeliveryChallan(detail);
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Sales Orders</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Manage all customer sales orders
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => navigate('/sales/create-sales-order')}
                    sx={{ backgroundColor: 'primary.main' }}>
                    Create Sales Order
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[0] }}>SO Number<Resizer index={0} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[1] }}>Customer<Resizer index={1} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[2] }}>Warehouse<Resizer index={2} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[3] }}>Order Date<Resizer index={3} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[4] }}>Delivery Date<Resizer index={4} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[5] }}>Total Amount<Resizer index={5} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[6] }}>Status<Resizer index={6} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[7] }}>Actions<Resizer index={7} /></TableCell>
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
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
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
                                            <Tooltip title="Print Sales Order">
                                                <IconButton size="small" onClick={() => handlePrintSO(so)}>
                                                    <PrintIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {so.status === 'delivered' && (
                                                <Tooltip title="Print Delivery Challan">
                                                    <IconButton size="small" color="primary" onClick={() => handlePrintChallan(so)}>
                                                        <LocalShippingIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {canDelete(so) && (
                                                <Tooltip title="Delete Draft">
                                                    <IconButton size="small" color="error" onClick={() => handleDelete(so)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>
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
