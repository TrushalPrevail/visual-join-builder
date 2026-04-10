import type { Edge, Node } from '@xyflow/react';
import { useMemo } from 'react';
import type { Dialect, JoinClause, JoinState, SelectedColumn } from '../../../src/types/joinState';
import type { JoinEdgeData, TableNodeData } from '../components/graphTypes';

interface UseJoinStateArgs {
  nodes: Node<TableNodeData>[];
  edges: Edge<JoinEdgeData>[];
  outputName: string;
  dialect: Dialect;
}

function getColumnFromHandle(handleId: string | null | undefined): string {
  if (!handleId) {
    return '';
  }

  return handleId.replace(/-(source|target)$/u, '');
}

export function useJoinState({ nodes, edges, outputName, dialect }: UseJoinStateArgs): JoinState {
  return useMemo(() => {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    const tables = nodes.map((node) => node.data.table);

    const joins = edges.reduce<JoinClause[]>((accumulator, edge) => {
      if (!edge.source || !edge.target) {
        return accumulator;
      }

      const sourceNode = nodeById.get(edge.source);
      const targetNode = nodeById.get(edge.target);
      if (!sourceNode || !targetNode) {
        return accumulator;
      }

      const leftColumn = getColumnFromHandle(edge.sourceHandle);
      const rightColumn = getColumnFromHandle(edge.targetHandle);
      if (!leftColumn || !rightColumn) {
        return accumulator;
      }

      accumulator.push({
        id: edge.id,
        leftTable: sourceNode.data.table.name,
        leftColumn,
        rightTable: targetNode.data.table.name,
        rightColumn,
        joinType: edge.data?.joinType ?? 'inner',
      });

      return accumulator;
    }, []);

    const selectedColumns = nodes.reduce<SelectedColumn[]>((accumulator, node) => {
      Object.entries(node.data.selectedColumns).forEach(([columnName, selected]) => {
        if (selected) {
          accumulator.push({
            table: node.data.table.name,
            column: columnName,
            alias: null,
          });
        }
      });

      return accumulator;
    }, []);

    return {
      tables,
      joins,
      selectedColumns,
      outputName: outputName.trim() || 'result_df',
      dialect,
    };
  }, [dialect, edges, nodes, outputName]);
}
