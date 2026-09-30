import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAkol } from '../../lib/store';
import { colors, fonts, SLANT, stroke } from '../../theme';

const TABS: { name: string; title: string; kanji: string }[] = [
  { name: 'index', title: 'Today', kanji: '今日' },
  { name: 'family', title: 'Party', kanji: '家族' },
  { name: 'routines', title: 'Routines', kanji: '日課' },
  { name: 'settings', title: 'Settings', kanji: '設定' },
];

export default function TabsLayout() {
  const { state } = useAkol();
  const insets = useSafeAreaInsets();
  if (!state.settings.onboarded) return <Redirect href="/welcome" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          height: 70 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom + 10,
          backgroundColor: colors.bg,
          elevation: 0,
        },
        tabBarBackground: () => <View style={[StyleSheet.absoluteFill, styles.bar]} />,
        tabBarIconStyle: { display: 'none' },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: () => null,
            // Each tab is a slanted caption block; the current one is inked solid.
            tabBarLabel: ({ focused }) => (
              <View style={[styles.tab, focused && styles.tabActive]}>
                <Text style={[styles.label, focused && { color: colors.bg }]}>{t.title}</Text>
                <Text style={[styles.kanji, focused && { color: colors.bg }]}>{t.kanji}</Text>
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.bg, borderTopWidth: stroke.heavy, borderTopColor: colors.ink },
  tab: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 76,
    transform: [{ skewX: SLANT }],
  },
  tabActive: { backgroundColor: colors.ink },
  label: { fontFamily: fonts.display, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.ink },
  kanji: { fontFamily: fonts.display, fontSize: 9, color: colors.textDim, marginTop: 1 },
});
