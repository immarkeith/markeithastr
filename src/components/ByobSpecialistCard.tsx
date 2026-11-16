import {useQuery,useMutation} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {FlaskConical,RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {getByobModel,trainByobModel} from '@/lib/byob.functions';
import type {Metrics} from '@/lib/byob-rules';

export function ByobSpecialistCard({ticker}:{ticker:string}) {
  const get=useServerFn(getByobModel),train=useServerFn(trainByobModel);
  const query=useQuery({queryKey:['byob',ticker],queryFn:()=>get({data:{ticker}})});
  const research=useMutation({mutationFn:()=>train({data:{ticker}}),onSuccess:()=>query.refetch()});
  const model=query.data?.model,e=query.data?.evaluation;
  return <section className="space-y-4 border-t border-border pt-6" aria-label="BYOB research">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><FlaskConical className="size-5 text-primary"/><h2 className="text-lg font-semibold">BYOB · {ticker}</h2><Badge variant="secondary">Paper only</Badge></div>
      <Button variant="outline" size="sm" onClick={()=>research.mutate()} disabled={research.isPending||query.isPending}><RefreshCw className={`size-4 ${research.isPending?'animate-spin':''}`}/>{research.isPending?'Researching…':model?'Update research':'Start research'}</Button>
    </div>
    {query.isPending?<p className="text-sm text-muted-foreground">Loading research…</p>:query.error?<p role="alert" className="text-sm text-destructive">{query.error.message}</p>:!model?<p className="text-sm text-muted-foreground">Not researched yet.</p>:<>
      <div className="flex flex-wrap gap-2"><Badge variant={model.status==='qualified'?'default':'secondary'}>{model.status.replaceAll('_',' ')}</Badge><Badge variant="outline">Version {model.version}</Badge>{model.candidate?<Badge variant="outline">{model.candidate.horizon} trading days</Badge>:null}</div>
      <p className="text-sm">{model.reason}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {[["Setup score",e?.score??'—'],['Signal match',e?.signal??'—'],['Model quality',e?.quality??'—'],['Historical confidence',e?.confidence??'insufficient']].map(([label,value])=><div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold capitalize tabular-nums">{value}</p></div>)}
      </div>
      <p className="text-sm text-muted-foreground">{model.candidate?.formula.replaceAll('_',' ')??'No selected formula'} · {model.windows.bars} stored sessions · as of {e?.as_of??'unavailable'}</p>
      <p className={e?.recommended?'text-sm text-success':'text-sm text-muted-foreground'}>{e?.recommended?'Qualified paper setup':'No qualified paper setup'}</p>
      <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">BYOB chronological evidence</caption><thead><tr className="text-xs text-muted-foreground"><th className="py-2 text-left">Window</th><th className="text-right">Trades</th><th className="text-right">Win %</th><th className="text-right">Net / trade</th></tr></thead><tbody>{(['training','validation','holdout'] as const).map(key=>{const m:Metrics=model[key];return <tr key={key} className="border-t border-border"><td className="py-2 capitalize">{key}</td><td className="text-right tabular-nums">{m.n}</td><td className="text-right tabular-nums">{m.n?m.win_rate.toFixed(1):'—'}</td><td className="text-right tabular-nums">{m.n?`${m.avg_return.toFixed(2)}%`:'—'}</td></tr>})}</tbody></table></div>
      <p className="text-xs text-muted-foreground">60/20/20 chronological split · 0.10% round-trip friction · $20 isolated simulation</p>
      {model.outcomes.length?<details className="border-t border-border pt-3"><summary className="cursor-pointer text-sm font-medium">Saved holdout results · {model.outcomes.length}</summary><div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-xs"><thead><tr><th className="text-left">Exit session</th><th className="text-right">Net %</th><th className="text-right">Paper equity</th></tr></thead><tbody>{model.outcomes.map(t=><tr key={t.entry_date} className="border-t border-border"><td className="py-2">{t.exit_date}</td><td className="text-right">{t.net.toFixed(2)}</td><td className="text-right">${t.equity.toFixed(2)}</td></tr>)}</tbody></table></div></details>:null}
      <details className="border-t border-border pt-3"><summary className="cursor-pointer text-sm font-medium">Model history & regimes</summary><div className="mt-3 space-y-2 text-xs text-muted-foreground">{Object.entries(model.regimes).map(([r,m])=><p key={r}>{r} · {m.n} trades · {m.avg_return.toFixed(2)}% net</p>)}{query.data?.versions.map(v=><p key={v.version}>v{v.version} · {v.status} · {v.created_at.slice(0,10)} · {v.reason}</p>)}</div></details>
    </>}
    {research.error?<p role="alert" className="text-sm text-destructive">{research.error.message}</p>:null}
  </section>;
}