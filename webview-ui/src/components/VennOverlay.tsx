import { useId } from 'react';
import type { JoinType } from '../../../src/types/joinState';

interface VennOverlayProps {
  edgeId: string | null;
  joinType?: JoinType;
  leftTableName?: string;
  rightTableName?: string;
  onJoinTypeChange: (joinType: JoinType) => void;
  onRemoveJoin: () => void;
  onClose: () => void;
}

const JOIN_TYPE_OPTIONS: JoinType[] = ['inner', 'left', 'right', 'outer', 'cross'];

function getJoinTypeColorClass(type: JoinType): string {
  if (type === 'left') {
    return 'text-join-left';
  }
  if (type === 'right') {
    return 'text-join-right';
  }
  if (type === 'outer') {
    return 'text-join-outer';
  }
  if (type === 'cross') {
    return 'text-join-cross';
  }
  return 'text-join-inner';
}

function VennIcon({ joinType, active }: { joinType: JoinType; active: boolean }) {
  const uniqueId = useId().replace(/:/g, '');
  const leftClipId = `${uniqueId}-left`;
  const rightClipId = `${uniqueId}-right`;

  return (
    <svg viewBox="0 0 36 32" className={`h-6 w-6 ${active ? 'opacity-100' : 'opacity-75'}`} aria-hidden="true">
      <defs>
        <clipPath id={leftClipId}>
          <circle cx="14" cy="16" r="8" />
        </clipPath>
        <clipPath id={rightClipId}>
          <circle cx="22" cy="16" r="8" />
        </clipPath>
      </defs>

      {(joinType === 'left' || joinType === 'outer' || joinType === 'cross') && (
        <circle cx="14" cy="16" r="8" fill="currentColor" fillOpacity={joinType === 'cross' ? 0.45 : 0.28} />
      )}
      {(joinType === 'right' || joinType === 'outer' || joinType === 'cross') && (
        <circle cx="22" cy="16" r="8" fill="currentColor" fillOpacity={joinType === 'cross' ? 0.45 : 0.28} />
      )}
      {joinType === 'inner' && (
        <g clipPath={`url(#${leftClipId})`}>
          <circle cx="22" cy="16" r="8" fill="currentColor" fillOpacity="0.45" />
        </g>
      )}

      <circle cx="14" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="22" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function getJoinTypeLabel(type: JoinType): string {
  if (type === 'outer') {
    return 'OUTER';
  }
  return type.toUpperCase();
}

export function VennOverlay({
  edgeId,
  joinType,
  leftTableName,
  rightTableName,
  onJoinTypeChange,
  onRemoveJoin,
  onClose,
}: VennOverlayProps) {
  const hasSelectedEdge = Boolean(edgeId);
  const activeJoinType = joinType ?? 'inner';
  const leftName = leftTableName ?? 'Left table';
  const rightName = rightTableName ?? 'Right table';

  return (
    <aside className="rounded-xl border border-border-default bg-bg-overlay/95 p-2 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] tracking-[0.1em] uppercase text-text-muted">Venn Mode</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-border-default px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
          aria-label="Close Venn overlay"
        >
          ×
        </button>
      </div>

      {!hasSelectedEdge && (
        <div className="rounded border border-dashed border-border-subtle bg-bg-elevated px-2 py-2 text-xs text-text-secondary">
          Select a join line on the canvas to edit it here.
        </div>
      )}

      {hasSelectedEdge && (
        <>
          <div className="mb-2 rounded border border-border-subtle bg-bg-elevated px-2 py-1.5">
            <div className="truncate font-mono text-xs text-text-primary">
              {leftName} ↔ {rightName}
            </div>
            <div className="truncate text-[10px] text-text-muted">{edgeId}</div>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {JOIN_TYPE_OPTIONS.map((type) => {
              const active = type === activeJoinType;
              const colorClass = getJoinTypeColorClass(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onJoinTypeChange(type)}
                  className={`flex flex-col items-center rounded border px-1 py-1 text-[9px] font-mono ${active ? 'border-border-focus bg-accent-dim' : 'border-border-subtle bg-bg-elevated hover:bg-bg-hover'} ${colorClass}`}
                >
                  <VennIcon joinType={type} active={active} />
                  <span>{getJoinTypeLabel(type)}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onRemoveJoin}
            className="mt-2 w-full rounded border border-status-warn px-2 py-1 text-xs text-status-warn hover:bg-status-warn/10"
          >
            Remove Join
          </button>
        </>
      )}
    </aside>
  );
}
