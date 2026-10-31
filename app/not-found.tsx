import Link from 'next/link';
import { LogoMark } from '@/components/Logo';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas p-8">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <LogoMark className="size-8" />
        <div className="flex flex-col gap-2">
          <p className="figure text-13 text-ink-3">404</p>
          <h1 className="text-24 font-medium text-ink">This page does not exist</h1>
          <p className="text-14 text-ink-2">
            The link may be old, or the page has moved
          </p>
        </div>
        <Link href="/" className="btn-primary inline-flex items-center">
          Back to overview
        </Link>
      </div>
    </main>
  );
}
