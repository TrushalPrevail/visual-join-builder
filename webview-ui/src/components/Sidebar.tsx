import type { TableSchema } from '../../../src/types/joinState';
import { TABLE_COLOR_CLASSES, TABLE_DRAG_MIME } from './graphTypes';

interface SidebarProps {
  tables: TableSchema[];
  kernelActive: boolean;
  kernelName?: string;
  onRefresh: () => void;
  floating?: boolean;
  onClose?: () => void;
}

export function Sidebar({ tables, kernelActive, kernelName, onRefresh, floating = false, onClose }: SidebarProps) {
  const noTables = tables.length === 0;
  const containerClass = floating
    ? 'h-full w-full rounded-xl border border-border-default bg-bg-overlay/95 shadow-xl backdrop-blur flex flex-col'
    : 'w-[180px] shrink-0 border-r border-border-subtle bg-bg-surface flex flex-col';

  return (
    <aside className={containerClass}>
      <div className="px-3 py-3 border-b border-border-subtle flex items-center justify-between">
        <span className="text-[10px] tracking-[0.1em] uppercase text-text-muted">DataFrames</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs rounded border border-border-default px-2 py-1 text-text-secondary hover:bg-bg-hover"
          >
            Refresh
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border-default px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
              aria-label="Close DataFrames panel"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {noTables ? (
          <div className="rounded-md border border-dashed border-border-default bg-bg-elevated p-3 text-xs text-text-secondary">
            {kernelActive ? 'No DataFrames found yet. Run your cells first.' : 'No kernel — Manual mode'}
          </div>
        ) : (
          tables.map((table, index) => {
            const colorClass = TABLE_COLOR_CLASSES[index % TABLE_COLOR_CLASSES.length] ?? 'bg-accent';
            return (
              <button
                key={table.name}
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData(TABLE_DRAG_MIME, table.name);
                }}
                className="w-full rounded-md border border-transparent px-3 py-2 text-left hover:bg-bg-hover hover:border-border-subtle cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${colorClass}`} aria-hidden="true" />
                    <span className="font-mono text-sm text-text-primary">{table.name}</span>
                  </div>
                  <span className="text-xs text-text-muted">{table.columns.length} cols</span>
                </div>
                <div className="mt-1 text-xs text-text-muted truncate">
                  {table.columns.map((column) => column.dtype).join(' · ')}
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className="border-t border-border-subtle p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span
            className={`h-2 w-2 rounded-full ${kernelActive ? 'bg-status-ok' : 'bg-text-muted'}`}
            aria-hidden="true"
          />
          <span>{kernelActive ? `Kernel active${kernelName ? ` (${kernelName})` : ''}` : 'No kernel · Manual mode'}</span>
        </div>
        {!kernelActive && (
          <button
            type="button"
            className="w-full rounded-md border border-dashed border-border-default px-2 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
          >
            + Add Table
          </button>
        )}
      </div>
    </aside>
  );
}
