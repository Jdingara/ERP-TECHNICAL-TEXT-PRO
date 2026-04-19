import { useState, useEffect, useCallback } from 'react';

const ACTION_STYLE = {
    Created:       { bg: '#d1fae5', color: '#065f46' },
    Updated:       { bg: '#fef3c7', color: '#92400e' },
    Deleted:       { bg: '#fee2e2', color: '#991b1b' },
    Confirmed:     { bg: '#d1fae5', color: '#065f46' },
    Completed:     { bg: '#d1fae5', color: '#065f46' },
    'Status Changed': { bg: '#dbeafe', color: '#1e40af' },
    'Posted':      { bg: '#ede9fe', color: '#5b21b6' },
    'Delivered':   { bg: '#ede9fe', color: '#5b21b6' },
};

function ChangesRow({ changes }) {
    const list = changes?.changes;
    if (Array.isArray(list)) {
        if (list.length === 0)
            return <span style={{ fontSize: 12, color: '#64748b' }}>ℹ️ Record saved — no field values changed.</span>;
        return (
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                <thead>
                    <tr>
                        {['Field', 'Before', 'After'].map(h =>
                            <th key={h} style={{ background: '#1e293b', color: '#fff', padding: '5px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {list.map((c, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={{ padding: '5px 12px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>{c.field}</td>
                            <td style={{ padding: '5px 12px' }}>
                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '1px 8px', borderRadius: 10, fontSize: 11 }}>
                                    {c.before != null && c.before !== '' ? String(c.before) : '(empty)'}
                                </span>
                            </td>
                            <td style={{ padding: '5px 12px' }}>
                                <span style={{ background: '#dcfce7', color: '#166534', padding: '1px 8px', borderRadius: 10, fontSize: 11 }}>
                                    {c.after != null && c.after !== '' ? String(c.after) : '(empty)'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }
    const entries = Object.entries(changes || {}).filter(([k]) => k !== 'changes');
    if (entries.length === 0) return <span style={{ fontSize: 12, color: '#94a3b8' }}>No detail recorded.</span>;
    return (
        <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
                <tr>
                    {['Field', 'Value'].map(h =>
                        <th key={h} style={{ background: '#1e293b', color: '#fff', padding: '5px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>)}
                </tr>
            </thead>
            <tbody>
                {entries.map(([k, v], i) => (
                    <tr key={k} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                        <td style={{ padding: '5px 12px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                            {k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </td>
                        <td style={{ padding: '5px 12px', color: '#475569' }}>{String(v)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function LogRow({ log }) {
    const [open, setOpen] = useState(false);
    const hasChanges = log.changes && Object.keys(log.changes).length > 0;
    const ac = ACTION_STYLE[log.action] || { bg: '#f1f5f9', color: '#475569' };

    return (
        <>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={tdS}><span style={{ color: '#64748b', fontSize: 12 }}>{log.timestamp.replace('T', ' ').slice(0, 19)}</span></td>
                <td style={tdS}><b style={{ fontSize: 13 }}>{log.user}</b></td>
                <td style={tdS}><span style={{ fontSize: 13 }}>{log.module}</span></td>
                <td style={tdS}><b style={{ color: '#2563eb', fontSize: 13 }}>{log.object_repr}</b></td>
                <td style={tdS}>
                    <span style={{ background: ac.bg, color: ac.color, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {log.action}
                    </span>
                </td>
                <td style={{ ...tdS, textAlign: 'center' }}>
                    {hasChanges
                        ? <button onClick={() => setOpen(v => !v)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: '2px 8px', fontSize: 12, color: '#475569' }}>
                            {open ? '▲ Hide' : '▼ Show'}
                          </button>
                        : <span style={{ color: '#cbd5e1' }}>—</span>}
                </td>
            </tr>
            {hasChanges && open && (
                <tr>
                    <td colSpan={6} style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Change Details — {log.action} on {log.object_repr}
                        </div>
                        <ChangesRow changes={log.changes} />
                    </td>
                </tr>
            )}
        </>
    );
}

export default function ActivityLogPage() {
    const [logs,    setLogs]    = useState([]);
    const [meta,    setMeta]    = useState({ modules: [], actions: [], users: [] });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ module: '', action: '', user_id: '', from_date: '', to_date: '', search: '' });

    const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }));

    const fetchLogs = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        fetch(`/api/authentication/audit-logs/?${params}`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                setLogs(data.logs || []);
                setMeta({ modules: data.modules || [], actions: data.actions || [], users: data.users || [] });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [filters]);

    useEffect(() => { fetchLogs(); }, []); // eslint-disable-line

    const downloadSupport = async () => {
        const res  = await fetch('/api/authentication/support-log/', { credentials: 'include' });
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `MEI_TEXZ_Activity_Log_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{ padding: 24, maxWidth: 1200 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Activity Log</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Full audit trail — every action logged with user, module, and timestamp</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={downloadSupport} style={outBtn('#10b981')}>⬇ Download Support Log</button>
                    <button onClick={fetchLogs} style={outBtn('#2563eb')}>↻ Refresh</button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', marginBottom: 20, boxShadow: '0 1px 3px #0001' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#475569', marginBottom: 12 }}>▼ Filters</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
                    <input placeholder="Search record…" value={filters.search}
                        onChange={e => setF('search', e.target.value)} style={inputS} />

                    <select value={filters.module} onChange={e => setF('module', e.target.value)} style={inputS}>
                        <option value="">All Modules</option>
                        {meta.modules.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <select value={filters.action} onChange={e => setF('action', e.target.value)} style={inputS}>
                        <option value="">All Actions</option>
                        {meta.actions.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>

                    <select value={filters.user_id} onChange={e => setF('user_id', e.target.value)} style={inputS}>
                        <option value="">All Users</option>
                        {meta.users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>

                    <input type="date" value={filters.from_date}
                        onChange={e => setF('from_date', e.target.value)} style={inputS} placeholder="From Date" />
                    <input type="date" value={filters.to_date}
                        onChange={e => setF('to_date', e.target.value)} style={inputS} placeholder="To Date" />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button onClick={fetchLogs} style={btn('#2563eb')}>▼ Apply Filters</button>
                    <button onClick={() => setFilters({ module: '', action: '', user_id: '', from_date: '', to_date: '', search: '' })} style={outBtn('#94a3b8')}>Clear</button>
                </div>
            </div>

            {/* Count */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13, color: '#64748b' }}>
                <span>Showing <b style={{ color: '#1e293b' }}>{logs.length}</b> log entries</span>
                <span>Click ▼ Show on any row to see before / after details</span>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px #0001' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Loading…</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#1e293b', color: '#fff' }}>
                                    {['Timestamp', 'User', 'Module', 'Record', 'Action', 'Details'].map(h =>
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0
                                    ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No activity log entries found.</td></tr>
                                    : logs.map(log => <LogRow key={log.id} log={log} />)}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

const tdS    = { padding: '10px 14px', verticalAlign: 'middle' };
const inputS = { padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none' };
const btn    = (bg) => ({ padding: '7px 16px', background: bg, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const outBtn = (c)  => ({ padding: '7px 16px', background: 'transparent', color: c, border: `1px solid ${c}`, borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
