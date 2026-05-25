import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { useRecommendations } from '@/hooks/useRecommendations';
import { formatBRL, type TcoBreakdown } from '@/utils/tco';
import type { Recommendation } from '@/utils/recommend';

const RANK_BADGE = ['🥇', '🥈', '🥉'];

export default function MatchesTab() {
  const router = useRouter();
  const { data: recs } = useRecommendations();

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

        {recs.map((rec, idx) => (
          <MatchCard key={rec.listing.listing_id} rec={rec} badge={RANK_BADGE[idx] ?? '⭐️'} />
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

function MatchCard({ rec, badge }: { rec: Recommendation; badge: string }) {
  const l = rec.listing;
  const conditionLabel = l.condition === 'new' ? 'Novo' : `Usado · ${l.mileage_km?.toLocaleString('pt-BR')} km`;

  return (
    <View className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <View className="flex-row items-center justify-between bg-brand-50 px-5 py-3">
        <Text className="text-lg">{badge}</Text>
        <View className="rounded-full bg-brand-100 px-3 py-1">
          <Text className="text-xs font-semibold text-brand-700">
            Match {rec.score}/100
          </Text>
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
          {l.year} · {conditionLabel} · {l.transmission}
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
      </View>
    </View>
  );
}

function TcoMini({ breakdown }: { breakdown: TcoBreakdown }) {
  const rows: Array<[string, number]> = [
    ['Parcela financiamento', breakdown.installment],
    ['Combustível', breakdown.fuel],
    ['Seguro', breakdown.insurance],
    ['Manutenção', breakdown.maintenance],
    ['IPVA', breakdown.ipva],
    ['Depreciação', breakdown.depreciation],
  ];
  return (
    <View className="mt-4 border-t border-gray-100 pt-4">
      <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Breakdown do TCO
      </Text>
      {rows.map(([label, value]) => (
        <View key={label} className="mt-2 flex-row justify-between">
          <Text className="text-sm text-gray-600">{label}</Text>
          <Text className="text-sm font-medium text-gray-900">
            {formatBRL(value)}
          </Text>
        </View>
      ))}
    </View>
  );
}
