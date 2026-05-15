// PAGE: PD Pipeline Report — Buying House ERP
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTheme } from '../../hooks/usePageTheme';

const STATUS_META = {
    draft:               { label: 'Draft',               color: '#94a3b8' },
    open:                { label: 'Open',                color: '#3b82f6' },
    vendor_assigned:     { label: 'Vendor Assigned',     color: '#f59e0b' },
    sample_in_progress:  { label: 'Sample In Progress',  color: '#f97316' },
    sample_received:     { label: 'Sample Received',     color: '#8b5cf6' },
    testing:             { label: 'Testing',             color: '#06b6d4' },
    approved:            { label: 'Approved',            color: '#10b981' },
    rejected:            { label: 'Rejected',            color: '#ef4444' },
    cancelled:           { label: 'Cancelled',           color: '#94a3b8' },
};

export default function PDPipelineReport() {
    const pt  = usePageTheme();
    const nav = useNavigate();
    const thS = { ...pt.th, textAlign: 'left' };
    const tdS = { ...pt.cell, verticalAlign: 'middle' };

    const [rows, setRows]       = useState([]);
    const [byStatus, setByStatus] = useState({});
    const [filter, setFilter]   = useState('');
    const [loading, setLoading] = useState(false);

    const load = async (st = filter) => {
        setLoading(true);
        const res = await fetch('/api/finance/reports/pd-pipeline/', { credentials: 'include' });
        const d = await res.json();
        setRows(d.pd_requests || []);
        setByStatus(d.by_status || {});
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const visible = filter ? rows.filter(r => r.status === filter) : rows;
    const today = new Date().toISOString().split('T')[0];

    // Funnel counts
    const FUNNEL = ['open','vendor_assigned','sample_in_progress','sample_received','testing','approved'];

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>PD Pipeline Report</h2>
                    <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>{rows.length} total PD requests</p>
                </div>
                <button onClick={() => window.print()} style={btn('#64748b')}>Print / PDF</button>
            </div>

            {/* Funnel visual */}
            <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, padding: '20px 24px', marginBottom: 24, border: `1px solid ${pt.colors.border || '#e2e8f0'}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: pt.colors.dimText, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 }}>Pipeline Funnel</div>
                <div style={{ display: 'flex', gap: 0, alignItems: 'center', overflowX: 'auto' }}>
                    {FUNNEL.map((s, i) => {
                        const m = STATUS_META[s];
                        const cnt = byStatus[s] || 0;
                        return (
                            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                                <div onClick={() => setFilter(filter === s ? '' : s)}
                                    style={{ textAlign: 'center', padding: '14px 20px', borderRadius: 10, border: `2px solid ${m.color}`, minWidth: 110, cursor: 'pointer', background: filter === s ? `${m.color}20` : 'transparent' }}
                                    onMouseEnter={e => e.currentTarget.style.background = `${m.color}15`}
                                    onMouseLeave={e => e.currentTarget.style.background = filter === s ? `${m.color}20` : 'transparent'}>
                                    <div style={{ fontSize: 26, fontWeight: 800, color: m.color }}>{cnt}</div>
                                    <div style={{ fontSize: 11, color: pt.colors.dimText, marginTop: 4, fontWeight: 600 }}>{m.label}</div>
                                </div>
                                {i < FUNNEL.length - 1 && <div style={{ fontSize: 18, color: pt.colors.muted, padding: '0 6px' }}>→</div>}
                            </div>
                        );
                    })}
                </div>
                {(byStatus.rejected > 0 || byStatus.cancelled > 0) && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                        {['rejected','cancelled'].filter(s => byStatus[s] > 0).map(s => {
                            const m = STATUS_META[s];
                            return <span key={s} style={tag(m.color)}>{m.label}: {byStatus[s]}</span>;
                        })}
                    </div>
                )}
            </div>

            {/* Status filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <button onClick={() => setFilter('')} style={filterPill(!filter, '#64748b')}>All ({rows.length})</button>
                {Object.entries(STATUS_META).filter(([k]) => byStatus[k] > 0).map(([k, m]) => (
                    <button key={k} onClick={() => setFilter(filter === k ? '' : k)} style={filterPill(filter === k, m.color)}>
                        {m.label} ({byStatus[k]})
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>Loading…</div>
            ) : (
                <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr>
                            {['PD No.', 'Title', 'Customer', 'Brand', 'Category', 'Request Date', 'Required By', 'Vendors', 'Samples', 'Status'].map(h =>
                                <th key={h} style={thS}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {visible.map(r => {
                                const sm = STATUS_META[r.status] || STATUS_META.draft;
                                const isUrgent = r.required_by && r.required_by < today && !['approved','rejected','cancelled'].includes(r.status);
                                return (
                                    <tr key={r.id} style={{ cursor: 'pointer', background: isUrgent ? '#ef444408' : 'transparent' }} onClick={() => nav(`/product-development/${r.id}`)}>
                                        <td style={{ ...tdS, fontWeight: 700, color: '#8b5cf6' }}>{r.pd_number}</td>
                                        <td style={tdS}>{r.title}</td>
                                        <td style={tdS}>{r.customer || '—'}</td>
                                        <td style={tdS}>{r.brand || '—'}</td>
                                        <td style={tdS}>{r.category || '—'}</td>
                                        <td style={tdS}>{r.request_date}</td>
                                        <td style={{ ...tdS, color: isUrgent ? '#ef4444' : pt.colors.text, fontWeight: isUrgent ? 700 : 400 }}>{r.required_by || '—'}</td>
                                        <td style={tdS}>
                                            {r.vendors.length > 0 ? r.vendors.map((v, i) => <span key={i} style={{ display: 'inline-block', marginRight: 4, padding: '1px 6px', borderRadius: 8, background: '#f59e0b20', color: '#f59e0b', fontSize: 11 }}>{v}</span>) : '—'}
                                        </td>
                                        <td style={tdS}>{r.sample_count}</td>
                                        <td style={tdS}><span style={tag(sm.color)}>{sm.label}</span></td>
                                    </tr>
                                );
                            })}
                            {visible.length === 0 && (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>No PD requests match the filter.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const btn        = (bg) => ({ padding: '7px 16px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 });
const tag        = (bg) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 12, fontWeight: 600 });
const filterPill = (active, color) => ({ padding: '4px 12px', borderRadius: 20, border: `1px solid ${color}`, background: active ? color : 'transparent', color: active ? '#fff' : color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });
