import { ATR, EMA, MACD, BollingerBands } from 'technicalindicators';

export interface IndicatorBar { close: number; high: number; low: number; volume: number }
export type FeatureFilter = 'macd' | 'atr' | 'bollinger' | 'ema' | 'relative_strength' | 'volume' | 'support_resistance';
export const FILTERS: FeatureFilter[] = ['macd','atr','bollinger','ema','relative_strength','volume','support_resistance'];
export const mean = (xs: number[]) => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0;
const last = <T,>(xs: T[]): T | undefined => xs.at(-1);
const cache=new WeakMap<IndicatorBar[],Map<string,ReturnType<typeof computeFeatures>>>();

export function features(bars:IndicatorBar[],i:number,period:number,spy:number[]=[]){
 let values=cache.get(bars);if(!values){values=new Map();cache.set(bars,values);}
 const key=`${i}/${period}/${spy[i]??0}/${spy[i-period]??0}`;
 if(values.has(key))return values.get(key)??null;
 const value=computeFeatures(bars,i,period,spy);values.set(key,value);return value;
}

/** Uses only the prefix through i; prior range statistics exclude the signal bar. */
function computeFeatures(bars: IndicatorBar[], i: number, period: number, spy: number[] = []) {
  const b=bars[i];
  if (!b || i<Math.max(130,period*5)) return null;
  const prefix=bars.slice(0,i+1), closes=prefix.map(x=>x.close), prior=prefix.slice(-period-1,-1);
  const fast=last(EMA.calculate({period,values:closes}));
  const slow=last(EMA.calculate({period:50,values:closes}));
  const atr=last(ATR.calculate({period:14,high:prefix.slice(0,-1).map(x=>x.high),low:prefix.slice(0,-1).map(x=>x.low),close:closes.slice(0,-1)}));
  const macd=last(MACD.calculate({values:closes,fastPeriod:12,slowPeriod:26,signalPeriod:9,SimpleMAOscillator:false,SimpleMASignal:false}));
  const bb=last(BollingerBands.calculate({period,stdDev:2,values:closes}));
  const m=mean(prior.map(x=>x.close)), sigma=Math.sqrt(mean(prior.map(x=>(x.close-m)**2)));
  const tickerPast=bars[i-period]?.close, spyNow=spy[i], spyPast=spy[i-period];
  return { fast,slow,atr,macd:macd?.histogram,bb,m,sigma,
    resistance:Math.max(...prior.map(x=>x.high)),support:Math.min(...prior.map(x=>x.low)),
    volume:mean(prior.map(x=>x.volume)),
    relativeStrength:tickerPast && spyNow && spyPast ? b.close/tickerPast-spyNow/spyPast : null };
}

export function passesFeature(filter: FeatureFilter, b: IndicatorBar, f: NonNullable<ReturnType<typeof features>>, reversion: boolean): boolean | null {
  switch(filter){
    case 'macd': return f.macd===undefined ? null : reversion ? f.macd<0 : f.macd>=0;
    case 'atr': return f.atr===undefined ? null : f.atr>0 && f.atr/b.close<=0.08;
    case 'bollinger': return !f.bb ? null : reversion ? b.close<=f.bb.lower : b.close>=f.bb.middle;
    case 'ema': return f.fast===undefined || f.slow===undefined ? null : reversion ? b.close<f.fast : f.fast>f.slow;
    case 'relative_strength': return f.relativeStrength===null ? null : reversion ? f.relativeStrength<=0 : f.relativeStrength>=0;
    case 'volume': return f.volume<=0 ? null : b.volume>=f.volume;
    case 'support_resistance': return reversion ? b.close<=f.support*1.02 : b.close>=f.resistance*0.98;
  }
}