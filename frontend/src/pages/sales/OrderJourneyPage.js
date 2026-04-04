// ============================================================
// FILE: pages/sales/OrderJourneyPage.js
// PURPOSE: End-to-end order journey tracker.
//          Shows the full pipeline:
//          Inquiry → Quotation → Sales Order → Production → Dispatch
// ============================================================

import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Chip, LinearProgress,
    TextField, InputAdornment, Table, TableHead, TableRow,
    TableCell, TableBody, Tooltip, Collapse, IconButton,
} from '@mui/material';
import SearchIcon          from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon   from '@mui/icons-material/KeyboardArrowUp';
import RouteIcon           from '@mui/icons-material/Route';

// ── Stage definitions ──────────────────────────────────────
const STAGES = [
    { key: 'inquiry',    label: 'Inquiry',      color: '#6366f1' },
    { key: 'quotation',  label: 'Quotation',     color: '#8b5cf6' },
    { key: 'sales_order',label: 'Sales Order',   color: '#3b82f6' },
    { key: 'production', label: 'Production',    color: '#f97316' },
    { key: 'dispatch',   label: 'Dispatch',      color: '#10b981' },
];

function stageIndex(journey) {
    if (journey.dispatch_status === 'delivered') return 5;
    if (journey.wo_status && journey.wo_status !== 'draft') return 3;
    if (journey.so_status && journey.so_status !== 'draft') return 2;
    if (journey.qt_status && journey.qt_status !== 'draft') return 1;
    return 0;
}

function StageBar({ currentStage }) {
    const pct = Math.round((currentStage / (STAGES.length)) * 100);
    return (
        <Box>
            <Box display="flex" mb={0.5}>
                {STAGES.map((s, i) => (
                    <Box key={s.key} flex={1} textAlign="center">
                        <Box
                            sx={{
                                height: 6, mx: 0.3, borderRadius: 99,
                                backgroundColor: i < currentStage ? s.color : 'action.selected',
                                transition: 'background-color 0.3s',
                            }}
                        />
                        <Typography fontSize={9} color={i < currentStage ? s.color : 'text.disabled'} mt={0.3}>
                            {s.label}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

function Row({ journey }) {
    const [open, setOpen] = useState(false);
    const stage = stageIndex(journey);

    return (
        <>
            <TableRow hover sx={{ '& td': { borderBottom: open ? 0 : undefined } }}>
                <TableCell padding="checkbox">
                    <IconButton size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                    </IconButton>
                </TableCell>
                <TableCell>
                    <Typography fontWeight={600} fontSize={13}>{journey.inquiry_number}</Typography>
                    <Typography fontSize={11} color="text.secondary">{journey.customer_name}</Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                    <Typography noWrap fontSize={13}>{journey.product_description}</Typography>
                </TableCell>
                <TableCell>
                    <Chip label={journey.end_use} size="small" variant="outlined" />
                </TableCell>
                <TableCell sx={{ minWidth: 260 }}>
                    <StageBar currentStage={stage} />
                </TableCell>
                <TableCell>
                    <Typography fontSize={12}>{journey.received_date}</Typography>
                </TableCell>
            </TableRow>

            {/* Expanded detail row */}
            <TableRow>
                <TableCell colSpan={6} sx={{ py: 0 }}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 1.5, px: 3, backgroundColor: 'action.hover', borderRadius: 1, mb: 1 }}>
                            <Box display="flex" gap={3} flexWrap="wrap">
                                {/* Inquiry */}
                                <StageCard
                                    label="Inquiry"
                                    color="#6366f1"
                                    active={stage >= 0}
                                    lines={[
                                        `# ${journey.inquiry_number}`,
                                        `Status: ${journey.inquiry_status}`,
                                        `Qty: ${journey.quantity_required} ${journey.unit}`,
                                    ]}
                                />
                                {/* Quotation */}
                                <StageCard
                                    label="Quotation"
                                    color="#8b5cf6"
                                    active={!!journey.quotation_number}
                                    lines={journey.quotation_number ? [
                                        `# ${journey.quotation_number}`,
                                        `Status: ${journey.qt_status}`,
                                        `₹${journey.qt_total || '—'}`,
                                    ] : ['Not yet created']}
                                />
                                {/* Sales Order */}
                                <StageCard
                                    label="Sales Order"
                                    color="#3b82f6"
                                    active={!!journey.so_number}
                                    lines={journey.so_number ? [
                                        `# ${journey.so_number}`,
                                        `Status: ${journey.so_status}`,
                                        `₹${journey.so_total || '—'}`,
                                    ] : ['Not yet created']}
                                />
                                {/* Production */}
                                <StageCard
                                    label="Production"
                                    color="#f97316"
                                    active={!!journey.wo_number}
                                    lines={journey.wo_number ? [
                                        `# ${journey.wo_number}`,
                                        `Status: ${journey.wo_status}`,
                                    ] : ['Not yet scheduled']}
                                />
                                {/* Dispatch */}
                                <StageCard
                                    label="Dispatch"
                                    color="#10b981"
                                    active={journey.dispatch_status === 'delivered'}
                                    lines={journey.dispatch_status === 'delivered' ? [
                                        'Fully Delivered',
                                    ] : ['Pending dispatch']}
                                />
                            </Box>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}

function StageCard({ label, color, active, lines }) {
    return (
        <Box sx={{
            minWidth: 140, p: 1.5, borderRadius: 1.5,
            border: `1.5px solid ${active ? color : 'divider'}`,
            backgroundColor: active ? color + '12' : 'background.paper',
            opacity: active ? 1 : 0.55,
        }}>
            <Typography fontSize={11} fontWeight={700} color={active ? color : 'text.secondary'} mb={0.5}>
                {label}
            </Typography>
            {lines.map((l, i) => (
                <Typography key={i} fontSize={11} color="text.secondary">{l}</Typography>
            ))}
        </Box>
    );
}


export default function OrderJourneyPage() {
    const [journeys,  setJourneys]  = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [search,    setSearch]    = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Load inquiries, quotations, sales orders, work orders in parallel
                const [inqRes, qtRes, soRes, woRes] = await Promise.all([
                    fetch('/api/sales/inquiries/', { credentials: 'include' }),
                    fetch('/api/sales/quotations/', { credentials: 'include' }),
                    fetch('/api/sales/orders/', { credentials: 'include' }),
                    fetch('/api/production/work-orders/', { credentials: 'include' }),
                ]);
                const inqData = await inqRes.json();
                const qtData  = await qtRes.json();
                const soData  = await soRes.json();
                const woData  = await woRes.json();

                const inquiries    = inqData.inquiries    || [];
                const quotations   = qtData.quotations    || [];
                const salesOrders  = soData.sales_orders  || [];
                const workOrders   = woData.work_orders   || [];

                // Build journey map: inquiry as root, join quotation, SO, WO by cross-referencing
                // We link QT → inquiry via inquiry_id, SO → QT by matching customer (simplified)
                const journeyList = inquiries.map(inq => {
                    const qt = quotations.find(q => q.inquiry_id === inq.id);
                    // Find SO linked to this customer (no direct FK from SO to inquiry in current model)
                    // We just find latest SO for same customer
                    const so = salesOrders.find(s => s.customer_id === inq.customer_id);
                    const wo = so ? workOrders.find(w => w.status !== 'cancelled') : null;

                    return {
                        id:                  inq.id,
                        inquiry_number:      inq.inquiry_number,
                        customer_name:       inq.customer_name,
                        product_description: inq.product_description,
                        end_use:             inq.end_use,
                        received_date:       inq.received_date,
                        quantity_required:   inq.quantity_required,
                        unit:                inq.unit,
                        inquiry_status:      inq.status,

                        quotation_number: qt?.quotation_number || '',
                        qt_status:        qt?.status || '',
                        qt_total:         qt?.total_amount || '',

                        so_number: so?.so_number || '',
                        so_status: so?.status || '',
                        so_total:  so?.total_amount || '',

                        wo_number: wo?.work_order_number || '',
                        wo_status: wo?.status || '',

                        dispatch_status: so?.status === 'delivered' ? 'delivered' : '',
                    };
                });

                setJourneys(journeyList);
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        load();
    }, []);

    const filtered = journeys.filter(j =>
        j.inquiry_number.toLowerCase().includes(search.toLowerCase()) ||
        j.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        j.product_description.toLowerCase().includes(search.toLowerCase())
    );

    const stageCounts = [0,1,2,3,4,5].map(s => ({
        stage: STAGES[s] || { label: 'Complete', color: '#10b981' },
        count: journeys.filter(j => stageIndex(j) === s).length,
    }));

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                <RouteIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                <Box>
                    <Typography variant="h5" fontWeight={700}>Order Journey</Typography>
                    <Typography variant="body2" color="text.secondary">
                        End-to-end pipeline: Inquiry → Quotation → Sales Order → Production → Dispatch
                    </Typography>
                </Box>
            </Box>

            {/* Pipeline summary cards */}
            <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
                {STAGES.map((s, i) => {
                    const count = journeys.filter(j => stageIndex(j) === i).length;
                    return (
                        <Paper key={s.key} sx={{
                            p: 2, minWidth: 120, borderLeft: `4px solid ${s.color}`,
                            flex: 1,
                        }}>
                            <Typography fontSize={24} fontWeight={700} color={s.color}>{count}</Typography>
                            <Typography fontSize={12} color="text.secondary">{s.label}</Typography>
                        </Paper>
                    );
                })}
                <Paper sx={{
                    p: 2, minWidth: 120, borderLeft: '4px solid #10b981', flex: 1,
                }}>
                    <Typography fontSize={24} fontWeight={700} color="#10b981">
                        {journeys.filter(j => stageIndex(j) >= 5).length}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary">Dispatched</Typography>
                </Paper>
            </Box>

            {/* Search */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <TextField
                    placeholder="Search inquiry #, customer, product…"
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ minWidth: 320 }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                />
            </Paper>

            {/* Table */}
            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: 'action.hover' } }}>
                            <TableCell width={40} />
                            <TableCell>Inquiry / Customer</TableCell>
                            <TableCell>Product</TableCell>
                            <TableCell>End Use</TableCell>
                            <TableCell sx={{ minWidth: 260 }}>Pipeline Progress</TableCell>
                            <TableCell>Date</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} align="center">Loading…</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={6} align="center">No journeys found.</TableCell></TableRow>
                        ) : filtered.map(j => (
                            <Row key={j.id} journey={j} />
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
