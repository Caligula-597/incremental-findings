export function SectionTitle({
  title,
  subtitle,
  className
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className ?? ''}`}>
      <h3 className="font-serif text-2xl md:text-3xl">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}
    </div>
  );
}

export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/80 p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-1 font-serif text-3xl">{value}</p>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const mapping: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    under_review: 'bg-blue-50 text-blue-800 border-blue-200',
    published: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-800 border-rose-200'
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${mapping[status] ?? 'bg-zinc-50 text-zinc-700 border-zinc-200'}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
