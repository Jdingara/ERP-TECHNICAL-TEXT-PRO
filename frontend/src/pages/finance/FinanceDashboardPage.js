// PAGE: Finance Dashboard (P&L, Balance Sheet, Cash Flow)
import { useState, useEffect } from 'react';
import { usePageTheme } from '../../hooks/usePageTheme';

const card = { background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', padding:'20px 24px' };
const kpiCard = (color) => ({ background: color+'11', border:`1px solid ${color}33`, borderRadius:10, padding:'16px 20px', minWidth:160 });
const label = { fontSize:11, fontWeight:600, color:'#94a3b8', letterSpacing:1, textTransform:'uppercase' };
const val   = (color='#1e293b') => ({ fontSize:22, fontWeight:700, color, marginTop:4 });
const sec   = { fontSize:15, fontWeight:700, marginBottom:12, color:'#334155' };
const rowS  = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9', fontSize:13 };
const tab   = (active) => ({ padding:'8px 20px', border:'none', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:600, background:active?'#6366f1':'#f1f5f9', color:active?'#fff':'#64748b' });

export default function FinanceDashboardPage() {
    const pt = usePageTheme();
    const [tab, setTabState]   = useState('pl');
    const [pl,  setPL]         = useState(null);
    const [bs,  setBS]         = useState(null);
    const [cf,  setCF]         = useState(null);
    const [loading, setLoading] = useState(false);
    const [period,  setPeriod]  = useState({ from: new Date().getFullYear() + '-04-01', to: new Date().toISOString().slice(0,10) });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const p = new URLSearchParams({ from_date: period.from, to_date: period.to });
            const [r1, r2, r3] = await Promise.all([
                fetch(`/api/finance/profit-loss/?${p}`, { credentials:'include' }),
                fetch(`/api/finance/balance-sheet/?${p}`, { credentials:'include' }),
                fetch(`/api/finance/cash-flow/?${p}`, { credentials:'include' }),
            ]);
            const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
            setPL(d1); setBS(d2); setCF(d3);
            setLoading(false);
        };
        load();
    }, [period]);

    const fmt = (n) => `₹${Number(n||0).toLocaleString('en-IN', { maximumFractionDigits:0 })}`;
    const profit = pl ? (pl.total_income - pl.total_expense) : 0;

    return (
        <div style={{ padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h2 style={{ margin:0, fontSize:22, fontWeight:700 }}>Finance Dashboard</h2>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <input type="date" value={period.from} onChange={e=>setPeriod(p=>({...p,from:e.target.value}))} style={{ ...pt.inp, width:150 }} />
                    <span style={{ color:'#94a3b8' }}>to</span>
                    <input type="date" value={period.to} onChange={e=>setPeriod(p=>({...p,to:e.target.value}))} style={{ ...pt.inp, width:150 }} />
                </div>
            </div>

            {/* KPI row */}
            <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:24 }}>
                <div style={kpiCard('#10b981')}>
                    <div style={label}>Total Revenue</div>
                    <div style={val('#10b981')}>{fmt(pl?.total_income)}</div>
                </div>
                <div style={kpiCard('#ef4444')}>
                    <div style={label}>Total Expenses</div>
                    <div style={val('#ef4444')}>{fmt(pl?.total_expense)}</div>
                </div>
                <div style={kpiCard(profit>=0?'#6366f1':'#ef4444')}>
                    <div style={label}>Net {profit>=0?'Profit':'Loss'}</div>
                    <div style={val(profit>=0?'#6366f1':'#ef4444')}>{fmt(Math.abs(profit))}</div>
                </div>
                <div style={kpiCard('#3b82f6')}>
                    <div style={label}>Total Assets</div>
                    <div style={val('#3b82f6')}>{fmt(bs?.total_assets)}</div>
                </div>
                <div style={kpiCard('#f59e0b')}>
                    <div style={label}>Net Cash Flow</div>
                    <div style={val('#f59e0b')}>{fmt(cf?.net_cash_flow)}</div>
                </div>
            </div>

            {/* Tab selector */}
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                {[['pl','Profit & Loss'],['bs','Balance Sheet'],['cf','Cash Flow']].map(([k,l])=>(
                    <button key={k} onClick={()=>setTabState(k)} style={{ padding:'8px 20px', border:'none', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:600, background:tab===k?'#6366f1':'#f1f5f9', color:tab===k?'#fff':'#64748b' }}>{l}</button>
                ))}
            </div>

            {loading && <div style={{ color:'#94a3b8', fontSize:14 }}>Loading…</div>}

            {/* P&L */}
            {!loading && tab==='pl' && pl && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                    <div style={card}>
                        <div style={sec}>Income</div>
                        {(pl.income_accounts||[]).map(a=>(
                            <div key={a.account_code} style={rowS}>
                                <span style={{ color:'#1e40af' }}>{a.account_name}</span>
                                <span style={{ fontWeight:600, color:'#059669' }}>{fmt(a.balance)}</span>
                            </div>
                        ))}
                        <div style={{ ...rowS, borderTop:'2px solid #e2e8f0', marginTop:8, fontWeight:700 }}>
                            <span>Total Income</span>
                            <span style={{ color:'#059669' }}>{fmt(pl.total_income)}</span>
                        </div>
                    </div>
                    <div style={card}>
                        <div style={sec}>Expenses</div>
                        {(pl.expense_accounts||[]).map(a=>(
                            <div key={a.account_code} style={rowS}>
                                <span>{a.account_name}</span>
                                <span style={{ fontWeight:600, color:'#ef4444' }}>{fmt(a.balance)}</span>
                            </div>
                        ))}
                        <div style={{ ...rowS, borderTop:'2px solid #e2e8f0', marginTop:8, fontWeight:700 }}>
                            <span>Total Expenses</span>
                            <span style={{ color:'#ef4444' }}>{fmt(pl.total_expense)}</span>
                        </div>
                        <div style={{ ...rowS, marginTop:8, fontWeight:800, fontSize:15 }}>
                            <span>Net {profit>=0?'Profit':'Loss'}</span>
                            <span style={{ color:profit>=0?'#6366f1':'#ef4444' }}>{fmt(Math.abs(profit))}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Balance Sheet */}
            {!loading && tab==='bs' && bs && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                    <div style={card}>
                        <div style={sec}>Assets</div>
                        {(bs.asset_accounts||[]).map(a=>(
                            <div key={a.account_code} style={rowS}>
                                <span style={{ color:'#1e40af' }}>{a.account_name}</span>
                                <span style={{ fontWeight:600 }}>{fmt(a.balance)}</span>
                            </div>
                        ))}
                        <div style={{ ...rowS, borderTop:'2px solid #e2e8f0', marginTop:8, fontWeight:700 }}>
                            <span>Total Assets</span>
                            <span style={{ color:'#3b82f6' }}>{fmt(bs.total_assets)}</span>
                        </div>
                    </div>
                    <div style={card}>
                        <div style={sec}>Liabilities & Equity</div>
                        {(bs.liability_accounts||[]).map(a=>(
                            <div key={a.account_code} style={rowS}>
                                <span>{a.account_name}</span>
                                <span style={{ fontWeight:600, color:'#ef4444' }}>{fmt(a.balance)}</span>
                            </div>
                        ))}
                        {(bs.equity_accounts||[]).map(a=>(
                            <div key={a.account_code} style={rowS}>
                                <span style={{ color:'#8b5cf6' }}>{a.account_name}</span>
                                <span style={{ fontWeight:600, color:'#8b5cf6' }}>{fmt(a.balance)}</span>
                            </div>
                        ))}
                        <div style={{ ...rowS, borderTop:'2px solid #e2e8f0', marginTop:8, fontWeight:700 }}>
                            <span>Total L + E</span>
                            <span style={{ color:'#3b82f6' }}>{fmt(bs.total_liabilities_equity)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Flow */}
            {!loading && tab==='cf' && cf && (
                <div style={card}>
                    <div style={sec}>Cash Flow Statement</div>
                    {[
                        { label:'Operating Cash Flow', val: cf.operating_cash_flow, color:'#10b981' },
                        { label:'Investing Cash Flow', val: cf.investing_cash_flow, color:'#3b82f6' },
                        { label:'Financing Cash Flow', val: cf.financing_cash_flow, color:'#8b5cf6' },
                    ].map(item=>(
                        <div key={item.label} style={{ ...rowS, fontSize:14 }}>
                            <span>{item.label}</span>
                            <span style={{ fontWeight:700, color: item.val>=0?item.color:'#ef4444' }}>
                                {item.val>=0?'':'-'}{fmt(Math.abs(item.val||0))}
                            </span>
                        </div>
                    ))}
                    <div style={{ ...rowS, borderTop:'2px solid #e2e8f0', marginTop:8, fontWeight:800, fontSize:15 }}>
                        <span>Net Cash Flow</span>
                        <span style={{ color: cf.net_cash_flow>=0?'#10b981':'#ef4444' }}>{fmt(cf.net_cash_flow)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
