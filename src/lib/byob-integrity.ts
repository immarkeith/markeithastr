import {isPaperSession,paperSettlementDate} from './settlement-rules';
import type {PriceBar} from './byob-rules';
export interface Provenance {provider:string;feed:string;adjustment:string;ingested_at:string|null;corporate_actions_verified:boolean;point_in_time:boolean;qualified_integrity:boolean}
export function inspectHistory(bars:PriceBar[],provenance:Provenance){
 const errors:string[]=[];
 for(let i=0;i<bars.length;i++){
  const b=bars[i];if(!b)continue;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!isPaperSession(b.date))errors.push(`Invalid session ${b.date}`);
  if(![b.open,b.high,b.low,b.close].every(x=>Number.isFinite(x)&&x>0)||!Number.isFinite(b.volume)||b.volume<0||b.low>Math.min(b.open,b.close)||b.high<Math.max(b.open,b.close)||b.low>b.high)errors.push(`Invalid OHLCV ${b.date}`);
  const prior=bars[i-1];
  if(prior){if(b.date<=prior.date)errors.push(`Duplicate or unordered date ${b.date}`);else if(paperSettlementDate(prior.date)!==b.date)errors.push(`Missing session before ${b.date}`);
   if(Math.abs(b.open/prior.close-1)>.4&&!provenance.corporate_actions_verified)errors.push(`Unverified historical price discontinuity ${b.date}`);}
 }
 return {valid:errors.length===0&&bars.length>0,errors,qualified:errors.length===0&&provenance.qualified_integrity&&provenance.point_in_time&&provenance.corporate_actions_verified,
  limitations:provenance.point_in_time&&provenance.corporate_actions_verified?[]:['Retrospectively adjusted history: corporate-action and point-in-time provenance is not established. Full qualification blocked.']};
}