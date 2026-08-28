# Atlas

Atlas is a personal investment management and decision-support application.

> **Code calculates. AI interprets.**

All financial calculations are deterministic TypeScript functions. Decisions are reviewable candidates; Atlas does not execute trades.

## v0.2 local workspace

- Versioned browser persistence with Zod validation on save and load.
- CSV import with quoted-field support, row-level validation and preview counters.
- Stable transaction fingerprints prevent duplicate reimports.
- Imported assets are merged by normalized ticker identity.
- Files are processed locally in the browser and are never uploaded.
- Corrupt saved data fails safely to the demo workspace with a visible warning.

Required CSV columns are `date`, `type`, and `currency`. Trades also require `ticker`, `quantity`, and `unitPrice`. Optional columns are `name`, `assetClass`, `amount`, `fees`, `note`, `region`, and `sector`.

## v0.3–v0.6 platform

- Configurable Alpha Vantage quotes and ECB reference FX rates with cache, source and freshness states.
- Trading 212 CSV mapping for trades, dividends, deposits, withdrawals and fees.
- Transaction creation, filtering and deletion, per-currency cash balances and multiple portfolios.
- Portable validated JSON backup and restore.
- Decision Journal with action, thesis, confidence, outcome review and accuracy tracking.
- Migration from the v0.2 local workspace to the platform store.
- GitHub Actions checks for tests, lint and production builds.

Alpha Vantage credentials are optional and stored only in browser storage. Without a key, Atlas keeps using demo or unavailable states rather than inventing market values.

## v0.1 foundation

- Responsive dark-fintech dashboard and explicit demo-data status.
- Portfolio, asset, transaction, position and decision-journal models.
- BUY, SELL, DIVIDEND, DEPOSIT, WITHDRAWAL, FEE and TRANSFER transactions.
- Average-cost reconstruction, FX, value, P&L, weights, concentration and drawdown.
- €250 monthly DCA and €5,000 reserve defaults; drawdown candidates preserve a €500 floor.
- Decision Engine actions: BUY, BUY_PARTIAL, HOLD, REDUCE, SELL and WAIT.
- MarketDataProvider abstraction, strict TypeScript, Zod and Vitest.
- Missing data is unavailable, never silently presented as zero.

## Architecture

`src/domain` is framework-independent. `src/data` contains versioned persistence, CSV ingestion, provider contracts and demo fixtures. React consumes calculated results without duplicating financial logic.

## Setup

Requires Node.js 20+. Run `npm install`, then `npm run dev`. Quality checks are `npm test`, `npm run lint`, and `npm run build`.

## Roadmap

Next: server-side encrypted sync, authentication, benchmark/TWR/MWR returns, scenario analysis and explainable AI interpretation.

No broker execution or automatic trading is included.
