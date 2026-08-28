import { describe, expect, it } from 'vitest'
import { importTransactionsCsv } from './csv-import'

const csv = `date,type,ticker,name,assetClass,quantity,unitPrice,amount,fees,currency,note
2026-01-15,BUY,VUAA,"Vanguard, S&P 500",ETF,2,125.40,,1,EUR,Monthly DCA
2026-02-01,DEPOSIT,,,,,,250,0,EUR,Contribution`

describe('CSV import', () => {
  it('parses quoted values and creates assets and transactions', () => {
    const result = importTransactionsCsv(csv, 'main')
    expect(result.errors).toEqual([])
    expect(result.assets[0].name).toBe('Vanguard, S&P 500')
    expect(result.transactions).toHaveLength(2)
  })
  it('deduplicates stable transaction fingerprints', () => {
    const first = importTransactionsCsv(csv, 'main')
    const second = importTransactionsCsv(csv, 'main', new Set(first.transactions.map((transaction) => transaction.id)))
    expect(second.transactions).toHaveLength(0)
    expect(second.duplicateCount).toBe(2)
  })
  it('reports missing columns and invalid trade rows', () => {
    expect(importTransactionsCsv('ticker,amount\nVUAA,10', 'main').errors[0].message).toContain('Missing columns')
    const invalid = importTransactionsCsv('date,type,ticker,currency\n2026-01-01,BUY,VUAA,EUR', 'main')
    expect(invalid.errors[0].message).toContain('quantity')
  })
})
