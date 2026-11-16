import { PageHeaderSkeleton } from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <section className="page animate-pulse" role="status" aria-label="Loading settings">
      <PageHeaderSkeleton />
      <div className="flex max-w-[720px] flex-col gap-6">
        <div className="h-10 border-b border-line" />
        <div className="card h-[480px]" />
      </div>
    </section>
  );
}
