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
      <div className="flex min-h-0 flex-1">
        <div className="w-[220px] flex-shrink-0 [&>aside]:!w-full">
          <Sidebar
            tables={tables}
            kernelActive={kernelActive}
            kernelName={kernelName}
            onRefresh={handleRefreshTables}
          />
        </div>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <CanvasErrorBoundary>
            <Canvas tables={tables} clearVersion={clearVersion} onGraphChange={handleGraphChange} />
          </CanvasErrorBoundary>
        </div>
        <div className="w-[300px] flex-shrink-0 [&>aside]:!w-full">
          <CodePanel code={generatedCode} />
        </div>
      </div>
      <PreviewPanel joinState={joinState} disabled={insertDisabled} />
    </main>
  );
}

export default App;
