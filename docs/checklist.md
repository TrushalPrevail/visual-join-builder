# LAUNCH_CHECKLIST.md — Pre-Publish Verification

Complete every item before running `vsce publish`. Check off each one manually.

---

## 🔧 Build Health

- [ ] `npm run compile` exits with code 0 (Extension Host)
- [ ] `cd webview-ui && npm run build` exits with code 0
- [ ] `webview-ui/build/assets/index.js` exists with **no hash** in filename
- [ ] `webview-ui/build/assets/index.css` exists with **no hash** in filename
- [ ] `npm test` — all Jest tests pass (CodeGenerator unit tests)
- [ ] TypeScript strict mode: zero `@ts-ignore` comments in `src/`

---

## 🔒 Security

- [ ] Every Webview render call includes a fresh `nonce` (see RULES.md Rule 4)
- [ ] CSP meta tag is present in every HTML string returned by `WebviewManager`
- [ ] No hardcoded secrets, API keys, or user data in any file
- [ ] All Webview `localResourceRoots` restricted to `[extensionUri]` only
- [ ] `enableScripts: true` is the only non-default Webview option set

---

## 📦 Package Size

- [ ] Run `npx @vscode/vsce package --no-dependencies` and check the listed files
- [ ] `webview-ui/src/` is absent from the package (check `.vscodeignore`)
- [ ] `webview-ui/node_modules/` is absent from the package
- [ ] `src/__tests__/` is absent from the package
- [ ] `docs/` is absent from the package
- [ ] Final `.vsix` file is **under 5MB**
- [ ] Run `npx @vscode/vsce ls` to see exactly what gets packaged — review every file

---

## 🧩 VS Code Integration

- [ ] Extension activates cleanly: `F5` → no activation errors in Debug Console
- [ ] Command `visual-join-builder.open` appears in Command Palette (`Ctrl+Shift+P`)
- [ ] Panel opens beside the active editor (not replacing it)
- [ ] Opening the panel twice reveals the existing panel (not two panels)
- [ ] Panel survives switching to another file and back (state restored)
- [ ] CodeLens "✨ Visual Join" appears on `.ipynb` cells containing DataFrames
- [ ] CodeLens appears on `.py` files containing `pd.merge` or `pd.DataFrame`

---

## 📓 Notebook Insertion

- [ ] With `.ipynb` active: "Insert to Notebook" creates a new Python cell below the active cell
- [ ] With `.py` file active: "Insert to Notebook" inserts code at cursor position
- [ ] With no file open: warning notification appears, no crash
- [ ] Inserted Pandas code runs without error in a fresh kernel with the source DataFrames loaded
- [ ] Inserted DuckDB code runs without error (requires `duckdb` installed in env)
- [ ] Inserted PySpark code is syntactically valid (can't always test runtime)

---

## 🧪 Functional Testing

- [ ] Drag `df_users` from sidebar onto canvas → TableNode appears
- [ ] Drag `df_orders` from sidebar onto canvas → second TableNode appears
- [ ] Connect `df_users.id` handle to `df_orders.user_id` handle → edge appears
- [ ] Click the join type pill → Venn popover opens
- [ ] Click "LEFT JOIN" in popover → edge label updates, code panel updates
- [ ] Uncheck a column checkbox → column disappears from generated code
- [ ] Add an alias to a column → `.rename()` line appears in Pandas code
- [ ] Switch dialect to DuckDB → code panel shows SQL string
- [ ] Switch dialect to PySpark → code panel shows `.join()` chain
- [ ] Change output name to `merged` → variable name updates in code
- [ ] Expand Preview panel → spinner appears, then result table loads (with kernel active)
- [ ] Click "Refresh" in sidebar → sidebar re-polls kernel for DataFrames
- [ ] Drag 3 tables, create A→B and B→C joins → chained merge code generated correctly

---

## 🌐 Graceful Degradation

- [ ] No Jupyter extension installed → one-time notification with install link, no crash
- [ ] Jupyter extension installed but no kernel running → sidebar shows "No kernel · Manual mode"
- [ ] Kernel running but no DataFrames in memory → sidebar shows "No DataFrames found yet"
- [ ] Preview execution fails (Python error) → error message shown in Preview panel, no crash
- [ ] Network or kernel timeout → no infinite spinner; 10s timeout with error message

---

## 📋 Marketplace Requirements

- [ ] `package.json` has `"publisher"` field set
- [ ] `package.json` has `"icon"` pointing to a 128×128 PNG at `media/icon.png`
- [ ] `package.json` has `"license"` field (e.g., `"MIT"`)
- [ ] `package.json` has `"repository"` field pointing to GitHub repo
- [ ] `README.md` has at least one screenshot or GIF demonstrating the extension
- [ ] `README.md` has a "Requirements" section listing VS Code, Python, and Jupyter extensions
- [ ] `CHANGELOG.md` exists with at least `## [0.1.0]` entry
- [ ] Extension name and description in `package.json` do not contain "Microsoft", "VS Code", or trademark terms
- [ ] `engines.vscode` minimum version is `^1.85.0` (first version with stable `NotebookEdit` API)

---

## 🚀 Final Publish Steps

```bash
# 1. Bump version
npm version patch  # or minor/major

# 2. Build everything
npm run prebuild   # builds webview-ui
npm run compile    # builds extension host

# 3. Package
npx vsce package

# 4. Inspect the .vsix
npx vsce ls  # verify file list

# 5. Install locally for one last test
code --install-extension visual-join-builder-*.vsix

# 6. Publish (requires vsce login first)
npx vsce publish
```
