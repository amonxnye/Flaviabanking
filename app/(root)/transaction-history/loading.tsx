import { TableSkeleton } from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <div className="transactions">
      <div className="transactions-header">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-5 bg-gray-200 rounded w-96" />
        </div>
      </div>
      <div className="space-y-6 mt-6">
        <TableSkeleton rows={10} />
      </div>
    </div>
  );
}
