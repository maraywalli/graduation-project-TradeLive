'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '24px', minHeight: '100vh' }}>
        <div style={{ maxWidth: 720, margin: '40px auto' }}>
          <h1 style={{ color: '#f97316', fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Something broke</h1>
          <p style={{ color: '#a1a1aa', marginBottom: 16 }}>The app hit an unexpected error. Details below — please share this with support.</p>
          <pre style={{ background: '#18181b', color: '#fca5a5', padding: 16, borderRadius: 12, overflow: 'auto', fontSize: 13, lineHeight: 1.5, border: '1px solid #27272a' }}>
{error.message}
{error.digest ? `\n\nDigest: ${error.digest}` : ''}
{error.stack ? `\n\n${error.stack}` : ''}
          </pre>
          <button
            onClick={() => reset()}
            style={{ marginTop: 16, background: '#f97316', color: '#fff', fontWeight: 800, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
