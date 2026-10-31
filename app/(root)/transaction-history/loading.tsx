import { PageHeaderSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <div className="page">
      <div className="animate-pulse"><PageHeaderSkeleton /></div>
      <div className="flex flex-col gap-4">
        <div className="card h-28 animate-pulse" />
        <TableSkeleton rows={10} />
      </div>
    </div>
  );
}
