// Recomendação client-side (regra de negócio simples)
// Filtra anúncios compatíveis com o perfil e ranqueia top N.
// Sempre retorna alguma coisa: se nenhum carro caber no orçamento (TCO ≤ 35%
// da renda), aceita os mais baratos disponíveis marcando como over-budget.

import type {
  BodyType,
  CarConditionPreference,
  Priority,
  TransmissionPreference,
} from '@/types/database';
import {
  AFFORDABLE_RATIO,
  computeMonthlyTco,
  type FinancingTerms,
  type TcoBreakdown,
} from './tco';

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
  is_estimated?: boolean;
  data_source?: 'curated' | 'fipe_auto';
}

export interface QuizInput extends FinancingTerms {
  monthly_income: number;
  household_size: number;
  monthly_km: number;
  car_condition_preference: CarConditionPreference;
  max_mileage_km: number | null;
  priorities: Priority[];
  max_budget: number | null;
  transmission_preference: TransmissionPreference;
}

export interface Recommendation {
  listing: ListingWithModelAndCosts;
  score: number;
  tco: TcoBreakdown;
  reasons: string[];
  overBudget?: boolean;
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
  if (city > 0 && road > 0) return city * 0.6 + road * 0.4;
  return Math.max(city, road, 1);
}

interface ScoredListing {
  listing: ListingWithModelAndCosts;
  tco: TcoBreakdown;
  affordable: boolean;
  baseScore: number;
  matchedTags: string[];
  reasons: string[];
}

function scoreListings(
  listings: ListingWithModelAndCosts[],
  quiz: QuizInput,
): ScoredListing[] {
  const bodyAllowList =
    BODY_TYPE_FOR_HOUSEHOLD[Math.min(quiz.household_size, 5)] ??
    BODY_TYPE_FOR_HOUSEHOLD[5];
  const priorityTagSet = new Set(
    quiz.priorities.flatMap((p) => PRIORITY_TAG_MAP[p] ?? []),
  );

  const result: ScoredListing[] = [];

  for (const l of listings) {
    if (
      quiz.car_condition_preference !== 'both' &&
      l.condition !== quiz.car_condition_preference
    ) {
      continue;
    }
    if (
      l.condition === 'used' &&
      quiz.max_mileage_km &&
      (l.mileage_km ?? 0) > quiz.max_mileage_km
    ) {
      continue;
    }
    if (!bodyAllowList.includes(l.body_type)) continue;
    if (quiz.household_size > l.seats) continue;
    if (quiz.max_budget && l.asking_price > quiz.max_budget) continue;
    if (quiz.transmission_preference === 'manual' && l.transmission !== 'manual') continue;
    if (
      quiz.transmission_preference === 'automatic' &&
      l.transmission === 'manual'
    ) {
      // automatic accepts automatico, cvt and automatizado
      continue;
    }

    const tco = computeMonthlyTco({
      asking_price: l.asking_price,
      monthly_km: quiz.monthly_km,
      fuel_consumption_avg_km_per_l: averageConsumption(l),
      insurance_yearly: l.insurance_yearly,
      maintenance_yearly: l.maintenance_yearly,
      ipva_yearly: l.ipva_yearly,
      depreciation_yearly: l.depreciation_yearly,
      payment_mode: quiz.payment_mode,
      down_payment_pct: quiz.down_payment_pct,
      financing_months: quiz.financing_months,
      monthly_interest: quiz.monthly_interest,
    });

    const affordable = tco.total <= quiz.monthly_income * AFFORDABLE_RATIO;

    let baseScore = 50;
    const reasons: string[] = [];

    const budgetRatio = tco.total / (quiz.monthly_income * AFFORDABLE_RATIO);
    const budgetScore = Math.max(0, 25 * (1 - budgetRatio));
    baseScore += budgetScore;
    if (affordable && budgetScore > 15)
      reasons.push('Cabe folgado no seu orçamento');
    else if (affordable && budgetScore > 5)
      reasons.push('Dentro do seu orçamento');

    const matchedTags = l.tags.filter((t) => priorityTagSet.has(t));
    baseScore += Math.min(25, matchedTags.length * 6);
    if (matchedTags.length >= 2) {
      reasons.push(
        `Bate com suas prioridades (${matchedTags.slice(0, 3).join(', ')})`,
      );
    } else if (matchedTags.length === 1) {
      reasons.push(`Tem o estilo ${matchedTags[0]}`);
    }

    if (quiz.monthly_km >= 1500 && averageConsumption(l) >= 12) {
      baseScore += 8;
      reasons.push('Bom consumo para quem roda bastante');
    }

    if (
      quiz.household_size >= 4 &&
      l.seats >= 5 &&
      (l.trunk_liters ?? 0) >= 400
    ) {
      baseScore += 6;
      reasons.push('Espaço sobra para a família');
    }

    if (!affordable) {
      reasons.push('Está acima do recomendado para sua renda');
    }

    result.push({
      listing: l,
      tco,
      affordable,
      baseScore,
      matchedTags,
      reasons,
    });
  }

  return result;
}

export function filterAndRankListings(
  listings: ListingWithModelAndCosts[],
  quiz: QuizInput,
  topN = 3,
): Recommendation[] {
  const scored = scoreListings(listings, quiz);

  if (scored.length === 0) return [];

  const affordable = scored.filter((s) => s.affordable);
  const pool = affordable.length > 0 ? affordable : scored;

  return pool
    .sort((a, b) => {
      if (a.affordable !== b.affordable) return a.affordable ? -1 : 1;
      if (a.affordable) return b.baseScore - a.baseScore;
      return a.tco.total - b.tco.total;
    })
    .slice(0, topN)
    .map((s, idx) => ({
      listing: s.listing,
      score: Math.min(100, Math.round(s.baseScore)),
      tco: s.tco,
      reasons:
        s.reasons.length > 0
          ? s.reasons
          : [idx === 0 ? 'Melhor compatibilidade geral' : 'Boa compatibilidade'],
      overBudget: !s.affordable,
    }));
}
