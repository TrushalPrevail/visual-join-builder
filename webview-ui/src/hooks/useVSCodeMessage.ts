import { useEffect } from 'react';
import type { HostToWebviewMessage, WebviewToHostMessage } from '../../../src/types/messages';
import { getVSCodeApi } from '../lib/vscodeApi';

export function sendMessage(message: WebviewToHostMessage): void {
  void getVSCodeApi().postMessage(message);
}

export function useVSCodeMessage(handler: (message: HostToWebviewMessage) => void): void {
  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>): void => {
      handler(event.data as HostToWebviewMessage);
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [handler]);
}
