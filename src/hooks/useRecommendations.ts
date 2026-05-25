import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  filterAndRankListings,
  type ListingWithModelAndCosts,
  type QuizInput,
  type Recommendation,
} from '@/utils/recommend';
import type { BodyType, ConditionType, FuelType, Transmission } from '@/types/database';

interface ListingRow {
  id: string;
  model_id: string;
  condition: ConditionType;
  manufacture_year: number;
  mileage_km: number | null;
  asking_price: number;
  city: string | null;
  state: string | null;
}

interface ModelRow {
  id: string;
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
}

interface CostRow {
  car_id: string;
  insurance_yearly: number;
  maintenance_yearly: number;
  ipva_yearly: number;
  depreciation_yearly: number;
}

async function fetchListingsWithModels(): Promise<ListingWithModelAndCosts[]> {
  const { data: listingsData, error: lErr } = await supabase
    .from('car_listings')
    .select(
      'id, model_id, condition, manufacture_year, mileage_km, asking_price, city, state',
    )
    .eq('active', true);
  if (lErr) throw lErr;
  const listings = (listingsData ?? []) as ListingRow[];
  if (!listings.length) return [];

  const modelIds = Array.from(new Set(listings.map((l) => l.model_id)));

  const { data: modelsData, error: mErr } = await supabase
    .from('car_models')
    .select(
      'id, brand, model, version, year, body_type, fuel, transmission, seats, trunk_liters, fuel_consumption_city, fuel_consumption_road, tags',
    )
    .in('id', modelIds);
  if (mErr) throw mErr;
  const models = (modelsData ?? []) as ModelRow[];

  const { data: costsData, error: cErr } = await supabase
    .from('car_costs')
    .select(
      'car_id, insurance_yearly, maintenance_yearly, ipva_yearly, depreciation_yearly',
    )
    .in('car_id', modelIds);
  if (cErr) throw cErr;
  const costs = (costsData ?? []) as CostRow[];

  const modelById = new Map<string, ModelRow>();
  for (const m of models) modelById.set(m.id, m);
  const costsById = new Map<string, CostRow>();
  for (const c of costs) costsById.set(c.car_id, c);

  const out: ListingWithModelAndCosts[] = [];
  for (const l of listings) {
    const m = modelById.get(l.model_id);
    const c = costsById.get(l.model_id);
    if (!m || !c) continue;
    out.push({
      listing_id: l.id,
      model_id: m.id,
      brand: m.brand,
      model: m.model,
      version: m.version,
      year: m.year,
      body_type: m.body_type,
      fuel: m.fuel,
      transmission: m.transmission,
      seats: m.seats,
      trunk_liters: m.trunk_liters,
      fuel_consumption_city: m.fuel_consumption_city,
      fuel_consumption_road: m.fuel_consumption_road,
      tags: m.tags,
      condition: l.condition,
      manufacture_year: l.manufacture_year,
      mileage_km: l.mileage_km,
      asking_price: Number(l.asking_price),
      city: l.city,
      state: l.state,
      insurance_yearly: Number(c.insurance_yearly),
      maintenance_yearly: Number(c.maintenance_yearly),
      ipva_yearly: Number(c.ipva_yearly),
      depreciation_yearly: Number(c.depreciation_yearly),
    });
  }
  return out;
}

export function useListings() {
  return useQuery({
    queryKey: ['listings'],
    queryFn: fetchListingsWithModels,
    staleTime: 1000 * 60 * 10,
  });
}

export function useGenerateRecommendations() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quiz: QuizInput): Promise<Recommendation[]> => {
      if (!userId) throw new Error('not signed in');

      const listings = await fetchListingsWithModels();
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
    enabled: false,
    initialData: [],
  });
}
