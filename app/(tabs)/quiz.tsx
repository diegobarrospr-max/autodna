import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Pill } from '@/components/Pill';
import { RadioGroup } from '@/components/RadioGroup';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useGenerateRecommendations } from '@/hooks/useRecommendations';
import type {
  CarConditionPreference,
  ParkingType,
  Priority,
} from '@/types/database';

const CONDITION_OPTIONS: { value: CarConditionPreference; label: string; description: string }[] = [
  { value: 'new', label: 'Novo', description: 'Zero km, vindo do catálogo' },
  { value: 'used', label: 'Usado', description: 'Já rodou um pouco, preço menor' },
  { value: 'both', label: 'Tanto faz', description: 'Mostrar as duas opções' },
];

const HOUSEHOLD_OPTIONS = [
  { value: 1, label: '1 pessoa', description: 'Só você' },
  { value: 2, label: '2 pessoas', description: 'Casal' },
  { value: 3, label: '3 pessoas' },
  { value: 4, label: '4 pessoas' },
  { value: 5, label: '5 ou mais' },
];

const PARKING_OPTIONS: { value: ParkingType; label: string; description?: string }[] = [
  { value: 'garagem_coberta', label: 'Garagem coberta', description: 'Casa ou prédio' },
  { value: 'garagem_aberta', label: 'Garagem aberta' },
  { value: 'condominio', label: 'Vaga em condomínio' },
  { value: 'rua', label: 'Na rua', description: 'Sem garagem' },
];

const MONTHLY_KM_OPTIONS = [
  { value: 300, label: 'Pouco', description: 'Menos de 500 km/mês' },
  { value: 1000, label: 'Moderado', description: '500 a 1500 km/mês' },
  { value: 2200, label: 'Bastante', description: '1500 a 3000 km/mês' },
  { value: 3500, label: 'Muito', description: 'Mais de 3000 km/mês' },
];

const MAX_MILEAGE_OPTIONS = [
  { value: 30000, label: 'Até 30 mil km' },
  { value: 60000, label: 'Até 60 mil km' },
  { value: 100000, label: 'Até 100 mil km' },
  { value: 999999, label: 'Sem preferência' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'economia', label: 'Economia' },
  { value: 'conforto', label: 'Conforto' },
  { value: 'espaco', label: 'Espaço' },
  { value: 'robustez', label: 'Robustez' },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'status', label: 'Status' },
];

export default function QuizTab() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const generateRecs = useGenerateRecommendations();

  const [incomeText, setIncomeText] = useState('');
  const [household, setHousehold] = useState<number | null>(null);
  const [parking, setParking] = useState<ParkingType | null>(null);
  const [monthlyKm, setMonthlyKm] = useState<number | null>(null);
  const [condition, setCondition] = useState<CarConditionPreference | null>(null);
  const [maxMileage, setMaxMileage] = useState<number | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);

  useEffect(() => {
    if (!profile) return;
    if (profile.monthly_income) setIncomeText(String(Math.round(profile.monthly_income)));
    if (profile.household_size) setHousehold(profile.household_size);
    if (profile.parking_type) setParking(profile.parking_type);
    if (profile.monthly_km) setMonthlyKm(profile.monthly_km);
    if (profile.car_condition_preference) setCondition(profile.car_condition_preference);
    if (profile.max_mileage_km) setMaxMileage(profile.max_mileage_km);
    if (profile.priorities?.length) setPriorities(profile.priorities);
  }, [profile]);

  const income = useMemo(() => {
    const digits = incomeText.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }, [incomeText]);

  const togglePriority = (p: Priority) => {
    setPriorities((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const canSubmit =
    income > 0 &&
    household !== null &&
    parking !== null &&
    monthlyKm !== null &&
    condition !== null &&
    priorities.length > 0 &&
    (condition !== 'used' || maxMileage !== null);

  const onSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Falta pouco', 'Preenche todas as perguntas antes de continuar.');
      return;
    }

    try {
      await updateProfile.mutateAsync({
        monthly_income: income,
        household_size: household,
        parking_type: parking,
        monthly_km: monthlyKm,
        car_condition_preference: condition,
        max_mileage_km: condition === 'used' ? maxMileage : null,
        priorities,
        quiz_completed_at: new Date().toISOString(),
      });

      const recs = await generateRecs.mutateAsync({
        monthly_income: income,
        household_size: household ?? 1,
        monthly_km: monthlyKm ?? 0,
        car_condition_preference: condition ?? 'both',
        max_mileage_km: condition === 'used' ? maxMileage : null,
        priorities,
      });

      if (recs.length === 0) {
        Alert.alert(
          'Nenhum match encontrado',
          'Os filtros foram muito restritivos. Tenta trocar a preferência de condição para "Tanto faz" ou rever o número de pessoas no carro.',
        );
        return;
      }

      router.push('/(tabs)/matches');
    } catch (err) {
      Alert.alert('Erro ao gerar matches', (err as Error).message);
    }
  };

  const submitting = updateProfile.isPending || generateRecs.isPending;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-sm font-medium uppercase tracking-wider text-brand-600">
            Quiz
          </Text>
          <Text className="mt-2 text-3xl font-bold text-gray-900">
            Conta pra gente
          </Text>
          <Text className="mt-2 text-base leading-6 text-gray-500">
            7 perguntas rápidas e a gente acha o carro que faz sentido pro seu
            bolso e seu estilo.
          </Text>

          <Question number={1} title="Qual sua renda mensal líquida?" hint="Soma tudo que entra na sua conta por mês.">
            <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4">
              <Text className="text-base text-gray-500">R$</Text>
              <TextInput
                className="ml-2 flex-1 py-3 text-base text-gray-900"
                placeholder="5000"
                keyboardType="number-pad"
                value={incomeText}
                onChangeText={setIncomeText}
              />
            </View>
          </Question>

          <Question number={2} title="Quantas pessoas vão usar o carro?">
            <RadioGroup
              value={household}
              onChange={setHousehold}
              options={HOUSEHOLD_OPTIONS}
            />
          </Question>

          <Question number={3} title="Onde você vai guardar?">
            <RadioGroup
              value={parking}
              onChange={setParking}
              options={PARKING_OPTIONS}
            />
          </Question>

          <Question number={4} title="Quanto você dirige por mês?">
            <RadioGroup
              value={monthlyKm}
              onChange={setMonthlyKm}
              options={MONTHLY_KM_OPTIONS}
            />
          </Question>

          <Question number={5} title="Procura um carro novo ou usado?">
            <RadioGroup
              value={condition}
              onChange={setCondition}
              options={CONDITION_OPTIONS}
            />
          </Question>

          {condition === 'used' && (
            <Question
              number={6}
              title="Qual a quilometragem máxima aceitável?"
              hint="Quanto menor, mais novo o usado — e mais caro também."
            >
              <RadioGroup
                value={maxMileage}
                onChange={setMaxMileage}
                options={MAX_MILEAGE_OPTIONS}
              />
            </Question>
          )}

          <Question
            number={condition === 'used' ? 7 : 6}
            title="O que mais importa pra você?"
            hint="Escolhe pelo menos uma. Pode marcar várias."
          >
            <View className="flex-row flex-wrap">
              {PRIORITY_OPTIONS.map((opt) => (
                <Pill
                  key={opt.value}
                  label={opt.label}
                  selected={priorities.includes(opt.value)}
                  onPress={() => togglePriority(opt.value)}
                />
              ))}
            </View>
          </Question>

          <View className="mt-8">
            <Button
              label={submitting ? 'Encontrando matches…' : 'Ver meus matches'}
              loading={submitting}
              onPress={onSubmit}
              disabled={!canSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Question({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-8">
      <View className="flex-row items-baseline">
        <Text className="mr-2 text-sm font-bold text-brand-600">
          {String(number).padStart(2, '0')}
        </Text>
        <Text className="flex-1 text-lg font-semibold text-gray-900">
          {title}
        </Text>
      </View>
      {hint ? (
        <Text className="mt-1 text-sm text-gray-500">{hint}</Text>
      ) : null}
      <View className="mt-4">{children}</View>
    </View>
  );
}
