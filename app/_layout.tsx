// MINIMAL VERSION FOR DEBUGGING — strip NativeWind, providers, auth.
// If this renders "AutoDNA debug", we know the crash is in the full stack.

console.warn('[_layout] module loaded');

import { Stack } from 'expo-router';

console.warn('[_layout] expo-router imported');

export default function RootLayout() {
  console.warn('[_layout] RootLayout rendering');
  return <Stack screenOptions={{ headerShown: false }} />;
}
