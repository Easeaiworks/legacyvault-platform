// Fixed top banner rendered whenever NEXT_PUBLIC_DEMO_MODE === 'true'.
// Makes it unambiguous to any viewer that they're looking at a demo — critical
// for the lawyer-review use case so nothing is confused with production copy.

export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null;
  return (
    <div className="sticky top-0 z-50 border-b border-amber-400 bg-amber-300/90 px-4 py-1.5 text-center text-xs font-medium text-amber-900 backdrop-blur">
      DEMO ENVIRONMENT · synthetic data · forward-looking claims shown under
      <span className="mx-1 rounded bg-amber-900 px-1 py-0.5 text-amber-50">PENDING LEGAL REVIEW</span>
      banners — nothing here is final product messaging.
    </div>
  );
}
