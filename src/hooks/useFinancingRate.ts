import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface FinancingRate {
  annual_rate: number; // % a.a.
  monthly_rate: number; // decimal a.m. (ex: 0.0185)
  source: string;
  as_of: string; // YYYY-MM-DD
  fetched_at: string; // ISO
}

export function useFinancingRate() {
  return useQuery<FinancingRate>({
    queryKey: ['financing-rate'],
    staleTime: 1000 * 60 * 60 * 6, // 6h
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<FinancingRate>(
        'get-financing-rate',
        { method: 'POST', body: {} },
      );
      if (error) throw error;
      if (!data) throw new Error('Empty rate payload');
      return data;
    },
  });
}
