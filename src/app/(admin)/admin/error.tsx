'use client';

/**
 * Admin Error Boundary
 *
 * Catches and displays errors in the admin dashboard gracefully.
 */

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Admin Dashboard Error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          An error occurred while loading the admin dashboard. This could be a temporary issue.
        </p>

        {error.message && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-left">
            <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-500 dark:text-gray-500">
          If this problem persists, please check that:
        </p>
        <ul className="mt-2 text-xs text-gray-500 dark:text-gray-500 text-left list-disc list-inside space-y-1">
          <li>The SUPABASE_SERVICE_ROLE_KEY environment variable is set</li>
          <li>Your admin role is properly configured in the database</li>
          <li>All required database tables exist</li>
        </ul>
      </div>
    </div>
  );
}
