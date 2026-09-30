import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAkol } from '../../lib/store';
import { colors, fonts } from '../../theme';

const TABS: { name: string; title: string }[] = [
  { name: 'index', title: 'Today' },
  { name: 'family', title: 'Family' },
  { name: 'routines', title: 'Routines' },
  { name: 'settings', title: 'Settings' },
];

export default function TabsLayout() {
  const { state } = useAkol();
  const insets = useSafeAreaInsets();
  if (!state.settings.onboarded) return <Redirect href="/welcome" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textFaint,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 9.5, lineHeight: 14, letterSpacing: 2.2, textTransform: 'uppercase', marginTop: 6 },
        tabBarIconStyle: { height: 12, minHeight: 12 },
        tabBarItemStyle: { justifyContent: 'center' },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          height: 72 + insets.bottom,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: colors.bg,
          elevation: 0,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.ink }]} />
        ),
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            // Each tab is a mark from the Dial: open, or filled when you're on it.
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  borderWidth: 1,
                  borderColor: colors.ink,
                  backgroundColor: focused ? colors.ink : 'transparent',
                }}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
