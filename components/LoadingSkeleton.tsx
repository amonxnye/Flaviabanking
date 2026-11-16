const Bar = ({ className }: { className: string }) => <div className={`rounded-md bg-subtle ${className}`} />;

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Bar className="h-8 w-48" />
      <Bar className="h-5 w-80 max-w-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="home" role="status" aria-label="Loading overview">
      <div className="page min-w-0 flex-1 animate-pulse">
        <PageHeaderSkeleton />
        <div className="card h-40" />
        <div className="flex flex-col gap-4">
          <Bar className="h-7 w-48" />
          <div className="card h-[360px]" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card animate-pulse overflow-hidden" role="status" aria-label="Loading transactions">
      <div className="h-10 border-b border-line" />
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex h-14 items-center gap-6 border-b border-line px-4 last:border-0">
          <Bar className="h-4 w-40" />
          <Bar className="ml-auto h-4 w-20" />
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function BankCardSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading bank card">
      <div className="aspect-[1.586/1] w-full max-w-[340px] rounded-2xl bg-subtle" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
