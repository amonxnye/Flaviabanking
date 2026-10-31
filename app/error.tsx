'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { LogoMark } from '@/components/Logo';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas p-8">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <LogoMark className="size-8" />
        <div className="flex flex-col gap-2">
          <h1 className="text-24 font-medium text-ink">Something went wrong on our side</h1>
          <p className="text-14 text-ink-2">
            Our team has been notified. Try again, or go back to the overview.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-secondary h-10">
            Back to overview
          </Link>
        </div>
      </div>
    </main>
  );
}
