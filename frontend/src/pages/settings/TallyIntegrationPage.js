// PAGE: Tally Integration — Export invoices to Tally XML format
import { useState } from 'react';

export default function TallyIntegrationPage() {
    const [exportType, setExportType] = useState('purchase');
    const [fromDate,   setFromDate]   = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
    const [toDate,     setToDate]     = useState(new Date().toISOString().slice(0, 10));
    const [format,     setFormat]     = useState('xml');
    const [preview,    setPreview]    = useState(null);
    const [loading,    setLoading]    = useState(false);
    const [msg,        setMsg]        = useState('');

    const loadPreview = async () => {
        setLoading(true); setMsg('');
        const p = new URLSearchParams({ type: exportType, from_date: fromDate, to_date: toDate, format: 'json' });
        const res = await fetch(`/api/reports/tally-export/?${p}`, { credentials: 'include' });
        const d = await res.json();
        setPreview(d);
        setLoading(false);
    };

    const downloadXml = async () => {
        setMsg('');
        const p = new URLSearchParams({ type: exportType, from_date: fromDate, to_date: toDate, format: 'xml' });
        const res = await fetch(`/api/reports/tally-export/?${p}`, { credentials: 'include' });
        if (!res.ok) { setMsg('Error generating export'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tally_${exportType}_${fromDate}_to_${toDate}.xml`;
        a.click();
        URL.revokeObjectURL(url);
        setMsg(`✅ Downloaded ${preview?.count || ''} ${exportType} vouchers`);
    };

    return (
        <div style={{ padding: 24, maxWidth: 900 }}>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Tally Integration</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
                    Export Purchase Invoices and Sales Invoices to Tally XML format for import into Tally ERP / TallyPrime
                </p>
            </div>

            {/* How it works */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8', marginBottom: 8 }}>ℹ️ How to import into Tally</div>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#1e40af', lineHeight: 1.8 }}>
                    <li>Select the type (Purchase or Sales), date range, and click <b>Preview</b></li>
                    <li>Verify the vouchers list looks correct</li>
                    <li>Click <b>Download XML</b> to get the Tally import file</li>
                    <li>In Tally: Go to <b>Gateway of Tally → Import Data → Vouchers</b></li>
                    <li>Select the downloaded XML file and import</li>
                </ol>
            </div>

            {/* Export Settings */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 18px', fontSize: 15 }}>Export Settings</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                        <label style={labelS}>Export Type</label>
                        <select value={exportType} onChange={e => { setExportType(e.target.value); setPreview(null); }} style={inpS}>
                            <option value="purchase">Purchase Invoices</option>
                            <option value="sales">Sales Invoices</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelS}>From Date</label>
                        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPreview(null); }} style={inpS} />
                    </div>
                    <div>
                        <label style={labelS}>To Date</label>
                        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPreview(null); }} style={inpS} />
                    </div>
                    <div>
                        <label style={labelS}>Format</label>
                        <select value={format} onChange={e => setFormat(e.target.value)} style={inpS}>
                            <option value="xml">Tally XML (recommended)</option>
                        </select>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={loadPreview} disabled={loading} style={btn('#3b82f6')}>
                        {loading ? 'Loading…' : '👁 Preview Vouchers'}
                    </button>
                    <button onClick={downloadXml} disabled={!preview || loading} style={btn('#10b981')}>
                        ⬇ Download XML for Tally
                    </button>
                </div>
                {msg && <div style={{ marginTop: 12, fontWeight: 600, color: msg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{msg}</div>}
            </div>

            {/* Preview Table */}
            {preview && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 15 }}>
                            Preview — {preview.count} {exportType === 'purchase' ? 'Purchase' : 'Sales'} Voucher(s)
                        </h3>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{fromDate} to {toDate}</span>
                    </div>

                    {preview.count === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                            No {exportType} invoices found for this date range.
                        </div>
                    ) : (
                        <table style={tableS}><thead><tr style={{ background: '#1e293b', color: '#fff' }}>
                            {['Voucher Type', 'Date', 'Reference / Invoice No', 'Party Name', 'Amount (₹)', 'Narration'].map(h =>
                                <th key={h} style={thS}>{h}</th>)}
                        </tr></thead><tbody>
                            {preview.vouchers.map((v, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                    <td style={tdS}>
                                        <span style={tag(v.voucher_type === 'Purchase' ? '#f97316' : '#10b981')}>
                                            {v.voucher_type}
                                        </span>
                                    </td>
                                    <td style={tdS}>{v.date}</td>
                                    <td style={tdS}><b>{v.reference}</b></td>
                                    <td style={tdS}>{v.party_name}</td>
                                    <td style={tdS}><b>₹{Number(v.amount || 0).toLocaleString('en-IN')}</b></td>
                                    <td style={tdS}>{v.narration || '—'}</td>
                                </tr>
                            ))}
                        </tbody></table>
                    )}

                    {/* Total */}
                    {preview.count > 0 && (
                        <div style={{ marginTop: 14, background: '#f8fafc', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700 }}>Total Amount:</span>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>
                                ₹{preview.vouchers.reduce((s, v) => s + Number(v.amount || 0), 0).toLocaleString('en-IN')}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const labelS = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 };
const btn    = (bg) => ({ padding: '8px 20px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const tableS = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thS    = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12 };
const tdS    = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const inpS   = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' };
const tag    = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
