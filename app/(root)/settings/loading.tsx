export default function Loading() {
  return (
    <section className="settings">
      <div className="mx-auto max-w-3xl w-full p-6">
        <div className="animate-pulse space-y-3 mb-8">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-5 bg-gray-200 rounded w-96" />
        </div>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-full" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}
