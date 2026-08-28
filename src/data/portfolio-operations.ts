import type { Transaction, TransactionType } from '../domain/models'

export interface TransactionFilters { search?:string; type?:TransactionType|'ALL'; from?:Date; to?:Date }

export function upsertTransaction(transactions:Transaction[],transaction:Transaction):Transaction[]{const index=transactions.findIndex(item=>item.id===transaction.id);if(index<0)return[...transactions,transaction];return transactions.map(item=>item.id===transaction.id?transaction:item)}
export function removeTransaction(transactions:Transaction[],id:string):Transaction[]{return transactions.filter(item=>item.id!==id)}
export function filterTransactions(transactions:Transaction[],filters:TransactionFilters):Transaction[]{const search=filters.search?.trim().toLowerCase();return transactions.filter(item=>(!filters.type||filters.type==='ALL'||item.type===filters.type)&&(!filters.from||item.date>=filters.from)&&(!filters.to||item.date<=filters.to)&&(!search||[item.type,item.assetId,item.note,item.currency].some(value=>String(value??'').toLowerCase().includes(search))))}
export function cashBalances(transactions:Transaction[]):Record<string,number>{return transactions.reduce<Record<string,number>>((balances,item)=>{let delta=0;if(item.type==='DEPOSIT'||item.type==='DIVIDEND')delta=Math.abs(item.amount??0);else if(item.type==='WITHDRAWAL'||item.type==='FEE')delta=-Math.abs(item.amount??item.fees);else if(item.type==='BUY')delta=-((item.quantity??0)*(item.unitPrice??0)+item.fees);else if(item.type==='SELL')delta=(item.quantity??0)*(item.unitPrice??0)-item.fees;balances[item.currency]=(balances[item.currency]??0)+delta;return balances},{})}

