import { describe, expect, test } from "bun:test";
import { checkBridgeRequest } from "./bridge-rules";

describe("engineer bridge allowlist", () => {
  test("runner may claim a task", () => {
    expect(checkBridgeRequest({ op: "rpc", fn: "claim_next_engineer_task" })).toBeNull();
  });
  test("runner cannot call any other database function", () => {
    expect(checkBridgeRequest({ op: "rpc", fn: "exec_sql" })).not.toBeNull();
  });
  test("runner cannot read trades", () => {
    expect(checkBridgeRequest({ op: "select", table: "trades" })).not.toBeNull();
  });
  test("runner cannot write anywhere but the log", () => {
    expect(checkBridgeRequest({ op: "insert", table: "trades", values: {} })).not.toBeNull();
  });
  test("runner cannot mark a task merged", () => {
    expect(
      checkBridgeRequest({ op: "update", table: "engineer_tasks", values: { status: "merged" }, filters: [["id", "eq", "x"]] }),
    ).not.toBeNull();
  });
  test("runner cannot approve its own work", () => {
    expect(
      checkBridgeRequest({ op: "update", table: "engineer_tasks", values: { approved_at: "now" }, filters: [["id", "eq", "x"]] }),
    ).not.toBeNull();
  });
  test("updates must target exactly one task", () => {
    expect(
      checkBridgeRequest({ op: "update", table: "engineer_tasks", values: { status: "failed" }, filters: [] }),
    ).not.toBeNull();
  });
  test("runner may record review_ready on one task", () => {
    expect(
      checkBridgeRequest({ op: "update", table: "engineer_tasks", values: { status: "review_ready" }, filters: [["id", "eq", "x"]] }),
    ).toBeNull();
  });
});
