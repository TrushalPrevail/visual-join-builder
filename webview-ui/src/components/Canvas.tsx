import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, type DragEvent } from 'react';
import type { JoinType, TableSchema } from '../../../src/types/joinState';
import { JoinEdge } from './JoinEdge';
import { TABLE_COLOR_CLASSES, TABLE_DRAG_MIME, type JoinEdgeData, type TableNodeData } from './graphTypes';
import { TableNode } from './TableNode';
import '@xyflow/react/dist/style.css';

interface CanvasProps {
  tables: TableSchema[];
  clearVersion: number;
  onGraphChange: (nodes: Node<TableNodeData>[], edges: Edge<JoinEdgeData>[]) => void;
}

const nodeTypes = {
  tableNode: TableNode,
};

const edgeTypes = {
  joinEdge: JoinEdge,
};

export function Canvas({ tables, clearVersion, onGraphChange }: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<JoinEdgeData>>([]);
  const joinTypeChangeRef = useRef<(edgeId: string, joinType: JoinType) => void>(() => undefined);

  const onToggleColumn = useCallback((nodeId: string, columnName: string, checked: boolean) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            selectedColumns: {
              ...node.data.selectedColumns,
              [columnName]: checked,
            },
          },
        };
      }),
    );
  }, [setNodes]);

  const onSelectAll = useCallback((nodeId: string, checked: boolean) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        const selectedColumns = Object.fromEntries(
          node.data.table.columns.map((column) => [column.name, checked]),
        );

        return {
          ...node,
          data: {
            ...node.data,
            selectedColumns,
          },
        };
      }),
    );
  }, [setNodes]);

  const onDeleteNode = useCallback((nodeId: string) => {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    );
  }, [setEdges, setNodes]);

  const onJoinTypeChange = useCallback((edgeId: string, joinType: JoinType) => {
    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        if (edge.id !== edgeId) {
          return edge;
        }

        return {
          ...edge,
          data: {
            ...(edge.data as JoinEdgeData),
            joinType,
            onJoinTypeChange: joinTypeChangeRef.current,
          },
        };
      }),
    );
  }, [setEdges]);

  useEffect(() => {
    joinTypeChangeRef.current = onJoinTypeChange;
  }, [onJoinTypeChange]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((currentEdges) =>
      addEdge<Edge<JoinEdgeData>>(
        {
          ...connection,
          id: `join-${Date.now()}`,
          type: 'joinEdge',
          data: { joinType: 'inner', onJoinTypeChange, isNew: true },
        },
        currentEdges,
      ),
    );
  }, [onJoinTypeChange, setEdges]);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const tableName = event.dataTransfer.getData(TABLE_DRAG_MIME);
    const table = tables.find((entry) => entry.name === tableName);

    if (!table) {
      return;
    }

    const selectedColumns = Object.fromEntries(table.columns.map((column) => [column.name, true]));

    setNodes((currentNodes) => {
      const nodeId = `${table.name}-${Date.now()}-${currentNodes.length}`;
      const tableColorClass = TABLE_COLOR_CLASSES[currentNodes.length % TABLE_COLOR_CLASSES.length] ?? 'bg-accent';
      const position = { x: (currentNodes.length * 280) + 50, y: 100 };

      return [
        ...currentNodes,
        {
          id: nodeId,
          type: 'tableNode',
          position,
          data: {
            table,
            tableColorClass,
            selectedColumns,
            onToggleColumn,
            onSelectAll,
            onDelete: onDeleteNode,
          },
        },
      ];
    });
  }, [onDeleteNode, onSelectAll, onToggleColumn, setNodes, tables]);

  useEffect(() => {
    onGraphChange(nodes, edges);
  }, [edges, nodes, onGraphChange]);

  useEffect(() => {
    setNodes([]);
    setEdges([]);
  }, [clearVersion, setEdges, setNodes]);

  const minimapNodeStrokeColor = useMemo(() => 'var(--color-border-focus)', []);

  return (
    <div className="flex-1 min-w-0 bg-bg-base" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow<Node<TableNodeData>, Edge<JoinEdgeData>>
        colorMode="dark"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        elementsSelectable={true}
        fitView
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={[20, 20]}
          size={1.5}
          color="var(--color-border-subtle)"
        />
        <Controls className="!bg-bg-surface !border !border-border-subtle !shadow-none" />
        <MiniMap
          className="!bg-bg-surface !border !border-border-subtle"
          pannable
          zoomable
          nodeStrokeColor={minimapNodeStrokeColor}
          nodeColor="var(--color-bg-elevated)"
        />
      </ReactFlow>
    </div>
  );
}
