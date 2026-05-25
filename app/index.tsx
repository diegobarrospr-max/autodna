console.warn('[index] module loaded');

import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  console.warn('[index] Index rendering');
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
