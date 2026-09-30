import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DoubleRule } from '../../components/Rules';
import { useAkol } from '../../lib/store';
import { colors, fonts } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Today', icon: 'sunny-outline', iconActive: 'sunny' },
  { name: 'family', title: 'Family', icon: 'people-outline', iconActive: 'people' },
  { name: 'routines', title: 'Routines', icon: 'time-outline', iconActive: 'time' },
  { name: 'settings', title: 'Settings', icon: 'options-outline', iconActive: 'options' },
];

export default function TabsLayout() {
  const { state } = useAkol();
  if (!state.settings.onboarded) return <Redirect href="/welcome" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textFaint,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 9.5, letterSpacing: 1.4, textTransform: 'uppercase' },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: colors.bg,
          elevation: 0,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
            <DoubleRule inverted />
          </View>
        ),
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? t.iconActive : t.icon} size={size - 2} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
