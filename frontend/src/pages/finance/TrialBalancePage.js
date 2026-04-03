// ============================================================
// FILE: pages/finance/TrialBalancePage.js
// PURPOSE: Shows the Trial Balance report.
//          All accounts with their debit/credit balances.
//          Total debits must equal total credits.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip,
    Button, Alert
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

function TrialBalancePage() {
    const [trialBalance, setTrialBalance] = useState([]);
    const [totalDebit, setTotalDebit]     = useState(0);
    const [totalCredit, setTotalCredit]   = useState(0);
    const [isBalanced, setIsBalanced]     = useState(true);

    useEffect(() => { fetchTrialBalance(); }, []);

    const fetchTrialBalance = async () => {
        const res = await fetch('http://127.0.0.1:8000/api/finance/trial-balance/', { credentials: 'include' });
        const data = await res.json();
        setTrialBalance(data.trial_balance || []);
        setTotalDebit(data.total_debit || 0);
        setTotalCredit(data.total_credit || 0);
        setIsBalanced(data.is_balanced);
    };

    const fmt = (val) => parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight="bold" color="#1a237e" mb={1}>Trial Balance</Typography>
                    <Typography variant="body2" color="text.secondary">
                        All accounts with current debit and credit balances
                    </Typography>
                </Box>
                <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchTrialBalance}>
                    Refresh
                </Button>
            </Box>

            {!isBalanced && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Trial balance is NOT balanced. Check your journal entries.
                </Alert>
            )}
            {isBalanced && trialBalance.length > 0 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    Trial balance is balanced. ✓
                </Alert>
            )}

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#1a237e' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Account Code</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Account Name</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Category</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Debit (₹)</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Credit (₹)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {trialBalance.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No data yet. Post journal entries to see trial balance.
                                </TableCell>
                            </TableRow>
                        ) : (
                            trialBalance.map((row, i) => (
                                <TableRow key={i} hover>
                                    <TableCell><strong>{row.account_code}</strong></TableCell>
                                    <TableCell>{row.account_name}</TableCell>
                                    <TableCell>
                                        <Chip label={row.account_category} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell align="right">{parseFloat(row.debit_balance) > 0 ? fmt(row.debit_balance) : '—'}</TableCell>
                                    <TableCell align="right">{parseFloat(row.credit_balance) > 0 ? fmt(row.credit_balance) : '—'}</TableCell>
                                </TableRow>
                            ))
                        )}

                        {/* Totals row */}
                        <TableRow sx={{ backgroundColor: '#e8eaf6' }}>
                            <TableCell colSpan={3}><strong>TOTAL</strong></TableCell>
                            <TableCell align="right"><strong>{fmt(totalDebit)}</strong></TableCell>
                            <TableCell align="right"><strong>{fmt(totalCredit)}</strong></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export default TrialBalancePage;
