import { PageHeaderSkeleton } from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <section className="page animate-pulse" role="status" aria-label="Loading billing">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => <div key={i} className="card h-28" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => <div key={i} className="card h-80" />)}
      </div>
    </section>
  );
}
