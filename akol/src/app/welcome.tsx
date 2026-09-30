import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { DoubleRule, Fleuron, Rule } from '../components/Rules';
import { Dim, Field, GhostButton, InkButton, Screen } from '../components/ui';
import { requestNotificationPermission } from '../lib/notifications';
import { exampleFamily, freshFamily } from '../lib/seed';
import { useAkol } from '../lib/store';
import { colors, fonts, space } from '../theme';

/** First run, set as the front page of a first edition. */
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
      <View style={styles.ears}>
        <Text style={styles.ear}>First Edition</Text>
        <Text style={styles.ear}>Vol. I · No. 1</Text>
      </View>
      <Rule style={{ marginTop: space.sm }} />
      <Text style={styles.masthead}>Akol</Text>
      <Text style={styles.motto}>“Every Task in Its Hour”</Text>
      <DoubleRule style={{ marginTop: space.sm }} />
      <Text style={styles.dateline}>PRIVATE BY DESIGN · STORED ON YOUR DEVICE · NO ACCOUNT REQUIRED</Text>
      <DoubleRule inverted />

      <Text style={styles.extra}>Extra!</Text>
      <Text style={styles.headline}>Family Now Runs to the Minute</Text>
      <Rule style={styles.shortRule} />
      <Text style={styles.deck}>A Checklist for Every Member, and a Bulletin at Go Time Asking Whether All Is Done</Text>
      <Rule style={styles.shortRule} />

      <View style={styles.columns}>
        <Column head="Lists for All" body="Your list, the children’s lists, and the whole household at a glance." />
        <View style={styles.gutter} />
        <Column head="To the Minute" body="6:45 pack lunch. 6:55 bags in the car. 7:30 go time." />
        <View style={styles.gutter} />
        <Column head="The Bulletin" body="At go time Akol asks if everything is done, and names what isn’t." />
      </View>

      <Fleuron style={{ marginVertical: space.xl }} />

      <Field label="Your name, for the masthead" value={name} onChangeText={setName} placeholder="Mark" returnKeyType="done" />
      <View style={{ gap: space.md, marginTop: space.xl }}>
        <InkButton label="Begin with the example family" onPress={() => start(true)} />
        <GhostButton label="Start from a blank page" onPress={() => start(false)} />
      </View>
      <Dim style={styles.fine}>Set in Old Standard and Libre Caslon. Printed on your phone.</Dim>
    </Screen>
  );
}

function Column({ head, body }: { head: string; body: string }) {
  return (
    <View style={styles.column}>
      <Text style={styles.columnHead}>{head}</Text>
      <Text style={styles.columnBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ears: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.md },
  ear: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.ink },
  masthead: { fontFamily: fonts.masthead, fontSize: 88, lineHeight: 100, color: colors.ink, textAlign: 'center', marginTop: space.md },
  motto: { fontFamily: fonts.displayItalic, fontSize: 15, color: colors.inkSoft, textAlign: 'center', marginTop: -6 },
  dateline: {
    fontFamily: fonts.displayMedium,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: colors.ink,
    textAlign: 'center',
    paddingVertical: 5,
  },
  extra: { fontFamily: fonts.masthead, fontSize: 30, color: colors.ink, textAlign: 'center', marginTop: space.xl },
  headline: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: colors.ink,
    marginTop: space.xs,
  },
  shortRule: { width: 64, alignSelf: 'center', marginVertical: space.sm },
  deck: { fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 24, textAlign: 'center', color: colors.ink },
  columns: { flexDirection: 'row', marginTop: space.lg },
  gutter: { width: 1, backgroundColor: colors.ink, marginHorizontal: space.sm },
  column: { flex: 1, gap: 4 },
  columnHead: {
    fontFamily: fonts.display,
    fontSize: 12.5,
    lineHeight: 15,
    textTransform: 'uppercase',
    color: colors.ink,
    textAlign: 'center',
  },
  columnBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.text, textAlign: 'center' },
  fine: { textAlign: 'center', fontSize: 12, marginTop: space.xl, color: colors.textFaint, fontFamily: fonts.italic },
});
