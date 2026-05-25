import { Pressable, Text } from 'react-native';

interface PillProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Pill({ label, selected, onPress }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 mb-2 rounded-full border px-4 py-2 ${
        selected
          ? 'border-brand-600 bg-brand-50'
          : 'border-gray-200 bg-white active:bg-gray-50'
      }`}
    >
      <Text
        className={`text-sm font-medium ${
          selected ? 'text-brand-700' : 'text-gray-700'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
