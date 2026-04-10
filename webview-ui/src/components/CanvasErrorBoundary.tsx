import { Component, type ErrorInfo, type ReactNode } from 'react';

interface CanvasErrorBoundaryProps {
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

export class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  public constructor(props: CanvasErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Canvas rendering failed:', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <section className="flex min-w-0 flex-1 items-center justify-center border-l border-r border-border-subtle bg-bg-base px-4 text-center">
          <div className="max-w-md rounded border border-status-warn bg-bg-surface px-4 py-3">
            <h2 className="text-sm font-semibold text-status-warn">Canvas crashed</h2>
            <p className="mt-1 text-xs text-text-secondary">
              The canvas hit an unexpected rendering error. Reload the panel to continue.
            </p>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
