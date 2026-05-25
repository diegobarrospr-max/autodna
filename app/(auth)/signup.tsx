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

export default function SignUpScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const signUp = useAuthStore((s) => s.signUpWithPassword);

  const onSubmit = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Preencha todos os campos');
      return;
    }
    if (password.length < 8) {
      Alert.alert('A senha precisa de no mínimo 8 caracteres');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email.trim(), password, fullName.trim());
      Alert.alert(
        'Confirme seu email',
        'Enviamos um link de confirmação para o seu email.',
      );
    } catch (err) {
      Alert.alert('Erro ao criar conta', (err as Error).message);
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
          <Text className="mb-2 text-3xl font-bold text-brand-700">
            Criar conta
          </Text>
          <Text className="mb-8 text-base text-gray-500">
            Em segundos, comece a descobrir o seu carro ideal.
          </Text>

          <Text className="mb-1 text-sm font-medium text-gray-700">
            Nome completo
          </Text>
          <TextInput
            className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base"
            placeholder="Seu nome"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
          />

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
            placeholder="Mínimo 8 caracteres"
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
              {submitting ? 'Criando…' : 'Criar conta'}
            </Text>
          </Pressable>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-gray-500">Já tem conta? </Text>
            <Link href="/(auth)/login" className="font-semibold text-brand-600">
              Entrar
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
