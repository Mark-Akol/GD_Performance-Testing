import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Burst, CaptionTab, Panel, SFX, SpeedLines } from '../components/Manga';
import { Field, GhostButton, InkButton, Screen } from '../components/ui';
import { requestNotificationPermission } from '../lib/notifications';
import { exampleFamily, freshFamily } from '../lib/seed';
import { useAkol } from '../lib/store';
import { colors, fonts, SLANT, space, stroke } from '../theme';

/** First run, drawn as the cover of volume one. */
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
      {/* Cover */}
      <View style={styles.cover}>
        <SpeedLines focus={{ x: 0.5, y: 0.42 }} clear={0.3} count={96} seed={21} />
        <View style={styles.coverTop}>
          <CaptionTab>Vol. 1</CaptionTab>
          <Text style={styles.coverSmall}>THE FAMILY, ON TIME</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>AKOL</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle}>アコル</Text>
        </View>
        <View style={styles.kanaColumn}>
          {'時間通り'.split('').map((c, i) => (
            <Text key={i} style={styles.kana}>
              {c}
            </Text>
          ))}
        </View>
        <Burst size={116} spikes={18} seed={2} style={styles.newBurst}>
          <Text style={styles.newText}>NEW{'\n'}SERIES!</Text>
        </Burst>
        <SFX text="ドドド" size={42} rotate={-10} style={styles.coverSfx} />
      </View>

      {/* Three panels */}
      <View style={{ marginTop: space.xl, gap: space.md }}>
        <Panel tilt={-1} tone={0.18}>
          <View style={styles.panelTextBox}>
            <Text style={styles.panelHead}>A quest log for every member!</Text>
            <Text style={styles.panelBody}>Your list, the kids’ lists, and the whole party at a glance.</Text>
          </View>
        </Panel>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Panel tilt={1.2} lines={{ x: 0.5, y: 0.5, clear: 0.34, count: 40 }} style={{ minHeight: 150 }}>
              <View style={styles.panelTextBox}>
                <Text style={styles.panelHead}>To the minute</Text>
                <Text style={styles.panelBody}>6:45 lunch. 6:55 bags. 7:00 GPS.</Text>
              </View>
            </Panel>
          </View>
          <View style={{ flex: 1 }}>
            <Panel tilt={-0.8} inverted style={{ minHeight: 150 }}>
              <Text style={[styles.panelHead, { color: colors.bg }]}>GO TIME!!</Text>
              <Text style={[styles.panelBody, { color: colors.bg }]}>Akol asks if every quest is cleared, and names what isn’t.</Text>
            </Panel>
          </View>
        </View>
      </View>

      <View style={{ marginTop: space.xxl }}>
        <Field label="Your hero name" value={name} onChangeText={setName} placeholder="MARK" returnKeyType="done" />
      </View>
      <View style={{ gap: space.md, marginTop: space.xl }}>
        <InkButton label="Start the story ▶" onPress={() => start(true)} />
        <GhostButton label="Blank page" onPress={() => start(false)} />
      </View>
      <Text style={styles.fine}>Private by design. Everything stays on this device.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 420,
    borderWidth: stroke.heavy,
    borderColor: colors.ink,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    padding: space.lg,
  },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coverSmall: {
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.ink,
    backgroundColor: colors.bg,
    paddingHorizontal: 4,
  },
  titleBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontFamily: fonts.display,
    fontSize: 92,
    lineHeight: 108,
    color: colors.ink,
    backgroundColor: colors.bg,
    paddingHorizontal: 10,
    transform: [{ skewX: SLANT }],
  },
  titleRule: { width: 180, height: stroke.heavy, backgroundColor: colors.ink, marginTop: 2 },
  subtitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 10,
    color: colors.bg,
    backgroundColor: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginTop: space.sm,
  },
  kanaColumn: {
    position: 'absolute',
    left: 14,
    top: 64,
    backgroundColor: colors.ink,
    paddingHorizontal: 5,
    paddingVertical: 8,
    gap: 2,
  },
  kana: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.bg, textAlign: 'center' },
  newBurst: { position: 'absolute', right: 4, top: 44 },
  newText: { fontFamily: fonts.display, fontSize: 11, lineHeight: 13, color: colors.ink, textAlign: 'center' },
  coverSfx: { position: 'absolute', left: 18, bottom: 16 },
  panelTextBox: { backgroundColor: colors.bg, alignSelf: 'flex-start', padding: 6 },
  panelHead: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22, color: colors.ink, textTransform: 'uppercase' },
  panelBody: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.ink, marginTop: 4 },
  fine: { fontFamily: fonts.medium, textAlign: 'center', fontSize: 12, marginTop: space.xl, color: colors.textFaint },
});
