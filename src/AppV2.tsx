import { useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, BookOpen, CircleDollarSign, Database, FileUp, Gauge, LayoutDashboard, Menu, Search, Settings, ShieldCheck, WalletCards } from 'lucide-react'
import { ImportDialog } from './components/ImportDialog'
import { demoHistory, demoQuotes } from './data/demo'
import { useWorkspace } from './data/use-workspace'
import { evaluateMarketDecision } from './domain/decision'
import { concentrationScore, investedCapital, maxDrawdown, portfolioValue, reconstructPositions, valuePositions } from './domain/portfolio'
import { selectReserveCandidate } from './domain/reserve'

const money = (value: number | null) => value === null ? 'Unavailable' : new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
const pct = (value: number | null, signed = true) => value === null ? 'Unavailable' : `${signed && value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`

function Sparkline({ values }: { values: number[] }) {
  const width = 620, height = 150, min = Math.min(...values), max = Math.max(...values), range = max - min || 1
  const points = values.map((value, index) => `${index / (values.length - 1) * width},${height - (value - min) / range * (height - 24) - 12}`).join(' ')
  return <svg className="spark" viewBox={`0 0 ${width} ${height}`} aria-label="Demo portfolio trend"><defs><linearGradient id="area-v2" x2="0" y2="1"><stop stopColor="#82f4c4" stopOpacity=".28" /><stop offset="1" stopColor="#82f4c4" stopOpacity="0" /></linearGradient></defs><polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#area-v2)" /><polyline points={points} fill="none" stroke="#82f4c4" strokeWidth="3" /></svg>
}

export default function AppV2() {
  const [navOpen, setNavOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [reserve, setReserve] = useState(5000)
  const [drawdown, setDrawdown] = useState(-.104)
  const { workspace, loadWarning, importData } = useWorkspace()
  const positions = useMemo(() => reconstructPositions(workspace.transactions), [workspace.transactions])
  const quotes = useMemo(() => demoQuotes.filter((quote) => workspace.assets.some((asset) => asset.id === quote.assetId)), [workspace.assets])
  const valued = useMemo(() => valuePositions(positions, quotes, workspace.portfolio.baseCurrency, { 'USD/EUR': .86 }), [positions, quotes, workspace.portfolio.baseCurrency])
  const total = portfolioValue(valued)
  const invested = investedCapital(workspace.transactions)
  const unrealized = valued.some((position) => position.unrealizedPnl === null) ? null : valued.reduce((sum, position) => sum + (position.unrealizedPnl ?? 0), 0)
  const concentration = concentrationScore(valued)
  const candidate = selectReserveCandidate(drawdown, reserve)
  const decision = evaluateMarketDecision({ assetId: 'sxrv', drawdown, reserveCandidate: candidate, dataAvailable: total !== null, concentration })
  const existingIds = useMemo(() => new Set(workspace.transactions.map((transaction) => transaction.id)), [workspace.transactions])

  return <div className="shell"><aside className={navOpen ? 'open' : ''}><div className="brand"><b>A</b> ATLAS</div><nav><a className="active"><LayoutDashboard />Overview</a><a><WalletCards />Portfolio</a><a><BarChart3 />Markets</a><a><Gauge />Decisions <i>1</i></a><a><BookOpen />Journal</a></nav><div className="bottom"><a><Settings />Settings</a><div className="profile"><b>FA</b><span>Frederico<small>Local workspace</small></span></div></div></aside>
    <main><header><button className="menu" onClick={() => setNavOpen(!navOpen)} aria-label="Toggle navigation"><Menu /></button><label className="search"><Search /><input placeholder="Search assets, decisions, notes…" /></label><span className="local-status"><Database /> Saved locally</span><button className="primary" onClick={() => setImportOpen(true)}><FileUp />Import CSV</button></header>
      <section className="content"><div className="eyebrow">PERSONAL INVESTMENT OPERATING SYSTEM · V0.2</div><div className="title"><div><h1>Your investment workspace.</h1><p>{workspace.transactions.length} transactions across {workspace.assets.length} assets, stored locally on this device.</p></div><small>UPDATED {workspace.updatedAt.toLocaleDateString('en-GB')}</small></div>
        {loadWarning && <div className="warning-banner">{loadWarning} Atlas loaded the safe demo workspace instead.</div>}
        <div className="notice"><ShieldCheck /><div><b>Code calculates. AI interprets.</b><span>Imported data is validated before it enters your workspace. Unknown prices remain unavailable.</span></div></div>
        <div className="metrics"><Metric label="PORTFOLIO VALUE" icon={<CircleDollarSign />} value={money(total)} note={total === null ? 'Missing market prices' : 'Known priced positions'} /><Metric label="NET CONTRIBUTIONS" icon={<WalletCards />} value={money(invested)} note={`${workspace.transactions.length} transactions`} /><Metric label="UNREALIZED P&L" icon={<Activity />} value={money(unrealized)} note="Converted to base currency" positive={unrealized !== null && unrealized >= 0} /><Metric label="MAX DRAWDOWN" icon={<ArrowDownRight />} value={pct(maxDrawdown(demoHistory))} note="Demo market series" /></div>
        <div className="grid"><article className="panel"><PanelHead small="PORTFOLIO PERFORMANCE" title={money(total)} /><Sparkline values={demoHistory} /><div className="axis">Sep <span>Dec</span><span>Mar</span><span>Jun</span> Aug</div></article><article className="panel decision"><PanelHead small="DECISION ENGINE" title="Reserve signal" badge={decision.action.replace('_', ' ')} /><div className="amount"><span>Candidate allocation</span><strong>{money(candidate?.amount ?? 0)}</strong></div><input aria-label="Nasdaq drawdown" type="range" min="-18" max="-2" step=".5" value={drawdown * 100} onChange={(event) => setDrawdown(+event.target.value / 100)} /><div className="range"><span>Nasdaq drawdown</span><b>{pct(drawdown)}</b></div><ul>{decision.rationale.map((reason) => <li key={reason}>{reason}</li>)}</ul><button className="secondary">Review candidate</button></article></div>
        <div className="grid"><article className="panel positions"><PanelHead small="OPEN POSITIONS" title="Portfolio allocation" badge={`${valued.length} positions`} /><div className="table"><table><thead><tr><th>Asset</th><th>Value</th><th>Weight</th><th>Unrealized P&L</th></tr></thead><tbody>{valued.map((position) => { const asset = workspace.assets.find((item) => item.id === position.assetId); return <tr key={position.assetId}><td><i>{asset?.ticker.slice(0, 2) ?? '?'}</i><span><b>{asset?.ticker ?? position.assetId}</b><small>{asset?.name ?? 'Imported asset'}</small></span></td><td>{money(position.valueInBaseCurrency)}</td><td>{pct(position.weight, false)}</td><td className={(position.unrealizedPnl ?? 0) >= 0 ? 'up' : 'down'}>{money(position.unrealizedPnl)}</td></tr> })}</tbody></table></div></article><article className="panel reserve"><PanelHead small="STRATEGIC RESERVE" title="Dry powder" badge="PROTECTED" /><div className="ring" style={{ '--progress': `${reserve / 50}%` } as React.CSSProperties}><div><strong>{money(reserve)}</strong><span>available</span></div></div><p><span>Final reserve floor</span><b>€500</b></p><p><span>Deployable now</span><b>{money(Math.max(0, reserve - 500))}</b></p><input aria-label="Strategic reserve" type="range" min="500" max="5000" step="250" value={reserve} onChange={(event) => setReserve(+event.target.value)} /></article></div>
        <footer>Atlas v0.2 · Local-first persistence · Unknown data is never displayed as zero.</footer></section></main>
    <ImportDialog open={importOpen} portfolioId={workspace.portfolio.id} existingTransactionIds={existingIds} onClose={() => setImportOpen(false)} onImport={importData} />
  </div>
}

function Metric({ label, icon, value, note, positive = false }: { label: string; icon: React.ReactNode; value: string; note: string; positive?: boolean }) { return <article><label>{label}{icon}</label><strong className={positive ? 'up' : ''}>{value}</strong><span className={positive ? 'up' : ''}>{positive && <ArrowUpRight />}{note}</span></article> }
function PanelHead({ small, title, badge }: { small: string; title: string; badge?: string }) { return <div className="head"><div><small>{small}</small><h2>{title}</h2></div>{badge && <em>{badge}</em>}</div> }
