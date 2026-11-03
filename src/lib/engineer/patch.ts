/**
 * Precision patching utilities (Phase K).
 *
 * The engineer never re-streams whole files: it proposes anchored
 * search-and-replace hunks with 2–3 lines of unchanged context. Each anchor must
 * match exactly once — zero matches or an ambiguous match aborts the task with a
 * plain-language reason instead of guessing.
 *
 * Pure logic, shared by the runner and the server.
 */

export interface PatchHunk {
  /** Repository-relative path, e.g. src/routes/settings.tsx */
  path: string;
  /** Literal block that must appear exactly once in the file. */
  find: string;
  /** Replacement block. */
  replace: string;
}

export interface ApplyAnchorResult {
  ok: boolean;
  reason?: string;
  content?: string;
  matches?: number;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

/** Apply one anchored hunk to a file body with a strict single-match assertion. */
export function applyAnchor(content: string, find: string, replace: string): ApplyAnchorResult {
  if (!find.trim()) {
    return { ok: false, reason: "Empty anchor — the model returned no search block." };
  }
  const matches = countOccurrences(content, find);
  if (matches === 0) {
    return { ok: false, reason: "Anchor string not found in target file.", matches };
  }
  if (matches > 1) {
    return {
      ok: false,
      reason: `Ambiguous anchor (matched ${matches} locations). Expansion of context lines required.`,
      matches,
    };
  }
  return { ok: true, content: content.replace(find, replace), matches };
}

export interface ApplyFilesResult {
  ok: boolean;
  files: Map<string, string>;
  errors: { path: string; reason: string }[];
}

/**
 * Apply every hunk to the working copy. Hunks are applied in order so a later
 * hunk can target text inserted by an earlier one, which is what the model
 * expects when it splits a change across blocks.
 */
export function applyHunks(original: Map<string, string>, hunks: PatchHunk[]): ApplyFilesResult {
  const files = new Map(original);
  const errors: { path: string; reason: string }[] = [];

  for (const hunk of hunks) {
    const path = hunk.path.replace(/^\.\//, "");
    const current = files.get(path);
    if (current === undefined) {
      errors.push({ path, reason: "File does not exist in the repository." });
      continue;
    }
    const result = applyAnchor(current, hunk.find, hunk.replace);
    if (!result.ok || result.content === undefined) {
      errors.push({ path, reason: result.reason ?? "Anchor application failed." });
      continue;
    }
    files.set(path, result.content);
  }

  return { ok: errors.length === 0, files, errors };
}

export interface DiffStats {
  files: number;
  additions: number;
  deletions: number;
}

/** Count files/additions/deletions in a unified diff. */
export function diffStats(diff: string): DiffStats {
  let files = 0;
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) files += 1;
    else if (line.startsWith("+") && !line.startsWith("+++")) additions += 1;
    else if (line.startsWith("-") && !line.startsWith("---")) deletions += 1;
  }
  return { files, additions, deletions };
}

/** Repository-relative paths touched by a unified diff. */
export function filesFromDiff(diff: string): string[] {
  const paths = new Set<string>();
  for (const line of diff.split("\n")) {
    const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (match?.[2]) paths.add(match[2]);
  }
  return [...paths];
}

/** New `.sql` files in the diff become the isolated migration card. */
export function migrationFromDiff(diff: string, fileContents: Map<string, string>): string | null {
  const sqlFiles = filesFromDiff(diff).filter(
    (path) =>
      /\.sql$/i.test(path) &&
      (path.startsWith("supabase/migrations/") || path.startsWith("migration/")),
  );
  if (sqlFiles.length === 0) return null;
  return sqlFiles.map((path) => `-- ${path}\n${fileContents.get(path) ?? ""}`).join("\n\n");
}

/** Best-effort error category for the autonomous diagnosis loop. */
export function diagnoseFailure(output: string): {
  category: string;
  message: string;
  file?: string;
} {
  const text = output || "";
  const fileMatch = /((?:src|scripts|supabase)\/[^\s:()]+\.(?:ts|tsx|sql|json))(?::(\d+))?/.exec(
    text,
  );
  const file = fileMatch?.[1];

  let category = "runtime";
  if (/error TS\d+/.test(text)) category = "type";
  else if (/SyntaxError|Unexpected token|Expected corresponding/.test(text)) category = "syntax";
  else if (/Cannot find module|Failed to resolve import|Could not resolve/.test(text))
    category = "import";
  else if (/eslint|no-unused-vars|prettier/i.test(text)) category = "lint";
  else if (
    /relation .* does not exist|column .* does not exist|syntax error at or near/i.test(text)
  )
    category = "database";
  else if (/401|403|api key|unauthorized/i.test(text)) category = "api";
  else if (/out of memory|ENOSPC|killed/i.test(text)) category = "infrastructure";
  else if (/test .* failed|expect\(/i.test(text)) category = "test";

  const firstError =
    text
      .split("\n")
      .find((line) => /error|failed|not found|unexpected/i.test(line))
      ?.slice(0, 400) ?? "No diagnostic line captured.";

  return file ? { category, message: firstError, file } : { category, message: firstError };
}
