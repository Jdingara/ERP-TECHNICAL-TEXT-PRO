import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_META = {
    in_process: { label: 'In Process',  bg: '#dbeafe', color: '#1e40af' },
    qc_pending: { label: 'QC Pending',  bg: '#fef3c7', color: '#92400e' },
    qc_passed:  { label: 'QC Passed',   bg: '#d1fae5', color: '#065f46' },
    qc_failed:  { label: 'QC Failed',   bg: '#fee2e2', color: '#991b1b' },
    dispatched: { label: 'Dispatched',  bg: '#f3e8ff', color: '#6b21a8' },
};

export default function FinishedGoodsPage() {
    const [batches,  setBatches]  = useState([]);
    const [summary,  setSummary]  = useState({});
    const [byStatus, setByStatus] = useState({});
    const [status,   setStatus]   = useState('');
    const [search,   setSearch]   = useState('');
    const [loading,  setLoading]  = useState(false);
    const navigate = useNavigate();

    const load = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams();
        if (status) p.set('status', status);
        if (search) p.set('search', search);
        const r = await fetch(`/api/reports/finished-goods/?${p}`, { credentials: 'include' });
        const d = await r.json();
        setBatches(d.batches  || []);
        setSummary(d.summary  || {});
        setByStatus(d.by_status || {});
        setLoading(false);
    }, [status, search]);

    useEffect(() => { load(); }, [load]);

    const kpis = [
        { label: 'Total Batches', value: summary.total_batches || 0, color: '#3b82f6' },
        { label: 'Total Qty',     value: summary.total_qty     || 0, color: '#8b5cf6' },
        { label: 'QC Passed',     value: summary.qc_passed     || 0, color: '#10b981', link: () => setStatus('qc_passed') },
        { label: 'QC Pending',    value: summary.qc_pending    || 0, color: '#f59e0b', link: () => setStatus('qc_pending') },
        { label: 'In Process',    value: summary.in_process    || 0, color: '#3b82f6', link: () => setStatus('in_process') },
        { label: 'Dispatched',    value: summary.dispatched    || 0, color: '#6b21a8', link: () => setStatus('dispatched') },
    ];

    return (
        <div style={{ padding: 24, maxWidth: 1200 }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius: 12, padding: '20px 28px', marginBottom: 28, color: '#fff' }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>Finished Goods Inventory</div>
                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
                    All production batches — track from In Process → QC → Ready to Dispatch
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginBottom: 24 }}>
                {kpis.map(k => (
                    <div key={k.label}
                        onClick={k.link}
                        style={{ background: '#fff', border: `1px solid ${k.color}30`, borderTop: `3px solid ${k.color}`, borderRadius: 10, padding: '14px 16px', cursor: k.link ? 'pointer' : 'default', textAlign: 'center' }}
                        onMouseEnter={e => k.link && (e.currentTarget.style.boxShadow = '0 4px 12px #0002')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 4 }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, background: '#f8fafc', borderRadius: 10, padding: '12px 16px' }}>
                <input placeholder="Search batch / product…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={inputS} />
                <select value={status} onChange={e => setStatus(e.target.value)} style={inputS}>
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_META).map(([k, v]) =>
                        <option key={k} value={k}>{v.label}</option>)}
                </select>
                <button onClick={load} style={btn('#2563eb')}>{loading ? 'Loading…' : '🔍 Filter'}</button>
                {(status || search) && (
                    <button onClick={() => { setStatus(''); setSearch(''); }} style={outBtn('#94a3b8')}>Clear</button>
                )}
            </div>

            {/* Table */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px #0001' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#1e293b', color: '#fff' }}>
                                {['Batch No.', 'Product', 'Customer', 'Qty', 'Status', 'Created', 'Action'].map(h =>
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Loading…</td></tr>
                            ) : batches.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No batches found</td></tr>
                            ) : batches.map((b, i) => {
                                const sm = STATUS_META[b.status] || { label: b.status, bg: '#f1f5f9', color: '#475569' };
                                return (
                                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={tdS}><b style={{ color: '#f59e0b' }}>{b.batch_number}</b></td>
                                        <td style={tdS}>{b.product || '—'}</td>
                                        <td style={tdS}>{b.customer || '—'}</td>
                                        <td style={tdS}><b>{b.quantity}</b></td>
                                        <td style={tdS}>
                                            <span style={{ background: sm.bg, color: sm.color, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                                                {sm.label}
                                            </span>
                                        </td>
                                        <td style={{ ...tdS, color: '#64748b' }}>{b.created_at}</td>
                                        <td style={tdS}>
                                            {b.status === 'qc_passed' && (
                                                <button onClick={() => navigate('/dispatch/entries')}
                                                    style={{ padding: '4px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                                    → Dispatch
                                                </button>
                                            )}
                                            {b.status === 'qc_pending' && (
                                                <button onClick={() => navigate('/quality/inspections')}
                                                    style={{ padding: '4px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                                    → Inspect
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {batches.length > 0 && (
                    <div style={{ padding: '10px 16px', fontSize: 12, color: '#64748b', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                        Showing {batches.length} batch{batches.length !== 1 ? 'es' : ''}
                    </div>
                )}
            </div>

            {/* Flow note */}
            <div style={{ marginTop: 16, fontSize: 12, color: '#64748b', background: '#f8fafc', borderRadius: 8, padding: '10px 16px' }}>
                <b>Flow:</b> Production → <span style={{ color: '#3b82f6' }}>In Process</span> → QC Inspection → <span style={{ color: '#f59e0b' }}>QC Pending</span> → <span style={{ color: '#10b981' }}>QC Passed</span> → Dispatch → <span style={{ color: '#6b21a8' }}>Dispatched</span>
            </div>
        </div>
    );
}

const tdS    = { padding: '10px 14px', verticalAlign: 'middle' };
const inputS = { padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', minWidth: 180 };
const btn    = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const outBtn = (c)  => ({ padding: '8px 14px', background: 'transparent', color: c, border: `1px solid ${c}`, borderRadius: 8, cursor: 'pointer', fontSize: 13 });
