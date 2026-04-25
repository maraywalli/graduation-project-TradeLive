'use client';

import { useEffect } from 'react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError]', error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 rounded-2xl p-6">
        <h1 className="text-xl font-black text-red-700 dark:text-red-300 mb-2">Something went wrong</h1>
        <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-4">
          The page hit an error. The technical details are below.
        </p>
        <pre className="bg-zinc-900 text-red-200 p-4 rounded-xl overflow-auto text-xs leading-relaxed border border-zinc-800 mb-4">
{error.message}
{error.digest ? `\n\nDigest: ${error.digest}` : ''}
{error.stack ? `\n\n${error.stack}` : ''}
        </pre>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
