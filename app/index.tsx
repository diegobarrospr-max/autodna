// MINIMAL VERSION FOR DEBUGGING

console.warn('[index] module loaded');

import { Text, View } from 'react-native';

console.warn('[index] react-native imported');

export default function Index() {
  console.warn('[index] Index rendering');
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1f54f5' }}>
        AutoDNA debug
      </Text>
      <Text style={{ marginTop: 8, color: '#666' }}>
        If you see this, basic rendering works.
      </Text>
    </View>
  );
}
