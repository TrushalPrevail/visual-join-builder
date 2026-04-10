import type { JoinType, TableSchema } from '../../../src/types/joinState';

export const TABLE_DRAG_MIME = 'application/x-visual-join-builder-table';

export const TABLE_COLOR_CLASSES = [
  'bg-join-inner',
  'bg-join-left',
  'bg-join-right',
  'bg-join-outer',
  'bg-join-cross',
] as const;

export interface TableNodeData extends Record<string, unknown> {
  table: TableSchema;
  tableColorClass: string;
  selectedColumns: Record<string, boolean>;
  onToggleColumn: (nodeId: string, columnName: string, checked: boolean) => void;
  onSelectAll: (nodeId: string, checked: boolean) => void;
}

export interface JoinEdgeData extends Record<string, unknown> {
  joinType: JoinType;
  onJoinTypeChange: (edgeId: string, joinType: JoinType) => void;
}
