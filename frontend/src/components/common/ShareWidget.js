// ============================================================
// FILE: src/components/common/ShareWidget.js
// PURPOSE: Reusable share button + dialog. Email and WhatsApp
//          work immediately (free). All other platform buttons
//          are built and ready — just plug in the API key when
//          the customer buys that integration.
// ============================================================

import { useState, useEffect } from 'react';
import { fetchTemplates, fillTemplate } from '../../utils/messageTemplates';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Box, Typography, Divider, Tooltip, IconButton, Chip,
} from '@mui/material';
import ShareIcon       from '@mui/icons-material/Share';
import CloseIcon       from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon        from '@mui/icons-material/Lock';

// ── Platform definitions ──────────────────────────────────────
// status: 'live'    → works now (free)
// status: 'api'     → button ready, needs API key to activate
// region: label shown under platform name
const PLATFORMS = [
    // ── LIVE NOW ─────────────────────────────────────────────
    {
        key:     'email',
        label:   'Email',
        region:  'Universal',
        status:  'live',
        color:   '#ea4335',
        bg:      '#fce8e6',
        icon:    '✉️',
        description: 'Opens your default email app with details pre-filled.',
    },
    {
        key:     'whatsapp',
        label:   'WhatsApp',
        region:  'Universal · India · USA',
        status:  'live',
        color:   '#25d366',
        bg:      '#e8f9ee',
        icon:    '💬',
        description: 'Opens WhatsApp Web with message pre-filled.',
    },

    // ── API READY ─────────────────────────────────────────────
    {
        key:     'sms_india',
        label:   'SMS (India)',
        region:  'India — MSG91 / Textlocal / Exotel',
        status:  'api',
        color:   '#ff6600',
        bg:      '#fff3e0',
        icon:    '📱',
        description: 'Send SMS to customer mobile. Requires MSG91 / Textlocal API key.',
        apiLink: 'https://msg91.com',
    },
    {
        key:     'sms_usa',
        label:   'SMS (USA)',
        region:  'USA — Twilio',
        status:  'api',
        color:   '#f22f46',
        bg:      '#fde8ea',
        icon:    '📲',
        description: 'Send SMS via Twilio. Requires Twilio Account SID + Auth Token.',
        apiLink: 'https://twilio.com',
    },
    {
        key:     'telegram',
        label:   'Telegram',
        region:  'Universal',
        status:  'api',
        color:   '#229ed9',
        bg:      '#e3f2fd',
        icon:    '✈️',
        description: 'Send via Telegram Bot. Requires a Telegram Bot API token.',
        apiLink: 'https://core.telegram.org/bots',
    },
    {
        key:     'whatsapp_business',
        label:   'WhatsApp Business',
        region:  'India · USA — Meta Cloud API',
        status:  'api',
        color:   '#128c7e',
        bg:      '#e0f7f4',
        icon:    '🏢',
        description: 'Send automated WhatsApp messages from your business number. Requires Meta Business API approval.',
        apiLink: 'https://developers.facebook.com/docs/whatsapp',
    },
    {
        key:     'facebook',
        label:   'Facebook Messenger',
        region:  'Universal — Meta',
        status:  'api',
        color:   '#0866ff',
        bg:      '#e7f0ff',
        icon:    '📘',
        description: 'Send via Facebook Messenger. Requires Meta Business Page + API token.',
        apiLink: 'https://developers.facebook.com/docs/messenger-platform',
    },
    {
        key:     'instagram',
        label:   'Instagram DM',
        region:  'Universal — Meta',
        status:  'api',
        color:   '#e1306c',
        bg:      '#fce4ec',
        icon:    '📷',
        description: 'Send via Instagram Direct Messages. Requires Meta Business API.',
        apiLink: 'https://developers.facebook.com/docs/instagram-api',
    },
    {
        key:     'linkedin',
        label:   'LinkedIn',
        region:  'Universal — B2B',
        status:  'api',
        color:   '#0a66c2',
        bg:      '#e8f0fb',
        icon:    '💼',
        description: 'Share to LinkedIn. Requires LinkedIn API credentials.',
        apiLink: 'https://developer.linkedin.com',
    },
    {
        key:     'slack',
        label:   'Slack',
        region:  'Universal — Teams',
        status:  'api',
        color:   '#4a154b',
        bg:      '#f4e6f4',
        icon:    '⚡',
        description: 'Post to a Slack channel. Requires a Slack Webhook URL or Bot token.',
        apiLink: 'https://api.slack.com',
    },
];

// ── Main ShareWidget component ────────────────────────────────
// Usage A — document-based (Quotation / SO / Invoice):
//   <ShareWidget docType="invoice" vars={{ customer_name, document_number, amount, date }}
//                email={inv.customer_email} phone={inv.customer_phone} title="Invoice INV-001" />
//
// Usage B — manual message (Reports / ReportToolbar):
//   <ShareWidget title="Sales Report" message="..." subject="..." onPrint={fn} />
export default function ShareWidget({
    title    = 'Document',   // shown in dialog header
    docType  = '',           // 'quotation' | 'sales_order' | 'invoice'  (loads template)
    vars     = {},           // { customer_name, document_number, amount, date }
    message  = '',           // fallback if no docType
    email    = '',           // recipient email
    phone    = '',           // recipient phone for WhatsApp
    subject  = '',           // email subject override (used when no docType)
    onPrint  = null,         // used only in report pages (PDF download before email)
}) {
    const [open,    setOpen]    = useState(false);
    const [apiInfo, setApiInfo] = useState(null);

    // Resolved subject / body from template or props
    const [emailSubject, setEmailSubject] = useState(subject || `${title} — MEI TEXZ ERP`);
    const [emailBody,    setEmailBody]    = useState(message || title);
    const [waBody,       setWaBody]       = useState(message || title);

    // Load message templates when dialog opens (only for document types)
    useEffect(() => {
        if (!open || !docType) return;
        fetchTemplates().then(templates => {
            const tmpl = templates[docType];
            if (!tmpl) return;
            const filled = (text) => fillTemplate(text, vars);
            if (tmpl.email_subject) setEmailSubject(filled(tmpl.email_subject));
            if (tmpl.email_body)    setEmailBody(filled(tmpl.email_body));
            if (tmpl.whatsapp_body) setWaBody(filled(tmpl.whatsapp_body));
        });
    }, [open, docType, vars]); // eslint-disable-line react-hooks/exhaustive-deps

    const waPhone = phone ? phone.replace(/\D/g, '') : '';

    const handleShare = (platform) => {
        if (platform.status === 'api') {
            setApiInfo(apiInfo?.key === platform.key ? null : platform);
            return;
        }

        if (platform.key === 'email') {
            if (onPrint) {
                // Report pages: trigger print/PDF first, then open email
                onPrint();
                setTimeout(() => {
                    const href = `mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                    window.open(href, '_self');
                }, 1200);
            } else {
                const href = `mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                window.open(href, '_self');
            }
        }

        if (platform.key === 'whatsapp') {
            const text = encodeURIComponent(waBody);
            const base = waPhone
                ? `https://wa.me/${waPhone}?text=${text}`
                : `https://wa.me/?text=${text}`;
            window.open(base, '_blank');
        }
    };

    const livePlatforms = PLATFORMS.filter(p => p.status === 'live');
    const apiPlatforms  = PLATFORMS.filter(p => p.status === 'api');

    return (
        <>
            {/* ── Trigger button ── */}
            <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={() => setOpen(true)}
                size="small"
                sx={{ textTransform: 'none', borderRadius: 2 }}
            >
                Share
            </Button>

            {/* ── Dialog ── */}
            <Dialog open={open} onClose={() => { setOpen(false); setApiInfo(null); }}
                maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ShareIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                        <Typography fontWeight={700}>Share — {title}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => { setOpen(false); setApiInfo(null); }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ pt: 0 }}>

                    {/* ── Message preview ── */}
                    {emailBody && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary"
                                sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Message Preview
                            </Typography>
                            <Box sx={{
                                mt: 0.5, p: 1.5, bgcolor: 'action.hover',
                                borderRadius: 1.5, fontSize: 12.5, color: 'text.secondary',
                                whiteSpace: 'pre-line', maxHeight: 120, overflowY: 'auto',
                                border: '1px solid', borderColor: 'divider',
                            }}>
                                {emailBody}
                            </Box>
                        </Box>
                    )}

                    {/* ── Live platforms ── */}
                    <Typography variant="caption" fontWeight={700} color="success.main"
                        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircleIcon sx={{ fontSize: 13 }} /> Available Now — No setup needed
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 1, mb: 2.5, flexWrap: 'wrap' }}>
                        {livePlatforms.map(p => (
                            <PlatformButton key={p.key} platform={p} onClick={() => handleShare(p)} />
                        ))}
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {/* ── API-ready platforms ── */}
                    <Typography variant="caption" fontWeight={700} color="text.secondary"
                        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LockIcon sx={{ fontSize: 13 }} /> API-Ready — Connect when needed
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5 }}>
                        Buttons are built. Buy the API → provide the key → instantly activated.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: apiInfo ? 1.5 : 0 }}>
                        {apiPlatforms.map(p => (
                            <PlatformButton key={p.key} platform={p} onClick={() => handleShare(p)}
                                active={apiInfo?.key === p.key} />
                        ))}
                    </Box>

                    {/* ── API info card ── */}
                    {apiInfo && (
                        <Box sx={{
                            mt: 1.5, p: 2, borderRadius: 2,
                            border: '1px solid', borderColor: 'divider',
                            bgcolor: apiInfo.bg,
                        }}>
                            <Typography fontWeight={700} fontSize={13} sx={{ mb: 0.5 }}>
                                {apiInfo.icon} {apiInfo.label} Integration
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {apiInfo.description}
                            </Typography>
                            <Typography variant="caption" fontWeight={700} color="text.secondary">
                                Region: {apiInfo.region}
                            </Typography>
                            <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip label="API key required" size="small" color="warning" variant="outlined" />
                                <Chip label="Contact ERP admin to activate" size="small" variant="outlined" />
                            </Box>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => { setOpen(false); setApiInfo(null); }}
                        sx={{ textTransform: 'none' }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

// ── Individual platform button ─────────────────────────────────
function PlatformButton({ platform, onClick, active }) {
    const isApi = platform.status === 'api';
    return (
        <Tooltip title={isApi ? `${platform.label} — click to learn more` : platform.description} arrow>
            <Box
                onClick={onClick}
                sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 0.5, cursor: 'pointer', p: 1.2, borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: active ? platform.color : 'divider',
                    bgcolor: active ? platform.bg : 'background.paper',
                    minWidth: 70,
                    opacity: isApi ? 0.75 : 1,
                    transition: 'all 0.15s',
                    position: 'relative',
                    '&:hover': {
                        borderColor: platform.color,
                        bgcolor: platform.bg,
                        opacity: 1,
                        transform: 'translateY(-1px)',
                        boxShadow: 2,
                    },
                }}
            >
                {isApi && (
                    <LockIcon sx={{
                        position: 'absolute', top: 4, right: 4,
                        fontSize: 10, color: 'text.disabled',
                    }} />
                )}
                <span style={{ fontSize: 22 }}>{platform.icon}</span>
                <Typography variant="caption" fontWeight={600} fontSize={10.5} textAlign="center"
                    sx={{ color: 'text.primary', lineHeight: 1.2 }}>
                    {platform.label}
                </Typography>
            </Box>
        </Tooltip>
    );
}
