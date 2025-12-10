/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */

'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Hari ikibazo cyabaye
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md">
            Habaye ikosa. Gerageza kongera cyangwa usubize paji.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600
                text-white font-medium text-sm
                hover:from-green-600 hover:to-green-700
                active:scale-95 transition-all duration-200"
            >
              Gerageza kongera
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl
                bg-gray-100 dark:bg-white/10
                text-gray-700 dark:text-gray-200 font-medium text-sm
                hover:bg-gray-200 dark:hover:bg-white/20
                active:scale-95 transition-all duration-200"
            >
              Subiza paji
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 text-left w-full max-w-md">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                Error details (dev only)
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-gray-100 dark:bg-white/5
                text-xs text-red-600 dark:text-red-400 overflow-auto">
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
