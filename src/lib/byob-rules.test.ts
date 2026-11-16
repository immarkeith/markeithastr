import {describe,test,expect} from 'bun:test';
import {splitWindows,netReturn,qualify,metrics,simulate,discover,evaluate,HORIZONS,type PriceBar,type Candidate} from './byob-rules';
const bars:PriceBar[]=Array.from({length:500},(_,i)=>({date:new Date(Date.UTC(2024,0,i+1)).toISOString().slice(0,10),open:100+i*.2,high:101+i*.2,low:98+i*.2,close:100+i*.2,volume:1000}));
const c:Candidate={formula:'mean_reversion',period:10,threshold:.01,horizon:3};
describe('BYOB isolation and evidence rules',()=>{
 test('60/20/20 chronological boundaries',()=>expect(splitWindows(251)).toEqual({trainingEnd:150,validationEnd:200,end:251}));
 test('0.10% round trip uses 0.05% on each side',()=>expect(netReturn(100,100)).toBeCloseTo(-.0999500249875,10));
 test('all 11 approved horizons',()=>expect(HORIZONS).toEqual([1,2,3,5,7,10,13,20,30,60,90]));
 test('250 complete bars minimum',()=>expect(discover(bars.slice(0,249),{}).status).toBe('insufficient_data'));
 const m={...metrics([]),n:10,avg_return:1};
 test('10 training trades required',()=>expect(qualify({...m,n:9},m,m,{a:m,b:m}).status).toBe('provisional'));
 test('5 validation trades required',()=>expect(qualify(m,{...m,n:4},m,{a:m,b:m}).status).toBe('provisional'));
 test('5 untouched holdout trades required',()=>expect(qualify(m,m,{...m,n:4},{a:m,b:m}).status).toBe('provisional'));
 test('two positive known regimes required',()=>expect(qualify(m,m,m,{a:m,unknown:m}).status).toBe('provisional'));
 test('negative regime prevents qualification',()=>expect(qualify(m,m,m,{a:m,b:{...m,avg_return:-1}}).status).toBe('disqualified'));
 test('two positive regimes qualify sufficient evidence',()=>expect(qualify(m,m,m,{a:m,b:m}).status).toBe('qualified'));
 test('holdout failure disqualifies',()=>expect(qualify(m,m,{...m,avg_return:0},{a:m,b:m}).status).toBe('disqualified'));
 test('high signal cannot qualify a provisional model',()=>expect(evaluate({...discover(bars,{}),status:'provisional',candidate:c},bars,'a').recommended).toBe(false));
 test('non-overlap and split purge',()=>{
   const falling=bars.map((b,i)=>({...b,open:600-i,close:599-i,high:601-i,low:598-i}));
   const trades=simulate(falling,c,100,200,{});expect(trades.length).toBeGreaterThan(0);
   for(let i=1;i<trades.length;i++) expect(trades[i]?.entry_date > (trades[i-1]?.exit_date??'')).toBe(true);
   expect(trades.every(t=>t.exit_date<(falling[200]?.date??''))).toBe(true);
 });
 test('holdout changes never affect frozen candidate',()=>{
   const falling=bars.map((b,i)=>({...b,open:600-i,close:599-i,high:601-i,low:598-i}));
   const changed=falling.map((b,i)=>i>=400?{...b,close:b.close*1.1}:b);
   const a=discover(falling,{}),b=discover(changed,{});
   expect(a.candidate).not.toBeNull();expect(b.candidate).toEqual(a.candidate);expect(b.validation).toEqual(a.validation);
 });
});