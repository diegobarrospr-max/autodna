import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const signIn = useAuthStore((s) => s.signInWithPassword);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Preencha email e senha');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      Alert.alert('Erro ao entrar', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          <Text className="mb-2 text-3xl font-bold text-brand-700">AutoDNA</Text>
          <Text className="mb-8 text-base text-gray-500">
            Encontre o carro que combina com você.
          </Text>

          <Text className="mb-1 text-sm font-medium text-gray-700">Email</Text>
          <TextInput
            className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base"
            placeholder="seu@email.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text className="mb-1 text-sm font-medium text-gray-700">Senha</Text>
          <TextInput
            className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            disabled={submitting}
            onPress={onSubmit}
            className="rounded-xl bg-brand-600 py-4 active:bg-brand-700 disabled:opacity-60"
          >
            <Text className="text-center text-base font-semibold text-white">
              {submitting ? 'Entrando…' : 'Entrar'}
            </Text>
          </Pressable>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-gray-500">Não tem conta? </Text>
            <Link href="/(auth)/signup" className="font-semibold text-brand-600">
              Criar conta
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
