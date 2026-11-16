import { describe, expect, test } from "bun:test";
import { scanFirewall } from "./firewall";

const blocked = (path: string, patch = "+// change") =>
  !scanFirewall({ files: [{ path, patch }] } as never).passed;

describe("engineer safety drills", () => {
  test("cannot edit the live broker", () => expect(blocked("src/lib/broker.server.ts")).toBe(true));
  test("cannot edit GitHub workflows", () => expect(blocked(".github/workflows/astr-engineer.yml")).toBe(true));
  test("cannot edit its own guardrails", () => expect(blocked("src/lib/engineer/firewall.ts")).toBe(true));
  test("cannot touch secrets files", () => expect(blocked(".env")).toBe(true));
  test("cannot ship destructive SQL", () =>
    expect(blocked("supabase/migrations/x.sql", "+DROP TABLE trades;")).toBe(true));
  test("ordinary docs edit passes", () => expect(blocked("docs/notes.md", "+hello")).toBe(false));
});
