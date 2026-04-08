// ============================================================
// FILE: pages/production/WorkOrderListPage.js
// PURPOSE: Work Orders — production instructions.
//          Shows all work orders with their status.
//          Allows completing a work order which:
//            - Deducts raw materials from stock
//            - Adds finished goods to stock
//            - Creates a batch record for traceability
// ============================================================

import { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Alert, IconButton, Tooltip, Stack,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon      from '@mui/icons-material/Delete';
import PrintIcon       from '@mui/icons-material/Print';
import AddIcon         from '@mui/icons-material/Add';
import { useColumnResize } from '../../components/common/useColumnResize';
import { useNavigate } from 'react-router-dom';
import { printWorkOrder } from '../../utils/printUtils';

const STATUS_COLOR = {
    draft:        'default',
    confirmed:    'primary',
    in_progress:  'warning',
    completed:    'success',
    cancelled:    'error',
};

// Draft and confirmed can be deleted; in_progress/completed/cancelled cannot
const canDelete = (wo) => ['draft', 'confirmed'].includes(wo.status);

function WorkOrderListPage() {
    const theme = useTheme();
    const { widths, Resizer } = useColumnResize("workorder_list", [100, 180, 150, 150, 150, 150, 80]);
    const navigate = useNavigate();

    const [workOrders,   setWorkOrders]   = useState([]);
    const [message,      setMessage]      = useState('');
    const [messageType,  setMessageType]  = useState('success');

    const [completeDialog, setCompleteDialog] = useState(false);
    const [selectedWo,     setSelectedWo]     = useState(null);
    const [actualQty,      setActualQty]      = useState('');

    useEffect(() => { fetchWorkOrders(); }, []);

    const fetchWorkOrders = async () => {
        const res  = await fetch('/api/production/work-orders/', { credentials: 'include' });
        const data = await res.json();
        setWorkOrders(data.work_orders || []);
    };

    const openCompleteDialog = (wo) => {
        setSelectedWo(wo);
        setActualQty(wo.planned_quantity);
        setCompleteDialog(true);
    };

    const handleComplete = async () => {
        const res = await fetch(
            `/api/production/work-orders/${selectedWo.id}/complete/`,
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

    const handleDelete = async (wo) => {
        if (!canDelete(wo)) return;
        if (!window.confirm(`Delete work order ${wo.work_order_number}?`)) return;
        const res  = await fetch(`/api/production/work-orders/${wo.id}/`, {
            method: 'DELETE', credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('Work order deleted.'); setMessageType('success'); fetchWorkOrders();
        } else {
            setMessage(data.message || 'Delete failed.'); setMessageType('error');
        }
    };

    const handlePrint = async (wo) => {
        // Fetch detail to get BOM lines if available
        const res  = await fetch(`/api/production/work-orders/${wo.id}/`, { credentials: 'include' });
        const data = await res.json();
        printWorkOrder(data.work_order || wo);
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Work Orders</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Production instructions — tracks what to make, how much, and actual output
            </Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/production/create-work-order')}
                    sx={{ backgroundColor: 'primary.main' }}>
                    Create Work Order
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[0], backgroundColor: theme.palette.primary.main }}>WO Number<Resizer index={0} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[1], backgroundColor: theme.palette.primary.main }}>BOM / Product<Resizer index={1} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[2], backgroundColor: theme.palette.primary.main }}>Planned Qty<Resizer index={2} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[3], backgroundColor: theme.palette.primary.main }}>Actual Qty<Resizer index={3} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[4], backgroundColor: theme.palette.primary.main }}>Start Date<Resizer index={4} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[5], backgroundColor: theme.palette.primary.main }}>Status<Resizer index={5} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[6], backgroundColor: theme.palette.primary.main }}>Actions<Resizer index={6} /></TableCell>
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
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                                            <Tooltip title="Complete Work Order">
                                                <IconButton
                                                    size="small"
                                                    sx={{ color: '#2e7d32' }}
                                                    onClick={() => openCompleteDialog(wo)}>
                                                    <CheckCircleIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Print Work Order">
                                            <IconButton size="small" onClick={() => handlePrint(wo)}>
                                                <PrintIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        {canDelete(wo) && (
                                            <Tooltip title="Delete">
                                                <IconButton size="small" color="error" onClick={() => handleDelete(wo)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
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
        </Box>
    );
}

export default WorkOrderListPage;
