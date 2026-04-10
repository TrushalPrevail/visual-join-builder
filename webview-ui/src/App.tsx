import { useEffect, useState } from 'react';
import { sendMessage, useVSCodeMessage } from './hooks/useVSCodeMessage';

function App() {
  const [kernelActive, setKernelActive] = useState(false);
  const [kernelName, setKernelName] = useState<string | undefined>(undefined);

  useVSCodeMessage((message) => {
    if (message.command === 'kernelStatus') {
      setKernelActive(message.payload.active);
      setKernelName(message.payload.kernelName);
    }
  });

  useEffect(() => {
    sendMessage({ command: 'ready' });
  }, []);

  const kernelLabel = kernelActive
    ? `Kernel Active${kernelName ? ` (${kernelName})` : ''}`
    : 'No Kernel';

  return (
    <main className="min-h-screen bg-bg-base text-white flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-4xl font-semibold">Visual Join Builder</h1>
      <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-surface px-3 py-1 text-sm text-text-secondary">
        <span
          className={`h-2 w-2 rounded-full ${kernelActive ? 'bg-status-ok' : 'bg-text-muted'}`}
          aria-hidden="true"
        />
        <span>{kernelLabel}</span>
      </div>
    </main>
  );
}

export default App;
