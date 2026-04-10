# RULES.md — Hard Constraints for the AI Agent

> **READ THIS FIRST. EVERY TIME. These rules override any "smart" shortcut the AI thinks it can take.**

---

## 🔴 RULE 1: Never Write the Whole App at Once

Build only the phase that was explicitly requested. If the user asks for Phase 2, do not write Phase 3 code "just in case." Doing so creates untestable, tangled code that cannot be debugged incrementally.

---

## 🔴 RULE 2: Never Invent VS Code API Methods

If you are not 100% certain a method exists in `@types/vscode`, DO NOT USE IT. Common hallucinated APIs to avoid:

| ❌ Hallucinated | ✅ Real Alternative |
|---|---|
| `vscode.kernel.execute()` | Use the Jupyter Extension's exported API |
| `notebook.activeCellIndex` | `notebook.selections[0]` |
| `webview.send()` | `webview.postMessage()` |
| `vscode.NotebookEditor.insertCell()` | `vscode.WorkspaceEdit` with `vscode.NotebookEdit.insertCells()` |
| `vscode.window.activeTerminal.runCommand()` | Not available; use `vscode.window.createTerminal()` |

When in doubt, check: https://code.visualstudio.com/api/references/vscode-api

---

## 🔴 RULE 3: Webview Resource Loading is Non-Negotiable

The Webview **cannot** use relative or absolute local paths to load files. Every single local resource (JS bundle, CSS bundle, icon) MUST go through:

```typescript
// CORRECT
const scriptUri = webview.asWebviewUri(
  vscode.Uri.joinPath(extensionUri, 'webview-ui', 'build', 'assets', 'index.js')
);

// WRONG — will silently fail or be blocked by CSP
const scriptUri = '/webview-ui/build/assets/index.js';
```

---

## 🔴 RULE 4: Content Security Policy Must Be Set

Every Webview HTML response must include this CSP meta tag. Never omit it. Adjust the nonce per request.

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  style-src ${webview.cspSource} 'unsafe-inline';
  script-src 'nonce-${nonce}';
  img-src ${webview.cspSource} data:;
  font-src ${webview.cspSource};
">
```

The `nonce` must be a cryptographically random string generated fresh per HTML render call:
```typescript
function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
```

---

## 🔴 RULE 5: Vite Build MUST Output Deterministic Filenames

In `webview-ui/vite.config.ts`, this configuration block is MANDATORY:

```typescript
build: {
  outDir: 'build',
  rollupOptions: {
    output: {
      entryFileNames: 'assets/index.js',   // NO hash
      chunkFileNames: 'assets/[name].js',
      assetFileNames: 'assets/[name].[ext]' // NO hash on CSS
    }
  }
}
```

If hashes are present (e.g., `index.a3f9b2.js`), the Extension Host cannot reliably reference the file, and the Webview will show a blank screen.

---

## 🔴 RULE 6: Message Passing Must Use Typed Interfaces

All messages between the Webview and Extension Host MUST use the interfaces defined in `src/types/messages.ts`. Never use `any` for message payloads.

```typescript
// ✅ Correct
webview.onDidReceiveMessage((msg: WebviewToHostMessage) => { ... });

// ❌ Wrong
webview.onDidReceiveMessage((msg: any) => { ... });
```

---

## 🔴 RULE 7: Notebook Insertion Uses WorkspaceEdit Only

Do NOT use the clipboard, `executeCommand('paste')`, terminal injection, or any other hack to insert code. The only valid insertion method is:

```typescript
const edit = new vscode.WorkspaceEdit();
const notebook = vscode.window.activeNotebookEditor!.notebook;
const position = vscode.window.activeNotebookEditor!.selections[0].end;

edit.set(notebook.uri, [
  vscode.NotebookEdit.insertCells(position, [
    new vscode.NotebookCellData(
      vscode.NotebookCellKind.Code,
      generatedCode,
      'python'
    )
  ])
]);
await vscode.workspace.applyEdit(edit);
```

---

## 🔴 RULE 8: Two Separate package.json Files, Two Separate node_modules

- `package.json` at root = Extension Host dependencies (`@types/vscode`, `esbuild`, etc.)
- `webview-ui/package.json` = React UI dependencies (`react`, `reactflow`, `tailwindcss`, etc.)

Never cross-install. Never import a React component from `src/`. Never import a VS Code API from `webview-ui/src/`.

---

## 🔴 RULE 9: CodeGenerator.ts Has Zero VS Code Imports

```typescript
// ✅ Correct — pure TypeScript
import { JoinState } from './types/joinState';
export function generatePandasCode(state: JoinState): string { ... }

// ❌ Wrong
import * as vscode from 'vscode'; // NOT allowed in CodeGenerator.ts
```

This keeps the generator unit-testable with plain Jest, no mocking required.

---

## 🔴 RULE 10: Never Hardcode DataFrame Names

All table/column names come exclusively from the `JoinState` object passed in from the Webview. The code generator must never contain hardcoded strings like `'df_users'` or `'df_orders'`.

---

## 🟡 WARNINGS (Non-Blocking but Important)

- **Webview state loss:** If the panel is hidden and reshown, React remounts. Always save state to `vscode.setState()` before any action that might cause a panel switch.
- **Kernel not running:** Always check if a Jupyter kernel is active before calling `JupyterKernel.ts`. Fall back to Manual Mode silently.
- **Column name collisions:** When two joined tables share a column name, Pandas appends `_x` / `_y`. The `CodeGenerator` must detect this from the `JoinState` and apply explicit `suffixes` or a `rename()` step.
- **Multiple joins:** The dependency graph of chained joins must be resolved in topological order. Table A → B → C must produce merge(A, B) first, then merge(result, C).
- **`.vscodeignore` must exclude `webview-ui/src/`:** Only the compiled `webview-ui/build/` folder should be in the published `.vsix`. Source maps are optional.

---

## 🔴 RULE 11: Tailwind v4 — No Config Files, No PostCSS, No `init`

This project uses **Tailwind CSS v4**, which is architecturally different from v3. The AI agent must never generate v3 patterns.

| ❌ Tailwind v3 (WRONG — will crash) | ✅ Tailwind v4 (CORRECT) |
|---|---|
| `npx tailwindcss init -p` | Nothing — no init command exists |
| `tailwind.config.js` | No config file — use `@theme {}` in CSS |
| `postcss.config.js` | No PostCSS config — use `@tailwindcss/vite` plugin |
| `content: ['./src/**/*.tsx']` | Not needed — v4 detects files automatically |
| `theme: { extend: { colors: { ... } } }` | Use `@theme { --color-*: value; }` in CSS |
| `import tailwindcss from 'tailwindcss'` in postcss | `import tailwindcss from '@tailwindcss/vite'` in vite config |

**The only two things needed to set up Tailwind v4:**

1. In `vite.config.ts`: add `tailwindcss()` to the `plugins` array (imported from `@tailwindcss/vite`)
2. In `index.css`: first line is `@import "tailwindcss";`, followed by your `@theme {}` block

**Never create or reference these files:**
- `tailwind.config.js` / `.ts`
- `postcss.config.js` / `.ts`

---

## 🔴 RULE 12: Use `@xyflow/react` — `reactflow` is Abandoned

The package `reactflow` was last published **2 years ago** and is superseded by `@xyflow/react` v12. Never install or import from `reactflow`.

```bash
# ❌ WRONG
npm install reactflow

# ✅ CORRECT
npm install @xyflow/react
```

**Every import in the codebase must use `@xyflow/react`:**

```typescript
// ❌ WRONG — will cause TypeScript errors
import ReactFlow from 'reactflow';
import { Background } from 'reactflow';

// ✅ CORRECT — named exports only, no default export
import { ReactFlow, Background, Controls, MiniMap,
         useNodesState, useEdgesState, addEdge,
         Handle, Position, BackgroundVariant,
         type Node, type Edge, type Connection
       } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
```

**Node dimension API changed in v12:**
```typescript
// ❌ v11
node.width, node.height

// ✅ v12
node.measured?.width, node.measured?.height
```

---

## 🔴 RULE 13: Use `@vscode/vsce` — `vsce` Package is Renamed

The `vsce` npm package displays: *"vsce has been renamed to `@vscode/vsce`"*.

```json
// ✅ Correct scripts in root package.json
"scripts": {
  "package": "npx @vscode/vsce package --no-dependencies",
  "publish": "npx @vscode/vsce publish --no-dependencies"
}
```

Always include `--no-dependencies` because esbuild already bundles everything. Without it, vsce will try to crawl `node_modules` and either error or bloat the `.vsix`.

---

## 🔴 RULE 14: `acquireVsCodeApi` Types — Correct Pattern Only

Install `@types/vscode-webview` in **`webview-ui/`** only. Never import from `'vscode-webview'` directly.

```bash
# In webview-ui/ only
npm install -D @types/vscode-webview
```

```jsonc
// webview-ui/tsconfig.json — required
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM"],
    "types": ["vscode-webview"]
  }
}
```

```typescript
// webview-ui/src/lib/vscodeApi.ts — CORRECT pattern
// No imports needed — acquireVsCodeApi is a typed global after @types/vscode-webview install

let api: ReturnType<typeof acquireVsCodeApi> | undefined;

export function getVSCodeApi() {
  if (!api) api = acquireVsCodeApi();
  return api;
}

// ❌ WRONG — 'vscode-webview' is not an importable module path
import type { WebviewApi } from 'vscode-webview';
```

---

## 🟢 ALLOWED SHORTCUTS

- Using `'unsafe-inline'` for styles only (not scripts) in the CSP is acceptable.
- Using `console.log` during development is fine; wrap in a `isDev` flag before publish.
- Mocking the kernel response in Phase 1-3 with hardcoded table data is explicitly encouraged — do not attempt live kernel integration before Phase 4.
