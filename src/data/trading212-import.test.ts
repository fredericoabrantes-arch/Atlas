import { describe,expect,it } from 'vitest'
import { importTrading212Csv } from './trading212-import'

const source=`Action,Time,ISIN,Ticker,Name,No. of shares,Price / share,Currency (Price / share),Total,Currency (Total),ID
Market buy,2026-08-01 10:30:00,US67066G1040,NVDA,NVIDIA,2,180,USD,360,USD,abc1
Dividend,2026-08-20 09:00:00,US67066G1040,NVDA,NVIDIA,,,,12.50,USD,abc2
Deposit,2026-08-22 09:00:00,,,,,,,250,EUR,abc3`

describe('Trading 212 import',()=>{
  it('maps broker actions into Atlas transactions',()=>{const result=importTrading212Csv(source,'main');expect(result.errors).toEqual([]);expect(result.transactions.map(item=>item.type)).toEqual(['BUY','DIVIDEND','DEPOSIT']);expect(result.assets[0].ticker).toBe('NVDA')})
  it('uses broker ids to prevent duplicates',()=>{const first=importTrading212Csv(source,'main');const second=importTrading212Csv(source,'main',new Set(first.transactions.map(item=>item.id)));expect(second.duplicates).toBe(3);expect(second.transactions).toHaveLength(0)})
  it('reports unsupported actions',()=>{const invalid=source.replace('Market buy','Interest payment');expect(importTrading212Csv(invalid,'main').errors[0].message).toContain('Unsupported')})
})
