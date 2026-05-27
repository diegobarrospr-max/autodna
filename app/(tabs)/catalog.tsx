import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  useCarCatalog,
  type CatalogBodyFilter,
  type CatalogConditionFilter,
  type CatalogFilters,
  type CatalogItem,
  type CatalogTransmissionFilter,
} from '@/hooks/useCarCatalog';
import { formatBRL } from '@/utils/tco';

const BODY_OPTIONS: Array<{ value: CatalogBodyFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'hatch', label: 'Hatch' },
  { value: 'sedan', label: 'Sedã' },
  { value: 'suv', label: 'SUV' },
  { value: 'crossover', label: 'Crossover' },
  { value: 'pickup', label: 'Picape' },
  { value: 'minivan', label: 'Minivan' },
];

const TRANSMISSION_OPTIONS: Array<{
  value: CatalogTransmissionFilter;
  label: string;
}> = [
  { value: 'all', label: 'Qualquer' },
  { value: 'automatic', label: 'Automático' },
  { value: 'manual', label: 'Manual' },
];

const CONDITION_OPTIONS: Array<{
  value: CatalogConditionFilter;
  label: string;
}> = [
  { value: 'all', label: 'Novos e usados' },
  { value: 'new', label: 'Novos' },
  { value: 'used', label: 'Usados' },
];

export default function CatalogTab() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [body, setBody] = useState<CatalogBodyFilter>('all');
  const [transmission, setTransmission] =
    useState<CatalogTransmissionFilter>('all');
  const [condition, setCondition] = useState<CatalogConditionFilter>('all');

  const filters = useMemo<CatalogFilters>(
    () => ({ search, body, transmission, condition }),
    [search, body, transmission, condition],
  );

  const query = useCarCatalog(filters);

  const items = useMemo<CatalogItem[]>(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-6 pt-4 pb-2">
        <Text className="text-3xl font-bold text-gray-900">Catálogo</Text>
        <Text className="mt-1 text-sm text-gray-500">
          Navegue todos os modelos cadastrados — não precisa ter feito o quiz.
        </Text>
      </View>

      <View className="px-6 pb-3">
        <View className="flex-row items-center rounded-xl border border-gray-200 px-3 py-2">
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar marca, modelo ou versão"
            placeholderTextColor="#9ca3af"
            autoCorrect={false}
            autoCapitalize="none"
            className="ml-2 flex-1 text-base text-gray-900"
            style={{ paddingVertical: 4 }}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FilterRow label="Carroceria">
        {BODY_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={body === opt.value}
            onPress={() => setBody(opt.value)}
          />
        ))}
      </FilterRow>
      <FilterRow label="Câmbio">
        {TRANSMISSION_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={transmission === opt.value}
            onPress={() => setTransmission(opt.value)}
          />
        ))}
      </FilterRow>
      <FilterRow label="Condição">
        {CONDITION_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={condition === opt.value}
            onPress={() => setCondition(opt.value)}
          />
        ))}
      </FilterRow>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <CatalogRow
            item={item}
            onPress={() => router.push(`/car/${item.id}`)}
          />
        )}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          query.isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#1f54f5" />
            </View>
          ) : (
            <View className="items-center py-12">
              <Ionicons name="car-outline" size={36} color="#9ca3af" />
              <Text className="mt-3 text-base text-gray-500">
                Nenhum modelo encontrado.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator color="#1f54f5" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="px-6 pb-2">
      <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </Text>
      <View className="flex-row flex-wrap" style={{ gap: 6 }}>
        {children}
      </View>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={
        active
          ? 'rounded-full bg-brand-600 px-3 py-1.5'
          : 'rounded-full border border-gray-200 px-3 py-1.5'
      }
    >
      <Text
        className={
          active
            ? 'text-xs font-semibold text-white'
            : 'text-xs font-medium text-gray-700'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CatalogRow({
  item,
  onPress,
}: {
  item: CatalogItem;
  onPress: () => void;
}) {
  const priceLabel =
    item.price_fipe > 0 ? formatBRL(item.price_fipe) : 'Preço sob consulta';

  return (
    <Pressable
      onPress={onPress}
      className="mt-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 active:bg-gray-50"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {item.brand}
          </Text>
          <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
            {item.model}
          </Text>
          <Text className="mt-0.5 text-xs text-gray-500" numberOfLines={2}>
            {item.version} · {item.year}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-semibold text-brand-700">
            {priceLabel}
          </Text>
          {item.is_estimated ? (
            <View className="mt-1 rounded-full bg-gray-100 px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-gray-600">
                Estimativa
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View className="mt-2 flex-row flex-wrap" style={{ gap: 4 }}>
        <Tag label={item.body_type} />
        <Tag label={item.fuel} />
        <Tag label={item.transmission} />
      </View>
    </Pressable>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View className="rounded bg-gray-100 px-2 py-0.5">
      <Text className="text-[10px] font-medium uppercase tracking-wider text-gray-600">
        {label}
      </Text>
    </View>
  );
}
