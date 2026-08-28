import type { MarketQuote } from '../domain/models'
export interface MarketDataProvider{readonly name:string;readonly mode:'LIVE'|'DEMO';getQuotes(assetIds:string[]):Promise<MarketQuote[]>}
export class DemoMarketDataProvider implements MarketDataProvider{readonly name='Atlas demo dataset';readonly mode='DEMO' as const;constructor(private readonly quotes:MarketQuote[]){}async getQuotes(ids:string[]){return this.quotes.filter(q=>ids.includes(q.assetId))}}
