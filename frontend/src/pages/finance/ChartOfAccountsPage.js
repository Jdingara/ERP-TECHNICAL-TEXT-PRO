// ============================================================
// FILE: pages/finance/ChartOfAccountsPage.js
// PURPOSE: Shows all financial accounts (Chart of Accounts).
//          User can add new accounts and view balances.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Select, InputLabel, FormControl, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useColumnResize } from '../../components/common/useColumnResize';

const CATEGORY_OPTIONS = [
    { value: 'asset',     label: 'Asset',     color: 'primary'  },
    { value: 'liability', label: 'Liability', color: 'error'    },
    { value: 'equity',    label: 'Equity',    color: 'warning'  },
    { value: 'income',    label: 'Income',    color: 'success'  },
    { value: 'expense',   label: 'Expense',   color: 'default'  },
];

const EMPTY_FORM = { account_code: '', account_name: '', account_category: 'asset', description: '' };

function ChartOfAccountsPage() {
    const { widths, Resizer } = useColumnResize("chartofaccounts", [100, 180, 150, 150, 80]);
    const [accounts, setAccounts]       = useState([]);
    const [dialogOpen, setDialogOpen]   = useState(false);
    const [formData, setFormData]       = useState(EMPTY_FORM);
    const [message, setMessage]         = useState('');
    const [messageType, setMessageType] = useState('success');
    const [filterCategory, setFilterCategory] = useState('');

    useEffect(() => { fetchAccounts(); }, [filterCategory]);

    const fetchAccounts = async () => {
        const url = `/api/finance/accounts/?balance=1${filterCategory ? '&category=' + filterCategory : ''}`;
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        setAccounts(data.accounts || []);
    };

    const handleSave = async () => {
        const res = await fetch('/api/finance/accounts/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('Account created successfully.');
            setMessageType('success');
            setDialogOpen(false);
            fetchAccounts();
        } else {
            setMessage(data.message || 'Error creating account.');
            setMessageType('error');
        }
    };

    const getCategoryColor = (cat) => CATEGORY_OPTIONS.find(o => o.value === cat)?.color || 'default';
    const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Chart of Accounts</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                All financial accounts — assets, liabilities, income, expenses
            </Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2 }}>
                <FormControl size="small" sx={{ width: 200 }}>
                    <InputLabel>Filter by Category</InputLabel>
                    <Select value={filterCategory} label="Filter by Category"
                        onChange={(e) => setFilterCategory(e.target.value)}>
                        <MenuItem value="">All Categories</MenuItem>
                        {CATEGORY_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                </FormControl>
                <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => { setFormData(EMPTY_FORM); setDialogOpen(true); }}
                    sx={{ backgroundColor: 'primary.main' }}>
                    Add Account
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[0] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Account Code<Resizer index={0} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[1] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Account Name<Resizer index={1} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[2] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Category<Resizer index={2} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[3] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Description<Resizer index={3} /></div></TableCell>
                            <TableCell sx={{ color:"white",fontWeight:"bold",overflow:"hidden",whiteSpace:"nowrap",p:0 }} style={{ width: widths[4] }}><div style={{ position:"relative", padding:"6px 16px", height:"100%", display:"flex", alignItems:"center" }}>Balance (₹)<Resizer index={4} /></div></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {accounts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No accounts yet. Click "Add Account" to create your chart of accounts.
                                </TableCell>
                            </TableRow>
                        ) : (
                            accounts.map((acc) => (
                                <TableRow key={acc.id} hover>
                                    <TableCell><strong>{acc.account_code}</strong></TableCell>
                                    <TableCell>{acc.account_name}</TableCell>
                                    <TableCell>
                                        <Chip label={acc.account_category} size="small"
                                            color={getCategoryColor(acc.account_category)} variant="outlined" />
                                    </TableCell>
                                    <TableCell>{acc.description || '—'}</TableCell>
                                    <TableCell align="right">
                                        <strong>{parseFloat(acc.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>Add New Account</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField label="Account Code * (e.g. 1001)" value={formData.account_code}
                            onChange={(e) => handleChange('account_code', e.target.value)} />
                        <TextField label="Account Name *" value={formData.account_name}
                            onChange={(e) => handleChange('account_name', e.target.value)} />
                        <FormControl>
                            <InputLabel>Category *</InputLabel>
                            <Select value={formData.account_category} label="Category *"
                                onChange={(e) => handleChange('account_category', e.target.value)}>
                                {CATEGORY_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField label="Description" value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)} multiline rows={2} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>
                        Save Account
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default ChartOfAccountsPage;
