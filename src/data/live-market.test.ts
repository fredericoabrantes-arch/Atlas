import { describe, expect, it } from 'vitest'
import { AlphaVantageProvider, mergeQuoteCache, quoteFreshness } from './live-market'

describe('live market data', () => {
  it('classifies quote freshness', () => {
    const now = new Date('2026-08-28T12:00:00Z')
    expect(quoteFreshness(new Date('2026-08-28T11:30:00Z'), now)).toBe('LIVE')
    expect(quoteFreshness(new Date('2026-08-28T02:00:00Z'), now)).toBe('DELAYED')
    expect(quoteFreshness(new Date('2026-08-20T00:00:00Z'), now)).toBe('STALE')
    expect(quoteFreshness(null, now)).toBe('UNAVAILABLE')
  })
  it('parses Alpha Vantage global quotes', async () => {
    const fetcher = async () => new Response(JSON.stringify({ 'Global Quote': { '01. symbol': 'IBM', '05. price': '245.50', '07. latest trading day': '2026-08-28' } }))
    const quote = await new AlphaVantageProvider('key', fetcher).getQuote('ibm', 'IBM', 'USD')
    expect(quote.price).toBe(245.5)
    expect(quote.source).toContain('Alpha Vantage')
  })
  it('rejects missing credentials and merges cache by asset', async () => {
    await expect(new AlphaVantageProvider('').getQuote('ibm', 'IBM', 'USD')).rejects.toThrow('not configured')
    const old = { assetId:'a',price:1,currency:'EUR',asOf:new Date(),status:'STALE' as const,fetchedAt:new Date(),source:'old' }
    const fresh = { ...old, price:2, status:'LIVE' as const, source:'new' }
    expect(mergeQuoteCache([old],[fresh])[0].price).toBe(2)
  })
})
