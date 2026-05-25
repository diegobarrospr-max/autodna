// Recomendação client-side (regra de negócio simples)
// Filtra anúncios compatíveis com o perfil e ranqueia top N.
// Quando o Edge Function com Claude API entrar, substitui aqui.

import type {
  BodyType,
  CarConditionPreference,
  Priority,
} from '@/types/database';
import { computeMonthlyTco, isAffordable, type TcoBreakdown } from './tco';

export interface ListingWithModelAndCosts {
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
  fuel_consumption_city: number | null;
  fuel_consumption_road: number | null;
  tags: string[];
  condition: 'new' | 'used';
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

export interface QuizInput {
  monthly_income: number;
  household_size: number;
  monthly_km: number;
  car_condition_preference: CarConditionPreference;
  max_mileage_km: number | null;
  priorities: Priority[];
}

export interface Recommendation {
  listing: ListingWithModelAndCosts;
  score: number;
  tco: TcoBreakdown;
  reasons: string[];
}

const PRIORITY_TAG_MAP: Record<Priority, string[]> = {
  economia: ['economico', 'popular', 'urbano', 'hibrido', 'compacto'],
  conforto: ['premium', 'completo', 'familia', 'executivo', 'automatico'],
  espaco: [
    'espacoso',
    'porta-malas-grande',
    'familia',
    'minivan',
    'suv',
    'pickup',
  ],
  robustez: ['robusto', 'pickup', 'suv', '4x4', 'diesel'],
  seguranca: ['premium', 'completo', 'familia', 'confiavel'],
  status: ['premium', 'completo', 'estiloso', 'esportivo'],
};

const BODY_TYPE_FOR_HOUSEHOLD: Record<number, BodyType[]> = {
  1: ['hatch', 'sedan', 'crossover', 'suv', 'pickup'],
  2: ['hatch', 'sedan', 'crossover', 'suv', 'pickup'],
  3: ['hatch', 'sedan', 'crossover', 'suv', 'minivan'],
  4: ['sedan', 'crossover', 'suv', 'minivan'],
  5: ['suv', 'minivan'],
};

function averageConsumption(c: ListingWithModelAndCosts): number {
  const city = c.fuel_consumption_city ?? 0;
  const road = c.fuel_consumption_road ?? 0;
  if (city > 0 && road > 0) return (city * 0.6 + road * 0.4);
  return Math.max(city, road, 1);
}

export function filterAndRankListings(
  listings: ListingWithModelAndCosts[],
  quiz: QuizInput,
  topN = 3,
): Recommendation[] {
  const bodyAllowList =
    BODY_TYPE_FOR_HOUSEHOLD[Math.min(quiz.household_size, 5)] ??
    BODY_TYPE_FOR_HOUSEHOLD[5];

  const eligible: Recommendation[] = [];

  for (const l of listings) {
    if (quiz.car_condition_preference !== 'both' && l.condition !== quiz.car_condition_preference) {
      continue;
    }
    if (l.condition === 'used' && quiz.max_mileage_km && (l.mileage_km ?? 0) > quiz.max_mileage_km) {
      continue;
    }
    if (!bodyAllowList.includes(l.body_type)) continue;
    if (quiz.household_size > l.seats) continue;

    const tco = computeMonthlyTco({
      asking_price: l.asking_price,
      monthly_km: quiz.monthly_km,
      fuel_consumption_avg_km_per_l: averageConsumption(l),
      insurance_yearly: l.insurance_yearly,
      maintenance_yearly: l.maintenance_yearly,
      ipva_yearly: l.ipva_yearly,
      depreciation_yearly: l.depreciation_yearly,
    });

    if (!isAffordable(tco.total, quiz.monthly_income)) continue;

    let score = 50;
    const reasons: string[] = [];

    const budgetRatio = tco.total / (quiz.monthly_income * 0.28);
    const budgetScore = Math.max(0, 25 * (1 - budgetRatio));
    score += budgetScore;
    if (budgetScore > 15) reasons.push('Cabe folgado no seu orçamento');
    else if (budgetScore > 5) reasons.push('Dentro do seu orçamento');

    const priorityTagSet = new Set(
      quiz.priorities.flatMap((p) => PRIORITY_TAG_MAP[p] ?? []),
    );
    const matchedTags = l.tags.filter((t) => priorityTagSet.has(t));
    score += Math.min(25, matchedTags.length * 6);
    if (matchedTags.length >= 2) {
      reasons.push(`Bate com suas prioridades (${matchedTags.slice(0, 3).join(', ')})`);
    } else if (matchedTags.length === 1) {
      reasons.push(`Tem o estilo ${matchedTags[0]}`);
    }

    if (quiz.monthly_km >= 1500 && averageConsumption(l) >= 12) {
      score += 8;
      reasons.push('Bom consumo para quem roda bastante');
    }

    if (quiz.household_size >= 4 && l.seats >= 5 && (l.trunk_liters ?? 0) >= 400) {
      score += 6;
      reasons.push('Espaço sobra para a família');
    }

    eligible.push({ listing: l, score, tco, reasons });
  }

  return eligible
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((r, idx) => ({ ...r, score: Math.min(100, Math.round(r.score)), reasons: r.reasons.length > 0 ? r.reasons : [idx === 0 ? 'Melhor compatibilidade geral' : 'Boa compatibilidade'] }));
}
