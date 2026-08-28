import { describe, expect, it } from 'vitest'
import type { Position } from './models'
import { valuePositions } from './portfolio'

describe('base-currency valuation', () => {
  it('converts both market value and cost basis before calculating P&L', () => {
    const positions: Position[] = [{
      assetId: 'usd-asset', quantity: 2, averageCost: 100, costBasis: 200,
      realizedPnl: 0, income: 0, fees: 0,
    }]

    const [valued] = valuePositions(
      positions,
      [{ assetId: 'usd-asset', price: 150, currency: 'USD', asOf: new Date(), status: 'DEMO' }],
      'EUR',
      { 'USD/EUR': 0.8 },
    )

    expect(valued.valueInBaseCurrency).toBe(240)
    expect(valued.unrealizedPnl).toBe(80)
  })
})
