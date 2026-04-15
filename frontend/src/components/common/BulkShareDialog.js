// ============================================================
// FILE: src/components/common/BulkShareDialog.js
// PURPOSE: Bulk share dialog — shown when user selects multiple
//          rows and clicks "Share Selected". Lists each customer
//          with individual Email and WhatsApp buttons.
//          Templates auto-loaded from Settings > Message Templates.
// ============================================================

import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Box, Typography, IconButton, Divider, Chip,
} from '@mui/material';
import CloseIcon  from '@mui/icons-material/Close';
import ShareIcon  from '@mui/icons-material/Share';
import EmailIcon  from '@mui/icons-material/Email';
import ChatIcon   from '@mui/icons-material/Chat';
import { fetchTemplates, fillTemplate } from '../../utils/messageTemplates';

export default function BulkShareDialog({ open, onClose, docType, rows }) {
    // rows: array of { id, title, email, phone, vars: { customer_name, document_number, amount, date } }
    const [templates, setTemplates] = useState({});

    useEffect(() => {
        if (!open) return;
        fetchTemplates().then(setTemplates);
    }, [open]);

    const tmpl = templates[docType] || {};

    const getEmailHref = (row) => {
        const subj = fillTemplate(tmpl.email_subject || `${row.title} — MEI TEXZ ERP`, row.vars);
        const body = fillTemplate(tmpl.email_body    || row.title, row.vars);
        return `mailto:${row.email || ''}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    };

    const getWaHref = (row) => {
        const text  = fillTemplate(tmpl.whatsapp_body || row.title, row.vars);
        const phone = (row.phone || '').replace(/\D/g, '');
        return phone
            ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
            : `https://wa.me/?text=${encodeURIComponent(text)}`;
    };

    const openAll = (type) => {
        rows.forEach((row, i) => {
            setTimeout(() => {
                const href = type === 'email' ? getEmailHref(row) : getWaHref(row);
                window.open(href, type === 'email' ? '_self' : '_blank');
            }, i * 600);   // stagger 600ms so browser doesn't block all at once
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShareIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Typography fontWeight={700}>Bulk Share — {rows.length} document{rows.length !== 1 ? 's' : ''}</Typography>
                </Box>
                <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }}>
                {/* Quick send all */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<EmailIcon />}
                        onClick={() => openAll('email')}
                        sx={{ bgcolor: '#ea4335', '&:hover': { bgcolor: '#c5221f' }, textTransform: 'none' }}
                    >
                        Email All ({rows.length})
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<ChatIcon />}
                        onClick={() => openAll('whatsapp')}
                        sx={{ bgcolor: '#25d366', '&:hover': { bgcolor: '#1ebe59' }, textTransform: 'none', color: '#fff' }}
                    >
                        WhatsApp All ({rows.length})
                    </Button>
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 0.5 }}>
                        Opens {rows.length} tab{rows.length !== 1 ? 's' : ''} — allow popups if prompted
                    </Typography>
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                {/* Per-customer list */}
                <Typography variant="caption" fontWeight={700} color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                    Or send individually
                </Typography>

                {rows.map((row, i) => (
                    <Box key={row.id || i} sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        py: 1, borderBottom: i < rows.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                    }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontWeight={600} fontSize={13} noWrap>{row.title}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                                {row.vars?.customer_name}
                                {row.email && ` · ${row.email}`}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                            {row.email ? (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<EmailIcon />}
                                    href={getEmailHref(row)}
                                    sx={{ textTransform: 'none', fontSize: 12, borderColor: '#ea4335', color: '#ea4335',
                                          '&:hover': { bgcolor: '#fce8e6' } }}
                                >
                                    Email
                                </Button>
                            ) : (
                                <Chip label="No email" size="small" color="default" variant="outlined" />
                            )}

                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ChatIcon />}
                                onClick={() => window.open(getWaHref(row), '_blank')}
                                sx={{ textTransform: 'none', fontSize: 12, borderColor: '#25d366', color: '#25d366',
                                      '&:hover': { bgcolor: '#e8f9ee' } }}
                            >
                                WhatsApp
                            </Button>
                        </Box>
                    </Box>
                ))}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
