// PAGE: Order Summary Report — Buying House ERP
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTheme } from '../../hooks/usePageTheme';

const STATUS_META = {
    draft:         { label: 'Draft',         color: '#64748b' },
    confirmed:     { label: 'Confirmed',     color: '#3b82f6' },
    in_production: { label: 'In Production', color: '#f59e0b' },
    inspected:     { label: 'Inspected',     color: '#8b5cf6' },
    shipped:       { label: 'Shipped',       color: '#06b6d4' },
    delivered:     { label: 'Delivered',     color: '#10b981' },
    cancelled:     { label: 'Cancelled',     color: '#94a3b8' },
};

export default function OrderSummaryReport() {
    const pt  = usePageTheme();
    const nav = useNavigate();
    const thS = { ...pt.th, textAlign: 'left' };
    const tdS = { ...pt.cell, verticalAlign: 'middle' };

    const [rows, setRows]       = useState([]);
    const [summary, setSummary] = useState({});
    const [filter, setFilter]   = useState({ status: '', from: '', to: '' });
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams();
        if (filter.status) p.set('status', filter.status);
        if (filter.from)   p.set('from', filter.from);
        if (filter.to)     p.set('to', filter.to);
        const res = await fetch(`/api/finance/reports/order-summary/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.orders || []);
        setSummary({ total_value: d.total_value || 0, by_status: d.by_status || {} });
        setLoading(false);
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const totalQty = rows.reduce((s, r) => s + r.total_qty, 0);
    const totalVal = rows.reduce((s, r) => s + r.total_value, 0);

    const printReport = () => window.print();

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Order Summary Report</h2>
                    <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>{rows.length} orders · Total value: USD {totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <button onClick={printReport} style={btn('#64748b')}>Print / PDF</button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: pt.colors.dimText, marginBottom: 4 }}>STATUS</label>
                    <select style={{ ...pt.inp, minWidth: 140 }} value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))}>
                        <option value="">All Statuses</option>
                        {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: pt.colors.dimText, marginBottom: 4 }}>FROM</label>
                    <input type="date" style={pt.inp} value={filter.from} onChange={e => setFilter(p => ({ ...p, from: e.target.value }))} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: pt.colors.dimText, marginBottom: 4 }}>TO</label>
                    <input type="date" style={pt.inp} value={filter.to} onChange={e => setFilter(p => ({ ...p, to: e.target.value }))} />
                </div>
                <button onClick={() => setFilter({ status: '', from: '', to: '' })} style={btn('#94a3b8')}>Clear</button>
            </div>

            {/* Status summary badges */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {Object.entries(summary.by_status || {}).map(([k, cnt]) => {
                    const m = STATUS_META[k] || { label: k, color: '#94a3b8' };
                    return <span key={k} style={tag(m.color)}>{m.label}: {cnt}</span>;
                })}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>Loading…</div>
            ) : (
                <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr>
                            {['CO No.', 'Customer PO', 'Customer', 'Brand', 'Category', 'Order Date', 'Ex-Factory', 'Ship By', 'Qty', 'Value', 'FOs', 'Status'].map(h =>
                                <th key={h} style={thS}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {rows.map(r => {
                                const sm = STATUS_META[r.status] || STATUS_META.draft;
                                return (
                                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/orders/co/${r.id}`)}>
                                        <td style={{ ...tdS, fontWeight: 700, color: '#10b981' }}>{r.co_number}</td>
                                        <td style={{ ...tdS, color: pt.colors.dimText }}>{r.customer_po_ref || '—'}</td>
                                        <td style={tdS}>{r.customer || '—'}</td>
                                        <td style={tdS}>{r.brand || '—'}</td>
                                        <td style={tdS}>{r.category || '—'}</td>
                                        <td style={tdS}>{r.order_date}</td>
                                        <td style={{ ...tdS, color: r.ex_factory_date ? pt.colors.text : pt.colors.muted }}>{r.ex_factory_date || '—'}</td>
                                        <td style={{ ...tdS, color: r.ship_by_date ? pt.colors.text : pt.colors.muted }}>{r.ship_by_date || '—'}</td>
                                        <td style={tdS}>{r.total_qty.toLocaleString()}</td>
                                        <td style={{ ...tdS, fontWeight: 600 }}>{r.currency} {r.total_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td style={tdS}>{r.fo_count}</td>
                                        <td style={tdS}><span style={tag(sm.color)}>{sm.label}</span></td>
                                    </tr>
                                );
                            })}
                            {rows.length > 0 && (
                                <tr style={{ fontWeight: 700, borderTop: `2px solid ${pt.colors.border || '#e2e8f0'}` }}>
                                    <td colSpan={8} style={{ ...tdS, textAlign: 'right', color: pt.colors.dimText }}>TOTAL</td>
                                    <td style={tdS}>{totalQty.toLocaleString()}</td>
                                    <td style={{ ...tdS, color: '#10b981' }}>USD {totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td colSpan={2} style={tdS}></td>
                                </tr>
                            )}
                            {rows.length === 0 && (
                                <tr><td colSpan={12} style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>No orders match the current filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const btn = (bg) => ({ padding: '7px 16px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 });
const tag = (bg) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 12, fontWeight: 600 });
