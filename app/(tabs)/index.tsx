import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';

export default function HomeTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ??
    'amigo';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-4">
        <Text className="text-sm font-medium uppercase tracking-wider text-brand-600">
          AutoDNA
        </Text>
        <Text className="mt-2 text-3xl font-bold text-gray-900">
          Oi, {firstName}!
        </Text>
        <Text className="mt-2 text-base leading-6 text-gray-500">
          Em poucos minutos a gente descobre qual carro combina de verdade com o
          seu jeito de viver — e quanto ele realmente custa por mês.
        </Text>

        <View className="mt-8 rounded-2xl bg-brand-50 p-5">
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-100">
              <Ionicons name="sparkles" size={20} color="#1f54f5" />
            </View>
            <Text className="ml-3 flex-1 text-base font-semibold text-brand-900">
              Encontre seu carro ideal
            </Text>
          </View>
          <Text className="mt-3 text-sm leading-5 text-brand-800">
            Responda 6 perguntas sobre seu perfil, orçamento e estilo de vida.
            Levamos em conta combustível, manutenção, seguro e depreciação.
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/quiz')}
            className="mt-5 rounded-xl bg-brand-600 py-3 active:bg-brand-700"
          >
            <Text className="text-center text-base font-semibold text-white">
              Começar o quiz
            </Text>
          </Pressable>
        </View>

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-gray-200 p-4">
            <Ionicons name="car-sport" size={22} color="#1f54f5" />
            <Text className="mt-3 text-sm font-semibold text-gray-900">
              40 modelos
            </Text>
            <Text className="mt-1 text-xs text-gray-500">
              Catálogo dos mais vendidos no Brasil
            </Text>
          </View>
          <View className="flex-1 rounded-2xl border border-gray-200 p-4">
            <Ionicons name="cash" size={22} color="#1f54f5" />
            <Text className="mt-3 text-sm font-semibold text-gray-900">
              Custo real
            </Text>
            <Text className="mt-1 text-xs text-gray-500">
              Parcela + combustível + seguro + IPVA
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
