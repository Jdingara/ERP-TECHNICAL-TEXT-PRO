// PAGE: Testing Parameters Master — Buying House ERP
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const empty = {
    parameter_code: '', parameter_name: '',
    test_standard: '', acceptance_criteria: '', unit: '',
};

export default function TestingParamsPage() {
    const pt = usePageTheme();
    const thS      = { ...pt.th, textAlign: 'left' };
    const tdS      = { ...pt.cell, verticalAlign: 'middle' };
    const inpS     = { ...pt.inp };
    const searchS  = { ...pt.inp, width: 280, outline: 'none' };
    const formPage = { ...pt.formPage, maxWidth: 860 };
    const formHeader = pt.formHeader;
    const backBtnS = pt.backBtn;

    const [rows, setRows]     = useState([]);
    const [search, setSearch] = useState('');
    const [modal, setModal]   = useState(false);
    const [form, setForm]     = useState(empty);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg]       = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (search) p.set('search', search);
        const res = await fetch(`/api/masters/testing-params/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.parameters || []);
    }, [search]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => {
        setForm({
            parameter_code: r.parameter_code, parameter_name: r.parameter_name,
            test_standard: r.test_standard, acceptance_criteria: r.acceptance_criteria,
            unit: r.unit,
        });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        setSaving(true);
        const url = editId ? `/api/masters/testing-params/${editId}/` : '/api/masters/testing-params/';
        const res = await fetch(url, {
            method: editId ? 'PUT' : 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || d.message || 'Error'); }
    };

    const del = async (id) => {
        if (!window.confirm('Deactivate this testing parameter?')) return;
        await fetch(`/api/masters/testing-params/${id}/`, { method: 'DELETE', credentials: 'include' });
        load();
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            {!modal ? (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Testing Parameters</h2>
                            <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>Standard test parameters with acceptance levels for product specs</p>
                        </div>
                        <button onClick={openAdd} style={btn('#ef4444')}>+ Add Parameter</button>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <input placeholder="Search code / name / standard…" value={search} onChange={e => setSearch(e.target.value)} style={searchS} />
                    </div>
                    <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                        <table style={tableS}><thead><tr>
                            {['Code', 'Parameter Name', 'Test Standard', 'Acceptance Criteria', 'Unit', 'Actions'].map(h => <th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {rows.map(r => (
                                <tr key={r.id}>
                                    <td style={{ ...tdS, fontWeight: 600 }}>{r.parameter_code}</td>
                                    <td style={tdS}>{r.parameter_name}</td>
                                    <td style={tdS}>{r.test_standard || '—'}</td>
                                    <td style={tdS}>{r.acceptance_criteria || '—'}</td>
                                    <td style={tdS}>{r.unit || '—'}</td>
                                    <td style={tdS}>
                                        <button onClick={() => openEdit(r)} style={smallBtn('#3b82f6')}>Edit</button>
                                        <button onClick={() => del(r.id)} style={smallBtn('#ef4444')}>Del</button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: pt.colors.muted }}>No testing parameters</td></tr>}
                        </tbody></table>
                    </div>
                </>
            ) : (
                <div style={formPage}>
                    <div style={formHeader}>
                        <button onClick={() => setModal(false)} style={backBtnS}>← Back to Testing Parameters</button>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{editId ? 'Edit Parameter' : 'Add Testing Parameter'}</h3>
                    </div>
                    <div style={grid2}>
                        <F label="Parameter Code *"><input style={inpS} {...inp('parameter_code')} /></F>
                        <F label="Parameter Name *"><input style={inpS} {...inp('parameter_name')} /></F>
                        <F label="Test Standard">
                            <input style={inpS} placeholder="e.g. AATCC 61, ISO 105-C06, ASTM D5034" {...inp('test_standard')} />
                        </F>
                        <F label="Unit">
                            <input style={inpS} placeholder="e.g. %, N, mm, grade (1-5)" {...inp('unit')} />
                        </F>
                    </div>
                    <F label="Acceptance Criteria">
                        <input style={{ ...inpS, width: '100%' }} placeholder="e.g. Min Grade 3-4, Max 2% shrinkage, Min 25N" {...inp('acceptance_criteria')} />
                    </F>
                    {msg && <div style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>{msg}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                        <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                        <button onClick={save} disabled={saving} style={btn('#ef4444')}>{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function F({ label, children }) {
    const { settings } = useSettings();
    const muted = settings.themeMode === 'dark' ? '#94a3b8' : '#475569';
    return <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 4 }}>{label}</label>{children}</div>;
}
const btn      = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const tableS   = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const grid2    = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
