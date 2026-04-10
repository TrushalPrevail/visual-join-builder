import type { Edge, Node } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { generateCode } from '../../src/CodeGenerator';
import type { Dialect, TableSchema } from '../../src/types/joinState';
import { Canvas } from './components/Canvas';
import { CodePanel } from './components/CodePanel';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import type { JoinEdgeData, TableNodeData } from './components/graphTypes';
import { useJoinState } from './hooks/useJoinState';
import { sendMessage, useVSCodeMessage } from './hooks/useVSCodeMessage';

const MOCK_TABLES: TableSchema[] = [
  {
    name: 'df_users',
    columns: [
      { name: 'id', dtype: 'int64', nullable: false },
      { name: 'name', dtype: 'object', nullable: false },
      { name: 'email', dtype: 'object', nullable: true },
      { name: 'created_at', dtype: 'datetime64', nullable: false },
    ],
  },
  {
    name: 'df_orders',
    columns: [
      { name: 'order_id', dtype: 'int64', nullable: false },
      { name: 'user_id', dtype: 'int64', nullable: false },
      { name: 'total', dtype: 'float64', nullable: false },
      { name: 'created_at', dtype: 'datetime64', nullable: false },
    ],
  },
];

function App() {
  const [kernelActive, setKernelActive] = useState(false);
  const [kernelName, setKernelName] = useState<string | undefined>(undefined);
  const [outputName, setOutputName] = useState('result_df');
  const [dialect, setDialect] = useState<Dialect>('pandas');
  const [graphNodes, setGraphNodes] = useState<Node<TableNodeData>[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge<JoinEdgeData>[]>([]);
  const [clearVersion, setClearVersion] = useState(0);
  const [copied, setCopied] = useState(false);

  useVSCodeMessage((message) => {
    if (message.command === 'kernelStatus') {
      setKernelActive(message.payload.active);
      setKernelName(message.payload.kernelName);
    }
  });

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
        <Sidebar tables={MOCK_TABLES} kernelActive={kernelActive} kernelName={kernelName} />
        <Canvas tables={MOCK_TABLES} clearVersion={clearVersion} onGraphChange={handleGraphChange} />
        <CodePanel code={generatedCode} />
      </div>
    </main>
  );
}

export default App;
