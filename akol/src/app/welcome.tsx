import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Lockup } from '../components/Lockup';
import { Fleuron } from '../components/Rules';
import { Card, FadeIn, Field, GhostButton, InkButton, Screen } from '../components/ui';
import { requestNotificationPermission } from '../lib/notifications';
import { exampleFamily, freshFamily } from '../lib/seed';
import { useAkol } from '../lib/store';
import { colors, fonts, space } from '../theme';

const LINER_NOTES: [string, string, string][] = [
  ['📋', 'A list for everyone', 'Your list, the kids’ lists, and the whole family on one timeline.'],
  ['⏰', 'Every task on time', '6:45 pack lunch. 6:55 bags in the car. 7:00 tune the GPS.'],
  ['🏁', 'Go time', 'Akol asks if everyone is ready, and rings until it’s done.'],
];

/** First run, set like an album cover. */
export default function Welcome() {
  const { dispatch } = useAkol();
  const [name, setName] = useState('');

  const start = async (example: boolean) => {
    const parent = name.trim() || 'Mark';
    const state = example ? exampleFamily(parent) : freshFamily(parent);
    if (example && Platform.OS === 'web') {
      // The web prototype opens mid-routine so the reminders and Go time are in play.
      const weekend = [0, 6].includes(new Date().getDay());
      state.settings.demoClock = { time: weekend ? '08:40' : '06:48', setAt: Date.now() };
    }
    dispatch({ type: 'replace', state });
    await requestNotificationPermission().catch(() => false);
    router.replace(example ? '/' : '/routines');
  };

  return (
    <Screen contentStyle={{ paddingBottom: 60 }}>
      <FadeIn>
        <View style={styles.coverTop}>
          <Text style={styles.small}>For you & the family</Text>
        </View>
        <View style={styles.lockup}>
          <Lockup size={72} />
        </View>
      </FadeIn>

      <FadeIn delay={300}>
        <Text style={styles.lede}>Timed checklists for you and the whole family, with alarms that ring until it’s done.</Text>
      </FadeIn>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        {LINER_NOTES.map(([n, h, b], i) => (
          <FadeIn key={n} delay={420 + i * 110}>
            <Card>
              <View style={styles.note}>
                <Text style={styles.noteNum}>{n}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.noteHead}>{h}</Text>
                  <Text style={styles.noteBody}>{b}</Text>
                </View>
              </View>
            </Card>
          </FadeIn>
        ))}
      </View>

      <Fleuron style={{ marginVertical: space.xl }} />

      <FadeIn delay={780}>
        <Field label="Your name" value={name} onChangeText={setName} placeholder="Mark" returnKeyType="done" />
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <InkButton label="Try the example family" onPress={() => start(true)} />
          <GhostButton label="Start from scratch" onPress={() => start(false)} />
        </View>
        <Text style={styles.fine}>Private by design. Everything stays on this device.</Text>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lockup: { marginTop: space.xl, marginBottom: space.sm },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textDim },
  lede: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 33,
    color: colors.text,
    marginTop: space.xl,
  },
  note: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' },
  noteNum: { fontSize: 26, lineHeight: 32, width: 36 },
  noteHead: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
  noteBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.textDim },
  fine: { fontFamily: fonts.light, textAlign: 'center', fontSize: 13, marginTop: space.xl, color: colors.textFaint },
});
