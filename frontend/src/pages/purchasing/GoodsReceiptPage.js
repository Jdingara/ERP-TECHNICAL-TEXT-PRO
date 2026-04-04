// ============================================================
// FILE: pages/purchasing/GoodsReceiptPage.js
// PURPOSE: Goods Receipt Note (GRN) — receive items against a PO.
//          Confirming a GRN automatically adds received qty to stock.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableHead, TableRow,
    TableCell, TableBody, Chip, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, MenuItem, IconButton, Tooltip,
    InputAdornment, Stack, Divider, Alert,
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import DeleteIcon       from '@mui/icons-material/Delete';
import PrintIcon        from '@mui/icons-material/Print';
import SearchIcon       from '@mui/icons-material/Search';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { printGRN }    from '../../utils/printUtils';

const STATUS_COLORS = {
    draft:     'default',
    confirmed: 'success',
};

const canDelete = (grn) => grn.status === 'draft';

export default function GoodsReceiptPage() {
    const [grns,        setGrns]        = useState([]);
    const [pos,         setPos]         = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [search,      setSearch]      = useState('');
    const [createOpen,  setCreateOpen]  = useState(false);

    // Create form state
    const [selectedPO,  setSelectedPO]  = useState('');
    const [receiptDate, setReceiptDate] = useState('');
    const [supplierInv, setSupplierInv] = useState('');
    const [notes,       setNotes]       = useState('');
    const [lines,       setLines]       = useState([]);
    const [saving,      setSaving]      = useState(false);
    const [error,       setError]       = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const [grnRes, poRes] = await Promise.all([
            fetch('/api/purchasing/grn/', { credentials: 'include' }),
            fetch('/api/purchasing/purchase-orders/', { credentials: 'include' }),
        ]);
        const grnData = await grnRes.json();
        const poData  = await poRes.json();
        setGrns(grnData.goods_receipts || []);
        setPos((poData.purchase_orders || []).filter(p => p.status !== 'cancelled'));
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // When PO is selected, fetch its lines to prefill the GRN lines
    const handlePOChange = async (po_id) => {
        setSelectedPO(po_id);
        setLines([]);
        if (!po_id) return;
        const res  = await fetch(`/api/purchasing/purchase-orders/${po_id}/`, { credentials: 'include' });
        const data = await res.json();
        const po   = data.purchase_order;
        setLines((po.lines || []).map(l => ({
            po_line_id:        l.id,
            item_code:         l.item_code,
            item_name:         l.item_name,
            ordered_quantity:  l.ordered_quantity,
            received_quantity: l.ordered_quantity,
        })));
    };

    const openCreate = () => {
        setSelectedPO('');
        setReceiptDate('');
        setSupplierInv('');
        setNotes('');
        setLines([]);
        setError('');
        setCreateOpen(true);
    };

    const handleCreate = async () => {
        setSaving(true);
        setError('');
        try {
            const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
            const res = await fetch('/api/purchasing/grn/', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    purchase_order_id:       selectedPO,
                    grn_number:              `GRN-${today}-${String(grns.length + 1).padStart(3,'0')}`,
                    receipt_date:            receiptDate,
                    supplier_invoice_number: supplierInv,
                    notes,
                    lines: lines.map(l => ({
                        po_line_id:        l.po_line_id,
                        received_quantity: l.received_quantity,
                    })),
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || 'Failed to create GRN.'); return; }
            setCreateOpen(false);
            load();
        } catch { setError('Network error.'); }
        finally { setSaving(false); }
    };

    const handleConfirm = async (grn) => {
        if (!window.confirm(`Confirm GRN ${grn.grn_number}? This will add received items to stock.`)) return;
        const res  = await fetch(`/api/purchasing/grn/${grn.id}/confirm/`, {
            method: 'POST', credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) { alert(data.message || 'Confirm failed.'); return; }
        load();
    };

    const handleDelete = async (grn) => {
        if (!canDelete(grn)) return;
        if (!window.confirm(`Delete GRN ${grn.grn_number}?`)) return;
        const res  = await fetch(`/api/purchasing/grn/${grn.id}/`, {
            method: 'DELETE', credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) { alert(data.message || 'Delete failed.'); return; }
        load();
    };

    const handlePrint = async (grn) => {
        const res  = await fetch(`/api/purchasing/grn/${grn.id}/`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) printGRN(data.goods_receipt || grn);
    };

    const updateLineQty = (idx, val) => {
        setLines(prev => prev.map((l, i) => i === idx ? { ...l, received_quantity: val } : l));
    };

    const filtered = grns.filter(g =>
        g.grn_number.toLowerCase().includes(search.toLowerCase()) ||
        g.po_number.toLowerCase().includes(search.toLowerCase()) ||
        g.supplier_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <LocalShippingIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h5" fontWeight={700}>Goods Receipt (GRN)</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Receive items against Purchase Orders · confirms stock addition
                        </Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Create GRN
                </Button>
            </Box>

            {/* Summary chips */}
            <Box display="flex" gap={1.5} mb={2}>
                <Chip label={`Draft: ${grns.filter(g => g.status === 'draft').length}`} variant="outlined" />
                <Chip label={`Confirmed: ${grns.filter(g => g.status === 'confirmed').length}`} color="success" variant="outlined" />
            </Box>

            {/* Search */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <TextField
                    placeholder="Search GRN #, PO #, supplier…"
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ minWidth: 300 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                />
            </Paper>

            {/* Table */}
            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: 'action.hover' } }}>
                            <TableCell>GRN #</TableCell>
                            <TableCell>PO #</TableCell>
                            <TableCell>Supplier</TableCell>
                            <TableCell>Receipt Date</TableCell>
                            <TableCell>Supplier Invoice</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} align="center">Loading…</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={7} align="center">No GRNs found.</TableCell></TableRow>
                        ) : filtered.map(grn => (
                            <TableRow key={grn.id} hover>
                                <TableCell><Typography fontWeight={600} fontSize={13}>{grn.grn_number}</Typography></TableCell>
                                <TableCell>{grn.po_number}</TableCell>
                                <TableCell>{grn.supplier_name}</TableCell>
                                <TableCell>{grn.receipt_date}</TableCell>
                                <TableCell>{grn.supplier_invoice_number || '—'}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={grn.status.charAt(0).toUpperCase() + grn.status.slice(1)}
                                        color={STATUS_COLORS[grn.status] || 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        {grn.status === 'draft' && (
                                            <Tooltip title="Confirm & Add to Stock">
                                                <IconButton size="small" color="success" onClick={() => handleConfirm(grn)}>
                                                    <CheckCircleIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Print GRN">
                                            <IconButton size="small" onClick={() => handlePrint(grn)}>
                                                <PrintIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        {canDelete(grn) && (
                                            <Tooltip title="Delete Draft">
                                                <IconButton size="small" color="error" onClick={() => handleDelete(grn)}>
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
            </Paper>

            {/* Create GRN Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
                <DialogTitle fontWeight={700}>Create Goods Receipt Note</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} mt={0.5}>
                        {error && <Alert severity="error">{error}</Alert>}

                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>SELECT PURCHASE ORDER</Typography>
                        <TextField
                            select label="Purchase Order *"
                            value={selectedPO}
                            onChange={e => handlePOChange(e.target.value)}
                            fullWidth>
                            <MenuItem value="">— Select PO —</MenuItem>
                            {pos.map(p => (
                                <MenuItem key={p.id} value={p.id}>
                                    {p.po_number} · {p.supplier_name} · ₹{parseFloat(p.total_amount || 0).toFixed(2)}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Box display="flex" gap={2}>
                            <TextField label="Receipt Date *" value={receiptDate}
                                onChange={e => setReceiptDate(e.target.value)}
                                type="date" fullWidth InputLabelProps={{ shrink: true }} />
                            <TextField label="Supplier Invoice #" value={supplierInv}
                                onChange={e => setSupplierInv(e.target.value)} fullWidth />
                        </Box>
                        <TextField label="Notes" value={notes} onChange={e => setNotes(e.target.value)}
                            fullWidth multiline rows={2} />

                        {lines.length > 0 && (
                            <>
                                <Divider />
                                <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
                                    ITEMS TO RECEIVE
                                </Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: 'action.hover' } }}>
                                            <TableCell>Item Code</TableCell>
                                            <TableCell>Item Name</TableCell>
                                            <TableCell align="right">Ordered Qty</TableCell>
                                            <TableCell align="right" sx={{ width: 140 }}>Received Qty *</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {lines.map((l, i) => (
                                            <TableRow key={l.po_line_id}>
                                                <TableCell>{l.item_code}</TableCell>
                                                <TableCell>{l.item_name}</TableCell>
                                                <TableCell align="right">{l.ordered_quantity}</TableCell>
                                                <TableCell align="right">
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={l.received_quantity}
                                                        onChange={e => updateLineQty(i, e.target.value)}
                                                        inputProps={{ min: 0, step: 0.001 }}
                                                        sx={{ width: 110 }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving || !selectedPO || !receiptDate}>
                        {saving ? 'Creating…' : 'Create GRN'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
