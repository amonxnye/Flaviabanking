export default function Loading() {
  return (
    <section className="billing">
      <div className="mx-auto max-w-5xl w-full p-6">
        <div className="animate-pulse space-y-3 mb-8">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-5 bg-gray-200 rounded w-96" />
        </div>
        <div className="animate-pulse space-y-6 mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg border border-gray-200" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-100 rounded-xl border border-gray-200" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
