import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { jewelFor } from '../components/Avatar';
import { Fleuron } from '../components/Rules';
import { Orrery, type OrbitRing } from '../components/three/Orrery';
import { Card, FadeIn, Field, GhostButton, InkButton, Screen } from '../components/ui';
import { requestNotificationPermission } from '../lib/notifications';
import { parseTime } from '../lib/schedule';
import { exampleFamily, freshFamily } from '../lib/seed';
import { useAkol } from '../lib/store';
import { colors, fonts, space } from '../theme';

/** First run: the orrery turning in the dark, the name in gold, and one question. */
export default function Welcome() {
  const { dispatch } = useAkol();
  const [name, setName] = useState('');

  // A frozen school morning at 6:48 a.m. to show the orrery in use.
  const preview = useMemo(() => {
    const s = exampleFamily();
    const school = s.tasks.filter((t) => t.routineId === 'r_school');
    const mins = school.map((t) => parseTime(t.time));
    const from = Math.min(...mins) - 10;
    const to = Math.max(...mins) + 10;
    const done = new Set(['t_mk_coffee', 't_ra_up', 't_ra_teeth', 't_mk_breakfast', 't_ra_dress']);
    const rings: OrbitRing[] = s.members.map((m) => {
      const j = jewelFor(m, m.id);
      return {
        id: m.id,
        hex: j.hex,
        metal: j.metal,
        beads: school
          .filter((t) => t.memberId === m.id && !t.checkpoint)
          .map((t) => ({ id: t.id, frac: (parseTime(t.time) - from) / (to - from), done: done.has(t.id), due: t.id === 't_ra_lunch' })),
      };
    });
    return { rings, nowFrac: (6 * 60 + 48 - from) / (to - from) };
  }, []);

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
      <FadeIn style={styles.stage}>
        <Orrery rings={preview.rings} nowFrac={preview.nowFrac} checkpointRatio={5 / 11} height={440} autoOrbit={0.12} />
        <View style={styles.titleBlock} pointerEvents="none">
          <Text style={styles.word}>Akol</Text>
          <Text style={styles.tag}>The family, on time</Text>
        </View>
      </FadeIn>

      <FadeIn delay={300}>
        <Text style={styles.lede}>
          Each person in your family is an orbit of gold, platinum or rose. Each task is a gem at its minute. At go time
          the diamond asks if everything is done.
        </Text>
      </FadeIn>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        {[
          ['A checklist for everyone', 'Your list, your children’s lists, and the whole family at a glance.'],
          ['Reminders to the minute', '6:45 pack lunch. 6:55 bags in the car. 7:00 tune the GPS.'],
          ['Go time', 'Akol asks whether everything is done, and shows exactly what isn’t.'],
        ].map(([h, b], i) => (
          <FadeIn key={h} delay={420 + i * 110}>
            <Card>
              <View style={styles.feature}>
                <Text style={styles.featureNum}>{['i', 'ii', 'iii'][i]}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.featureHead}>{h}</Text>
                  <Text style={styles.featureBody}>{b}</Text>
                </View>
              </View>
            </Card>
          </FadeIn>
        ))}
      </View>

      <Fleuron style={{ marginVertical: space.xl }} />

      <FadeIn delay={800}>
        <Field label="Your name" value={name} onChangeText={setName} placeholder="Mark" returnKeyType="done" />
        <View style={{ gap: space.md, marginTop: space.xl }}>
          <InkButton label="Begin with the example family" onPress={() => start(true)} />
          <GhostButton label="Start from a blank page" onPress={() => start(false)} />
        </View>
        <Text style={styles.fine}>Private by design. Everything stays on this device.</Text>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { marginHorizontal: -18, marginTop: -space.lg },
  titleBlock: { position: 'absolute', left: 0, right: 0, bottom: 6, alignItems: 'center' },
  word: {
    fontFamily: fonts.masthead,
    fontSize: 112,
    lineHeight: 118,
    color: colors.inkSoft,
    letterSpacing: -2,
    textShadowColor: 'rgba(232,199,138,0.55)',
    textShadowRadius: 30,
    textShadowOffset: { width: 0, height: 0 },
  },
  tag: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 5,
    textTransform: 'uppercase',
    color: colors.ink,
    marginTop: -4,
  },
  lede: {
    fontFamily: fonts.italic,
    fontSize: 22,
    lineHeight: 30,
    color: colors.text,
    textAlign: 'center',
    marginTop: space.xl,
  },
  feature: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' },
  featureNum: { fontFamily: fonts.italic, fontSize: 22, color: colors.ink, width: 26 },
  featureHead: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  featureBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textDim },
  fine: { fontFamily: fonts.light, textAlign: 'center', fontSize: 12, marginTop: space.xl, color: colors.textFaint },
});
