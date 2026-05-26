import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  filterAndRankListings,
  type ListingWithModelAndCosts,
  type QuizInput,
  type Recommendation,
} from '@/utils/recommend';
import type {
  BodyType,
  ConditionType,
  FuelType,
  Transmission,
} from '@/types/database';

const BODY_TYPE_FOR_HOUSEHOLD: Record<number, BodyType[]> = {
  1: ['hatch', 'sedan', 'crossover', 'suv', 'pickup'],
  2: ['hatch', 'sedan', 'crossover', 'suv', 'pickup'],
  3: ['hatch', 'sedan', 'crossover', 'suv', 'minivan'],
  4: ['sedan', 'crossover', 'suv', 'minivan'],
  5: ['suv', 'minivan'],
};

interface EligibleRow {
  listing_id: string;
  model_id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  body_type: BodyType;
  fuel: FuelType;
  transmission: Transmission;
  seats: number;
  trunk_liters: number | null;
  fuel_consumption_city: number | null;
  fuel_consumption_road: number | null;
  tags: string[];
  is_estimated: boolean;
  data_source: 'curated' | 'fipe_auto';
  condition: ConditionType;
  manufacture_year: number;
  mileage_km: number | null;
  asking_price: number;
  city: string | null;
  state: string | null;
  insurance_yearly: number;
  maintenance_yearly: number;
  ipva_yearly: number;
  depreciation_yearly: number;
}

async function fetchEligibleListings(quiz: QuizInput): Promise<ListingWithModelAndCosts[]> {
  const bodyAllow =
    BODY_TYPE_FOR_HOUSEHOLD[Math.min(quiz.household_size, 5)] ??
    BODY_TYPE_FOR_HOUSEHOLD[5];

  const params = {
    p_condition: quiz.car_condition_preference,
    p_max_mileage_km: quiz.max_mileage_km,
    p_min_seats: quiz.household_size,
    p_body_types: bodyAllow,
    p_max_price: quiz.max_budget,
    p_transmission: quiz.transmission_preference,
    p_limit: 500,
  };

  // eligible_listings é uma RPC SQL custom; o tipo Database não conhece
  const { data, error } = await (supabase.rpc as never as (
    fn: string,
    p: typeof params,
  ) => Promise<{ data: EligibleRow[] | null; error: Error | null }>)(
    'eligible_listings',
    params,
  );
  if (error) throw error;
  const rows = data ?? [];

  return rows.map((r) => ({
    listing_id: r.listing_id,
    model_id: r.model_id,
    brand: r.brand,
    model: r.model,
    version: r.version,
    year: r.year,
    body_type: r.body_type,
    fuel: r.fuel,
    transmission: r.transmission,
    seats: r.seats,
    trunk_liters: r.trunk_liters,
    fuel_consumption_city: r.fuel_consumption_city
      ? Number(r.fuel_consumption_city)
      : null,
    fuel_consumption_road: r.fuel_consumption_road
      ? Number(r.fuel_consumption_road)
      : null,
    tags: r.tags ?? [],
    condition: r.condition,
    manufacture_year: r.manufacture_year,
    mileage_km: r.mileage_km,
    asking_price: Number(r.asking_price),
    city: r.city,
    state: r.state,
    insurance_yearly: Number(r.insurance_yearly),
    maintenance_yearly: Number(r.maintenance_yearly),
    ipva_yearly: Number(r.ipva_yearly),
    depreciation_yearly: Number(r.depreciation_yearly),
    is_estimated: r.is_estimated,
    data_source: r.data_source,
  }));
}

interface EdgeFunctionRec {
  listing_id: string;
  model_id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  body_type: BodyType;
  fuel: string;
  transmission: string;
  seats: number;
  trunk_liters: number | null;
  fuel_consumption_avg: number;
  tags: string[];
  condition: ConditionType;
  manufacture_year: number;
  mileage_km: number | null;
  asking_price: number;
  city: string | null;
  state: string | null;
  tco: {
    installment: number;
    fuel: number;
    insurance: number;
    maintenance: number;
    ipva: number;
    depreciation: number;
    total: number;
  };
  score: number;
  rank: number;
  reason: string;
}

async function tryEdgeFunction(quiz: QuizInput): Promise<Recommendation[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      recommendations: EdgeFunctionRec[];
    }>('recommend-cars', { body: { quiz } });
    if (error || !data?.recommendations) return null;
    return data.recommendations.map<Recommendation>((r) => ({
      listing: {
        listing_id: r.listing_id,
        model_id: r.model_id,
        brand: r.brand,
        model: r.model,
        version: r.version,
        year: r.year,
        body_type: r.body_type,
        fuel: r.fuel,
        transmission: r.transmission,
        seats: r.seats,
        trunk_liters: r.trunk_liters,
        fuel_consumption_city: null,
        fuel_consumption_road: null,
        tags: r.tags,
        condition: r.condition,
        manufacture_year: r.manufacture_year,
        mileage_km: r.mileage_km,
        asking_price: r.asking_price,
        city: r.city,
        state: r.state,
        insurance_yearly: r.tco.insurance * 12,
        maintenance_yearly: r.tco.maintenance * 12,
        ipva_yearly: r.tco.ipva * 12,
        depreciation_yearly: r.tco.depreciation * 12,
      },
      score: r.score,
      tco: r.tco,
      reasons: r.reason ? [r.reason] : [],
    }));
  } catch {
    return null;
  }
}

export function useGenerateRecommendations() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quiz: QuizInput): Promise<Recommendation[]> => {
      if (!userId) throw new Error('not signed in');

      const fromEdge = await tryEdgeFunction(quiz);
      if (fromEdge && fromEdge.length > 0) {
        return fromEdge;
      }

      const listings = await fetchEligibleListings(quiz);
      const recs = filterAndRankListings(listings, quiz, 3);

      const generatedAt = new Date().toISOString();
      await supabase.from('matches').delete().eq('user_id', userId);

      if (recs.length > 0) {
        const rows = recs.map((r, idx) => ({
          user_id: userId,
          car_id: r.listing.model_id,
          score: r.score,
          rank: idx + 1,
          reason: r.reasons.join(' • '),
          generated_at: generatedAt,
        }));
        const { error } = await supabase.from('matches').insert(rows as never);
        if (error) throw error;
      }

      return recs;
    },
    onSuccess: (recs) => {
      queryClient.setQueryData(['recommendations', userId], recs);
    },
  });
}

export function useRecommendations() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<Recommendation[]>({
    queryKey: ['recommendations', userId],
    queryFn: async () => [],
    enabled: false,
    initialData: [],
  });
}

export interface CatalogStats {
  total_models: number;
  curated_models: number;
  auto_models: number;
  with_price: number;
  total_brands: number;
}

export function useCatalogStats() {
  return useQuery<CatalogStats>({
    queryKey: ['catalog-stats'],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as never as (
        fn: string,
      ) => Promise<{ data: CatalogStats[] | null; error: Error | null }>)(
        'car_catalog_stats',
      );
      if (error) throw error;
      return data?.[0] ?? {
        total_models: 0,
        curated_models: 0,
        auto_models: 0,
        with_price: 0,
        total_brands: 0,
      };
    },
  });
}
