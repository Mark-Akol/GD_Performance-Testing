import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { TimeField } from '@/components/TimeField';
import { dailyWaterTargetMl } from '@/engine/hydration';
import { cancelAllReminders } from '@/lib/notifications';
import { saveGoals } from '@/lib/repo';
import { useSession } from '@/store/session';
import { palette, spacing } from '@/theme/tokens';

export default function You() {
  const session = useSession((s) => s.session);
  const profile = useSession((s) => s.profile);
  const goals = useSession((s) => s.goals);
  const refresh = useSession((s) => s.refresh);
  const signOut = useSession((s) => s.signOut);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchGoals = async (patch: Parameters<typeof saveGoals>[1]) => {
    if (!session) return;
    setError(null);
    try {
      await saveGoals(session.user.id, patch);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that');
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    // Local reminders live on the device, not the account. Without this, a
    // signed-out phone keeps buzzing with the previous user's schedule.
    await cancelAllReminders();
    await signOut();
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="eyebrow" tone="ember">
            PROFILE
          </Text>
          <Text variant="title">{profile?.displayName ?? 'You'}</Text>
          {profile ? (
            <Text variant="caption" tone="tertiary">
              @{profile.handle}
            </Text>
          ) : null}
        </View>

        {goals ? (
          <>
            <Card style={styles.block}>
              <Text variant="eyebrow" tone="tertiary">
                WATER TARGET
              </Text>
              <Text variant="title" tone="ember" style={styles.big}>
                {(dailyWaterTargetMl(goals) / 1000).toFixed(1)} L
              </Text>
              <Text variant="caption" tone="tertiary">
                Based on {goals.weightKg ?? '—'} kg and a {goals.activityLevel} activity level.
              </Text>
            </Card>

            <Text variant="eyebrow" tone="tertiary" style={styles.section}>
              YOUR DAY
            </Text>
            <Card>
              <TimeField
                label="Wake"
                value={goals.wakeTime}
                onChange={(wakeTime) => void patchGoals({ wakeTime })}
              />
              <TimeField
                label="Sleep"
                value={goals.sleepTime}
                onChange={(sleepTime) => void patchGoals({ sleepTime })}
              />
              <TimeField
                label="Desk from"
                value={goals.workStart}
                onChange={(workStart) => void patchGoals({ workStart })}
              />
              <TimeField
                label="Desk until"
                value={goals.workEnd}
                onChange={(workEnd) => void patchGoals({ workEnd })}
              />
            </Card>

            <Card style={styles.block}>
              <Text variant="eyebrow" tone="tertiary">
                WHAT YOUR CIRCLE SEES
              </Text>
              <Text variant="body" tone="secondary" style={styles.blurb}>
                Your daily score, how many items you completed, and your streak. That is
                all. Your weight, your meals and the individual things you skipped never
                leave this device and your account.
              </Text>
            </Card>
          </>
        ) : null}

        {error ? (
          <Text variant="caption" tone="danger" style={styles.block}>
            {error}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Button label="Sign out" onPress={handleSignOut} variant="quiet" loading={busy} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.void },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  header: { gap: spacing.xs },
  block: { marginTop: spacing.lg },
  big: { marginVertical: spacing.xs },
  blurb: { marginTop: spacing.sm },
  section: { marginTop: spacing.xxl, marginBottom: spacing.md },
  footer: { marginTop: spacing.xxl },
});
