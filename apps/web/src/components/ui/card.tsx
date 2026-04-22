import { cn } from '@/lib/cn';

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        'rounded-lg border border-ink-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h2 className={cn('font-serif text-xl text-navy-900', className)}>{children}</h2>;
}

export function CardSubtitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn('mt-1 text-sm text-ink-500', className)}>{children}</p>;
}
