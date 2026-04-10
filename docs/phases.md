# PHASES.md — Step-by-Step Build Plan

> Each phase has: a **goal**, a **definition of done**, an **exact AI prompt**, and **validation steps**. 
> Only move to the next phase when the current one passes all validation steps.

---

## Phase 0 — Project Initialization (Manual, No AI)

### Goal
Establish the correct scaffolded structure before the AI touches anything.

### ⚠️ Tailwind v4 Notice
Running `npm install -D tailwindcss` installs **Tailwind v4**, which is a completely different setup from v3:
- The `npx tailwindcss init -p` command **does not exist** in v4 — do not run it.
- There is no `tailwind.config.js` or `postcss.config.js` in v4.
- v4 uses a **Vite plugin** instead of PostCSS.
- Configuration is done inside your CSS file using `@import` and `@theme`.

Follow the steps below exactly.

---

### Steps (Run These Yourself)

```bash
# 1. Confirm yo code scaffold files exist at root:
#    src/extension.ts, package.json, esbuild.js, tsconfig.json

# 2. Initialize the Webview UI sub-project
mkdir webview-ui && cd webview-ui
npm create vite@latest . -- --template react-ts
npm install

# 3. Install React Flow v12 (the CURRENT package — reactflow is abandoned)
npm install @xyflow/react

# 4. Install Tailwind v4 the CORRECT way (Vite plugin — no PostCSS, no init command)
npm install -D tailwindcss @tailwindcss/vite
# 5. Install webview types for acquireVsCodeApi (in webview-ui/ only)
npm install -D @types/vscode-webview

cd ..

# 6. Install extension host dev dependencies
# NOTE: esbuild is ALREADY installed by yo code scaffold — do NOT reinstall it
npm install zod

# 6. Create docs folder and paste all .md files into it
mkdir docs
```

---

### Tailwind v4 Configuration (Do These Manually)

**Step A — Update `webview-ui/vite.config.ts`:**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'   // ← v4 plugin

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),                             // ← replaces PostCSS config
  ],
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',     // NO hash — required by extension host
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'  // covers index.css with no hash
      }
    }
  }
})
```

**Step B — Replace contents of `webview-ui/src/index.css` with:**

```css
@import "tailwindcss";

@theme {
  /* Map every CSS variable from UI_DESIGN.md into Tailwind's theme system */
  --color-bg-base:       #0d0d0f;
  --color-bg-surface:    #141416;
  --color-bg-elevated:   #1c1c1f;
  --color-bg-hover:      #252529;
  --color-bg-overlay:    #1a1a1f;

  --color-border-subtle:  #252529;
  --color-border-default: #313138;
  --color-border-focus:   #7c6af7;

  --color-text-primary:   #e8e8ed;
  --color-text-secondary: #8a8a9a;
  --color-text-muted:     #55556a;
  --color-text-code:      #c9c9d8;

  --color-accent:         #7c6af7;
  --color-accent-dim:     #3d3660;
  --color-accent-hover:   #9585f9;

  --color-status-ok:      #22d3a5;
  --color-status-warn:    #f59e0b;
  --color-status-error:   #f87171;

  --color-join-inner:     #7c6af7;
  --color-join-left:      #4da6ff;
  --color-join-right:     #f97316;
  --color-join-outer:     #22d3a5;
  --color-join-cross:     #e879a0;

  --font-family-ui:   'Inter', -apple-system, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
}

/* Base reset for Webview iframe context */
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: var(--color-bg-base); color: var(--color-text-primary); font-family: var(--font-family-ui); }
```

> **How to use in components:** Tailwind v4 auto-generates utilities from your `@theme` block.
> Use class names like `bg-bg-surface`, `text-text-muted`, `border-border-focus`, `text-accent` directly.
> You do not need `className="bg-[#141416]"` anywhere — the theme tokens become utility classes.

**Step C — Delete these files if Vite generated them (they are not used in v4):**
```bash
rm -f webview-ui/postcss.config.js
rm -f webview-ui/postcss.config.ts
rm -f webview-ui/tailwind.config.js
rm -f webview-ui/tailwind.config.ts
```

---

### Definition of Done
- `npm run compile` succeeds at the root (Extension Host builds).
- `cd webview-ui && npm run build` succeeds with zero errors.
- `webview-ui/build/assets/index.js` exists — confirm **no hash** in the filename.
- `webview-ui/build/assets/index.css` exists — confirm **no hash** in the filename.
- Open `webview-ui/build/assets/index.css` and confirm `@import "tailwindcss"` has been compiled out — it should contain real CSS rules, not the import statement.

---

## Phase 1 — Extension Skeleton & Webview Loader

### Goal
Open a `WebviewPanel` from a command. Load the compiled React bundle inside it securely.

### Exact AI Prompt

```
Read docs/RULES.md fully before writing any code.

Task: Implement Phase 1.

1. In `src/extension.ts`, register two commands:
   - `visual-join-builder.open` — opens the WebviewPanel
   - `visual-join-builder.openFromCell` — also opens the WebviewPanel (same behavior for now)

2. Create `src/WebviewManager.ts`. This class must:
   - Use `vscode.window.createWebviewPanel()` with `viewColumn: vscode.ViewColumn.Beside`
   - Enable `enableScripts: true` and set `localResourceRoots` to `[extensionUri]`
   - Generate a fresh `nonce` per render using the getNonce() function from RULES.md
   - Inject a strict CSP meta tag exactly as specified in RULES.md Rule 4
   - Load the compiled React bundle using `webview.asWebviewUri()` pointing to `webview-ui/build/assets/index.js` and `webview-ui/build/assets/index.css`
   - Handle the panel being disposed (set a flag so we don't try to post to a dead panel)
   - Be a singleton: if the panel already exists, reveal it instead of creating a new one

3. In `webview-ui/vite.config.ts`, apply the exact Rollup output config from RULES.md Rule 5 to remove filename hashes.

4. In `webview-ui/src/main.tsx`, render a basic <App /> that shows a centered <h1>Visual Join Builder</h1> with a dark background (#0d0d0f) and white text, just to confirm loading works.

Do NOT add any join logic yet.
```

### Validation Steps
- [ ] Run `F5` in VS Code. The extension activates.
- [ ] Run command `Visual Join Builder: Open`. A panel opens beside the editor.
- [ ] The panel shows "Visual Join Builder" text (not a blank white screen).
- [ ] Opening DevTools (`Help > Toggle Developer Tools`) shows no CSP errors in the Console.
- [ ] Opening the panel twice does not create two panels — it reveals the existing one.

---

## Phase 2 — Message Bridge & Typed Communication

### Goal
Establish reliable, typed two-way communication between the Extension Host and Webview.

### Exact AI Prompt

```
Read docs/RULES.md Rule 6 before writing any code.

Task: Implement Phase 2.

1. Create `src/types/messages.ts`. Define these TypeScript interfaces:

   // Webview → Host
   type WebviewToHostMessage =
     | { command: 'ready' }
     | { command: 'insertCode'; payload: { code: string } }
     | { command: 'requestTables' }
     | { command: 'requestPreview'; payload: { joinState: JoinState } }
     | { command: 'saveState'; payload: { joinState: JoinState } }

   // Host → Webview
   type HostToWebviewMessage =
     | { command: 'loadTables'; payload: { tables: TableSchema[] } }
     | { command: 'previewResult'; payload: { html: string; rowCount: number } }
     | { command: 'previewError'; payload: { message: string } }
     | { command: 'restoreState'; payload: { joinState: JoinState } }
     | { command: 'kernelStatus'; payload: { active: boolean } }

2. Create `src/types/joinState.ts`. Define:
   - `TableSchema`: { name: string; columns: ColumnSchema[] }
   - `ColumnSchema`: { name: string; dtype: string; nullable: boolean }
   - `JoinClause`: { leftTable: string; leftColumn: string; rightTable: string; rightColumn: string; joinType: 'inner' | 'left' | 'right' | 'outer' | 'cross' }
   - `JoinState`: { tables: TableSchema[]; joins: JoinClause[]; selectedColumns: SelectedColumn[]; outputName: string; dialect: 'pandas' | 'duckdb' | 'pyspark' }
   - `SelectedColumn`: { table: string; column: string; alias: string | null }
   Export these from an `index.ts` barrel file.

3. Update `WebviewManager.ts` to:
   - Listen with `webview.onDidReceiveMessage((msg: WebviewToHostMessage) => ...)` 
   - On `ready`: post back `kernelStatus` with `active: false` (mock for now)
   - On `insertCode`: call a stub function `handleInsertCode(msg.payload.code)` that just shows `vscode.window.showInformationMessage(code)` for now

4. In `webview-ui/src/lib/vscodeApi.ts`, create the singleton:
   ```ts
   import type { WebviewApi } from 'vscode-webview';
   let api: WebviewApi<unknown> | undefined;
   export function getVSCodeApi() {
     if (!api) api = acquireVsCodeApi();
     return api;
   }
   ```

5. Create `webview-ui/src/hooks/useVSCodeMessage.ts`:
   - Exports `useVSCodeMessage(handler: (msg: HostToWebviewMessage) => void)`
   - Adds/removes a `window.addEventListener('message', ...)` listener in useEffect
   - Exports `sendMessage(msg: WebviewToHostMessage)` using `getVSCodeApi().postMessage()`

6. In `webview-ui/src/App.tsx`:
   - On mount, call `sendMessage({ command: 'ready' })`
   - Use `useVSCodeMessage` to listen for `kernelStatus` and display a small status badge

Do NOT build the canvas yet.
```

### Validation Steps
- [ ] TypeScript compiles with zero errors on both Extension Host and Webview.
- [ ] Opening the panel triggers `ready` message (add a `console.log` to confirm in Extension Host).
- [ ] The Webview receives `kernelStatus` and renders either a green "Kernel Active" or grey "No Kernel" badge.

---

## Phase 3 — Canvas UI (React Flow + Table Nodes)

### Goal
Build the visual canvas. Drag tables from sidebar onto canvas. Draw join lines. Select join type via Venn popover.

### Exact AI Prompt

```
Read docs/UI_DESIGN.md fully before writing any code.
Read docs/RULES.md Rules 8 and 10.

Task: Implement Phase 3 — the Webview canvas UI.

Use `@xyflow/react` (NOT `reactflow` — that package is abandoned). All imports are named exports:

```typescript
import { ReactFlow, Background, BackgroundVariant, Handle, Position,
         useNodesState, useEdgesState, addEdge,
         type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
```

MOCK DATA for tables. Define this at the top of `App.tsx`:
const MOCK_TABLES: TableSchema[] = [
  { name: 'df_users', columns: [
    { name: 'id', dtype: 'int64', nullable: false },
    { name: 'name', dtype: 'object', nullable: false },
    { name: 'email', dtype: 'object', nullable: true },
    { name: 'created_at', dtype: 'datetime64', nullable: false }
  ]},
  { name: 'df_orders', columns: [
    { name: 'order_id', dtype: 'int64', nullable: false },
    { name: 'user_id', dtype: 'int64', nullable: false },
    { name: 'total', dtype: 'float64', nullable: false },
    { name: 'created_at', dtype: 'datetime64', nullable: false }
  ]}
];

Build these components exactly:

1. `Sidebar.tsx` — Left panel (240px wide, dark bg):
   - Lists available tables from `tables` prop
   - Each table item is draggable (`draggable` attribute + `onDragStart` sets `dataTransfer`)
   - Shows table name and column count
   - Shows a "No kernel — Manual Mode" notice when kernel is inactive with a "+ Add Table" button

2. `TableNode.tsx` — Custom ReactFlow node:
   - Dark card with subtle border (#1e1e2e background, #313244 border)
   - Header: colored dot (unique color per table), table name in monospace font
   - Column list: each column shows name (left) and dtype badge (right, muted color)
   - Left/right connection handles on each column row (ReactFlow `<Handle>`)
   - Checkbox on each column row for SELECT column selection
   - "All / None" toggle at the top of the column list

3. `JoinEdge.tsx` — Custom ReactFlow edge:
   - Animated dashed line between two column handles
   - Shows a floating pill badge in the center of the edge: "LEFT JOIN" / "INNER" etc.
   - Clicking the pill opens a `JoinTypePopover` inline

4. `JoinTypePopover.tsx` — Venn diagram join selector:
   - Renders 5 SVG Venn diagrams: INNER, LEFT, RIGHT, FULL OUTER, CROSS
   - Active join type is highlighted with an accent color (#7c6af7)
   - Clicking a diagram updates the edge's joinType in state
   - Renders as an absolutely positioned floating card, closes on outside click

5. `Canvas.tsx` — ReactFlow wrapper:
   - Accepts `onDrop` to add a new TableNode when a table is dragged from Sidebar
   - Uses `useNodesState` and `useEdgesState` from reactflow
   - When an edge is created (connect event), auto-sets joinType to 'inner'
   - Background: `<Background variant="dots" color="#1e1e2e" />`

6. `Toolbar.tsx` — Top bar:
   - Output name input field (default: "result_df")
   - Dialect selector: Pandas | DuckDB | PySpark (segmented control buttons)
   - "Clear Canvas" button
   - "Insert to Notebook" primary button (accent color, disabled when no joins exist)
   - "Copy Code" secondary button

Use the design tokens from UI_DESIGN.md. All colors must reference CSS variables, not hardcoded hex.
```

### Validation Steps
- [ ] Two mock tables appear in the sidebar.
- [ ] Dragging a table onto the canvas creates a `TableNode`.
- [ ] Dragging from a column handle to another table's column handle creates an animated edge.
- [ ] Clicking the join badge on the edge opens the Venn popover.
- [ ] Clicking a Venn diagram updates the edge label.
- [ ] Checking/unchecking column checkboxes works.
- [ ] Toolbar dialect switcher updates state.

---

## Phase 4 — Code Generation Engine

### Goal
Implement the pure TypeScript `CodeGenerator` and wire it to the live canvas state.

### Exact AI Prompt

```
Read docs/CODEGEN_SPEC.md fully before writing any code.
Read docs/RULES.md Rules 9 and 10.

Task: Implement Phase 4 — Code Generation Engine.

1. Create `src/CodeGenerator.ts` with NO vscode imports. Implement:
   - `generatePandasCode(state: JoinState): string`
   - `generateDuckDBCode(state: JoinState): string`  
   - `generatePySparkCode(state: JoinState): string`
   - A top-level `generateCode(state: JoinState): string` router that delegates based on `state.dialect`

   Handle ALL edge cases from CODEGEN_SPEC.md:
   - Chained multi-table joins (topological order)
   - Column name collisions (auto-suffix + rename)
   - Type mismatch warnings (emit a `# WARNING:` comment in generated code)
   - CROSS JOIN (no ON clause)
   - Empty selectedColumns (select all with `*` or no filter step)
   - Output variable name from `state.outputName`

2. Write Jest tests in `src/__tests__/CodeGenerator.test.ts`. Cover:
   - Single left join, 3 columns selected, 1 alias
   - Single inner join with no column filter
   - Chained join: A → B → C
   - Column name collision between two tables
   - DuckDB dialect output
   - PySpark dialect output
   - Cross join (no ON clause)

3. In `webview-ui/src/hooks/useJoinState.ts`:
   - Maintain the canonical `JoinState` derived from ReactFlow nodes + edges + toolbar state
   - Export `joinState: JoinState` (recomputed whenever nodes/edges change)
   - This is a pure derivation — no API calls here

4. In `webview-ui/src/components/CodePanel.tsx`:
   - Receives `code: string` prop
   - Renders it in a `<pre>` block with a monospace font
   - Syntax-highlights using a simple regex-based colorizer (no external library — keep bundle small):
     - Keywords (def, import, as, from, SELECT, JOIN, etc.) → accent purple
     - Strings → green
     - Comments → muted grey
   - "Copy" button with clipboard feedback

5. Wire the canvas to the CodePanel:
   - In `App.tsx`, derive `JoinState` from `useJoinState()`
   - Pass it to `generateCode(joinState)` (import the function directly — it's pure TS, not a VS Code API call)
   - Pass the result string to `<CodePanel />`
   - Code updates in real-time as the user changes the canvas

Do NOT wire the "Insert to Notebook" button yet — that is Phase 5.
```

### Validation Steps
- [ ] Jest tests all pass: `npm test`
- [ ] Drawing a LEFT join on the canvas instantly updates the CodePanel with valid Python.
- [ ] Switching dialect to DuckDB updates the code to a SQL string.
- [ ] Renaming the output to `merged_df` in the Toolbar updates the variable name in generated code.
- [ ] Two tables with a shared column name (`created_at`) produce code with explicit suffixes.

---

## Phase 5 — Notebook & File Insertion

### Goal
Wire the "Insert to Notebook" button to insert generated code into `.ipynb` cells or at cursor in `.py` files.

### Exact AI Prompt

```
Read docs/RULES.md Rule 7 before writing any code.

Task: Implement Phase 5 — Code Insertion.

1. Create `src/NotebookInserter.ts` with this logic:
   
   `insertCode(code: string): Promise<void>`:
   - Check if `vscode.window.activeNotebookEditor` is defined:
     - YES: Insert a new Python code cell below `activeNotebookEditor.selections[0].end` using `vscode.WorkspaceEdit` + `vscode.NotebookEdit.insertCells()` exactly as in RULES.md Rule 7
     - NO: Check if `vscode.window.activeTextEditor` is defined:
       - YES: Insert code at `activeTextEditor.selection.active` using `activeTextEditor.edit()`
       - NO: Show `vscode.window.showWarningMessage('Open a notebook or Python file first.')`
   - After successful insertion: show `vscode.window.showInformationMessage('✨ Join code inserted!')`

2. Update `WebviewManager.ts`:
   - In the `insertCode` message handler, call `NotebookInserter.insertCode(msg.payload.code)`

3. In the Webview, when "Insert to Notebook" is clicked:
   - Call `sendMessage({ command: 'insertCode', payload: { code: generatedCode } })`
   - Show a brief in-UI success animation (button turns green for 1.5s)

4. Add a CodeLens provider in `src/extension.ts`:
   - Register it for `jupyter-notebook` and `python` document selectors
   - Shows a `✨ Visual Join` CodeLens above every cell/function that contains `pd.merge` or `pd.DataFrame`
   - Clicking it runs `visual-join-builder.openFromCell`
```

### Validation Steps
- [ ] With a `.ipynb` open, clicking "Insert to Notebook" inserts a new cell below the active cell.
- [ ] With a `.py` file open and cursor positioned, clicking "Insert to Notebook" inserts code at cursor.
- [ ] With no file open, a warning notification appears.
- [ ] CodeLens "✨ Visual Join" appears above cells in a notebook.

---

## Phase 6 — Live Kernel Integration

### Goal
Replace mock table data with real DataFrames discovered from the active Jupyter kernel.

### Exact AI Prompt

```
Read docs/ARCHITECTURE.md Decision 4 (Graceful Degradation) before writing any code.

Task: Implement Phase 6 — Live Kernel Data.

1. Create `src/JupyterKernel.ts`:
   - Get the Jupyter extension API:
     ```ts
     const jupyterExt = vscode.extensions.getExtension('ms-toolsai.jupyter');
     const jupyterApi = await jupyterExt?.activate();
     ```
   - `discoverTables(): Promise<TableSchema[]>`:
     - Look up the active notebook URI via `vscode.window.activeNotebookEditor?.notebook.uri`
     - Use the Jupyter API to get the kernel for that URI: `const kernel = await jupyterApi.kernels.getKernel(uri);`
     - **CRITICAL:** Use `kernel.executeHidden()` or the equivalent Jupyter API method to run the python discovery script silently without outputting a visible cell.
     - The script to execute:
       `import json, pandas as pd; print(json.dumps({k: [{'name': c, 'dtype': str(v[c].dtype), 'nullable': bool(v[c].isna().any())} for c in v.columns] for k, v in globals().items() if isinstance(v, pd.DataFrame)}))`

     - Parse the stdout JSON into `TableSchema[]`
     - Return empty array on any error — do NOT throw
   - `executePreview(code: string): Promise<{ html: string; rowCount: number }>`:
     - Append `.head(5).to_html(index=False)` to the code and execute silently
     - Return the HTML string
     - On error, return `{ html: '', rowCount: 0 }` and emit error message

2. Create `src/TableDiscovery.ts`:
   - Polls `JupyterKernel.discoverTables()` every 5 seconds while panel is visible
   - Caches last result; only posts to Webview if the result changed (shallow diff)
   - Stops polling when WebviewPanel is disposed
   - Exposes `forceRefresh()` method for the toolbar "Refresh" button

3. Update `WebviewManager.ts`:
   - On `requestTables` message: call `TableDiscovery.forceRefresh()`
   - On `requestPreview` message: call `JupyterKernel.executePreview()` and post result back
   - On panel open: immediately call `discoverTables()` and post result

4. Update `webview-ui/src/App.tsx`:
   - On receiving `loadTables`: replace mock tables with real ones in state
   - If `tables` is empty AND kernel is inactive: show Manual Mode notice
   - If `tables` is empty AND kernel is active: show "No DataFrames found yet. Run your cells first."

5. Create `webview-ui/src/components/PreviewPanel.tsx`:
   - Collapsible bottom panel (default: collapsed)
   - On expand, sends `requestPreview` message with current `joinState`
   - Renders the returned HTML inside a styled container
   - Shows row count: "Showing 5 of {rowCount} rows"
   - Shows a spinner while waiting for response
```

### Validation Steps
- [ ] With a Jupyter kernel running and a `df_users` DataFrame in memory, opening the panel shows `df_users` in the sidebar automatically.
- [ ] Adding a new DataFrame in a cell and clicking the Refresh button updates the sidebar.
- [ ] Expanding the Preview panel executes the join silently and shows a data table.
- [ ] With no kernel running, the sidebar shows "No kernel — Manual Mode" with no crash.

---

## Phase 7 — Polish, Error Handling & Pre-Publish

### Exact AI Prompt

```
Task: Implement Phase 7 — Polish and prepare for publishing.

1. `.vscodeignore` — ensure these are excluded from the package:
   webview-ui/src/
   webview-ui/node_modules/
   webview-ui/vite.config.ts
   src/__tests__/
   docs/
   .git/
   node_modules/

2. `package.json` updates:
   - Set `"publisher"` to your publisher ID
   - Set `"icon"` to `"media/icon.png"` (128x128 PNG required)
   - Ensure `"engines": { "vscode": "^1.85.0" }` (minimum version that has NotebookEdit API)
   - Add keywords: ["jupyter", "pandas", "dataframe", "sql", "join", "data science", "visualization"]
   - Add categories: ["Data Science", "Notebooks", "Visualization", "Other"]
   - Add a `"vsce:package"` script: `"vsce package --no-dependencies"`

3. `README.md` — write a professional README with:
   - A GIF placeholder section labeled [DEMO GIF HERE]
   - Features list (Visual Join Builder, Live Preview, Multi-dialect, Works in .ipynb and .py)
   - Requirements section (VS Code 1.85+, Python extension, Jupyter extension)
   - Usage section (step-by-step with numbered steps)
   - Known Limitations section (honestly list: PySpark preview not supported, cross-join no condition)

4. Add a `postinstall` script to root `package.json`:
   `"postinstall": "cd webview-ui && npm install"`
   And a pre-package script:
   `"prebuild": "cd webview-ui && npm run build"`

5. Error boundaries:
   - Wrap `<Canvas />` in a React ErrorBoundary that shows a "Canvas error — try refreshing" message
   - All `JupyterKernel` calls must be wrapped in try/catch with fallback behavior documented in ARCHITECTURE.md Decision 4

6. Run `vsce package` and verify the resulting `.vsix` is under 5MB.
```

### Validation Steps
- [ ] `vsce package` runs without errors.
- [ ] `.vsix` file is under 5MB.
- [ ] Install the `.vsix` locally: `code --install-extension visual-join-builder-*.vsix`
- [ ] Full end-to-end flow works on a fresh VS Code window with a clean Jupyter notebook.
- [ ] No `console.error` or uncaught promise rejections in production build.
