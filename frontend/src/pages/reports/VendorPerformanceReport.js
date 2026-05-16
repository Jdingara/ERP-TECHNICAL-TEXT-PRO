// PAGE: Vendor Performance Report — Buying House ERP
import { useState, useEffect } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

export default function VendorPerformanceReport() {
    const pt  = usePageTheme();
    const thS = { ...pt.th, textAlign: 'left' };
    const tdS = { ...pt.cell, verticalAlign: 'middle' };

    const [rows, setRows]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort]     = useState('fo_total');

    const load = async () => {
        setLoading(true);
        const res = await fetch('/api/finance/reports/vendor-performance/', { credentials: 'include' });
        const d = await res.json();
        setRows(d.vendors || []);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const sorted = [...rows].sort((a, b) => (b[sort] || 0) - (a[sort] || 0));

    const VENDOR_TYPE_COLORS = {
        manufacturer: '#10b981', fabric: '#3b82f6', trim: '#f59e0b',
        testing_lab: '#8b5cf6', logistics: '#06b6d4', buying_agent: '#ec4899', other: '#94a3b8',
    };

    return (
        <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', color: pt.colors.text, minHeight: '100vh', backgroundColor: pt.colors.outer }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Vendor Performance Report</h2>
                    <p style={{ margin: '4px 0 0', color: pt.colors.dimText, fontSize: 13 }}>{rows.length} vendors with factory orders</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <label style={{ fontSize: 12, color: pt.colors.dimText }}>Sort by:</label>
                    <select style={{ ...pt.inp, minWidth: 160 }} value={sort} onChange={e => setSort(e.target.value)}>
                        <option value="fo_total">Total FOs</option>
                        <option value="fo_active">Active FOs</option>
                        <option value="fo_late">Late FOs</option>
                        <option value="psi_total">PSI Count</option>
                    </select>
                    <button onClick={() => window.print()} style={btn('#64748b')}>Print / PDF</button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>Loading…</div>
            ) : (
                <div style={{ backgroundColor: pt.colors.card, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr>
                            {['Vendor', 'Type', 'Country', 'Total FOs', 'Active', 'Completed', 'Late', 'PSI Count', 'PSI Fail %', 'Score'].map(h =>
                                <th key={h} style={thS}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {sorted.map((r, idx) => {
                                const typeColor = VENDOR_TYPE_COLORS[r.vendor_type] || '#94a3b8';
                                const latePct   = r.fo_total > 0 ? (r.fo_late / r.fo_total * 100) : 0;
                                // Score: 100 - late% - fail%
                                const score = Math.max(0, Math.round(100 - latePct - (r.psi_fail_rate || 0)));
                                const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
                                return (
                                    <tr key={r.vendor_id}>
                                        <td style={{ ...tdS, fontWeight: 700 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ width: 20, height: 20, borderRadius: '50%', background: `${typeColor}20`, color: typeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{idx+1}</span>
                                                {r.vendor_name}
                                            </div>
                                        </td>
                                        <td style={tdS}><span style={tag(typeColor)}>{r.vendor_type.replace('_',' ')}</span></td>
                                        <td style={{ ...tdS, color: pt.colors.dimText }}>{r.country || '—'}</td>
                                        <td style={{ ...tdS, fontWeight: 600 }}>{r.fo_total}</td>
                                        <td style={{ ...tdS, color: '#f59e0b', fontWeight: 600 }}>{r.fo_active}</td>
                                        <td style={{ ...tdS, color: '#10b981' }}>{r.fo_completed}</td>
                                        <td style={{ ...tdS, color: r.fo_late > 0 ? '#ef4444' : pt.colors.muted, fontWeight: r.fo_late > 0 ? 700 : 400 }}>
                                            {r.fo_late > 0 ? `${r.fo_late} (${latePct.toFixed(0)}%)` : '—'}
                                        </td>
                                        <td style={tdS}>{r.psi_total}</td>
                                        <td style={{ ...tdS, color: r.psi_fail_rate != null ? (r.psi_fail_rate > 0 ? '#ef4444' : '#10b981') : pt.colors.muted }}>
                                            {r.psi_fail_rate != null ? `${r.psi_fail_rate}%` : '—'}
                                        </td>
                                        <td style={tdS}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 60, height: 6, borderRadius: 3, background: `${pt.colors.border || '#e2e8f0'}`, overflow: 'hidden' }}>
                                                    <div style={{ width: `${score}%`, height: '100%', background: scoreColor, borderRadius: 3 }} />
                                                </div>
                                                <span style={{ fontWeight: 700, color: scoreColor, fontSize: 12 }}>{score}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {sorted.length === 0 && (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 60, color: pt.colors.muted }}>No vendors with factory orders yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Legend */}
            {rows.length > 0 && (
                <div style={{ marginTop: 16, fontSize: 12, color: pt.colors.dimText, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <span>Score = 100 − late% − PSI fail%</span>
                    {[['≥80', '#10b981', 'Good'], ['60–79', '#f59e0b', 'Needs attention'], ['<60', '#ef4444', 'At risk']].map(([r, c, l]) => (
                        <span key={r}><span style={{ color: c, fontWeight: 700 }}>{r}</span> — {l}</span>
                    ))}
                </div>
            )}
        </div>
    );
}

const btn = (bg) => ({ padding: '7px 16px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 });
const tag = (bg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: `${bg}20`, color: bg, fontSize: 11, fontWeight: 600 });
