import { useCallback, useEffect, useState } from 'react';
import type { JoinState } from '../../../src/types/joinState';
import { sendMessage, useVSCodeMessage } from '../hooks/useVSCodeMessage';

interface PreviewPanelProps {
  joinState: JoinState;
  disabled: boolean;
  autoExpandVersion?: number;
}

export function PreviewPanel({ joinState, disabled, autoExpandVersion }: PreviewPanelProps) {
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  const [collapsedAtAutoVersion, setCollapsedAtAutoVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState('');
  const [rowCount, setRowCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const expanded = manuallyExpanded || Boolean(autoExpandVersion && autoExpandVersion > collapsedAtAutoVersion);

  useVSCodeMessage(
    useCallback((message) => {
      if (message.command === 'previewResult') {
        setHtml(message.payload.html);
        setRowCount(message.payload.rowCount);
        setError(null);
        setLoading(false);
        return;
      }

      if (message.command === 'previewError') {
        setHtml('');
        setRowCount(0);
        setError(message.payload.message);
        setLoading(false);
      }
    }, []),
  );

  const requestPreview = useCallback(() => {
    if (disabled) {
      setHtml('');
      setRowCount(0);
      setError('Add at least one join before previewing results.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    sendMessage({ command: 'requestPreview', payload: { joinState } });
  }, [disabled, joinState]);

  const handleToggle = useCallback(() => {
    if (expanded) {
      setManuallyExpanded(false);
      setCollapsedAtAutoVersion(autoExpandVersion ?? 0);
      return;
    }

    setManuallyExpanded(true);
    requestPreview();
  }, [autoExpandVersion, expanded, requestPreview]);

  useEffect(() => {
    if (
      !autoExpandVersion
      || autoExpandVersion <= collapsedAtAutoVersion
      || disabled
    ) {
      return;
    }

    sendMessage({ command: 'requestPreview', payload: { joinState } });
  }, [autoExpandVersion, collapsedAtAutoVersion, disabled, joinState]);

  return (
    <section className="border-t border-border-subtle bg-bg-surface">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-[10px] tracking-[0.1em] uppercase text-text-muted">Preview</span>
        <span className="text-xs text-text-secondary">{expanded ? 'Collapse' : 'Expand'}</span>
      </button>
      {expanded && (
        <div className="border-t border-border-subtle px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-text-secondary">Showing 5 of {rowCount} rows</span>
            <button
              type="button"
              onClick={requestPreview}
              className="rounded border border-border-default px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
            >
              Refresh Preview
            </button>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border-default border-t-accent"
                aria-hidden="true"
              />
              <span>Loading preview...</span>
            </div>
          )}
          {!loading && error && (
            <div className="rounded border border-status-warn bg-bg-elevated px-3 py-2 text-sm text-status-warn">
              {error}
            </div>
          )}
          {!loading && !error && html && (
            <div
              className="max-h-56 overflow-auto rounded border border-border-subtle bg-bg-elevated p-2 text-xs text-text-primary"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      )}
    </section>
  );
}
