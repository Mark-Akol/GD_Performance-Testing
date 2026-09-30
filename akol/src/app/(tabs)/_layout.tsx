import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import { KenteBand } from '../../components/Kente';
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
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(14,9,7,0.97)',
          elevation: 0,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            {Platform.OS === 'ios' ? (
              <BlurView tint="dark" intensity={60} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14,9,7,0.97)' }]} />
            )}
            <KenteBand height={4} repeats={8} />
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
