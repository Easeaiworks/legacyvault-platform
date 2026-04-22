export default function AppOverview() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-navy-900">Overview</h1>
      <p className="mt-2 text-ink-500">
        Welcome back. Your vault is the source of truth for everyone you trust.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <Stat label="Assets documented" value="—" hint="Start by adding an account or property" />
        <Stat label="Documents on file" value="—" hint="Wills, deeds, policies" />
        <Stat label="Trusted contacts" value="—" hint="People who gain access if needed" />
      </div>

      <div className="mt-10 rounded-lg border border-accent-500/40 bg-accent-500/5 p-6">
        <h2 className="font-serif text-xl text-navy-900">Next step: document your first asset</h2>
        <p className="mt-1 text-ink-500">
          We&apos;ll walk you through five minutes of setup. You can always come back and add more later.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-5">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="mt-1 font-serif text-3xl text-navy-900">{value}</div>
      <div className="mt-2 text-xs text-ink-500">{hint}</div>
    </div>
  );
}
