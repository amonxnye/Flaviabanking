import { BankCardSkeleton, PageHeaderSkeleton } from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <section className="page">
      <div className="animate-pulse"><PageHeaderSkeleton /></div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,340px))] gap-6">
        <BankCardSkeleton />
        <BankCardSkeleton />
      </div>
    </section>
  );
}
