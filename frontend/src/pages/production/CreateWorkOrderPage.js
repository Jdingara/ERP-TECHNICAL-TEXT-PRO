// ============================================================
// FILE: pages/production/CreateWorkOrderPage.js
// PURPOSE: Create a new Work Order by selecting a BOM.
//          Auto-fills the material requirements from the BOM
//          including waste percentage calculations.
//          User sets planned quantity and warehouse for output.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, TextField, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Alert, Divider, Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FactoryIcon from '@mui/icons-material/Factory';

function CreateWorkOrderPage() {
    const navigate = useNavigate();

    const [boms, setBoms]             = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedBom, setSelectedBom] = useState(null);
    const [bomDetail, setBomDetail]   = useState(null);  // full BOM with lines

    const [formData, setFormData] = useState({
        bom_id:             '',
        planned_quantity:   '',
        planned_start_date: '',
        planned_end_date:   '',
        warehouse_id:       '',
        notes:              '',
    });

    const [saving, setSaving]       = useState(false);
    const [message, setMessage]     = useState('');
    const [messageType, setMessageType] = useState('error');

    useEffect(() => {
        fetchBoms();
        fetchWarehouses();
    }, []);

    const fetchBoms = async () => {
        const res  = await fetch('/api/production/bom/', { credentials: 'include' });
        const data = await res.json();
        setBoms(data.boms || []);
    };

    const fetchWarehouses = async () => {
        const res  = await fetch('/api/master-data/warehouses/', { credentials: 'include' });
        const data = await res.json();
        setWarehouses(data.warehouses || []);
    };

    // When BOM is selected, load its full details (with lines)
    const handleBomChange = async (bomId) => {
        setFormData(prev => ({ ...prev, bom_id: bomId }));
        if (!bomId) { setBomDetail(null); setSelectedBom(null); return; }

        const res  = await fetch(`/api/production/boms/${bomId}/`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
            setBomDetail(data);
            setSelectedBom(data);
        }
    };

    // Calculate material qty needed based on planned_quantity
    const calcMaterialQty = (lineQtyWithWaste) => {
        if (!formData.planned_quantity || isNaN(formData.planned_quantity)) return '—';
        const qty = parseFloat(formData.planned_quantity) * parseFloat(lineQtyWithWaste);
        return qty.toFixed(3);
    };

    const handleSubmit = async () => {
        if (!formData.bom_id || !formData.planned_quantity || !formData.planned_start_date || !formData.warehouse_id) {
            setMessage('Please fill in BOM, Planned Quantity, Start Date, and Warehouse.');
            setMessageType('error');
            return;
        }

        setSaving(true);
        const res = await fetch('/api/production/work-orders/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                bom_id:             parseInt(formData.bom_id),
                planned_quantity:   parseFloat(formData.planned_quantity),
                planned_start_date: formData.planned_start_date,
                planned_end_date:   formData.planned_end_date || null,
                warehouse_id:       parseInt(formData.warehouse_id),
                notes:              formData.notes,
            }),
        });

        const data = await res.json();
        setSaving(false);

        if (res.ok) {
            setMessage(`Work Order created: ${data.work_order_number}`);
            setMessageType('success');
            setTimeout(() => navigate('/production/work-orders'), 1500);
        } else {
            setMessage(data.message || JSON.stringify(data));
            setMessageType('error');
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/production/work-orders')}
                    sx={{ mr: 2 }}>
                    Back
                </Button>
                <FactoryIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h5" fontWeight="bold" color="primary">
                    Create Work Order
                </Typography>
            </Box>

            {message && (
                <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>
                    {message}
                </Alert>
            )}

            <Paper sx={{ p: 3, boxShadow: 2, borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" mb={2} color="primary">
                    Production Details
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {/* BOM Selection */}
                    <TextField
                        select
                        fullWidth
                        label="Bill of Materials (BOM) *"
                        value={formData.bom_id}
                        onChange={(e) => handleBomChange(e.target.value)}
                        helperText="Select which product recipe to use">
                        <MenuItem value=""><em>— Select BOM —</em></MenuItem>
                        {boms.map(b => (
                            <MenuItem key={b.id} value={b.id}>
                                {b.name} — {b.finished_product_code}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* Planned Quantity */}
                    <TextField
                        fullWidth
                        label="Planned Quantity *"
                        type="number"
                        value={formData.planned_quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, planned_quantity: e.target.value }))}
                        helperText="How many units to produce"
                    />

                    {/* Start Date */}
                    <TextField
                        fullWidth
                        label="Planned Start Date *"
                        type="date"
                        value={formData.planned_start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, planned_start_date: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                    />

                    {/* End Date */}
                    <TextField
                        fullWidth
                        label="Planned End Date"
                        type="date"
                        value={formData.planned_end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, planned_end_date: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                        helperText="Optional — expected completion date"
                    />

                    {/* Output Warehouse */}
                    <TextField
                        select
                        fullWidth
                        label="Output Warehouse *"
                        value={formData.warehouse_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, warehouse_id: e.target.value }))}
                        helperText="Where finished goods will be stored">
                        <MenuItem value=""><em>— Select Warehouse —</em></MenuItem>
                        {warehouses.map(w => (
                            <MenuItem key={w.id} value={w.id}>{w.name} ({w.code})</MenuItem>
                        ))}
                    </TextField>

                    {/* Notes */}
                    <TextField
                        fullWidth
                        label="Notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        helperText="Optional — special instructions"
                    />
                </Box>
            </Paper>

            {/* BOM Preview — shows material requirements */}
            {bomDetail && (
                <Paper sx={{ p: 3, boxShadow: 2, borderRadius: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" color="primary" sx={{ flexGrow: 1 }}>
                            Material Requirements
                        </Typography>
                        <Chip
                            label={`Product: ${bomDetail.finished_product_code} — ${bomDetail.finished_product}`}
                            color="primary"
                            variant="outlined"
                        />
                    </Box>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        Quantities shown include waste percentage. Actual raw material consumption
                        will be calculated when you complete the work order.
                    </Alert>

                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell><strong>Raw Material</strong></TableCell>
                                    <TableCell><strong>Code</strong></TableCell>
                                    <TableCell align="right"><strong>Qty per Unit (incl. waste)</strong></TableCell>
                                    <TableCell align="right"><strong>Waste %</strong></TableCell>
                                    <TableCell align="right" sx={{ color: '#e65100' }}>
                                        <strong>
                                            Total Qty Needed
                                            {formData.planned_quantity && ` (for ${formData.planned_quantity} units)`}
                                        </strong>
                                    </TableCell>
                                    <TableCell><strong>Unit</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bomDetail.lines && bomDetail.lines.map((line, idx) => (
                                    <TableRow key={idx} hover>
                                        <TableCell>{line.raw_material}</TableCell>
                                        <TableCell>{line.raw_material_code}</TableCell>
                                        <TableCell align="right">{parseFloat(line.quantity_with_waste).toFixed(3)}</TableCell>
                                        <TableCell align="right">{line.waste_percent}%</TableCell>
                                        <TableCell align="right" sx={{ color: '#e65100', fontWeight: 'bold' }}>
                                            {calcMaterialQty(line.quantity_with_waste)}
                                        </TableCell>
                                        <TableCell>{line.unit}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            <Divider sx={{ mb: 2 }} />

            {/* Submit */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button variant="outlined" onClick={() => navigate('/production/work-orders')}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={saving}
                    sx={{ backgroundColor: 'primary.main', px: 4 }}>
                    {saving ? 'Creating...' : 'Create Work Order'}
                </Button>
            </Box>
        </Box>
    );
}

export default CreateWorkOrderPage;
