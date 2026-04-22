// ============================================================
// FILE: pages/settings/EmailTemplatesPage.js
// PURPOSE: Email & WhatsApp template builder.
//          One subject + body template per document type.
//          Templates stored in localStorage and used by shareUtils.
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DOC_TYPES, getTemplate, saveTemplate } from '../../utils/shareUtils';

export default function EmailTemplatesPage() {
    const navigate = useNavigate();
    const [activeKey, setActiveKey] = useState(DOC_TYPES[0].key);
    const [drafts, setDrafts]       = useState({});
    const [saved,  setSaved]        = useState(null);

    // Load all templates into drafts state on mount
    useEffect(() => {
        const initial = {};
        DOC_TYPES.forEach(dt => {
            initial[dt.key] = getTemplate(dt.key);
        });
        setDrafts(initial);
    }, []);

    const active  = DOC_TYPES.find(d => d.key === activeKey);
    const draft   = drafts[activeKey] || { subject: '', body: '' };

    const update = (field, val) =>
        setDrafts(prev => ({ ...prev, [activeKey]: { ...prev[activeKey], [field]: val } }));

    const handleSave = () => {
        saveTemplate(activeKey, draft.subject, draft.body);
        setSaved(activeKey);
        setTimeout(() => setSaved(null), 2500);
    };

    const handleReset = () => {
        const def = DOC_TYPES.find(d => d.key === activeKey);
        if (!def) return;
        setDrafts(prev => ({ ...prev, [activeKey]: { subject: def.defaultSubject, body: def.defaultBody } }));
    };

    return (
        <div style={{ padding: 24, maxWidth: 980 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <button onClick={() => navigate('/settings')}
                    style={{ padding: '6px 14px', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b' }}>
                    ← Settings
                </button>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Email & WhatsApp Templates</h2>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                        One template per document type — used when you click Email or WhatsApp on any document.
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

                {/* Left — doc type tabs */}
                <div style={{ width: 190, flexShrink: 0 }}>
                    {DOC_TYPES.map(dt => (
                        <button key={dt.key} onClick={() => setActiveKey(dt.key)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                width: '100%', textAlign: 'left', padding: '10px 14px',
                                marginBottom: 6, borderRadius: 10, border: 'none', cursor: 'pointer',
                                fontSize: 13, fontWeight: activeKey === dt.key ? 700 : 500,
                                background: activeKey === dt.key ? dt.color + '18' : '#f8fafc',
                                color: activeKey === dt.key ? dt.color : '#475569',
                                borderLeft: activeKey === dt.key ? `3px solid ${dt.color}` : '3px solid transparent',
                                transition: 'all 0.15s',
                            }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: dt.color, flexShrink: 0 }} />
                            {dt.label}
                            {saved === dt.key && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#10b981' }}>✓</span>}
                        </button>
                    ))}

                    {/* Info box */}
                    <div style={{ marginTop: 20, padding: '12px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, fontSize: 11, color: '#92400e', lineHeight: 1.6 }}>
                        <b>How it works:</b><br />
                        Click <b>Email</b> on any document — your default mail app opens with the template pre-filled.<br /><br />
                        Click <b>WhatsApp</b> — opens WhatsApp with the body text pre-filled.
                    </div>
                </div>

                {/* Right — editor */}
                <div style={{ flex: 1 }}>
                    {/* Doc type header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: active.color }} />
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: active.color }}>
                            {active.label} Template
                        </h3>
                    </div>

                    {/* Subject */}
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Email Subject
                    </label>
                    <input
                        value={draft.subject}
                        onChange={e => update('subject', e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }}
                        placeholder="Subject line…"
                    />

                    {/* Body */}
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Message Body
                    </label>
                    <textarea
                        value={draft.body}
                        onChange={e => update('body', e.target.value)}
                        rows={14}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.7 }}
                        placeholder="Message body…"
                    />

                    {/* Placeholder chips */}
                    <div style={{ marginTop: 10, marginBottom: 20 }}>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginRight: 8 }}>PLACEHOLDERS:</span>
                        {active.placeholders.map(ph => (
                            <span key={ph}
                                onClick={() => update('body', draft.body + ph)}
                                title="Click to insert"
                                style={{ display: 'inline-block', padding: '3px 9px', background: active.color + '15', color: active.color, borderRadius: 20, fontSize: 11, fontWeight: 600, marginRight: 6, marginBottom: 6, cursor: 'pointer', userSelect: 'none' }}>
                                {ph}
                            </span>
                        ))}
                        <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginTop: 4 }}>
                            Click a placeholder to append it to the body. These will be replaced with real values when you share.
                        </span>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button onClick={handleSave}
                            style={{ padding: '10px 28px', background: active.color, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                            {saved === activeKey ? '✓ Saved!' : 'Save Template'}
                        </button>
                        <button onClick={handleReset}
                            style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                            Reset to Default
                        </button>
                    </div>

                    {/* Live preview */}
                    <div style={{ marginTop: 28 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                            Preview (with sample values)
                        </div>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', fontSize: 12, color: '#334155', lineHeight: 1.8 }}>
                            <div style={{ fontWeight: 700, marginBottom: 10, color: '#1e293b', fontSize: 13 }}>
                                Subject: {fillSample(draft.subject, active.key)}
                            </div>
                            <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', color: '#475569' }}>
                                {fillSample(draft.body, active.key)}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Sample values for preview only
const SAMPLE_DATA = {
    so_number: 'SO-20260422-001', customer_name: 'Lakshmi Textiles', product_name: 'PP Woven Fabric',
    order_quantity: '500 m', required_date: '2026-05-15', total_amount: '75,000',
    po_number: 'PO-20260422-001', vendor_name: 'Reliance Fibres Ltd', expected_date: '2026-05-10', order_date: '2026-04-22',
    invoice_number: 'SINV-20260422-001', due_date: '2026-05-22', balance_due: '50,000', dispatch_number: 'DC-20260422-001',
    grn_number: 'GRN-20260422-001', receipt_date: '2026-04-22',
    dispatch_date: '2026-04-22', vehicle_number: 'TN01AB1234', lr_number: 'LR-8891', transporter: 'Fast Cargo',
    report_name: 'Sales Summary Report', period: 'April 2026', generated_date: '2026-04-22', total_entries: '42', summary: 'Total Sales ₹12,50,000 across 42 orders',
    machine_name: 'Loom Machine 1', machine_code: 'LM-01', task_name: '6-Month Gear Inspection', frequency: '6 Months',
    last_done_date: '2025-10-22', next_due_date: '2026-04-22', overdue_days: '5', status: 'Overdue', assigned_to: 'Maintenance Team',
};

function fillSample(text, _key) {
    return (text || '').replace(/\{\{(\w+)\}\}/g, (_, k) => SAMPLE_DATA[k] ?? `[${k}]`);
}
