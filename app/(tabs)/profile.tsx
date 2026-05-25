import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/authStore';

export default function ProfileTab() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-6">
        <Text className="text-2xl font-bold text-brand-700">Perfil</Text>
        <Text className="mt-2 text-gray-500">{user?.email}</Text>

        <Pressable
          onPress={() => void signOut()}
          className="mt-8 rounded-xl border border-gray-200 py-4 active:bg-gray-50"
        >
          <Text className="text-center text-base font-semibold text-gray-700">
            Sair
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
