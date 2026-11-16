import { PageHeaderSkeleton } from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <section className="page animate-pulse" role="status" aria-label="Loading transfer form">
      <PageHeaderSkeleton />
      <div className="card h-[520px] max-w-[880px]" />
    </section>
  );
}
