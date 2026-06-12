export function ChartCard({
  title,
  badge,
  className = "",
  children,
}: {
  title: string;
  badge?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`card flex flex-col p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="card-title">{title}</h3>
        {badge && (
          <span className="num rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2">
            {badge}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
