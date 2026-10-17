import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAGLINE } from '../components/Lockup';
import { GhostButton, InkButton } from '../components/ui';
import { exampleFamily } from '../lib/seed';
import { useAkol } from '../lib/store';
import { colors, fonts, space } from '../theme';

/** First run: the mark, the line, and the way in. No account needed. */
export default function Welcome() {
  const { dispatch } = useAkol();
  const insets = useSafeAreaInsets();
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 6, bounciness: 12 }).start();
  }, [pop]);

  const tryExample = () => {
    const state = exampleFamily('Mark');
    if (Platform.OS === 'web') {
      // The web prototype opens mid-routine so the reminders and Go time are in play.
      const weekend = [0, 6].includes(new Date().getDay());
      state.settings.demoClock = { time: weekend ? '08:40' : '06:48', setAt: Date.now() };
    }
    dispatch({ type: 'replace', state });
    router.replace('/');
  };

  return (
    <View style={[styles.page, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl }]}>
      <View style={styles.hero}>
        <Animated.View
          style={{
            opacity: pop,
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }, { rotate: '-4deg' }],
          }}
        >
          <Image source={require('../../assets/icon.png')} style={styles.mark} accessibilityLabel="Akol" />
        </Animated.View>
        <Text style={styles.tag}>{TAGLINE}</Text>
        <Text style={styles.headline}>Timed checklists for you and the whole family.</Text>
        <Text style={styles.sub}>Alarms that ring until it’s done, in your own voice.</Text>
      </View>

      <View style={styles.actions}>
        <InkButton label="Get started" onPress={() => router.push('/onboarding')} />
        <GhostButton label="I have a family code" onPress={() => router.push('/join')} />
        <Text style={styles.fine}>No account needed. Your routines stay on this phone.</Text>
        <Pressable onPress={tryExample} hitSlop={10} accessibilityRole="button">
          <Text style={styles.link}>Just looking? Try the example family</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.xl, width: '100%', maxWidth: 560, alignSelf: 'center' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  mark: { width: 132, height: 132, borderRadius: 32 },
  tag: { fontFamily: fonts.italic, fontSize: 24, color: colors.text, transform: [{ rotate: '-3deg' }], marginTop: space.lg },
  headline: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.text, textAlign: 'center', marginTop: space.lg },
  sub: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.textDim, textAlign: 'center' },
  actions: { gap: space.md },
  fine: { fontFamily: fonts.light, fontSize: 13, color: colors.textFaint, textAlign: 'center' },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.accentInk, textAlign: 'center', paddingVertical: space.xs },
});
