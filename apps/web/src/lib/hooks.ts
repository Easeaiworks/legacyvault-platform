'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';

// Generic query helper — swaps in for every list/detail endpoint.
export function useList<T>(key: string, path: string) {
  return useQuery<T[]>({
    queryKey: [key],
    queryFn: () => apiClient.get<T[]>(path),
  });
}

export function useOne<T>(key: string, path: string, id: string | null) {
  return useQuery<T>({
    queryKey: [key, id],
    queryFn: () => apiClient.get<T>(`${path}/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreate<T, I>(key: string, path: string) {
  const qc = useQueryClient();
  return useMutation<T, Error, I>({
    mutationFn: (input) => apiClient.post<T>(path, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
}

export function useUpdate<T, I>(key: string, path: string) {
  const qc = useQueryClient();
  return useMutation<T, Error, { id: string; data: I }>({
    mutationFn: ({ id, data }) => apiClient.patch<T>(`${path}/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [key] });
      qc.invalidateQueries({ queryKey: [key, id] });
    },
  });
}

export function useRemove(key: string, path: string) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => apiClient.delete(`${path}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
}
