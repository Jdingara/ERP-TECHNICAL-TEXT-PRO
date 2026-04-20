// ============================================================
// FILE: pages/maintenance/EscalationPage.js
// PURPOSE: Configure email/WhatsApp escalation per machine
// ============================================================

import { useState, useEffect, useCallback } from 'react';

export default function EscalationPage() {
    const [escalations, setEscalations] = useState([]);
    const [machines,    setMachines]    = useState([]);
    const [showForm,    setShowForm]    = useState(false);
    const [editId,      setEditId]      = useState(null);
    const [loading,     setLoading]     = useState(false);
    const [msg,         setMsg]         = useState('');

    const blank = {
        machine_id: '', reminder_days: '1',
        enable_email: false, enable_whatsapp: false,
        level1_name: '', level1_email: '', level1_phone: '', level1_grace_hours: '24',
        level2_name: '', level2_email: '', level2_phone: '', level2_grace_hours: '48',
        level3_name: '', level3_email: '', level3_phone: '',
    };
    const [form, setForm] = useState(blank);
    const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

    const load = useCallback(() => {
        fetch('/api/maintenance/escalation/', { credentials: 'include' })
            .then(r => r.json()).then(d => setEscalations(d.escalations || []));
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/masters/machines/', { credentials: 'include' })
            .then(r => r.json()).then(d => setMachines(d.machines || []));
    }, []);

    const openAdd = () => { setForm(blank); setEditId(null); setShowForm(true); };
    const openEdit = (e) => {
        setForm({
            machine_id: e.machine_id,
            reminder_days: String(e.reminder_days),
            enable_email: e.enable_email,
            enable_whatsapp: e.enable_whatsapp,
            level1_name: e.level1_name, level1_email: e.level1_email, level1_phone: e.level1_phone,
            level1_grace_hours: String(e.level1_grace_hours),
            level2_name: e.level2_name, level2_email: e.level2_email, level2_phone: e.level2_phone,
            level2_grace_hours: String(e.level2_grace_hours),
            level3_name: e.level3_name, level3_email: e.level3_email, level3_phone: e.level3_phone,
        });
        setEditId(e.id);
        setShowForm(true);
    };

    const submit = async () => {
        if (!form.machine_id) { flash('Please select a machine.'); return; }
        setLoading(true);
        try {
            const url = editId ? `/api/maintenance/escalation/${editId}/` : '/api/maintenance/escalation/';
            const r = await fetch(url, {
                method: editId ? 'PUT' : 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    reminder_days: parseInt(form.reminder_days) || 1,
                    level1_grace_hours: parseInt(form.level1_grace_hours) || 24,
                    level2_grace_hours: parseInt(form.level2_grace_hours) || 48,
                }),
            });
            const d = await r.json();
            if (d.success) { flash('Escalation config saved.'); setShowForm(false); load(); }
            else flash(d.error || 'Error saving.');
        } finally { setLoading(false); }
    };

    const del = async (id) => {
        if (!window.confirm('Remove escalation config for this machine?')) return;
        await fetch(`/api/maintenance/escalation/${id}/`, { method: 'DELETE', credentials: 'include' });
        load();
    };

    const F = ({ label, children }) => (
        <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>{label}</label>
            {children}
        </div>
    );
    const inp = { padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f1f5f9', fontSize: 13, width: '100%', boxSizing: 'border-box' };
    const cell = { padding: '10px 14px', borderBottom: '1px solid #1e293b', fontSize: 13, color: '#f1f5f9' };
    const th   = { ...cell, backgroundColor: '#0f172a', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: 11 };

    const levelCard = (level, color, label) => (
        <div style={{ padding: 16, backgroundColor: '#0f172a', borderRadius: 8, border: `1px solid ${color}30`, marginBottom: 12 }}>
            <p style={{ margin: '0 0 12px', color, fontWeight: 700, fontSize: 13 }}>{label}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <F label="Name">
                    <input value={form[`level${level}_name`]} onChange={e => setForm(f => ({ ...f, [`level${level}_name`]: e.target.value }))} style={inp} placeholder="Full name" />
                </F>
                <F label="Email">
                    <input type="email" value={form[`level${level}_email`]} onChange={e => setForm(f => ({ ...f, [`level${level}_email`]: e.target.value }))} style={inp} placeholder="email@company.com" />
                </F>
                <F label="WhatsApp Number">
                    <input value={form[`level${level}_phone`]} onChange={e => setForm(f => ({ ...f, [`level${level}_phone`]: e.target.value }))} style={inp} placeholder="+91 9999999999" />
                </F>
            </div>
            {level < 3 && (
                <div style={{ marginTop: 10 }}>
                    <F label={`Escalate to next level after (hours)`}>
                        <input type="number" value={form[`level${level}_grace_hours`]} onChange={e => setForm(f => ({ ...f, [`level${level}_grace_hours`]: e.target.value }))} style={{ ...inp, width: 120 }} />
                    </F>
                </div>
            )}
        </div>
    );

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: '#f1f5f9', minHeight: '100vh', backgroundColor: '#0b1120' }}>
            {!showForm ? (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Escalation Settings</h2>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Configure email / WhatsApp alerts per machine</p>
                        </div>
                        <button onClick={openAdd}
                            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                            + Configure Machine
                        </button>
                    </div>

                    {msg && <div style={{ padding: '10px 16px', borderRadius: 8, backgroundColor: msg.includes('Error') ? '#7f1d1d' : '#14532d', color: '#fff', marginBottom: 16, fontSize: 13 }}>{msg}</div>}

                    <div style={{ backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {['Machine', 'Reminder', 'Email', 'WhatsApp', 'L1 Contact', 'L2 Contact', 'L3 Contact', ''].map(h => (
                                        <th key={h} style={th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {escalations.length === 0 && (
                                    <tr><td colSpan={8} style={{ ...cell, textAlign: 'center', color: '#475569', padding: 40 }}>No escalation configs yet.</td></tr>
                                )}
                                {escalations.map(e => (
                                    <tr key={e.id}>
                                        <td style={{ ...cell, fontWeight: 600 }}>{e.machine_code} <span style={{ color: '#64748b', fontWeight: 400 }}>{e.machine_name}</span></td>
                                        <td style={cell}>{e.reminder_days}d before</td>
                                        <td style={cell}>
                                            <span style={{ color: e.enable_email ? '#10b981' : '#475569', fontSize: 12 }}>{e.enable_email ? '● On' : '○ Off'}</span>
                                        </td>
                                        <td style={cell}>
                                            <span style={{ color: e.enable_whatsapp ? '#10b981' : '#475569', fontSize: 12 }}>{e.enable_whatsapp ? '● On' : '○ Off'}</span>
                                        </td>
                                        <td style={cell}>{e.level1_name || '—'} {e.level1_email && <span style={{ color: '#64748b', fontSize: 11 }}><br />{e.level1_email}</span>}</td>
                                        <td style={cell}>{e.level2_name || '—'} {e.level2_email && <span style={{ color: '#64748b', fontSize: 11 }}><br />{e.level2_email}</span>}</td>
                                        <td style={cell}>{e.level3_name || '—'} {e.level3_email && <span style={{ color: '#64748b', fontSize: 11 }}><br />{e.level3_email}</span>}</td>
                                        <td style={cell}>
                                            <button onClick={() => openEdit(e)} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', backgroundColor: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 12, marginRight: 4 }}>Edit</button>
                                            <button onClick={() => del(e.id)} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Del</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 28, maxWidth: 860 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #334155' }}>
                        <button onClick={() => setShowForm(false)}
                            style={{ padding: '7px 16px', background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            ← Back
                        </button>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{editId ? 'Edit Escalation Config' : 'New Escalation Config'}</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                        <div style={{ gridColumn: '1/-1' }}>
                            <F label="Machine *">
                                <select value={form.machine_id} onChange={e => setForm(f => ({ ...f, machine_id: e.target.value }))} style={inp}>
                                    <option value="">— select machine —</option>
                                    {machines.map(m => <option key={m.id} value={m.id}>{m.machine_code} — {m.machine_name}</option>)}
                                </select>
                            </F>
                        </div>
                        <F label="Reminder Days Before Due">
                            <input type="number" min="0" value={form.reminder_days} onChange={e => setForm(f => ({ ...f, reminder_days: e.target.value }))} style={{ ...inp, width: 100 }} />
                        </F>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'center', paddingTop: 18 }}>
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
                                <input type="checkbox" checked={form.enable_email} onChange={e => setForm(f => ({ ...f, enable_email: e.target.checked }))} />
                                <span>Enable Email Notifications</span>
                            </label>
                            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
                                <input type="checkbox" checked={form.enable_whatsapp} onChange={e => setForm(f => ({ ...f, enable_whatsapp: e.target.checked }))} />
                                <span>Enable WhatsApp Notifications</span>
                            </label>
                        </div>
                    </div>

                    {levelCard(1, '#10b981', 'Level 1 — Primary Responsible Person')}
                    {levelCard(2, '#f59e0b', 'Level 2 — Assistant Manager (escalated if L1 does not confirm)')}
                    {levelCard(3, '#ef4444', 'Level 3 — Maintenance Manager (final escalation)')}

                    {msg && <div style={{ padding: '8px 14px', borderRadius: 6, backgroundColor: '#7f1d1d', color: '#fff', marginBottom: 14, fontSize: 13 }}>{msg}</div>}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                        <button onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                        <button onClick={submit} disabled={loading}
                            style={{ padding: '9px 24px', borderRadius: 8, border: 'none', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                            {loading ? 'Saving…' : 'Save Config'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
