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

const CATEGORY_OPTIONS = [
    { value: 'asset',     label: 'Asset',     color: 'primary'  },
    { value: 'liability', label: 'Liability', color: 'error'    },
    { value: 'equity',    label: 'Equity',    color: 'warning'  },
    { value: 'income',    label: 'Income',    color: 'success'  },
    { value: 'expense',   label: 'Expense',   color: 'default'  },
];

const EMPTY_FORM = { account_code: '', account_name: '', account_category: 'asset', description: '' };

function ChartOfAccountsPage() {
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
            <Typography variant="h5" fontWeight="bold" color="#1a237e" mb={1}>Chart of Accounts</Typography>
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
                    sx={{ backgroundColor: '#1a237e' }}>
                    Add Account
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#1a237e' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Account Code</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Account Name</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Category</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Balance (₹)</TableCell>
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
                <DialogTitle sx={{ backgroundColor: '#1a237e', color: 'white' }}>Add New Account</DialogTitle>
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
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: '#1a237e' }}>
                        Save Account
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default ChartOfAccountsPage;
