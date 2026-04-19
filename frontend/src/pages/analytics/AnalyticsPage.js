import { useState, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const TABS = [
    { key: 'production',  label: '🏭 Production Efficiency' },
    { key: 'lot',         label: '📦 Lot Utilization' },
    { key: 'quality',     label: '✅ Quality Trends' },
    { key: 'vendor',      label: '🤝 Vendor Performance' },
    { key: 'dispatch',    label: '🚚 Dispatch Analysis' },
];

const STATUS_COLOR = { draft:'#94a3b8', planned:'#3b82f6', in_production:'#f59e0b', completed:'#10b981', cancelled:'#ef4444' };

function DateFilter({ fromDate, toDate, setFromDate, setToDate, onLoad, loading }) {
    return (
        <div style={{ display:'flex', alignItems:'center', gap:12, background:'#f8fafc', borderRadius:8, padding:'10px 16px', marginBottom:20 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#475569' }}>From:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputS} />
            <span style={{ fontSize:13, fontWeight:600, color:'#475569' }}>To:</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputS} />
            <button onClick={onLoad} disabled={loading} style={btn('#2563eb')}>{loading ? 'Loading…' : '📊 Load'}</button>
        </div>
    );
}

function SummaryCard({ label, value, color, sub }) {
    return (
        <div style={{ background:'#fff', border:`1px solid ${color}30`, borderLeft:`4px solid ${color}`, borderRadius:10, padding:'14px 18px' }}>
            <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:6 }}>{label}</div>
            <div style={{ fontSize:28, fontWeight:800, color }}>{value}</div>
            {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>{sub}</div>}
        </div>
    );
}

// ── Tab 1: Production Efficiency ──────────────────────────────
function ProductionTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState(() => { const d=new Date(); d.setMonth(d.getMonth()-3); return d.toISOString().slice(0,10); });
    const [toDate, setToDate] = useState(new Date().toISOString().slice(0,10));

    const load = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams({ from_date: fromDate, to_date: toDate });
        const r = await fetch(`/api/reports/analytics/production-efficiency/?${p}`, { credentials:'include' });
        setData(await r.json());
        setLoading(false);
    }, [fromDate, toDate]);

    useEffect(() => { load(); }, [load]);

    const s = data?.summary || {};
    const monthly = (data?.monthly || []).map(m => ({ ...m, output: parseFloat(m.output||0), rejection: parseFloat(m.rejection||0) }));

    return (
        <div>
            <DateFilter fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} onLoad={load} loading={loading} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
                <SummaryCard label="Total Planned"     value={s.total_planned || 0}       color="#3b82f6" />
                <SummaryCard label="Total Output"      value={s.total_output || 0}        color="#10b981" />
                <SummaryCard label="Total Rejection"   value={s.total_rejection || 0}     color="#ef4444" />
                <SummaryCard label="Overall Efficiency" value={`${s.overall_efficiency_pct || 0}%`} color="#8b5cf6" sub="Output / Planned" />
            </div>
            {monthly.length > 0 && (
                <div style={chartBox}>
                    <div style={chartTitle}>Monthly Output vs Rejection</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={monthly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize:11 }} />
                            <YAxis tick={{ fontSize:11 }} />
                            <Tooltip contentStyle={{ fontSize:12, borderRadius:8 }} />
                            <Legend wrapperStyle={{ fontSize:12 }} />
                            <Bar dataKey="output"    fill="#10b981" radius={[4,4,0,0]} name="Output" />
                            <Bar dataKey="rejection" fill="#ef4444" radius={[4,4,0,0]} name="Rejection" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            <div style={{ overflowX:'auto', marginTop:20 }}>
                <table style={tableS}>
                    <thead><tr style={{ background:'#1e293b', color:'#fff' }}>
                        {['Prod. Order','Product','Status','Planned','Output','Rejection','Efficiency %','Rejection %'].map(h =>
                            <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {(data?.rows||[]).length === 0
                            ? <tr><td colSpan={8} style={emptyTd}>No production orders in this period</td></tr>
                            : (data?.rows||[]).map((r,i) => (
                                <tr key={i} style={{ background: i%2===0?'#fff':'#f8fafc' }}>
                                    <td style={tdS}><b style={{ color:'#f59e0b' }}>{r.po_number}</b></td>
                                    <td style={tdS}>{r.product}</td>
                                    <td style={tdS}><span style={{ ...tag, background:`${STATUS_COLOR[r.status]||'#94a3b8'}20`, color:STATUS_COLOR[r.status]||'#94a3b8' }}>{r.status}</span></td>
                                    <td style={tdS}>{r.planned_qty}</td>
                                    <td style={tdS}><b style={{ color:'#10b981' }}>{r.output_qty}</b></td>
                                    <td style={tdS}><span style={{ color:r.rejection_qty>0?'#ef4444':'#94a3b8' }}>{r.rejection_qty}</span></td>
                                    <td style={tdS}><b style={{ color:r.efficiency_pct>=80?'#10b981':r.efficiency_pct>=50?'#f59e0b':'#ef4444' }}>{r.efficiency_pct}%</b></td>
                                    <td style={tdS}><span style={{ color:r.rejection_pct>10?'#ef4444':'#64748b' }}>{r.rejection_pct}%</span></td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Tab 2: Lot Utilization ────────────────────────────────────
function LotUtilizationTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const r = await fetch('/api/reports/analytics/lot-utilization/', { credentials:'include' });
        setData(await r.json());
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const s = data?.summary || {};
    const chart = (data?.by_material||[]).slice(0,10);

    return (
        <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
                <button onClick={load} disabled={loading} style={btn('#2563eb')}>{loading?'Loading…':'↻ Refresh'}</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
                <SummaryCard label="Total Lots"       value={s.total_lots||0}                        color="#3b82f6" />
                <SummaryCard label="Total Received"   value={s.total_received||0}                    color="#8b5cf6" />
                <SummaryCard label="Total Consumed"   value={s.total_consumed||0}                    color="#f97316" />
                <SummaryCard label="Avg Utilization"  value={`${s.avg_utilization_pct||0}%`}         color="#10b981" sub="Consumed / Received" />
            </div>
            {chart.length > 0 && (
                <div style={chartBox}>
                    <div style={chartTitle}>Received vs Consumed by Material (Top 10)</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chart} layout="vertical" margin={{ left:80 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" tick={{ fontSize:11 }} />
                            <YAxis type="category" dataKey="material" tick={{ fontSize:11 }} width={80} />
                            <Tooltip contentStyle={{ fontSize:12, borderRadius:8 }} />
                            <Legend wrapperStyle={{ fontSize:12 }} />
                            <Bar dataKey="received" fill="#3b82f6" name="Received" />
                            <Bar dataKey="consumed" fill="#10b981" name="Consumed" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            <div style={{ overflowX:'auto', marginTop:20 }}>
                <table style={tableS}>
                    <thead><tr style={{ background:'#1e293b', color:'#fff' }}>
                        {['LOT Number','Material','Vendor','Status','Received','Consumed','Balance','Utilization %'].map(h =>
                            <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {(data?.rows||[]).length===0
                            ? <tr><td colSpan={8} style={emptyTd}>No lots found</td></tr>
                            : (data?.rows||[]).map((r,i) => (
                                <tr key={i} style={{ background:i%2===0?'#fff':'#f8fafc' }}>
                                    <td style={tdS}><b style={{ color:'#f59e0b' }}>{r.lot_number}</b></td>
                                    <td style={tdS}>{r.material_name}</td>
                                    <td style={tdS}>{r.vendor}</td>
                                    <td style={tdS}><span style={{ ...tag, background:'#e2e8f0', color:'#475569' }}>{r.status}</span></td>
                                    <td style={tdS}>{r.received_qty}</td>
                                    <td style={tdS}>{r.consumed_qty}</td>
                                    <td style={tdS}><b style={{ color:r.balance_qty===0?'#ef4444':'#10b981' }}>{r.balance_qty}</b></td>
                                    <td style={tdS}>
                                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                            <div style={{ flex:1, background:'#e2e8f0', borderRadius:4, height:8 }}>
                                                <div style={{ width:`${Math.min(r.utilization_pct,100)}%`, background:r.utilization_pct>=80?'#10b981':r.utilization_pct>=50?'#f59e0b':'#3b82f6', height:8, borderRadius:4 }} />
                                            </div>
                                            <span style={{ fontSize:12, fontWeight:700, color:'#475569', minWidth:40 }}>{r.utilization_pct}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Tab 3: Quality Trends ─────────────────────────────────────
function QualityTrendsTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState(() => { const d=new Date(); d.setMonth(d.getMonth()-3); return d.toISOString().slice(0,10); });
    const [toDate, setToDate] = useState(new Date().toISOString().slice(0,10));

    const load = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams({ from_date: fromDate, to_date: toDate });
        const r = await fetch(`/api/reports/analytics/quality-trends/?${p}`, { credentials:'include' });
        setData(await r.json());
        setLoading(false);
    }, [fromDate, toDate]);

    useEffect(() => { load(); }, [load]);

    const s = data?.summary || {};
    const pieData = [
        { name:'Pass',   value: s.total_pass||0,   color:'#10b981' },
        { name:'Fail',   value: s.total_fail||0,   color:'#ef4444' },
        { name:'Rework', value: s.total_rework||0, color:'#f59e0b' },
    ].filter(d => d.value > 0);

    return (
        <div>
            <DateFilter fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} onLoad={load} loading={loading} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
                <SummaryCard label="Total Inspected"  value={s.total_inspected||0}            color="#3b82f6" />
                <SummaryCard label="Pass"             value={s.total_pass||0}                 color="#10b981" />
                <SummaryCard label="Fail"             value={s.total_fail||0}                 color="#ef4444" />
                <SummaryCard label="Pass Rate"        value={`${s.overall_pass_rate||0}%`}    color="#8b5cf6" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
                {pieData.length > 0 && (
                    <div style={chartBox}>
                        <div style={chartTitle}>Result Breakdown</div>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value">
                                    {pieData.map((e,i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ fontSize:12 }} />
                                <Legend wrapperStyle={{ fontSize:12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
                {(data?.monthly||[]).length > 0 && (
                    <div style={chartBox}>
                        <div style={chartTitle}>Monthly Pass Rate (%)</div>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={data.monthly}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize:11 }} />
                                <YAxis domain={[0,100]} tick={{ fontSize:11 }} />
                                <Tooltip contentStyle={{ fontSize:12 }} />
                                <Line type="monotone" dataKey="pass_rate" stroke="#10b981" strokeWidth={2} dot={{ r:4 }} name="Pass Rate %" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
            <div style={{ overflowX:'auto' }}>
                <table style={tableS}>
                    <thead><tr style={{ background:'#1e293b', color:'#fff' }}>
                        {['Date','Batch','Product','Inspector','Result','Defect'].map(h => <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {(data?.rows||[]).length===0
                            ? <tr><td colSpan={6} style={emptyTd}>No inspections in this period</td></tr>
                            : (data?.rows||[]).map((r,i) => (
                                <tr key={i} style={{ background:i%2===0?'#fff':'#f8fafc' }}>
                                    <td style={tdS}>{r.date}</td>
                                    <td style={tdS}><b style={{ color:'#2563eb' }}>{r.batch}</b></td>
                                    <td style={tdS}>{r.product}</td>
                                    <td style={tdS}>{r.inspector}</td>
                                    <td style={tdS}>
                                        <span style={{ ...tag, background:r.result==='pass'?'#d1fae5':r.result==='fail'?'#fee2e2':'#fef3c7', color:r.result==='pass'?'#065f46':r.result==='fail'?'#991b1b':'#92400e' }}>
                                            {r.result}
                                        </span>
                                    </td>
                                    <td style={tdS}>{r.defect||'—'}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Tab 4: Vendor Performance ─────────────────────────────────
function VendorPerformanceTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState(() => { const d=new Date(); d.setMonth(d.getMonth()-3); return d.toISOString().slice(0,10); });
    const [toDate, setToDate] = useState(new Date().toISOString().slice(0,10));

    const load = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams({ from_date: fromDate, to_date: toDate });
        const r = await fetch(`/api/reports/analytics/vendor-performance/?${p}`, { credentials:'include' });
        setData(await r.json());
        setLoading(false);
    }, [fromDate, toDate]);

    useEffect(() => { load(); }, [load]);

    const rows = data?.rows || [];

    return (
        <div>
            <DateFilter fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} onLoad={load} loading={loading} />
            {rows.length > 0 && (
                <div style={chartBox}>
                    <div style={chartTitle}>GRN Count by Vendor</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={rows}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="vendor" tick={{ fontSize:11 }} />
                            <YAxis tick={{ fontSize:11 }} />
                            <Tooltip contentStyle={{ fontSize:12 }} />
                            <Bar dataKey="grn_count" fill="#3b82f6" radius={[4,4,0,0]} name="GRN Count" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            <div style={{ overflowX:'auto', marginTop:20 }}>
                <table style={tableS}>
                    <thead><tr style={{ background:'#1e293b', color:'#fff' }}>
                        {['Vendor','GRNs','Lots','Received Qty','Consumed Qty','Utilization %','Rejected Lots','Rejection Rate'].map(h =>
                            <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {rows.length===0
                            ? <tr><td colSpan={8} style={emptyTd}>No GRN data in this period</td></tr>
                            : rows.map((r,i) => (
                                <tr key={i} style={{ background:i%2===0?'#fff':'#f8fafc' }}>
                                    <td style={tdS}><b style={{ color:'#1e293b' }}>{r.vendor}</b></td>
                                    <td style={tdS}>{r.grn_count}</td>
                                    <td style={tdS}>{r.lot_count}</td>
                                    <td style={tdS}>{r.received_qty}</td>
                                    <td style={tdS}>{r.consumed_qty}</td>
                                    <td style={tdS}><b style={{ color:r.utilization_pct>=70?'#10b981':'#f59e0b' }}>{r.utilization_pct}%</b></td>
                                    <td style={tdS}><span style={{ color:r.rejected_lots>0?'#ef4444':'#10b981', fontWeight:700 }}>{r.rejected_lots}</span></td>
                                    <td style={tdS}><span style={{ color:r.rejection_rate>10?'#ef4444':'#64748b' }}>{r.rejection_rate}%</span></td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Tab 5: Dispatch Analysis ──────────────────────────────────
function DispatchTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState(() => { const d=new Date(); d.setMonth(d.getMonth()-3); return d.toISOString().slice(0,10); });
    const [toDate, setToDate] = useState(new Date().toISOString().slice(0,10));

    const load = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams({ from_date: fromDate, to_date: toDate });
        const r = await fetch(`/api/reports/analytics/dispatch/?${p}`, { credentials:'include' });
        setData(await r.json());
        setLoading(false);
    }, [fromDate, toDate]);

    useEffect(() => { load(); }, [load]);

    const s = data?.summary || {};
    const monthly = (data?.monthly||[]).map(m => ({ ...m, qty: parseFloat(m.qty||0) }));
    const byCustomer = data?.by_customer || [];

    return (
        <div>
            <DateFilter fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} onLoad={load} loading={loading} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
                <SummaryCard label="Total Dispatches"  value={s.total_dispatches||0}  color="#3b82f6" />
                <SummaryCard label="Total Qty Shipped" value={s.total_qty||0}          color="#10b981" />
                <SummaryCard label="Unique Customers"  value={s.unique_customers||0}   color="#8b5cf6" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
                {monthly.length > 0 && (
                    <div style={chartBox}>
                        <div style={chartTitle}>Monthly Dispatch Qty</div>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={monthly}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize:11 }} />
                                <YAxis tick={{ fontSize:11 }} />
                                <Tooltip contentStyle={{ fontSize:12 }} />
                                <Bar dataKey="qty" fill="#10b981" radius={[4,4,0,0]} name="Dispatch Qty" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
                {byCustomer.length > 0 && (
                    <div style={chartBox}>
                        <div style={chartTitle}>Top Customers by Qty</div>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={byCustomer.slice(0,8)} layout="vertical" margin={{ left:80 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize:11 }} />
                                <YAxis type="category" dataKey="customer" tick={{ fontSize:11 }} width={80} />
                                <Tooltip contentStyle={{ fontSize:12 }} />
                                <Bar dataKey="total_qty" fill="#8b5cf6" name="Qty" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
            <div style={{ overflowX:'auto' }}>
                <table style={tableS}>
                    <thead><tr style={{ background:'#1e293b', color:'#fff' }}>
                        {['Date','Dispatch No.','Customer','Qty','Vehicle'].map(h => <th key={h} style={thS}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {(data?.rows||[]).length===0
                            ? <tr><td colSpan={5} style={emptyTd}>No dispatches in this period</td></tr>
                            : (data?.rows||[]).map((r,i) => (
                                <tr key={i} style={{ background:i%2===0?'#fff':'#f8fafc' }}>
                                    <td style={tdS}>{r.date}</td>
                                    <td style={tdS}><b style={{ color:'#f97316' }}>{r.dispatch_number}</b></td>
                                    <td style={tdS}>{r.customer}</td>
                                    <td style={tdS}><b>{r.qty}</b></td>
                                    <td style={tdS}>{r.vehicle||'—'}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Main Analytics Page ───────────────────────────────────────
export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState('production');

    return (
        <div style={{ padding:24, maxWidth:1300 }}>
            <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius:12, padding:'20px 28px', marginBottom:28, color:'#fff' }}>
                <div style={{ fontSize:22, fontWeight:700 }}>Analytics</div>
                <div style={{ fontSize:13, opacity:0.75, marginTop:4 }}>Production efficiency · Lot utilization · Quality trends · Vendor performance · Dispatch analysis</div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', gap:4, marginBottom:24, background:'#f1f5f9', borderRadius:10, padding:4 }}>
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        style={{ flex:1, padding:'9px 6px', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600,
                            background: activeTab===t.key ? '#fff' : 'transparent',
                            color: activeTab===t.key ? '#2563eb' : '#64748b',
                            boxShadow: activeTab===t.key ? '0 1px 4px #0002' : 'none',
                            transition:'all 0.15s' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:24, boxShadow:'0 1px 4px #0001' }}>
                {activeTab === 'production' && <ProductionTab />}
                {activeTab === 'lot'        && <LotUtilizationTab />}
                {activeTab === 'quality'    && <QualityTrendsTab />}
                {activeTab === 'vendor'     && <VendorPerformanceTab />}
                {activeTab === 'dispatch'   && <DispatchTab />}
            </div>
        </div>
    );
}

const tableS  = { width:'100%', borderCollapse:'collapse', fontSize:13 };
const thS     = { padding:'10px 14px', textAlign:'left', fontWeight:600, fontSize:12 };
const tdS     = { padding:'10px 14px', borderBottom:'1px solid #f1f5f9' };
const emptyTd = { textAlign:'center', padding:40, color:'#94a3b8' };
const tag     = { display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 };
const chartBox= { background:'#f8fafc', borderRadius:10, padding:'16px 20px', border:'1px solid #e2e8f0' };
const chartTitle = { fontSize:13, fontWeight:700, color:'#1e293b', marginBottom:12 };
const btn     = (bg) => ({ padding:'8px 18px', background:bg, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 });
const inputS  = { padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:7, fontSize:13, outline:'none' };
