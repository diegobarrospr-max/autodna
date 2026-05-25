// Custo Total de Propriedade (TCO) mensal
// Componentes: parcela financiamento + combustível + seguro/12 + manutenção/12
// + IPVA/12 + depreciação/12
//
// Decisões explícitas:
// - Não há valores padrão de financiamento inventados. O caller passa
//   payment_mode, down_payment_pct, financing_months e monthly_interest.
// - A taxa de juros mensal deve ser obtida da Edge Function get-financing-rate
//   (série SGS 20712 do Bacen) e nunca chutada no código.

const DEFAULT_FUEL_PRICE_PER_L = 6.0;
export const AFFORDABLE_RATIO = 0.35;

export type PaymentMode = 'cash' | 'financed';

export interface FinancingTerms {
  payment_mode: PaymentMode;
  down_payment_pct: number; // 0..100, % do preço dado de entrada
  financing_months: number; // prazo em meses (12..84)
  monthly_interest: number; // taxa mensal em decimal (ex: 0.0185 para 1.85% a.m.)
}

interface InstallmentInput extends FinancingTerms {
  asking_price: number;
}

export function monthlyFinancingInstallment(input: InstallmentInput): number {
  if (input.payment_mode === 'cash') return 0;
  const financed = input.asking_price * (1 - input.down_payment_pct / 100);
  if (financed <= 0) return 0;
  if (input.monthly_interest <= 0) return financed / input.financing_months;
  const factor =
    (input.monthly_interest * Math.pow(1 + input.monthly_interest, input.financing_months)) /
    (Math.pow(1 + input.monthly_interest, input.financing_months) - 1);
  return financed * factor;
}

interface FuelCostInput {
  monthly_km: number;
  consumption_km_per_l: number;
  fuel_price_per_l?: number;
}

export function monthlyFuelCost({
  monthly_km,
  consumption_km_per_l,
  fuel_price_per_l = DEFAULT_FUEL_PRICE_PER_L,
}: FuelCostInput): number {
  if (consumption_km_per_l <= 0) return 0;
  return (monthly_km / consumption_km_per_l) * fuel_price_per_l;
}

export interface TcoBreakdown {
  installment: number;
  fuel: number;
  insurance: number;
  maintenance: number;
  ipva: number;
  depreciation: number;
  total: number;
}

export interface ComputeTcoInput extends FinancingTerms {
  asking_price: number;
  monthly_km: number;
  fuel_consumption_avg_km_per_l: number;
  insurance_yearly: number;
  maintenance_yearly: number;
  ipva_yearly: number;
  depreciation_yearly: number;
  fuel_price_per_l?: number;
}

export function computeMonthlyTco(input: ComputeTcoInput): TcoBreakdown {
  const installment = monthlyFinancingInstallment(input);
  const fuel = monthlyFuelCost({
    monthly_km: input.monthly_km,
    consumption_km_per_l: input.fuel_consumption_avg_km_per_l,
    fuel_price_per_l: input.fuel_price_per_l,
  });
  const insurance = input.insurance_yearly / 12;
  const maintenance = input.maintenance_yearly / 12;
  const ipva = input.ipva_yearly / 12;
  const depreciation = input.depreciation_yearly / 12;
  const total = installment + fuel + insurance + maintenance + ipva + depreciation;

  return { installment, fuel, insurance, maintenance, ipva, depreciation, total };
}

export function isAffordable(
  tcoTotal: number,
  monthlyIncome: number,
  ratio = AFFORDABLE_RATIO,
): boolean {
  return tcoTotal <= monthlyIncome * ratio;
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}
