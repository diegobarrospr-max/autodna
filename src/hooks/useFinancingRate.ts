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
    // 0 staleTime + refetchOnMount: sempre busca quando o Quiz reabre.
    // Antes tinha staleTime: 6h, que ficava preso em estado de erro
    // quando o endpoint do Bacen retornava lixo (mudou o formato em 2026).
    staleTime: 0,
    gcTime: 1000 * 60 * 60,
    retry: 3,
    retryDelay: 1000,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<FinancingRate>(
        'get-financing-rate',
        { method: 'POST', body: {} },
      );
      if (error) {
        throw new Error(`get-financing-rate falhou: ${error.message ?? 'desconhecido'}`);
      }
      if (!data) throw new Error('Resposta vazia da taxa Bacen');
      // Sanidade: monthly_rate decimal típico [0.005, 0.05] (0.5% a 5% a.m.)
      if (!Number.isFinite(data.monthly_rate) || data.monthly_rate <= 0 || data.monthly_rate > 0.2) {
        throw new Error(`Taxa inválida (monthly_rate=${data.monthly_rate})`);
      }
      return data;
    },
  });
}
