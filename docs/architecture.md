# Visual Join Builder — Master Architecture

## Project Identity
- **Extension ID:** `visual-join-builder`
- **Publisher target:** VS Code Marketplace
- **Primary users:** Data scientists and analysts using Jupyter Notebooks, `.py` scripts, or plain SQL files in VS Code.
- **Core value:** Replace writing `pd.merge()` or `JOIN` SQL by hand with a zero-syntax, drag-and-drop visual canvas that generates production-ready code.

---

## Supported File Contexts

| Context | Behavior |
|---|---|
| `.ipynb` Jupyter Notebook | Inserts a new code cell below the active cell |
| `.py` Python script | Inserts code at cursor position |
| No file open | Opens in standalone mode; user copies generated code manually |

The extension activates for all three contexts. Never restrict launch to `.ipynb` only.

---

## High-Level Data Flow

```
User Action (Webview Canvas)
        │
        ▼
[React UI] ──postMessage──▶ [Extension Host]
                                    │
                          ┌─────────┴──────────┐
                          ▼                    ▼
                  [CodeGenerator.ts]   [JupyterKernel.ts]
                  Builds code string   Fetches live DF schema
                          │                    │
                          └─────────┬──────────┘
                                    ▼
                          [NotebookInserter.ts]
                          Inserts cell / code at cursor
```

---

## Folder Structure (Canonical — Do Not Deviate)

```
visual-join-builder/
├── src/                          # Extension Host (Node.js / VS Code API)
│   ├── extension.ts              # Entry: registers all commands + providers
│   ├── WebviewManager.ts         # Creates, hydrates, and owns the WebviewPanel
│   ├── CodeGenerator.ts          # Pure function: JoinState → code string
│   ├── JupyterKernel.ts          # Kernel introspection (DataFrames + dtypes)
│   ├── NotebookInserter.ts       # Inserts cells into .ipynb or text at cursor
│   ├── TableDiscovery.ts         # Orchestrates kernel polling + caching
│   └── types/
│       ├── messages.ts           # All Webview ↔ Host message interfaces
│       └── joinState.ts          # JoinState AST definition (single source of truth)
│
├── webview-ui/                   # React Frontend (entirely separate build)
│   ├── src/
│   │   ├── main.tsx              # React root, mounts <App />
│   │   ├── App.tsx               # Top-level layout, panel routing
│   │   ├── components/
│   │   │   ├── Canvas.tsx        # ReactFlow canvas wrapper
│   │   │   ├── TableNode.tsx     # Custom ReactFlow node (table card)
│   │   │   ├── JoinEdge.tsx      # Custom ReactFlow edge (join line + Venn popover)
│   │   │   ├── Sidebar.tsx       # Left panel: available DataFrames list
│   │   │   ├── PreviewPanel.tsx  # Bottom panel: live data preview table
│   │   │   ├── CodePanel.tsx     # Right panel: syntax-highlighted code output
│   │   │   └── Toolbar.tsx       # Top bar: dialect switcher, output name, actions
│   │   ├── hooks/
│   │   │   ├── useVSCodeMessage.ts   # Typed postMessage bridge
│   │   │   └── useJoinState.ts       # Central state: nodes, edges, columns
│   │   └── lib/
│   │       └── vscodeApi.ts      # acquireVsCodeApi() singleton wrapper
│   ├── vite.config.ts            # CRITICAL: single JS + CSS output, no hash
│   ├── tailwind.config.ts
│   └── package.json
│
├── media/                        # Static assets (icons, splash)
├── package.json                  # Extension manifest
├── esbuild.js                    # Extension Host bundler config
├── tsconfig.json
├── .vscodeignore
└── docs/
    ├── ARCHITECTURE.md           # This file
    ├── RULES.md                  # Hard constraints for AI agent
    ├── PHASES.md                 # Step-by-step build plan
    ├── UI_DESIGN.md              # Visual design specification
    ├── API_CONTRACTS.md          # Message passing contracts
    └── CODEGEN_SPEC.md           # Code generation engine spec
```

---

## Tech Stack (Locked — Do Not Substitute)

| Layer | Technology | Reason |
|---|---|---|
| Extension Host | TypeScript + esbuild | Fast bundling, strict types, VS Code standard |
| Webview UI | React 18 + Vite | Component model, hot reload in dev |
| Styling | TailwindCSS v4 | Utility-first, uses @theme and Vite plugin (No PostCSS) |
| Node graph | `@xyflow/react` v12 | Modern, maintained version of React Flow |
| Schema validation | `zod` | Runtime-safe JoinState parsing |
| Testing | `jest` + `ts-jest` | Unit test CodeGenerator in isolation |
| Packaging | `@vscode/vsce` | Official marketplace publisher |

---

## Key Architectural Decisions

### Decision 1: Webview owns no persistent state
The Webview is stateless between panel hide/show. JoinState is always serialized and stored using `vscode.setState()` / `vscode.getState()` in the Webview, plus mirrored in the Extension Host's `WebviewManager` instance. On panel reveal, the Host re-posts the last known state to the Webview.

### Decision 2: CodeGenerator is a pure function
`CodeGenerator.ts` has zero VS Code API imports. It takes a `JoinState` object and returns a `string`. This makes it fully unit-testable with Jest without mocking VS Code.

### Decision 3: Dual-bundle architecture
The Extension Host (`src/`) and Webview UI (`webview-ui/`) are two completely separate build pipelines with separate `package.json` files. Running `npm install` at the root does NOT install Webview dependencies. The root `package.json` scripts must explicitly `cd webview-ui && npm install && npm run build` as part of the pre-publish step.

### Decision 4: Graceful degradation when no kernel is active
If no Jupyter kernel is running (e.g., the user opened the extension from a `.py` file with no active Python environment), the extension falls back to a **Manual Mode**: the Sidebar shows a `+ Add Table Manually` button, letting users type in table names and column names. The code generation still works perfectly.

---

## Extension Activation

```json
"activationEvents": [
  "onCommand:visual-join-builder.open",
  "onLanguage:python",
  "onNotebook:jupyter-notebook"
]
```

The extension activates lazily. It does NOT activate on VS Code startup.

---

## Commands Registered

| Command ID | Title | Context |
|---|---|---|
| `visual-join-builder.open` | ✨ Open Visual Join Builder | Always available |
| `visual-join-builder.openFromCell` | ✨ Visual Join | CodeLens on `.ipynb` cells |
| `visual-join-builder.refreshTables` | 🔄 Refresh DataFrames | Triggered from Webview Toolbar |

---

## Extension Dependencies (package.json)

```json
"extensionDependencies": ["ms-toolsai.jupyter"],
"extensionPack": []
```

The Jupyter extension must be present. If it is not installed, show a one-time notification with a direct install link. Do NOT crash.
