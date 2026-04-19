// PAGE: Sample Testing — Physical lab tests on finished goods batches
import { useState, useEffect, useCallback } from 'react';

const empty = {
    batch_id: '', test_date: new Date().toISOString().slice(0, 10), tested_by: '',
    tensile_strength: '', elongation_pct: '', width_cm: '', weight_per_sqm: '',
    breaking_strength: '', tear_strength: '',
    custom_param_name: '', custom_param_value: '',
    result: 'pending', remarks: '',
};

export default function SampleTestingPage() {
    const [rows,    setRows]    = useState([]);
    const [batches, setBatches] = useState([]);
    const [result,  setResult]  = useState('');
    const [modal,   setModal]   = useState(false);
    const [form,    setForm]    = useState(empty);
    const [editId,  setEditId]  = useState(null);
    const [saving,  setSaving]  = useState(false);
    const [msg,     setMsg]     = useState('');
    const [detail,  setDetail]  = useState(null);

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (result) p.set('result', result);
        const res = await fetch(`/api/quality/sample-tests/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setRows(d.sample_tests || []);
    }, [result]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/production/batches/?status=finished', { credentials: 'include' })
            .then(r => r.json()).then(d => setBatches(d.batches || []));
    }, []);

    const openAdd  = () => { setForm(empty); setEditId(null); setMsg(''); setModal(true); };
    const openEdit = (r) => {
        setForm({
            batch_id: r.batch_id, test_date: r.test_date, tested_by: r.tested_by,
            tensile_strength: r.tensile_strength, elongation_pct: r.elongation_pct,
            width_cm: r.width_cm, weight_per_sqm: r.weight_per_sqm,
            breaking_strength: r.breaking_strength, tear_strength: r.tear_strength,
            custom_param_name: r.custom_param_name, custom_param_value: r.custom_param_value,
            result: r.result, remarks: r.remarks,
        });
        setEditId(r.id); setMsg(''); setModal(true);
    };

    const save = async () => {
        if (!form.batch_id) { setMsg('Batch is required'); return; }
        setSaving(true);
        const url = editId ? `/api/quality/sample-tests/${editId}/` : '/api/quality/sample-tests/';
        const res = await fetch(url, { method: editId ? 'PUT' : 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setModal(false); load(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });
    const RESULT_COLOR = { pass: '#10b981', fail: '#ef4444', conditional_pass: '#f59e0b', pending: '#64748b' };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Sample Testing</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Physical lab tests — tensile, elongation, weight, width on finished goods</p>
                </div>
                <button onClick={openAdd} style={btn('#14b8a6')}>+ New Sample Test</button>
            </div>

            <div style={{ marginBottom: 16 }}>
                <select value={result} onChange={e => setResult(e.target.value)} style={selectS}>
                    <option value="">All Results</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                    <option value="conditional_pass">Conditional Pass</option>
                    <option value="pending">Pending</option>
                </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['Test No', 'Date', 'Batch', 'Product', 'Tested By', 'Tensile (N)', 'Elongation (%)', 'Width (cm)', 'GSM', 'Result', 'Actions'].map(h =>
                        <th key={h} style={thS}>{h}</th>)}
                </tr></thead><tbody>
                    {rows.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                            <td style={tdS}><b style={{ color: '#14b8a6', cursor: 'pointer' }} onClick={() => setDetail(r)}>{r.test_number}</b></td>
                            <td style={tdS}>{r.test_date}</td>
                            <td style={tdS}><b style={{ color: '#3b82f6' }}>{r.batch_number}</b></td>
                            <td style={tdS}>{r.product_name}</td>
                            <td style={tdS}>{r.tested_by || '—'}</td>
                            <td style={tdS}>{r.tensile_strength || '—'}</td>
                            <td style={tdS}>{r.elongation_pct || '—'}</td>
                            <td style={tdS}>{r.width_cm || '—'}</td>
                            <td style={tdS}>{r.weight_per_sqm || '—'}</td>
                            <td style={tdS}><span style={tag(RESULT_COLOR[r.result] || '#64748b')}>{r.result?.replace('_', ' ')}</span></td>
                            <td style={tdS}>
                                <button onClick={() => setDetail(r)} style={smallBtn('#3b82f6')}>View</button>
                                <button onClick={() => openEdit(r)} style={smallBtn('#f59e0b')}>Edit</button>
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && <tr><td colSpan={11} style={emptyTd}>No sample tests recorded</td></tr>}
                </tbody></table>
            </div>

            {/* Add / Edit Modal */}
            {modal && (
                <div style={overlay}>
                    <div style={{ ...modalBox, width: 780 }}>
                        <h3 style={{ margin: '0 0 20px', color: '#14b8a6' }}>{editId ? 'Edit Sample Test' : 'New Sample Test'}</h3>

                        <div style={grid3}>
                            <F label="Batch *">
                                <select style={inpS} {...inp('batch_id')}>
                                    <option value="">Select batch…</option>
                                    {batches.map(b => <option key={b.id} value={b.id}>{b.batch_number} — {b.product_name}</option>)}
                                </select>
                            </F>
                            <F label="Test Date *"><input type="date" style={inpS} {...inp('test_date')} /></F>
                            <F label="Tested By"><input style={inpS} {...inp('tested_by')} /></F>
                        </div>

                        {/* Test Parameters */}
                        <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f766e', marginBottom: 12 }}>🔬 Test Parameters</div>
                            <div style={grid3}>
                                <F label="Tensile Strength (N)"><input type="number" step="0.01" style={inpS} {...inp('tensile_strength')} /></F>
                                <F label="Elongation (%)"><input type="number" step="0.01" style={inpS} {...inp('elongation_pct')} /></F>
                                <F label="Width (cm)"><input type="number" step="0.01" style={inpS} {...inp('width_cm')} /></F>
                                <F label="Weight / sqm (GSM)"><input type="number" step="0.01" style={inpS} {...inp('weight_per_sqm')} /></F>
                                <F label="Breaking Strength (N)"><input type="number" step="0.01" style={inpS} {...inp('breaking_strength')} /></F>
                                <F label="Tear Strength (N)"><input type="number" step="0.01" style={inpS} {...inp('tear_strength')} /></F>
                                <F label="Custom Param Name"><input style={inpS} placeholder="e.g. Air Permeability" {...inp('custom_param_name')} /></F>
                                <F label="Custom Param Value"><input style={inpS} placeholder="e.g. 120 cc/s/cm²" {...inp('custom_param_value')} /></F>
                            </div>
                        </div>

                        <div style={grid2}>
                            <F label="Result *">
                                <select style={inpS} {...inp('result')}>
                                    <option value="pending">⏳ Pending</option>
                                    <option value="pass">✅ Pass</option>
                                    <option value="conditional_pass">⚠️ Conditional Pass</option>
                                    <option value="fail">❌ Fail</option>
                                </select>
                            </F>
                            <F label="Remarks"><input style={inpS} {...inp('remarks')} /></F>
                        </div>

                        {msg && <div style={{ color: '#ef4444', marginTop: 8 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn('#14b8a6')}>{saving ? 'Saving…' : 'Save Test'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detail && (
                <div style={overlay}>
                    <div style={{ ...modalBox, width: 600 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, color: '#14b8a6' }}>{detail.test_number}</h3>
                            <button onClick={() => setDetail(null)} style={smallBtn('#64748b')}>✕ Close</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[
                                ['Batch', detail.batch_number], ['Product', detail.product_name],
                                ['Test Date', detail.test_date], ['Tested By', detail.tested_by || '—'],
                                ['Result', detail.result?.replace('_', ' ')],
                                ['Tensile Strength', detail.tensile_strength ? `${detail.tensile_strength} N` : '—'],
                                ['Elongation', detail.elongation_pct ? `${detail.elongation_pct}%` : '—'],
                                ['Width', detail.width_cm ? `${detail.width_cm} cm` : '—'],
                                ['GSM', detail.weight_per_sqm ? `${detail.weight_per_sqm} g/m²` : '—'],
                                ['Breaking Strength', detail.breaking_strength ? `${detail.breaking_strength} N` : '—'],
                                ['Tear Strength', detail.tear_strength ? `${detail.tear_strength} N` : '—'],
                                [detail.custom_param_name || 'Custom Param', detail.custom_param_value || '—'],
                                ['Remarks', detail.remarks || '—'],
                            ].map(([l, v]) => (
                                <div key={l} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>{l}</div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const F        = ({ label, children }) => (<div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>{label}</label>{children}</div>);
const btn      = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, marginRight: 4 });
const tableS   = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thS      = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdS      = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const overlay  = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 };
const modalBox = { background: '#fff', borderRadius: 12, padding: 28, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const grid2    = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 };
const grid3    = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 };
const inpS     = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' };
const selectS  = { padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' };
const tag      = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const emptyTd  = { textAlign: 'center', padding: 40, color: '#94a3b8' };
