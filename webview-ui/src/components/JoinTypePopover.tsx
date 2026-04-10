import { useEffect, useId, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { JoinType } from '../../../src/types/joinState';

interface JoinTypePopoverProps {
  currentType: JoinType;
  onSelect: (joinType: JoinType) => void;
  onClose: () => void;
  style: CSSProperties;
}

function VennIcon({ joinType, active }: { joinType: JoinType; active: boolean }) {
  const uniqueId = useId().replace(/:/g, '');
  const leftClipId = `${uniqueId}-left`;
  const rightClipId = `${uniqueId}-right`;

  return (
    <svg viewBox="0 0 36 32" className={`h-10 w-10 ${active ? 'opacity-100' : 'opacity-75'}`} aria-hidden="true">
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

function getJoinTypeColorClass(joinType: JoinType): string {
  if (joinType === 'left') {
    return 'text-join-left';
  }
  if (joinType === 'right') {
    return 'text-join-right';
  }
  if (joinType === 'outer') {
    return 'text-join-outer';
  }
  if (joinType === 'cross') {
    return 'text-join-cross';
  }
  return 'text-join-inner';
}

function getJoinTypeLabel(joinType: JoinType): string {
  if (joinType === 'outer') {
    return 'FULL OUTER';
  }
  return `${joinType.toUpperCase()}`;
}

const JOIN_TYPE_OPTIONS: JoinType[] = ['inner', 'left', 'right', 'outer', 'cross'];

export function JoinTypePopover({ currentType, onSelect, onClose, style }: JoinTypePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      style={style}
      className="absolute z-20 w-[280px] rounded-lg border border-border-default bg-bg-overlay p-3 shadow-lg"
    >
      <div className="grid grid-cols-3 gap-2">
        {JOIN_TYPE_OPTIONS.map((joinType) => {
          const active = currentType === joinType;
          const colorClass = getJoinTypeColorClass(joinType);
          return (
            <button
              key={joinType}
              type="button"
              onClick={() => onSelect(joinType)}
              className={`flex flex-col items-center rounded-md border px-2 py-2 text-[11px] font-mono ${active ? 'border-border-focus bg-accent-dim' : 'border-border-subtle bg-bg-elevated hover:bg-bg-hover'} ${colorClass}`}
            >
              <VennIcon joinType={joinType} active={active} />
              <span>{getJoinTypeLabel(joinType)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
