// ============================================================
// FILE: components/common/ChatBot.js
// PURPOSE: Floating ERP chatbot widget — answers natural language
//          questions about sales, invoices, machines, inventory.
//          Works without API key via pattern matching.
//          With ANTHROPIC_API_KEY, uses Claude for any question.
// ============================================================

import { useState, useRef, useEffect } from 'react';
import {
    Box, Paper, Typography, TextField, IconButton,
    Chip, Tooltip, CircularProgress, Fade, Avatar,
} from '@mui/material';
import SmartToyIcon     from '@mui/icons-material/SmartToy';
import SendIcon         from '@mui/icons-material/Send';
import CloseIcon        from '@mui/icons-material/Close';
import MinimizeIcon     from '@mui/icons-material/Remove';
import PersonIcon       from '@mui/icons-material/Person';

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
    "Today's summary",
    'Sales orders today',
    'This month revenue',
    'Overdue invoices',
    'Machine status',
    'Top customers',
    'Low stock items',
    'Work orders',
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
    const [open,     setOpen]     = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: 'Hello! 👋 I\'m your SASI ERP assistant.\n\nAsk me anything about your business:\n• *How many sales orders today?*\n• *Which machines broke down?*\n• *What\'s this month\'s revenue?*\n• *Any overdue invoices?*',
            id: 0,
        }
    ]);
    const [input,    setInput]    = useState('');
    const [loading,  setLoading]  = useState(false);
    const [unread,   setUnread]   = useState(0);
    const bottomRef = useRef(null);
    const inputRef  = useRef(null);

    useEffect(() => {
        if (open) {
            setUnread(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async (text) => {
        const q = (text || input).trim();
        if (!q || loading) return;
        setInput('');

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
                                <Chip key={s} label={s} size="small" onClick={() => send(s)}
                                    sx={{ cursor: 'pointer', fontSize: 11, flexShrink: 0,
                                          '&:hover': { backgroundColor: 'primary.main', color: 'primary.contrastText' } }} />
                            ))}
                        </Box>
                    </Box>

                    {/* Input */}
                    <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1 }}>
                        <TextField
                            inputRef={inputRef}
                            fullWidth size="small" multiline maxRows={3}
                            placeholder="Ask anything about your ERP…"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            disabled={loading}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: 13 } }}
                        />
                        <IconButton
                            onClick={() => send()}
                            disabled={loading || !input.trim()}
                            color="primary"
                            sx={{ alignSelf: 'flex-end', backgroundColor: 'primary.main', color: 'white',
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
