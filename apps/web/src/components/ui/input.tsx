import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          'w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-500 focus:border-navy-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500',
          className,
        )}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={cn(
        'w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-500 focus:border-navy-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500',
        className,
      )}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      {...props}
      className={cn(
        'w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-navy-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500',
        className,
      )}
    >
      {children}
    </select>
  );
});

export function Label({ children, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label {...rest} className="mb-1 block text-sm font-medium text-ink-700">
      {children}
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
