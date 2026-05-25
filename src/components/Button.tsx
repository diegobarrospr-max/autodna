import { ActivityIndicator, Pressable, Text } from 'react-native';
import type { PressableProps } from 'react-native';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  loading,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerByVariant = {
    primary: 'bg-brand-600 active:bg-brand-700',
    secondary: 'bg-white border border-gray-200 active:bg-gray-50',
    ghost: 'bg-transparent active:bg-gray-100',
  }[variant];

  const textByVariant = {
    primary: 'text-white',
    secondary: 'text-gray-900',
    ghost: 'text-brand-600',
  }[variant];

  return (
    <Pressable
      disabled={isDisabled}
      className={`rounded-xl py-4 ${containerByVariant} ${
        isDisabled ? 'opacity-50' : ''
      }`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#1f54f5'} />
      ) : (
        <Text className={`text-center text-base font-semibold ${textByVariant}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
