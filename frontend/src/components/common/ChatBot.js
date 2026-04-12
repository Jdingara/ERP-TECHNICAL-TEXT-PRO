// ============================================================
// FILE: components/common/ChatBot.js
// PURPOSE: Floating ERP chatbot widget — answers natural language
//          questions about sales, invoices, machines, inventory.
//          Works without API key via pattern matching.
//          With ANTHROPIC_API_KEY, uses Claude for any question.
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, IconButton,
    Chip, Tooltip, CircularProgress, Fade, Avatar,
} from '@mui/material';
import SmartToyIcon     from '@mui/icons-material/SmartToy';
import SendIcon         from '@mui/icons-material/Send';
import CloseIcon        from '@mui/icons-material/Close';
import PersonIcon       from '@mui/icons-material/Person';
import LaunchIcon       from '@mui/icons-material/Launch';
import MicIcon          from '@mui/icons-material/Mic';
import MicOffIcon       from '@mui/icons-material/MicOff';

// ── Navigation command map ────────────────────────────────────
// Each entry: { keywords: [...], path: '...', label: '...' }
// Keywords are matched against the lowercased user input.
// Any word from the array matching anywhere in the message triggers navigation.
const NAV_COMMANDS = [
    // Dashboard
    { keywords: ['dashboard', 'home', 'main page', 'start'],
      path: '/dashboard',                              label: 'Dashboard' },
    // Sales
    { keywords: ['sales order', 'sales orders', 'so list', 'open so', 'order list'],
      path: '/sales/sales-orders',                    label: 'Sales Orders' },
    { keywords: ['create sales order', 'new sales order', 'new so', 'make sales order'],
      path: '/sales/create-sales-order',              label: 'Create Sales Order' },
    { keywords: ['invoice', 'invoices'],
      path: '/sales/invoices',                        label: 'Invoices' },
    { keywords: ['new invoice', 'create invoice'],
      path: '/sales/invoices/new',                    label: 'New Invoice' },
    { keywords: ['quotation', 'quotations', 'quote', 'quotes'],
      path: '/sales/quotations',                      label: 'Quotations' },
    { keywords: ['new quotation', 'create quotation', 'new quote'],
      path: '/sales/quotations/new',                  label: 'New Quotation' },
    { keywords: ['inquiry', 'inquiries', 'enquiry', 'enquiries', 'customer inquiry'],
      path: '/sales/inquiries',                       label: 'Customer Inquiries' },
    { keywords: ['new inquiry', 'new enquiry', 'create inquiry'],
      path: '/sales/inquiries/new',                   label: 'New Inquiry' },
    { keywords: ['order journey', 'journey'],
      path: '/sales/order-journey',                   label: 'Order Journey' },
    // Purchasing
    { keywords: ['purchase order', 'purchase orders', 'po list', 'open po'],
      path: '/purchasing/purchase-orders',            label: 'Purchase Orders' },
    { keywords: ['create purchase order', 'new purchase order', 'new po'],
      path: '/purchasing/create-purchase-order',      label: 'Create Purchase Order' },
    { keywords: ['goods receipt', 'grn', 'goods received'],
      path: '/purchasing/goods-receipt',              label: 'Goods Receipt' },
    // Inventory
    { keywords: ['stock', 'inventory', 'stock list'],
      path: '/inventory/stock-list',                  label: 'Stock List' },
    { keywords: ['stock movement', 'movements'],
      path: '/inventory/stock-movement',              label: 'Stock Movements' },
    // Master Data
    { keywords: ['customer', 'customers', 'customer list'],
      path: '/master-data/customers',                 label: 'Customers' },
    { keywords: ['supplier', 'suppliers', 'vendor', 'vendors'],
      path: '/master-data/suppliers',                 label: 'Suppliers' },
    { keywords: ['item', 'items', 'product', 'products', 'item list'],
      path: '/master-data/items',                     label: 'Items & Products' },
    { keywords: ['warehouse', 'warehouses'],
      path: '/master-data/warehouses',                label: 'Warehouses' },
    // Production
    { keywords: ['work order', 'work orders', 'production order'],
      path: '/production/work-orders',                label: 'Work Orders' },
    { keywords: ['machine', 'machines', 'machine list'],
      path: '/production/machines',                   label: 'Machines' },
    { keywords: ['quality', 'quality check', 'quality checks'],
      path: '/production/quality-checks',             label: 'Quality Checks' },
    { keywords: ['batch', 'batches', 'production batch'],
      path: '/production/batches',                    label: 'Production Batches' },
    { keywords: ['bom', 'bill of material', 'bill of materials'],
      path: '/production/bill-of-materials',          label: 'Bill of Materials' },
    // Finance
    { keywords: ['journal', 'journal entry', 'journal entries'],
      path: '/finance/journal-entries',               label: 'Journal Entries' },
    { keywords: ['chart of accounts', 'accounts', 'coa'],
      path: '/finance/chart-of-accounts',             label: 'Chart of Accounts' },
    { keywords: ['trial balance'],
      path: '/finance/trial-balance',                 label: 'Trial Balance' },
    // HR
    { keywords: ['employee', 'employees', 'staff'],
      path: '/hr-payroll/employees',                  label: 'Employees' },
    { keywords: ['attendance', 'leave'],
      path: '/hr-payroll/attendance',                 label: 'Attendance' },
    { keywords: ['salary', 'payroll', 'payslip'],
      path: '/hr-payroll/salary',                     label: 'Salary & Payroll' },
    // Technical Textile
    { keywords: ['performance spec', 'performance specs', 'specifications'],
      path: '/technical-textile/performance-specs',   label: 'Performance Specs' },
    { keywords: ['sample', 'samples', 'sample management'],
      path: '/technical-textile/samples',             label: 'Sample Management' },
    { keywords: ['data sheet', 'data sheets', 'tds'],
      path: '/technical-textile/data-sheets',         label: 'Technical Data Sheets' },
    { keywords: ['testing lab', 'lab', 'lab records'],
      path: '/technical-textile/testing-lab',         label: 'Testing Lab' },
    { keywords: ['r&d', 'rd project', 'research', 'rd projects'],
      path: '/technical-textile/rd-projects',         label: 'R&D Projects' },
    // Medical Textile
    { keywords: ['compliance', 'regulatory'],
      path: '/medical-textile/compliance',            label: 'Regulatory Compliance' },
    { keywords: ['capa'],
      path: '/medical-textile/capa',                  label: 'CAPA Management' },
    { keywords: ['sterility', 'sterile'],
      path: '/medical-textile/sterility',             label: 'Sterility Records' },
    { keywords: ['shelf life', 'expiry'],
      path: '/medical-textile/shelf-life',            label: 'Shelf Life Tracking' },
    // Reports
    { keywords: ['sales report'],
      path: '/reports/sales',                         label: 'Sales Report' },
    { keywords: ['production report'],
      path: '/reports/production',                    label: 'Production Report' },
    { keywords: ['inventory report', 'stock report'],
      path: '/reports/inventory',                     label: 'Inventory Report' },
    { keywords: ['finance report', 'financial report'],
      path: '/reports/finance',                       label: 'Finance Report' },
    { keywords: ['hr report', 'payroll report'],
      path: '/reports/hr',                            label: 'HR Report' },
    { keywords: ['report maker', 'custom report'],
      path: '/reports/maker/list',                    label: 'Report Maker' },
    // Analytics & Feed
    { keywords: ['customer intelligence', 'analytics', 'rfm', 'churn', 'forecast'],
      path: '/analytics/customer-intelligence',       label: 'Customer Intelligence' },
    { keywords: ['smart feed', 'feed', 'business feed', 'insights feed'],
      path: '/feed',                                  label: 'Smart Feed' },
    // Settings
    { keywords: ['format panel', 'document format', 'numbering'],
      path: '/settings/format-panel',                 label: 'Format Panel' },
    { keywords: ['message template', 'templates', 'whatsapp template'],
      path: '/settings/message-templates',            label: 'Message Templates' },
    // Activity
    { keywords: ['activity log', 'audit', 'log'],
      path: '/audit/activity-log',                    label: 'Activity Log' },
];

// Words that signal intent to navigate (open/go to/show/take me to/close etc.)
const NAV_INTENT = ['open', 'go to', 'go', 'show', 'show me', 'take me', 'navigate', 'launch', 'load', 'jump to', 'switch to', 'close', 'back to'];

function _resolveNavCommand(input) {
    const m = input.toLowerCase().trim();

    // "close" with no other target = close the chatbot (handled in caller)
    if (['close', 'close chat', 'close chatbot', 'bye', 'goodbye', 'exit'].includes(m)) {
        return { close: true };
    }

    // Check if input contains a nav intent verb OR just a page keyword directly
    const hasIntent = NAV_INTENT.some(v => m.startsWith(v) || m.includes(' ' + v + ' '));

    for (const cmd of NAV_COMMANDS) {
        for (const kw of cmd.keywords) {
            if (m.includes(kw)) {
                // Either user said "open X" or just typed the page name alone
                if (hasIntent || m === kw || m === 'open ' + kw || m === 'show ' + kw) {
                    return { path: cmd.path, label: cmd.label };
                }
            }
        }
    }
    return null;
}

// ── Markdown-like renderer (bold + bullets) ───────────────────
function MsgText({ text }) {
    const parts = text.split('\n');
    return (
        <Box>
            {parts.map((line, i) => {
                // Bold: **text**
                const rendered = line.split(/(\*\*[^*]+\*\*)/).map((seg, j) =>
                    seg.startsWith('**') && seg.endsWith('**')
                        ? <strong key={j}>{seg.slice(2, -2)}</strong>
                        : seg
                );
                // Bullet point
                const isBullet = line.trim().startsWith('•') || line.trim().startsWith('*') || line.trim().startsWith('-');
                return (
                    <Typography
                        key={i}
                        fontSize={13}
                        lineHeight={1.6}
                        component="div"
                        sx={{ pl: isBullet ? 1 : 0, mt: i > 0 && line.trim() === '' ? 0.5 : 0 }}
                    >
                        {rendered}
                    </Typography>
                );
            })}
        </Box>
    );
}

// ── Suggested questions ───────────────────────────────────────
const SUGGESTIONS = [
    { label: "Today's summary",       nav: false },
    { label: 'Last 7 days summary',   nav: false },
    { label: 'Last 10 days revenue',  nav: false },
    { label: 'Last 30 days orders',   nav: false },
    { label: 'This week sales',       nav: false },
    { label: 'This month revenue',    nav: false },
    { label: 'Last month report',     nav: false },
    { label: 'Overdue invoices',      nav: false },
    { label: 'Machine status',        nav: false },
    { label: 'Top customers',         nav: false },
    { label: 'Open sales orders',     nav: true  },
    { label: 'Open invoices',         nav: true  },
    { label: 'Open dashboard',        nav: true  },
    { label: 'Open customers',        nav: true  },
    { label: 'Open stock',            nav: true  },
];

// ── Chat message ──────────────────────────────────────────────
function Message({ msg }) {
    const isBot = msg.role === 'bot';
    return (
        <Box display="flex" gap={1} justifyContent={isBot ? 'flex-start' : 'flex-end'} mb={1.5}>
            {isBot && (
                <Avatar sx={{ width: 28, height: 28, backgroundColor: 'primary.main', flexShrink: 0, mt: 0.3 }}>
                    <SmartToyIcon sx={{ fontSize: 16 }} />
                </Avatar>
            )}
            <Box
                sx={{
                    maxWidth: '82%',
                    px: 1.5, py: 1,
                    borderRadius: isBot ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                    backgroundColor: isBot ? 'background.paper' : 'primary.main',
                    color: isBot ? 'text.primary' : 'primary.contrastText',
                    boxShadow: 1,
                    border: isBot ? '1px solid' : 'none',
                    borderColor: 'divider',
                }}
            >
                {msg.loading ? (
                    <Box display="flex" gap={0.5} alignItems="center" height={20}>
                        {[0,1,2].map(i => (
                            <Box key={i} sx={{
                                width: 6, height: 6, borderRadius: '50%',
                                backgroundColor: 'text.secondary',
                                animation: 'chatBounce 1.2s infinite',
                                animationDelay: `${i * 0.2}s`,
                            }} />
                        ))}
                    </Box>
                ) : isBot ? (
                    <MsgText text={msg.text} />
                ) : (
                    <Typography fontSize={13}>{msg.text}</Typography>
                )}
            </Box>
            {!isBot && (
                <Avatar sx={{ width: 28, height: 28, backgroundColor: 'grey.400', flexShrink: 0, mt: 0.3 }}>
                    <PersonIcon sx={{ fontSize: 16 }} />
                </Avatar>
            )}
        </Box>
    );
}

// ── Main ChatBot widget ───────────────────────────────────────
export default function ChatBot() {
    const navigate = useNavigate();
    const [open,     setOpen]     = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: 'Hello! 👋 I\'m your SASI ERP assistant.\n\nAsk me anything or say **open** + a page name:\n• *Open sales orders*\n• *Open invoices*\n• *Open dashboard*\n• *How many machines broke down?*\n• *This month\'s revenue?*',
            id: 0,
        }
    ]);
    const [input,    setInput]    = useState('');
    const [loading,  setLoading]  = useState(false);
    const [unread,   setUnread]   = useState(0);
    const [listening, setListening] = useState(false);
    const bottomRef = useRef(null);
    const inputRef  = useRef(null);
    const recognitionRef = useRef(null);

    // ── Voice recognition setup ───────────────────────────────
    const voiceSupported = typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    const startVoice = () => {
        if (!voiceSupported || listening) return;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.lang = 'en-IN';
        rec.continuous = false;
        rec.interimResults = false;
        recognitionRef.current = rec;

        rec.onstart  = () => setListening(true);
        rec.onend    = () => setListening(false);
        rec.onerror  = () => setListening(false);
        rec.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            setInput(transcript);
            // auto-send after brief pause so user sees what was heard
            setTimeout(() => send(transcript), 400);
        };
        rec.start();
    };

    const stopVoice = () => {
        recognitionRef.current?.stop();
        setListening(false);
    };

    useEffect(() => {
        if (open) {
            setUnread(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const addBotMsg = (text) =>
        setMessages(prev => [...prev.filter(m => !m.loading), { role: 'bot', text, id: Date.now() + 2 }]);

    const send = async (text) => {
        const q = (text || input).trim();
        if (!q || loading) return;
        setInput('');

        // ── Navigation command — instant, no backend call ──────
        const nav = _resolveNavCommand(q);
        if (nav) {
            setMessages(prev => [...prev, { role: 'user', text: q, id: Date.now() }]);
            if (nav.close) {
                setOpen(false);
                addBotMsg('See you! 👋');
            } else {
                addBotMsg(`Opening **${nav.label}**… ✅`);
                setTimeout(() => { navigate(nav.path); setOpen(false); }, 600);
            }
            return;
        }

        const userMsg = { role: 'user', text: q, id: Date.now() };
        const loadMsg = { role: 'bot', loading: true, id: Date.now() + 1 };
        setMessages(prev => [...prev, userMsg, loadMsg]);
        setLoading(true);

        try {
            const res  = await fetch('/api/chat/', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: q }),
            });
            const data = await res.json();
            setMessages(prev => [
                ...prev.filter(m => !m.loading),
                { role: 'bot', text: data.reply || 'Sorry, I could not get an answer.', id: Date.now() + 2 },
            ]);
            if (!open) setUnread(n => n + 1);
        } catch {
            setMessages(prev => [
                ...prev.filter(m => !m.loading),
                { role: 'bot', text: 'Could not reach the server. Please check if the backend is running.', id: Date.now() + 2 },
            ]);
        }
        setLoading(false);
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    return (
        <>
            {/* Bounce keyframes */}
            <style>{`
                @keyframes chatBounce {
                    0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
                @keyframes chatPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                }
            `}</style>

            {/* Chat window */}
            <Fade in={open}>
                <Paper sx={{
                    position: 'fixed', bottom: 90, right: 24, zIndex: 1300,
                    width: 360, height: 520,
                    borderRadius: 3, boxShadow: 8,
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    display: open ? 'flex' : 'none',
                }}>
                    {/* Header */}
                    <Box sx={{
                        background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark || theme.palette.primary.main}, ${theme.palette.primary.main})`,
                        px: 2, py: 1.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <SmartToyIcon sx={{ color: 'white', fontSize: 20 }} />
                            <Box>
                                <Typography fontSize={14} fontWeight={700} color="white">SASI Assistant</Typography>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#4ade80' }} />
                                    <Typography fontSize={10} sx={{ color: 'rgba(255,255,255,0.8)' }}>Online — ERP data live</Typography>
                                </Box>
                            </Box>
                        </Box>
                        <Box>
                            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>

                    {/* Messages */}
                    <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, backgroundColor: 'background.default' }}>
                        {messages.map(msg => <Message key={msg.id} msg={msg} />)}
                        <div ref={bottomRef} />
                    </Box>

                    {/* Suggestions */}
                    <Box sx={{ px: 2, pt: 0.5, pb: 0.5, backgroundColor: 'background.default', borderTop: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap', overflowX: 'auto', pb: 0.5,
                            '&::-webkit-scrollbar': { height: 3 },
                            '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 2 },
                        }}>
                            {SUGGESTIONS.map(s => (
                                <Chip
                                    key={s.label}
                                    label={s.label}
                                    size="small"
                                    icon={s.nav ? <LaunchIcon style={{ fontSize: 11 }} /> : undefined}
                                    onClick={() => send(s.label)}
                                    sx={{
                                        cursor: 'pointer', fontSize: 11, flexShrink: 0,
                                        ...(s.nav ? {
                                            borderColor: 'primary.main', color: 'primary.main',
                                            border: '1px solid',
                                        } : {}),
                                        '&:hover': { backgroundColor: 'primary.main', color: 'primary.contrastText',
                                                     '& .MuiChip-icon': { color: 'primary.contrastText' } },
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>

                    {/* Input */}
                    <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                        <TextField
                            inputRef={inputRef}
                            fullWidth size="small" multiline maxRows={3}
                            placeholder={listening ? '🎤 Listening…' : 'Ask anything or say "open invoices"…'}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            disabled={loading || listening}
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 13 },
                                ...(listening ? { '& fieldset': { borderColor: '#dc2626 !important', borderWidth: '2px !important' } } : {}),
                            }}
                        />

                        {/* Mic button */}
                        {voiceSupported && (
                            <Tooltip title={listening ? 'Stop listening' : 'Voice input'}>
                                <IconButton
                                    onClick={listening ? stopVoice : startVoice}
                                    sx={{
                                        width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                                        backgroundColor: listening ? '#dc2626' : 'action.hover',
                                        color: listening ? 'white' : 'text.secondary',
                                        animation: listening ? 'chatPulse 1s ease-in-out infinite' : 'none',
                                        '&:hover': { backgroundColor: listening ? '#b91c1c' : 'action.selected' },
                                    }}
                                >
                                    {listening ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                        )}

                        {/* Send button */}
                        <IconButton
                            onClick={() => send()}
                            disabled={loading || !input.trim()}
                            sx={{ backgroundColor: 'primary.main', color: 'white',
                                  width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                                  '&:hover': { backgroundColor: 'primary.dark' },
                                  '&.Mui-disabled': { backgroundColor: 'action.disabledBackground' },
                            }}
                        >
                            {loading ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <SendIcon fontSize="small" />}
                        </IconButton>
                    </Box>
                </Paper>
            </Fade>

            {/* Floating button */}
            <Tooltip title="Ask your ERP assistant" placement="left">
                <Box
                    onClick={() => setOpen(o => !o)}
                    sx={{
                        position: 'fixed', bottom: 24, right: 24, zIndex: 1300,
                        width: 56, height: 56, borderRadius: '50%',
                        background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark || theme.palette.primary.main}, ${theme.palette.primary.main})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', boxShadow: 6,
                        animation: 'chatPulse 3s ease-in-out infinite',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'scale(1.12)', animation: 'none' },
                    }}
                >
                    <SmartToyIcon sx={{ color: 'white', fontSize: 26 }} />
                    {unread > 0 && !open && (
                        <Box sx={{
                            position: 'absolute', top: -2, right: -2,
                            width: 18, height: 18, borderRadius: '50%',
                            backgroundColor: '#dc2626', color: 'white',
                            fontSize: 10, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {unread}
                        </Box>
                    )}
                </Box>
            </Tooltip>
        </>
    );
}
