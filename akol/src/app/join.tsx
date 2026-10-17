import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { BackBar } from '../components/BackBar';
import { Dim, InkButton, Screen } from '../components/ui';
import { emptyState } from '../lib/seed';
import { useAkol } from '../lib/store';
import { joinFamily, syncConfigured } from '../lib/sync';
import { normaliseFamilyCode } from '../lib/syncLogic';
import { colors, fonts, radius, space } from '../theme';

/** Join a family that already uses Akol: their routines arrive on this phone. */
export default function Join() {
  const { dispatch } = useAkol();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const join = async () => {
    if (!syncConfigured) {
      setMsg('Family sync isn’t switched on in this preview. Tap back and choose Get started instead.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const householdId = await joinFamily(code);
      if (!householdId) throw new Error('No family has that code. Check it and try again.');
      const s = emptyState();
      // An empty plan at time 0, so the family's plan arrives and wins (see FamilySync).
      dispatch({
        type: 'replace',
        state: { ...s, planUpdatedAt: 0, settings: { ...s.settings, onboarded: true, sync: { householdId, code } } },
      });
      router.replace('/settings');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackBar />
      <Text style={styles.title}>Join your family</Text>
      <Dim style={styles.lede}>
        On a phone that already has Akol, open Settings → Family sync and share the code. Enter it here.
      </Dim>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(normaliseFamilyCode(t))}
        placeholder="AKOL-XXXXXX"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        style={styles.input}
      />
      <InkButton label={busy ? 'Joining…' : 'Join'} onPress={join} disabled={busy || code.length !== 6} />
      {msg && <Dim style={styles.msg}>{msg}</Dim>}
      <Dim style={styles.fine}>Once you’ve joined, pick who you are under Settings → On this device, I am.</Dim>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.text, marginTop: space.lg },
  lede: { marginTop: space.sm, marginBottom: space.xl },
  input: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: 3,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    marginBottom: space.lg,
  },
  msg: { marginTop: space.md, textAlign: 'center' },
  fine: { marginTop: space.xl, fontSize: 13, textAlign: 'center' },
});
