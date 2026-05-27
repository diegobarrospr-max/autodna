import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { Pill } from '@/components/Pill';
import { RadioGroup } from '@/components/RadioGroup';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useGenerateRecommendations } from '@/hooks/useRecommendations';
import { useFinancingRate } from '@/hooks/useFinancingRate';
import { detectLocation } from '@/utils/geolocation';
import type {
  CarConditionPreference,
  ParkingType,
  PaymentMode,
  Priority,
  TransmissionPreference,
} from '@/types/database';

const CONDITION_OPTIONS: { value: CarConditionPreference; label: string; description: string }[] = [
  { value: 'new', label: 'Novo', description: 'Zero km, vindo do catálogo' },
  { value: 'used', label: 'Usado', description: 'Já rodou um pouco, preço menor' },
  { value: 'both', label: 'Tanto faz', description: 'Mostrar as duas opções' },
];

const TRANSMISSION_OPTIONS: { value: TransmissionPreference; label: string; description?: string }[] = [
  { value: 'automatic', label: 'Automático', description: 'Inclui automatizado e CVT' },
  { value: 'manual', label: 'Manual', description: 'Câmbio com embreagem' },
  { value: 'any', label: 'Tanto faz' },
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

const PAYMENT_OPTIONS: { value: PaymentMode; label: string; description: string }[] = [
  { value: 'financed', label: 'Vou financiar', description: 'Entrada + parcelas mensais' },
  { value: 'cash', label: 'Vou pagar à vista', description: 'Sem parcelas' },
];

const DOWN_PAYMENT_OPTIONS = [
  { value: 0, label: 'Sem entrada' },
  { value: 10, label: '10% de entrada' },
  { value: 20, label: '20% de entrada' },
  { value: 30, label: '30% de entrada' },
  { value: 50, label: '50% de entrada' },
];

const UF_OPTIONS = [
  { value: 'AC', label: 'AC - Acre' },
  { value: 'AL', label: 'AL - Alagoas' },
  { value: 'AP', label: 'AP - Amapá' },
  { value: 'AM', label: 'AM - Amazonas' },
  { value: 'BA', label: 'BA - Bahia' },
  { value: 'CE', label: 'CE - Ceará' },
  { value: 'DF', label: 'DF - Distrito Federal' },
  { value: 'ES', label: 'ES - Espírito Santo' },
  { value: 'GO', label: 'GO - Goiás' },
  { value: 'MA', label: 'MA - Maranhão' },
  { value: 'MT', label: 'MT - Mato Grosso' },
  { value: 'MS', label: 'MS - Mato Grosso do Sul' },
  { value: 'MG', label: 'MG - Minas Gerais' },
  { value: 'PA', label: 'PA - Pará' },
  { value: 'PB', label: 'PB - Paraíba' },
  { value: 'PR', label: 'PR - Paraná' },
  { value: 'PE', label: 'PE - Pernambuco' },
  { value: 'PI', label: 'PI - Piauí' },
  { value: 'RJ', label: 'RJ - Rio de Janeiro' },
  { value: 'RN', label: 'RN - Rio Grande do Norte' },
  { value: 'RS', label: 'RS - Rio Grande do Sul' },
  { value: 'RO', label: 'RO - Rondônia' },
  { value: 'RR', label: 'RR - Roraima' },
  { value: 'SC', label: 'SC - Santa Catarina' },
  { value: 'SP', label: 'SP - São Paulo' },
  { value: 'SE', label: 'SE - Sergipe' },
  { value: 'TO', label: 'TO - Tocantins' },
];

const FINANCING_MONTHS_OPTIONS = [
  { value: 24, label: '24 meses' },
  { value: 36, label: '36 meses' },
  { value: 48, label: '48 meses' },
  { value: 60, label: '60 meses' },
  { value: 72, label: '72 meses' },
];

export default function QuizTab() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const generateRecs = useGenerateRecommendations();
  const rateQuery = useFinancingRate();

  const [incomeText, setIncomeText] = useState('');
  const [budgetText, setBudgetText] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState<string | null>(null);
  const [household, setHousehold] = useState<number | null>(null);
  const [parking, setParking] = useState<ParkingType | null>(null);
  const [monthlyKm, setMonthlyKm] = useState<number | null>(null);
  const [condition, setCondition] = useState<CarConditionPreference | null>(null);
  const [transmission, setTransmission] = useState<TransmissionPreference | null>(null);
  const [maxMileage, setMaxMileage] = useState<number | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [downPayment, setDownPayment] = useState<number | null>(null);
  const [months, setMonths] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const onDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const loc = await detectLocation();
      setCity(loc.city);
      setStateUf(loc.state);
    } catch (err) {
      Alert.alert(
        'Não consegui detectar',
        (err as Error).message + '\n\nVocê pode digitar manualmente abaixo.',
      );
    } finally {
      setDetectingLocation(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    if (profile.monthly_income) setIncomeText(String(Math.round(profile.monthly_income)));
    if (profile.max_budget) setBudgetText(String(Math.round(profile.max_budget)));
    if (profile.city) setCity(profile.city);
    if (profile.state) setStateUf(profile.state);
    if (profile.household_size) setHousehold(profile.household_size);
    if (profile.parking_type) setParking(profile.parking_type);
    if (profile.monthly_km) setMonthlyKm(profile.monthly_km);
    if (profile.car_condition_preference) setCondition(profile.car_condition_preference);
    if (profile.transmission_preference) setTransmission(profile.transmission_preference);
    if (profile.max_mileage_km) setMaxMileage(profile.max_mileage_km);
    if (profile.priorities?.length) setPriorities(profile.priorities);
    if (profile.payment_mode) setPaymentMode(profile.payment_mode);
    if (profile.down_payment_pct != null) setDownPayment(Number(profile.down_payment_pct));
    if (profile.financing_months) setMonths(profile.financing_months);
  }, [profile]);

  const income = useMemo(() => {
    const digits = incomeText.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }, [incomeText]);

  const budget = useMemo(() => {
    const digits = budgetText.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }, [budgetText]);

  const togglePriority = (p: Priority) => {
    setPriorities((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const canSubmit =
    income > 0 &&
    city.trim().length >= 2 &&
    stateUf !== null &&
    household !== null &&
    parking !== null &&
    monthlyKm !== null &&
    condition !== null &&
    transmission !== null &&
    paymentMode !== null &&
    priorities.length > 0 &&
    (condition !== 'used' || maxMileage !== null) &&
    (paymentMode !== 'financed' || (downPayment !== null && months !== null));

  const onSubmit = async () => {
    if (!canSubmit) {
      const missing: string[] = [];
      if (income <= 0) missing.push('renda');
      if (city.trim().length < 2) missing.push('cidade');
      if (!stateUf) missing.push('estado (UF)');
      if (household === null) missing.push('quantas pessoas');
      if (parking === null) missing.push('onde guarda');
      if (monthlyKm === null) missing.push('quanto dirige');
      if (condition === null) missing.push('novo/usado');
      if (transmission === null) missing.push('câmbio');
      if (paymentMode === null) missing.push('como pagar');
      if (priorities.length === 0) missing.push('prioridades');
      if (condition === 'used' && maxMileage === null) missing.push('km máximo');
      if (paymentMode === 'financed' && downPayment === null) missing.push('entrada');
      if (paymentMode === 'financed' && months === null) missing.push('prazo');
      Alert.alert(
        'Falta pouco',
        `Preenche: ${missing.join(', ')}.`,
      );
      return;
    }

    if (paymentMode === 'financed' && !rateQuery.data) {
      Alert.alert(
        'Buscando a taxa do mercado',
        rateQuery.isFetching
          ? 'Aguarde alguns segundos e tente de novo.'
          : `Falha ao consultar a taxa: ${rateQuery.error?.message ?? 'tente novamente'}`,
      );
      return;
    }

    try {
      await updateProfile.mutateAsync({
        monthly_income: income,
        max_budget: budget > 0 ? budget : null,
        city: city.trim(),
        state: stateUf,
        household_size: household,
        parking_type: parking,
        monthly_km: monthlyKm,
        car_condition_preference: condition,
        transmission_preference: transmission,
        max_mileage_km: condition === 'used' ? maxMileage : null,
        priorities,
        payment_mode: paymentMode,
        down_payment_pct: paymentMode === 'financed' ? downPayment : null,
        financing_months: paymentMode === 'financed' ? months : null,
        quiz_completed_at: new Date().toISOString(),
      });

      const recs = await generateRecs.mutateAsync({
        monthly_income: income,
        max_budget: budget > 0 ? budget : null,
        household_size: household ?? 1,
        monthly_km: monthlyKm ?? 0,
        car_condition_preference: condition ?? 'both',
        transmission_preference: transmission ?? 'any',
        max_mileage_km: condition === 'used' ? maxMileage : null,
        priorities,
        payment_mode: paymentMode ?? 'financed',
        down_payment_pct: paymentMode === 'financed' ? (downPayment ?? 0) : 0,
        financing_months: paymentMode === 'financed' ? (months ?? 60) : 60,
        monthly_interest:
          paymentMode === 'financed' ? rateQuery.data!.monthly_rate : 0,
      });

      if (recs.length === 0) {
        Alert.alert(
          'Nenhum match encontrado',
          'Os filtros foram muito restritivos. Tenta aumentar o teto de orçamento, trocar a preferência de câmbio ou ampliar a condição (novo/usado).',
        );
        return;
      }

      router.push('/(tabs)/matches');
    } catch (err) {
      Alert.alert('Erro ao gerar matches', (err as Error).message);
    }
  };

  const submitting = updateProfile.isPending || generateRecs.isPending;

  let n = 0;
  const next = () => ++n;

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
            Algumas perguntas rápidas e a gente acha o carro que faz sentido pro
            seu bolso e seu estilo.
          </Text>

          <Question number={next()} title="Qual sua renda mensal líquida?" hint="Soma tudo que entra na sua conta por mês.">
            <MoneyInput value={incomeText} onChangeText={setIncomeText} placeholder="5000" />
          </Question>

          <Question
            number={next()}
            title="Qual o valor máximo que aceita pagar pelo carro?"
            hint="Opcional. Se ficar em branco, mostramos tudo dentro do seu TCO."
          >
            <MoneyInput value={budgetText} onChangeText={setBudgetText} placeholder="Sem limite" />
          </Question>

          <Question
            number={next()}
            title="Onde você está?"
            hint="A gente usa pra mostrar anúncios na sua região."
          >
            <Pressable
              onPress={onDetectLocation}
              disabled={detectingLocation}
              className="mb-3 flex-row items-center justify-center rounded-xl border border-brand-200 bg-brand-50 py-3 active:bg-brand-100 disabled:opacity-60"
            >
              <Ionicons name="location" size={18} color="#1f54f5" />
              <Text className="ml-2 text-sm font-semibold text-brand-700">
                {detectingLocation ? 'Detectando…' : 'Usar minha localização'}
              </Text>
            </Pressable>
            <View className="mb-2 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4">
              <TextInput
                className="flex-1 py-3 text-base text-gray-900"
                placeholder="Cidade (ex: São Paulo)"
                autoCapitalize="words"
                value={city}
                onChangeText={setCity}
              />
            </View>
            <RadioGroup
              value={stateUf}
              onChange={setStateUf}
              options={UF_OPTIONS}
            />
          </Question>

          <Question number={next()} title="Quantas pessoas vão usar o carro?">
            <RadioGroup value={household} onChange={setHousehold} options={HOUSEHOLD_OPTIONS} />
          </Question>

          <Question number={next()} title="Onde você vai guardar?">
            <RadioGroup value={parking} onChange={setParking} options={PARKING_OPTIONS} />
          </Question>

          <Question number={next()} title="Quanto você dirige por mês?">
            <RadioGroup value={monthlyKm} onChange={setMonthlyKm} options={MONTHLY_KM_OPTIONS} />
          </Question>

          <Question number={next()} title="Como você pretende pagar?">
            <RadioGroup value={paymentMode} onChange={setPaymentMode} options={PAYMENT_OPTIONS} />
          </Question>

          {paymentMode === 'financed' && (
            <>
              <Question number={next()} title="Quanto consegue dar de entrada?">
                <RadioGroup value={downPayment} onChange={setDownPayment} options={DOWN_PAYMENT_OPTIONS} />
              </Question>

              <Question
                number={next()}
                title="Em quantos meses quer pagar?"
                hint={
                  rateQuery.data
                    ? `Taxa atual de mercado: ${rateQuery.data.annual_rate.toFixed(2)}% a.a. (≈ ${(rateQuery.data.monthly_rate * 100).toFixed(2)}% a.m.). Fonte: ${rateQuery.data.source}, ${rateQuery.data.as_of}.`
                    : rateQuery.isFetching
                      ? 'Buscando a taxa atual no Banco Central…'
                      : 'A taxa será buscada no Banco Central na simulação.'
                }
              >
                <RadioGroup value={months} onChange={setMonths} options={FINANCING_MONTHS_OPTIONS} />
              </Question>
            </>
          )}

          {paymentMode === 'cash' && (
            <View className="mt-4 rounded-2xl bg-gray-50 p-4">
              <Text className="text-sm text-gray-600">
                Pagando à vista, a parcela some do cálculo e o TCO mensal cai
                bastante. Você ainda paga seguro, manutenção, IPVA, combustível
                e depreciação.
              </Text>
            </View>
          )}

          <Question number={next()} title="Procura um carro novo ou usado?">
            <RadioGroup value={condition} onChange={setCondition} options={CONDITION_OPTIONS} />
          </Question>

          <Question number={next()} title="Câmbio: automático ou manual?">
            <RadioGroup value={transmission} onChange={setTransmission} options={TRANSMISSION_OPTIONS} />
          </Question>

          {condition === 'used' && (
            <Question
              number={next()}
              title="Qual a quilometragem máxima aceitável?"
              hint="Quanto menor, mais novo o usado — e mais caro também."
            >
              <RadioGroup value={maxMileage} onChange={setMaxMileage} options={MAX_MILEAGE_OPTIONS} />
            </Question>
          )}

          <Question
            number={next()}
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

function MoneyInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (s: string) => void;
  placeholder: string;
}) {
  return (
    <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4">
      <Text className="text-base text-gray-500">R$</Text>
      <TextInput
        className="ml-2 flex-1 py-3 text-base text-gray-900"
        placeholder={placeholder}
        keyboardType="number-pad"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
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
