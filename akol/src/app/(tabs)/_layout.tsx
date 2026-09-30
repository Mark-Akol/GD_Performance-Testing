import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '../../components/ui';
import { useAkol } from '../../lib/store';
import { colors, fonts, radius } from '../../theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: { name: string; title: string }[] = [
  { name: 'index', title: 'Today' },
  { name: 'family', title: 'Family' },
  { name: 'routines', title: 'Routines' },
  { name: 'settings', title: 'Settings' },
];

/** A floating glass capsule rather than a bar pinned to the edge. */
function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 14 }]} pointerEvents="box-none">
      <View style={styles.capsule}>
        {Platform.OS !== 'android' && <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />}
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
              <Text style={[styles.label, focused && styles.labelActive]}>{title}</Text>
              <View style={[styles.dot, focused && styles.dotActive]} />
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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(16,14,22,0.78)',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px)' } as object) : {}),
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.textFaint },
  labelActive: { color: colors.ink },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  dotActive: {
    backgroundColor: colors.ink,
    shadowColor: colors.ink,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
