import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { useFinancingRate } from '@/hooks/useFinancingRate';
import { useProfile } from '@/hooks/useProfile';
import { useRecommendations } from '@/hooks/useRecommendations';
import { formatBRL, type TcoBreakdown } from '@/utils/tco';
import type { Recommendation } from '@/utils/recommend';

const RANK_BADGE = ['🥇', '🥈', '🥉'];

export default function MatchesTab() {
  const router = useRouter();
  const { data: recs } = useRecommendations();
  const { data: profile } = useProfile();
  const { data: rate } = useFinancingRate();

  if (!recs || recs.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="sparkles-outline" size={48} color="#9ca3af" />
          <Text className="mt-4 text-xl font-bold text-gray-900">
            Sem matches ainda
          </Text>
          <Text className="mt-2 text-center text-base text-gray-500">
            Faça o quiz pra descobrir os carros que combinam com você e seu
            orçamento.
          </Text>
          <View className="mt-6 w-full">
            <Button
              label="Fazer o quiz"
              onPress={() => router.push('/(tabs)/quiz')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isFinanced = profile?.payment_mode === 'financed';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Text className="text-sm font-medium uppercase tracking-wider text-brand-600">
          Top 3
        </Text>
        <Text className="mt-2 text-3xl font-bold text-gray-900">
          Seus matches
        </Text>
        <Text className="mt-2 text-base leading-6 text-gray-500">
          Carros que combinam com seu perfil e cabem no seu bolso.
        </Text>

        <View className="mt-4 rounded-xl bg-gray-50 p-4">
          <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Como calculamos
          </Text>
          {isFinanced && rate ? (
            <Text className="mt-2 text-sm text-gray-700">
              Financiamento de {profile?.financing_months}× com entrada de{' '}
              {Math.round(Number(profile?.down_payment_pct ?? 0))}% e taxa de{' '}
              <Text className="font-semibold">
                {rate.annual_rate.toFixed(2)}% a.a.
              </Text>{' '}
              ({(rate.monthly_rate * 100).toFixed(2)}% a.m.).
            </Text>
          ) : isFinanced ? (
            <Text className="mt-2 text-sm text-gray-700">
              Financiamento de {profile?.financing_months}× com entrada de{' '}
              {Math.round(Number(profile?.down_payment_pct ?? 0))}%. Taxa do
              mercado em consulta…
            </Text>
          ) : (
            <Text className="mt-2 text-sm text-gray-700">
              Pagamento à vista — sem parcelas de financiamento no TCO.
            </Text>
          )}
          {rate ? (
            <Text className="mt-2 text-xs text-gray-500">
              Taxa real consultada em {rate.source}, atualizada em{' '}
              {rate.as_of}.
            </Text>
          ) : null}
        </View>

        {recs.map((rec, idx) => (
          <MatchCard
            key={rec.listing.listing_id}
            rec={rec}
            badge={RANK_BADGE[idx] ?? '⭐️'}
            city={profile?.city ?? null}
            state={profile?.state ?? null}
          />
        ))}

        <View className="mt-6">
          <Button
            label="Refazer quiz"
            variant="secondary"
            onPress={() => router.push('/(tabs)/quiz')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CURRENT_YEAR = 2026;

function MatchCard({
  rec,
  badge,
  city,
  state,
}: {
  rec: Recommendation;
  badge: string;
  city: string | null;
  state: string | null;
}) {
  const l = rec.listing;
  const isZeroKm = l.tags?.includes('zero-km');
  const isCurrentYearNew = l.condition === 'new' && l.year >= CURRENT_YEAR;
  const isOlderNew = l.condition === 'new' && l.year < CURRENT_YEAR && !isZeroKm;

  const conditionLabel = isZeroKm
    ? 'Zero km · Novo'
    : isCurrentYearNew
      ? `${l.year} · Novo`
      : isOlderNew
        ? `Modelo ${l.year} · Novo (último ano-modelo)`
        : `${l.year} · Usado · ${l.mileage_km?.toLocaleString('pt-BR')} km`;

  return (
    <View className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <View className="flex-row items-center justify-between bg-brand-50 px-5 py-3">
        <Text className="text-lg">{badge}</Text>
        <View className="flex-row items-center">
          {isZeroKm ? (
            <View className="mr-2 rounded-full bg-green-100 px-3 py-1">
              <Text className="text-xs font-semibold text-green-800">
                Zero km
              </Text>
            </View>
          ) : null}
          {l.is_estimated ? (
            <View className="mr-2 rounded-full bg-gray-100 px-3 py-1">
              <Text className="text-xs font-semibold text-gray-600">
                Estimativa
              </Text>
            </View>
          ) : null}
          {rec.overBudget ? (
            <View className="mr-2 rounded-full bg-amber-100 px-3 py-1">
              <Text className="text-xs font-semibold text-amber-800">
                Acima do orçamento
              </Text>
            </View>
          ) : null}
          <View className="rounded-full bg-brand-100 px-3 py-1">
            <Text className="text-xs font-semibold text-brand-700">
              Match {rec.score}/100
            </Text>
          </View>
        </View>
      </View>

      <View className="px-5 py-5">
        <Text className="text-xs font-medium uppercase tracking-wider text-gray-400">
          {l.brand}
        </Text>
        <Text className="text-xl font-bold text-gray-900">
          {l.model} {l.version}
        </Text>
        <Text className="mt-1 text-sm text-gray-500">
          {conditionLabel} · {l.transmission}
        </Text>

        <View className="mt-4 flex-row justify-between rounded-xl bg-gray-50 px-4 py-3">
          <View>
            <Text className="text-xs text-gray-500">Preço</Text>
            <Text className="text-base font-semibold text-gray-900">
              {formatBRL(l.asking_price)}
            </Text>
          </View>
          <View>
            <Text className="text-xs text-gray-500">TCO mensal</Text>
            <Text className="text-base font-semibold text-brand-700">
              {formatBRL(rec.tco.total)}
            </Text>
          </View>
        </View>

        <View className="mt-4">
          <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Por que esse carro
          </Text>
          {rec.reasons.map((r, i) => (
            <View key={i} className="mt-2 flex-row">
              <Ionicons name="checkmark-circle" size={16} color="#1f54f5" />
              <Text className="ml-2 flex-1 text-sm text-gray-700">{r}</Text>
            </View>
          ))}
        </View>

        <TcoMini breakdown={rec.tco} />

        <SearchOnline
          brand={l.brand}
          model={l.model}
          year={l.year}
          condition={l.condition}
          city={city}
          state={state}
        />
      </View>
    </View>
  );
}

function SearchOnline({
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

  // Webmotors: aceita estadocidade=UF|Cidade
  const wmLoc = city && state
    ? `&estadocidade=${state}%7C${cityParam}`
    : state ? `&estadocidade=${state}` : '';
  const webmotors = `https://www.webmotors.com.br/carros/estoque/${slug(brand)}/${slug(model)}?anoDe=${year}&anoAte=${year}${wmLoc}`;

  // OLX: usa path /estado-{uf}/{cidade-slug}
  const olxLoc = city ? `/${slug(city)}` : '';
  const olx = `https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/${condition === 'used' ? 'usados' : 'novos'}/estado-${uf}${olxLoc}?q=${q}&rs=${year}&re=${year}`;

  // Mercado Livre: filtro via state query (_state=TG-{estado}). Pra MVP só path
  const ml = `https://lista.mercadolivre.com.br/${slug(brand)}-${slug(model)}-${year}${state ? `?_state=TG-${state}` : ''}`;

  return (
    <View className="mt-5 border-t border-gray-100 pt-4">
      <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Ver anúncios deste modelo
        {city && state ? ` em ${city}/${state}` : state ? ` em ${state}` : ''}
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <ExternalLink label="Webmotors" onPress={() => open(webmotors)} />
        <ExternalLink label="OLX" onPress={() => open(olx)} />
        <ExternalLink label="Mercado Livre" onPress={() => open(ml)} />
      </View>
    </View>
  );
}

function ExternalLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-full border border-gray-200 px-3 py-2 active:bg-gray-50"
    >
      <Text className="text-sm font-medium text-gray-800">{label}</Text>
      <Ionicons name="open-outline" size={14} color="#4b5563" style={{ marginLeft: 6 }} />
    </Pressable>
  );
}

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface TcoRow {
  label: string;
  hint?: string;
  value: number;
}

function TcoMini({ breakdown }: { breakdown: TcoBreakdown }) {
  const rows: TcoRow[] = [
    {
      label: 'Parcela do financiamento',
      hint: 'Sai do seu bolso todo mês',
      value: breakdown.installment,
    },
    {
      label: 'Combustível',
      hint: 'Estimativa baseada em quanto você roda',
      value: breakdown.fuel,
    },
    {
      label: 'Seguro',
      hint: 'Mensalizado (anual ÷ 12)',
      value: breakdown.insurance,
    },
    {
      label: 'Manutenção e revisões',
      hint: 'Mensalizado (anual ÷ 12)',
      value: breakdown.maintenance,
    },
    {
      label: 'IPVA',
      hint: 'Mensalizado (anual ÷ 12)',
      value: breakdown.ipva,
    },
    {
      label: 'Depreciação',
      hint: 'Custo "invisível": quanto o carro perde de valor de revenda',
      value: breakdown.depreciation,
    },
  ];
  return (
    <View className="mt-4 border-t border-gray-100 pt-4">
      <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Quanto custa por mês (TCO)
      </Text>
      <Text className="mt-1 text-xs text-gray-400">
        Todos os valores são mensais. Itens anuais (seguro, IPVA, depreciação)
        são divididos por 12.
      </Text>
      {rows.map((row) => (
        <View key={row.label} className="mt-3">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-sm text-gray-700">{row.label}</Text>
            <Text className="text-sm font-medium text-gray-900">
              {formatBRL(row.value)}
              <Text className="text-xs text-gray-400">/mês</Text>
            </Text>
          </View>
          {row.hint ? (
            <Text className="mt-0.5 text-xs text-gray-400">{row.hint}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
