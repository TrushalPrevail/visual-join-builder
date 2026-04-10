import type { Edge, Node } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { generateCode } from '../../src/CodeGenerator';
import type { Dialect, JoinType, TableSchema } from '../../src/types/joinState';
import { Canvas } from './components/Canvas';
import { CanvasErrorBoundary } from './components/CanvasErrorBoundary';
import { CodePanel } from './components/CodePanel';
import { PreviewPanel } from './components/PreviewPanel';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { VennOverlay } from './components/VennOverlay';
import type { JoinEdgeData, TableNodeData } from './components/graphTypes';
import { useJoinState } from './hooks/useJoinState';
import { sendMessage, useVSCodeMessage } from './hooks/useVSCodeMessage';
import { getPersistedState, persistState } from './lib/vscodeApi';

interface AppPersistedState {
  showVennOverlay?: boolean;
}

function App() {
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [kernelActive, setKernelActive] = useState(false);
  const [kernelName, setKernelName] = useState<string | undefined>(undefined);
  const [outputName, setOutputName] = useState('result_df');
  const [dialect, setDialect] = useState<Dialect>('pandas');
  const [graphNodes, setGraphNodes] = useState<Node<TableNodeData>[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge<JoinEdgeData>[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewAutoExpandVersion, setPreviewAutoExpandVersion] = useState(0);
  const [showTablesPanel, setShowTablesPanel] = useState(true);
  const [showCodePanel, setShowCodePanel] = useState(true);
  const [showVennOverlay, setShowVennOverlay] = useState(
    () => getPersistedState<AppPersistedState>()?.showVennOverlay ?? false,
  );

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

  useEffect(() => {
    const existing = getPersistedState<AppPersistedState>() ?? {};
    persistState<AppPersistedState>({ ...existing, showVennOverlay });
  }, [showVennOverlay]);

  const joinState = useJoinState({
    nodes: graphNodes,
    edges: graphEdges,
    outputName,
    dialect,
  });
  const generatedCode = useMemo(() => generateCode(joinState), [joinState]);
  const insertDisabled = joinState.joins.length === 0;
  const selectedEdge = useMemo(
    () => graphEdges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [graphEdges, selectedEdgeId],
  );
  const tableNameByNodeId = useMemo(
    () => new Map(graphNodes.map((node) => [node.id, node.data.table.name])),
    [graphNodes],
  );

  const handleClearCanvas = useCallback(() => {
    setGraphNodes([]);
    setGraphEdges([]);
    setSelectedEdgeId(null);
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

  const handleRefreshTables = useCallback(() => {
    sendMessage({ command: 'requestTables' });
  }, []);

  const handleJoinCreated = useCallback((edgeId: string) => {
    setPreviewAutoExpandVersion((current) => current + 1);
    setSelectedEdgeId(edgeId);
  }, []);

  const handleVennJoinTypeChange = useCallback((joinType: JoinType) => {
    if (!selectedEdgeId) {
      return;
    }

    setGraphEdges((currentEdges) =>
      currentEdges.map((edge) => {
        if (edge.id !== selectedEdgeId || !edge.data) {
          return edge;
        }

        return {
          ...edge,
          data: {
            ...edge.data,
            joinType,
          },
        };
      }),
    );
  }, [selectedEdgeId]);

  const handleRemoveSelectedJoin = useCallback(() => {
    if (!selectedEdge) {
      return;
    }

    setGraphEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== selectedEdge.id));
    setSelectedEdgeId(null);
  }, [selectedEdge]);

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
            nodes={graphNodes}
            edges={graphEdges}
            setNodes={setGraphNodes}
            setEdges={setGraphEdges}
            selectedEdgeId={selectedEdgeId}
            onJoinCreated={handleJoinCreated}
            onEdgeSelected={setSelectedEdgeId}
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
            <button
              type="button"
              onClick={() => setShowVennOverlay((current) => !current)}
              className="rounded border border-border-default bg-bg-overlay px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
            >
              {showVennOverlay ? 'Hide Venn' : 'Show Venn'}
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

          {showVennOverlay && (
            <div className="pointer-events-auto absolute bottom-4 right-4 w-[250px] max-w-[calc(100%-2rem)]">
              <VennOverlay
                edgeId={selectedEdge?.id ?? null}
                joinType={selectedEdge?.data?.joinType}
                leftTableName={selectedEdge ? tableNameByNodeId.get(selectedEdge.source) : undefined}
                rightTableName={selectedEdge ? tableNameByNodeId.get(selectedEdge.target) : undefined}
                onJoinTypeChange={handleVennJoinTypeChange}
                onRemoveJoin={handleRemoveSelectedJoin}
                onClose={() => setShowVennOverlay(false)}
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
