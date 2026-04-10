# conflict_resolution.md — Phase Zero Conflict Log

This file records conflicts resolved during Phase Zero and the exact decisions applied.

## 1) Docs filename/path conflicts (Linux case-sensitive environment)

| Conflict | Resolution |
|---|---|
| Prompts referenced `docs/RULES.md`, `docs/ARCHITECTURE.md`, etc., while real files are lowercase (`docs/rules.md`, `docs/architecture.md`, etc.) | Normalized path references across docs and prompts to the real lowercase file names. |
| `architecture.md` canonical docs tree listed uppercase filenames that did not exist | Updated the tree to actual files present in this repository, including `checklist.md`, `audit.md`, and `Extension Prompts`. |

## 2) Webview security scope conflict

| Conflict | Resolution |
|---|---|
| Some docs required `localResourceRoots: [extensionUri]`; others required strict build root | Standardized to strict root: `localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'webview-ui', 'build')]` in guidance docs and prompts. |

## 3) Packaging command/script conflicts (`vsce` rename + script safety)

| Conflict | Resolution |
|---|---|
| Legacy `npx vsce ...` commands conflicted with `@vscode/vsce` guidance | Replaced publish/package instructions with `npx @vscode/vsce ... --no-dependencies`. |
| Guidance suggested overwriting root `"package"` script with vsce packaging | Standardized on dedicated scripts: `"vsce:package"` / `"vsce:publish"` to avoid breaking scaffold compile/prepublish flow. |

## 4) Webview API typing conflict

| Conflict | Resolution |
|---|---|
| One phase still used `import type { WebviewApi } from 'vscode-webview'` | Replaced with the correct global pattern: `ReturnType<typeof acquireVsCodeApi>`, aligned with `@types/vscode-webview`. |

## 5) React Flow package/version conflict

| Conflict | Resolution |
|---|---|
| Rule text still listed `reactflow` in Webview dependency examples | Updated to `@xyflow/react` consistently. |
| Phase prompt still referenced hooks “from reactflow” and outdated background usage | Updated to `@xyflow/react` imports and v12-compatible background snippet. |

## 6) Extension Prompts internal conflict (updated last)

| Conflict | Resolution |
|---|---|
| Pandas collision suffix instruction used `_x/_y`, conflicting with `codegen_spec.md` case definition | Updated prompt to use explicit `suffixes=('_users', '_orders')` per spec. |
| Phase 7 prompt used outdated package-script expectation | Updated to `vsce:package` / `vsce:publish` with `@vscode/vsce`. |

## 7) Environment/build readiness conflicts

| Conflict | Resolution |
|---|---|
| Root TypeScript included `webview-ui` files and failed with `TS6059` | Added root `tsconfig.json` `include`/`exclude` boundaries for `src`-only compilation. |
| Webview build output was `dist/` with hashed assets | Updated `webview-ui/vite.config.ts` to deterministic `build/assets/index.js` and `build/assets/index.css` output. |
| Missing required packages for planned phases | Installed/aligned: `@xyflow/react`, `@types/vscode-webview` (webview), and `@vscode/vsce` (root). |
| Webview still scaffold-style UI/CSS, not Phase-ready baseline | Replaced default Vite app shell with a minimal Visual Join Builder screen and Tailwind v4 tokenized `index.css`. |

## 8) Resulting readiness state

- Docs and prompts are now internally aligned for Phase execution.
- Root and webview dependency sets are aligned to current rules/audit decisions.
- Baseline compile, webview build, lint, and tests pass in this environment.
