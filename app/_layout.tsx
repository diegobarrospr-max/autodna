// DEBUG STEP 1: re-add NativeWind global.css only

console.warn('[_layout] module loaded');

import '../global.css';

console.warn('[_layout] nativewind css imported');

import { Stack } from 'expo-router';

console.warn('[_layout] expo-router imported');

export default function RootLayout() {
  console.warn('[_layout] RootLayout rendering');
  return <Stack screenOptions={{ headerShown: false }} />;
}
