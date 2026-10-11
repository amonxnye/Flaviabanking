export default function Loading() {
  return (
    <section className="payment-transfer">
      <div className="animate-pulse space-y-3 mb-8">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="h-5 bg-gray-200 rounded w-full max-w-lg" />
      </div>
      <div className="animate-pulse space-y-6 pt-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded w-full border-t border-gray-200 pt-4" />
        ))}
        <div className="h-12 bg-gray-200 rounded w-40 mt-4" />
      </div>
    </section>
  );
}
