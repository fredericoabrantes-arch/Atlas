import { describe, expect, it } from "vitest";
import {
  benchmarkComparison,
  moneyWeightedReturn,
  projectScenario,
  timeWeightedReturn,
} from "./performance";

describe("performance analytics", () => {
  it("calculates TWR without allowing contributions to inflate return", () => {
    expect(
      timeWeightedReturn([
        { startValue: 100, endValue: 110 },
        { startValue: 110, endValue: 132, externalFlow: 11 },
      ]),
    ).toBeCloseTo(0.21);
    expect(timeWeightedReturn([])).toBeNull();
  });
  it("calculates annual money-weighted return from dated cash flows", () => {
    expect(
      moneyWeightedReturn([
        { date: new Date("2025-01-01"), amount: -1000 },
        { date: new Date("2026-01-01"), amount: 1100 },
      ]),
    ).toBeCloseTo(0.1, 3);
    expect(
      moneyWeightedReturn([{ date: new Date(), amount: -100 }]),
    ).toBeNull();
  });
  it("compares a benchmark and projects contribution scenarios", () => {
    expect(benchmarkComparison(0.12, 0.09).activeReturn).toBeCloseTo(0.03);
    const result = projectScenario({
      currentValue: 10000,
      annualReturn: 0,
      annualVolatility: 0.1,
      years: 1,
      monthlyContribution: 100,
    });
    expect(result.expected).toBe(11200);
    expect(result.downside).toBe(10080);
    expect(result.upside).toBeCloseTo(12320);
  });
});
