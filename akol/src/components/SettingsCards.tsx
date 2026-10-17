import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSyncStatus } from '../lib/FamilySync';
import { useAkol } from '../lib/store';
import { joinFamily, leaveFamily, startFamily, syncConfigured } from '../lib/sync';
import { makeBackup, normaliseFamilyCode, parseBackup, planOf } from '../lib/syncLogic';
import { colors, fonts, space } from '../theme';
import { Card, Dim, GhostButton, InkButton, confirm } from './ui';

function timeAgo(ms: number) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)} min ago`;
}

/** Start a family, join one with a code, or leave. */
export function FamilySyncCard() {
  const { state, dispatch } = useAkol();
  const status = useSyncStatus();
  const link = state.settings.sync;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!syncConfigured) {
    return (
      <Card style={{ gap: space.sm }}>
        <Text style={styles.head}>Not switched on in this version</Text>
        <Dim style={styles.small}>
          Family sync shares ticks and routines between everyone’s phones, live. It needs Akol’s free online database,
          which isn’t connected in this preview.
        </Dim>
      </Card>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (link) {
    const label =
      status.kind === 'live'
        ? `Live · synced ${timeAgo(status.lastSync)}`
        : status.kind === 'connecting'
          ? 'Connecting…'
          : status.kind === 'error'
            ? `Can’t reach the family right now: ${status.message}`
            : 'Paused';
    return (
      <Card style={{ gap: space.md }}>
        <Dim style={styles.small}>Your family code</Dim>
        <Text style={styles.code} selectable>
          AKOL-{link.code}
        </Text>
        <Text style={[styles.status, status.kind === 'error' && { color: colors.textDim }]}>{label}</Text>
        <Dim style={styles.small}>
          Put this code into Akol on each family phone (Settings → Family sync → Join). If a phone is lost, join again
          with the same code and everything comes back.
        </Dim>
        <GhostButton
          label="Share the code"
          onPress={() => {
            const message = `Join our family on Akol: open Settings → Family sync → Join, and enter AKOL-${link.code}`;
            if (Platform.OS === 'web') Clipboard.setStringAsync(message).then(() => setMsg('Copied. Paste it into a message.'));
            else Share.share({ message });
          }}
        />
        <GhostButton
          label="Leave the family"
          tone="plain"
          onPress={() =>
            confirm('Leave the family?', 'This phone keeps its copy but stops syncing.', 'Leave', () =>
              run(async () => {
                await leaveFamily(link.householdId).catch(() => {});
                dispatch({ type: 'settings', patch: { sync: null } });
              }),
            )
          }
        />
        {msg && <Dim style={styles.small}>{msg}</Dim>}
      </Card>
    );
  }

  return (
    <Card style={{ gap: space.md }}>
      <Dim style={styles.small}>
        Share ticks and routines between everyone’s phones, live. No accounts or passwords, just a family code.
      </Dim>
      <InkButton
        label={busy ? 'Starting…' : 'Start family sync'}
        disabled={busy}
        onPress={() =>
          run(async () => {
            const { householdId, code: newCode } = await startFamily(planOf(state));
            dispatch({ type: 'settings', patch: { sync: { householdId, code: newCode } } });
          })
        }
      />
      <View style={styles.divider} />
      <Dim style={styles.small}>Already have a code from another family phone?</Dim>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(normaliseFamilyCode(t))}
        placeholder="AKOL-XXXXXX"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.input}
      />
      <GhostButton
        label={busy ? 'Joining…' : 'Join the family'}
        onPress={() =>
          code.length === 6 &&
          confirm(
            'Join this family?',
            'This phone will use the family’s routines and ticks. Its own routines will be replaced.',
            'Join',
            () =>
              run(async () => {
                const householdId = await joinFamily(code);
                if (!householdId) throw new Error('No family has that code. Check it and try again.');
                // Clear this phone's plan with the oldest possible timestamp, so the family's plan
                // wins in FamilySync's catch-up instead of being overwritten by this phone's.
                dispatch({
                  type: 'replace',
                  state: {
                    ...state,
                    members: [],
                    routines: [],
                    tasks: [],
                    completions: {},
                    planUpdatedAt: 0,
                    settings: { ...state.settings, sync: { householdId, code } },
                  },
                });
              }),
          )
        }
      />
      {msg && <Dim style={styles.small}>{msg}</Dim>}
    </Card>
  );
}

/** Zero-cost backup: a block of text the user saves anywhere and pastes back to restore. */
export function BackupCard() {
  const { state, dispatch } = useAkol();
  const [text, setText] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    const backup = makeBackup(state);
    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(backup);
        setMsg('Backup copied. Paste it into a note or an email to yourself and keep it safe.');
      } else {
        await Share.share({ title: 'Akol backup', message: backup });
        setMsg('Saved. Keep it in Notes, Files or an email to yourself.');
      }
    } catch {
      await Clipboard.setStringAsync(backup);
      setMsg('Backup copied. Paste it somewhere safe.');
    }
  };

  const restore = () => {
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      setMsg(parsed.error);
      return;
    }
    const { members, routines, tasks } = parsed.data;
    confirm(
      'Restore this backup?',
      `${members.length} people, ${routines.length} routines and ${tasks.length} tasks will replace what’s on this phone.`,
      'Restore',
      () => {
        dispatch({ type: 'restore', data: parsed.data });
        setText('');
        setRestoring(false);
        setMsg('Restored.');
      },
    );
  };

  return (
    <Card style={{ gap: space.md }}>
      <Dim style={styles.small}>
        Save a backup of your family, routines and history as text. Keep it in Notes or email it to yourself. On a new
        phone, paste it back here.
      </Dim>
      <InkButton label="Save a backup" onPress={save} />
      {restoring ? (
        <>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Paste your AKOL BACKUP text here"
            placeholderTextColor={colors.textFaint}
            multiline
            style={[styles.input, styles.paste]}
          />
          <GhostButton label="Restore" onPress={restore} />
        </>
      ) : (
        <GhostButton
          label="Restore from a backup"
          tone="plain"
          onPress={async () => {
            setRestoring(true);
            const clip = await Clipboard.getStringAsync().catch(() => '');
            if (clip.trim().startsWith('AKOL BACKUP')) setText(clip);
          }}
        />
      )}
      {msg && <Dim style={styles.small}>{msg}</Dim>}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 1, color: colors.text, textTransform: 'uppercase' },
  small: { fontSize: 13, lineHeight: 19 },
  code: { fontFamily: fonts.display, fontSize: 40, letterSpacing: 4, color: colors.text },
  status: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.text },
  divider: { height: 1, backgroundColor: colors.hairline },
  input: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 3,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
  },
  paste: { fontFamily: fonts.light, fontSize: 13, letterSpacing: 0, minHeight: 120, textAlignVertical: 'top' },
});
