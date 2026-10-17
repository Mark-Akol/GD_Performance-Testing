import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '../../components/ui';
import { useAkol } from '../../lib/store';
import { colors, fonts, radius, shadow } from '../../theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: { name: string; title: string }[] = [
  { name: 'index', title: 'Today' },
  { name: 'family', title: 'Family' },
  { name: 'routines', title: 'Routines' },
  { name: 'settings', title: 'Settings' },
];

/** A floating white capsule; the current tab is a solid ink pill. */
function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 14 }]} pointerEvents="box-none">
      <View style={styles.capsule}>
        {Platform.OS !== 'android' && <BlurView tint="light" intensity={50} style={[StyleSheet.absoluteFill, { borderRadius: radius.pill, overflow: "hidden" }]} />}
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const title = TABS.find((t) => t.name === route.name)?.title ?? route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => {
                tap();
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.item}
            >
              <View style={[styles.pill, focused && styles.pillActive]}>
                <Text style={[styles.label, focused && styles.labelActive]}>{title}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { state } = useAkol();
  if (!state.settings.onboarded) return <Redirect href="/welcome" />;

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  capsule: {
    width: '100%',
    maxWidth: 520,
    height: 62,
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255,255,255,0.92)',
    ...shadow,
    padding: 5,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px)' } as object) : {}),
  },
  item: { flex: 1 },
  pill: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.ink },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textDim },
  labelActive: { color: colors.onPaper },
});
