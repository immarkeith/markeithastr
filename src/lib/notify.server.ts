/**
 * Notification feed + web-push delivery. Server-only.
 */
import { buildPushPayload } from "@block65/webcrypto-web-push";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { THEMES, THEME_TICKERS } from "./themes";

export interface NewNotification {
  kind: string;
  title: string;
  body: string;
  ticker?: string | null;
  severity?: "info" | "good" | "warn" | "bad";
  action?: string | null;
  meta?: Record<string, unknown>;
  dedupe_key?: string;
}

interface SubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failures: number;
}

function vapid() {
  const publicKey = process.env['VAPID_PUBLIC_KEY'];
  const privateKey = process.env['VAPID_PRIVATE_KEY'];
  const subject = process.env['VAPID_SUBJECT'] ?? "mailto:alerts@example.com";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function pushPublicKey(): string | null {
  return process.env['VAPID_PUBLIC_KEY'] ?? null;
}

/** Send one alert to every registered device. Failures are counted, never thrown. */
export async function pushToDevices(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<{ sent: number; failed: number; devices: number }> {
  const keys = vapid();
  if (!keys) return { sent: 0, failed: 0, devices: 0 };

  const { data } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, failures");
  const subs = (data ?? []) as unknown as SubRow[];
  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      const request = await buildPushPayload(
        { data: payload, options: { ttl: 3600, urgency: "high" } },
        {
          endpoint: sub.endpoint,
          expirationTime: null,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        keys,
      );
      const res = await fetch(sub.endpoint, {
        method: request.method,
        headers: request.headers as unknown as Record<string, string>,
        body: request.body as unknown as BodyInit,
      });
      if (res.ok || res.status === 201 || res.status === 202) {
        sent += 1;
        await supabaseAdmin
          .from("push_subscriptions")
          .update({ last_sent_at: new Date().toISOString(), failures: 0 })
          .eq("id", sub.id);
      } else if (res.status === 404 || res.status === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
        failed += 1;
      } else {
        failed += 1;
        await supabaseAdmin
          .from("push_subscriptions")
          .update({ failures: Number(sub.failures) + 1 })
          .eq("id", sub.id);
      }
    } catch (error) {
      failed += 1;
      console.error("push failed:", error instanceof Error ? error.message : error);
    }
  }
  return { sent, failed, devices: subs.length };
}

/** Insert a feed item (deduped) and push it to the phone. */
export async function notify(input: NewNotification): Promise<boolean> {
  const row = {
    kind: input.kind,
    title: input.title,
    body: input.body,
    ticker: input.ticker ?? null,
    severity: input.severity ?? "info",
    action: input.action ?? null,
    meta: (input.meta ?? {}) as never,
    dedupe_key: input.dedupe_key ?? null,
  };
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .insert(row)
    .select("id")
    .maybeSingle();
  if (error) {
    // 23505 = duplicate dedupe_key: already told the user about this today.
    if (error.code === "23505") return false;
    throw new Error(error.message);
  }

  const { data: settings } = await supabaseAdmin
    .from("app_settings")
    .select("notify_push")
    .eq("id", 1)
    .maybeSingle();
  if ((settings as { notify_push?: boolean } | null)?.notify_push !== false) {
    const res = await pushToDevices({
      title: input.title,
      body: input.body,
      url: "/notifications",
      tag: input.dedupe_key ?? input.kind,
    });
    if (res.sent > 0 && data?.id) {
      await supabaseAdmin
        .from("notifications")
        .update({ pushed_at: new Date().toISOString() })
        .eq("id", data.id as string);
    }
  }
  return true;
}

export async function markAllRead() {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ------------------------------------------------------------ theme trends ----

export interface ThemeSignal {
  id: string;
  label: string;
  change5d: number;
  members: number;
  weakest: string | null;
  strongest: string | null;
}

/** 5-session average move for each theme basket, from cached bars only. */
export async function themeSignals(): Promise<ThemeSignal[]> {
  const { data, error } = await supabaseAdmin
    .from("daily_bars")
    .select("ticker, bar_date, close")
    .in("ticker", THEME_TICKERS)
    .order("bar_date", { ascending: true });
  if (error) throw new Error(error.message);

  const byTicker = new Map<string, number[]>();
  for (const row of data ?? []) {
    const list = byTicker.get(row.ticker as string) ?? [];
    list.push(Number(row.close));
    byTicker.set(row.ticker as string, list);
  }

  const perTicker = new Map<string, number>();
  for (const [ticker, closes] of byTicker) {
    if (closes.length < 6) continue;
    const last = closes[closes.length - 1]!;
    const prior = closes[closes.length - 6]!;
    if (!prior) continue;
    perTicker.set(ticker, ((last - prior) / prior) * 100);
  }

  const signals: ThemeSignal[] = [];
  for (const theme of THEMES) {
    const members = theme.tickers.filter((t) => perTicker.has(t));
    if (members.length < 2) continue;
    const changes = members.map((t) => perTicker.get(t)!);
    const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
    const sorted = [...members].sort((a, b) => perTicker.get(b)! - perTicker.get(a)!);
    signals.push({
      id: theme.id,
      label: theme.label,
      change5d: Number(avg.toFixed(2)),
      members: members.length,
      strongest: sorted[0] ?? null,
      weakest: sorted[sorted.length - 1] ?? null,
    });
  }
  signals.sort((a, b) => b.change5d - a.change5d);
  return signals;
}

function themeAlternative(id: string, signals: ThemeSignal[]): ThemeSignal | null {
  const theme = THEMES.find((t) => t.id === id);
  if (!theme) return null;
  const options = signals
    .filter((s) => theme.alternatives.includes(s.id) && s.change5d > 0)
    .sort((a, b) => b.change5d - a.change5d);
  return options[0] ?? null;
}

/**
 * Write the "what changed" items: weak/strong groups, the confirmed day-trade
 * pick, and swing (long-term hold) suggestions.
 */
export async function generateInsights(day: string): Promise<number> {
  let created = 0;
  const signals = await themeSignals();

  for (const signal of signals.filter((s) => s.change5d <= -3).slice(0, 3)) {
    const alt = themeAlternative(signal.id, signals);
    const altText = alt
      ? ` ${alt.label} is holding up (${alt.change5d > 0 ? "+" : ""}${alt.change5d}% — e.g. ${alt.strongest}), worth a look instead.`
      : "";
    const ok = await notify({
      kind: "theme-weak",
      title: `${signal.label} group is weak (${signal.change5d}% / 5d)`,
      body: `Whole basket is down, worst is ${signal.weakest}. Stay away for now.${altText}`,
      severity: "warn",
      action: alt ? `Consider ${alt.label}` : "Avoid this group",
      meta: { theme: signal.id, alternative: alt?.id ?? null },
      dedupe_key: `theme-weak:${signal.id}:${day}`,
    });
    if (ok) created += 1;
  }

  for (const signal of signals.filter((s) => s.change5d >= 3).slice(0, 2)) {
    const ok = await notify({
      kind: "theme-strong",
      title: `${signal.label} group is leading (+${signal.change5d}% / 5d)`,
      body: `Strongest name in the basket is ${signal.strongest}. Group momentum is behind it.`,
      severity: "good",
      action: `Watch ${signal.strongest}`,
      meta: { theme: signal.id },
      dedupe_key: `theme-strong:${signal.id}:${day}`,
    });
    if (ok) created += 1;
  }

  // Day-trade candidate from the newest scan.
  const { data: run } = await supabaseAdmin
    .from("scan_runs")
    .select("id, bars_as_of")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (run) {
    const { data: top } = await supabaseAdmin
      .from("scan_scores")
      .select("ticker, score, close, tradeable, invalidation")
      .eq("run_id", run.id as string)
      .eq("tradeable", true)
      .order("rank", { ascending: true })
      .limit(1);
    const pick = top?.[0];
    if (pick) {
      const ok = await notify({
        kind: "day-buy",
        title: `1-day buy candidate: ${pick.ticker} (score ${Number(pick.score).toFixed(1)})`,
        body: `Last close $${Number(pick.close).toFixed(2)}. ${pick.invalidation ?? ""}`.trim(),
        ticker: pick.ticker as string,
        severity: "good",
        action: "Confirmed at the open before any entry",
        dedupe_key: `day-buy:${pick.ticker}:${day}`,
      });
      if (ok) created += 1;
    }
  }

  // Long-term / swing hold suggestions from streak candidates.
  const { data: suggested } = await supabaseAdmin
    .from("watchlist_candidates")
    .select("ticker, streak_days, status")
    .eq("status", "suggested");
  for (const row of suggested ?? []) {
    const ok = await notify({
      kind: "swing-hold",
      title: `Longer-term hold idea: ${row.ticker}`,
      body: `Top-10 for ${row.streak_days} sessions in a row without ever being the single best pick — the classic swing setup.`,
      ticker: row.ticker as string,
      severity: "info",
      action: "Approve or dismiss on the Watchlist page",
      dedupe_key: `swing-hold:${row.ticker}:${day}`,
    });
    if (ok) created += 1;
  }

  return created;
}
