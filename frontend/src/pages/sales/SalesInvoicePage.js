// ============================================================
// FILE: pages/sales/SalesInvoicePage.js
// PURPOSE: List, create, and manage Sales Invoices (AR).
//          Shows invoice status, balance due, mark-as-paid action.
// ============================================================

import { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, Alert,
    CircularProgress, IconButton, Tooltip, Stack, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, Select, FormControl, InputLabel, Grid,
} from '@mui/material';
import PrintIcon        from '@mui/icons-material/Print';
import PaymentIcon      from '@mui/icons-material/Payment';
import AddIcon          from '@mui/icons-material/Add';
import ReceiptIcon      from '@mui/icons-material/Receipt';
import { printInvoice } from '../../utils/printUtils';

const STATUS_COLOR = {
    draft:   'default',
    sent:    'info',
    paid:    'success',
    overdue: 'error',
};

function SalesInvoicePage() {
    const [invoices, setInvoices]     = useState([]);
    const [loading,  setLoading]      = useState(true);
    const [msg,      setMsg]          = useState('');
    const [msgType,  setMsgType]      = useState('success');
    const [openDlg,  setOpenDlg]      = useState(false);

    // Create dialog form state
    const [soList,   setSoList]       = useState([]);
    const [form,     setForm]         = useState({
        sales_order_id: '', invoice_date: '', due_date: '',
        tax_amount: '0', notes: '',
    });

    useEffect(() => { fetchInvoices(); }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res  = await fetch('/api/sales/invoices/', { credentials: 'include' });
            const json = await res.json();
            setInvoices(json.invoices || []);
        } catch { setInvoices([]); }
        finally  { setLoading(false); }
    };

    const fetchSOs = async () => {
        try {
            const res  = await fetch('/api/sales/orders/?status=delivered', { credentials: 'include' });
            const json = await res.json();
            setSoList(json.sales_orders || []);
        } catch { setSoList([]); }
    };

    const openCreate = () => {
        fetchSOs();
        setForm({ sales_order_id: '', invoice_date: '', due_date: '', tax_amount: '0', notes: '' });
        setOpenDlg(true);
    };

    const handleCreate = async () => {
        if (!form.sales_order_id || !form.invoice_date || !form.due_date) {
            setMsg('Sales order, invoice date and due date are required.');
            setMsgType('error');
            return;
        }
        try {
            const so       = soList.find(s => s.id === parseInt(form.sales_order_id));
            const subtotal = parseFloat(so?.total_amount || 0);
            const tax      = parseFloat(form.tax_amount || 0);

            // Auto-generate invoice number
            const today   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const inv_num = `INV-${today}-${String(invoices.length + 1).padStart(3, '0')}`;

            const res = await fetch('/api/sales/invoices/', {
                method:      'POST',
                credentials: 'include',
                headers:     { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoice_number:  inv_num,
                    sales_order_id:  parseInt(form.sales_order_id),
                    invoice_date:    form.invoice_date,
                    due_date:        form.due_date,
                    subtotal:        subtotal,
                    tax_amount:      tax,
                    total_amount:    subtotal + tax,
                    notes:           form.notes,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Failed to create invoice');
            setMsg('Invoice created successfully.');
            setMsgType('success');
            setOpenDlg(false);
            fetchInvoices();
        } catch (e) {
            setMsg(e.message);
            setMsgType('error');
        }
    };

    const handleMarkPaid = async (inv) => {
        if (!window.confirm(`Mark invoice ${inv.invoice_number} as fully paid?`)) return;
        try {
            const res  = await fetch(`/api/sales/invoices/${inv.id}/paid/`, {
                method:      'POST',
                credentials: 'include',
                headers:     { 'Content-Type': 'application/json' },
                body:        JSON.stringify({}),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Failed');
            setMsg(`Invoice ${inv.invoice_number} marked as paid.`);
            setMsgType('success');
            fetchInvoices();
        } catch (e) {
            setMsg(e.message);
            setMsgType('error');
        }
    };

    const fmtCur = (v) => `₹ ${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ReceiptIcon sx={{ color: '#e65100', fontSize: 28 }} />
                    <Box>
                        <Typography variant="h5" fontWeight="bold" color="#1a237e">Sales Invoices</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Accounts Receivable — {invoices.length} invoice(s)
                        </Typography>
                    </Box>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
                    sx={{ backgroundColor: '#e65100', '&:hover': { backgroundColor: '#bf360c' } }}>
                    Create Invoice
                </Button>
            </Box>

            {msg && <Alert severity={msgType} sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

            {/* Summary Cards */}
            <Grid container spacing={2} mb={3}>
                {[
                    { label: 'Total Invoiced', value: fmtCur(invoices.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)), color: '#1a237e' },
                    { label: 'Total Collected', value: fmtCur(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total_amount || 0), 0)), color: '#2e7d32' },
                    { label: 'Outstanding AR', value: fmtCur(invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + parseFloat(i.balance_due || 0), 0)), color: '#e65100' },
                    { label: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length + ' invoice(s)', color: '#c62828' },
                ].map(c => (
                    <Grid item xs={12} sm={6} md={3} key={c.label}>
                        <Paper sx={{ p: 2, borderRadius: 2, borderLeft: `4px solid ${c.color}` }}>
                            <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                            <Typography variant="h6" fontWeight="bold" color={c.color}>{c.value}</Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Invoice Table */}
            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: '#1a237e' }}>
                        <TableRow>
                            {['Invoice #', 'Customer', 'SO #', 'Invoice Date', 'Due Date',
                              'Total', 'Paid', 'Balance Due', 'Status', 'Actions'].map(h => (
                                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                    {h}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No invoices yet. Create an invoice from a delivered sales order.
                                </TableCell>
                            </TableRow>
                        ) : invoices.map(inv => (
                            <TableRow key={inv.id} hover sx={{ '&:nth-of-type(even)': { backgroundColor: '#f9f9f9' } }}>
                                <TableCell><strong>{inv.invoice_number}</strong></TableCell>
                                <TableCell>{inv.customer_name}</TableCell>
                                <TableCell sx={{ color: '#1565c0' }}>{inv.so_number}</TableCell>
                                <TableCell>{inv.invoice_date}</TableCell>
                                <TableCell sx={{ color: inv.status === 'overdue' ? '#c62828' : 'inherit' }}>
                                    {inv.due_date}
                                </TableCell>
                                <TableCell align="right">{fmtCur(inv.total_amount)}</TableCell>
                                <TableCell align="right" sx={{ color: '#2e7d32' }}>{fmtCur(inv.paid_amount)}</TableCell>
                                <TableCell align="right" sx={{ color: parseFloat(inv.balance_due) > 0 ? '#c62828' : '#2e7d32', fontWeight: 'bold' }}>
                                    {fmtCur(inv.balance_due)}
                                </TableCell>
                                <TableCell>
                                    <Chip label={inv.status.toUpperCase()} size="small"
                                        color={STATUS_COLOR[inv.status] || 'default'} />
                                </TableCell>
                                <TableCell>
                                    <Stack direction="row" spacing={0.5}>
                                        <Tooltip title="Print Invoice">
                                            <IconButton size="small" color="primary"
                                                onClick={() => printInvoice(inv)}>
                                                <PrintIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        {inv.status !== 'paid' && inv.status !== 'draft' && (
                                            <Tooltip title="Mark as Paid">
                                                <IconButton size="small" color="success"
                                                    onClick={() => handleMarkPaid(inv)}>
                                                    <PaymentIcon fontSize="small" />
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

            {/* Create Invoice Dialog */}
            <Dialog open={openDlg} onClose={() => setOpenDlg(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create Sales Invoice</DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} mt={1}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Sales Order (Delivered)</InputLabel>
                            <Select
                                value={form.sales_order_id}
                                label="Sales Order (Delivered)"
                                onChange={e => setForm(f => ({ ...f, sales_order_id: e.target.value }))}>
                                {soList.map(so => (
                                    <MenuItem key={so.id} value={so.id}>
                                        {so.so_number} — {so.customer_name} (₹ {parseFloat(so.total_amount).toLocaleString('en-IN')})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField fullWidth size="small" type="date" label="Invoice Date"
                                    InputLabelProps={{ shrink: true }}
                                    value={form.invoice_date}
                                    onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField fullWidth size="small" type="date" label="Due Date"
                                    InputLabelProps={{ shrink: true }}
                                    value={form.due_date}
                                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                            </Grid>
                        </Grid>
                        <TextField fullWidth size="small" type="number" label="Tax Amount (₹)"
                            value={form.tax_amount}
                            onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))} />
                        <TextField fullWidth size="small" multiline rows={2} label="Notes"
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDlg(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate}
                        sx={{ backgroundColor: '#e65100' }}>
                        Create Invoice
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default SalesInvoicePage;
