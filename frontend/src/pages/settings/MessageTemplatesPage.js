// ============================================================
// FILE: pages/settings/MessageTemplatesPage.js
// PURPOSE: One-time setup of email + WhatsApp message templates
//          for Quotation, Sales Order and Invoice.
//          Supported placeholders: {{customer_name}},
//          {{document_number}}, {{amount}}, {{date}}
// ============================================================

import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Tab, Tabs, TextField,
    Button, Alert, CircularProgress, Chip, Divider,
} from '@mui/material';
import SaveIcon       from '@mui/icons-material/Save';
import EmailIcon      from '@mui/icons-material/Email';
import ChatIcon       from '@mui/icons-material/Chat';

const API = '/api/master-data/settings/message-templates/';

const DOC_TYPES = [
    { key: 'quotation',   label: 'Quotation' },
    { key: 'sales_order', label: 'Sales Order' },
    { key: 'invoice',     label: 'Invoice' },
];

const PLACEHOLDERS = [
    { tag: '{{customer_name}}',    desc: 'Customer name' },
    { tag: '{{document_number}}',  desc: 'Quotation / SO / Invoice number' },
    { tag: '{{amount}}',           desc: 'Total amount (₹)' },
    { tag: '{{date}}',             desc: 'Document date' },
];

function insertAt(value, tag, selStart, selEnd) {
    return value.slice(0, selStart) + tag + value.slice(selEnd);
}

export default function MessageTemplatesPage() {
    const [tab,       setTab]       = useState(0);
    const [templates, setTemplates] = useState({});   // { quotation: {...}, sales_order: {...}, invoice: {...} }
    const [loading,   setLoading]   = useState(true);
    const [saving,    setSaving]    = useState(false);
    const [msg,       setMsg]       = useState('');
    const [msgType,   setMsgType]   = useState('success');

    // track textarea cursor positions for placeholder insertion
    const [cursors, setCursors] = useState({});  // { fieldId: { start, end } }

    useEffect(() => {
        fetch(API, { credentials: 'include' })
            .then(r => r.json())
            .then(d => {
                const map = {};
                (d.templates || []).forEach(t => { map[t.document_type] = { ...t }; });
                setTemplates(map);
            })
            .finally(() => setLoading(false));
    }, []);

    const docType = DOC_TYPES[tab].key;
    const tmpl    = templates[docType] || { email_subject: '', email_body: '', whatsapp_body: '' };

    const setField = (field, value) => {
        setTemplates(prev => ({
            ...prev,
            [docType]: { ...(prev[docType] || {}), [field]: value },
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMsg('');
        try {
            const res = await fetch(`${API}${docType}/`, {
                method:      'PUT',
                credentials: 'include',
                headers:     { 'Content-Type': 'application/json' },
                body:        JSON.stringify({
                    email_subject: tmpl.email_subject,
                    email_body:    tmpl.email_body,
                    whatsapp_body: tmpl.whatsapp_body,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setMsg('Template saved successfully.');
                setMsgType('success');
            } else {
                setMsg(data.message || 'Save failed.');
                setMsgType('error');
            }
        } catch {
            setMsg('Network error.');
            setMsgType('error');
        }
        setSaving(false);
    };

    const trackCursor = (fieldId, e) => {
        setCursors(prev => ({
            ...prev,
            [fieldId]: { start: e.target.selectionStart, end: e.target.selectionEnd },
        }));
    };

    const insertPlaceholder = (fieldId, tag) => {
        const cur = cursors[fieldId] || { start: (tmpl[fieldId] || '').length, end: (tmpl[fieldId] || '').length };
        const newVal = insertAt(tmpl[fieldId] || '', tag, cur.start, cur.end);
        setField(fieldId, newVal);
        const newPos = cur.start + tag.length;
        setCursors(prev => ({ ...prev, [fieldId]: { start: newPos, end: newPos } }));
    };

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
            <CircularProgress />
        </Box>
    );

    return (
        <Box sx={{ p: 3, maxWidth: 860 }}>
            <Typography variant="h5" fontWeight={700} mb={0.5}>Message Templates</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Write your email and WhatsApp messages once. Placeholders are auto-filled when sharing.
            </Typography>

            {/* Placeholder reference */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Available Placeholders
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    {PLACEHOLDERS.map(p => (
                        <Chip
                            key={p.tag}
                            label={`${p.tag} — ${p.desc}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: 'monospace', fontSize: 11.5 }}
                        />
                    ))}
                </Box>
            </Paper>

            {/* Document type tabs */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
                {DOC_TYPES.map(d => (
                    <Tab key={d.key} label={d.label} sx={{ textTransform: 'none', fontWeight: 600 }} />
                ))}
            </Tabs>

            {msg && (
                <Alert severity={msgType} sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>
            )}

            {/* Email section */}
            <Paper variant="outlined" sx={{ p: 2.5, mb: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <EmailIcon sx={{ color: '#ea4335', fontSize: 20 }} />
                    <Typography fontWeight={700}>Email Template</Typography>
                </Box>

                <TextField
                    label="Email Subject"
                    fullWidth
                    size="small"
                    value={tmpl.email_subject || ''}
                    onChange={e => setField('email_subject', e.target.value)}
                    onSelect={e => trackCursor('email_subject', e)}
                    onClick={e => trackCursor('email_subject', e)}
                    onKeyUp={e => trackCursor('email_subject', e)}
                    placeholder={`e.g. Quotation {{document_number}} from SASI ERP`}
                    sx={{ mb: 1.5 }}
                />

                {/* Placeholder insert buttons for subject */}
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, lineHeight: '24px' }}>
                        Insert into Subject:
                    </Typography>
                    {PLACEHOLDERS.map(p => (
                        <Chip
                            key={p.tag}
                            label={p.tag}
                            size="small"
                            onClick={() => insertPlaceholder('email_subject', p.tag)}
                            sx={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: 11 }}
                        />
                    ))}
                </Box>

                <TextField
                    label="Email Body"
                    fullWidth
                    multiline
                    rows={6}
                    size="small"
                    value={tmpl.email_body || ''}
                    onChange={e => setField('email_body', e.target.value)}
                    onSelect={e => trackCursor('email_body', e)}
                    onClick={e => trackCursor('email_body', e)}
                    onKeyUp={e => trackCursor('email_body', e)}
                    placeholder={`Dear {{customer_name}},\n\nPlease find attached your ${DOC_TYPES[tab].label} {{document_number}}.\n\nAmount: {{amount}}\nDate: {{date}}\n\nThank you,\nSASI ERP`}
                    sx={{ mb: 1 }}
                />

                {/* Placeholder insert buttons for body */}
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, lineHeight: '24px' }}>
                        Insert into Body:
                    </Typography>
                    {PLACEHOLDERS.map(p => (
                        <Chip
                            key={p.tag}
                            label={p.tag}
                            size="small"
                            onClick={() => insertPlaceholder('email_body', p.tag)}
                            sx={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: 11 }}
                        />
                    ))}
                </Box>
            </Paper>

            {/* WhatsApp section */}
            <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <ChatIcon sx={{ color: '#25d366', fontSize: 20 }} />
                    <Typography fontWeight={700}>WhatsApp Message</Typography>
                </Box>

                <TextField
                    label="WhatsApp Message"
                    fullWidth
                    multiline
                    rows={5}
                    size="small"
                    value={tmpl.whatsapp_body || ''}
                    onChange={e => setField('whatsapp_body', e.target.value)}
                    onSelect={e => trackCursor('whatsapp_body', e)}
                    onClick={e => trackCursor('whatsapp_body', e)}
                    onKeyUp={e => trackCursor('whatsapp_body', e)}
                    placeholder={`Hello {{customer_name}},\n\nYour ${DOC_TYPES[tab].label} {{document_number}} for ₹{{amount}} is ready.\nDate: {{date}}\n\nThank you — SASI ERP`}
                    sx={{ mb: 1 }}
                />

                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, lineHeight: '24px' }}>
                        Insert:
                    </Typography>
                    {PLACEHOLDERS.map(p => (
                        <Chip
                            key={p.tag}
                            label={p.tag}
                            size="small"
                            onClick={() => insertPlaceholder('whatsapp_body', p.tag)}
                            sx={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: 11 }}
                        />
                    ))}
                </Box>
            </Paper>

            <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{ textTransform: 'none', borderRadius: 2 }}
            >
                {saving ? 'Saving…' : `Save ${DOC_TYPES[tab].label} Template`}
            </Button>
        </Box>
    );
}
