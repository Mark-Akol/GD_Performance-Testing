import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Dim, Divider, Field, GhostButton, GoldButton, Screen } from '../components/ui';
import { requestNotificationPermission } from '../lib/notifications';
import { exampleFamily, freshFamily } from '../lib/seed';
import { useAkol } from '../lib/store';
import { colors, fonts, gradients, space } from '../theme';

export default function Welcome() {
  const { dispatch } = useAkol();
  const [name, setName] = useState('');

  const start = async (example: boolean) => {
    const parent = name.trim() || 'Mark';
    dispatch({ type: 'replace', state: example ? exampleFamily(parent) : freshFamily(parent) });
    await requestNotificationPermission().catch(() => false);
    router.replace(example ? '/' : '/routines');
  };

  return (
    <Screen contentStyle={{ paddingBottom: 60 }}>
      <View style={styles.hero}>
        <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.crest}>
          <Text style={styles.crestText}>A</Text>
        </LinearGradient>
        <Text style={styles.word}>AKOL</Text>
        <Text style={styles.tag}>The family, on time.</Text>
      </View>

      <Divider />

      <View style={{ gap: space.lg }}>
        <Feature icon="✦" title="A checklist for everyone" body="Your list, your children's lists, and the whole family at a glance." />
        <Feature icon="◷" title="Reminders to the minute" body="6:45 pack lunch. 6:55 bags in the car. 7:30 go time." />
        <Feature icon="⚑" title="Checkpoints" body="At go time, Akol asks: is everything done? And shows exactly what isn't." />
      </View>

      <Divider />

      <Field label="Your name" value={name} onChangeText={setName} placeholder="Mark" returnKeyType="done" />
      <View style={{ gap: space.md, marginTop: space.xl }}>
        <GoldButton label="Begin with the school-morning example" onPress={() => start(true)} />
        <GhostButton label="Start from a blank page" onPress={() => start(false)} />
      </View>
      <Dim style={styles.fine}>Private by design · stored on your device</Dim>
    </Screen>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={styles.feature}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Dim style={{ fontSize: 14 }}>{body}</Dim>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: space.xxl },
  crest: {
    width: 96,
    height: 96,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    shadowColor: colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 12,
  },
  crestText: { fontFamily: fonts.display, fontSize: 46, color: colors.bg, transform: [{ rotate: '-45deg' }] },
  word: { fontFamily: fonts.display, fontSize: 44, letterSpacing: 14, color: colors.ivory, marginTop: space.xxl, paddingLeft: 14 },
  tag: { fontFamily: fonts.displayItalic, fontSize: 18, color: colors.gold, marginTop: space.sm },
  feature: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' },
  featureIcon: { fontSize: 20, color: colors.gold, width: 26, textAlign: 'center', marginTop: 2 },
  featureTitle: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.ivory },
  fine: { textAlign: 'center', fontSize: 12, marginTop: space.xl, color: colors.textFaint },
});
