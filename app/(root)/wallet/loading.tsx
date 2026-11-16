import { PageHeaderSkeleton } from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <section className="page animate-pulse" role="status" aria-label="Loading wallet">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-8">
          <div className="card h-32" />
          <div className="card h-64" />
        </div>
        <div className="card h-[480px]" />
      </div>
    </section>
  );
}
