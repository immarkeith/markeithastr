// Independent database export. Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun scripts/backup-database.ts
// Streams every public table in 5,000-row pages to backups/<timestamp>/<table>.json plus a manifest with row counts.
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const db = createClient(url, key, { auth: { persistSession: false } });

const TABLES = (process.env.BACKUP_TABLES ?? "").split(",").filter(Boolean);
const PAGE = 5000;

async function listTables(): Promise<string[]> {
  if (TABLES.length) return TABLES;
  const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key!, Authorization: `Bearer ${key}` } });
  const spec = (await res.json()) as { definitions?: Record<string, unknown> };
  return Object.keys(spec.definitions ?? {}).sort();
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = `backups/${stamp}`;
mkdirSync(dir, { recursive: true });
const manifest: Record<string, number> = {};

for (const table of await listTables()) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select("*").range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  const { count } = await db.from(table).select("*", { count: "exact", head: true });
  if (count !== null && count !== rows.length) throw new Error(`${table}: exported ${rows.length} of ${count} rows`);
  writeFileSync(`${dir}/${table}.json`, JSON.stringify(rows));
  manifest[table] = rows.length;
  console.log(`${table}: ${rows.length}`);
}
writeFileSync(`${dir}/manifest.json`, JSON.stringify({ created_at: new Date().toISOString(), tables: manifest }, null, 2));
console.log(`Backup complete: ${dir}`);
