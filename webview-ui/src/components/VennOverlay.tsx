import { useCallback, useId, useMemo, useState } from 'react';
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

type VennRegion = 'leftOnly' | 'intersection' | 'rightOnly';

interface HintMessage {
  tone: 'info' | 'warn';
  text: string;
}

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

function getJoinTypeLabel(type: JoinType): string {
  if (type === 'outer') {
    return 'FULL OUTER';
  }
  return type.toUpperCase();
}

function getRegionsForJoinType(joinType: JoinType): Set<VennRegion> {
  if (joinType === 'inner') {
    return new Set<VennRegion>(['intersection']);
  }
  if (joinType === 'left') {
    return new Set<VennRegion>(['leftOnly', 'intersection']);
  }
  if (joinType === 'right') {
    return new Set<VennRegion>(['intersection', 'rightOnly']);
  }
  if (joinType === 'outer') {
    return new Set<VennRegion>(['leftOnly', 'intersection', 'rightOnly']);
  }

  return new Set<VennRegion>();
}

function resolveJoinTypeFromRegions(regions: Set<VennRegion>): JoinType | null {
  const left = regions.has('leftOnly');
  const intersection = regions.has('intersection');
  const right = regions.has('rightOnly');

  if (!left && intersection && !right) {
    return 'inner';
  }
  if (left && intersection && !right) {
    return 'left';
  }
  if (!left && intersection && right) {
    return 'right';
  }
  if (left && intersection && right) {
    return 'outer';
  }

  return null;
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
  const [hint, setHint] = useState<HintMessage | null>(null);
  const activeColor = useMemo(
    () => `var(--color-join-${activeJoinType === 'cross' ? 'inner' : activeJoinType})`,
    [activeJoinType],
  );

  const ids = useId().replace(/:/g, '');
  const leftOnlyMaskId = `${ids}-left-only`;
  const rightOnlyMaskId = `${ids}-right-only`;
  const intersectionClipId = `${ids}-intersection`;

  const selectedRegions = useMemo(() => getRegionsForJoinType(activeJoinType), [activeJoinType]);

  const onRegionToggle = useCallback((region: VennRegion) => {
    if (!hasSelectedEdge) {
      return;
    }

    const nextRegions = new Set(selectedRegions);
    if (nextRegions.has(region)) {
      nextRegions.delete(region);
    } else {
      nextRegions.add(region);
    }

    const resolvedJoin = resolveJoinTypeFromRegions(nextRegions);
    if (!resolvedJoin) {
      setHint({
        tone: 'warn',
        text: 'That area combination is not a supported join. Use intersection-only (INNER), left+intersection (LEFT), right+intersection (RIGHT), or all regions (FULL OUTER).',
      });
      return;
    }

    setHint({ tone: 'info', text: `${getJoinTypeLabel(resolvedJoin)} selected from Venn regions.` });
    onJoinTypeChange(resolvedJoin);
  }, [hasSelectedEdge, onJoinTypeChange, selectedRegions]);

  const onCrossJoinSelect = useCallback(() => {
    if (!hasSelectedEdge) {
      return;
    }
    setHint({
      tone: 'info',
      text: 'CROSS JOIN selected. Region clicks map to INNER/LEFT/RIGHT/FULL OUTER only.',
    });
    onJoinTypeChange('cross');
  }, [hasSelectedEdge, onJoinTypeChange]);

  const onOutsideAreaClick = useCallback(() => {
    setHint({
      tone: 'warn',
      text: 'Outside-area selection does not map to a supported join output.',
    });
  }, []);

  const isLeftSelected = selectedRegions.has('leftOnly');
  const isIntersectionSelected = selectedRegions.has('intersection');
  const isRightSelected = selectedRegions.has('rightOnly');

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

          <div className="rounded border border-border-subtle bg-bg-elevated p-2">
            <div className={`mb-1 text-[10px] font-mono ${getJoinTypeColorClass(activeJoinType)}`}>
              ACTIVE: {getJoinTypeLabel(activeJoinType)} JOIN
            </div>
            <svg
              viewBox="0 0 220 140"
              className="h-[140px] w-full rounded bg-bg-base"
              role="img"
              aria-label="Interactive join Venn diagram"
            >
              <defs>
                <mask id={leftOnlyMaskId}>
                  <rect x="0" y="0" width="220" height="140" fill="white" />
                  <circle cx="134" cy="70" r="46" fill="black" />
                </mask>
                <mask id={rightOnlyMaskId}>
                  <rect x="0" y="0" width="220" height="140" fill="white" />
                  <circle cx="86" cy="70" r="46" fill="black" />
                </mask>
                <clipPath id={intersectionClipId}>
                  <circle cx="86" cy="70" r="46" />
                </clipPath>
              </defs>

              <rect
                x="0"
                y="0"
                width="220"
                height="140"
                fill="transparent"
                onClick={onOutsideAreaClick}
              />

              <circle
                cx="86"
                cy="70"
                r="46"
                mask={`url(#${leftOnlyMaskId})`}
                fill={activeColor}
                fillOpacity={isLeftSelected ? 0.38 : 0.08}
                onClick={() => onRegionToggle('leftOnly')}
              />
              <circle
                cx="134"
                cy="70"
                r="46"
                clipPath={`url(#${intersectionClipId})`}
                fill={activeColor}
                fillOpacity={isIntersectionSelected ? 0.52 : 0.08}
                onClick={() => onRegionToggle('intersection')}
              />
              <circle
                cx="134"
                cy="70"
                r="46"
                mask={`url(#${rightOnlyMaskId})`}
                fill={activeColor}
                fillOpacity={isRightSelected ? 0.38 : 0.08}
                onClick={() => onRegionToggle('rightOnly')}
              />

              <circle cx="86" cy="70" r="46" fill="none" stroke={activeColor} strokeWidth="2" />
              <circle cx="134" cy="70" r="46" fill="none" stroke={activeColor} strokeWidth="2" />

              <text x="56" y="132" className="fill-text-muted text-[10px] font-mono">
                LEFT
              </text>
              <text x="122" y="132" className="fill-text-muted text-[10px] font-mono">
                RIGHT
              </text>
            </svg>
          </div>

          <button
            type="button"
            onClick={onCrossJoinSelect}
            className={`mt-2 w-full rounded border px-2 py-1 text-xs ${activeJoinType === 'cross' ? 'border-border-focus bg-accent-dim text-accent' : 'border-border-default text-text-secondary hover:bg-bg-hover'}`}
          >
            CROSS JOIN (Cartesian)
          </button>

          {hint && (
            <div
              className={`mt-2 rounded border px-2 py-1.5 text-[11px] ${hint.tone === 'warn' ? 'border-status-warn text-status-warn bg-status-warn/10' : 'border-border-subtle text-text-secondary bg-bg-elevated'}`}
            >
              {hint.text}
            </div>
          )}

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
