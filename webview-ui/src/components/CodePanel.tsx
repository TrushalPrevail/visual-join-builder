import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface CodePanelProps {
  code: string;
  floating?: boolean;
  onClose?: () => void;
}

const TOKEN_REGEX = /(#[^\n]*)|('(?:\\.|[^'])*'|"(?:\\.|[^"])*")|\b(SELECT|JOIN|FROM|AS|import|duckdb|merge|join|select|how|left_on|right_on|on)\b/g;

function renderHighlightedCode(code: string): ReactNode {
  const lines = code.split('\n');

  return lines.map((line, lineIndex) => {
    const segments: ReactNode[] = [];
    let lastIndex = 0;

    line.replace(TOKEN_REGEX, (match, comment, stringToken, keyword, offset) => {
      if (offset > lastIndex) {
        segments.push(
          <span key={`text-${lineIndex}-${offset}`}>{line.slice(lastIndex, offset)}</span>,
        );
      }

      if (comment) {
        segments.push(
          <span key={`comment-${lineIndex}-${offset}`} className="text-text-muted italic">
            {match}
          </span>,
        );
      } else if (stringToken) {
        segments.push(
          <span key={`string-${lineIndex}-${offset}`} className="text-status-ok">
            {match}
          </span>,
        );
      } else if (keyword) {
        segments.push(
          <span key={`keyword-${lineIndex}-${offset}`} className="text-accent">
            {match}
          </span>,
        );
      }

      lastIndex = offset + match.length;
      return match;
    });

    if (lastIndex < line.length) {
      segments.push(
        <span key={`tail-${lineIndex}`}>{line.slice(lastIndex)}</span>,
      );
    }

    return (
      <div key={`line-${lineIndex}`}>
        {segments}
      </div>
    );
  });
}

export function CodePanel({ code, floating = false, onClose }: CodePanelProps) {
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => renderHighlightedCode(code), [code]);
  const containerClass = floating
    ? 'h-full w-full rounded-xl border border-border-default bg-bg-overlay/95 shadow-xl backdrop-blur flex flex-col'
    : 'w-[260px] shrink-0 border-l border-border-subtle bg-bg-surface flex flex-col';

  return (
    <aside className={containerClass}>
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <span className="text-[10px] tracking-[0.1em] uppercase text-text-muted">Generated Code</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded border border-border-default px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border-default px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
              aria-label="Close code panel"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <pre className="font-mono text-[13px] leading-relaxed text-text-code whitespace-pre">
          {highlighted}
        </pre>
      </div>
    </aside>
  );
}
