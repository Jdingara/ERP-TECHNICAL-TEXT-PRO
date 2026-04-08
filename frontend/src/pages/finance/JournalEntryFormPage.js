// FILE: pages/finance/JournalEntryFormPage.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, Paper, Alert, IconButton, Divider, Autocomplete } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';

const EMPTY_LINE = { account_id: '', account_label: '', description: '', debit_amount: '', credit_amount: '' };

function JournalEntryFormPage() {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState([]);
    const [entryDate, setEntryDate]     = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [reference, setReference]     = useState('');
    const [lines, setLines]             = useState([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
    const [saving, setSaving]           = useState(false);
    const [error, setError]             = useState('');

    useEffect(() => {
        fetch('/api/finance/accounts/', { credentials: 'include' })
            .then(r => r.json())
            .then(data => setAccounts(data.accounts || []));
    }, []);

    const entryNumber = (() => {
        const d = new Date();
        return `JE-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*10000)).padStart(4,'0')}`;
    })();

    const addLine    = () => setLines(p => [...p, { ...EMPTY_LINE }]);
    const removeLine = (i) => setLines(p => p.filter((_, idx) => idx !== i));
    const updateLine = (i, field, value) => setLines(p => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

    const totalDebit  = lines.reduce((s, l) => s + (parseFloat(l.debit_amount)  || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);
    const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01;

    const handleSave = async () => {
        if (!isBalanced) { setError('Debit and Credit totals must be equal.'); return; }
        setSaving(true); setError('');
        const payload = {
            entry_number: entryNumber, entry_date: entryDate,
            description, reference,
            lines: lines.filter(l => l.account_id).map(l => ({
                account_id:    l.account_id,
                description:   l.description,
                debit_amount:  parseFloat(l.debit_amount)  || 0,
                credit_amount: parseFloat(l.credit_amount) || 0,
            })),
        };
        const res = await fetch('/api/finance/journal-entries/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) navigate('/finance/journal-entries');
        else { setError(data.message || 'Error saving.'); setSaving(false); }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/finance/journal-entries')} variant="outlined" size="small">Back to Journal Entries</Button>
                <Typography variant="h5" fontWeight="bold" color="primary" flex={1}>New Journal Entry</Typography>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving || !isBalanced} sx={{ backgroundColor: 'primary.main' }}>
                    {saving ? 'Saving…' : 'Post Entry'}
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField label="Entry Number" value={entryNumber} disabled />
                    <TextField label="Entry Date *" type="date" value={entryDate}
                        onChange={e => setEntryDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField label="Description *" value={description}
                        onChange={e => setDescription(e.target.value)} sx={{ gridColumn: 'span 2' }} />
                    <TextField label="Reference (e.g. invoice #, receipt #)" value={reference}
                        onChange={e => setReference(e.target.value)} sx={{ gridColumn: 'span 2' }} />
                </Box>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} color="primary">Journal Lines</Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={addLine}>Add Line</Button>
                </Box>

                {/* Header row */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 40px', gap: 1, mb: 1, px: 1 }}>
                    {['Account', 'Description', 'Debit (₹)', 'Credit (₹)', ''].map(h => (
                        <Typography key={h} variant="caption" fontWeight={700} color="text.secondary">{h}</Typography>
                    ))}
                </Box>
                <Divider sx={{ mb: 1 }} />

                {lines.map((line, i) => (
                    <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 40px', gap: 1, mb: 1 }}>
                        <Autocomplete
                            options={accounts}
                            getOptionLabel={a => `${a.code} — ${a.name}`}
                            value={accounts.find(a => a.id === line.account_id) || null}
                            onChange={(_, v) => updateLine(i, 'account_id', v?.id || '')}
                            renderInput={params => <TextField {...params} size="small" label="Account" />}
                            size="small"
                        />
                        <TextField size="small" label="Description" value={line.description}
                            onChange={e => updateLine(i, 'description', e.target.value)} />
                        <TextField size="small" label="Debit" type="number" value={line.debit_amount}
                            onChange={e => updateLine(i, 'debit_amount', e.target.value)} />
                        <TextField size="small" label="Credit" type="number" value={line.credit_amount}
                            onChange={e => updateLine(i, 'credit_amount', e.target.value)} />
                        <IconButton size="small" color="error" onClick={() => removeLine(i)} disabled={lines.length <= 2}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                ))}

                <Divider sx={{ mt: 2, mb: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, px: 1 }}>
                    <Typography variant="body2" fontWeight={700}>Total Debit: ₹{totalDebit.toFixed(2)}</Typography>
                    <Typography variant="body2" fontWeight={700}>Total Credit: ₹{totalCredit.toFixed(2)}</Typography>
                    {!isBalanced && <Typography variant="body2" color="error" fontWeight={700}>⚠ Not Balanced</Typography>}
                    {isBalanced  && <Typography variant="body2" color="success.main" fontWeight={700}>✓ Balanced</Typography>}
                </Box>
            </Paper>
        </Box>
    );
}
export default JournalEntryFormPage;
