export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
