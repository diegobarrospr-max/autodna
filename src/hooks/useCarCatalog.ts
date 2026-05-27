import { useInfiniteQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type CatalogBodyFilter =
  | 'all'
  | 'hatch'
  | 'sedan'
  | 'suv'
  | 'pickup'
  | 'crossover'
  | 'minivan';

export type CatalogTransmissionFilter = 'all' | 'manual' | 'automatic';

export type CatalogConditionFilter = 'all' | 'new' | 'used';

export interface CatalogFilters {
  search: string;
  body: CatalogBodyFilter;
  transmission: CatalogTransmissionFilter;
  condition: CatalogConditionFilter;
}

export interface CatalogItem {
  id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  body_type: string;
  fuel: string;
  transmission: string;
  price_fipe: number;
  tags: string[];
  is_estimated: boolean;
}

const PAGE_SIZE = 25;

export function useCarCatalog(filters: CatalogFilters) {
  return useInfiniteQuery({
    queryKey: ['car-catalog', filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from('car_models')
        .select(
          'id, brand, model, version, year, body_type, fuel, transmission, price_fipe, tags, is_estimated',
        );

      const search = filters.search.trim();
      if (search.length >= 2) {
        // ilike across brand/model/version. PostgREST `.or()` needs comma list.
        const safe = search.replace(/[%,()]/g, ' ');
        const pattern = `%${safe}%`;
        query = query.or(
          `brand.ilike.${pattern},model.ilike.${pattern},version.ilike.${pattern}`,
        );
      }
      if (filters.body !== 'all') query = query.eq('body_type', filters.body);
      if (filters.transmission === 'manual') {
        query = query.eq('transmission', 'manual');
      } else if (filters.transmission === 'automatic') {
        // anything that isn't manual is automatic-ish for the consumer
        query = query.neq('transmission', 'manual');
      }

      // Curated models surface first (is_estimated NULL or false), then brand A→Z,
      // then newest year, so the catalog stays useful while bulk import is mid-run.
      query = query
        .order('is_estimated', { ascending: true, nullsFirst: true })
        .order('brand', { ascending: true })
        .order('model', { ascending: true })
        .order('year', { ascending: false })
        .range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      let rows = (data ?? []) as CatalogItem[];

      // condition filter requires a join to car_listings; do it client-side
      // on the page slice to avoid a heavy server-side join when not filtering.
      if (filters.condition !== 'all' && rows.length > 0) {
        const ids = rows.map((r) => r.id);
        const { data: listings, error: lErr } = await supabase
          .from('car_listings')
          .select('model_id, condition')
          .in('model_id', ids)
          .eq('active', true);
        if (lErr) throw lErr;
        const conditionByModel = new Map<string, string>();
        for (const l of listings ?? []) {
          conditionByModel.set(
            (l as { model_id: string }).model_id,
            (l as { condition: string }).condition,
          );
        }
        rows = rows.filter(
          (r) => conditionByModel.get(r.id) === filters.condition,
        );
      }

      return {
        items: rows,
        nextPage: rows.length === PAGE_SIZE ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (last) => last.nextPage,
    staleTime: 1000 * 60 * 5,
  });
}
