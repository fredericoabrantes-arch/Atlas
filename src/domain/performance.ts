export interface ReturnPeriod {
  startValue: number;
  endValue: number;
  externalFlow?: number;
}
export interface DatedCashFlow {
  date: Date;
  amount: number;
}
export interface ScenarioInput {
  currentValue: number;
  annualReturn: number;
  annualVolatility: number;
  years: number;
  monthlyContribution?: number;
}

export function timeWeightedReturn(periods: ReturnPeriod[]): number | null {
  if (
    !periods.length ||
    periods.some(
      (period) => period.startValue <= 0 || !Number.isFinite(period.endValue),
    )
  )
    return null;
  return (
    periods.reduce(
      (growth, period) =>
        growth *
        ((period.endValue - (period.externalFlow ?? 0)) / period.startValue),
      1,
    ) - 1
  );
}

export function moneyWeightedReturn(
  cashFlows: DatedCashFlow[],
  guess = 0.08,
): number | null {
  if (
    cashFlows.length < 2 ||
    !cashFlows.some((flow) => flow.amount < 0) ||
    !cashFlows.some((flow) => flow.amount > 0)
  )
    return null;
  const ordered = [...cashFlows].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const origin = ordered[0].date.getTime();
  const years = ordered.map(
    (flow) => (flow.date.getTime() - origin) / 31_557_600_000,
  );
  let rate = guess;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    if (rate <= -0.999999) rate = -0.999999;
    let value = 0,
      derivative = 0;
    ordered.forEach((flow, index) => {
      const factor = (1 + rate) ** years[index];
      value += flow.amount / factor;
      derivative -= (years[index] * flow.amount) / (factor * (1 + rate));
    });
    if (Math.abs(value) < 1e-7) return rate;
    if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-12)
      return null;
    const next = rate - value / derivative;
    if (!Number.isFinite(next) || next <= -1 || next > 1_000) return null;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }
  return null;
}

export function benchmarkComparison(
  portfolioReturn: number | null,
  benchmarkReturn: number | null,
) {
  return {
    portfolioReturn,
    benchmarkReturn,
    activeReturn:
      portfolioReturn === null || benchmarkReturn === null
        ? null
        : portfolioReturn - benchmarkReturn,
  };
}

export function projectScenario(input: ScenarioInput) {
  const months = Math.max(0, Math.round(input.years * 12)),
    monthlyRate = (1 + input.annualReturn) ** (1 / 12) - 1;
  let expected = input.currentValue;
  for (let month = 0; month < months; month += 1)
    expected = expected * (1 + monthlyRate) + (input.monthlyContribution ?? 0);
  const horizonVolatility =
    input.annualVolatility * Math.sqrt(Math.max(input.years, 0));
  return {
    expected,
    downside: Math.max(0, expected * (1 - horizonVolatility)),
    upside: expected * (1 + horizonVolatility),
  };
}
