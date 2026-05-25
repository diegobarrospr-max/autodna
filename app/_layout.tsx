// DEBUG STEP 3: + QueryClient

console.warn('[_layout] module loaded');

import '../global.css';

console.warn('[_layout] nativewind css imported');

import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

console.warn('[_layout] react libs imported');

import { queryClient } from '@/lib/queryClient';

console.warn('[_layout] queryClient imported');

export default function RootLayout() {
  console.warn('[_layout] RootLayout rendering');
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
