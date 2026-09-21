// Copyright (C) 2026 NeuroRAN. All rights reserved.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  info: ErrorInfo | null;
}

/**
 * Top-level error boundary. Any render error (e.g. a malformed telemetry record
 * that slipped past normalization) is caught here and shown as a visible
 * diagnostic card instead of blanking the whole page to black.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep a breadcrumb in the console for field debugging.
    // eslint-disable-next-line no-console
    console.error('[resource-grid-visualizer] render error caught by ErrorBoundary:', error, info);
    this.setState({ error, info });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error, info } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div className="grid min-h-full place-items-center p-8">
        <div className="card max-w-2xl border-[#e56b6b]/50 p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d64545]/20 text-[#f3bcbc]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </span>
            <h1 className="text-lg font-semibold text-ink">The visualizer hit a render error</h1>
          </div>
          <p className="text-sm text-subtle">
            The UI caught an unexpected error and stopped rendering this view instead of going blank. The
            live telemetry stream is unaffected; a hard refresh usually clears transient issues.
          </p>
          <pre className="mt-3 max-h-48 overflow-auto rounded-md border border-edge bg-[#0b1018] p-3 text-[11px] leading-relaxed text-[#f3bcbc]">
            {error.name}: {error.message}
            {info?.componentStack ? `\n${info.componentStack}` : ''}
          </pre>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-md bg-accent/80 px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent transition cursor-pointer"
            >
              Reload page
            </button>
            <span className="text-[11px] text-subtle">
              If this persists, capture the message above and check the browser console.
            </span>
          </div>
        </div>
      </div>
    );
  }
}
