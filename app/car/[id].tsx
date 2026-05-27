import { useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useCarDetail, type CarDetail } from '@/hooks/useCarDetail';
import { useFinancingRate } from '@/hooks/useFinancingRate';
import { useProfile } from '@/hooks/useProfile';
import { computeMonthlyTco, formatBRL } from '@/utils/tco';

export default function CarDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const modelId = typeof id === 'string' ? id : null;

  const detail = useCarDetail(modelId);
  const { data: profile } = useProfile();
  const { data: rate } = useFinancingRate();

  if (detail.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <Header onBack={() => router.back()} title="Carregando…" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1f54f5" />
        </View>
      </SafeAreaView>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <Header onBack={() => router.back()} title="Erro" />
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={36} color="#9ca3af" />
          <Text className="mt-3 text-center text-base text-gray-500">
            Não consegui carregar esse modelo. Tente voltar e abrir de novo.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { model, costs, listing, priceHistory } = detail.data;
  const price = listing?.asking_price && listing.asking_price > 1
    ? listing.asking_price
    : model.price_fipe;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <Header onBack={() => router.back()} title={model.brand} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-3xl font-bold text-gray-900">
              {model.model}
            </Text>
            <Text className="mt-1 text-base text-gray-500">
              {model.version} · {model.year}
            </Text>
          </View>
          {model.is_estimated ? (
            <View className="rounded-full bg-gray-100 px-3 py-1">
              <Text className="text-xs font-semibold text-gray-600">
                Estimativa
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-4 rounded-2xl bg-brand-50 px-5 py-4">
          <Text className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            Preço FIPE
          </Text>
          <Text className="mt-1 text-2xl font-bold text-brand-700">
            {price > 0 ? formatBRL(price) : 'Sob consulta'}
          </Text>
          {model.price_fipe === 0 ? (
            <Text className="mt-1 text-xs text-brand-700">
              Esperando próxima sincronização mensal com a FIPE.
            </Text>
          ) : null}
        </View>

        <SpecsGrid model={model} listing={listing} />

        <TcoSection
          price={price}
          costs={costs}
          fuelAvg={fuelAverage(model)}
          monthlyKm={profile?.monthly_km ?? null}
          paymentMode={profile?.payment_mode ?? null}
          downPaymentPct={profile?.down_payment_pct ?? null}
          financingMonths={profile?.financing_months ?? null}
          monthlyInterest={rate?.monthly_rate ?? null}
        />

        {priceHistory.length > 1 ? (
          <PriceHistory history={priceHistory} />
        ) : null}

        <BuyLinks
          brand={model.brand}
          model={model.model}
          year={model.year}
          condition={listing?.condition ?? (model.year >= 2026 ? 'new' : 'used')}
          city={profile?.city ?? null}
          state={profile?.state ?? null}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View className="flex-row items-center border-b border-gray-100 px-4 py-2">
      <Pressable onPress={onBack} hitSlop={12} className="p-2">
        <Ionicons name="chevron-back" size={22} color="#1f2937" />
      </Pressable>
      <Text className="ml-1 text-base font-medium text-gray-700" numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

function SpecsGrid({
  model,
  listing,
}: {
  model: CarDetail['model'];
  listing: CarDetail['listing'];
}) {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Carroceria', value: model.body_type },
    { label: 'Combustível', value: model.fuel },
    { label: 'Câmbio', value: model.transmission },
    { label: 'Lugares', value: String(model.seats) },
  ];
  if (model.engine_displacement) {
    rows.push({
      label: 'Motor',
      value: `${model.engine_displacement.toFixed(1)}`,
    });
  }
  if (model.horsepower) {
    rows.push({ label: 'Potência', value: `${model.horsepower} cv` });
  }
  if (model.trunk_liters) {
    rows.push({ label: 'Porta-malas', value: `${model.trunk_liters} L` });
  }
  const fuelAvg = fuelAverage(model);
  if (fuelAvg) {
    rows.push({ label: 'Consumo médio', value: `${fuelAvg.toFixed(1)} km/L` });
  }
  if (listing?.condition === 'used' && listing.mileage_km) {
    rows.push({
      label: 'KM estimado',
      value: listing.mileage_km.toLocaleString('pt-BR'),
    });
  }

  return (
    <View className="mt-6">
      <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Ficha técnica
      </Text>
      <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
        {rows.map((r) => (
          <View
            key={r.label}
            className="rounded-xl bg-gray-50 px-3 py-2"
            style={{ minWidth: 120 }}
          >
            <Text className="text-[10px] uppercase tracking-wider text-gray-400">
              {r.label}
            </Text>
            <Text className="mt-0.5 text-sm font-semibold capitalize text-gray-900">
              {r.value}
            </Text>
          </View>
        ))}
      </View>
      {model.tags.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap" style={{ gap: 4 }}>
          {model.tags.map((t) => (
            <View key={t} className="rounded bg-gray-100 px-2 py-0.5">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-gray-600">
                {t}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function TcoSection({
  price,
  costs,
  fuelAvg,
  monthlyKm,
  paymentMode,
  downPaymentPct,
  financingMonths,
  monthlyInterest,
}: {
  price: number;
  costs: { insurance_yearly: number; maintenance_yearly: number; ipva_yearly: number; depreciation_yearly: number } | null;
  fuelAvg: number | null;
  monthlyKm: number | null;
  paymentMode: 'cash' | 'financed' | null;
  downPaymentPct: number | null;
  financingMonths: number | null;
  monthlyInterest: number | null;
}) {
  const tco = useMemo(() => {
    if (!costs || price <= 0) return null;
    return computeMonthlyTco({
      asking_price: price,
      monthly_km: monthlyKm ?? 1000,
      fuel_consumption_avg_km_per_l: fuelAvg ?? 12,
      insurance_yearly: costs.insurance_yearly,
      maintenance_yearly: costs.maintenance_yearly,
      ipva_yearly: costs.ipva_yearly,
      depreciation_yearly: costs.depreciation_yearly,
      payment_mode: paymentMode ?? 'cash',
      down_payment_pct: downPaymentPct ?? 0,
      financing_months: financingMonths ?? 60,
      monthly_interest: monthlyInterest ?? 0,
    });
  }, [price, costs, fuelAvg, monthlyKm, paymentMode, downPaymentPct, financingMonths, monthlyInterest]);

  return (
    <View className="mt-6 rounded-2xl border border-gray-200 px-4 py-4">
      <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Custo mensal estimado (TCO)
      </Text>
      {!costs || price <= 0 ? (
        <Text className="mt-2 text-sm text-gray-500">
          Calcula assim que tivermos o preço FIPE deste modelo.
        </Text>
      ) : !monthlyKm ? (
        <Text className="mt-2 text-sm text-gray-500">
          Faça o quiz uma vez para que o TCO use sua renda, km/mês e termos de
          financiamento reais.
        </Text>
      ) : tco ? (
        <>
          <Text className="mt-2 text-2xl font-bold text-gray-900">
            {formatBRL(tco.total)}
            <Text className="text-sm font-normal text-gray-400">/mês</Text>
          </Text>
          <View className="mt-3">
            <TcoRow label="Parcela" value={tco.installment} />
            <TcoRow label="Combustível" value={tco.fuel} />
            <TcoRow label="Seguro" value={tco.insurance} />
            <TcoRow label="Manutenção" value={tco.maintenance} />
            <TcoRow label="IPVA" value={tco.ipva} />
            <TcoRow label="Depreciação" value={tco.depreciation} />
          </View>
        </>
      ) : null}
    </View>
  );
}

function TcoRow({ label, value }: { label: string; value: number }) {
  return (
    <View className="mt-1.5 flex-row items-baseline justify-between">
      <Text className="text-sm text-gray-700">{label}</Text>
      <Text className="text-sm font-medium text-gray-900">
        {formatBRL(value)}
        <Text className="text-xs text-gray-400">/mês</Text>
      </Text>
    </View>
  );
}

function PriceHistory({
  history,
}: {
  history: Array<{ snapshot_date: string; price: number; reference_month: string }>;
}) {
  const min = Math.min(...history.map((h) => h.price));
  const max = Math.max(...history.map((h) => h.price));
  const span = Math.max(max - min, 1);

  return (
    <View className="mt-6">
      <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Histórico FIPE
      </Text>
      <View className="mt-3 rounded-2xl bg-gray-50 px-4 py-4">
        {history.slice(-6).map((h) => {
          const ratio = (h.price - min) / span;
          return (
            <View key={h.snapshot_date} className="mb-2">
              <View className="flex-row justify-between">
                <Text className="text-xs text-gray-500">
                  {h.reference_month}
                </Text>
                <Text className="text-xs font-medium text-gray-900">
                  {formatBRL(h.price)}
                </Text>
              </View>
              <View className="mt-1 h-1.5 rounded-full bg-gray-200">
                <View
                  className="h-1.5 rounded-full bg-brand-500"
                  style={{ width: `${Math.max(8, ratio * 100)}%` }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function BuyLinks({
  brand,
  model,
  year,
  condition,
  city,
  state,
}: {
  brand: string;
  model: string;
  year: number;
  condition: 'new' | 'used';
  city: string | null;
  state: string | null;
}) {
  const open = (url: string) => Linking.openURL(url).catch(() => undefined);
  const q = encodeURIComponent(`${brand} ${model}`);
  const uf = state?.toLowerCase() ?? 'sp';
  const cityParam = city ? encodeURIComponent(city) : '';

  const wmLoc =
    city && state
      ? `&estadocidade=${state}%7C${cityParam}`
      : state
        ? `&estadocidade=${state}`
        : '';
  const webmotors = `https://www.webmotors.com.br/carros/estoque/${slug(brand)}/${slug(model)}?anoDe=${year}&anoAte=${year}${wmLoc}`;

  const olxLoc = city ? `/${slug(city)}` : '';
  const olx = `https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/${condition === 'used' ? 'usados' : 'novos'}/estado-${uf}${olxLoc}?q=${q}&rs=${year}&re=${year}`;

  const ml = `https://lista.mercadolivre.com.br/${slug(brand)}-${slug(model)}-${year}${state ? `?_state=TG-${state}` : ''}`;

  return (
    <View className="mt-6">
      <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Ver anúncios{city && state ? ` em ${city}/${state}` : state ? ` em ${state}` : ''}
      </Text>
      <View className="mt-3 flex-row flex-wrap" style={{ gap: 6 }}>
        <LinkChip label="Webmotors" onPress={() => open(webmotors)} />
        <LinkChip label="OLX" onPress={() => open(olx)} />
        <LinkChip label="Mercado Livre" onPress={() => open(ml)} />
      </View>
    </View>
  );
}

function LinkChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-full border border-gray-200 px-3 py-2 active:bg-gray-50"
    >
      <Text className="text-sm font-medium text-gray-800">{label}</Text>
      <Ionicons
        name="open-outline"
        size={14}
        color="#4b5563"
        style={{ marginLeft: 6 }}
      />
    </Pressable>
  );
}

function fuelAverage(model: {
  fuel_consumption_city: number | null;
  fuel_consumption_road: number | null;
}): number | null {
  const c = Number(model.fuel_consumption_city ?? 0);
  const r = Number(model.fuel_consumption_road ?? 0);
  if (!c && !r) return null;
  if (c && r) return c * 0.6 + r * 0.4;
  return Math.max(c, r);
}

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
