/**
 * Repository intelligence: the engineer plans against this map instead of
 * assuming a stack. Regenerate with `bun scripts/engineer-repo-map.ts`.
 */
import { REPO_DATA } from "./repo-map.data";

export interface RepoMap {
  stack: {
    framework: string;
    router: string;
    runtime: string;
    package_manager: string;
    build: string;
    react: string;
    styling: string;
    data_layer: string;
    dependencies: Record<string, string>;
    scripts: Record<string, string>;
  };
  directories: string[];
  routes: { path: string; file: string; kind: "page" | "api" }[];
  modules: { file: string; kind: string }[];
  components: string[];
  ui_components: string[];
  tables: string[];
  deployment: { vercel: boolean; docker: boolean; workflows: string[] };
  files: string[];
}

export const repoMap = REPO_DATA as unknown as RepoMap;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "add",
  "make",
  "into",
  "from",
  "when",
  "then",
  "please",
  "should",
  "would",
  "could",
  "there",
  "where",
  "which",
  "about",
  "after",
  "before",
  "using",
  "have",
  "want",
  "need",
  "also",
]);

function tokens(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9_]+/)
        .filter((word) => word.length >= 3 && !STOP_WORDS.has(word)),
    ),
  ];
}

/** Compact architecture brief for the planner / LLM prompt (cheap, cached). */
export function repoBrief(): string {
  const s = repoMap.stack;
  return [
    `Framework: ${s.framework} · Router: ${s.router}`,
    `Build: ${s.build} · React ${s.react} · Styling: ${s.styling} · Package manager: ${s.package_manager}`,
    `Data layer: ${s.data_layer}`,
    `Scripts: ${Object.keys(s.scripts).join(", ")}`,
    `Routes: ${repoMap.routes.map((r) => r.path).join(", ")}`,
    `Key modules: ${repoMap.modules
      .filter((m) => m.kind !== "module")
      .slice(0, 40)
      .map((m) => m.file.replace("src/lib/", "").replace(".server.ts", ""))
      .join(", ")}`,
    `Components: ${repoMap.components.map((c) => c.replace("src/components/", "")).join(", ")}`,
    `Supabase tables: ${repoMap.tables.join(", ")}`,
  ].join("\n");
}

/**
 * Files most likely relevant to an instruction. Used to keep prompts small: the
 * engineer reads only these instead of scanning the whole repository.
 */
export function suggestFiles(prompt: string, limit = 8): string[] {
  const words = tokens(prompt);
  if (words.length === 0) return [];

  const scored = repoMap.files.map((file) => {
    const lower = file.toLowerCase();
    let score = 0;
    for (const word of words) {
      if (lower.includes(word)) score += 3;
      // plural-tolerant match ("settings" ↔ "setting")
      else if (word.length > 4 && lower.includes(word.slice(0, -1))) score += 1;
    }
    // Prefer leaf modules over barrel/index files.
    if (lower.endsWith("index.ts")) score -= 1;
    return { file, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file))
    .slice(0, limit)
    .map((entry) => entry.file);
}

/** Route files whose visible label matches the instruction. */
export function suggestRoutes(prompt: string): string[] {
  const words = tokens(prompt);
  const hits = new Set<string>();
  for (const route of repoMap.routes) {
    const haystack = `${route.path} ${route.file}`.toLowerCase().replace(/[/_-]/g, " ");
    if (words.some((word) => haystack.includes(word))) hits.add(route.file);
  }
  return [...hits].slice(0, 6);
}
