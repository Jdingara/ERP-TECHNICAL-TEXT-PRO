// ============================================================
// FILE: pages/feed/SmartFeedPage.js
// PURPOSE: Smart Business Feed — personalised daily insights.
//          Mix of ERP data alerts + AI insight + curated tips,
//          books, courses, and market news. Refreshes daily.
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Chip, Button, CircularProgress,
    Alert, Grid, IconButton, Tooltip, Divider, ToggleButton,
    ToggleButtonGroup, Skeleton,
} from '@mui/material';
import RefreshIcon        from '@mui/icons-material/Refresh';
import MenuBookIcon       from '@mui/icons-material/MenuBook';
import SchoolIcon         from '@mui/icons-material/School';
import LightbulbIcon      from '@mui/icons-material/Lightbulb';
import TrendingUpIcon     from '@mui/icons-material/TrendingUp';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import InsightsIcon       from '@mui/icons-material/Insights';
import PsychologyIcon     from '@mui/icons-material/Psychology';
import OpenInNewIcon      from '@mui/icons-material/OpenInNew';
import LocalHospitalIcon  from '@mui/icons-material/LocalHospital';
import PublicIcon         from '@mui/icons-material/Public';
import RecyclingIcon      from '@mui/icons-material/Recycling';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AgricultureIcon    from '@mui/icons-material/Agriculture';
import LocalShippingIcon  from '@mui/icons-material/LocalShipping';
import VerifiedIcon       from '@mui/icons-material/Verified';
import PolicyIcon         from '@mui/icons-material/Policy';
import StarIcon           from '@mui/icons-material/Star';
import LoyaltyIcon        from '@mui/icons-material/Loyalty';
import PersonAddIcon      from '@mui/icons-material/PersonAdd';
import ReceiptLongIcon    from '@mui/icons-material/ReceiptLong';
import TrendingDownIcon   from '@mui/icons-material/TrendingDown';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

// ── Icon map from backend icon name ──────────────────────────
const ICON_MAP = {
    'warning':          <WarningAmberIcon />,
    'warning_amber':    <WarningAmberIcon />,
    'trending_up':      <TrendingUpIcon />,
    'trending_down':    <TrendingDownIcon />,
    'menu_book':        <MenuBookIcon />,
    'school':           <SchoolIcon />,
    'lightbulb':        <LightbulbIcon />,
    'psychology':       <PsychologyIcon />,
    'local_hospital':   <LocalHospitalIcon />,
    'public':           <PublicIcon />,
    'recycling':        <RecyclingIcon />,
    'account_balance':  <AccountBalanceIcon />,
    'agriculture':      <AgricultureIcon />,
    'local_shipping':   <LocalShippingIcon />,
    'verified':         <VerifiedIcon />,
    'policy':           <PolicyIcon />,
    'star':             <StarIcon />,
    'loyalty':          <LoyaltyIcon />,
    'person_add':       <PersonAddIcon />,
    'receipt_long':     <ReceiptLongIcon />,
    'inventory_2':      <InsightsIcon />,
    'inventory':        <InsightsIcon />,
    'insights':         <InsightsIcon />,
};

function CardIcon({ name, color }) {
    const icon = ICON_MAP[name] || <InsightsIcon />;
    return (
        <Box sx={{
            width: 44, height: 44, borderRadius: '50%',
            backgroundColor: color + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: color, flexShrink: 0,
        }}>
            {icon}
        </Box>
    );
}

// ── Type badge config ─────────────────────────────────────────
const TYPE_CONFIG = {
    alert:   { label: 'Alert',          bg: 'rgba(220,38,38,0.07)',   border: 'rgba(220,38,38,0.25)',   badge: '#dc2626' },
    insight: { label: 'Insight',        bg: 'rgba(29,78,216,0.07)',   border: 'rgba(29,78,216,0.25)',   badge: '#1d4ed8' },
    book:    { label: 'Book',           bg: 'rgba(21,128,61,0.07)',   border: 'rgba(21,128,61,0.25)',   badge: '#15803d' },
    course:  { label: 'Course',         bg: 'rgba(124,58,237,0.07)',  border: 'rgba(124,58,237,0.25)',  badge: '#7c3aed' },
    tip:     { label: 'Improvement Tip',bg: 'rgba(180,83,9,0.07)',    border: 'rgba(180,83,9,0.30)',    badge: '#b45309' },
    market:  { label: 'Market News',    bg: 'rgba(3,105,161,0.07)',   border: 'rgba(3,105,161,0.25)',   badge: '#0369a1' },
    ai:      { label: 'AI Insight',     bg: 'rgba(126,34,206,0.07)',  border: 'rgba(126,34,206,0.25)',  badge: '#7e22ce' },
};

const FILTER_OPTIONS = [
    { value: '',       label: 'All' },
    { value: 'alert',  label: '🚨 Alerts' },
    { value: 'insight',label: '📊 Insights' },
    { value: 'tip',    label: '💡 Tips' },
    { value: 'book',   label: '📚 Books' },
    { value: 'course', label: '🎓 Courses' },
    { value: 'market', label: '🌐 Market' },
    { value: 'ai',     label: '🤖 AI' },
];

// ── Individual Feed Card ──────────────────────────────────────
function FeedCard({ card, onNavigate }) {
    const cfg     = TYPE_CONFIG[card.type] || TYPE_CONFIG.insight;
    const isAlert = card.type === 'alert';
    const isAI    = card.type === 'ai';

    return (
        <Paper sx={{
            p: 2.5,
            borderRadius: 3,
            border: `1.5px solid ${cfg.border}`,
            backgroundColor: cfg.bg,
            boxShadow: isAlert ? '0 2px 12px rgba(220,38,38,0.08)' : '0 1px 6px rgba(0,0,0,0.06)',
            transition: 'transform 0.15s, box-shadow 0.15s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' },
        }}>
            {/* Top row */}
            <Box display="flex" gap={1.5} alignItems="flex-start">
                <CardIcon name={card.icon} color={card.color} />
                <Box flex={1} minWidth={0}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Chip
                            label={cfg.label}
                            size="small"
                            sx={{
                                backgroundColor: cfg.badge, color: 'white',
                                fontWeight: 700, fontSize: 10, height: 20,
                            }}
                        />
                        {isAI && (
                            <Chip label="Powered by Claude AI" size="small" variant="outlined"
                                sx={{ fontSize: 9, height: 18, color: '#7e22ce', borderColor: '#7e22ce' }} />
                        )}
                    </Box>

                    <Typography
                        fontWeight={700}
                        fontSize={14}
                        lineHeight={1.4}
                        mb={1}
                        sx={{ color: isAlert ? card.color : 'text.primary' }}
                    >
                        {card.title}
                    </Typography>

                    <Typography
                        fontSize={13}
                        color="text.secondary"
                        lineHeight={1.6}
                        sx={{ whiteSpace: 'pre-line' }}
                    >
                        {card.body}
                    </Typography>

                    {/* Metric badge */}
                    {card.metric && (
                        <Box mt={1.5} display="inline-flex" alignItems="center" gap={1}
                            sx={{ backgroundColor: card.color + '15', borderRadius: 2, px: 1.5, py: 0.75 }}>
                            <Typography fontSize={11} color="text.secondary">{card.metric.label}:</Typography>
                            <Typography fontSize={13} fontWeight={700} sx={{ color: card.color }}>
                                {card.metric.value}
                            </Typography>
                        </Box>
                    )}

                    {/* Action button */}
                    {card.action_label && card.action_path && (
                        <Box mt={1.5}>
                            <Button
                                size="small"
                                variant="outlined"
                                endIcon={<OpenInNewIcon fontSize="small" />}
                                onClick={() => onNavigate(card.action_path)}
                                sx={{
                                    borderColor: card.color, color: card.color,
                                    fontSize: 12, textTransform: 'none',
                                    '&:hover': { backgroundColor: card.color + '10', borderColor: card.color },
                                }}
                            >
                                {card.action_label}
                            </Button>
                        </Box>
                    )}
                </Box>
            </Box>
        </Paper>
    );
}

// ── Skeleton card for loading state ──────────────────────────
function FeedCardSkeleton() {
    return (
        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1.5px solid', borderColor: 'divider' }}>
            <Box display="flex" gap={1.5}>
                <Skeleton variant="circular" width={44} height={44} />
                <Box flex={1}>
                    <Skeleton width="20%" height={20} sx={{ mb: 0.5 }} />
                    <Skeleton width="80%" height={22} sx={{ mb: 1 }} />
                    <Skeleton width="100%" />
                    <Skeleton width="90%" />
                    <Skeleton width="60%" />
                </Box>
            </Box>
        </Paper>
    );
}

// ── Main Page ─────────────────────────────────────────────────
export default function SmartFeedPage() {
    const navigate = useNavigate();
    const [feed,      setFeed]      = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [hasAI,     setHasAI]     = useState(false);
    const [filter,    setFilter]    = useState('');
    const [error,     setError]     = useState('');
    const [generated, setGenerated] = useState('');

    const loadFeed = async () => {
        setLoading(true);
        setError('');
        try {
            const res  = await fetch('/api/feed/', { credentials: 'include' });
            const data = await res.json();
            setFeed(data.feed || []);
            setHasAI(data.has_ai || false);
            setGenerated(data.generated || '');
        } catch (e) {
            setError('Could not load the feed. Please check your connection.');
        }
        setLoading(false);
    };

    useEffect(() => { loadFeed(); }, []);

    const filtered = filter ? feed.filter(c => c.type === filter) : feed;

    // Counts per type for filter badges
    const counts = {};
    feed.forEach(c => { counts[c.type] = (counts[c.type] || 0) + 1; });
    const alertCount = (counts['alert'] || 0);

    return (
        <Box sx={{ pb: 4 }}>
            {/* Header */}
            <Box sx={{
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark || theme.palette.primary.main} 0%, ${theme.palette.primary.main} 100%)`,
                borderRadius: 2, p: 2.5, mb: 3, color: 'white',
            }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <FiberManualRecordIcon sx={{ fontSize: 14, color: '#4ade80', animation: 'pulse 2s infinite' }} />
                        <Box>
                            <Typography variant="h5" fontWeight="bold">Smart Business Feed</Typography>
                            <Typography fontSize={12} sx={{ opacity: 0.75, mt: 0.3 }}>
                                Daily alerts, insights, tips, books &amp; market news — personalised for your business
                                {generated && ` · Updated ${generated}`}
                            </Typography>
                        </Box>
                    </Box>
                    <Tooltip title="Refresh feed">
                        <IconButton onClick={loadFeed} sx={{ color: 'white' }}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Alert banner if there are high-priority alerts */}
            {!loading && alertCount > 0 && (
                <Alert severity="error" sx={{ mb: 2, fontWeight: 600 }}>
                    {alertCount} business alert{alertCount > 1 ? 's' : ''} need your attention today — see below.
                </Alert>
            )}

            {/* AI status banner */}
            {!loading && hasAI && (
                <Alert severity="info" icon={<PsychologyIcon />} sx={{ mb: 2 }}>
                    <strong>AI Insights active</strong> — one card today is generated by Claude AI based on your real ERP data.
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Left: filter column */}
                <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, borderRadius: 2, position: 'sticky', top: 16 }}>
                        <Typography fontWeight={700} fontSize={13} mb={1.5}>Filter Feed</Typography>
                        <Box display="flex" flexDirection="column" gap={0.5}>
                            {FILTER_OPTIONS.map(opt => {
                                const cnt = opt.value ? (counts[opt.value] || 0) : feed.length;
                                return (
                                    <Box
                                        key={opt.value}
                                        onClick={() => setFilter(opt.value)}
                                        sx={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', px: 1.5, py: 0.75,
                                            borderRadius: 1.5, cursor: 'pointer',
                                            backgroundColor: filter === opt.value ? 'primary.main' : 'transparent',
                                            color: filter === opt.value ? 'primary.contrastText' : 'text.primary',
                                            '&:hover': { backgroundColor: filter === opt.value ? 'primary.main' : 'action.hover' },
                                        }}
                                    >
                                        <Typography fontSize={13} fontWeight={filter === opt.value ? 700 : 400}>
                                            {opt.label}
                                        </Typography>
                                        <Chip label={cnt} size="small"
                                            sx={{
                                                height: 18, fontSize: 10,
                                                backgroundColor: filter === opt.value ? 'rgba(255,255,255,0.25)' : 'action.hover',
                                                color: filter === opt.value ? 'white' : 'text.secondary',
                                            }} />
                                    </Box>
                                );
                            })}
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography fontSize={12} color="text.secondary" lineHeight={1.6}>
                            The feed refreshes daily. Data alerts are generated from your live ERP data. Tips, books, and market news rotate each day.
                        </Typography>

                        {!hasAI && (
                            <Box mt={2} p={1.5} sx={{ backgroundColor: 'action.hover', borderRadius: 2 }}>
                                <Typography fontSize={11} color="text.secondary" fontWeight={600} mb={0.5}>
                                    🤖 AI Insights not active
                                </Typography>
                                <Typography fontSize={11} color="text.secondary">
                                    Add <code>ANTHROPIC_API_KEY</code> to your <code>.env</code> file to enable personalised AI-powered business advice.
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Right: feed cards */}
                <Grid item xs={12} md={9}>
                    {loading ? (
                        <Box display="flex" flexDirection="column" gap={2}>
                            {[1,2,3,4,5].map(i => <FeedCardSkeleton key={i} />)}
                        </Box>
                    ) : filtered.length === 0 ? (
                        <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
                            <Typography color="text.secondary">No cards in this category.</Typography>
                        </Paper>
                    ) : (
                        <Box display="flex" flexDirection="column" gap={2}>
                            {filtered.map(card => (
                                <FeedCard
                                    key={card.id}
                                    card={card}
                                    onNavigate={navigate}
                                />
                            ))}
                        </Box>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
}
