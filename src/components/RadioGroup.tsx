import { Pressable, Text, View } from 'react-native';

interface Option<T extends string | number> {
  value: T;
  label: string;
  description?: string;
}

interface RadioGroupProps<T extends string | number> {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

export function RadioGroup<T extends string | number>({
  options,
  value,
  onChange,
}: RadioGroupProps<T>) {
  return (
    <View>
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            className={`mb-2 flex-row items-center rounded-xl border p-4 ${
              isSelected
                ? 'border-brand-600 bg-brand-50'
                : 'border-gray-200 bg-white active:bg-gray-50'
            }`}
          >
            <View
              className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${
                isSelected ? 'border-brand-600' : 'border-gray-300'
              }`}
            >
              {isSelected ? (
                <View className="h-2.5 w-2.5 rounded-full bg-brand-600" />
              ) : null}
            </View>
            <View className="flex-1">
              <Text
                className={`text-base font-medium ${
                  isSelected ? 'text-brand-900' : 'text-gray-900'
                }`}
              >
                {opt.label}
              </Text>
              {opt.description ? (
                <Text className="mt-0.5 text-xs text-gray-500">
                  {opt.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
