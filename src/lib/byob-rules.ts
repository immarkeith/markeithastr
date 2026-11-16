/** BYOB research only: no broker dependencies or shared cash writes. */
export const BYOB_SEEDS = ['NVDA','AMD','MU','DELL','LRCX','SHOP','AVGO','ASML','ANET','KLAC','STX','LITE','FTNT','MRVL','AMAT'];
export const HORIZONS = [1,2,3,5,7,10,13,20,30,60,90];
export type Formula = 'momentum_breakout' | 'trend_pullback' | 'mean_reversion';
export interface PriceBar { date: string; open: number; high: number; low: number; close: number; volume: number }
export interface Candidate { formula: Formula; period: number; threshold: number; horizon: number }
export interface Outcome { signal_date: string; entry_date: string; exit_date: string; gross: number; net: number; regime: string; equity: number }
export interface Metrics { n: number; win_rate: number; avg_return: number; gross_return: number; profit_factor: number | null; max_dd: number; start_date: string | null; end_date: string | null }
export interface Model {
  candidate: Candidate | null; status: 'insufficient_data' | 'provisional' | 'qualified' | 'disqualified'; reason: string;
  training: Metrics; validation: Metrics; holdout: Metrics; regimes: Record<string, Metrics>; outcomes: Outcome[];
  windows: { training_end: string | null; validation_end: string | null; holdout_start: string | null; data_to: string | null; bars: number };
  trials: number;
}
export function splitWindows(n: number) { return { trainingEnd: Math.floor(n * .6), validationEnd: Math.floor(n * .8), end: n }; }
export function netReturn(entry: number, exit: number) { return (exit * .9995 / (entry * 1.0005) - 1) * 100; }
const average = (xs: number[]) => xs.length ? xs.reduce((a,b) => a+b,0)/xs.length : 0;
export function signal(bars: PriceBar[], i: number, c: Candidate): number {
  const b = bars[i];
  if (!b || i < Math.max(50,c.period)) return 0;
  const prior = bars.slice(i-c.period,i);
  const ma = average(prior.map(x=>x.close));
  const slow = average(bars.slice(i-50,i).map(x=>x.close));
  const volume = average(prior.map(x=>x.volume));
  const change = (b.close/ma-1)*100;
  if (c.formula === 'momentum_breakout') return b.close > Math.max(...prior.map(x=>x.high)) && b.volume >= volume*c.threshold ? 100 : 0;
  if (c.formula === 'trend_pullback') return ma > slow && change <= 0 && change >= -c.threshold ? Math.min(100,70+30*(1+change/c.threshold)) : 0;
  return change <= -c.threshold ? Math.min(100,70+30*(-change/c.threshold-1)) : 0;
}
export function simulate(bars: PriceBar[], c: Candidate, start: number, end: number, regimes: Record<string,string>): Outcome[] {
  const trades: Outcome[] = []; let equity = 20;
  for (let i=Math.max(start,50); i+1+c.horizon<end; i++) {
    if (!signal(bars,i,c)) continue;
    const entry=bars[i+1], exit=bars[i+1+c.horizon], s=bars[i];
    if (!entry || !exit || !s) continue;
    const net=netReturn(entry.open,exit.close); equity*=1+net/100;
    trades.push({signal_date:s.date, entry_date:entry.date,exit_date:exit.date,gross:(exit.close/entry.open-1)*100,net,regime:regimes[s.date]??'unknown',equity});
    // Exit is at close; next entry cannot precede T+1 open. Signals do not overlap.
    i+=1+c.horizon;
  }
  return trades;
}
export function metrics(trades: Outcome[]): Metrics {
  const gains=trades.reduce((s,t)=>s+Math.max(0,t.net),0), losses=trades.reduce((s,t)=>s+Math.max(0,-t.net),0);
  let level=20,peak=20,dd=0;
  for(const t of trades){level*=1+t.net/100;peak=Math.max(peak,level);dd=Math.max(dd,(peak-level)/peak*100);}
  return {n:trades.length,win_rate:trades.length?trades.filter(t=>t.net>0).length/trades.length*100:0,avg_return:average(trades.map(t=>t.net)),gross_return:average(trades.map(t=>t.gross)),profit_factor:losses?gains/losses:null,max_dd:dd,start_date:trades[0]?.signal_date??null,end_date:trades.at(-1)?.exit_date??null};
}
export function qualify(training: Metrics, validation: Metrics, holdout: Metrics, regimes: Record<string,Metrics>): Pick<Model,'status'|'reason'> {
  if(training.n<10 || validation.n<5 || holdout.n<5 || training.n+validation.n+holdout.n<20) return {status:'provisional',reason:'Needs 10 training, 5 validation and 5 holdout trades (20 total).'};
  if(validation.avg_return<=0 || holdout.avg_return<=0) return {status:'disqualified',reason:'Non-positive net expectancy outside training.'};
  const known=Object.entries(regimes).filter(([name])=>name!=='unknown');
  if(known.some(([,m])=>m.avg_return<=0)) return {status:'disqualified',reason:'Non-positive expectancy in an observed out-of-sample regime.'};
  if(known.filter(([,m])=>m.avg_return>0).length<2) return {status:'provisional',reason:'Needs positive out-of-sample expectancy in two distinct known regimes.'};
  return {status:'qualified',reason:'Passed sample, cost and two-regime checks; not a guarantee of future returns.'};
}
export function discover(bars: PriceBar[], regimes: Record<string,string>): Model {
  const w=splitWindows(bars.length), empty=metrics([]);
  const base: Model={candidate:null,status:'insufficient_data',reason:'At least 250 complete stored sessions required.',training:empty,validation:empty,holdout:empty,regimes:{},outcomes:[],windows:{training_end:bars[w.trainingEnd-1]?.date??null,validation_end:bars[w.validationEnd-1]?.date??null,holdout_start:bars[w.validationEnd]?.date??null,data_to:bars.at(-1)?.date??null,bars:bars.length},trials:0};
  if(bars.length<250) return base;
  // Parameter selection uses training only. One parameter pair per archetype.
  const finalists: Candidate[]=[];
  for(const formula of ['momentum_breakout','trend_pullback','mean_reversion'] as Formula[]){
    let best: Candidate|undefined, bestValue=-Infinity;
    for(const period of [10,20,50]) for(const threshold of formula==='momentum_breakout'?[1.2,1.5,2]:[2,3,5]){
      const c={formula,period,threshold,horizon:3};
      const m=metrics(simulate(bars.slice(0,w.trainingEnd),c,0,w.trainingEnd,regimes));base.trials++;
      if(m.n>=10 && m.avg_return>bestValue){best=c;bestValue=m.avg_return;}
    }
    if(best) finalists.push(best);
  }
  let selected: Candidate|undefined, value=-Infinity;
  for(const f of finalists) for(const horizon of HORIZONS){
    const c={...f,horizon};
    const t=metrics(simulate(bars.slice(0,w.trainingEnd),c,0,w.trainingEnd,regimes));
    const v=metrics(simulate(bars.slice(0,w.validationEnd),c,w.trainingEnd,w.validationEnd,regimes));base.trials++;
    if(t.n>=10 && v.n>=5 && v.avg_return>value){selected=c;value=v.avg_return;}
  }
  if(!selected) return {...base,status:'provisional',reason:'No candidate has sufficient training and validation trades; holdout not evaluated.'};
  // Freeze selection BEFORE the only holdout evaluation. Failure never selects a runner-up.
  const training=metrics(simulate(bars,selected,0,w.trainingEnd,regimes));
  const validationTrades=simulate(bars,selected,w.trainingEnd,w.validationEnd,regimes);
  const holdoutTrades=simulate(bars,selected,w.validationEnd,w.end,regimes);
  const validation=metrics(validationTrades),holdout=metrics(holdoutTrades);
  const groups: Record<string,Outcome[]>={};for(const t of [...validationTrades,...holdoutTrades]) (groups[t.regime]??=[]).push(t);
  const breakdown=Object.fromEntries(Object.entries(groups).map(([r,ts])=>[r,metrics(ts)]));
  return {...base,candidate:selected,training,validation,holdout,regimes:breakdown,outcomes:holdoutTrades,...qualify(training,validation,holdout,breakdown)};
}
export function evaluate(model: Model, bars: PriceBar[], regime: string) {
  const match=model.candidate?signal(bars,bars.length-1,model.candidate):0;
  const e=model.holdout.avg_return,pf=model.holdout.profit_factor;
  const quality=e>=3&&(pf===null||pf>=2)?100:e>=1.5?75:e>=.5?50:e>0?25:0;
  const strongest=Object.entries(model.regimes).filter(([r])=>r!=='unknown').sort((a,b)=>b[1].avg_return-a[1].avg_return)[0]?.[0];
  const compatibility=(model.regimes[regime]?.avg_return??0)<0?0:regime===strongest?100:50;
  const score=model.candidate?Math.round(.5*match+.3*quality+.2*compatibility):null;
  return {score,signal:match,quality,compatibility,confidence:model.holdout.n>=30?'moderate':model.holdout.n>=5?'preliminary':'insufficient',recommended:model.status==='qualified'&&match>0&&(score??0)>=65};
}