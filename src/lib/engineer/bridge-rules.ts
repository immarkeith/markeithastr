/**
 * Allowlist for the Engineer bridge: the only database actions the GitHub
 * runner may perform when it reports back through ASTR instead of holding a
 * database key. Pure (no I/O) so it is unit-testable.
 */
export type Filter = [column: string, op: "eq" | "gte", value: string | number | boolean];

export type BridgeRequest =
  | { op: "rpc"; fn: string; args?: Record<string, unknown> }
  | {
      op: "select";
      table: string;
      columns?: string;
      filters?: Filter[];
      order?: { column: string; ascending: boolean };
      limit?: number;
      single?: boolean;
    }
  | { op: "insert"; table: string; values: Record<string, unknown> }
  | { op: "update"; table: string; values: Record<string, unknown>; filters: Filter[] };

export const BRIDGE_RPCS = [
  "claim_next_engineer_task",
  "heartbeat_engineer_task",
  "sweep_stalled_engineer_tasks",
] as const;
export const BRIDGE_READ_TABLES = ["engineer_tasks", "engineer_settings", "audit_repair_log"];
export const BRIDGE_INSERT_TABLES = ["engineer_logs"];
export const BRIDGE_UPDATE_TABLES = ["engineer_tasks"];

/** Columns only a human approval in /engineer may set. */
export const HUMAN_ONLY_COLUMNS = [
  "approved_at",
  "approved_by",
  "migration_approved",
  "deployment_status",
  "checkpoint_id",
  "archived",
];
/** Statuses the runner may never assign — they follow human approval. */
export const HUMAN_ONLY_STATUSES = ["merged", "deploying", "deployed"];

const IDENT = /^[a-z_][a-z0-9_]*$/;

export function checkBridgeRequest(req: BridgeRequest): string | null {
  const badFilters = (filters: Filter[] | undefined) =>
    (filters ?? []).some(
      ([c, op]) => !IDENT.test(c) || (op !== "eq" && op !== "gte"),
    );
  switch (req.op) {
    case "rpc":
      return (BRIDGE_RPCS as readonly string[]).includes(req.fn) ? null : `rpc ${req.fn} not allowed`;
    case "select":
      if (!BRIDGE_READ_TABLES.includes(req.table)) return `read of ${req.table} not allowed`;
      if (badFilters(req.filters)) return "invalid filter";
      if (req.columns && !/^[a-z0-9_,\s*]+$/.test(req.columns)) return "invalid columns";
      if (req.order && !IDENT.test(req.order.column)) return "invalid order";
      return null;
    case "insert":
      return BRIDGE_INSERT_TABLES.includes(req.table) ? null : `insert into ${req.table} not allowed`;
    case "update": {
      if (!BRIDGE_UPDATE_TABLES.includes(req.table)) return `update of ${req.table} not allowed`;
      const byId = req.filters.length === 1 && req.filters[0][0] === "id" && req.filters[0][1] === "eq";
      if (!byId) return "updates must target one task by id";
      const cols = Object.keys(req.values);
      if (cols.some((c) => !IDENT.test(c))) return "invalid column";
      const blocked = cols.find((c) => HUMAN_ONLY_COLUMNS.includes(c));
      if (blocked) return `${blocked} can only be set by human approval`;
      if (HUMAN_ONLY_STATUSES.includes(String(req.values["status"] ?? "")))
        return "that status can only follow human approval";
      return null;
    }
    default:
      return "unknown op";
  }
}
