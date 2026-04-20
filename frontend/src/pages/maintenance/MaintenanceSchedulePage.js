// ============================================================
// FILE: pages/maintenance/MaintenanceSchedulePage.js
// PURPOSE: Create & manage maintenance task templates per machine
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const FREQUENCIES = [
    { value: 'daily',       label: 'Daily' },
    { value: 'weekly',      label: 'Weekly' },
    { value: '15_days',     label: 'Every 15 Days' },
    { value: 'monthly',     label: 'Monthly' },
    { value: '3_monthly',   label: 'Every 3 Months' },
    { value: '6_monthly',   label: 'Every 6 Months' },
    { value: 'yearly',      label: 'Yearly' },
    { value: 'beam_change', label: 'Every Beam Change' },
];

const FREQ_COLOR = {
    daily: '#ef4444', weekly: '#f97316', '15_days': '#f59e0b',
    monthly: '#10b981', '3_monthly': '#06b6d4', '6_monthly': '#3b82f6',
    yearly: '#8b5cf6', beam_change: '#ec4899',
};

const blankForm = {
    machine_id: '', task_name: '', frequency: 'monthly', task_type: 'checklist',
    instructions: '', measurement_labels: [],
};

export default function MaintenanceSchedulePage() {
    const [tasks,    setTasks]    = useState([]);
    const [machines, setMachines] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form,     setForm]     = useState(blankForm);
    const [editId,   setEditId]   = useState(null);
    const [loading,  setLoading]  = useState(false);
    const [msg,      setMsg]      = useState('');
    const [filterMachine, setFilterMachine] = useState('');
    const [filterFreq,    setFilterFreq]    = useState('');
    const [newLabel, setNewLabel] = useState({ label: '', key: '' });

    const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

    const load = useCallback(() => {
        const p = new URLSearchParams();
        if (filterMachine) p.set('machine_id', filterMachine);
        if (filterFreq) p.set('frequency', filterFreq);
        fetch(`/api/maintenance/tasks/?${p}`, { credentials: 'include' })
            .then(r => r.json()).then(d => setTasks(d.tasks || []));
    }, [filterMachine, filterFreq]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/masters/machines/', { credentials: 'include' })
            .then(r => r.json()).then(d => setMachines(d.machines || []));
    }, []);

    const openAdd = () => { setForm(blankForm); setEditId(null); setShowForm(true); };
    const openEdit = (t) => {
        setForm({
            machine_id: t.machine_id,
            task_name: t.task_name,
            frequency: t.frequency,
            task_type: t.task_type,
            instructions: t.instructions,
            measurement_labels: t.measurement_labels || [],
        });
        setEditId(t.id);
        setShowForm(true);
    };

    const submit = async () => {
        if (!form.machine_id || !form.task_name) { flash('Machine and task name are required.'); return; }
        setLoading(true);
        try {
            const url = editId ? `/api/maintenance/tasks/${editId}/` : '/api/maintenance/tasks/';
            const r = await fetch(url, {
                method: editId ? 'PUT' : 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const d = await r.json();
            if (d.success || d.task) { flash(editId ? 'Task updated.' : 'Task created.'); setShowForm(false); load(); }
            else flash(d.error || 'Error saving.');
        } finally { setLoading(false); }
    };

    const del = async (id) => {
        if (!window.confirm('Deactivate this task?')) return;
        await fetch(`/api/maintenance/tasks/${id}/`, { method: 'DELETE', credentials: 'include' });
        load();
    };

    const addLabel = () => {
        if (!newLabel.label) return;
        const key = newLabel.key || newLabel.label.toLowerCase().replace(/\s+/g, '_');
        setForm(f => ({ ...f, measurement_labels: [...f.measurement_labels, { label: newLabel.label, key }] }));
        setNewLabel({ label: '', key: '' });
    };

    const removeLabel = (i) => setForm(f => ({ ...f, measurement_labels: f.measurement_labels.filter((_, j) => j !== i) }));

    const grouped = tasks.reduce((acc, t) => {
        const k = t.machine_code;
        if (!acc[k]) acc[k] = { machine_name: t.machine_name, tasks: [] };
        acc[k].tasks.push(t);
        return acc;
    }, {});

    const cell = { padding: '10px 14px', borderBottom: '1px solid #1e293b', fontSize: 13, color: '#f1f5f9' };
    const th   = { ...cell, backgroundColor: '#0f172a', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 };
    const inp  = { padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 13, width: '100%', boxSizing: 'border-box' };

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: '#f1f5f9', minHeight: '100vh', backgroundColor: '#0b1120' }}>
            {!showForm ? (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Maintenance Schedule</h2>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Define recurring maintenance tasks per machine</p>
                        </div>
                        <button onClick={openAdd}
                            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                            + New Task
                        </button>
                    </div>

                    {msg && <div style={{ padding: '10px 16px', borderRadius: 8, backgroundColor: msg.includes('required') || msg.includes('Error') ? '#7f1d1d' : '#14532d', color: '#fff', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

                    <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                        <select value={filterMachine} onChange={e => setFilterMachine(e.target.value)}
                            style={{ ...inp, width: 220 }}>
                            <option value="">All Machines</option>
                            {machines.map(m => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
                        </select>
                        <select value={filterFreq} onChange={e => setFilterFreq(e.target.value)}
                            style={{ ...inp, width: 200 }}>
                            <option value="">All Frequencies</option>
                            {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                    </div>

                    {Object.keys(grouped).length === 0 && (
                        <div style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 48, textAlign: 'center', color: '#475569' }}>
                            No maintenance tasks yet. Click "+ New Task" to create one.
                        </div>
                    )}

                    {Object.entries(grouped).map(([machineCode, { machine_name, tasks: mTasks }]) => (
                        <div key={machineCode} style={{ backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                            <div style={{ padding: '12px 18px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ backgroundColor: '#10b98120', color: '#10b981', padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{machineCode}</span>
                                <span style={{ fontSize: 14, fontWeight: 600 }}>{machine_name}</span>
                                <span style={{ color: '#64748b', fontSize: 12 }}>· {mTasks.length} task{mTasks.length !== 1 ? 's' : ''}</span>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {['Task Name', 'Frequency', 'Type', 'Measurement Fields', 'Instructions', ''].map(h => (
                                            <th key={h} style={th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {mTasks.map(t => (
                                        <tr key={t.id}>
                                            <td style={{ ...cell, fontWeight: 600 }}>{t.task_name}</td>
                                            <td style={cell}>
                                                <span style={{ backgroundColor: (FREQ_COLOR[t.frequency] || '#64748b') + '22', color: FREQ_COLOR[t.frequency] || '#64748b', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                                                    {FREQUENCIES.find(f => f.value === t.frequency)?.label || t.frequency}
                                                </span>
                                            </td>
                                            <td style={cell}>
                                                <span style={{ color: t.task_type === 'measurement' ? '#f59e0b' : '#94a3b8', fontSize: 12 }}>
                                                    {t.task_type === 'measurement' ? 'Measurement' : 'Checklist'}
                                                </span>
                                            </td>
                                            <td style={cell}>
                                                {t.measurement_labels?.length > 0
                                                    ? t.measurement_labels.map((l, i) => (
                                                        <span key={i} style={{ backgroundColor: '#1e3a5f', color: '#93c5fd', padding: '2px 7px', borderRadius: 4, fontSize: 11, marginRight: 4 }}>{l.label}</span>
                                                    ))
                                                    : <span style={{ color: '#475569', fontSize: 12 }}>—</span>
                                                }
                                            </td>
                                            <td style={{ ...cell, color: '#94a3b8', fontSize: 12, maxWidth: 200 }}>{t.instructions || '—'}</td>
                                            <td style={cell}>
                                                <button onClick={() => openEdit(t)} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', backgroundColor: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 12, marginRight: 4 }}>Edit</button>
                                                <button onClick={() => del(t.id)} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Del</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </>
            ) : (
                <div style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 28, maxWidth: 780 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #334155' }}>
                        <button onClick={() => setShowForm(false)}
                            style={{ padding: '7px 16px', background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            ← Back
                        </button>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{editId ? 'Edit Maintenance Task' : 'New Maintenance Task'}</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div style={{ gridColumn: '1/-1' }}>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Machine *</label>
                            <select value={form.machine_id} onChange={e => setForm(f => ({ ...f, machine_id: e.target.value }))} style={inp}>
                                <option value="">— select machine —</option>
                                {machines.map(m => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1/-1' }}>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Task Name *</label>
                            <input value={form.task_name} onChange={e => setForm(f => ({ ...f, task_name: e.target.value }))}
                                style={inp} placeholder="e.g. Complete Oil Change in All Gearing Boxes" />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Frequency</label>
                            <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} style={inp}>
                                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Task Type</label>
                            <select value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))} style={inp}>
                                <option value="checklist">Checklist (just tick done)</option>
                                <option value="measurement">Measurement (capture values)</option>
                            </select>
                        </div>
                    </div>

                    {form.task_type === 'measurement' && (
                        <div style={{ margin: '0 0 14px', padding: '16px', backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e3a5f' }}>
                            <p style={{ margin: '0 0 12px', color: '#93c5fd', fontWeight: 600, fontSize: 13 }}>Measurement Fields</p>
                            <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: 12 }}>Define what values to capture (e.g. "Before Hz", "After Hz", "LHS", "RHS")</p>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <input value={newLabel.label} onChange={e => setNewLabel(l => ({ ...l, label: e.target.value }))}
                                    style={{ ...inp, flex: 2 }} placeholder="Field label (e.g. Before Hz)" />
                                <button onClick={addLabel}
                                    style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#1d4ed8', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {form.measurement_labels.map((l, i) => (
                                    <span key={i} style={{ backgroundColor: '#1e3a5f', color: '#93c5fd', padding: '4px 10px', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {l.label}
                                        <button onClick={() => removeLabel(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
                                    </span>
                                ))}
                                {form.measurement_labels.length === 0 && <span style={{ color: '#475569', fontSize: 12 }}>No fields added yet.</span>}
                            </div>
                        </div>
                    )}

                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 }}>Instructions / Notes</label>
                        <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                            style={{ ...inp, height: 65, resize: 'vertical' }}
                            placeholder="e.g. Use only SAE 40 grade oil. Check oil level indicator before changing." />
                    </div>

                    {msg && <div style={{ padding: '8px 14px', borderRadius: 6, backgroundColor: '#7f1d1d', color: '#fff', marginBottom: 14, fontSize: 13 }}>{msg}</div>}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                        <button onClick={submit} disabled={loading}
                            style={{ padding: '9px 24px', borderRadius: 8, border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                            {loading ? 'Saving…' : (editId ? 'Update Task' : 'Create Task')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
