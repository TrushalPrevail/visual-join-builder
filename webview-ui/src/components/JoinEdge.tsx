import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { useMemo, useState } from 'react';
import type { JoinType } from '../../../src/types/joinState';
import type { JoinEdgeData } from './graphTypes';
import { JoinTypePopover } from './JoinTypePopover';

function getJoinTypeColorClass(joinType: JoinType): string {
  if (joinType === 'left') {
    return 'text-join-left border-join-left';
  }
  if (joinType === 'right') {
    return 'text-join-right border-join-right';
  }
  if (joinType === 'outer') {
    return 'text-join-outer border-join-outer';
  }
  if (joinType === 'cross') {
    return 'text-join-cross border-join-cross';
  }
  return 'text-join-inner border-join-inner';
}

function getJoinTypeLabel(joinType: JoinType): string {
  return joinType.toUpperCase();
}

export function JoinEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const edgeData = (data as (JoinEdgeData & { isNew?: boolean }) | undefined);
  const [open, setOpen] = useState(() => Boolean(edgeData?.isNew));
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const joinType = edgeData?.joinType ?? 'inner';
  const joinTypeClass = useMemo(() => getJoinTypeColorClass(joinType), [joinType]);
  const strokeColor = `var(--color-join-${joinType})`;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: strokeColor, strokeDasharray: '7 5', strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className={`rounded-full border bg-bg-overlay px-1.5 py-[1px] text-[10px] font-mono ${joinTypeClass}`}
          >
            {getJoinTypeLabel(joinType)}
          </button>
          {open && (
            <JoinTypePopover
              currentType={joinType}
              onSelect={(nextType) => {
                edgeData?.onJoinTypeChange(id, nextType);
                setOpen(false);
              }}
              onClose={() => setOpen(false)}
              style={{
                left: '50%',
                top: 'calc(100% + 4px)',
                transform: 'translateX(-50%)',
              }}
            />
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
