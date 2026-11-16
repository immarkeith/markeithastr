import { supabaseAdmin } from '@/integrations/supabase/client.server';
import type { Json } from '@/integrations/supabase/types';
import { classifySessions } from './regime.server';
import { paperSettlementDate, isPaperSession } from './settlement-rules';
import { validDailyBar } from './market-data-validation';
import { discover, evaluate, splitWindows, type Model, type PriceBar } from './byob-rules';

export async function byobBars(ticker: string): Promise<PriceBar[]> {
  const rows: PriceBar[]=[];
  const today=new Date().toISOString().slice(0,10);
  for(let offset=0;;offset+=1000){
    const {data,error}=await supabaseAdmin.from('daily_bars').select('bar_date,open,high,low,close,volume').eq('ticker',ticker).lt('bar_date',today).order('bar_date').range(offset,offset+999);
    if(error) throw new Error('Stored market history could not be read.');
    rows.push(...(data??[]).map(b=>({date:b.bar_date,open:Number(b.open),high:Number(b.high),low:Number(b.low),close:Number(b.close),volume:Number(b.volume)})));
    if((data??[]).length<1000) break;
  }
  return rows;
}
function completeHistory(bars: PriceBar[]) {
  return bars.every((b,i)=>validDailyBar({...b,ticker:'BYOB',bar_date:b.date}) && isPaperSession(b.date) && (i===0 || paperSettlementDate(bars[i-1]?.date??b.date)===b.date));
}
async function regimeMap() {
  const spy=await byobBars('SPY');
  return Object.fromEntries([...classifySessions(spy).regimes].map(([date,r])=>[date,`${r.direction}-${r.volatility}`]));
}
export async function getByob(ticker: string) {
  const {data,error}=await supabaseAdmin.from('byob_models').select('*').eq('ticker',ticker).order('version',{ascending:false}).limit(20);
  if(error) throw new Error('BYOB research storage is unavailable. Apply the BYOB setup on this host.');
  const row=data?.[0];
  if(!row) return {ticker,model:null,evaluation:null,versions:[]};
  const model=row.result as unknown as Model;
  const bars=await byobBars(ticker), regimes=await regimeMap();
  const latest=bars.at(-1)?.date;
  return {ticker,model:{...model,id:row.id,version:row.version,created_at:row.created_at},evaluation:{...evaluate(model,bars,latest?regimes[latest]??'unknown':'unknown'),as_of:latest??null},versions:(data??[]).map(r=>({version:r.version,status:r.status,created_at:r.created_at,reason:r.qualification_reason}))};
}
export async function trainByob(ticker: string) {
  const bars=await byobBars(ticker);
  const regimes=await regimeMap();
  const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({engine:'byob-v1-calendar',bars,regimes}))))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const {data:existing,error:readError}=await supabaseAdmin.from('byob_models').select('id,version,data_fingerprint,result').eq('ticker',ticker).order('version',{ascending:false}).limit(1);
  if(readError) throw new Error('BYOB storage is unavailable.');
  const last=existing?.[0];
  if(last?.data_fingerprint===fingerprint) return getByob(ticker);
  const old=last?.result as unknown as Model|undefined;
  const holdoutStart=bars[splitWindows(bars.length).validationEnd]?.date;
  if(old?.candidate && old.windows.data_to && (!holdoutStart || holdoutStart<=old.windows.data_to)) throw new Error('New untouched holdout history is required before another discovery run. Previous results stay preserved.');
  // Validate before inspecting any holdout, not after running an invalid replay.
  const model=completeHistory(bars)?discover(bars,regimes):{...discover([],{}),windows:{...discover([],{}).windows,bars:bars.length,data_to:bars.at(-1)?.date??null},reason:'Stored history has missing or invalid sessions. Research is pending complete bars; no simulated fills were saved.'};
  const {error}=await supabaseAdmin.from('byob_models').insert({ticker,version:(last?.version??0)+1,status:model.status,formula_type:model.candidate?.formula??null,parameters:(model.candidate??{}) as unknown as Json,best_horizon_days:model.candidate?.horizon??null,training_metrics:model.training as unknown as Json,validation_metrics:model.validation as unknown as Json,holdout_metrics:model.holdout as unknown as Json,regime_metrics:model.regimes as unknown as Json,qualification_reason:model.reason,result:model as unknown as Json,data_fingerprint:fingerprint});
  if(error) throw new Error('Research could not be saved; another run may already have saved this history.');
  return getByob(ticker);
}
/** Existing adapter, duplicate-preserving ingestion, no alternative price conventions. */
export async function prepareByob(ticker: string) {
  const {alpacaBars}=await import('./market-data.server');
  const until=new Date().toISOString().slice(0,10);
  const bars=await alpacaBars([ticker],'2023-01-01',until);
  const valid=bars.filter(b=>b.bar_date<until && validDailyBar(b));
  for(let i=0;i<valid.length;i+=500){
    const {error}=await supabaseAdmin.from('daily_bars').upsert(valid.slice(i,i+500),{onConflict:'ticker,bar_date',ignoreDuplicates:true});
    if(error) throw new Error('Historical data preparation could not be saved.');
  }
  return valid.length;
}