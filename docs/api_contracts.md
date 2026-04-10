# API_CONTRACTS.md — Message Passing & Type Contracts

> This is the **single source of truth** for all data shapes. If you need to add a new message type, update this file first, then update `src/types/messages.ts` and `webview-ui/src/hooks/useVSCodeMessage.ts` to match.

---

## JoinState AST (The Core Data Structure)

This JSON object is the complete representation of everything the user has done on the canvas. It travels between the Webview and the Extension Host, and is fed directly to the `CodeGenerator`.

```typescript
// src/types/joinState.ts

export type Dialect = 'pandas' | 'duckdb' | 'pyspark';

export type JoinType = 'inner' | 'left' | 'right' | 'outer' | 'cross';

export interface ColumnSchema {
  name: string;
  dtype: string;       // e.g. 'int64', 'object', 'datetime64[ns]', 'float64'
  nullable: boolean;
}

export interface TableSchema {
  name: string;        // Python variable name of the DataFrame
  columns: ColumnSchema[];
}

export interface JoinClause {
  id: string;          // unique ID for the edge (from ReactFlow edge.id)
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
  joinType: JoinType;
}

export interface SelectedColumn {
  table: string;
  column: string;
  alias: string | null;  // null means no rename
}

export interface JoinState {
  tables: TableSchema[];        // all tables on the canvas
  joins: JoinClause[];          // all edges (connections)
  selectedColumns: SelectedColumn[];  // checked columns across all tables
  outputName: string;           // e.g. 'result_df'
  dialect: Dialect;
}
```

**Empty / default JoinState:**
```typescript
const DEFAULT_JOIN_STATE: JoinState = {
  tables: [],
  joins: [],
  selectedColumns: [],
  outputName: 'result_df',
  dialect: 'pandas'
};
```

---

## Webview → Extension Host Messages

```typescript
// src/types/messages.ts

export type WebviewToHostMessage =
  | {
      command: 'ready';
      // Sent once on mount. Host responds with restoreState + kernelStatus.
    }
  | {
      command: 'insertCode';
      payload: { code: string };
      // User clicked "Insert to Notebook". Host calls NotebookInserter.
    }
  | {
      command: 'requestTables';
      // User clicked "Refresh". Host calls TableDiscovery.forceRefresh().
    }
  | {
      command: 'requestPreview';
      payload: { joinState: JoinState };
      // User expanded Preview panel. Host executes join silently in kernel.
    }
  | {
      command: 'saveState';
      payload: { joinState: JoinState };
      // Canvas state changed. Host stores it for panel resurrection.
      // Debounce: fire at most once per 500ms.
    };
```

---

## Extension Host → Webview Messages

```typescript
export type HostToWebviewMessage =
  | {
      command: 'loadTables';
      payload: { tables: TableSchema[] };
      // Sent when kernel returns DataFrame list. Replaces sidebar content.
    }
  | {
      command: 'previewResult';
      payload: { html: string; rowCount: number };
      // Sent after executePreview completes successfully.
    }
  | {
      command: 'previewError';
      payload: { message: string };
      // Sent if the preview execution raised an exception.
    }
  | {
      command: 'restoreState';
      payload: { joinState: JoinState };
      // Sent on panel reveal if Host has saved state from previous session.
    }
  | {
      command: 'kernelStatus';
      payload: { active: boolean; kernelName?: string };
      // Sent on panel open and whenever kernel status changes.
    };
```

---

## Message Flow Diagrams

### On Panel Open
```
Webview mounts
    │
    ├─→ [ready] ──────────────────────────────→ Extension Host
    │                                                   │
    │                                          checks saved state
    │                                          checks kernel
    │                                                   │
    │   [restoreState]  ←────────────────────────────── │  (if state exists)
    │   [kernelStatus]  ←────────────────────────────── │
    │   [loadTables]    ←────────────────────────────── │  (if kernel active)
    │
    Webview updates UI
```

### On Canvas Change
```
User draws join edge
    │
    ├─ Webview: recalculate JoinState
    ├─ Webview: re-run generateCode(joinState) locally (instant, no IPC)
    ├─ CodePanel updates immediately
    │
    └─→ [saveState] ──→ Extension Host  (debounced 500ms)
                               │
                         stores in memory
```

### On "Insert to Notebook"
```
User clicks Insert
    │
    ├─→ [insertCode { code }] ──→ Extension Host
    │                                    │
    │                          NotebookInserter.insertCode()
    │                                    │
    │                          vscode.WorkspaceEdit applied
    │                                    │
    │                          vscode.showInformationMessage()
    │
    Webview button flashes green for 1.5s
```

### On Preview Expand
```
User expands Preview panel
    │
    ├─ Webview shows spinner
    ├─→ [requestPreview { joinState }] ──→ Extension Host
    │                                              │
    │                                  JupyterKernel.executePreview()
    │                                              │
    │   [previewResult { html, rowCount }] ←────── │  (success)
    │   [previewError { message }]         ←────── │  (failure)
    │
    Webview renders table or error
```

---

## Zod Schema (Runtime Validation)

Use this in `WebviewManager.ts` to safely parse incoming messages before acting on them.

```typescript
// src/types/schemas.ts
import { z } from 'zod';

const ColumnSchemaZ = z.object({
  name: z.string(),
  dtype: z.string(),
  nullable: z.boolean()
});

const TableSchemaZ = z.object({
  name: z.string(),
  columns: z.array(ColumnSchemaZ)
});

const JoinClauseZ = z.object({
  id: z.string(),
  leftTable: z.string(),
  leftColumn: z.string(),
  rightTable: z.string(),
  rightColumn: z.string(),
  joinType: z.enum(['inner', 'left', 'right', 'outer', 'cross'])
});

const SelectedColumnZ = z.object({
  table: z.string(),
  column: z.string(),
  alias: z.string().nullable()
});

export const JoinStateZ = z.object({
  tables: z.array(TableSchemaZ),
  joins: z.array(JoinClauseZ),
  selectedColumns: z.array(SelectedColumnZ),
  outputName: z.string().optional().default('result_df'), // Fallback if empty
  dialect: z.enum(['pandas', 'duckdb', 'pyspark'])
});

export const WebviewMessageZ = z.discriminatedUnion('command', [
  z.object({ command: z.literal('ready') }),
  z.object({ command: z.literal('insertCode'), payload: z.object({ code: z.string() }) }),
  z.object({ command: z.literal('requestTables') }),
  z.object({ command: z.literal('requestPreview'), payload: z.object({ joinState: JoinStateZ }) }),
  z.object({ command: z.literal('saveState'), payload: z.object({ joinState: JoinStateZ }) })
]);
```

Usage in `WebviewManager.ts`:
```typescript
webview.onDidReceiveMessage((raw) => {
  const result = WebviewMessageZ.safeParse(raw);
  if (!result.success) {
    console.error('Invalid message from Webview:', result.error);
    return;
  }
  const msg = result.data;
  // now msg is fully typed and safe
  switch (msg.command) { ... }
});
```

---

## State Persistence Contract

The Webview MUST call `vscode.setState()` every time `JoinState` changes (debounced at 500ms). It MUST call `vscode.getState()` on mount to restore if the state exists before sending the `ready` message.

```typescript
// webview-ui/src/lib/vscodeApi.ts
export function persistState(state: JoinState) {
  getVSCodeApi().setState(state);
}

export function getPersistedState(): JoinState | undefined {
  return getVSCodeApi().getState() as JoinState | undefined;
}
```

On mount in `App.tsx`:
```typescript
useEffect(() => {
  const saved = getPersistedState();
  if (saved) {
    // restore from local vscode state first (immediate, no round-trip)
    dispatch({ type: 'RESTORE', payload: saved });
  }
  // then tell host we're ready (host may send a newer state or table list)
  sendMessage({ command: 'ready' });
}, []);
```
