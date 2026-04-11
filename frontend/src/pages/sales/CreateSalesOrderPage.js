// ============================================================
// FILE: pages/sales/CreateSalesOrderPage.js
// PURPOSE: Form to create a new Sales Order.
//          Supports ?from=<id> to duplicate an existing SO.
// ============================================================

import { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Paper, MenuItem,
    Select, InputLabel, FormControl, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow,
    IconButton, Alert, Divider,
} from '@mui/material';
import AddIcon         from '@mui/icons-material/Add';
import DeleteIcon      from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useColumnResize } from '../../components/common/useColumnResize';
import { useNavigate, useSearchParams } from 'react-router-dom';

const EMPTY_LINE = { item_id: '', ordered_quantity: '', unit_price: '', notes: '' };
const TODAY = new Date().toISOString().split('T')[0];

function CreateSalesOrderPage() {
    const { widths, Resizer } = useColumnResize("createsalesorder", [100, 180, 150, 150, 150, 80]);
    const navigate            = useNavigate();
    const [searchParams]      = useSearchParams();
    const fromId              = searchParams.get('from');
    const isDuplicate         = Boolean(fromId);

    const [customerId,    setCustomerId]    = useState('');
    const [warehouseId,   setWarehouseId]   = useState('');
    const [orderDate,     setOrderDate]     = useState(TODAY);
    const [deliveryDate,  setDeliveryDate]  = useState('');
    const [notes,         setNotes]         = useState('');
    const [lines,         setLines]         = useState([{ ...EMPTY_LINE }]);
    const [sourceNum,     setSourceNum]     = useState('');

    const [customers,  setCustomers]  = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [items,      setItems]      = useState([]);
    const [message,    setMessage]    = useState('');
    const [messageType,setMessageType]= useState('success');

    useEffect(() => {
        Promise.all([
            fetch('/api/master-data/customers/',  { credentials: 'include' }).then(r => r.json()),
            fetch('/api/master-data/warehouses/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/master-data/items/',      { credentials: 'include' }).then(r => r.json()),
        ]).then(([custData, whData, itemData]) => {
            setCustomers(custData.customers   || []);
            setWarehouses(whData.warehouses   || []);
            setItems(itemData.items           || []);
        });
        if (fromId) fetchAndDuplicate(fromId);
    }, [fromId]); // eslint-disable-line

    const fetchAndDuplicate = async (sourceId) => {
        const res  = await fetch(`/api/sales/orders/${sourceId}/`, { credentials: 'include' });
        const data = await res.json();
        const so   = data.sales_order;
        if (!so) return;
        setSourceNum(so.so_number || '');
        setCustomerId(so.customer_id   || '');
        setWarehouseId(so.warehouse_id || '');
        setOrderDate(TODAY);
        setDeliveryDate('');          // clear — new delivery date needed
        setNotes(so.notes || '');
        setLines(
            (so.lines || []).map(l => ({
                item_id:          l.item_id,
                ordered_quantity: l.ordered_quantity,
                unit_price:       l.unit_price,
                notes:            l.notes || '',
            }))
        );
    };

    const addLine    = () => setLines(prev => [...prev, { ...EMPTY_LINE }]);
    const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i));
    const updateLine = (i, field, value) =>
        setLines(prev => prev.map((line, idx) => idx === i ? { ...line, [field]: value } : line));

    const totalAmount = lines.reduce((sum, l) =>
        sum + (parseFloat(l.ordered_quantity || 0) * parseFloat(l.unit_price || 0)), 0);

    const handleSave = async () => {
        if (!customerId || !warehouseId || !orderDate) {
            setMessage('Please fill in Customer, Warehouse and Order Date.');
            setMessageType('error'); return;
        }
        if (lines.some(l => !l.item_id || !l.ordered_quantity)) {
            setMessage('Please fill in Item and Quantity for all lines.');
            setMessageType('error'); return;
        }
        const res = await fetch('/api/sales/orders/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                customer_id:   customerId,
                warehouse_id:  warehouseId,
                order_date:    orderDate,
                delivery_date: deliveryDate || null,
                notes,
                lines: lines.map(l => ({
                    item_id:          l.item_id,
                    ordered_quantity: l.ordered_quantity,
                    unit_price:       l.unit_price || 0,
                    notes:            l.notes,
                })),
            }),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('Sales order created successfully!');
            setMessageType('success');
            setTimeout(() => navigate('/sales/sales-orders'), 1500);
        } else {
            setMessage(data.message || 'Error creating sales order.');
            setMessageType('error');
        }
    };

    const thCell = (label, idx) => (
        <TableCell sx={{ color:'white', fontWeight:'bold', overflow:'hidden', whiteSpace:'nowrap', p:0 }} style={{ width: widths[idx] }}>
            <div style={{ position:'relative', padding:'6px 16px', height:'100%', display:'flex', alignItems:'center' }}>
                {label}<Resizer index={idx} />
            </div>
        </TableCell>
    );

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>
                {isDuplicate ? 'Duplicate Sales Order' : 'Create Sales Order'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={isDuplicate ? 1 : 3}>
                {isDuplicate ? `Duplicated from ${sourceNum || '…'} — adjust details and save as a new order.` : 'Create a new sales order for a customer'}
            </Typography>

            {isDuplicate && sourceNum && (
                <Alert icon={<ContentCopyIcon fontSize="small" />} severity="info" sx={{ mb: 2 }}>
                    Duplicated from <strong>{sourceNum}</strong> — all items and prices are pre-filled. Set the new order date and delivery date before saving.
                </Alert>
            )}

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" mb={2}>Order Details</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 3 }}>
                    <TextField
                        label="SO Number" value="Auto-generated" disabled
                        helperText="Auto-assigned on save (Format Panel)"
                        sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#888', fontStyle: 'italic' } }}
                    />
                    <FormControl>
                        <InputLabel>Customer *</InputLabel>
                        <Select value={customerId} label="Customer *" onChange={e => setCustomerId(e.target.value)}>
                            {customers.map(c => <MenuItem key={c.id} value={c.id}>{c.customer_name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl>
                        <InputLabel>Warehouse *</InputLabel>
                        <Select value={warehouseId} label="Warehouse *" onChange={e => setWarehouseId(e.target.value)}>
                            {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField label="Order Date *" type="date" value={orderDate}
                        onChange={e => setOrderDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField label="Expected Delivery Date" type="date" value={deliveryDate}
                        onChange={e => setDeliveryDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
                </Box>

                <Divider sx={{ mb: 3 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary">Items to Sell</Typography>
                    <Button startIcon={<AddIcon />} onClick={addLine} variant="outlined" size="small">Add Item</Button>
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: 'primary.main' }}>
                            <TableRow>
                                {thCell('#', 0)}{thCell('Item *', 1)}{thCell('Quantity *', 2)}
                                {thCell('Unit Price (₹)', 3)}{thCell('Total (₹)', 4)}{thCell('Notes', 5)}
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.map((line, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell sx={{ minWidth: 200 }}>
                                        <FormControl fullWidth size="small">
                                            <Select value={line.item_id}
                                                onChange={e => updateLine(idx, 'item_id', e.target.value)} displayEmpty>
                                                <MenuItem value="">-- Select Item --</MenuItem>
                                                {items.map(i => <MenuItem key={i.id} value={i.id}>{i.item_code} — {i.item_name}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    </TableCell>
                                    <TableCell sx={{ width: 120 }}>
                                        <TextField size="small" type="number" value={line.ordered_quantity}
                                            onChange={e => updateLine(idx, 'ordered_quantity', e.target.value)} />
                                    </TableCell>
                                    <TableCell sx={{ width: 120 }}>
                                        <TextField size="small" type="number" value={line.unit_price}
                                            onChange={e => updateLine(idx, 'unit_price', e.target.value)} />
                                    </TableCell>
                                    <TableCell sx={{ width: 120 }}>
                                        <strong>{(parseFloat(line.ordered_quantity || 0) * parseFloat(line.unit_price || 0)).toFixed(2)}</strong>
                                    </TableCell>
                                    <TableCell>
                                        <TextField size="small" value={line.notes}
                                            onChange={e => updateLine(idx, 'notes', e.target.value)} />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton size="small" color="error" onClick={() => removeLine(idx)}
                                            disabled={lines.length === 1}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, mb: 3 }}>
                    <Typography variant="h6" fontWeight="bold" color="primary">
                        Total Amount: ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button variant="outlined" onClick={() => navigate('/sales/sales-orders')}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>
                        Save Sales Order
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

export default CreateSalesOrderPage;
