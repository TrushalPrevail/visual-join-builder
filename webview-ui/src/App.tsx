import type { Edge, Node } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { generateCode } from '../../src/CodeGenerator';
import type { Dialect, TableSchema } from '../../src/types/joinState';
import { Canvas } from './components/Canvas';
import { CanvasErrorBoundary } from './components/CanvasErrorBoundary';
import { CodePanel } from './components/CodePanel';
import { PreviewPanel } from './components/PreviewPanel';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import type { JoinEdgeData, TableNodeData } from './components/graphTypes';
import { useJoinState } from './hooks/useJoinState';
import { sendMessage, useVSCodeMessage } from './hooks/useVSCodeMessage';

function App() {
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [kernelActive, setKernelActive] = useState(false);
  const [kernelName, setKernelName] = useState<string | undefined>(undefined);
  const [outputName, setOutputName] = useState('result_df');
  const [dialect, setDialect] = useState<Dialect>('pandas');
  const [graphNodes, setGraphNodes] = useState<Node<TableNodeData>[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge<JoinEdgeData>[]>([]);
  const [clearVersion, setClearVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [previewAutoExpandVersion, setPreviewAutoExpandVersion] = useState(0);
  const [showTablesPanel, setShowTablesPanel] = useState(true);
  const [showCodePanel, setShowCodePanel] = useState(true);

  useVSCodeMessage(
    useCallback((message) => {
      if (message.command === 'kernelStatus') {
        setKernelActive(message.payload.active);
        setKernelName(message.payload.kernelName);
        return;
      }

      if (message.command === 'loadTables') {
        setTables(message.payload.tables);
      }
    }, []),
  );

  useEffect(() => {
    sendMessage({ command: 'ready' });
  }, []);

  const joinState = useJoinState({
    nodes: graphNodes,
    edges: graphEdges,
    outputName,
    dialect,
  });
  const generatedCode = useMemo(() => generateCode(joinState), [joinState]);
  const insertDisabled = joinState.joins.length === 0;

  const handleClearCanvas = useCallback(() => {
    setClearVersion((current) => current + 1);
  }, []);

  const handleCopyCode = useCallback(() => {
    void navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [generatedCode]);

  const handleInsert = useCallback(() => {
    if (insertDisabled) {
      return;
    }

    sendMessage({ command: 'insertCode', payload: { code: generatedCode } });
  }, [generatedCode, insertDisabled]);

  const copyLabel = useMemo(() => (copied ? 'Copied' : 'Copy Code'), [copied]);
  const handleGraphChange = useCallback((nodes: Node<TableNodeData>[], edges: Edge<JoinEdgeData>[]) => {
    setGraphNodes(nodes);
    setGraphEdges(edges);
  }, []);

  const handleRefreshTables = useCallback(() => {
    sendMessage({ command: 'requestTables' });
  }, []);

  const handleJoinCreated = useCallback(() => {
    setPreviewAutoExpandVersion((current) => current + 1);
  }, []);

  return (
    <main className="h-screen bg-bg-base text-text-primary flex flex-col">
      <Toolbar
        outputName={outputName}
        onOutputNameChange={setOutputName}
        dialect={dialect}
        onDialectChange={setDialect}
        onClearCanvas={handleClearCanvas}
        onCopyCode={handleCopyCode}
        onInsert={handleInsert}
        insertDisabled={insertDisabled}
        copyLabel={copyLabel}
      />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <CanvasErrorBoundary>
          <Canvas
            tables={tables}
            clearVersion={clearVersion}
            onGraphChange={handleGraphChange}
            onJoinCreated={handleJoinCreated}
          />
        </CanvasErrorBoundary>
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="pointer-events-auto absolute left-4 top-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTablesPanel((current) => !current)}
              className="rounded border border-border-default bg-bg-overlay px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
            >
              {showTablesPanel ? 'Hide Tables' : `Show Tables (${tables.length})`}
            </button>
            <button
              type="button"
              onClick={() => setShowCodePanel((current) => !current)}
              className="rounded border border-border-default bg-bg-overlay px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
            >
              {showCodePanel ? 'Hide Code' : 'Show Code'}
            </button>
          </div>

          {showTablesPanel && (
            <div className="pointer-events-auto absolute left-4 top-14 h-[360px] w-[260px] max-w-[calc(100%-2rem)]">
              <Sidebar
                tables={tables}
                kernelActive={kernelActive}
                kernelName={kernelName}
                onRefresh={handleRefreshTables}
                floating
                onClose={() => setShowTablesPanel(false)}
              />
            </div>
          )}

          {showCodePanel && (
            <div className="pointer-events-auto absolute right-4 top-14 h-[360px] w-[340px] max-w-[calc(100%-2rem)]">
              <CodePanel
                code={generatedCode}
                floating
                onClose={() => setShowCodePanel(false)}
              />
            </div>
          )}
        </div>
      </div>
      <PreviewPanel
        joinState={joinState}
        disabled={insertDisabled}
        autoExpandVersion={previewAutoExpandVersion}
      />
    </main>
  );
}

export default App;
