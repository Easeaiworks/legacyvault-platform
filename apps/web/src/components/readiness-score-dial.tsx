'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface NextStep {
  label: string;
  detail: string;
  href: string;
  valuePoints: number;
}

interface ReadinessScoreData {
  score: number;
  categories: Array<{
    id: string;
    label: string;
    weight: number;
    earned: number;
    actionable: boolean;
    suggestion?: string;
    href?: string;
  }>;
  nextSteps: NextStep[];
}

export function ReadinessScoreDial() {
  const { data, isLoading } = useQuery<ReadinessScoreData>({
    queryKey: ['readiness-score'],
    queryFn: () => apiClient.get<ReadinessScoreData>('/readiness-score'),
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-ink-200 bg-paper p-8 shadow-soft">
        <div className="text-ink-500">Loading your readiness score…</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-10 rounded-3xl border border-ink-200 bg-paper p-8 shadow-soft lg:grid-cols-[280px_1fr] lg:items-center">
      <Dial score={data.score} />
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-accent-700">
          Estate readiness score
        </div>
        <div className="mt-1 font-serif text-2xl font-medium text-navy-900">
          {headlineForScore(data.score)}
        </div>
        <p className="mt-1 text-ink-700">{subheadForScore(data.score)}</p>

        {data.nextSteps.length > 0 && (
          <ul className="mt-6 divide-y divide-ink-200 border-t border-ink-200">
            {data.nextSteps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="text-[15px] font-medium text-navy-900">{s.label}</div>
                  <div className="text-xs text-ink-500">
                    +{s.valuePoints} points · {s.detail}
                  </div>
                </div>
                <Link
                  href={s.href}
                  className="whitespace-nowrap text-sm text-navy-700 underline underline-offset-2 hover:text-navy-900"
                >
                  Start →
                </Link>
              </li>
            ))}
          </ul>
        )}

        {data.nextSteps.length === 0 && data.score === 100 && (
          <div className="mt-6 rounded-lg bg-sage-100 p-4 text-sm text-sage-700">
            You&apos;ve done the work. Your family will thank you.
          </div>
        )}
      </div>
    </div>
  );
}

function Dial({ score }: { score: number }) {
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const remaining = circumference - dash;

  return (
    <div className="relative mx-auto h-[240px] w-[240px]">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#EFECE2"
          strokeWidth="16"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#C9962B"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${remaining}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif text-6xl font-medium leading-none tracking-tight text-navy-900">
          {score}
        </div>
        <div className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-ink-500">
          out of 100
        </div>
      </div>
    </div>
  );
}

function headlineForScore(score: number): string {
  if (score >= 90) return 'Your estate is in strong shape.';
  if (score >= 70) return 'Almost there.';
  if (score >= 40) return 'Solid start. A few important pieces to go.';
  if (score >= 15) return 'You\'ve begun. The essentials still need attention.';
  return 'Let\'s put the foundations in place.';
}

function subheadForScore(score: number): string {
  if (score >= 90) return 'Consider a periodic review — laws and life change.';
  if (score >= 70) return 'A few high-leverage items will take you above 90.';
  if (score >= 40) return 'The next few steps are the ones that matter most for your family.';
  if (score >= 15) return 'Focus on the essential documents first — will, POA, healthcare directive.';
  return 'Start with a will. Everything else builds from there.';
}
