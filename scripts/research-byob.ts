/** Independent-host maintenance: bun scripts/research-byob.ts [TICKER ...] */
import {BYOB_SEEDS} from '../src/lib/byob-rules';
import {prepareByob,trainByob} from '../src/lib/byob.server';
const tickers=process.argv.slice(2).length?process.argv.slice(2):BYOB_SEEDS;
for(const ticker of [...new Set([...tickers,'SPY'])]){
  try{console.log(JSON.stringify({ticker,prepared:await prepareByob(ticker)}));}
  catch{console.log(JSON.stringify({ticker,preparation:'unavailable; preserved cache'}));}
}
for(const ticker of tickers){
  try{const r=await trainByob(ticker);console.log(JSON.stringify({ticker,status:r.model?.status,reason:r.model?.reason,bars:r.model?.windows.bars,horizon:r.model?.candidate?.horizon,holdout:r.model?.holdout.n}));}
  catch(e){console.log(JSON.stringify({ticker,error:e instanceof Error?e.message:'Research unavailable'}));}
}