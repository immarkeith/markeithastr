import {supabaseAdmin} from '@/integrations/supabase/client.server';
import type {Json} from '@/integrations/supabase/types';
import {classifySessions} from './regime.server';
import {inspectHistory,type Provenance} from './byob-integrity';
import {discover,evaluate,evaluateFrozen,ENGINE,BYOB_SEEDS,splitWindows,type Model,type PriceBar} from './byob-rules';
const json=(x:unknown)=>x as Json;
export async function byobBars(ticker:string):Promise<PriceBar[]>{
 const rows:PriceBar[]=[];const today=new Date().toISOString().slice(0,10);
 for(let offset=0;;offset+=1000){const {data,error}=await supabaseAdmin.from('daily_bars').select('bar_date,open,high,low,close,volume').eq('ticker',ticker).lt('bar_date',today).order('bar_date').range(offset,offset+999);
  if(error)throw new Error('Stored market history could not be read.');
  rows.push(...(data??[]).map(b=>({date:b.bar_date,open:Number(b.open),high:Number(b.high),low:Number(b.low),close:Number(b.close),volume:Number(b.volume)})));if((data??[]).length<1000)break;
 }return rows;
}
async function inputs(ticker:string){const [bars,spy]=await Promise.all([byobBars(ticker),byobBars('SPY')]);const regimes=Object.fromEntries([...classifySessions(spy).regimes].map(([d,r])=>[d,`${r.direction}-${r.volatility}`]));const map=new Map(spy.map(b=>[b.date,b.close]));return {bars,spy,regimes,spyCloses:bars.map(b=>map.get(b.date)??0)};}
export async function getByob(ticker:string){
 const [models,registry]=await Promise.all([supabaseAdmin.from('byob_models').select('*').eq('ticker',ticker).order('version',{ascending:false}),supabaseAdmin.from('byob_registry').select('*').eq('ticker',ticker).maybeSingle()]);
 if(models.error||registry.error)throw new Error('Corrected BYOB research storage is unavailable on this host.');
 const rows=models.data??[],active=rows.find(r=>r.id===registry.data?.active_model_id),latest=rows[0],row=active??latest;
 if(!row)return {ticker,model:null,evaluation:null,versions:[],active:false,latest_attempt:null};
 const stored=row.result as unknown as Model,legacy=row.methodology!==ENGINE;
 const model=legacy?{...stored,status:'provisional' as const,reason:'Legacy research preserved; not qualified under the corrected holdout methodology.'}:stored;
 const {bars,spy,regimes,spyCloses}=await inputs(ticker);const date=bars.at(-1)?.date;
 const p=row.provenance as unknown as Provenance|null;const integrity=p?inspectHistory(bars,p):null;
 const e=evaluate(model,bars,date?regimes[date]??'unknown':'unknown',spyCloses);
 const current=Boolean(active&&date&&date===spy.at(-1)?.date&&integrity?.qualified);
 return {ticker,model:{...model,id:row.id,version:row.version,created_at:row.created_at},evaluation:{...e,recommended:e.recommended&&current,as_of:date??null},active:Boolean(active),latest_attempt:latest?{version:latest.version,status:latest.evidence_state??latest.status,reason:latest.qualification_reason}:null,versions:rows.map(r=>({version:r.version,status:r.evidence_state??r.status,created_at:r.created_at,reason:r.qualification_reason,legacy:r.methodology!==ENGINE}))};
}
/** All cached historical provenance is deliberately unverified; never infer it from adjustment=all. */
const cacheProvenance:Provenance={provider:'legacy-cache',feed:'unverified',adjustment:'retrospective/unknown',ingested_at:null,corporate_actions_verified:false,point_in_time:false,qualified_integrity:false};
export async function trainByob(ticker:string){
 if(!BYOB_SEEDS.includes(ticker))throw new Error('Initial BYOB research is limited to the approved 15 seed stocks.');
 const {bars,spy,regimes,spyCloses}=await inputs(ticker);
 const provenance={...cacheProvenance};const check=inspectHistory(bars,provenance),spyCheck=inspectHistory(spy,provenance);
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({engine:ENGINE,bars,spy,regimes,provenance}))))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const [prior,runs,registry]=await Promise.all([supabaseAdmin.from('byob_models').select('id,version,methodology,result').eq('ticker',ticker).order('version',{ascending:false}),supabaseAdmin.from('byob_research_runs').select('id,fingerprint').eq('ticker',ticker),supabaseAdmin.from('byob_registry').select('revision').eq('ticker',ticker).maybeSingle()]);
 if(prior.error||runs.error||registry.error)throw new Error('Corrected BYOB storage is unavailable.');
 const existing=(runs.data??[]).find(r=>r.fingerprint===fingerprint);
 let resume:Model|null=null;
 if(existing){const {data,error}=await supabaseAdmin.from('byob_research_events').select('event,evidence').eq('run_id',existing.id).order('created_at');if(error)throw new Error('Run recovery evidence is unavailable.');if(data?.some(e=>e.event==='completed'))return getByob(ticker);
  const frozen=data?.filter(e=>e.event==='frozen').at(-1)?.evidence as {model?:Model}|undefined;
  // Recent work is presumed active; only recover stale runs against their exact input and frozen choice.
  const {data:runRow}=await supabaseAdmin.from('byob_research_runs').select('created_at').eq('id',existing.id).single();
  if(!runRow||Date.now()-Date.parse(runRow.created_at)<10*60*1000)throw new Error('This input already has an active research run.');
  if(!frozen?.model)throw new Error('Stalled discovery has no frozen candidate. New input required; prior attempt is preserved.');
  resume=frozen.model;
 }
 const reservation=existing?{data:{id:existing.id},error:null}:await supabaseAdmin.from('byob_research_runs').insert({ticker,methodology:ENGINE,fingerprint}).select('id').single();
 const run=reservation.data;if(reservation.error||!run)throw new Error('Another research run already reserved this input.');
 const event=async(name:'started'|'frozen'|'holdout_exposed'|'completed'|'failed',evidence:unknown)=>{const {error}=await supabaseAdmin.from('byob_research_events').insert({run_id:run.id,event:name,evidence:json(evidence)});if(error)throw new Error('Research evidence could not be saved.');};
 try{
  await event('started',{bars:bars.length,integrity:check,spy_integrity:spyCheck});
  const split=splitWindows(Math.max(0,bars.length-250)),holdoutStart=bars[250+split.validationEnd]?.date;
  const oldDates=(prior.data??[]).map(r=>(r.result as unknown as Model).windows.data_to??'');
  let exposedThrough=oldDates.sort().at(-1)??'';
  if(runs.data?.length){const {data,error}=await supabaseAdmin.from('byob_research_events').select('evidence').in('run_id',runs.data.map(r=>r.id)).eq('event','holdout_exposed');if(error)throw new Error('Holdout exposure history could not be verified.');for(const e of data??[]){const date=(e.evidence as {data_to?:string}).data_to??'';if(date>exposedThrough)exposedThrough=date;}}
  const allowed=Boolean(holdoutStart&&holdoutStart>exposedThrough);
  let model=resume??discover(check.valid&&spyCheck.valid?bars:[],regimes,{spy:spyCloses,holdoutAllowed:false});
  if(!check.valid||!spyCheck.valid)model={...model,windows:{...model.windows,bars:bars.length,data_to:bars.at(-1)?.date??null},reason:'Historical integrity failed; missing/invalid/unverified discontinuity evidence. No fabricated trades.'};
  const candidateHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(model.candidate))))).map(b=>b.toString(16).padStart(2,'0')).join('');
  if(!resume)await event('frozen',{model,candidate_hash:candidateHash});
  const {data:events,error:exposureError}=await supabaseAdmin.from('byob_research_events').select('event,evidence').eq('run_id',run.id).eq('event','holdout_exposed');
  if(exposureError)throw new Error('Holdout exposure could not be read.');
  const ownExposure=events?.some(e=>(e.evidence as {candidate_hash?:string}).candidate_hash===candidateHash)??false;
  if((allowed||ownExposure)&&model.candidate&&check.valid&&spyCheck.valid){if(!ownExposure)await event('holdout_exposed',{data_to:bars.at(-1)?.date,holdout_start:holdoutStart,candidate_hash:candidateHash});model=evaluateFrozen(model,bars,regimes,spyCloses);}
  if(model.status==='qualified'&&!check.qualified)model={...model,status:'provisional',reason:'Statistical gates passed, but point-in-time/corporate-action provenance is insufficient for full qualification.'};
  const alreadySaved=(prior.data??[]).find(r=>r.methodology===ENGINE&&(r.result as unknown as Model).windows.data_to===model.windows.data_to&&JSON.stringify((r.result as unknown as Model).candidate)===JSON.stringify(model.candidate));
  if(resume&&alreadySaved){await event('completed',{model_id:alreadySaved.id,status:(alreadySaved.result as unknown as Model).status,recovered:true});return getByob(ticker);}
  const version=(prior.data?.[0]?.version??0)+1;
  const {data:saved,error:saveError}=await supabaseAdmin.from('byob_models').insert({ticker,version,status:model.status==='below_threshold'?'disqualified':model.status,evidence_state:model.status,methodology:ENGINE,provenance:json({...provenance,errors:check.errors,limitations:check.limitations}),formula_type:model.candidate?.formula??null,parameters:json(model.candidate??{}),best_horizon_days:model.candidate?.horizon??null,training_metrics:json(model.training),validation_metrics:json(model.validation),holdout_metrics:json(model.holdout),regime_metrics:json(model.regimes),qualification_reason:model.reason,result:json(model),data_fingerprint:fingerprint,is_active:false}).select('id').single();
  if(saveError||!saved)throw new Error('Research result could not be saved; concurrent version conflict. Prior evidence is preserved.');
  await event('completed',{model_id:saved.id,status:model.status});
  if(model.status==='qualified'&&check.qualified){const {error}=await supabaseAdmin.rpc('byob_activate',{p_ticker:ticker,p_model:saved.id,p_revision:registry.data?.revision??0});if(error)throw new Error('Model saved but activation failed.');}
  return getByob(ticker);
 }catch(e){await event('failed',{reason:e instanceof Error?e.message:'Research failed'}).catch(()=>{});throw e;}
}
/** Existing data adapter only; shared cache rows are never replaced. */
export async function prepareByob(ticker:string){
 if(ticker!=='SPY'&&!BYOB_SEEDS.includes(ticker))throw new Error('Ticker outside approved BYOB universe.');
 const {alpacaBars}=await import('./market-data.server');const {validDailyBar}=await import('./market-data-validation');
 const until=new Date().toISOString().slice(0,10),bars=await alpacaBars([ticker],'2020-01-01',until),valid=bars.filter(b=>b.bar_date<until&&validDailyBar(b));
 for(let i=0;i<valid.length;i+=500){const {error}=await supabaseAdmin.from('daily_bars').upsert(valid.slice(i,i+500),{onConflict:'ticker,bar_date',ignoreDuplicates:true});if(error)throw new Error('History preparation failed; prior history preserved.');}return valid.length;
}
