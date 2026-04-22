// ============================================================
// FILE: pages/maintenance/MaintenanceLogPage.js
// PURPOSE: Record maintenance completions + view due/overdue alerts
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { shareEmail, shareWhatsApp } from '../../utils/shareUtils';

const STATUS_COLORS = { pending: '#f59e0b', done: '#10b981', overdue: '#ef4444', skipped: '#64748b' };

const FREQ_LABEL = {
    daily:'Daily', weekly:'Weekly', '15_days':'15 Days', monthly:'Monthly',
    '3_monthly':'3 Months', '6_monthly':'6 Months', yearly:'Yearly', beam_change:'Beam Change',
};

export default function MaintenanceLogPage() {
    const pt = usePageTheme();
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const formPage = { ...pt.formPage, maxWidth: 900 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;
    const [logs,     setLogs]     = useState([]);
    const [alerts,   setAlerts]   = useState([]);
    const [machines, setMachines] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState(null);
    const [form,     setForm]     = useState({ completed_by: '', remarks: '', measurements: {} });
    const [loading,  setLoading]  = useState(false);
    const [msg,      setMsg]      = useState('');
    const [filterStatus,       setFilterStatus]       = useState('');
    const [filterMachine,      setFilterMachine]      = useState('');
    const [alertFilterMachine, setAlertFilterMachine] = useState('');
    const [alertFilterType,    setAlertFilterType]    = useState('');

    const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

    const loadAlerts = () => {
        fetch('/api/maintenance/alerts/', { credentials: 'include' })
            .then(r => r.json()).then(d => setAlerts(d.alerts || []));
    };

    const load = useCallback(() => {
        const p = new URLSearchParams();
        if (filterStatus) p.set('status', filterStatus);
        if (filterMachine) p.set('machine_id', filterMachine);
        fetch(`/api/maintenance/logs/?${p}`, { credentials: 'include' })
            .then(r => r.json()).then(d => setLogs(d.logs || []));
    }, [filterStatus, filterMachine]);

    useEffect(() => { load(); loadAlerts(); }, [load]);
    useEffect(() => {
        fetch('/api/masters/machines/', { credentials: 'include' })
            .then(r => r.json()).then(d => setMachines(d.machines || []));
    }, []);

    const openComplete = (log) => {
        setSelected(log);
        const initMeasurements = {};
        (log.measurement_labels || []).forEach(l => { initMeasurements[l.key] = ''; });
        setForm({ completed_by: '', remarks: '', measurements: initMeasurements });
        setShowForm(true);
    };

    const submit = async () => {
        if (!form.completed_by) { flash('Please enter who completed this task.'); return; }
        setLoading(true);
        try {
            const r = await fetch(`/api/maintenance/logs/${selected.id}/complete/`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const d = await r.json();
            if (d.success) {
                flash(`Done! Next due: ${d.next_due}`);
                setShowForm(false);
                load(); loadAlerts();
            } else flash(d.error || 'Error.');
        } finally { setLoading(false); }
    };

    const inp = { padding: '8px 10px', borderRadius: 6, border: `1px solid ${pt.colors.border}`, backgroundColor: pt.colors.inner, color: pt.colors.text, fontSize: 13, width: '100%', boxSizing: 'border-box' };
    const cell = { padding: '10px 14px', borderBottom: `1px solid ${pt.colors.border}`, fontSize: 13, color: pt.colors.text };
    const th   = { ...cell, backgroundColor: pt.colors.inner, color: pt.colors.muted, fontWeight: 600, textTransform: 'uppercase', fontSize: 11 };

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            {!showForm ? (
                <>
                    <div style={{ marginBottom: 24 }}>
                        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Maintenance Log</h2>
                        <p style={{ margin: 0, color: pt.colors.dimText, fontSize: 13 }}>Record task completions · view overdue alerts</p>
                    </div>

                    {/* Alert Table */}
                    {alerts.length > 0 && (() => {
                        const filteredAlerts = alerts.filter(a => {
                            if (alertFilterMachine && a.machine_code !== alertFilterMachine) return false;
                            if (alertFilterType === 'overdue' && !a.is_overdue) return false;
                            if (alertFilterType === 'due_soon' && a.is_overdue) return false;
                            return true;
                        });
                        const alertMachines = [...new Set(alerts.map(a => a.machine_code))].sort();
                        return (
                            <div style={{
                                backgroundColor: pt.colors.card, borderRadius: 10, marginBottom: 20,
                                border: `1px solid ${pt.dark ? '#ef444440' : '#fca5a5'}`, overflow: 'hidden'
                            }}>
                                <div style={{
                                    padding: '12px 18px', backgroundColor: pt.dark ? '#450a0a' : '#fff1f2',
                                    borderBottom: `1px solid ${pt.dark ? '#ef444440' : '#fca5a5'}`,
                                    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                        <span style={{ color: pt.dark ? '#fca5a5' : '#b91c1c', fontWeight: 700, fontSize: 13 }}>
                                            ⚠ {alerts.filter(a => a.is_overdue).length} Overdue
                                        </span>
                                        <span style={{ color: pt.colors.muted, fontSize: 13 }}>·</span>
                                        <span style={{ color: pt.dark ? '#fde68a' : '#92400e', fontWeight: 700, fontSize: 13 }}>
                                            {alerts.filter(a => !a.is_overdue).length} Due Soon
                                        </span>
                                        {(alertFilterMachine || alertFilterType) && (
                                            <span style={{ color: pt.colors.muted, fontSize: 12 }}>
                                                — showing {filteredAlerts.length} of {alerts.length}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <select value={alertFilterMachine} onChange={e => setAlertFilterMachine(e.target.value)}
                                            style={{ ...inp, width: 180, fontSize: 12, padding: '5px 8px' }}>
                                            <option value="">All Machines</option>
                                            {alertMachines.map(mc => <option key={mc} value={mc}>{mc}</option>)}
                                        </select>
                                        <select value={alertFilterType} onChange={e => setAlertFilterType(e.target.value)}
                                            style={{ ...inp, width: 130, fontSize: 12, padding: '5px 8px' }}>
                                            <option value="">All Types</option>
                                            <option value="overdue">Overdue Only</option>
                                            <option value="due_soon">Due Soon Only</option>
                                        </select>
                                        {(alertFilterMachine || alertFilterType) && (
                                            <button onClick={() => { setAlertFilterMachine(''); setAlertFilterType(''); }}
                                                style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${pt.colors.border}`, backgroundColor: 'transparent', color: pt.colors.muted, cursor: 'pointer', fontSize: 12 }}>
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr>
                                            {['Pic', 'Machine', 'Task', 'Frequency', 'Due Date', 'Status', 'Share'].map(h => (
                                                <th key={h} style={{ ...th, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAlerts.length === 0 && (
                                            <tr><td colSpan={7} style={{ ...cell, textAlign: 'center', color: pt.colors.muted, padding: 24 }}>No alerts match the filter.</td></tr>
                                        )}
                                        {filteredAlerts.map(a => (
                                            <tr key={a.id}>
                                                <td style={{ ...cell, padding: '6px 10px', width: 52 }}>
                                                    {a.image_url
                                                        ? <img src={a.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: `1px solid ${pt.colors.border}`, cursor: 'pointer' }}
                                                            onClick={() => window.open(a.image_url, '_blank')} />
                                                        : <div style={{ width: 40, height: 40, borderRadius: 6, border: `1px dashed ${pt.colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pt.colors.muted, fontSize: 16 }}>📷</div>
                                                    }
                                                </td>
                                                <td style={{ ...cell, fontWeight: 600 }}>{a.machine_code}</td>
                                                <td style={cell}>{a.task_name}</td>
                                                <td style={{ ...cell, color: pt.colors.muted, fontSize: 12 }}>{FREQ_LABEL[a.frequency] || a.frequency}</td>
                                                <td style={{ ...cell, color: a.is_overdue ? '#ef4444' : (pt.dark ? '#fde68a' : '#92400e') }}>{a.due_date}</td>
                                                <td style={cell}>
                                                    {a.is_overdue
                                                        ? <span style={{ backgroundColor: '#ef444422', color: '#ef4444', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>Overdue {a.days_overdue}d</span>
                                                        : <span style={{ backgroundColor: '#f59e0b22', color: '#f59e0b', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>Due Soon</span>
                                                    }
                                                </td>
                                                <td style={cell}>
                                                    <button onClick={() => shareEmail({ email: '', docType: 'maintenance', data: { machine_name: a.machine_name || a.machine_code, machine_code: a.machine_code, task_name: a.task_name, frequency: FREQ_LABEL[a.frequency] || a.frequency, last_done_date: a.last_done_date || '—', next_due_date: a.due_date, overdue_days: a.days_overdue || '0', status: a.is_overdue ? 'Overdue' : 'Due Soon', assigned_to: 'Team' } })}
                                                        style={{ padding: '3px 8px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, marginRight: 4 }}>📧</button>
                                                    <button onClick={() => shareWhatsApp({ phone: a.assigned_phone || '', docType: 'maintenance', data: { machine_name: a.machine_name || a.machine_code, machine_code: a.machine_code, task_name: a.task_name, frequency: FREQ_LABEL[a.frequency] || a.frequency, last_done_date: a.last_done_date || '—', next_due_date: a.due_date, overdue_days: a.days_overdue || '0', status: a.is_overdue ? 'Overdue' : 'Due Soon', assigned_to: 'Team' } })}
                                                        style={{ padding: '3px 8px', background: '#25d366', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11 }}>💬</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })()}
                    {alerts.length === 0 && (
                        <div style={{
                            backgroundColor: pt.dark ? '#14532d' : '#f0fdf4',
                            borderRadius: 10, padding: '12px 18px', marginBottom: 20,
                            fontSize: 13, color: pt.dark ? '#86efac' : '#166534',
                            border: `1px solid ${pt.dark ? '#166534' : '#bbf7d0'}`
                        }}>
                            ✓ All maintenance tasks are up to date.
                        </div>
                    )}

                    {msg && <div style={{
                        padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13,
                        backgroundColor: msg.includes('Error') || msg.includes('required')
                            ? (pt.dark ? '#7f1d1d' : '#fee2e2')
                            : (pt.dark ? '#14532d' : '#f0fdf4'),
                        color: msg.includes('Error') || msg.includes('required')
                            ? (pt.dark ? '#fff' : '#991b1b')
                            : (pt.dark ? '#fff' : '#166534'),
                    }}>{msg}</div>}

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                        <select value={filterMachine} onChange={e => setFilterMachine(e.target.value)}
                            style={{ ...inp, width: 220 }}>
                            <option value="">All Machines</option>
                            {machines.map(m => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
                        </select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            style={{ ...inp, width: 160 }}>
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="overdue">Overdue</option>
                            <option value="done">Done</option>
                        </select>
                    </div>

                    <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {['Pic', 'Machine', 'Task', 'Frequency', 'Due Date', 'Status', 'Completed By', 'Completed On', ''].map(h => (
                                        <th key={h} style={th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 && (
                                    <tr><td colSpan={9} style={{ ...cell, textAlign: 'center', color: pt.colors.muted, padding: 40 }}>No maintenance logs.</td></tr>
                                )}
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td style={{ ...cell, padding: '6px 10px', width: 52 }}>
                                            {log.image_url
                                                ? <img src={log.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: `1px solid ${pt.colors.border}`, cursor: 'pointer' }}
                                                    onClick={() => window.open(log.image_url, '_blank')} />
                                                : <div style={{ width: 40, height: 40, borderRadius: 6, border: `1px dashed ${pt.colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pt.colors.muted, fontSize: 16 }}>📷</div>
                                            }
                                        </td>
                                        <td style={{ ...cell, fontWeight: 600 }}>{log.machine_code}</td>
                                        <td style={cell}>{log.task_name}</td>
                                        <td style={cell}>
                                            <span style={{ fontSize: 11, color: pt.colors.muted }}>{FREQ_LABEL[log.frequency] || log.frequency}</span>
                                        </td>
                                        <td style={{ ...cell, color: log.status === 'overdue' ? '#ef4444' : '#f1f5f9' }}>{log.due_date}</td>
                                        <td style={cell}>
                                            <span style={{ backgroundColor: STATUS_COLORS[log.status] + '22', color: STATUS_COLORS[log.status], padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td style={cell}>{log.completed_by || '—'}</td>
                                        <td style={cell}>{log.completed_date || '—'}</td>
                                        <td style={cell}>
                                            {(log.status === 'pending' || log.status === 'overdue') && (
                                                <button onClick={() => openComplete(log)}
                                                    style={{ padding: '4px 12px', borderRadius: 6, border: 'none', backgroundColor: '#10b981', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                                                    Mark Done
                                                </button>
                                            )}
                                            {log.status === 'done' && <span style={{ color: '#10b981', fontSize: 12 }}>✓</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, padding: 28, maxWidth: 680 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${pt.colors.border}` }}>
                        <button onClick={() => setShowForm(false)}
                            style={{ padding: '7px 16px', background: '#0f172a', color: pt.colors.muted, border: `1px solid ${pt.colors.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            ← Back
                        </button>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Mark Maintenance Done</h3>
                            <p style={{ margin: '3px 0 0', fontSize: 13, color: pt.colors.dimText }}>
                                {selected?.machine_code} · {selected?.task_name} · Due {selected?.due_date}
                            </p>
                        </div>
                    </div>

                    {selected?.task_type === 'measurement' && selected?.measurement_labels?.length > 0 && (
                        <div style={{ margin: '0 0 16px', padding: '16px', backgroundColor: pt.colors.inner, borderRadius: 8, border: '1px solid #1e3a5f' }}>
                            <p style={{ margin: '0 0 12px', color: '#93c5fd', fontWeight: 600, fontSize: 13 }}>Measurement Values</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {selected.measurement_labels.map(l => (
                                    <div key={l.key}>
                                        <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 4 }}>{l.label}</label>
                                        <input
                                            value={form.measurements[l.key] || ''}
                                            onChange={e => setForm(f => ({ ...f, measurements: { ...f.measurements, [l.key]: e.target.value } }))}
                                            style={inp} placeholder="Enter value" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 14 }}>
                        <div>
                            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Completed By *</label>
                            <input value={form.completed_by} onChange={e => setForm(f => ({ ...f, completed_by: e.target.value }))}
                                style={inp} placeholder="Technician name" />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: pt.colors.muted, display: 'block', marginBottom: 5 }}>Remarks</label>
                            <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                                style={{ ...inp, height: 65, resize: 'vertical' }} placeholder="Any observations or notes…" />
                        </div>
                    </div>

                    {msg && <div style={{ padding: '8px 14px', borderRadius: 6, backgroundColor: '#7f1d1d', color: '#fff', marginBottom: 14, fontSize: 13 }}>{msg}</div>}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${pt.colors.border}`, backgroundColor: 'transparent', color: pt.colors.muted, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                        <button onClick={submit} disabled={loading}
                            style={{ padding: '9px 24px', borderRadius: 8, border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                            {loading ? 'Saving…' : 'Confirm Done'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
