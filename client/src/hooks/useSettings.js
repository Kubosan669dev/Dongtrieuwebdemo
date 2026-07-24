import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/** Cài đặt chung của site (liên hệ, mạng xã hội, SEO, giới thiệu). */
export function useSettings() {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
    staleTime: 10 * 60 * 1000,
  });
  return data?.settings ?? {};
}
