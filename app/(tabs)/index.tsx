import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeTab() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-6">
        <Text className="text-2xl font-bold text-brand-700">Olá!</Text>
        <Text className="mt-2 text-gray-500">
          Faça o quiz para descobrir o carro que combina com você.
        </Text>
      </View>
    </SafeAreaView>
  );
}
