import { AssetSchema, TransactionSchema } from '../domain/models'
import type { Asset, Transaction, TransactionType } from '../domain/models'

export interface CsvRowError { row: number; message: string }
export interface CsvImportResult {
  assets: Asset[]
  transactions: Transaction[]
  errors: CsvRowError[]
  duplicateCount: number
  sourceRowCount: number
}

const requiredHeaders = ['date', 'type', 'currency']
const tradeTypes = new Set<TransactionType>(['BUY', 'SELL'])
const assetTypes = new Set<TransactionType>(['BUY', 'SELL', 'DIVIDEND', 'FEE'])

function parseCsvRows(source: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"') {
      if (quoted && source[index + 1] === '"') { cell += '"'; index += 1 }
      else quoted = !quoted
    } else if (character === ',' && !quoted) { row.push(cell.trim()); cell = '' }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      row.push(cell.trim()); cell = ''
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
    } else cell += character
  }
  row.push(cell.trim())
  if (row.some((value) => value.length > 0)) rows.push(row)
  return rows
}

function numberOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined
  const normalized = value.replace(/\s/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function fingerprint(values: string[]): string {
  let hash = 2166136261
  for (const character of values.join('|')) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return `csv-${(hash >>> 0).toString(16)}`
}

function assetId(ticker: string): string {
  return ticker.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export function importTransactionsCsv(
  source: string,
  portfolioId: string,
  existingTransactionIds: Set<string> = new Set(),
): CsvImportResult {
  const rows = parseCsvRows(source)
  if (rows.length === 0) return { assets: [], transactions: [], errors: [{ row: 1, message: 'CSV is empty.' }], duplicateCount: 0, sourceRowCount: 0 }
  const headers = rows[0].map((header) => header.trim().toLowerCase())
  const missing = requiredHeaders.filter((header) => !headers.includes(header))
  if (missing.length) return { assets: [], transactions: [], errors: [{ row: 1, message: `Missing columns: ${missing.join(', ')}.` }], duplicateCount: 0, sourceRowCount: rows.length - 1 }

  const assets = new Map<string, Asset>()
  const transactions: Transaction[] = []
  const errors: CsvRowError[] = []
  let duplicateCount = 0

  rows.slice(1).forEach((values, rowIndex) => {
    const rowNumber = rowIndex + 2
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
    const type = record.type.toUpperCase() as TransactionType
    const ticker = record.ticker?.toUpperCase()
    const id = fingerprint(headers.map((header) => record[header]))
    if (existingTransactionIds.has(id) || transactions.some((transaction) => transaction.id === id)) { duplicateCount += 1; return }
    if (assetTypes.has(type) && !ticker) { errors.push({ row: rowNumber, message: `${type} requires a ticker.` }); return }

    const parsed = TransactionSchema.safeParse({
      id,
      portfolioId,
      assetId: ticker ? assetId(ticker) : undefined,
      type,
      date: record.date,
      quantity: numberOrUndefined(record.quantity),
      unitPrice: numberOrUndefined(record.unitprice),
      amount: numberOrUndefined(record.amount),
      fees: numberOrUndefined(record.fees) ?? 0,
      currency: record.currency,
      note: record.note || undefined,
    })
    if (!parsed.success) {
      errors.push({ row: rowNumber, message: parsed.error.issues.map((issue) => issue.message).join('; ') })
      return
    }
    if (tradeTypes.has(type) && ((parsed.data.quantity ?? 0) <= 0 || parsed.data.unitPrice === undefined)) {
      errors.push({ row: rowNumber, message: `${type} requires positive quantity and unitPrice.` })
      return
    }
    transactions.push(parsed.data)
    if (ticker) {
      const candidate = AssetSchema.parse({
        id: assetId(ticker), ticker, name: record.name || ticker,
        assetClass: (record.assetclass || 'OTHER').toUpperCase(), currency: record.currency,
        region: record.region || undefined, sector: record.sector || undefined,
      })
      assets.set(candidate.id, candidate)
    }
  })

  return { assets: [...assets.values()], transactions, errors, duplicateCount, sourceRowCount: rows.length - 1 }
}

export const CSV_TEMPLATE = `date,type,ticker,name,assetClass,quantity,unitPrice,amount,fees,currency,note
2026-01-15,BUY,VUAA,Vanguard S&P 500 UCITS,ETF,2,125.40,,1,EUR,Monthly DCA
2026-02-01,DEPOSIT,,,,,,250,0,EUR,Monthly contribution`

