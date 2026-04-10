import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { TableNodeData } from './graphTypes';

function getDtypeStyles(dtype: string): string {
  const normalized = dtype.toLowerCase();
  if (normalized.includes('int')) {
    return 'bg-dtype-int/15 text-dtype-int';
  }
  if (normalized.includes('float') || normalized.includes('double') || normalized.includes('decimal')) {
    return 'bg-dtype-float/15 text-dtype-float';
  }
  if (normalized.includes('bool')) {
    return 'bg-dtype-bool/15 text-dtype-bool';
  }
  if (normalized.includes('date') || normalized.includes('time')) {
    return 'bg-dtype-datetime/15 text-dtype-datetime';
  }
  if (normalized.includes('str') || normalized.includes('object') || normalized.includes('char')) {
    return 'bg-dtype-str/15 text-dtype-str';
  }

  return 'bg-dtype-other/15 text-dtype-other';
}

export function TableNode({ id, data, selected }: NodeProps<Node<TableNodeData>>) {
  const nodeData = data as TableNodeData & { onDelete?: (nodeId: string) => void };
  const allSelected = data.table.columns.every((column) => data.selectedColumns[column.name]);

  return (
    <div
      className={`w-[200px] rounded-lg border bg-bg-elevated ${selected ? 'border-border-focus ring-2 ring-accent-dim' : 'border-border-default'}`}
    >
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${data.tableColorClass}`} aria-hidden="true" />
          <span className="font-mono text-sm font-semibold text-text-primary">{data.table.name}</span>
        </div>
        <button
          type="button"
          onClick={() => nodeData.onDelete?.(id)}
          className="text-text-muted hover:text-text-secondary"
        >
          ×
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-1.5 text-xs">
        <button
          type="button"
          onClick={() => data.onSelectAll(id, true)}
          className="rounded px-1.5 py-0.5 text-text-secondary hover:bg-bg-hover"
        >
          All
        </button>
        <button
          type="button"
          onClick={() => data.onSelectAll(id, false)}
          className="rounded px-1.5 py-0.5 text-text-secondary hover:bg-bg-hover"
        >
          None
        </button>
      </div>

      <div className="divide-y divide-border-subtle">
        {data.table.columns.map((column) => {
          const dtypeLabel = column.nullable ? `${column.dtype}?` : column.dtype;
          const checked = data.selectedColumns[column.name] ?? allSelected;
          return (
            <div key={column.name} className="relative flex items-center gap-2 px-3 py-1.5 min-h-7">
              <Handle
                id={`${column.name}-target`}
                type="target"
                position={Position.Left}
                className="!h-2 !w-2 !bg-border-focus !border !border-border-default"
              />
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => data.onToggleColumn(id, column.name, event.target.checked)}
                className="accent-accent h-3.5 w-3.5"
              />
              <span className="flex-1 truncate text-xs text-text-primary">{column.name}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${getDtypeStyles(column.dtype)}`}>
                {dtypeLabel}
              </span>
              <Handle
                id={`${column.name}-source`}
                type="source"
                position={Position.Right}
                className="!h-2 !w-2 !bg-border-focus !border !border-border-default"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
