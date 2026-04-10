import type { Dialect } from '../../../src/types/joinState';

interface ToolbarProps {
  outputName: string;
  onOutputNameChange: (value: string) => void;
  dialect: Dialect;
  onDialectChange: (dialect: Dialect) => void;
  onClearCanvas: () => void;
  onCopyCode: () => void;
  onInsert: () => void;
  insertDisabled: boolean;
  copyLabel: string;
}

const DIALECT_OPTIONS: Dialect[] = ['pandas', 'duckdb', 'pyspark'];

export function Toolbar({
  outputName,
  onOutputNameChange,
  dialect,
  onDialectChange,
  onClearCanvas,
  onCopyCode,
  onInsert,
  insertDisabled,
  copyLabel,
}: ToolbarProps) {
  return (
    <header className="h-12 shrink-0 border-b border-border-subtle bg-bg-surface px-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="text-text-muted">→</span>
          <input
            value={outputName}
            onChange={(event) => onOutputNameChange(event.target.value)}
            className="w-36 rounded border border-border-default bg-bg-elevated px-2 py-1 text-sm font-mono text-text-primary outline-none focus:border-border-focus"
            placeholder="result_df"
          />
        </label>
        <div className="flex items-center rounded-md border border-border-default bg-bg-elevated p-0.5">
          {DIALECT_OPTIONS.map((option) => {
            const active = dialect === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onDialectChange(option)}
                className={`rounded px-2 py-1 text-xs capitalize ${active ? 'bg-accent-dim text-accent border border-border-focus' : 'text-text-secondary hover:bg-bg-hover'}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClearCanvas}
          className="rounded border border-border-default px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
        >
          Clear Canvas
        </button>
        <button
          type="button"
          onClick={onCopyCode}
          className="rounded border border-border-default px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
        >
          {copyLabel}
        </button>
        <button
          type="button"
          disabled={insertDisabled}
          onClick={onInsert}
          className="rounded bg-accent px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
        >
          Insert to Notebook
        </button>
      </div>
    </header>
  );
}
