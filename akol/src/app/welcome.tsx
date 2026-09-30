import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dial } from '../components/Dial';
import { tap } from '../components/ui';
import { requestNotificationPermission } from '../lib/notifications';
import { dayKey } from '../lib/schedule';
import { exampleFamily, freshFamily } from '../lib/seed';
import { useAkol } from '../lib/store';
import { colors, fonts, radius, space } from '../theme';

/** First run: a black page, the Dial turning in white, and one question. */
export default function Welcome() {
  const { dispatch } = useAkol();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [name, setName] = useState('');

  // A frozen school morning at 6:48 a.m. to show what the Dial looks like in use.
  const preview = useMemo(() => {
    const s = exampleFamily();
    const at = new Date();
    at.setHours(6, 48, 0, 0);
    const day = dayKey(at);
    const done = ['t_mk_coffee', 't_ra_up', 't_ra_teeth', 't_mk_breakfast', 't_ra_dress'];
    return {
      tasks: s.tasks.filter((t) => t.routineId === 'r_school'),
      members: s.members,
      completions: { [day]: Object.fromEntries(done.map((id) => [id, 1])) },
      day,
      at,
    };
  }, []);

  const start = async (example: boolean) => {
    tap('medium');
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

  const dial = Math.min(width - 48, 340);

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Text style={styles.small}>No. 01</Text>
          <Text style={styles.small}>The family, on time</Text>
        </View>

        <Text style={styles.word}>Akol</Text>

        <View style={{ alignItems: 'center', marginTop: -space.md }}>
          <Dial
            tasks={preview.tasks}
            members={preview.members}
            completions={preview.completions}
            day={preview.day}
            now={preview.at}
            size={dial}
            onToggle={() => {}}
            inverted
          />
        </View>

        <Text style={styles.lede}>
          Every member of the family is an orbit. Every task is a mark at its minute. The hand is now.
        </Text>

        <View style={styles.points}>
          <Point n="i" text="A checklist for you, and one for each child." />
          <Point n="ii" text="Reminders to the minute: 6:45 lunch, 6:55 bags, 7:00 GPS." />
          <Point n="iii" text="At go time, Akol asks if everything is done, and shows what isn’t." />
        </View>

        <Text style={styles.label}>Your name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Mark"
          placeholderTextColor="rgba(251,251,249,0.35)"
          selectionColor={colors.bg}
          style={styles.input}
          returnKeyType="done"
        />

        <Pressable style={({ pressed }) => [styles.primary, pressed && { opacity: 0.8 }]} onPress={() => start(true)}>
          <Text style={styles.primaryText}>Begin with the example family</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.6 }]} onPress={() => start(false)}>
          <Text style={styles.secondaryText}>Start from a blank page</Text>
        </Pressable>
        <Text style={styles.fine}>Private by design. Everything stays on this device.</Text>
      </ScrollView>
    </View>
  );
}

function Point({ n, text }: { n: string; text: string }) {
  return (
    <View style={styles.point}>
      <Text style={styles.pointN}>{n}.</Text>
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}

const paperDim = 'rgba(251,251,249,0.62)';

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: space.xl, width: '100%', maxWidth: 560, alignSelf: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: colors.bg },
  word: {
    fontFamily: fonts.masthead,
    fontSize: 120,
    lineHeight: 132,
    letterSpacing: -4,
    color: colors.bg,
    textAlign: 'center',
    marginTop: space.lg,
  },
  lede: {
    fontFamily: fonts.italic,
    fontSize: 22,
    lineHeight: 30,
    color: colors.bg,
    textAlign: 'center',
    marginTop: space.md,
  },
  points: { marginTop: space.xl, borderTopWidth: 1, borderTopColor: 'rgba(251,251,249,0.25)' },
  point: {
    flexDirection: 'row',
    gap: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251,251,249,0.25)',
  },
  pointN: { fontFamily: fonts.italic, fontSize: 18, color: colors.bg, width: 28 },
  pointText: { flex: 1, fontFamily: fonts.light, fontSize: 15, lineHeight: 21, color: colors.bg },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: paperDim,
    marginTop: space.xxl,
  },
  input: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg,
    paddingVertical: space.sm,
  },
  primary: {
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: space.xl,
  },
  primaryText: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 2.6, textTransform: 'uppercase', color: colors.ink },
  secondary: {
    borderWidth: 1,
    borderColor: colors.bg,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: space.md,
  },
  secondaryText: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 2.6, textTransform: 'uppercase', color: colors.bg },
  fine: { fontFamily: fonts.light, fontSize: 12, color: paperDim, textAlign: 'center', marginTop: space.xl },
});
