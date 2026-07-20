'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * Persistent banner shown to VAULT_VIEWER sessions so read-only users always
 * know why edits are unavailable. Enforcement itself is server-side (middleware
 * blocks all write methods for viewer tokens) — this is the courtesy signal.
 */
export function ViewerBanner() {
  const { data } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiClient.get<{ roles: string[] }>('/auth/me'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isViewer =
    data?.roles?.includes('VAULT_VIEWER') && !data.roles.includes('VAULT_OWNER');
  if (!isViewer) return null;

  return (
    <div className="mb-6 rounded-xl border border-navy-300 bg-navy-50 px-4 py-3 text-sm text-navy-800">
      <span className="font-semibold">View-only access.</span> You can read everything the
      account holder has shared, but nothing can be changed from this account.
    </div>
  );
}
