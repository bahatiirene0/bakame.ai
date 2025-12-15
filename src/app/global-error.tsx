/**
 * Global Error Handler
 *
 * This component catches errors that occur anywhere in the application,
 * including errors in the root layout. It's a special Next.js file that
 * provides a fallback UI when the application crashes.
 *
 * Features:
 * - Automatic error reporting to Sentry (if configured)
 * - User-friendly error UI
 * - Reset functionality to attempt recovery
 * - Development vs. production error details
 *
 * Note: This file must be a Client Component ('use client')
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 */

'use client'
/* eslint-disable */;

import { useEffect } from 'react';
import { captureException } from '@/lib/sentry';

/**
 * Props for the GlobalError component
 */
interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary component
 *
 * This component is rendered when an unhandled error occurs anywhere in the app.
 * It provides a fallback UI and reports the error to Sentry.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Report error to Sentry when the component mounts
    captureException(error, {
      tags: {
        errorBoundary: 'global',
        digest: error.digest || 'unknown',
      },
      extra: {
        errorMessage: error.message,
        errorStack: error.stack,
        errorDigest: error.digest,
      },
      level: 'fatal',
    });

    // Also log to console for development
    console.error('[Global Error]', error);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <html lang="en">
      <head>
        <title>Something went wrong - Bakame.ai</title>
      </head>
      <body className="min-h-screen bg-[#F9FAFB] dark:bg-[#0A0A0A] text-gray-900 dark:text-gray-100">
        <div className="flex min-h-screen items-center justify-center px-4 py-16">
          <div className="w-full max-w-md space-y-8 text-center">
            {/* Error Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <svg
                className="h-10 w-10 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Error Title */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Something went wrong
              </h1>
              <p className="text-base text-gray-600 dark:text-gray-400">
                We apologize for the inconvenience. An unexpected error has occurred.
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {isDevelopment && (
              <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 text-left">
                <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Error Details (Development Mode)
                </h2>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Message:
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-words">
                      {error.message || 'No error message available'}
                    </p>
                  </div>
                  {error.digest && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Digest:
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-words">
                        {error.digest}
                      </p>
                    </div>
                  )}
                  {error.stack && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Stack Trace:
                      </p>
                      <pre className="mt-1 text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error ID (Production) */}
            {!isDevelopment && error.digest && (
              <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Error ID: <span className="font-mono font-semibold">{error.digest}</span>
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  Please include this ID when contacting support.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Try Again Button */}
              <button
                onClick={reset}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
              >
                Try again
              </button>

              {/* Go Home Button */}
              <a
                href="/"
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
              >
                Go to homepage
              </a>
            </div>

            {/* Support Link */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Need help?{' '}
                <a
                  href="mailto:support@bakame.ai"
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Contact support
                </a>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
