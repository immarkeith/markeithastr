/**
 * Regenerates `src/lib/engineer/repo-map.data.ts` — ASTR's own architecture map.
 *
 * The engineer reads this map instead of assuming a stack, so it always plans
 * against the real repository. Run it after structural changes:
 *
 *   bun scripts/engineer-repo-map.ts
 *
 * It only reads the working tree and writes one generated file.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".git" || entry === ".output" || entry === "dist")
      continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(relative(ROOT, full).split(sep).join("/"));
  }
  return out;
}

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(ROOT, path), "utf8")) as T;
  } catch {
    return fallback;
  }
}

const pkg = readJson<{
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}>("package.json", {});

const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

function routePath(file: string): string {
  const rel = file.replace(/^src\/routes\//, "").replace(/\.tsx?$/, "");
  if (rel === "index") return "/";
  const clean = rel.replace(/\/index$/, "");
  return `/${clean.replace(/\./g, "/")}`;
}

const srcFiles = walk(join(ROOT, "src")).filter((f) => /\.(ts|tsx)$/.test(f));
const routeFiles = srcFiles.filter(
  (f) => f.startsWith("src/routes/") && f !== "src/routes/__root.tsx",
);

const routes = routeFiles
  .map((file) => ({
    path: routePath(file),
    file,
    kind: file.includes("/api/") ? ("api" as const) : ("page" as const),
  }))
  .sort((a, b) => a.path.localeCompare(b.path));

const modules = srcFiles
  .filter(
    (f) =>
      f.startsWith("src/lib/") || f.startsWith("src/integrations/") || f.startsWith("src/hooks/"),
  )
  .map((file) => ({
    file,
    kind: file.includes(".functions.")
      ? "server-function"
      : file.includes(".server.")
        ? "server-only"
        : file.includes("hooks")
          ? "hook"
          : "module",
  }))
  .sort((a, b) => a.file.localeCompare(b.file));

const components = srcFiles
  .filter((f) => f.startsWith("src/components/") && !f.startsWith("src/components/ui/"))
  .sort();

const uiComponents = srcFiles
  .filter((f) => f.startsWith("src/components/ui/"))
  .map((f) => f.replace("src/components/ui/", "").replace(/\.tsx$/, ""))
  .sort();

const sqlSources = [
  ...walk(join(ROOT, "supabase", "migrations")),
  ...walk(join(ROOT, "migration")).filter((f) => f.endsWith(".sql")),
];

const tables = new Set<string>();
for (const file of sqlSources) {
  let text = "";
  try {
    text = readFileSync(join(ROOT, file), "utf8");
  } catch {
    continue;
  }
  const pattern = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi;
  let match = pattern.exec(text);
  while (match) {
    if (match[1]) tables.add(match[1]);
    match = pattern.exec(text);
  }
}

const workflows = walk(join(ROOT, ".github")).filter(
  (f) => f.endsWith(".yml") || f.endsWith(".yaml"),
);

const directories = [...new Set(srcFiles.map((f) => f.split("/").slice(0, 2).join("/")))].sort();

const deployment = {
  vercel: walk(ROOT).some((f) => f === "vercel.json" || f === ".vercel/project.json"),
  docker: walk(ROOT).some((f) => /^docker-compose.*\.ya?ml$/.test(f) || f === "Dockerfile"),
  workflows,
};

const data = {
  stack: {
    framework: deps["@tanstack/react-start"]
      ? "TanStack Start"
      : deps["next"]
        ? "Next.js"
        : "Vite + React",
    router: deps["@tanstack/react-router"] ? "TanStack Router (file-based)" : "react-router",
    runtime: "Node/edge via Vite SSR; Bun for scripts",
    package_manager: "bun",
    build: deps["vite"] ? `Vite ${deps["vite"]}` : "unknown",
    react: deps["react"] ?? "unknown",
    styling: deps["tailwindcss"] ? `Tailwind ${deps["tailwindcss"]}` : "unknown",
    data_layer: deps["@supabase/supabase-js"] ? "Supabase (Postgres + PostgREST)" : "unknown",
    dependencies: deps,
    scripts: pkg.scripts ?? {},
  },
  directories,
  routes,
  modules,
  components,
  ui_components: uiComponents,
  tables: [...tables].sort(),
  deployment,
  files: srcFiles.sort(),
};

const body = `// GENERATED FILE — produced by scripts/engineer-repo-map.ts on ${new Date().toISOString()}.
// Do not edit by hand: run \`bun scripts/engineer-repo-map.ts\` instead.
export const REPO_DATA = ${JSON.stringify(data, null, 2)} as const;
`;

writeFileSync(join(ROOT, "src/lib/engineer/repo-map.data.ts"), body, "utf8");
console.log(
  `repo map: ${routes.length} routes, ${modules.length} modules, ${components.length} components, ${tables.size} tables, ${workflows.length} workflows`,
);
