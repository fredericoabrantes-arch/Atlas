# Atlas

Atlas is a personal investment management and decision-support application.

> **Code calculates. AI interprets.**

All financial calculations are deterministic TypeScript functions. Decisions are reviewable candidates; Atlas does not execute trades.

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

`src/domain` is framework-independent. `src/data` contains provider contracts and demo fixtures. React consumes calculated results without duplicating financial logic.

## Setup

Requires Node.js 20+. Run `npm install`, then `npm run dev`. Quality checks are `npm test`, `npm run lint`, and `npm run build`.

## Roadmap

Persistence and imports; production market/FX providers; Decision Journal workflows; benchmark and TWR/MWR returns; scenario analysis and explainable AI interpretation.

No broker execution or automatic trading is included.
