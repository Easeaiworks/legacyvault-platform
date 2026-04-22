export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-ink-300 bg-ink-50/50 p-10 text-center">
      <h3 className="font-serif text-xl text-navy-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-ink-500">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
