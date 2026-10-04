import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Fleuron } from '../components/Rules';
import { Card, FadeIn, Field, GhostButton, InkButton, Screen } from '../components/ui';
import { requestNotificationPermission } from '../lib/notifications';
import { exampleFamily, freshFamily } from '../lib/seed';
import { useAkol } from '../lib/store';
import { colors, fonts, space } from '../theme';

const LINER_NOTES: [string, string, string][] = [
  ['01', 'A tracklist for everyone', 'Your list, the kids’ lists, and the whole crew on one record.'],
  ['02', 'Every track on time', '6:45 pack lunch. 6:55 bags in the car. 7:00 tune the GPS.'],
  ['03', 'Showtime', 'At go time Akol asks if the whole crew is ready, and calls out what isn’t.'],
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
          <Text style={styles.small}>Vol. 1</Text>
          <Text style={styles.small}>The family, on time</Text>
        </View>
        <Text style={styles.word}>AKOL</Text>
        <Text style={styles.tag}>the family, on time</Text>
      </FadeIn>

      <FadeIn delay={300}>
        <Text style={styles.lede}>Your day is a record. Every task is a track. Akol keeps the whole crew on beat.</Text>
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
          <InkButton label="Drop the needle ▶" onPress={() => start(true)} />
          <GhostButton label="Start a blank record" onPress={() => start(false)} />
        </View>
        <Text style={styles.fine}>Private by design. Everything stays on this device.</Text>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  coverTop: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 2.6, textTransform: 'uppercase', color: colors.text },
  word: {
    fontFamily: fonts.display,
    fontSize: 150,
    lineHeight: 168,
    letterSpacing: 2,
    color: colors.text,
    textAlign: 'center',
    marginTop: space.md,
  },
  tag: {
    fontFamily: fonts.italic,
    fontSize: 26,
    color: colors.text,
    textAlign: 'center',
    marginTop: -18,
    transform: [{ rotate: '-4deg' }],
  },
  lede: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: 0.5,
    color: colors.text,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: space.xl,
  },
  note: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' },
  noteNum: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.text, width: 40 },
  noteHead: { fontFamily: fonts.display, fontSize: 21, letterSpacing: 0.8, color: colors.text, textTransform: 'uppercase' },
  noteBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.textDim },
  fine: { fontFamily: fonts.light, textAlign: 'center', fontSize: 13, marginTop: space.xl, color: colors.textFaint },
});
