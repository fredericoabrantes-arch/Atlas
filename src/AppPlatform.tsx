import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  BarChart3,
  BookOpen,
  Database,
  Download,
  FileUp,
  Gauge,
  LayoutDashboard,
  Menu,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Trash2,
  Upload,
  WalletCards,
} from "lucide-react";
import { demoHistory, demoQuotes } from "./data/demo";
import { usePlatform } from "./data/use-platform";
import {
  AlphaVantageProvider,
  EcbFxProvider,
  mergeQuoteCache,
} from "./data/live-market";
import { importTransactionsCsv } from "./data/csv-import";
import { importTrading212Csv } from "./data/trading212-import";
import {
  cashBalances,
  filterTransactions,
  removeTransaction,
  upsertTransaction,
} from "./data/portfolio-operations";
import { createBackup, restoreBackup } from "./data/backup";
import {
  createJournalEntry,
  journalAccuracy,
  reviewJournalEntry,
} from "./domain/journal";
import {
  concentrationScore,
  investedCapital,
  maxDrawdown,
  portfolioValue,
  reconstructPositions,
  valuePositions,
} from "./domain/portfolio";
import { TransactionSchema } from "./domain/models";
import type { DecisionAction, TransactionType } from "./domain/models";
import {
  benchmarkComparison,
  moneyWeightedReturn,
  projectScenario,
  timeWeightedReturn,
} from "./domain/performance";
type Page = "overview" | "analytics" | "transactions" | "journal" | "settings";
const money = (v: number | null, c = "EUR") =>
    v === null
      ? "Unavailable"
      : new Intl.NumberFormat("en-IE", {
          style: "currency",
          currency: c,
          maximumFractionDigits: 2,
        }).format(v),
  pct = (v: number | null) =>
    v === null ? "Unavailable" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
export default function AppPlatform() {
  const [page, setPage] = useState<Page>("overview"),
    [nav, setNav] = useState(false);
  const platform = usePlatform(),
    { state, activePortfolio } = platform;
  const activeTransactions = state.transactions.filter(
      (item) => item.portfolioId === activePortfolio.id,
    ),
    positions = useMemo(
      () => reconstructPositions(activeTransactions),
      [activeTransactions],
    );
  const quotes = state.quoteCache.length
    ? state.quoteCache
    : demoQuotes.filter((q) => state.assets.some((a) => a.id === q.assetId));
  const valued = valuePositions(
      positions,
      quotes,
      activePortfolio.baseCurrency,
      state.fxRates,
    ),
    total = portfolioValue(valued),
    unrealized = valued.some((p) => p.unrealizedPnl === null)
      ? null
      : valued.reduce((s, p) => s + (p.unrealizedPnl ?? 0), 0);
  return (
    <div className="shell platform">
      <aside className={nav ? "open" : ""}>
        <div className="brand">
          <b>A</b>ATLAS
        </div>
        <nav>
          <Nav
            page="overview"
            current={page}
            set={setPage}
            icon={<LayoutDashboard />}
          >
            Overview
          </Nav>
          <Nav
            page="transactions"
            current={page}
            set={setPage}
            icon={<WalletCards />}
          >
            Transactions
          </Nav>
          <Nav
            page="analytics"
            current={page}
            set={setPage}
            icon={<BarChart3 />}
          >
            Performance
          </Nav>
          <Nav page="journal" current={page} set={setPage} icon={<BookOpen />}>
            Decision Journal
          </Nav>
          <Nav page="settings" current={page} set={setPage} icon={<Settings />}>
            Settings
          </Nav>
        </nav>
        <div className="bottom">
          <div className="profile">
            <b>FA</b>
            <span>
              Frederico<small>Atlas v0.7</small>
            </span>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <button
            className="menu"
            onClick={() => setNav(!nav)}
            aria-label="Toggle navigation"
          >
            <Menu />
          </button>
          <div className="workspace-switch">
            <span>PORTFOLIO</span>
            <select
              value={state.activePortfolioId}
              onChange={(e) => platform.setActivePortfolio(e.target.value)}
            >
              {state.portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <span className="local-status">
            <Database />
            Local-first
          </span>
          <button className="primary" onClick={() => setPage("transactions")}>
            <Plus />
            Add data
          </button>
        </header>
        {page === "overview" && (
          <Overview
            total={total}
            unrealized={unrealized}
            transactions={activeTransactions}
            valued={valued}
            assets={state.assets}
            cash={cashBalances(activeTransactions)}
            quoteSource={
              state.quoteCache.length
                ? "Configured market data"
                : "Demo market data"
            }
          />
        )}{" "}
        {page === "analytics" && (
          <Analytics
            total={total}
            transactions={activeTransactions}
            monthlyContribution={activePortfolio.monthlyDca}
          />
        )}{" "}
        {page === "transactions" && <Transactions platform={platform} />}{" "}
        {page === "journal" && <Journal platform={platform} />}{" "}
        {page === "settings" && <SettingsPage platform={platform} />}
      </main>
    </div>
  );
}
function Nav({
  page,
  current,
  set,
  icon,
  children,
}: {
  page: Page;
  current: Page;
  set: (p: Page) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      className={page === current ? "active" : ""}
      onClick={() => set(page)}
    >
      {icon}
      {children}
    </button>
  );
}
function Overview({
  total,
  unrealized,
  transactions,
  valued,
  assets,
  cash,
  quoteSource,
}: {
  total: number | null;
  unrealized: number | null;
  transactions: ReturnType<typeof filterTransactions>;
  valued: ReturnType<typeof valuePositions>;
  assets: ReturnType<typeof usePlatform>["state"]["assets"];
  cash: Record<string, number>;
  quoteSource: string;
}) {
  return (
    <section className="content">
      <div className="eyebrow">INVESTMENT OPERATING SYSTEM · V0.7</div>
      <div className="title">
        <div>
          <h1>Portfolio command centre.</h1>
          <p>
            Deterministic calculations, auditable decisions and local ownership
            of your data.
          </p>
        </div>
        <small>{quoteSource.toUpperCase()}</small>
      </div>
      <div className="metrics">
        <Metric label="PORTFOLIO VALUE" value={money(total)} />
        <Metric
          label="NET CONTRIBUTIONS"
          value={money(investedCapital(transactions))}
        />
        <Metric
          label="UNREALIZED P&L"
          value={money(unrealized)}
          positive={(unrealized ?? 0) >= 0}
        />
        <Metric label="MAX DRAWDOWN" value={pct(maxDrawdown(demoHistory))} />
      </div>
      <div className="grid">
        <article className="panel">
          <Head
            small="POSITIONS"
            title="Current allocation"
            badge={`${valued.length} open`}
          />
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Value</th>
                  <th>Weight</th>
                  <th>P&L</th>
                </tr>
              </thead>
              <tbody>
                {valued.map((p) => {
                  const a = assets.find((x) => x.id === p.assetId);
                  return (
                    <tr key={p.assetId}>
                      <td>
                        <i>{a?.ticker.slice(0, 2) ?? "?"}</i>
                        <span>
                          <b>{a?.ticker ?? p.assetId}</b>
                          <small>{a?.name ?? "Imported asset"}</small>
                        </span>
                      </td>
                      <td>{money(p.valueInBaseCurrency)}</td>
                      <td>{pct(p.weight)}</td>
                      <td
                        className={(p.unrealizedPnl ?? 0) >= 0 ? "up" : "down"}
                      >
                        {money(p.unrealizedPnl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
        <article className="panel">
          <Head
            small="CASH BALANCES"
            title="Available cash"
            badge="BY CURRENCY"
          />
          <div className="cash-list">
            {Object.entries(cash).map(([currency, value]) => (
              <div key={currency}>
                <span>{currency}</span>
                <b>{money(value, currency)}</b>
              </div>
            ))}
          </div>
          <div className="health">
            <Gauge />
            <span>
              Concentration score<b>{pct(concentrationScore(valued))}</b>
            </span>
          </div>
        </article>
      </div>
    </section>
  );
}
function Analytics({
  total,
  transactions,
  monthlyContribution,
}: {
  total: number | null;
  transactions: ReturnType<typeof filterTransactions>;
  monthlyContribution: number;
}) {
  const [years, setYears] = useState(5),
    [annualReturn, setAnnualReturn] = useState(7),
    [volatility, setVolatility] = useState(15);
  const twr = timeWeightedReturn(
    demoHistory.slice(1).map((endValue, index) => ({
      startValue: demoHistory[index],
      endValue,
    })),
  );
  const terminalDate = new Date();
  const cashFlows = transactions
    .filter((item) => item.type === "DEPOSIT" || item.type === "WITHDRAWAL")
    .map((item) => ({
      date: item.date,
      amount:
        item.type === "DEPOSIT"
          ? -Math.abs(item.amount ?? 0)
          : Math.abs(item.amount ?? 0),
    }));
  if (total !== null && total > 0)
    cashFlows.push({ date: terminalDate, amount: total });
  const mwr = moneyWeightedReturn(cashFlows);
  const benchmark = benchmarkComparison(twr, 0.086);
  const scenario = projectScenario({
    currentValue: total ?? 0,
    annualReturn: annualReturn / 100,
    annualVolatility: volatility / 100,
    years,
    monthlyContribution,
  });
  return (
    <section className="content">
      <div className="eyebrow">V0.7 · PERFORMANCE & SCENARIOS</div>
      <div className="title">
        <div>
          <h1>Measure performance, explore outcomes.</h1>
          <p>
            Returns exclude the distortion of deposits; scenarios are
            projections, not forecasts.
          </p>
        </div>
        <small>BENCHMARK · DEMO 8.6%</small>
      </div>
      <div className="metrics">
        <Metric
          label="TIME-WEIGHTED RETURN"
          value={pct(twr)}
          positive={(twr ?? 0) >= 0}
        />
        <Metric
          label="MONEY-WEIGHTED RETURN"
          value={pct(mwr)}
          positive={(mwr ?? 0) >= 0}
        />
        <Metric
          label="BENCHMARK RETURN"
          value={pct(benchmark.benchmarkReturn)}
        />
        <Metric
          label="ACTIVE RETURN"
          value={pct(benchmark.activeReturn)}
          positive={(benchmark.activeReturn ?? 0) >= 0}
        />
      </div>
      <div className="two-column">
        <article className="panel scenario-controls">
          <Head
            small="SCENARIO INPUTS"
            title="What-if assumptions"
            badge="LOCAL"
          />
          <label>
            Horizon <b>{years} years</b>
            <input
              type="range"
              min="1"
              max="20"
              value={years}
              onChange={(event) => setYears(+event.target.value)}
            />
          </label>
          <label>
            Expected annual return <b>{annualReturn}%</b>
            <input
              type="range"
              min="-10"
              max="20"
              value={annualReturn}
              onChange={(event) => setAnnualReturn(+event.target.value)}
            />
          </label>
          <label>
            Annual volatility <b>{volatility}%</b>
            <input
              type="range"
              min="0"
              max="40"
              value={volatility}
              onChange={(event) => setVolatility(+event.target.value)}
            />
          </label>
          <p>Includes {money(monthlyContribution)} monthly contributions.</p>
        </article>
        <article className="panel scenario-results">
          <Head
            small="PROJECTED RANGE"
            title={`${years}-year outcome`}
            badge="NOT A FORECAST"
          />
          <div>
            <span>Downside</span>
            <b>{money(scenario.downside)}</b>
          </div>
          <div className="expected">
            <span>Expected</span>
            <b>{money(scenario.expected)}</b>
          </div>
          <div>
            <span>Upside</span>
            <b>{money(scenario.upside)}</b>
          </div>
          <p>
            The range applies volatility to the expected terminal value and does
            not model probability or taxes.
          </p>
        </article>
      </div>
    </section>
  );
}
function Transactions({
  platform,
}: {
  platform: ReturnType<typeof usePlatform>;
}) {
  const { state, activePortfolio } = platform;
  const [search, setSearch] = useState(""),
    [type, setType] = useState<TransactionType | "ALL">("ALL"),
    [form, setForm] = useState({
      type: "BUY" as TransactionType,
      ticker: "",
      date: new Date().toISOString().slice(0, 10),
      quantity: "",
      unitPrice: "",
      amount: "",
      fees: "0",
      currency: "EUR",
      note: "",
    }),
    [source, setSource] = useState(""),
    [format, setFormat] = useState<"atlas" | "trading212">("trading212"),
    [message, setMessage] = useState("");
  const list = filterTransactions(
    state.transactions.filter((t) => t.portfolioId === activePortfolio.id),
    { search, type },
  );
  const save = () => {
    const ticker = form.ticker.toUpperCase(),
      parsed = TransactionSchema.safeParse({
        id: `manual-${Date.now()}`,
        portfolioId: activePortfolio.id,
        assetId: ticker ? ticker.toLowerCase() : undefined,
        type: form.type,
        date: form.date,
        quantity: form.quantity ? +form.quantity : undefined,
        unitPrice: form.unitPrice ? +form.unitPrice : undefined,
        amount: form.amount ? +form.amount : undefined,
        fees: +form.fees || 0,
        currency: form.currency,
        note: form.note || undefined,
      });
    if (!parsed.success) {
      setMessage(parsed.error.issues.map((i) => i.message).join("; "));
      return;
    }
    platform.setTransactions(
      upsertTransaction(state.transactions, parsed.data),
    );
    setMessage("Transaction saved locally.");
  };
  const runImport = () => {
    const ids = new Set(state.transactions.map((t) => t.id)),
      result =
        format === "trading212"
          ? importTrading212Csv(source, activePortfolio.id, ids)
          : importTransactionsCsv(source, activePortfolio.id, ids);
    platform.importData(result.assets, result.transactions, {
      id: `import-${Date.now()}`,
      source: format,
      importedAt: new Date(),
      rowCount: result.transactions.length,
      duplicateCount:
        "duplicates" in result ? result.duplicates : result.duplicateCount,
      errorCount: result.errors.length,
    });
    setMessage(
      `Imported ${result.transactions.length}; duplicates ${"duplicates" in result ? result.duplicates : result.duplicateCount}; errors ${result.errors.length}.`,
    );
  };
  return (
    <section className="content">
      <div className="eyebrow">V0.4–V0.5 · DATA MANAGEMENT</div>
      <div className="title">
        <div>
          <h1>Transactions.</h1>
          <p>Add, filter, import and audit every portfolio event.</p>
        </div>
      </div>
      <div className="two-column">
        <article className="panel form-panel">
          <Head small="MANUAL ENTRY" title="Add transaction" />
          <div className="form-grid">
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as TransactionType })
              }
            >
              {[
                "BUY",
                "SELL",
                "DIVIDEND",
                "DEPOSIT",
                "WITHDRAWAL",
                "FEE",
                "TRANSFER",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <input
              placeholder="Ticker"
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value })}
            />
            <input
              placeholder="Currency"
              value={form.currency}
              onChange={(e) =>
                setForm({ ...form, currency: e.target.value.toUpperCase() })
              }
            />
            <input
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
            <input
              placeholder="Unit price"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            />
            <input
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <input
              placeholder="Fees"
              value={form.fees}
              onChange={(e) => setForm({ ...form, fees: e.target.value })}
            />
            <input
              className="wide"
              placeholder="Note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          <button className="primary" onClick={save}>
            <Save />
            Save transaction
          </button>
        </article>
        <article className="panel form-panel">
          <Head small="BROKER IMPORT" title="Import data" />
          <select
            value={format}
            onChange={(e) =>
              setFormat(e.target.value as "atlas" | "trading212")
            }
          >
            <option value="trading212">Trading 212 CSV</option>
            <option value="atlas">Atlas CSV</option>
          </select>
          <textarea
            placeholder="Paste CSV contents here…"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <button className="primary" onClick={runImport}>
            <FileUp />
            Validate & import
          </button>
        </article>
      </div>
      {message && <div className="status-message">{message}</div>}
      <article className="panel">
        <div className="toolbar">
          <label>
            <Search />
            <input
              placeholder="Search transactions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType | "ALL")}
          >
            <option>ALL</option>
            {[
              "BUY",
              "SELL",
              "DIVIDEND",
              "DEPOSIT",
              "WITHDRAWAL",
              "FEE",
              "TRANSFER",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Asset</th>
                <th>Amount</th>
                <th>Currency</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <td>{t.date.toLocaleDateString("en-GB")}</td>
                  <td>{t.type}</td>
                  <td>{t.assetId ?? "—"}</td>
                  <td>
                    {money(
                      t.amount ?? (t.quantity ?? 0) * (t.unitPrice ?? 0),
                      t.currency,
                    )}
                  </td>
                  <td>{t.currency}</td>
                  <td>
                    <button
                      className="danger"
                      aria-label={`Delete ${t.id}`}
                      onClick={() => {
                        if (confirm("Delete this transaction?"))
                          platform.setTransactions(
                            removeTransaction(state.transactions, t.id),
                          );
                      }}
                    >
                      <Trash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
function Journal({ platform }: { platform: ReturnType<typeof usePlatform> }) {
  const { state } = platform;
  const [action, setAction] = useState<DecisionAction>("HOLD"),
    [asset, setAsset] = useState(""),
    [rationale, setRationale] = useState(""),
    [confidence, setConfidence] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM"),
    [price, setPrice] = useState("");
  const add = () => {
    if (!rationale.trim()) return;
    platform.setJournal([
      createJournalEntry({
        assetId: asset || undefined,
        action,
        rationale,
        confidence,
        priceAtDecision: price ? +price : null,
      }),
      ...state.journal,
    ]);
    setRationale("");
  };
  return (
    <section className="content">
      <div className="eyebrow">V0.6 · DECISION JOURNAL</div>
      <div className="title">
        <div>
          <h1>Decision intelligence.</h1>
          <p>
            Record the thesis before the outcome, then measure judgement over
            time.
          </p>
        </div>
        <small>ACCURACY {pct(journalAccuracy(state.journal))}</small>
      </div>
      <article className="panel journal-form">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as DecisionAction)}
        >
          {["BUY", "BUY_PARTIAL", "HOLD", "REDUCE", "SELL", "WAIT"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <input
          placeholder="Asset ticker"
          value={asset}
          onChange={(e) => setAsset(e.target.value.toLowerCase())}
        />
        <select
          value={confidence}
          onChange={(e) => setConfidence(e.target.value as typeof confidence)}
        >
          <option>LOW</option>
          <option>MEDIUM</option>
          <option>HIGH</option>
        </select>
        <input
          placeholder="Price at decision"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <textarea
          placeholder="Why are you making this decision?"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
        />
        <button className="primary" onClick={add}>
          <BookOpen />
          Record decision
        </button>
      </article>
      <div className="journal-list">
        {state.journal.map((entry) => (
          <article className="panel" key={entry.id}>
            <Head
              small={entry.createdAt.toLocaleDateString("en-GB")}
              title={`${entry.action} · ${entry.assetId ?? "PORTFOLIO"}`}
              badge={entry.confidence}
            />
            <p>{entry.rationale.join(" ")}</p>
            {entry.outcome ? (
              <div className="outcome">
                Outcome: <b>{pct(entry.outcome.returnPct)}</b> ·{" "}
                {entry.outcome.notes}
              </div>
            ) : (
              <button
                className="secondary compact"
                onClick={() => {
                  const value = prompt("Price at review");
                  if (value)
                    platform.setJournal(
                      state.journal.map((item) =>
                        item.id === entry.id
                          ? reviewJournalEntry(item, +value, "Manual review")
                          : item,
                      ),
                    );
                }}
              >
                Review outcome
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
function SettingsPage({
  platform,
}: {
  platform: ReturnType<typeof usePlatform>;
}) {
  const { state } = platform;
  const [key, setKey] = useState(state.settings.alphaVantageKey),
    [marketMessage, setMarketMessage] = useState(""),
    [name, setName] = useState("");
  const refresh = async () => {
    setMarketMessage("Refreshing…");
    const market = await new AlphaVantageProvider(key).getQuotes(state.assets),
      fx = await new EcbFxProvider().getRates(
        state.assets.map((a) => a.currency),
      );
    platform.setMarket(mergeQuoteCache(state.quoteCache, market.quotes), {
      ...state.fxRates,
      ...fx,
    });
    platform.setApiKey(key);
    setMarketMessage(
      `${market.quotes.length} quotes refreshed. ${market.errors.length} errors.`,
    );
  };
  const download = () => {
    const blob = new Blob([createBackup(state)], { type: "application/json" }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `atlas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const restore = async (file?: File) => {
    if (!file) return;
    platform.restore(restoreBackup(await file.text()));
  };
  return (
    <section className="content">
      <div className="eyebrow">SETTINGS · SECURITY · PORTABILITY</div>
      <div className="title">
        <div>
          <h1>Workspace settings.</h1>
          <p>Configure providers, portfolios and portable backups.</p>
        </div>
      </div>
      <div className="two-column">
        <article className="panel form-panel">
          <Head small="MARKET DATA" title="Alpha Vantage & ECB" />
          <label>
            Alpha Vantage API key
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Stored only in this browser"
            />
          </label>
          <button className="primary" onClick={refresh}>
            <RefreshCw />
            Refresh prices & FX
          </button>
          {marketMessage && <p>{marketMessage}</p>}
        </article>
        <article className="panel form-panel">
          <Head small="PORTFOLIOS" title="Multiple portfolios" />
          <input
            placeholder="New portfolio name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="primary"
            onClick={() => {
              if (name.trim())
                platform.addPortfolio({
                  id: `portfolio-${Date.now()}`,
                  name,
                  baseCurrency: "EUR",
                  monthlyDca: 250,
                  strategicReserve: 5000,
                });
            }}
          >
            <Plus />
            Create portfolio
          </button>
          <p>{state.portfolios.length} portfolios configured.</p>
        </article>
        <article className="panel form-panel">
          <Head small="BACKUP" title="Export & restore" />
          <button className="secondary" onClick={download}>
            <Download />
            Download Atlas backup
          </button>
          <label className="restore">
            <Upload />
            Restore Atlas backup
            <input
              type="file"
              accept="application/json"
              onChange={(e) => restore(e.target.files?.[0])}
            />
          </label>
        </article>
        <article className="panel form-panel">
          <Head
            small="IMPORT HISTORY"
            title={`${state.imports.length} batches`}
          />
          {state.imports.slice(0, 5).map((batch) => (
            <p key={batch.id}>
              {batch.importedAt.toLocaleDateString("en-GB")} · {batch.source} ·{" "}
              {batch.rowCount} rows
            </p>
          ))}
        </article>
      </div>
    </section>
  );
}
function Metric({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <article>
      <label>
        {label}
        {label === "MAX DRAWDOWN" ? (
          <ArrowDownRight />
        ) : label === "PORTFOLIO VALUE" ? (
          <BarChart3 />
        ) : (
          <Activity />
        )}
      </label>
      <strong className={positive ? "up" : ""}>{value}</strong>
    </article>
  );
}
function Head({
  small,
  title,
  badge,
}: {
  small: string;
  title: string;
  badge?: string;
}) {
  return (
    <div className="head">
      <div>
        <small>{small}</small>
        <h2>{title}</h2>
      </div>
      {badge && <em>{badge}</em>}
    </div>
  );
}
