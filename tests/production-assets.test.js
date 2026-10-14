import { test, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { PnlChart } from "../src/components/PnlChart.tsx";
import { HOME_RANGES, pnlSeries, tradingDate } from "../src/lib/pnl.ts";
import { reconstructedProfit } from "../src/lib/ledger-accounting.ts";

test.each(HOME_RANGES)("graph renders correct fixture total for $label", (range) => {
  const today = tradingDate();
  const rows = [{ exit_date: today, profit: 12.5 }];
  const total = pnlSeries(rows, range, today, range.live ? 2 : 7).at(-1).cumulative;
  const html = renderToString(
    createElement(PnlChart, {
      rows,
      initialRange: range.key,
      unrealizedToday: 2,
      unrealized: 7,
      compact: true,
    }),
  );
  expect(html).toContain(`aria-label="Profit / loss: ${range.label}, +$${total.toFixed(2)}"`);
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain("<path");
});

test("profit reconstruction uses actual live shares and paper notional separately", () => {
  expect(
    reconstructedProfit({
      mode: "live",
      dollars: 100,
      entry_price: 50,
      exit_price: 55,
      filled_qty: 2,
    }),
  ).toBe(10);
  expect(
    reconstructedProfit({
      mode: "paper",
      dollars: 100,
      entry_price: 50,
      exit_price: 45,
      filled_qty: null,
    }),
  ).toBe(-10);
  expect(() =>
    reconstructedProfit({
      mode: "live",
      dollars: 100,
      entry_price: 0,
      exit_price: 55,
      filled_qty: 2,
    }),
  ).toThrow();
});

test("icons really are PNGs with the declared dimensions", async () => {
  for (const size of [192, 512]) {
    const png = await readFile(new URL(`../public/icon-${size}.png`, import.meta.url));
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  }
  const manifest = JSON.parse(
    await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
  );
  expect(manifest.icons.every((i) => i.purpose === "any")).toBe(true);
});

test("repository production configuration explicitly selects Vercel", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const vite = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  expect(config.buildCommand).toBe("bun run build");
  expect(config.installCommand).toBe("bun install --frozen-lockfile");
  expect(vite).toContain('nitro: { preset: "vercel" }');
});

test("actual live close path preserves profits and refuses a second close (mock broker/database)", async () => {
  const program = `
    const {mock}=await import('bun:test');
    let trade={id:'fixture',ticker:'TEST',mode:'live',status:'open',position_type:'SAME_DAY',entry_price:100,dollars:100,filled_qty:1,strategy_id:null};
    let qty=1,sells=0;const ledger=[{kind:'deposit',amount:100,strategy_id:null},{kind:'deploy',amount:-100,strategy_id:null}],alerts=[];
    mock.module('./src/integrations/supabase/client.server.ts',()=>({supabaseAdmin:{from(table){let columns='',patch,rows;const q={select(c){columns=c;return q},eq(){return q},update(p){patch=p;return q},insert(r){rows=r;return q},async single(){return {data:table==='app_settings'?{profit_keep_pct:0.5,settlement_days:1}:structuredClone(trade),error:null}},then(resolve,reject){if(patch)Object.assign(trade,patch);if(rows)ledger.push(...(Array.isArray(rows)?rows:[rows]));return Promise.resolve({data:columns==='filled_qty, dollars, entry_price'?[]:null,error:null}).then(resolve,reject)}};return q}}}));
    mock.module('./src/lib/broker.server.ts',()=>({positionQty:async()=>qty,sellQty:async()=>{sells++;qty=0;return {filled_price:120,filled_qty:1,status:'filled',order_id:'fixture-sale'}}}));
    mock.module('./src/lib/execution-alerts.server.ts',()=>({executionAlert:async a=>alerts.push(a)}));
    const {closeTrade}=await import('./src/lib/scan.server.ts');
    const result=await closeTrade({id:'fixture',exit_price:120});
    let secondBlocked=false;try{await closeTrade({id:'fixture',exit_price:120})}catch{secondBlocked=true}
    console.log(JSON.stringify({result,trade,sells,secondBlocked,ledger,alerts}));
  `;
  const child = Bun.spawn(["bun", "--eval", program], { stdout: "pipe", stderr: "pipe" });
  const text = await new Response(child.stdout).text();
  const error = await new Response(child.stderr).text();
  expect(await child.exited).toBe(0);
  expect(error).toBe("");
  const result = JSON.parse(text);
  expect(result.result).toMatchObject({ closed: true, profit: 20, kept: 10 });
  expect(result.trade.status).toBe("closed");
  expect(result.sells).toBe(1);
  expect(result.secondBlocked).toBe(true);
  expect(result.ledger.filter((r) => r.kind === "settle").map((r) => r.amount)).toEqual([110]);
  expect(result.ledger.filter((r) => r.kind === "reserve").map((r) => r.amount)).toEqual([10]);
  expect(result.alerts).toHaveLength(1);
});
