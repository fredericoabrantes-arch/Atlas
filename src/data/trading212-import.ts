import type { Asset, Transaction, TransactionType } from '../domain/models'
import { AssetSchema, TransactionSchema } from '../domain/models'
import { parseCsvRows } from './csv-import'

export interface Trading212ImportResult { assets: Asset[]; transactions: Transaction[]; errors: Array<{ row: number; message: string }>; duplicates: number }

const actionMap: Record<string, TransactionType> = {
  'market buy':'BUY','limit buy':'BUY','buy':'BUY','market sell':'SELL','limit sell':'SELL','sell':'SELL',
  'dividend':'DIVIDEND','deposit':'DEPOSIT','card deposit':'DEPOSIT','bank transfer deposit':'DEPOSIT',
  'withdrawal':'WITHDRAWAL','fee':'FEE','currency conversion fee':'FEE','transfer':'TRANSFER',
}
const get = (record: Record<string,string>, ...keys: string[]) => keys.map((key) => record[key]).find((value) => value !== undefined && value !== '') ?? ''
const number = (value: string) => { const parsed = Number(value.replace(/\s/g,'').replace(',','.')); return Number.isFinite(parsed) ? parsed : undefined }
const idFor = (record: Record<string,string>) => {
  const explicit = get(record,'id','order id','transaction id')
  if (explicit) return `t212-${explicit}`
  let hash=2166136261; for(const char of Object.values(record).join('|')){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)} return `t212-${(hash>>>0).toString(16)}`
}

export function importTrading212Csv(source:string,portfolioId:string,existingIds=new Set<string>()):Trading212ImportResult{
  const rows=parseCsvRows(source),errors:Array<{row:number;message:string}>=[],assets=new Map<string,Asset>(),transactions:Transaction[]=[];let duplicates=0
  if(rows.length<2)return{assets:[],transactions:[],errors:[{row:1,message:'Trading 212 CSV is empty.'}],duplicates:0}
  const headers=rows[0].map(header=>header.trim().toLowerCase())
  if(!headers.includes('action')||!headers.includes('time'))return{assets:[],transactions:[],errors:[{row:1,message:'Expected Trading 212 columns Action and Time.'}],duplicates:0}
  rows.slice(1).forEach((values,index)=>{const row=index+2,record=Object.fromEntries(headers.map((header,i)=>[header,values[i]??''])),action=get(record,'action').toLowerCase(),type=actionMap[action]
    if(!type){errors.push({row,message:`Unsupported Trading 212 action: ${get(record,'action')}.`});return}
    const id=idFor(record);if(existingIds.has(id)||transactions.some(transaction=>transaction.id===id)){duplicates+=1;return}
    const ticker=get(record,'ticker','ticker symbol').toUpperCase(),currency=get(record,'currency (total)','currency (price / share)','currency')||'EUR',assetId=ticker?ticker.toLowerCase().replace(/[^a-z0-9]+/g,'-'):undefined
    const quantity=number(get(record,'no. of shares','number of shares','quantity')),unitPrice=number(get(record,'price / share','price per share','price')),total=number(get(record,'total','amount')),fees=number(get(record,'fee','fees','currency conversion fee'))??0
    const parsed=TransactionSchema.safeParse({id,portfolioId,assetId,type,date:get(record,'time','date'),quantity,unitPrice,amount:total,fees:Math.abs(fees),currency,note:`Trading 212 · ${get(record,'action')}`})
    if(!parsed.success){errors.push({row,message:parsed.error.issues.map(issue=>issue.message).join('; ')});return}transactions.push(parsed.data)
    if(ticker){const asset=AssetSchema.safeParse({id:assetId,ticker,name:get(record,'name')||ticker,assetClass:'STOCK',currency});if(asset.success)assets.set(asset.data.id,asset.data)}
  });return{assets:[...assets.values()],transactions,errors,duplicates}
}

