'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const OPS_ROLES = ['PLATFORM_ADMIN', 'PLATFORM_SUPPORT'];

/**
 * Operations nav section — rendered only for platform staff.
 * Server-side enforcement lives in the /api/admin/* routes (requireRole);
 * this is purely a visibility nicety so regular members never see the link.
 */
export function OpsNav() {
  const { data } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiClient.get<{ roles: string[] }>('/auth/me'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!data?.roles?.some((r) => OPS_ROLES.includes(r))) return null;

  return (
    <>
      <div className="mt-6 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
        Operations
      </div>
      <Link
        href="/app/admin/death-verifications"
        className="rounded-md px-3 py-2 text-ink-700 hover:bg-ink-100"
      >
        Death verifications
      </Link>
    </>
  );
}
