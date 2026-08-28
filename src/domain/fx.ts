import type { Currency } from './models'
export type FxTable=Record<string,number>
export function convertCurrency(amount:number,from:Currency,to:Currency,rates:FxTable):number|null{if(from===to)return amount;const direct=rates[`${from}/${to}`];if(direct!==undefined)return amount*direct;const inverse=rates[`${to}/${from}`];if(inverse!==undefined&&inverse!==0)return amount/inverse;return null}
