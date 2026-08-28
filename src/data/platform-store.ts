import { z } from 'zod'
import { AssetSchema,PortfolioSchema,TransactionSchema } from '../domain/models'
import type { Asset,Portfolio,Transaction } from '../domain/models'
import { JournalEntrySchema } from '../domain/journal'
import type { JournalEntry } from '../domain/journal'
import { loadWorkspace } from './workspace'
import type { CachedQuote } from './live-market'

export const PLATFORM_KEY='atlas.platform.v3'
const CachedQuoteSchema=z.object({assetId:z.string(),price:z.number().nullable(),currency:z.string(),asOf:z.coerce.date().nullable(),status:z.enum(['LIVE','DELAYED','STALE','UNAVAILABLE','DEMO']),fetchedAt:z.coerce.date(),source:z.string()})
const ImportBatchSchema=z.object({id:z.string(),source:z.string(),importedAt:z.coerce.date(),rowCount:z.number(),duplicateCount:z.number(),errorCount:z.number()})
const PlatformSchema=z.object({version:z.literal(3),portfolios:z.array(PortfolioSchema).min(1),activePortfolioId:z.string(),assets:z.array(AssetSchema),transactions:z.array(TransactionSchema),journal:z.array(JournalEntrySchema),imports:z.array(ImportBatchSchema),quoteCache:z.array(CachedQuoteSchema),fxRates:z.record(z.string(),z.number()),settings:z.object({alphaVantageKey:z.string(),autoRefresh:z.boolean()}),updatedAt:z.coerce.date()})
export type ImportBatch=z.infer<typeof ImportBatchSchema>
export interface PlatformState{version:3;portfolios:Portfolio[];activePortfolioId:string;assets:Asset[];transactions:Transaction[];journal:JournalEntry[];imports:ImportBatch[];quoteCache:CachedQuote[];fxRates:Record<string,number>;settings:{alphaVantageKey:string;autoRefresh:boolean};updatedAt:Date}
export interface StoreLike{getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void}
export function migratePlatform(storage:StoreLike):PlatformState{const current=storage.getItem(PLATFORM_KEY);if(current){try{const parsed=PlatformSchema.safeParse(JSON.parse(current));if(parsed.success)return parsed.data}catch{/* migrate below */}}
  const old=loadWorkspace(storage);if(old.status==='READY'){return{version:3,portfolios:[old.workspace.portfolio],activePortfolioId:old.workspace.portfolio.id,assets:old.workspace.assets,transactions:old.workspace.transactions,journal:[],imports:[],quoteCache:[],fxRates:{'USD/EUR':.86},settings:{alphaVantageKey:'',autoRefresh:false},updatedAt:new Date()}}
  throw new Error('No Atlas workspace is available to migrate.')}
export function savePlatform(storage:StoreLike,state:PlatformState):PlatformState{const validated=PlatformSchema.parse({...state,updatedAt:new Date()});storage.setItem(PLATFORM_KEY,JSON.stringify(validated));return validated}
export function parsePlatformBackup(payload:unknown):PlatformState{return PlatformSchema.parse(payload)}
