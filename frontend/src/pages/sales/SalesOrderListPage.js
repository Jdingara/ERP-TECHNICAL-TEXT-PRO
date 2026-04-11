// ============================================================
// FILE: pages/sales/SalesOrderListPage.js
// PURPOSE: Shows all sales orders with status.
//          User can confirm, deliver, print or delete orders.
// ============================================================

import { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, Alert,
    IconButton, Tooltip, Stack, Checkbox,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon          from '@mui/icons-material/Add';
import PrintIcon        from '@mui/icons-material/Print';
import DeleteIcon       from '@mui/icons-material/Delete';
import ShareIcon        from '@mui/icons-material/Share';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useColumnResize } from '../../components/common/useColumnResize';
import { useNavigate } from 'react-router-dom';
import { printSalesOrder, printDeliveryChallan } from '../../utils/printUtils';
import ShareWidget     from '../../components/common/ShareWidget';
import BulkShareDialog from '../../components/common/BulkShareDialog';

const STATUS_COLORS = {
    draft:      'default',
    confirmed:  'primary',
    partial:    'warning',
    delivered:  'success',
    cancelled:  'error',
};

const canDelete = (so) => so.status === 'draft';

function SalesOrderListPage() {
    const theme = useTheme();
    const { widths, Resizer } = useColumnResize("salesorder_list", [40, 100, 180, 150, 150, 150, 150, 80, 120]);
    const [orders,   setOrders]   = useState([]);
    const [message,  setMessage]  = useState('');
    const [msgType,  setMsgType]  = useState('success');
    const [selected, setSelected] = useState(new Set());
    const [bulkOpen, setBulkOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        const res  = await fetch('/api/sales/orders/', { credentials: 'include' });
        const data = await res.json();
        setOrders(data.sales_orders || []);
        setSelected(new Set());
    };

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

    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === orders.length) setSelected(new Set());
        else setSelected(new Set(orders.map(o => o.id)));
    };

    const bulkRows = orders
        .filter(so => selected.has(so.id))
        .map(so => ({
            id:    so.id,
            title: `Sales Order ${so.so_number}`,
            email: so.customer_email || '',
            phone: so.customer_phone || '',
            vars:  {
                customer_name:   so.customer_name,
                document_number: so.so_number,
                amount:          `₹${parseFloat(so.total_amount).toLocaleString('en-IN')}`,
                date:            so.order_date,
            },
        }));

    const cbSx = { color: 'primary.contrastText', '&.Mui-checked': { color: 'primary.contrastText' }, '&.MuiCheckbox-indeterminate': { color: 'primary.contrastText' } };
    const thSx = () => ({ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', position: 'relative', userSelect: 'none', px: 2, py: 1 });

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Sales Orders</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Manage all customer sales orders
            </Typography>

            {message && <Alert severity={msgType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
                {selected.size > 0 && (
                    <Button
                        variant="outlined"
                        startIcon={<ShareIcon />}
                        onClick={() => setBulkOpen(true)}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                        Share Selected ({selected.size})
                    </Button>
                )}
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => navigate('/sales/create-sales-order')}
                    sx={{ backgroundColor: 'primary.main' }}>
                    Create Sales Order
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: 'fixed' }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell padding="checkbox" style={{ width: widths[0], backgroundColor: theme.palette.primary.main }}>
                                <Checkbox
                                    size="small"
                                    indeterminate={selected.size > 0 && selected.size < orders.length}
                                    checked={orders.length > 0 && selected.size === orders.length}
                                    onChange={toggleAll}
                                    sx={cbSx}
                                />
                            </TableCell>
                            <TableCell sx={thSx(1)} style={{ width: widths[1], backgroundColor: theme.palette.primary.main }}>SO Number<Resizer index={1} /></TableCell>
                            <TableCell sx={thSx(2)} style={{ width: widths[2], backgroundColor: theme.palette.primary.main }}>Customer<Resizer index={2} /></TableCell>
                            <TableCell sx={thSx(3)} style={{ width: widths[3], backgroundColor: theme.palette.primary.main }}>Warehouse<Resizer index={3} /></TableCell>
                            <TableCell sx={thSx(4)} style={{ width: widths[4], backgroundColor: theme.palette.primary.main }}>Order Date<Resizer index={4} /></TableCell>
                            <TableCell sx={thSx(5)} style={{ width: widths[5], backgroundColor: theme.palette.primary.main }}>Delivery Date<Resizer index={5} /></TableCell>
                            <TableCell sx={thSx(6)} style={{ width: widths[6], backgroundColor: theme.palette.primary.main }}>Total Amount<Resizer index={6} /></TableCell>
                            <TableCell sx={thSx(7)} style={{ width: widths[7], backgroundColor: theme.palette.primary.main }}>Status<Resizer index={7} /></TableCell>
                            <TableCell sx={thSx(8)} style={{ width: widths[8], backgroundColor: theme.palette.primary.main }}>Actions<Resizer index={8} /></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No sales orders yet. Click "Create Sales Order" to start.
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map((so) => (
                                <TableRow key={so.id} hover selected={selected.has(so.id)}>
                                    <TableCell padding="checkbox">
                                        <Checkbox size="small" checked={selected.has(so.id)} onChange={() => toggleSelect(so.id)} />
                                    </TableCell>
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
                                            <ShareWidget
                                                title={`Sales Order ${so.so_number}`}
                                                docType="sales_order"
                                                vars={{
                                                    customer_name:   so.customer_name,
                                                    document_number: so.so_number,
                                                    amount:          `₹${parseFloat(so.total_amount).toLocaleString('en-IN')}`,
                                                    date:            so.order_date,
                                                }}
                                                email={so.customer_email || ''}
                                                phone={so.customer_phone || ''}
                                            />
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

            <BulkShareDialog
                open={bulkOpen}
                onClose={() => setBulkOpen(false)}
                docType="sales_order"
                rows={bulkRows}
            />
        </Box>
    );
}

export default SalesOrderListPage;
