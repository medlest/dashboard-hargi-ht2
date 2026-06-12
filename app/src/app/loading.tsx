export default function Loading() {
  return (
    <div className="space-y-4">
      {/* skeleton header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-72 animate-pulse rounded-lg bg-surface-2" />
          <div className="h-3 w-48 animate-pulse rounded bg-surface-2" />
        </div>
        <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-2" />
      </div>
      {/* skeleton stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-24 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
      {/* skeleton chart */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card h-80 animate-pulse" />
        <div className="card h-80 animate-pulse" style={{ animationDelay: "120ms" }} />
      </div>
    </div>
  );
}
