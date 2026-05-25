// DEBUG STEP 4: full version with Supabase + authStore + AuthGate

console.warn('[_layout] module loaded');

import '../global.css';

console.warn('[_layout] nativewind css imported');

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

console.warn('[_layout] react libs imported');

import { queryClient } from '@/lib/queryClient';

console.warn('[_layout] queryClient imported');

import { useAuthStore } from '@/stores/authStore';

console.warn('[_layout] authStore imported');

function AuthGate() {
  console.warn('[AuthGate] rendering');
  const status = useAuthStore((s) => s.status);
  const initialize = useAuthStore((s) => s.initialize);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.warn('[AuthGate] mounting, calling initialize()');
    void initialize();
  }, [initialize]);

  useEffect(() => {
    console.warn('[AuthGate] status=', status, 'segments=', JSON.stringify(segments));
    if (status === 'idle' || status === 'loading') return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (status === 'unauthenticated' && !inAuthGroup) {
      console.warn('[AuthGate] redirect -> /(auth)/login');
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && !inTabsGroup) {
      console.warn('[AuthGate] redirect -> /(tabs)');
      router.replace('/(tabs)');
    }
  }, [status, segments, router]);

  return null;
}

export default function RootLayout() {
  console.warn('[_layout] RootLayout rendering');
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGate />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
