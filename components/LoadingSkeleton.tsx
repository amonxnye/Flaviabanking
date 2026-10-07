export function DashboardSkeleton() {
  return (
    <div className="home" role="status" aria-label="Loading dashboard">
      <div className="home-content">
        <header className="home-header">
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-gray-200 rounded w-64" />
            <div className="h-5 bg-gray-200 rounded w-96" />
          </div>
          <div className="animate-pulse mt-6">
            <div className="h-32 bg-gray-200 rounded-xl w-full" />
          </div>
        </header>
        <div className="animate-pulse mt-8 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded w-full" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3" role="status" aria-label="Loading transactions">
      <div className="h-10 bg-gray-200 rounded w-full" />
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded w-full" />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function BankCardSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading bank card">
      <div className="h-48 bg-gray-200 rounded-xl w-[320px]" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
