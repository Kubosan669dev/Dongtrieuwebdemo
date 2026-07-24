import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

const FIFTEEN_MIN = 15 * 60 * 1000;

export function useWeather() {
  return useQuery({
    queryKey: ['weather'],
    queryFn: () => api.get('/weather'),
    staleTime: FIFTEEN_MIN,
    refetchInterval: FIFTEEN_MIN,
  });
}

export function useTide() {
  return useQuery({
    queryKey: ['tide'],
    queryFn: () => api.get('/tide'),
    staleTime: 60 * 60 * 1000,
  });
}

export function useBulletins() {
  return useQuery({
    queryKey: ['bulletins'],
    queryFn: () => api.get('/bulletins'),
    staleTime: 30 * 60 * 1000,
  });
}
