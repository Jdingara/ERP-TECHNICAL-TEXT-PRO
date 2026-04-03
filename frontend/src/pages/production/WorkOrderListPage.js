// ============================================================
// FILE: pages/production/WorkOrderListPage.js
// PURPOSE: Work Orders — production instructions.
//          Shows all work orders with their status.
//          Allows completing a work order which:
//            - Deducts raw materials from stock
//            - Adds finished goods to stock
//            - Creates a batch record for traceability
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Alert, IconButton
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

// Status chip colors
const STATUS_COLOR = {
    draft:        'default',
    confirmed:    'primary',
    in_progress:  'warning',
    completed:    'success',
    cancelled:    'error',
};

function WorkOrderListPage() {
    const navigate = useNavigate();

    const [workOrders, setWorkOrders]   = useState([]);
    const [message, setMessage]         = useState('');
    const [messageType, setMessageType] = useState('success');

    // Complete work order dialog
    const [completeDialog, setCompleteDialog] = useState(false);
    const [selectedWo, setSelectedWo]         = useState(null);
    const [actualQty, setActualQty]           = useState('');

    // View work order dialog
    const [viewDialog, setViewDialog]   = useState(false);
    const [viewWo, setViewWo]           = useState(null);

    useEffect(() => { fetchWorkOrders(); }, []);

    const fetchWorkOrders = async () => {
        const res  = await fetch('http://127.0.0.1:8000/api/production/work-orders/', { credentials: 'include' });
        const data = await res.json();
        setWorkOrders(data.work_orders || []);
    };

    const handleViewWo = async (woId) => {
        const res  = await fetch(`http://127.0.0.1:8000/api/production/work-orders/`, { credentials: 'include' });
        // We have full data in the list already — just find from state
        const wo = workOrders.find(w => w.id === woId);
        setViewWo(wo);
        setViewDialog(true);
    };

    const openCompleteDialog = (wo) => {
        setSelectedWo(wo);
        setActualQty(wo.planned_quantity);
        setCompleteDialog(true);
    };

    const handleComplete = async () => {
        const res = await fetch(
            `http://127.0.0.1:8000/api/production/work-orders/${selectedWo.id}/complete/`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ actual_quantity: actualQty }),
            }
        );
        const data = await res.json();
        if (res.ok) {
            setMessage(`Work order completed! Batch: ${data.batch_number}. Stock updated.`);
            setMessageType('success');
            setCompleteDialog(false);
            fetchWorkOrders();
        } else {
            setMessage(data.message || 'Error completing work order.');
            setMessageType('error');
        }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="#1a237e" mb={1}>Work Orders</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Production instructions — tracks what to make, how much, and actual output
            </Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/production/create-work-order')}
                    sx={{ backgroundColor: '#1a237e' }}>
                    Create Work Order
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#1a237e' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>WO Number</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>BOM / Product</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Planned Qty</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actual Qty</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Start Date</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {workOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No work orders yet. Click "Create Work Order" to start production.
                                </TableCell>
                            </TableRow>
                        ) : workOrders.map((wo) => (
                            <TableRow key={wo.id} hover>
                                <TableCell><strong>{wo.work_order_number}</strong></TableCell>
                                <TableCell>
                                    <Typography variant="body2">{wo.bom_name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {wo.finished_product_code} — {wo.finished_product}
                                    </Typography>
                                </TableCell>
                                <TableCell>{wo.planned_quantity}</TableCell>
                                <TableCell>{wo.actual_quantity > 0 ? wo.actual_quantity : '—'}</TableCell>
                                <TableCell>{wo.planned_start_date}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={wo.status.replace('_', ' ').toUpperCase()}
                                        size="small"
                                        color={STATUS_COLOR[wo.status] || 'default'}
                                    />
                                </TableCell>
                                <TableCell>
                                    <IconButton size="small" sx={{ color: '#1a237e' }} onClick={() => handleViewWo(wo.id)} title="View">
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                    {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                                        <IconButton
                                            size="small"
                                            sx={{ color: '#2e7d32', ml: 1 }}
                                            onClick={() => openCompleteDialog(wo)}
                                            title="Complete Work Order">
                                            <CheckCircleIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Complete Work Order Dialog */}
            <Dialog open={completeDialog} onClose={() => setCompleteDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: '#2e7d32', color: 'white' }}>
                    Complete Work Order
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {selectedWo && (
                        <Box>
                            <Typography variant="body1" mb={2}>
                                <strong>Work Order:</strong> {selectedWo.work_order_number}<br />
                                <strong>Product:</strong> {selectedWo.finished_product}<br />
                                <strong>Planned Quantity:</strong> {selectedWo.planned_quantity}<br />
                                <strong>Warehouse:</strong> {selectedWo.warehouse}
                            </Typography>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Completing this work order will:
                                <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                                    <li>Deduct raw materials from stock</li>
                                    <li>Add finished goods to stock</li>
                                    <li>Create a batch record for traceability</li>
                                </ul>
                            </Alert>
                            <TextField
                                fullWidth
                                label="Actual Quantity Produced"
                                type="number"
                                value={actualQty}
                                onChange={(e) => setActualQty(e.target.value)}
                                helperText="Enter actual quantity produced (can differ from planned)"
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCompleteDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleComplete}
                        sx={{ backgroundColor: '#2e7d32' }}>
                        Complete & Update Stock
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Work Order Dialog */}
            {viewWo && (
                <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ backgroundColor: '#1a237e', color: 'white' }}>
                        {viewWo.work_order_number}
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        <Typography variant="body1" mb={1}>
                            <strong>BOM:</strong> {viewWo.bom_name}<br />
                            <strong>Product:</strong> {viewWo.finished_product_code} — {viewWo.finished_product}<br />
                            <strong>Warehouse:</strong> {viewWo.warehouse}<br />
                            <strong>Planned Qty:</strong> {viewWo.planned_quantity}<br />
                            <strong>Actual Qty:</strong> {viewWo.actual_quantity}<br />
                            <strong>Start Date:</strong> {viewWo.planned_start_date}<br />
                            {viewWo.planned_end_date && <><strong>End Date:</strong> {viewWo.planned_end_date}<br /></>}
                            <strong>Status:</strong> {viewWo.status}<br />
                            {viewWo.notes && <><strong>Notes:</strong> {viewWo.notes}</>}
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setViewDialog(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
}

export default WorkOrderListPage;
