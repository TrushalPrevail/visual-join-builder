# DEPENDENCY_AUDIT.md — Issues Found & Fixes Applied

> Audit performed: April 2026. All issues verified against live npm registry and official docs.
> This document records every breaking change discovered. Read before touching any package.json.

---

## 🔴 CRITICAL ISSUE 1 — `reactflow` is Abandoned. Use `@xyflow/react`

**Affected docs:** phases.md, rules.md, architecture.md, ui_design.md

**Finding:**
`reactflow` v11.11.4 was last published 2 years ago. The package was rebranded from `reactflow` to `@xyflow/react` to unify the project under the "xyflow" umbrella.

**Breaking API changes in v12 (`@xyflow/react`) vs v11 (`reactflow`):**

| Area | v11 `reactflow` (WRONG) | v12 `@xyflow/react` (CORRECT) |
|---|---|---|
| Install | `npm install reactflow` | `npm install @xyflow/react` |
| Main import | `import ReactFlow from 'reactflow'` | `import { ReactFlow } from '@xyflow/react'` |
| CSS import | `import 'reactflow/dist/style.css'` | `import '@xyflow/react/dist/style.css'` |
| Node dimensions | `node.width`, `node.height` | `node.measured.width`, `node.measured.height` |
| Background | `import { Background } from 'reactflow'` | `import { Background } from '@xyflow/react'` |
| Controls | `import { Controls } from 'reactflow'` | `import { Controls } from '@xyflow/react'` |
| All hooks | `import { useNodesState } from 'reactflow'` | `import { useNodesState } from '@xyflow/react'` |

**The default export is gone.** `ReactFlow` is now a named export. Any AI that writes `import ReactFlow from '@xyflow/react'` will get a TypeScript error.

**Fix:** See rules.md Rule 12 and all updated Phase prompts.

---

## 🔴 CRITICAL ISSUE 2 — `vsce` Package Renamed. Use `@vscode/vsce`

**Affected docs:** `phases.md` (Phase 7), `checklist.md`

**Finding:**
The `vsce` npm package now shows author message: "vsce has been renamed to `@vscode/vsce`. Install using `@vscode/vsce` instead."

The correct package is `@vscode/vsce`, latest version 3.7.1, requiring Node.js at least 20.x.x.

**Impact:** Running `npx vsce package` may install the old abandoned package or do nothing. Any script referencing `vsce` will fail or use a years-old version.

**Recommended scripts in package.json:**
```json
"scripts": {
  "vsce:package": "npx @vscode/vsce package --no-dependencies",
  "vsce:publish": "npx @vscode/vsce publish --no-dependencies"
}
```

The `--no-dependencies` flag is mandatory because our extension uses esbuild bundling — all dependencies are already bundled into the output file. Without this flag, vsce tries to bundle `node_modules` and will error or bloat the `.vsix`. Keep scaffold build scripts (`package`, `vscode:prepublish`) dedicated to compile/bundle steps.

---

## 🔴 CRITICAL ISSUE 3 — `acquireVsCodeApi` Types: Wrong Package Import Pattern

**Affected docs:** phases.md Phase 2 (vscodeApi.ts), api_contracts.md

**Finding:**
`@types/vscode-webview` declares `acquireVsCodeApi` as a global function and exports the `WebviewApi` interface.

To fix TypeScript errors with `acquireVsCodeApi`, install the `@types/vscode-webview` package as a development dependency and update the tsconfig.json `lib` option to include DOM.

**The original plan had TWO errors:**

Error 1 — Wrong import path:
```typescript
// ❌ WRONG — 'vscode-webview' is not a real importable package
import type { WebviewApi } from 'vscode-webview';
```

Error 2 — Missing dev dependency in `webview-ui/`:
The plan never installed `@types/vscode-webview` in `webview-ui/package.json`.

**Correct pattern:**
```bash
# In webview-ui/ only
npm install -D @types/vscode-webview
```

```typescript
// webview-ui/src/lib/vscodeApi.ts
// No import needed — acquireVsCodeApi is a global injected by VS Code
// @types/vscode-webview makes it typed automatically

let api: ReturnType<typeof acquireVsCodeApi> | undefined;

export function getVSCodeApi() {
  if (!api) {
    api = acquireVsCodeApi();
  }
  return api;
}
```

```jsonc
// webview-ui/tsconfig.json — MUST have DOM in lib
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM"],
    "types": ["vscode-webview"]   // explicit inclusion to avoid ambiguity
  }
}
```

---

## 🟡 ISSUE 4 — DuckDB API: Use `duckdb.sql()` not `duckdb.query()`

**Affected docs:** codegen_spec.md (Case 7)

**Finding:**
The DuckDB Python docs state: "The most straight-forward manner of running SQL queries using DuckDB is using the `duckdb.sql` command."

Confirmed from DuckDB source: `sql`, `query`, and `from_query` are aliases for the same functionality. Both work, but `duckdb.sql()` is the documented standard.

Additionally, DuckDB can query Pandas DataFrames **directly by their Python variable name** — no registration step needed. This is a key feature the generated code relies on:

```python
# This works because DuckDB scans local Python variables automatically
import duckdb
result_df = duckdb.sql("SELECT * FROM df_users LEFT JOIN df_orders ON ...").df()
```

**Fix:** Replace all `duckdb.query()` with `duckdb.sql()` in codegen_spec.md.

---

## 🟡 ISSUE 5 — `esbuild` Already Installed by `yo code` Scaffold

**Affected docs:** phases.md Phase 0

**Finding:** The `yo code` scaffold with esbuild bundler already adds `esbuild` to `devDependencies` in `package.json` and generates an `esbuild.js` build script. Running `npm install -D esbuild` again is harmless but redundant and confusing.

**Fix:** Remove `npm install -D esbuild` from Phase 0 steps. It's already there.

---

## ✅ Things That Were Verified Correct

| Item | Status | Notes |
|---|---|---|
| `@tailwindcss/vite` for Tailwind v4 | ✅ Correct | Fixed in previous session |
| `zod` for schema validation | ✅ Correct | Stable, widely used |
| `vscode.NotebookEdit.insertCells()` | ✅ Correct | Available since VS Code 1.79 |
| `engines.vscode: "^1.85.0"` | ✅ Safe | Comfortable margin above 1.79 |
| `duckdb.sql().df()` | ✅ Correct | `.df()` is the right method (not `.to_df()`) |
| CSP nonce pattern | ✅ Correct | Matches VS Code marketplace requirements |
| `webview.asWebviewUri()` pattern | ✅ Correct | Required for all local resources |
| `vscode.WorkspaceEdit` + `NotebookEdit` | ✅ Correct | Proper notebook insertion API |
| Vite deterministic filename config | ✅ Correct | Already fixed in previous session |
| Tailwind v4 `@theme {}` token pattern | ✅ Correct | Already fixed in previous session |
