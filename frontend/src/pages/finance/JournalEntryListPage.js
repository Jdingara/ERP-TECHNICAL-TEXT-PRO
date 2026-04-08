// ============================================================
// FILE: pages/finance/JournalEntryListPage.js
// PURPOSE: Shows all journal entries.
//          User can create new entries and post them.
//          Posted entries affect account balances.
// ============================================================

import { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, IconButton, Alert, Divider, Tooltip, Stack,
} from '@mui/material';
import AddIcon    from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Autocomplete } from '@mui/material';
import { useColumnResize } from '../../components/common/useColumnResize';

const EMPTY_LINE = { account_id: '', account_label: '', description: '', debit_amount: '', credit_amount: '' };

function JournalEntryListPage() {
    const { widths, Resizer } = useColumnResize("journalentry_list", [100, 180, 150, 150, 150, 150, 150, 150, 150, 150, 150, 80]);
    const [entries, setEntries]         = useState([]);
    const [accounts, setAccounts]       = useState([]);
    const [dialogOpen, setDialogOpen]   = useState(false);
    const [message, setMessage]         = useState('');
    const [messageType, setMessageType] = useState('success');

    // Form state
    const [entryNumber, setEntryNumber] = useState('');
    const [entryDate, setEntryDate]     = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [reference, setReference]     = useState('');
    const [lines, setLines]             = useState([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);

    useEffect(() => { fetchEntries(); fetchAccounts(); }, []);

    const fetchEntries = async () => {
        const res = await fetch('/api/finance/journal-entries/', { credentials: 'include' });
        const data = await res.json();
        setEntries(data.journal_entries || []);
    };

    const fetchAccounts = async () => {
        const res = await fetch('/api/finance/accounts/', { credentials: 'include' });
        const data = await res.json();
        setAccounts(data.accounts || []);
    };

    const generateEntryNumber = () => {
        const date = new Date();
        return `JE-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*10000)).padStart(4,'0')}`;
    };

    const openDialog = () => {
        setEntryNumber(generateEntryNumber());
        setEntryDate(new Date().toISOString().split('T')[0]);
        setDescription('');
        setReference('');
        setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
        setDialogOpen(true);
    };

    const addLine = () => setLines(prev => [...prev, { ...EMPTY_LINE }]);
    const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i));
    const updateLine = (i, field, value) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

    const totalDebits  = lines.reduce((s, l) => s + parseFloat(l.debit_amount || 0), 0);
    const totalCredits = lines.reduce((s, l) => s + parseFloat(l.credit_amount || 0), 0);
    const isBalanced   = Math.abs(totalDebits - totalCredits) < 0.01;

    const handleSave = async () => {
        const payload = {
            entry_number: entryNumber, entry_date: entryDate,
            description, reference,
            lines: lines.filter(l => l.account_id).map(l => ({
                account_id:     l.account_id,
                description:    l.description,
                debit_amount:   l.debit_amount || 0,
                credit_amount:  l.credit_amount || 0,
            })),
        };
        const res = await fetch('/api/finance/journal-entries/', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage('Journal entry created.'); setMessageType('success');
            setDialogOpen(false); fetchEntries();
        } else {
            setMessage(data.message || 'Error.'); setMessageType('error');
        }
    };

    const handlePost = async (entryId) => {
        const res = await fetch(`/api/finance/journal-entries/${entryId}/post/`, {
            method: 'POST', credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) { setMessage('Journal entry posted.'); setMessageType('success'); fetchEntries(); }
        else { setMessage(data.message); setMessageType('error'); }
    };

    const handleDelete = async (entry) => {
        if (entry.status === 'posted') return;
        if (!window.confirm(`Delete journal entry ${entry.entry_number}?`)) return;
        const res  = await fetch(`/api/finance/journal-entries/${entry.id}/`, {
            method: 'DELETE', credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) { setMessage('Journal entry deleted.'); setMessageType('success'); fetchEntries(); }
        else { setMessage(data.message || 'Delete failed.'); setMessageType('error'); }
    };

    const accountOptions = accounts.map(a => ({ id: a.id, label: `${a.account_code} — ${a.account_name}` }));

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Journal Entries</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Record all financial transactions using double-entry bookkeeping
            </Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}
                    sx={{ backgroundColor: 'primary.main' }}>New Journal Entry</Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[0] }}>Entry Number<Resizer index={0} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[1] }}>Date<Resizer index={1} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[2] }}>Description<Resizer index={2} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[3] }}>Reference<Resizer index={3} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[4] }}>Total Debit<Resizer index={4} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[5] }}>Total Credit<Resizer index={5} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[6] }}>Status<Resizer index={6} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[7] }}>Actions<Resizer index={7} /></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {entries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No journal entries yet. Click "New Journal Entry" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            entries.map((e) => (
                                <TableRow key={e.id} hover>
                                    <TableCell><strong>{e.entry_number}</strong></TableCell>
                                    <TableCell>{e.entry_date}</TableCell>
                                    <TableCell>{e.description}</TableCell>
                                    <TableCell>{e.reference || '—'}</TableCell>
                                    <TableCell align="right">{parseFloat(e.total_debits).toLocaleString('en-IN', {minimumFractionDigits:2})}</TableCell>
                                    <TableCell align="right">{parseFloat(e.total_credits).toLocaleString('en-IN', {minimumFractionDigits:2})}</TableCell>
                                    <TableCell>
                                        <Chip label={e.status}
                                            color={e.status === 'posted' ? 'success' : 'default'} size="small" />
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            {e.status === 'draft' && (
                                                <Button size="small" variant="outlined" color="success"
                                                    onClick={() => handlePost(e.id)}>Post</Button>
                                            )}
                                            {e.status === 'draft' && (
                                                <Tooltip title="Delete Draft">
                                                    <IconButton size="small" color="error" onClick={() => handleDelete(e)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* New Journal Entry Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>New Journal Entry</DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 2, mb: 3, mt: 1 }}>
                        <TextField label="Entry Number" value={entryNumber} onChange={(e) => setEntryNumber(e.target.value)} />
                        <TextField label="Date *" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                        <TextField label="Description *" value={description} onChange={(e) => setDescription(e.target.value)} sx={{ gridColumn: 'span 2' }} />
                        <TextField label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography fontWeight="bold" color="primary">Entry Lines</Typography>
                        <Button size="small" startIcon={<AddIcon />} onClick={addLine} variant="outlined">Add Line</Button>
                    </Box>

                    <Table size="small">
                        <TableHead sx={{ backgroundColor: 'action.hover' }}>
                            <TableRow>
                                <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[8] }}>Account *<Resizer index={8} /></TableCell>
                                <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[9] }}>Description<Resizer index={9} /></TableCell>
                                <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[10] }}>Debit (₹)<Resizer index={10} /></TableCell>
                                <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',backgroundColor:'primary.main',px:2,py:1 }} style={{ width: widths[11] }}>Credit (₹)<Resizer index={11} /></TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.map((line, i) => (
                                <TableRow key={i}>
                                    <TableCell sx={{ minWidth: 280 }}>
                                        <Autocomplete
                                            size="small"
                                            options={accountOptions}
                                            value={accountOptions.find(a => a.id === line.account_id) || null}
                                            onChange={(_, val) => updateLine(i, 'account_id', val?.id || '')}
                                            renderInput={(params) => <TextField {...params} placeholder="Select account" />}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField size="small" value={line.description}
                                            onChange={(e) => updateLine(i, 'description', e.target.value)} />
                                    </TableCell>
                                    <TableCell align="right" sx={{ width: 130 }}>
                                        <TextField size="small" type="number" value={line.debit_amount}
                                            onChange={(e) => updateLine(i, 'debit_amount', e.target.value)} />
                                    </TableCell>
                                    <TableCell align="right" sx={{ width: 130 }}>
                                        <TextField size="small" type="number" value={line.credit_amount}
                                            onChange={(e) => updateLine(i, 'credit_amount', e.target.value)} />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton size="small" color="error" onClick={() => removeLine(i)}
                                            disabled={lines.length <= 2}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {/* Totals row */}
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell colSpan={2}><strong>Total</strong></TableCell>
                                <TableCell align="right"><strong style={{ color: 'primary.main' }}>{totalDebits.toFixed(2)}</strong></TableCell>
                                <TableCell align="right"><strong style={{ color: 'primary.main' }}>{totalCredits.toFixed(2)}</strong></TableCell>
                                <TableCell>
                                    {isBalanced
                                        ? <Chip label="Balanced" color="success" size="small" />
                                        : <Chip label="Not Balanced" color="error" size="small" />
                                    }
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: 'primary.main' }}>
                        Save Journal Entry
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default JournalEntryListPage;
