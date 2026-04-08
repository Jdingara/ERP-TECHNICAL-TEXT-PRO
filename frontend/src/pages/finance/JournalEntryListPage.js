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
    IconButton, Alert, Tooltip, Stack,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon    from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { useColumnResize } from '../../components/common/useColumnResize';

function JournalEntryListPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { widths, Resizer } = useColumnResize("journalentry_list", [100, 180, 150, 150, 150, 150, 150, 150, 150, 150, 150, 80]);
    const [entries, setEntries]         = useState([]);
    const [message, setMessage]         = useState('');
    const [messageType, setMessageType] = useState('success');

    useEffect(() => { fetchEntries(); }, []);

    const fetchEntries = async () => {
        const res = await fetch('/api/finance/journal-entries/', { credentials: 'include' });
        const data = await res.json();
        setEntries(data.journal_entries || []);
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

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" color="primary" mb={1}>Journal Entries</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Record all financial transactions using double-entry bookkeeping
            </Typography>

            {message && <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/finance/journal-entries/new')}
                    sx={{ backgroundColor: 'primary.main' }}>New Journal Entry</Button>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table sx={{ tableLayout: "fixed" }}>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[0], backgroundColor: theme.palette.primary.main }}>Entry Number<Resizer index={0} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[1], backgroundColor: theme.palette.primary.main }}>Date<Resizer index={1} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[2], backgroundColor: theme.palette.primary.main }}>Description<Resizer index={2} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[3], backgroundColor: theme.palette.primary.main }}>Reference<Resizer index={3} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[4], backgroundColor: theme.palette.primary.main }}>Total Debit<Resizer index={4} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[5], backgroundColor: theme.palette.primary.main }}>Total Credit<Resizer index={5} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[6], backgroundColor: theme.palette.primary.main }}>Status<Resizer index={6} /></TableCell>
                            <TableCell sx={{ color:'white',fontWeight:'bold',whiteSpace:'nowrap',position:'relative',userSelect:'none',px:2,py:1 }} style={{ width: widths[7], backgroundColor: theme.palette.primary.main }}>Actions<Resizer index={7} /></TableCell>
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
        </Box>
    );
}

export default JournalEntryListPage;
