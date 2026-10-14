import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { reconcileBooks, saleCash, isLiveTrade } from "../src/lib/ledger-accounting.ts";
import { HOME_RANGES, pnlSeries, pnlWindow, tradingDate, positionDayPnl } from "../src/lib/pnl.ts";
import { GRAPH_REFRESH_MS, graphRefreshPolicy } from "../src/lib/refresh-policy.ts";
import { shouldNotify } from "../src/lib/notification-policy.ts";
import { readAllPages } from "../src/lib/db-pages.server.ts";
import { reliableBar, RELIABLE_HISTORY_START } from "../src/lib/history-quality.ts";

const entry = (kind, amount, strategy_id = null) => ({ kind, amount, strategy_id });
const trade = (overrides = {}) => ({
  strategy_id: null,
  mode: "live",
  status: "closed",
  dollars: 100,
  profit: 20,
  ...overrides,
});
const book = (entries, trades = []) => reconcileBooks(entries, trades)[0];

describe("ledger conservation", () => {
  test("signed withdrawals reduce capital once", () => {
    const result = book([entry("deposit", 100), entry("withdrawal", -25)]);
    expect(result.expected).toBe(75);
    expect(result.difference).toBe(0);
  });
  test("unassigned paper profits never enter live P&L", () => {
    expect(book([entry("deposit", 100)], [trade({ mode: "paper", profit: 999 })]).expected).toBe(
      100,
    );
    expect(isLiveTrade(trade({ mode: "paper" }))).toBe(false);
  });
  test("paper books reconcile independently from live", () => {
    const results = reconcileBooks(
      [
        entry("deposit", 100),
        entry("deposit", 50, "research"),
        entry("deploy", -50, "research"),
        entry("settle", 55, "research"),
      ],
      [trade({ strategy_id: "research", mode: "paper", dollars: 50, profit: 5 })],
    );
    expect(results.map((r) => r.difference)).toEqual([0, 0]);
    expect(results.find((r) => r.key === "live").realized).toBe(0);
  });
  test("open invested principal is still equity", () => {
    const result = book(
      [entry("deposit", 100), entry("deploy", -100)],
      [trade({ status: "open", profit: null })],
    );
    expect(result.cash).toBe(0);
    expect(result.openCost).toBe(100);
    expect(result.difference).toBe(0);
  });
  test("retained and unretained profits both conserve proceeds", () => {
    const cash = saleCash(100, 20, 10);
    expect(cash).toEqual({ settle: 110, reserve: 10 });
    expect(
      book(
        [
          entry("deposit", 100),
          entry("deploy", -100),
          entry("settle", cash.settle),
          entry("reserve", cash.reserve),
        ],
        [trade()],
      ).difference,
    ).toBe(0);
  });
  test.each([0, 0.5, 1])("profit retention %s does not lose money", (ratio) => {
    const cash = saleCash(100, 20, 20 * ratio);
    expect(cash.settle + cash.reserve).toBe(120);
  });
  test("loss reduces principal and never creates a reserve", () => {
    const cash = saleCash(100, -15, -15);
    expect(cash).toEqual({ settle: 85, reserve: 0 });
    expect(
      book(
        [entry("deposit", 100), entry("deploy", -100), entry("settle", 85)],
        [trade({ profit: -15 })],
      ).difference,
    ).toBe(0);
  });
  test("cancelled stake is returned, not new starting capital", () => {
    expect(
      book(
        [entry("deposit", 100), entry("deploy", -100), entry("cancel", 100)],
        [trade({ status: "cancelled", profit: 0 })],
      ).difference,
    ).toBe(0);
  });
  test("release of paper reserves is an internal transfer", () => {
    expect(
      book(
        [
          entry("deposit", 100),
          entry("deploy", -100),
          entry("settle", 110),
          entry("reserve", 10),
          entry("settle", 10),
          entry("reserve", -10),
        ],
        [trade()],
      ).difference,
    ).toBe(0);
  });
  test("historical research with no ledger is excluded from conservation", () => {
    expect(
      book(
        [entry("deposit", 100)],
        [
          trade({
            mode: "paper",
            strategy_id: "lab",
            status_note: "historical rebuild",
            profit: 5000,
          }),
        ],
      ).expected,
    ).toBe(100);
  });
  test("missing/duplicate settlement is detected, not repaired by fabricated cash", () => {
    expect(book([entry("deposit", 100), entry("deploy", -100)], [trade()]).difference).toBe(-120);
    expect(
      book(
        [entry("deposit", 100), entry("deploy", -100), entry("settle", 120), entry("settle", 120)],
        [trade()],
      ).difference,
    ).toBe(120);
  });
  test("rounding is integer-cent based", () => {
    expect(book([entry("deposit", 0.1), entry("deposit", 0.2)]).expected).toBe(0.3);
    expect(() => book([entry("deposit", NaN)])).toThrow();
  });
});

describe("graph windows and accumulation", () => {
  const today = "2026-10-14";
  const rows = [
    { exit_date: "2026-10-07", profit: 500 },
    { exit_date: "2026-10-12", profit: 10 },
    { exit_date: "2026-10-13", profit: -3 },
    { exit_date: today, profit: 4 },
    { exit_date: "2026-10-15", profit: 999 },
  ];
  const range = (key) => HOME_RANGES.find((r) => r.key === key);
  test("Today contains today's realized and daily open move only", () => {
    expect(pnlSeries(rows, range("live"), today, 2).at(-1).cumulative).toBe(6);
  });
  test("rolling week accumulates on Monday, Tuesday and Wednesday", () => {
    const series = pnlSeries(rows, range("week"), today, 2);
    expect(series.find((p) => p.day === "2026-10-12").cumulative).toBe(10);
    expect(series.find((p) => p.day === "2026-10-13").cumulative).toBe(7);
    expect(series.at(-1).cumulative).toBe(13);
  });
  test("long-range weekly aggregation includes the unfinished week immediately", () => {
    const series = pnlSeries(rows.slice(1), range("years5"), today, 2);
    expect(series.at(-1)).toEqual({ day: today, daily: 13, cumulative: 13 });
    expect(series.every((p) => p.day <= today)).toBe(true);
  });
  test("month and longer windows include earlier activity but exclude future dates", () => {
    for (const key of ["month", "months3", "ytd", "year", "years5", "all"])
      expect(pnlSeries(rows, range(key), today, 2).at(-1).cumulative).toBe(513);
  });
  test("yesterday excludes the live mark", () => {
    expect(
      pnlSeries(
        rows,
        { key: "yesterday", label: "Yesterday", days: 1, endYesterday: true },
        today,
        500,
      ).at(-1).cumulative,
    ).toBe(-3);
  });
  test("calendar periods are deterministic", () => {
    expect(pnlWindow({ key: "w", label: "Week", days: 7, calendar: "week" }, today).from).toBe(
      "2026-10-11",
    );
    expect(pnlWindow({ key: "m", label: "Month", days: 31, calendar: "month" }, today).from).toBe(
      "2026-10-01",
    );
    expect(
      pnlWindow({ key: "m3", label: "3M", days: 92, calendar: "months3" }, "2026-01-05").from,
    ).toBe("2025-11-01");
  });
  test("New York trading date survives UTC midnight", () => {
    expect(tradingDate(new Date("2026-10-14T01:00:00Z"))).toBe("2026-10-13");
    expect(tradingDate(new Date("2026-10-14T05:00:00Z"))).toBe(today);
  });
  test("overnight daily P&L is shares times price change", () => {
    expect(positionDayPnl(2, 120, 110)).toBe(20);
  });
  test("repeated refreshes are deterministic and never mutate trade inputs", () => {
    const before = JSON.stringify(rows);
    const first = pnlSeries(rows, range("week"), today, 2);
    for (let i = 0; i < 5; i++) expect(pnlSeries(rows, range("week"), today, 2)).toEqual(first);
    expect(JSON.stringify(rows)).toBe(before);
  });
});

describe("refresh and reads", () => {
  test("both graph queries consume the same five-minute, read-only policy", async () => {
    expect(GRAPH_REFRESH_MS).toBe(300000);
    expect(graphRefreshPolicy.refetchIntervalInBackground).toBe(true);
    const home = await readFile(new URL("../src/lib/queries.ts", import.meta.url), "utf8");
    const lab = await readFile(new URL("../src/routes/lab.tsx", import.meta.url), "utf8");
    expect(home.slice(home.indexOf("export const dashboardQuery"))).toContain(
      "...graphRefreshPolicy",
    );
    expect(lab).toContain("queryFn: () => fetchRace(), ...graphRefreshPolicy");
    // The refresh calls only reads, not a run/test/replay or trade function.
    expect(
      home.slice(
        home.indexOf("export const dashboardQuery"),
        home.indexOf("export const tradeHistoryQuery"),
      ),
    ).not.toContain("runRace");
  });
  test("real graph observer refreshes at five minutes without duplicate transactions", async () => {
    // A separate runtime gives QueryObserver its real browser branch and a
    // deterministic clock without mutating the app or calling providers.
    const program = `
      globalThis.window = {};
      const {QueryClient,QueryObserver,timeoutManager} = await import('@tanstack/react-query');
      const {graphRefreshPolicy} = await import('./src/lib/refresh-policy.ts');
      let now=0, nextId=1, reads=0;
      const timers=new Map();
      const add=(fn,ms,interval)=>{const id=nextId++;timers.set(id,{fn,ms,at:now+ms,interval});return id;};
      timeoutManager.setTimeoutProvider({setTimeout:(fn,ms)=>add(fn,ms,false),clearTimeout:id=>timers.delete(id),setInterval:(fn,ms)=>add(fn,ms,true),clearInterval:id=>timers.delete(id)});
      const settle=async()=>{for(let i=0;i<20;i++) await Promise.resolve();};
      const advance=async(ms)=>{const end=now+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;const [id,t]=due;now=t.at;if(t.interval)t.at+=t.ms;else timers.delete(id);t.fn();await settle();}now=end;await settle();};
      const transactions=[{id:'existing',profit:5}];
      const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
      const observer=new QueryObserver(client,{queryKey:['graph'],queryFn:async()=>{reads++;return structuredClone(transactions);},...graphRefreshPolicy});
      const unsubscribe=observer.subscribe(()=>{});
      await settle();const initial=reads;
      await advance(299999);const before=reads;
      await advance(1);const atFive=reads;
      await advance(600000);const atFifteen=reads;
      unsubscribe();client.clear();
      console.log(JSON.stringify({initial,before,atFive,atFifteen,transactions}));
    `;
    const child = Bun.spawn(["bun", "--eval", program], { stdout: "pipe", stderr: "pipe" });
    const text = await new Response(child.stdout).text();
    const error = await new Response(child.stderr).text();
    expect(await child.exited).toBe(0);
    expect(error).toBe("");
    const result = JSON.parse(text);
    expect(result.initial).toBe(1);
    expect(result.before).toBe(1);
    expect(result.atFive).toBe(2);
    expect(result.atFifteen).toBe(4);
    expect(result.transactions).toEqual([{ id: "existing", profit: 5 }]);
  });
  test("pagination reads over 1000 rows and propagates failures", async () => {
    const source = Array.from({ length: 2505 }, (_, id) => ({ id }));
    const calls = [];
    const result = await readAllPages(async (from, to) => {
      calls.push([from, to]);
      return { data: source.slice(from, to + 1), error: null };
    });
    expect(result.length).toBe(2505);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    await expect(
      readAllPages(async () => ({ data: null, error: { message: "denied" } })),
    ).rejects.toThrow("denied");
  });
});

describe("event notification policy", () => {
  test("real notification writer honors events, preferences and deduplication", async () => {
    const program = `
      const {mock}=await import('bun:test');
      const rows=[];const prefs={notify_push:false,notify_trades:true,notify_day_pick:true,notify_health:true};
      mock.module('./src/integrations/supabase/client.server.ts',()=>({supabaseAdmin:{from(table){let row;const q={select(){return q},eq(){return q},insert(value){row=value;return q},async maybeSingle(){if(table==='app_settings')return {data:prefs,error:null};if(rows.some(r=>r.dedupe_key===row.dedupe_key))return {data:null,error:{code:'23505'}};rows.push({...row,id:String(rows.length+1)});return {data:rows.at(-1),error:null}}};return q}}}));
      const {notify}=await import('./src/lib/notify.server.ts');
      const {executionAlert}=await import('./src/lib/execution-alerts.server.ts');
      const input=(kind,key,meta={})=>({kind,title:'Fixture event',body:'Fixture event',meta,dedupe_key:key});
      const outcomes=[];
      outcomes.push(await notify(input('paper-entry','paper')));
      outcomes.push(await notify(input('entry','not-filled')));
      outcomes.push(await notify(input('theme','research',{source:'research'})));
      outcomes.push(await notify(input('day-buy','pick')));
      outcomes.push(await notify(input('day-buy','pick')));
      await executionAlert({event:'entry',tradeId:'test-trade',ticker:'TEST',price:100,orderId:'test-order'});
      await executionAlert({event:'entry',tradeId:'test-trade',ticker:'TEST',price:100,orderId:'test-order'});
      await executionAlert({event:'exit',tradeId:'test-trade',ticker:'TEST',price:120,orderId:'test-sale',profit:20});
      outcomes.push(await notify(input('health','actual-error')));
      prefs.notify_day_pick=false;
      outcomes.push(await notify(input('day-buy','disabled')));
      console.log(JSON.stringify({outcomes,kinds:rows.map(r=>r.kind),executions:rows.filter(r=>r.meta.executed).length}));
    `;
    const child = Bun.spawn(["bun", "--eval", program], { stdout: "pipe", stderr: "pipe" });
    const text = await new Response(child.stdout).text();
    const error = await new Response(child.stderr).text();
    expect(await child.exited).toBe(0);
    expect(error).toBe("");
    const result = JSON.parse(text);
    expect(result.outcomes).toEqual([false, false, false, true, false, true, false]);
    expect(result.kinds).toEqual(["day-buy", "entry", "exit", "health"]);
    expect(result.executions).toBe(2);
  });
  test.each(["entry", "exit"])("%s requires confirmed live execution evidence", (kind) => {
    expect(shouldNotify({ kind })).toBe(false);
    expect(shouldNotify({ kind, meta: { mode: "live", executed: false, trade_id: "t" } })).toBe(
      false,
    );
    expect(shouldNotify({ kind, meta: { mode: "live", executed: true, trade_id: "t" } })).toBe(
      true,
    );
    expect(shouldNotify({ kind, meta: { mode: "paper", executed: true, trade_id: "t" } })).toBe(
      false,
    );
  });
  test("paper and research-only records never create event alerts", () => {
    for (const kind of ["paper-entry", "paper-exit", "research-finding"])
      expect(shouldNotify({ kind })).toBe(false);
    expect(shouldNotify({ kind: "theme", meta: { source: "research" } })).toBe(false);
    expect(shouldNotify({ kind: "trade", action: "Simulated hold" })).toBe(false);
  });
  test("qualifying recommendations and actual health events remain eligible", () => {
    expect(shouldNotify({ kind: "day-buy", action: "No trade" })).toBe(true);
    expect(shouldNotify({ kind: "swing-hold" })).toBe(true);
    expect(shouldNotify({ kind: "health" })).toBe(true);
    expect(shouldNotify({ kind: "long-term-review" })).toBe(true);
  });
});

describe("reliable history and immutable formulas", () => {
  const bar = {
    ticker: "TEST",
    bar_date: "2026-10-13",
    open: 100,
    high: 105,
    low: 95,
    close: 102,
    volume: 10000,
  };
  test("corrupt OHLC and non-finite data are rejected", () => {
    expect(reliableBar(bar)).toBe(true);
    for (const change of [{ high: 90 }, { low: 103 }, { close: NaN }, { volume: -1 }, { open: 0 }])
      expect(reliableBar({ ...bar, ...change })).toBe(false);
    expect(RELIABLE_HISTORY_START).toBe("2016-01-01");
  });
  test("historical wins are proposals, not automatic formula updates", async () => {
    const department = await readFile(
      new URL("../src/lib/department.server.ts", import.meta.url),
      "utf8",
    );
    const stability = await readFile(
      new URL("../src/lib/stability.server.ts", import.meta.url),
      "utf8",
    );
    const master = await readFile(
      new URL("../src/lib/master-formula.server.ts", import.meta.url),
      "utf8",
    );
    expect(department).not.toContain("params: nextParams as unknown as Json");
    expect(stability).not.toContain('.from("researchers")');
    expect(master).not.toContain('status = "active"');
    expect(master).not.toContain('status = "retired"');
  });
});
