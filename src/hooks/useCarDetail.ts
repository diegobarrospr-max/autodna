import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export interface CarDetail {
  model: {
    id: string;
    brand: string;
    model: string;
    version: string;
    year: number;
    body_type: string;
    fuel: string;
    transmission: string;
    engine_displacement: number | null;
    horsepower: number | null;
    price_fipe: number;
    fuel_consumption_city: number | null;
    fuel_consumption_road: number | null;
    seats: number;
    trunk_liters: number | null;
    tags: string[];
    image_url: string | null;
    is_estimated: boolean;
    fipe_brand_code: string | null;
    fipe_model_code: string | null;
    fipe_year_code: string | null;
  };
  costs: {
    insurance_yearly: number;
    maintenance_yearly: number;
    ipva_yearly: number;
    depreciation_yearly: number;
  } | null;
  listing: {
    id: string;
    condition: 'new' | 'used';
    manufacture_year: number;
    mileage_km: number | null;
    asking_price: number;
    city: string | null;
    state: string | null;
  } | null;
  priceHistory: Array<{
    snapshot_date: string;
    price: number;
    reference_month: string;
  }>;
}

export function useCarDetail(modelId: string | null) {
  return useQuery<CarDetail | null>({
    queryKey: ['car-detail', modelId],
    enabled: !!modelId,
    queryFn: async () => {
      if (!modelId) return null;
      const [modelRes, costsRes, listingRes, snapshotsRes] = await Promise.all([
        supabase
          .from('car_models')
          .select(
            'id, brand, model, version, year, body_type, fuel, transmission, engine_displacement, horsepower, price_fipe, fuel_consumption_city, fuel_consumption_road, seats, trunk_liters, tags, image_url, is_estimated, fipe_brand_code, fipe_model_code, fipe_year_code',
          )
          .eq('id', modelId)
          .maybeSingle(),
        supabase
          .from('car_costs')
          .select(
            'insurance_yearly, maintenance_yearly, ipva_yearly, depreciation_yearly',
          )
          .eq('car_id', modelId)
          .maybeSingle(),
        supabase
          .from('car_listings')
          .select(
            'id, condition, manufacture_year, mileage_km, asking_price, city, state',
          )
          .eq('model_id', modelId)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('fipe_snapshots')
          .select('snapshot_date, price, fipe_reference_month')
          .eq('model_id', modelId)
          .order('snapshot_date', { ascending: true })
          .limit(24),
      ]);

      if (modelRes.error) throw modelRes.error;
      if (!modelRes.data) return null;
      if (costsRes.error) throw costsRes.error;
      if (listingRes.error) throw listingRes.error;
      if (snapshotsRes.error) throw snapshotsRes.error;

      return {
        model: modelRes.data as CarDetail['model'],
        costs: (costsRes.data as CarDetail['costs']) ?? null,
        listing: (listingRes.data as CarDetail['listing']) ?? null,
        priceHistory: (snapshotsRes.data ?? []).map((s: Record<string, unknown>) => ({
          snapshot_date: s.snapshot_date as string,
          price: Number(s.price),
          reference_month: s.fipe_reference_month as string,
        })),
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
