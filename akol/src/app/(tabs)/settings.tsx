import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../../components/Avatar';
import {
  Card,
  Chip,
  Dim,
  Display,
  Eyebrow,
  GhostButton,
  Screen,
  SectionHeader,
  ToggleRow,
  confirm,
} from '../../components/ui';
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
  sendTestReminder,
  syncReminders,
} from '../../lib/notifications';
import { dayKey, formatTime, planReminders } from '../../lib/schedule';
import { emptyState, exampleFamily } from '../../lib/seed';
import { useAkol } from '../../lib/store';
import { colors, fonts, jewels, space } from '../../theme';

export default function Settings() {
  const { state, dispatch, me } = useAkol();
  const { settings } = state;
  const [perm, setPerm] = useState<string>('…');

  useFocusEffect(
    useCallback(() => {
      notificationPermission().then(setPerm);
    }, []),
  );

  const setNotify = async (on: boolean) => {
    if (on && !(await requestNotificationPermission()) && notificationsSupported) {
      setPerm(await notificationPermission());
      confirm('Notifications are off', 'Allow notifications for Akol in your phone settings to get timed reminders.', 'Open Settings', () =>
        Linking.openSettings(),
      );
      return;
    }
    dispatch({ type: 'settings', patch: { notificationsEnabled: on } });
    setPerm(await notificationPermission());
  };

  const toggleNotifyFor = (id: string) => {
    const everyone = settings.notifyFor.length === 0;
    const current = everyone ? state.members.map((m) => m.id) : settings.notifyFor;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    dispatch({ type: 'settings', patch: { notifyFor: next.length === state.members.length ? [] : next } });
  };

  const pending = planReminders(state, new Date()).length;

  return (
    <Screen>
      <Eyebrow>Make it yours</Eyebrow>
      <Display style={{ marginTop: 6 }}>Settings</Display>

      <SectionHeader title="On this device, I am" />
      <View style={styles.wrap}>
        {state.members.map((m) => (
          <Chip
            key={m.id}
            label={m.name}
            color={jewels[m.color].base}
            active={me?.id === m.id}
            onPress={() => dispatch({ type: 'settings', patch: { meId: m.id } })}
            left={<Avatar member={m} size={20} />}
          />
        ))}
      </View>

      <SectionHeader
        title="Family members"
        right={
          <Pressable hitSlop={10} onPress={() => router.push('/member-edit')}>
            <Ionicons name="person-add-outline" size={20} color={colors.ink} />
          </Pressable>
        }
      />
      <Card style={{ padding: 0 }}>
        {state.members.map((m, i) => (
          <Pressable
            key={m.id}
            onPress={() => router.push({ pathname: '/member-edit', params: { id: m.id } })}
            style={[styles.memberRow, i > 0 && styles.border]}
          >
            <Avatar member={m} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{m.name}</Text>
              <Dim style={{ fontSize: 12 }}>
                {m.role[0].toUpperCase() + m.role.slice(1)} · {state.tasks.filter((t) => t.memberId === m.id).length} items
              </Dim>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
        ))}
      </Card>

      <SectionHeader title="Reminders" />
      <Card>
        {!notificationsSupported ? (
          <Dim>
            Timed notifications work in the iOS and Android apps. On the web, keep Akol open to see what's due.
          </Dim>
        ) : (
          <>
            <ToggleRow
              label="Timed reminders"
              hint={perm === 'denied' ? 'Blocked in system settings — tap to fix.' : `${pending} upcoming reminder${pending === 1 ? '' : 's'} scheduled.`}
              value={settings.notificationsEnabled && perm === 'granted'}
              onChange={setNotify}
            />
            <ToggleRow
              label="Skip finished items"
              hint="If it's already ticked off, Akol stays quiet."
              value={settings.smartSkip}
              onChange={(smartSkip) => dispatch({ type: 'settings', patch: { smartSkip } })}
            />
            <Eyebrow style={{ color: colors.textDim, fontSize: 10, marginTop: space.md, marginBottom: space.sm }}>
              Remind this device about
            </Eyebrow>
            <View style={styles.wrap}>
              {state.members.map((m) => (
                <Chip
                  key={m.id}
                  label={m.name}
                  color={jewels[m.color].base}
                  active={settings.notifyFor.length === 0 || settings.notifyFor.includes(m.id)}
                  onPress={() => toggleNotifyFor(m.id)}
                />
              ))}
            </View>
            <Dim style={{ fontSize: 12, marginTop: space.sm }}>Family checkpoints always remind everyone.</Dim>
            <GhostButton
              label="Send a test reminder"
              icon={<Ionicons name="notifications-outline" size={16} color={colors.ink} />}
              onPress={async () => {
                await sendTestReminder();
                setPerm(await notificationPermission());
                syncReminders(state);
              }}
              style={{ marginTop: space.lg }}
            />
          </>
        )}
      </Card>

      <SectionHeader title="Showing Akol to someone" />
      <Card>
        <ToggleRow
          label="Demo clock"
          hint={
            settings.demoClock
              ? `Akol is running as if the day started at ${formatTime(settings.demoClock.time)}. Reminders still use real time.`
              : 'Run the day from 6:48am so the school-morning routine is live.'
          }
          value={!!settings.demoClock}
          onChange={(on) =>
            dispatch({ type: 'settings', patch: { demoClock: on ? { time: '06:48', setAt: Date.now() } : null } })
          }
        />
      </Card>

      <SectionHeader title="Your data" />
      <Card style={{ gap: space.md }}>
        <Dim style={{ fontSize: 13 }}>
          Everything is stored privately on this device. No account, no tracking.
        </Dim>
        <GhostButton
          label="Clear today's ticks"
          tone="plain"
          onPress={() =>
            confirm("Clear today's ticks?", 'Every item for today will be marked as not done.', 'Clear', () =>
              dispatch({ type: 'resetDay', day: dayKey(new Date()) }),
            )
          }
        />
        <GhostButton
          label="Load the example family"
          tone="plain"
          onPress={() =>
            confirm('Replace with the example?', 'Your current family and routines will be replaced by the Mark & Ra example.', 'Replace', () =>
              dispatch({ type: 'replace', state: exampleFamily(me?.name ?? 'Mark') }),
            )
          }
        />
        <GhostButton
          label="Erase everything"
          tone="danger"
          onPress={() =>
            confirm('Erase all Akol data?', 'This cannot be undone.', 'Erase', () => {
              dispatch({ type: 'replace', state: emptyState() });
              router.replace('/welcome');
            })
          }
        />
      </Card>

      <Text style={styles.footer}>
        AKOL · v{Constants.expoConfig?.version ?? '1.0.0'} · {Platform.OS}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  memberName: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  footer: {
    textAlign: 'center',
    marginTop: space.xxl,
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textFaint,
  },
});
