<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Operational bar coverage uses a date-bounded RPC with one transient retry; preserve the full-history RPC for historical consumers.
- Cache ingestion upserts returned bars rather than deleting a session, so a partial provider response cannot erase stored history.
- Secondary daily prices are research-only exact-session marks, never broker execution prices or scanner volume inputs; do not mix provider conventions in the shared cache.
- Missing research marks stay pending without P&L or settlement; code recovery never deletes historical data.
