import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  quiz: 'help-circle',
  matches: 'car-sport',
  profile: 'person',
};

const LABELS: Record<string, string> = {
  index: 'Início',
  quiz: 'Quiz',
  matches: 'Matches',
  profile: 'Perfil',
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // iOS home indicator é ~34px. Mantemos um mínimo decente para o caso de
  // o inset reportar zero (Safari sem standalone, Android, web normal).
  const bottomPad = Math.max(insets.bottom, 16);

  return (
    <View
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        backgroundColor: '#ffffff',
        paddingTop: 8,
        paddingBottom: bottomPad,
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const color = isFocused ? '#1f54f5' : '#9ca3af';
        const iconName = ICONS[route.name] ?? 'ellipse';
        const label = LABELS[route.name] ?? route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 6,
              gap: 4,
            }}
          >
            <Ionicons name={iconName} size={24} color={color} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '500',
                color,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="quiz" />
      <Tabs.Screen name="matches" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
