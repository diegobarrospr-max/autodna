import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MatchesTab() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-6">
        <Text className="text-2xl font-bold text-brand-700">Matches</Text>
        <Text className="mt-2 text-gray-500">
          Seus melhores carros aparecerão aqui.
        </Text>
      </View>
    </SafeAreaView>
  );
}
