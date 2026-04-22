import { cn } from '@/lib/cn';

/**
 * Renders a visually distinct banner on forward-looking registry claims that
 * have not been reviewed by counsel. Any UI copy that promises future
 * matching, imputes institutional adoption, or implies outcomes MUST be
 * wrapped in this component until the lawyer signs off. That's a hard rule.
 */
export function PendingReviewBadge({
  children,
  className,
  compact = false,
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative rounded-md border-2 border-dashed border-amber-400 bg-amber-50/70',
        compact ? 'p-3' : 'p-4',
        className,
      )}
      aria-label="Pending legal review — not yet approved marketing claim"
    >
      <div className="absolute -top-2 left-3 bg-ink-50 px-2 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
        Pending legal review
      </div>
      <div className={compact ? 'text-sm text-ink-700' : 'text-ink-700'}>{children}</div>
    </div>
  );
}
