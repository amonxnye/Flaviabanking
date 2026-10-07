export default function Loading() {
  return (
    <section className="flex w-full flex-col bg-gray-25 p-8">
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-40 rounded bg-gray-200" />
        <div className="h-5 w-96 rounded bg-gray-200" />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="animate-pulse space-y-6">
          <div className="h-32 rounded-xl bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-100 border border-gray-200" />
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-gray-100 border border-gray-200" />
      </div>
    </section>
  );
}
