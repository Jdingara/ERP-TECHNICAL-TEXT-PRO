// PAGE: Shipment Tracker Report — Buying House ERP
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTheme } from '../../hooks/usePageTheme';

const STATUS_META = {
    draft:      { label: 'Draft',        color: '#64748b' },
    booked:     { label: 'Booked',       color: '#3b82f6' },
    loaded:     { label: 'Loaded',       color: '#f59e0b' },
    in_transit: { label: 'In Transit',   color: '#06b6d4' },
    arrived:    { label: 'Arrived',      color: '#8b5cf6' },
    customs:    { label: 'Customs',      color: '#f97316' },
};

const MODE_ICON = { sea: '🚢', air: '✈️', land: '🚛', courier: '📦' };

export default function ShipmentTrackerReport() {
    const pt  = usePageTheme();
    const nav = useNavigate();
    const thS = { ...pt.th, textAlign: 'left' };
    const tdS = { ...pt.cell, verticalAlign: 'middle' };

    const [rows, setRows]     = useState([]);
    const [meta, setMeta]     = useState({});
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const res = await fetch('/api/finance/reports/shipment-tracker/', { credentials: 'include' });
        const d = await res.json();
        setRows(d.shipments || []);
        setMeta({ total: d.total_active, overdue: d.overdue_count, due_soon: d.due_this_week });
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const visible = filter ? rows.filter(r => r.status === filter) : rows;

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Shipment Tracker</h2>
                    <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>Active shipments — excludes delivered and cancelled</p>
                </div>
                <button onClick={() => window.print()} style={btn('#64748b')}>Print / PDF</button>
            </div>

            {/* Alert cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Total Active', value: meta.total || 0, color: '#06b6d4' },
                    { label: 'ETA Overdue', value: meta.overdue || 0, color: '#ef4444' },
                    { label: 'Arriving This Week', value: meta.due_soon || 0, color: '#f59e0b' },
                ].map(c => (
                    <div key={c.label} style={{ background: pt.colors.card, borderRadius: 12, padding: '16px 20px', border: `1px solid ${c.color}30`, borderLeft: `4px solid ${c.color}` }}>
                        <div style={{ fontSize: 11, color: pt.colors.dimText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{c.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: c.color }}>{c.value}</div>
                    </div>
                ))}
            </div>

            {/* Status filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <button onClick={() => setFilter('')} style={filterPill(!filter, '#64748b')}>All ({rows.length})</button>
                {Object.entries(STATUS_META).map(([k, m]) => {
                    const cnt = rows.filter(r => r.status === k).length;
                    if (!cnt) return null;
                    return <button key={k} onClick={() => setFilter(filter === k ? '' : k)} style={filterPill(filter === k, m.color)}>{m.label} ({cnt})</button>;
                })}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>Loading…</div>
            ) : (
                <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr>
                            {['Shipment', 'CO', 'Customer', 'Mode', 'Route', 'ETD', 'ETA', 'ETA In', 'B/L', 'Qty', 'Value', 'PSI', 'Status'].map(h =>
                                <th key={h} style={thS}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {visible.map(r => {
                                const sm = STATUS_META[r.status] || { label: r.status, color: '#94a3b8' };
                                const isOverdue  = r.eta_days != null && r.eta_days < 0;
                                const isDueSoon  = r.eta_days != null && r.eta_days >= 0 && r.eta_days <= 7;
                                const etaColor   = isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : pt.colors.text;
                                const etaLabel   = r.eta_days == null ? '—' : isOverdue ? `${Math.abs(r.eta_days)}d overdue` : r.eta_days === 0 ? 'Today' : `${r.eta_days}d`;
                                const psiColor   = r.psi_result === 'pass' || r.psi_result === 'pass_remarks' ? '#10b981' : r.psi_result === 'fail' ? '#ef4444' : '#94a3b8';

                                return (
                                    <tr key={r.id} style={{ background: isOverdue ? '#ef444408' : isDueSoon ? '#f59e0b08' : 'transparent' }}>
                                        <td style={{ ...tdS, fontWeight: 700, color: '#06b6d4' }}>{r.shipment_number}</td>
                                        <td style={{ ...tdS, color: '#10b981', fontWeight: 600, cursor: 'pointer' }} onClick={() => nav(`/orders/co`)}>{r.co_number}</td>
                                        <td style={tdS}>{r.customer || '—'}</td>
                                        <td style={tdS}>{MODE_ICON[r.mode] || ''} {r.mode}</td>
                                        <td style={{ ...tdS, fontSize: 12, color: pt.colors.dimText }}>
                                            {r.port_of_loading || '?'} → {r.port_of_discharge || '?'}
                                        </td>
                                        <td style={tdS}>{r.etd || '—'}</td>
                                        <td style={{ ...tdS, color: etaColor }}>{r.eta || '—'}</td>
                                        <td style={{ ...tdS, fontWeight: 700, color: etaColor }}>{etaLabel}</td>
                                        <td style={{ ...tdS, fontFamily: 'monospace', fontSize: 12, color: pt.colors.dimText }}>{r.bl_number || '—'}</td>
                                        <td style={tdS}>{r.total_qty.toLocaleString()}</td>
                                        <td style={tdS}>{r.currency} {Number(r.invoice_value).toLocaleString()}</td>
                                        <td style={tdS}>
                                            {r.psi_result
                                                ? <span style={tag(psiColor)}>{r.psi_result.replace('_', ' ')}</span>
                                                : <span style={{ color: pt.colors.muted, fontSize: 12 }}>—</span>}
                                        </td>
                                        <td style={tdS}><span style={tag(sm.color)}>{sm.label}</span></td>
                                    </tr>
                                );
                            })}
                            {visible.length === 0 && (
                                <tr><td colSpan={13} style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>No active shipments.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const btn        = (bg) => ({ padding: '7px 16px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 });
const tag        = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const filterPill = (active, color) => ({ padding: '4px 12px', borderRadius: 20, border: `1px solid ${color}`, background: active ? color : 'transparent', color: active ? '#fff' : color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });
