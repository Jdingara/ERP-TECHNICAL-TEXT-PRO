// PAGE: Payments — Buying House ERP
// Unified view: money received from customers + money paid to vendors
import { useState, useEffect, useCallback } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';
import { useSettings } from '../../context/SettingsContext';

const METHOD_LABEL = {
    bank_transfer: 'Bank Transfer',
    lc:            'Letter of Credit',
    cheque:        'Cheque',
    cash:          'Cash',
    other:         'Other',
};
const METHODS    = Object.entries(METHOD_LABEL).map(([v, l]) => ({ value: v, label: l }));
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'INR', 'OTHER'];

const emptyForm = {
    payment_type: 'received',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    currency: 'USD',
    payment_method: 'bank_transfer',
    reference: '',
    sales_invoice_id: '',
    purchase_invoice_id: '',
    notes: '',
};

export default function PaymentsPage() {
    const pt   = usePageTheme();
    const thS  = { ...pt.th, textAlign: 'left' };
    const tdS  = { ...pt.cell, verticalAlign: 'middle' };
    const inpS = { ...pt.inp };

    const [rows, setRows]       = useState([]);
    const [typeFilter, setType] = useState('');
    const [modal, setModal]     = useState(false);
    const [form, setForm]       = useState(emptyForm);
    const [siList, setSiList]   = useState([]);
    const [piList, setPiList]   = useState([]);
    const [summary, setSummary] = useState(null);
    const [saving, setSaving]   = useState(false);
    const [msg, setMsg]         = useState('');

    const load = useCallback(async () => {
        const p = new URLSearchParams();
        if (typeFilter) p.set('type', typeFilter);
        const [pRes, sRes] = await Promise.all([
            fetch(`/api/finance/payments/?${p}`, { credentials: 'include' }).then(r => r.json()),
            fetch('/api/finance/summary/', { credentials: 'include' }).then(r => r.json()),
        ]);
        setRows(pRes.payments || []);
        setSummary(sRes.summary || null);
    }, [typeFilter]);

    const loadDropdowns = useCallback(async () => {
        const [si, pi] = await Promise.all([
            fetch('/api/finance/si/', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/finance/pi/', { credentials: 'include' }).then(r => r.json()),
        ]);
        setSiList((si.sales_invoices || []).filter(i => i.balance_due > 0));
        setPiList((pi.purchase_invoices || []).filter(i => i.balance_due > 0));
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

    const inp = (f) => ({ value: form[f], onChange: e => setForm(p => ({ ...p, [f]: e.target.value })) });

    const save = async () => {
        if (!form.amount || !form.payment_date) { setMsg('Amount and date are required.'); return; }
        setSaving(true); setMsg('');
        const payload = {
            ...form,
            amount: parseFloat(form.amount),
            sales_invoice_id: form.payment_type === 'received' ? (form.sales_invoice_id || null) : null,
            purchase_invoice_id: form.payment_type === 'made' ? (form.purchase_invoice_id || null) : null,
        };
        const res = await fetch('/api/finance/payments/', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        setSaving(false);
        if (res.ok) { setModal(false); load(); loadDropdowns(); }
        else { const d = await res.json(); setMsg(d.error || 'Error'); }
    };

    const deletePayment = async (id) => {
        if (!window.confirm('Delete this payment record?')) return;
        await fetch(`/api/finance/payments/${id}/`, { method: 'DELETE', credentials: 'include' });
        load(); loadDropdowns();
    };

    const received = rows.filter(r => r.payment_type === 'received');
    const made     = rows.filter(r => r.payment_type === 'made');
    const totalIn  = received.reduce((s, r) => s + r.amount, 0);
    const totalOut = made.reduce((s, r) => s + r.amount, 0);

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Payments</h2>
                    <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>Track money received from customers and paid to vendors</p>
                </div>
                <button onClick={() => { setForm(emptyForm); setMsg(''); setModal(true); }} style={btn('#10b981')}>+ Record Payment</button>
            </div>

            {/* Summary cards */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
                    {[
                        { label: 'Total Receivable', value: `$${summary.total_receivable.toLocaleString()}`, color: '#10b981' },
                        { label: 'Overdue Receivable', value: `$${summary.overdue_receivable.toLocaleString()}`, color: '#ef4444' },
                        { label: 'Total Payable', value: summary.total_payable.toLocaleString(), color: '#f59e0b' },
                        { label: 'Overdue Payable', value: summary.overdue_payable.toLocaleString(), color: '#f97316' },
                        { label: 'Net Position', value: `$${summary.net_position.toLocaleString()}`, color: summary.net_position >= 0 ? '#10b981' : '#ef4444' },
                    ].map(c => (
                        <div key={c.label} style={{ background: pt.colors.card, borderRadius: 12, padding: '14px 18px', border: `1px solid ${pt.colors.border || '#e2e8f0'}` }}>
                            <div style={{ fontSize: 11, color: pt.colors.dimText, marginBottom: 4 }}>{c.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Type filter tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[
                    { v: '',         label: `All (${rows.length})`,          color: '#64748b' },
                    { v: 'received', label: `Received (${received.length})`, color: '#10b981' },
                    { v: 'made',     label: `Made (${made.length})`,         color: '#f59e0b' },
                ].map(t => (
                    <button key={t.v} onClick={() => setType(t.v)} style={filterPill(typeFilter === t.v, t.color)}>
                        {t.label}
                    </button>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, fontSize: 13, alignItems: 'center' }}>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>↓ In: {totalIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>↑ Out: {totalOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr>
                        {['Payment No.', 'Type', 'Date', 'Amount', 'Method', 'Reference', 'Invoice', 'Notes', ''].map(h =>
                            <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {rows.map(r => {
                            const isIn = r.payment_type === 'received';
                            const inv  = isIn ? r.si_number : r.pi_number;
                            return (
                                <tr key={r.id}>
                                    <td style={{ ...tdS, fontWeight: 700, color: '#10b981' }}>{r.payment_number}</td>
                                    <td style={tdS}>
                                        <span style={tag(isIn ? '#10b981' : '#f59e0b')}>
                                            {isIn ? '↓ Received' : '↑ Made'}
                                        </span>
                                    </td>
                                    <td style={tdS}>{r.payment_date}</td>
                                    <td style={{ ...tdS, fontWeight: 700, color: isIn ? '#10b981' : '#f59e0b' }}>
                                        {isIn ? '+' : '−'} {r.currency} {Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={tdS}>{METHOD_LABEL[r.payment_method] || r.payment_method}</td>
                                    <td style={{ ...tdS, fontFamily: 'monospace', fontSize: 12, color: pt.colors.dimText }}>{r.reference || '—'}</td>
                                    <td style={{ ...tdS, color: isIn ? '#3b82f6' : '#f59e0b', fontWeight: 600 }}>{inv || '—'}</td>
                                    <td style={{ ...tdS, color: pt.colors.dimText }}>{r.notes || '—'}</td>
                                    <td style={tdS}>
                                        <button onClick={() => deletePayment(r.id)} style={smallBtn('#ef4444')}>Del</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
                                No payments recorded yet.
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div style={overlay}>
                    <div style={{ ...modalBox(pt), maxWidth: 580 }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Record Payment</h3>

                        {/* Type toggle */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            {[
                                { v: 'received', label: '↓ Received from Customer', color: '#10b981' },
                                { v: 'made',     label: '↑ Made to Vendor',         color: '#f59e0b' },
                            ].map(t => (
                                <button key={t.v} onClick={() => setForm(p => ({ ...p, payment_type: t.v }))}
                                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${t.color}`, background: form.payment_type === t.v ? t.color : 'transparent', color: form.payment_type === t.v ? '#fff' : t.color, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <div style={grid2}>
                            <F label="Payment Date *"><input type="date" style={inpS} {...inp('payment_date')} /></F>
                            <F label="Currency">
                                <select style={inpS} {...inp('currency')}>
                                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </F>
                            <F label="Amount *"><input type="number" style={inpS} placeholder="0.00" step="0.01" {...inp('amount')} /></F>
                            <F label="Payment Method">
                                <select style={inpS} {...inp('payment_method')}>
                                    {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </F>
                            <F label="Reference / TT No."><input style={inpS} placeholder="Bank ref, Cheque no., LC no." {...inp('reference')} /></F>
                            {form.payment_type === 'received' ? (
                                <F label="Against Sales Invoice">
                                    <select style={inpS} {...inp('sales_invoice_id')}>
                                        <option value="">— Not linked —</option>
                                        {siList.map(i => <option key={i.id} value={i.id}>{i.invoice_number} (due {i.currency} {Number(i.balance_due).toLocaleString()})</option>)}
                                    </select>
                                </F>
                            ) : (
                                <F label="Against Purchase Invoice">
                                    <select style={inpS} {...inp('purchase_invoice_id')}>
                                        <option value="">— Not linked —</option>
                                        {piList.map(i => <option key={i.id} value={i.id}>{i.invoice_number} — {i.vendor_name} (due {i.currency} {Number(i.balance_due).toLocaleString()})</option>)}
                                    </select>
                                </F>
                            )}
                        </div>
                        <F label="Notes"><textarea style={{ ...inpS, height: 60, resize: 'vertical', width: '100%' }} {...inp('notes')} /></F>
                        {msg && <div style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>{msg}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button onClick={() => setModal(false)} style={smallBtn('#64748b')}>Cancel</button>
                            <button onClick={save} disabled={saving} style={btn(form.payment_type === 'received' ? '#10b981' : '#f59e0b')}>
                                {saving ? 'Saving…' : 'Record Payment'}
                            </button>
                        </div>
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
const btn        = (bg) => ({ padding: '8px 18px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const smallBtn   = (bg) => ({ padding: '4px 10px', background: bg, color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 });
const tag        = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
const filterPill = (active, color) => ({ padding: '4px 12px', borderRadius: 20, border: `1px solid ${color}`, background: active ? color : 'transparent', color: active ? '#fff' : color, fontSize: 12, fontWeight: 600, cursor: 'pointer' });
const overlay    = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox   = (pt) => ({ background: pt.colors.card, borderRadius: 16, padding: 28, width: '90%', maxHeight: '90vh', overflowY: 'auto' });
const grid2      = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 };
