import { BankCardSkeleton } from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <section className="flex">
      <div className="my-banks">
        <div className="animate-pulse space-y-3 mb-8">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-5 bg-gray-200 rounded w-96" />
        </div>
        <div className="flex flex-wrap gap-6">
          <BankCardSkeleton />
          <BankCardSkeleton />
        </div>
      </div>
    </section>
  );
}
