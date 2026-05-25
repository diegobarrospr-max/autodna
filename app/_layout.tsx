// DEBUG STEP 2: re-add NativeWind + GestureHandler + SafeArea

console.warn('[_layout] module loaded');

import '../global.css';

console.warn('[_layout] nativewind css imported');

import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

console.warn('[_layout] all imports done');

export default function RootLayout() {
  console.warn('[_layout] RootLayout rendering');
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
