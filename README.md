# Visual Join Builder

[☕ Buy me a coffee](https://ko-fi.com/trushalprevail)

Visual Join Builder is a VS Code extension for building DataFrame joins visually and generating production-ready code for **Pandas**, **DuckDB**, and **PySpark**.

## What it does

- Drag DataFrames from the sidebar onto a visual canvas.
- Connect table columns to create joins.
- Change join types from:
  - edge join controls,
  - interactive Venn mode,
  - selected-edge Venn overlay editing.
- See generated code update in real time.
- Preview results from the active Jupyter kernel.
- Insert generated code directly into a notebook or Python editor.

## Key features

- **Live kernel integration**: detects DataFrames from the active/visible Jupyter notebook kernel.
- **Manual mode fallback**: UI remains usable even when no kernel is active.
- **Join graph UX**:
  - auto-arranged table drops,
  - auto-fit canvas behavior,
  - edge and node deletion support,
  - floating control panels.
- **Interactive Venn editor**:
  - clickable left/intersection/right regions,
  - smart mapping to INNER/LEFT/RIGHT/FULL OUTER joins,
  - guidance for unsupported region combinations.
- **Code generation engine**:
  - Pandas merge chains with collision handling,
  - DuckDB SQL via `duckdb.sql(query).df()`,
  - PySpark chained `.join()` and `.select()`.

## Commands

- `visual-join-builder.open` — Open Visual Join Builder.
- `visual-join-builder.openFromCell` — Open from notebook/Python context.

## CodeLens

The extension adds a `✨ Visual Join` CodeLens in notebook/Python files when Pandas usage is detected.

## Requirements

- VS Code `^1.85.0`
- Python/Jupyter extension (`ms-toolsai.jupyter`) for live kernel table discovery and preview

## Packaging

- Native sponsor metadata is configured in `package.json` (`sponsor.url`) so VS Code can show the sponsor heart on the extension page.
- Marketplace packaging uses `.vscodeignore` to include runtime artifacts and exclude development files.

## License

See repository license and metadata files for distribution details.

