/** BYOB research only. No brokerage imports, shared balances or execution. */
import {features,passesFeature,FILTERS,type FeatureFilter,mean} from './byob-indicators';
export const ENGINE='byob-v3-holdout-regimes';
export const BYOB_SEEDS=['NVDA','AMD','MU','DELL','LRCX','SHOP','AVGO','ASML','ANET','KLAC','STX','LITE','FTNT','MRVL','AMAT'];
export const HORIZONS=[1,2,3,5,7,10,13,20,30,60,90];
export type Formula='momentum_breakout'|'trend_pullback'|'mean_reversion';
export interface PriceBar {date:string;open:number;high:number;low:number;close:number;volume:number}
export interface Candidate {formula:Formula;period:number;threshold:number;horizon:number;filters?:FeatureFilter[]}
export interface Outcome {signal_date:string;entry_date:string;exit_date:string;gross:number;net:number;regime:string;equity:number;stake?:number;marked_dd?:number}
export interface Metrics {n:number;win_rate:number;avg_return:number;gross_return:number;profit_factor:number|null;pf_kind?:'finite'|'unbounded'|'undefined';max_dd:number;start_date:string|null;end_date:string|null;distribution?:Record<string,number>}
export interface Model {
 candidate:Candidate|null;status:'insufficient_data'|'provisional'|'qualified'|'disqualified'|'below_threshold';reason:string;
 training:Metrics;validation:Metrics;holdout:Metrics;regimes:Record<string,Metrics>;outcomes:Outcome[];
 validation_regimes?:Record<string,Metrics>;training_regimes?:Record<string,Metrics>;engine?:string;
 windows:{training_end:string|null;validation_end:string|null;holdout_start:string|null;data_to:string|null;bars:number;warmup?:number};trials:number;
 diagnostics?:{purged:number;skipped:number;combined_dd:number;limitations:string[];interval:[number,number]|null};
 experiments?:{candidate:Candidate;partition:'training'|'validation';metrics:Metrics}[];
}
export function splitWindows(n:number){return {trainingEnd:Math.floor(n*.6),validationEnd:Math.floor(n*.8),end:n};}
export function netReturn(entry:number,exit:number){return (exit*.9995/(entry*1.0005)-1)*100;}
const clamp=(x:number)=>Math.min(1,Math.max(0,x));
export function warmup(c:Candidate){return Math.max(200,130,c.period*5,250);}
export function capacity(n:number,h:number){const w=splitWindows(n);return {training:Math.floor(w.trainingEnd/(h+2)),validation:Math.floor((w.validationEnd-w.trainingEnd)/(h+2)),holdout:Math.floor((n-w.validationEnd)/(h+2))};}
export function quality(e:number,pf:number|null,kind?:Metrics['pf_kind']):number {
 if(kind==='undefined'||(pf!==null&&pf<=0))return 0;
 return e<=0?0:e<.5?25:e<1.5?50:e<3?75:kind==='unbounded'||(pf!==null&&pf>=2)?100:75;
}
export function signal(bars:PriceBar[],i:number,c:Candidate,spy:number[]=[]):number|null {
 const b=bars[i],f=features(bars,i,c.period,spy);if(!b||!f)return null;
 for(const filter of c.filters??[]){const pass=passesFeature(filter,b,f,c.formula==='mean_reversion');if(pass===null)return null;if(!pass)return 0;}
 if(c.formula==='momentum_breakout'){
  if(!f.atr||f.volume<=0)return null;
  const v=b.volume/f.volume;
  return b.close>f.resistance&&v>=c.threshold?50+25*clamp((b.close-f.resistance)/(2*f.atr))+25*clamp((v/c.threshold-1)/.5):0;
 }
 if(c.formula==='trend_pullback'){
  if(f.fast===undefined||f.slow===undefined||c.threshold<=0)return null;
  const d=(f.fast-b.close)/f.fast,delta=c.threshold/100;
  return f.fast>f.slow&&d>=0&&d<=delta?50+50*(1-d/delta):0;
 }
 if(f.sigma<=0)return null;
 const z=(f.m-b.close)/f.sigma;
 return z>=c.threshold?50+50*clamp((z-c.threshold)/2):0;
}
export function simulate(bars:PriceBar[],c:Candidate,start:number,end:number,regimes:Record<string,string>,spy:number[]=[],initial=20,counts?:{purged:number;skipped:number}):Outcome[]{
 const trades:Outcome[]=[];let equity=initial,peak=initial;
 for(let i=Math.max(start,warmup(c));i<end;i++){
  const strength=signal(bars,i,c,spy);
  if(strength===null){if(counts)counts.skipped++;continue;}
  if(strength<=0)continue;
  if(i+1+c.horizon>=end){if(counts)counts.purged++;continue;}
  const entry=bars[i+1],exit=bars[i+1+c.horizon],s=bars[i];if(!entry||!exit||!s||equity<=0)continue;
  const stake=Math.min(20,equity),units=stake/(entry.open*1.0005),cash=equity-stake;
  let dd=0;
  for(let j=i+1;j<=i+1+c.horizon;j++){
   const mark=bars[j];if(!mark)continue;
   dd=Math.max(dd,(peak-(cash+units*mark.low*.9995))/peak*100);
   peak=Math.max(peak,cash+units*mark.close*.9995);
   dd=Math.max(dd,(peak-(cash+units*mark.close*.9995))/peak*100);
  }
  const net=netReturn(entry.open,exit.close);equity=cash+units*exit.close*.9995;peak=Math.max(peak,equity);
  trades.push({signal_date:s.date,entry_date:entry.date,exit_date:exit.date,gross:(exit.close/entry.open-1)*100,net,regime:regimes[s.date]??'unknown',equity,stake,marked_dd:dd});
  i+=1+c.horizon; // next signal after exit; next entry after T+1 settlement.
 }
 return trades;
}
export function metrics(ts:Outcome[]):Metrics{
 const gains=ts.reduce((s,t)=>s+Math.max(0,t.net),0),losses=ts.reduce((s,t)=>s+Math.max(0,-t.net),0);
 let level=20,peak=20,dd=0;const distribution:Record<string,number>={};
 for(const t of ts){level+=Math.min(20,level)*t.net/100;peak=Math.max(peak,level);dd=Math.max(dd,(peak-level)/peak*100,t.marked_dd??0);const q=`${t.entry_date.slice(0,4)}-Q${Math.ceil(Number(t.entry_date.slice(5,7))/3)}`;distribution[q]=(distribution[q]??0)+1;}
 return {n:ts.length,win_rate:ts.length?ts.filter(t=>t.net>0).length/ts.length*100:0,avg_return:mean(ts.map(t=>t.net)),gross_return:mean(ts.map(t=>t.gross)),profit_factor:losses?gains/losses:null,pf_kind:losses?'finite':gains?'unbounded':'undefined',max_dd:dd,start_date:ts[0]?.signal_date??null,end_date:ts.at(-1)?.exit_date??null,distribution};
}
export function groupRegimes(ts:Outcome[]){const groups:Record<string,Outcome[]>={};for(const t of ts)(groups[t.regime]??=[]).push(t);return Object.fromEntries(Object.entries(groups).map(([r,rows])=>[r,metrics(rows)]));}
export function qualify(t:Metrics,v:Metrics,h:Metrics,holdoutRegimes:Record<string,Metrics>,combinedDD=0):Pick<Model,'status'|'reason'>{
 const positive=Object.entries(holdoutRegimes).filter(([r,m])=>r!=='unknown'&&m.n>0&&m.avg_return>0).length;
 if(t.n<10||v.n<5||h.n<5||positive<2)return {status:'provisional',reason:'Insufficient evidence: 10 training, 5 validation, 5 holdout trades and two positive known untouched-holdout regimes required.'};
 if(Math.max(t.max_dd,v.max_dd,h.max_dd,combinedDD)>25)return {status:'disqualified',reason:'Measured marked-equity drawdown exceeds 25%.'};
 if(h.avg_return<=0)return {status:'disqualified',reason:'Non-positive untouched-holdout net expectancy.'};
 if(h.avg_return<.5)return {status:'below_threshold',reason:'Positive holdout expectancy is below +0.50%.'};
 if(h.pf_kind==='undefined'||(h.profit_factor!==null&&h.profit_factor<=0)||(!h.pf_kind&&h.profit_factor===null))return {status:'below_threshold',reason:'Positive holdout profit factor is not established.'};
 return {status:'qualified',reason:'Passed frozen holdout, sample, +0.50% expectancy, profit-factor, two-regime and 25% drawdown gates.'};
}
/** Deterministic chronological block resampling; descriptive, not an independence claim. */
export function interval(ts:Outcome[]):[number,number]|null{
 if(ts.length<30)return null;const block=Math.ceil(Math.sqrt(ts.length)),values:number[]=[];let seed=17;
 for(let r=0;r<300;r++){const sample:number[]=[];while(sample.length<ts.length){seed=(seed*1664525+1013904223)>>>0;const start=seed%(ts.length-block+1);sample.push(...ts.slice(start,start+block).map(t=>t.net));}values.push(mean(sample.slice(0,ts.length)));}
 values.sort((a,b)=>a-b);return [values[7]??0,values[292]??0];
}
export function discover(bars:PriceBar[],regimes:Record<string,string>,options:{spy?:number[];holdoutAllowed?:boolean}={}):Model{
 const W=250,n=Math.max(0,bars.length-W),split=splitWindows(n),te=W+split.trainingEnd,ve=W+split.validationEnd,empty=metrics([]);
 const base:Model={engine:ENGINE,candidate:null,status:'insufficient_data',reason:'At least 250 verified bars plus candidate warmup and adequate completed-trade evidence required.',training:empty,validation:empty,holdout:empty,regimes:{},validation_regimes:{},training_regimes:{},outcomes:[],windows:{training_end:bars[te-1]?.date??null,validation_end:bars[ve-1]?.date??null,holdout_start:bars[ve]?.date??null,data_to:bars.at(-1)?.date??null,bars:bars.length,warmup:W},trials:0,experiments:[]};
 if(bars.length<250||n<=0)return base;
 let best:Candidate|undefined,value=-Infinity;const shortlist:Candidate[]=[];
 // Bounded single/pair optional filters, registered before discovery; no universal feature bundle.
 const bundles:FeatureFilter[][]=[[],...FILTERS.map(f=>[f]),['macd','relative_strength'],['atr','bollinger'],['ema','volume']];
 for(const formula of ['momentum_breakout','trend_pullback','mean_reversion'] as Formula[]){
  let selected:Candidate|undefined,trainingValue=-Infinity;
  for(const period of [10,20,50])for(const threshold of formula==='momentum_breakout'?[1.2,1.5,2]:formula==='trend_pullback'?[2,3,5]:[1,1.5,2])for(const filters of bundles){
   const c={formula,period,threshold,horizon:3,filters};const m=metrics(simulate(bars,c,W,te,regimes,options.spy));base.trials++;base.experiments?.push({candidate:c,partition:'training',metrics:m});
   if(m.n>=10&&m.avg_return>trainingValue){selected=c;trainingValue=m.avg_return;}
  }
  if(selected)shortlist.push(selected);
 }
 for(const f of shortlist)for(const horizon of HORIZONS){
  const cap=capacity(n,horizon);if(cap.training<10||cap.validation<5)continue;
  const c={...f,horizon},t=metrics(simulate(bars,c,W,te,regimes,options.spy)),v=metrics(simulate(bars,c,te,ve,regimes,options.spy));base.trials++;base.experiments?.push({candidate:c,partition:'validation',metrics:v});
  if(t.n>=10&&v.n>=5&&v.avg_return>value){best=c;value=v.avg_return;}
 }
 if(!best)return {...base,status:'provisional',reason:'No candidate has sufficient completed training and validation trades.'};
 const tt=simulate(bars,best,W,te,regimes,options.spy),vt=simulate(bars,best,te,ve,regimes,options.spy);
 const frozen={...base,candidate:best,training:metrics(tt),validation:metrics(vt),training_regimes:groupRegimes(tt),validation_regimes:groupRegimes(vt)};
 if(options.holdoutAllowed===false)return {...frozen,status:'provisional',reason:'Previously exposed history cannot serve as an untouched holdout. New future test sessions required.'};
 return evaluateFrozen(frozen,bars,regimes,options.spy);
}
/** Evaluates only the persisted, already-selected candidate; safe for recovery after a recorded exposure. */
export function evaluateFrozen(frozen:Model,bars:PriceBar[],regimes:Record<string,string>,spy:number[]=[]):Model{
 const best=frozen.candidate;if(!best)return frozen;
 const W=frozen.windows.warmup??250,split=splitWindows(bars.length-W),te=W+split.trainingEnd,ve=W+split.validationEnd;
 const vt=simulate(bars,best,te,ve,regimes,spy),counts={purged:0,skipped:0};
 simulate(bars,best,W,te,regimes,spy,20,counts);simulate(bars,best,te,ve,regimes,spy,20,counts);
 const ht=simulate(bars,best,ve,bars.length,regimes,spy,20,counts),holdout=metrics(ht),groups=groupRegimes(ht);
 const carried=simulate(bars,best,ve,bars.length,regimes,spy,vt.at(-1)?.equity??20);
 const combined=[...vt,...carried];
 const combinedDD=metrics(combined).max_dd;
 return {...frozen,holdout,regimes:groups,outcomes:ht,...qualify(frozen.training,frozen.validation,holdout,groups,combinedDD),diagnostics:{combined_dd:combinedDD,...counts,interval:interval(ht),limitations:['Non-overlapping trades are not independent.','Static seed universe has selection/survivorship bias.','Validation is selection evidence, not untouched regime confirmation.','Sparse regime counts limit confidence.']}};
}
export function evaluate(model:Model,bars:PriceBar[],regime:string,spy:number[]=[]){
 const match=model.candidate?signal(bars,bars.length-1,model.candidate,spy):null;
 const q=model.holdout.n>=5?quality(model.holdout.avg_return,model.holdout.profit_factor,model.holdout.pf_kind):null;
 const strongest=Object.entries(model.regimes).filter(([r,m])=>r!=='unknown'&&m.avg_return>0).sort((a,b)=>b[1].avg_return-a[1].avg_return||a[0].localeCompare(b[0]))[0]?.[0];
 const r=model.regimes[regime],compatibility=r&&r.avg_return<=0?0:regime===strongest?100:50;
 const score=match===null||q===null?null:.5*match+.3*q+.2*compatibility;
 return {score,signal:match,quality:q,compatibility,confidence:model.holdout.n>=30?'moderate':model.holdout.n>=5?'preliminary':'insufficient',recommended:model.engine===ENGINE&&model.status==='qualified'&&(match??0)>0&&(score??0)>=65};
}
