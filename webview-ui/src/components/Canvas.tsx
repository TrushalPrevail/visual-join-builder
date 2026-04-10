import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type ReactFlowInstance,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, type Dispatch, type DragEvent, type MouseEvent as ReactMouseEvent, type SetStateAction } from 'react';
import type { JoinType, TableSchema } from '../../../src/types/joinState';
import { JoinEdge } from './JoinEdge';
import { TABLE_COLOR_CLASSES, TABLE_DRAG_MIME, type JoinEdgeData, type TableNodeData } from './graphTypes';
import { TableNode } from './TableNode';
import '@xyflow/react/dist/style.css';

interface CanvasProps {
  tables: TableSchema[];
  nodes: Node<TableNodeData>[];
  edges: Edge<JoinEdgeData>[];
  setNodes: Dispatch<SetStateAction<Node<TableNodeData>[]>>;
  setEdges: Dispatch<SetStateAction<Edge<JoinEdgeData>[]>>;
  selectedEdgeId?: string | null;
  onJoinCreated?: (edgeId: string) => void;
  onEdgeSelected?: (edgeId: string | null) => void;
}

const nodeTypes = {
  tableNode: TableNode,
};

const edgeTypes = {
  joinEdge: JoinEdge,
};

export function Canvas({
  tables,
  nodes,
  edges,
  setNodes,
  setEdges,
  selectedEdgeId,
  onJoinCreated,
  onEdgeSelected,
}: CanvasProps) {
  const joinTypeChangeRef = useRef<(edgeId: string, joinType: JoinType) => void>(() => undefined);
  const reactFlowRef = useRef<ReactFlowInstance<Node<TableNodeData>, Edge<JoinEdgeData>> | null>(null);

  const onNodesChange = useCallback((changes: NodeChange<Node<TableNodeData>>[]) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, [setNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge<JoinEdgeData>>[]) => {
    setEdges((currentEdges) => {
      const nextEdges = applyEdgeChanges(changes, currentEdges);
      if (selectedEdgeId && !nextEdges.some((edge) => edge.id === selectedEdgeId)) {
        onEdgeSelected?.(null);
      }
      return nextEdges;
    });
  }, [onEdgeSelected, selectedEdgeId, setEdges]);

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
    setEdges((currentEdges) => {
      const nextEdges = currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
      if (selectedEdgeId && !nextEdges.some((edge) => edge.id === selectedEdgeId)) {
        onEdgeSelected?.(null);
      }
      return nextEdges;
    });
  }, [onEdgeSelected, selectedEdgeId, setEdges, setNodes]);

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
    const edgeId = `join-${Date.now()}`;
    setEdges((currentEdges) =>
      addEdge<Edge<JoinEdgeData>>(
        {
          ...connection,
          id: edgeId,
          type: 'joinEdge',
          data: { joinType: 'inner', onJoinTypeChange, isNew: true },
        },
        currentEdges,
      ),
    );
    onJoinCreated?.(edgeId);
    onEdgeSelected?.(edgeId);
  }, [onEdgeSelected, onJoinCreated, onJoinTypeChange, setEdges]);

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
      const position = { x: (currentNodes.length * 360) + 80, y: 100 };

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

  const onEdgeClick = useCallback((_event: ReactMouseEvent, edge: Edge<JoinEdgeData>) => {
    onEdgeSelected?.(edge.id);
  }, [onEdgeSelected]);

  const onPaneClick = useCallback(() => {
    onEdgeSelected?.(null);
  }, [onEdgeSelected]);

  useEffect(() => {
    if (nodes.length === 0) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      void reactFlowRef.current?.fitView({ padding: 0.3, duration: 220, maxZoom: 1.1 });
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [nodes.length]);

  const minimapNodeStrokeColor = useMemo(() => 'var(--color-border-focus)', []);

  return (
    <div className="h-full w-full min-w-0 bg-bg-base" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow<Node<TableNodeData>, Edge<JoinEdgeData>>
        colorMode="dark"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        elementsSelectable={true}
        fitView
        onInit={(instance) => {
          reactFlowRef.current = instance;
        }}
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
