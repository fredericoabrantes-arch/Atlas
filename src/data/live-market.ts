import { z } from 'zod'
import type { Currency, MarketQuote } from '../domain/models'
import type { FxTable } from '../domain/fx'

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>
export type Freshness = 'LIVE' | 'DELAYED' | 'STALE' | 'UNAVAILABLE'

export interface CachedQuote extends MarketQuote { fetchedAt: Date; source: string }
export interface MarketRefreshResult { quotes: CachedQuote[]; errors: string[] }

const alphaQuoteSchema = z.object({
  'Global Quote': z.object({
    '01. symbol': z.string(),
    '05. price': z.string(),
    '07. latest trading day': z.string(),
  }),
})

export function quoteFreshness(asOf: Date | null, now = new Date()): Freshness {
  if (!asOf) return 'UNAVAILABLE'
  const ageHours = (now.getTime() - asOf.getTime()) / 3_600_000
  if (ageHours <= 1) return 'LIVE'
  if (ageHours <= 24) return 'DELAYED'
  return 'STALE'
}

export class AlphaVantageProvider {
  readonly name = 'Alpha Vantage Global Quote'
  constructor(private apiKey: string, private fetcher: FetchLike = fetch) {}

  async getQuote(assetId: string, symbol: string, currency: Currency): Promise<CachedQuote> {
    if (!this.apiKey.trim()) throw new Error('Alpha Vantage API key is not configured.')
    const url = new URL('https://www.alphavantage.co/query')
    url.searchParams.set('function', 'GLOBAL_QUOTE')
    url.searchParams.set('symbol', symbol)
    url.searchParams.set('apikey', this.apiKey)
    const response = await this.fetcher(url.toString())
    if (!response.ok) throw new Error(`Quote request failed with HTTP ${response.status}.`)
    const body: unknown = await response.json()
    if (typeof body === 'object' && body && ('Note' in body || 'Information' in body)) throw new Error('Market data provider rate limit or entitlement reached.')
    const parsed = alphaQuoteSchema.safeParse(body)
    if (!parsed.success) throw new Error(`No quote returned for ${symbol}.`)
    const price = Number(parsed.data['Global Quote']['05. price'])
    if (!Number.isFinite(price) || price <= 0) throw new Error(`Invalid quote returned for ${symbol}.`)
    const asOf = new Date(`${parsed.data['Global Quote']['07. latest trading day']}T16:00:00Z`)
    return { assetId, price, currency, asOf, status: quoteFreshness(asOf), fetchedAt: new Date(), source: this.name }
  }

  async getQuotes(assets: Array<{ id: string; ticker: string; currency: Currency }>): Promise<MarketRefreshResult> {
    const quotes: CachedQuote[] = [], errors: string[] = []
    for (const asset of assets) {
      try { quotes.push(await this.getQuote(asset.id, asset.ticker, asset.currency)) }
      catch (error) { errors.push(error instanceof Error ? error.message : `Unknown quote error for ${asset.ticker}.`) }
    }
    return { quotes, errors }
  }
}

const ecbSchema = z.object({ dataSets: z.array(z.object({ series: z.record(z.string(), z.object({ observations: z.record(z.string(), z.array(z.number())) })) })), structure: z.object({ dimensions: z.object({ observation: z.array(z.object({ values: z.array(z.object({ id: z.string() })) })) }) }) })

export class EcbFxProvider {
  readonly name = 'ECB reference rates'
  constructor(private fetcher: FetchLike = fetch) {}

  async getRates(currencies: Currency[]): Promise<FxTable> {
    const requested = [...new Set(currencies.filter((currency) => currency !== 'EUR'))]
    if (!requested.length) return {}
    const key = `D.${requested.join('+')}.EUR.SP00.A`
    const url = `https://data-api.ecb.europa.eu/service/data/EXR/${key}?lastNObservations=1&format=jsondata`
    const response = await this.fetcher(url, { headers: { Accept: 'application/vnd.sdmx.data+json;version=1.0.0-wd' } })
    if (!response.ok) throw new Error(`ECB FX request failed with HTTP ${response.status}.`)
    const parsed = ecbSchema.safeParse(await response.json())
    if (!parsed.success) throw new Error('ECB returned an unsupported FX response.')
    const currencyValues = parsed.data.structure.dimensions.observation.find((dimension) => dimension.values.some((value) => requested.includes(value.id)))?.values ?? []
    const series = parsed.data.dataSets[0]?.series ?? {}
    const rates: FxTable = {}
    Object.entries(series).forEach(([seriesKey, value]) => {
      const currency = currencyValues[Number(seriesKey.split(':')[1] ?? seriesKey.split(':')[0])]?.id
      const observation = Object.values(value.observations)[0]?.[0]
      if (currency && observation) rates[`${currency}/EUR`] = 1 / observation
    })
    return rates
  }
}

export function mergeQuoteCache(existing: CachedQuote[], incoming: CachedQuote[]): CachedQuote[] {
  const map = new Map(existing.map((quote) => [quote.assetId, quote]))
  incoming.forEach((quote) => map.set(quote.assetId, quote))
  return [...map.values()]
}

