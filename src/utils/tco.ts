// Custo Total de Propriedade (TCO) mensal
// Componentes: parcela financiamento + combustível + seguro/12 + manutenção/12
// + IPVA/12 + depreciação/12

const DEFAULT_FUEL_PRICE_PER_L = 6.0;
const DEFAULT_DOWN_PAYMENT_RATIO = 0.2;
const DEFAULT_FINANCING_MONTHS = 60;
const DEFAULT_MONTHLY_INTEREST = 0.018;

interface FinancingInput {
  asking_price: number;
  down_payment_ratio?: number;
  months?: number;
  monthly_interest?: number;
}

export function monthlyFinancingInstallment({
  asking_price,
  down_payment_ratio = DEFAULT_DOWN_PAYMENT_RATIO,
  months = DEFAULT_FINANCING_MONTHS,
  monthly_interest = DEFAULT_MONTHLY_INTEREST,
}: FinancingInput): number {
  const financed = asking_price * (1 - down_payment_ratio);
  if (monthly_interest <= 0) return financed / months;
  const factor =
    (monthly_interest * Math.pow(1 + monthly_interest, months)) /
    (Math.pow(1 + monthly_interest, months) - 1);
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

export interface ComputeTcoInput {
  asking_price: number;
  monthly_km: number;
  fuel_consumption_avg_km_per_l: number;
  insurance_yearly: number;
  maintenance_yearly: number;
  ipva_yearly: number;
  depreciation_yearly: number;
  down_payment_ratio?: number;
  months?: number;
  monthly_interest?: number;
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

export const AFFORDABLE_RATIO = 0.35;

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
