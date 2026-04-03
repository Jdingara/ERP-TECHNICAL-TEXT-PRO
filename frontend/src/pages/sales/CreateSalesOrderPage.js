// ============================================================
// FILE: pages/sales/CreateSalesOrderPage.js
// PURPOSE: Form to create a new Sales Order.
//          Select customer, warehouse, add multiple items.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, Paper, MenuItem,
    Select, InputLabel, FormControl, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow,
    IconButton, Alert, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';

const EMPTY_LINE = { item_id: '', ordered_quantity: '', unit_price: '', notes: '' };

function CreateSalesOrderPage() {
    const navigate = useNavigate();

    const [soNumber, setSoNumber]       = useState('');
    const [customerId, setCustomerId]   = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [orderDate, setOrderDate]     = useState(new Date().toISOString().split('T')[0]);
    const [deliveryDate, setDeliveryDate] = useState('');
    const [notes, setNotes]             = useState('');
    const [lines, setLines]             = useState([{ ...EMPTY_LINE }]);

    const [customers, setCustomers]     = useState([]);
    const [warehouses, setWarehouses]   = useState([]);
    const [items, setItems]             = useState([]);
    const [message, setMessage]         = useState('');
    const [messageType, setMessageType] = useState('success');

    useEffect(() => {
        fetchCustomers();
        fetchWarehouses();
        fetchItems();
        generateSoNumber();
    }, []);

    const generateSoNumber = () => {
        const date = new Date();
        const num = `SO-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*1000)).padStart(3,'0')}`;
        setSoNumber(num);
    };

    const fetchCustomers = async () => {
        const res = await fetch('http://127.0.0.1:8000/api/master-data/customers/', { credentials: 'include' });
        const data = await res.json();
        setCustomers(data.customers || []);
    };

    const fetchWarehouses = async () => {
        const res = await fetch('http://127.0.0.1:8000/api/master-data/warehouses/', { credentials: 'include' });
        const data = await res.json();
        setWarehouses(data.warehouses || []);
    };

    const fetchItems = async () => {
        const res = await fetch('http://127.0.0.1:8000/api/master-data/items/', { credentials: 'include' });
        const data = await res.json();
        setItems(data.items || []);
    };

    const addLine = () => setLines(prev => [...prev, { ...EMPTY_LINE }]);
    const removeLine = (index) => setLines(prev => prev.filter((_, i) => i !== index));
    const updateLine = (index, field, value) => {
        setLines(prev => prev.map((line, i) => i === index ? { ...line, [field]: value } : line));
    };

    const totalAmount = lines.reduce((sum, line) =>
        sum + (parseFloat(line.ordered_quantity || 0) * parseFloat(line.unit_price || 0)), 0);

    const handleSave = async () => {
        if (!customerId || !warehouseId || !orderDate) {
            setMessage('Please fill in Customer, Warehouse and Order Date.');
            setMessageType('error');
            return;
        }
        if (lines.some(l => !l.item_id || !l.ordered_quantity)) {
            setMessage('Please fill in Item and Quantity for all lines.');
            setMessageType('error');
            return;
        }

        const payload = {
            so_number:      soNumber,
            customer_id:    customerId,
            warehouse_id:   warehouseId,
            order_date:     orderDate,
            delivery_date:  deliveryDate || null,
            notes,
            lines: lines.map(l => ({
                item_id:            l.item_id,
                ordered_quantity:   l.ordered_quantity,
                unit_price:         l.unit_price || 0,
                notes:              l.notes,
            })),
        };

        const res = await fetch('http://127.0.0.1:8000/api/sales/orders/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
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

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="#1a237e" mb={1}>
                Create Sales Order
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Create a new sales order for a customer
            </Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="#1a237e" mb={2}>Order Details</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 3 }}>
                    <TextField label="SO Number" value={soNumber} onChange={(e) => setSoNumber(e.target.value)} />

                    <FormControl>
                        <InputLabel>Customer *</InputLabel>
                        <Select value={customerId} label="Customer *" onChange={(e) => setCustomerId(e.target.value)}>
                            {customers.map(c => <MenuItem key={c.id} value={c.id}>{c.customer_name}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl>
                        <InputLabel>Warehouse *</InputLabel>
                        <Select value={warehouseId} label="Warehouse *" onChange={(e) => setWarehouseId(e.target.value)}>
                            {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <TextField label="Order Date *" type="date" value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField label="Expected Delivery Date" type="date" value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Box>

                <Divider sx={{ mb: 3 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="#1a237e">Items to Sell</Typography>
                    <Button startIcon={<AddIcon />} onClick={addLine} variant="outlined" size="small">Add Item</Button>
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: '#e8eaf6' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Item *</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Quantity *</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Unit Price (₹)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Total (₹)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.map((line, index) => (
                                <TableRow key={index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell sx={{ minWidth: 200 }}>
                                        <FormControl fullWidth size="small">
                                            <Select value={line.item_id}
                                                onChange={(e) => updateLine(index, 'item_id', e.target.value)} displayEmpty>
                                                <MenuItem value="">-- Select Item --</MenuItem>
                                                {items.map(i => (
                                                    <MenuItem key={i.id} value={i.id}>{i.item_code} — {i.item_name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </TableCell>
                                    <TableCell sx={{ width: 120 }}>
                                        <TextField size="small" type="number" value={line.ordered_quantity}
                                            onChange={(e) => updateLine(index, 'ordered_quantity', e.target.value)} />
                                    </TableCell>
                                    <TableCell sx={{ width: 120 }}>
                                        <TextField size="small" type="number" value={line.unit_price}
                                            onChange={(e) => updateLine(index, 'unit_price', e.target.value)} />
                                    </TableCell>
                                    <TableCell sx={{ width: 120 }}>
                                        <strong>{(parseFloat(line.ordered_quantity || 0) * parseFloat(line.unit_price || 0)).toFixed(2)}</strong>
                                    </TableCell>
                                    <TableCell>
                                        <TextField size="small" value={line.notes}
                                            onChange={(e) => updateLine(index, 'notes', e.target.value)} />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton size="small" color="error" onClick={() => removeLine(index)}
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
                    <Typography variant="h6" fontWeight="bold" color="#1a237e">
                        Total Amount: ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button variant="outlined" onClick={() => navigate('/sales/sales-orders')}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: '#1a237e' }}>
                        Save Sales Order
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

export default CreateSalesOrderPage;
