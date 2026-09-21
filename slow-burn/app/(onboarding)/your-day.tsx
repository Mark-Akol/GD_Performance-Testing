import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Choice } from '@/components/Choice';
import { TimeField } from '@/components/TimeField';
import { ensurePermissions } from '@/lib/notifications';
import { saveGoals } from '@/lib/repo';
import { useSession } from '@/store/session';
import { spacing } from '@/theme/tokens';
import type { DietaryPattern } from '@/types/models';

export default function YourDay() {
  const router = useRouter();
  const session = useSession((s) => s.session);
  const refresh = useSession((s) => s.refresh);

  const [wakeTime, setWakeTime] = useState('06:30');
  const [sleepTime, setSleepTime] = useState('22:30');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:30');
  const [trainingDays, setTrainingDays] = useState(3);
  const [dietaryPattern, setDietaryPattern] = useState<DietaryPattern>('omnivore');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await saveGoals(session.user.id, {
        wakeTime,
        sleepTime,
        workStart,
        workEnd,
        trainingDays,
        dietaryPattern,
      });
      // Ask for notification permission here, at the moment its purpose is
      // obvious, rather than on first launch where it reads as a demand.
      await ensurePermissions();
      await refresh();
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="eyebrow" tone="ember">
          STEP 2 OF 2
        </Text>
        <Text variant="title">Shape of your day</Text>
        <Text variant="body" tone="secondary">
          Everything is scheduled around these. You can change them any time.
        </Text>
      </View>

      <Card>
        <TimeField label="Wake" value={wakeTime} onChange={setWakeTime} />
        <TimeField label="Sleep" value={sleepTime} onChange={setSleepTime} />
      </Card>

      <Card style={styles.card}>
        <TimeField label="Desk from" value={workStart} onChange={setWorkStart} />
        <TimeField label="Desk until" value={workEnd} onChange={setWorkEnd} />
        <Text variant="caption" tone="tertiary" style={styles.note}>
          Walk prompts and screen breaks only fire inside these hours.
        </Text>
      </Card>

      <Text variant="eyebrow" tone="tertiary" style={styles.section}>
        TRAINING DAYS PER WEEK
      </Text>
      <Choice
        value={trainingDays}
        onChange={setTrainingDays}
        options={[
          { value: 2, label: '2 days', hint: 'Tue, Thu' },
          { value: 3, label: '3 days', hint: 'Mon, Wed, Fri' },
          { value: 4, label: '4 days', hint: 'Mon, Tue, Thu, Fri' },
          { value: 5, label: '5 days', hint: 'Weekdays' },
        ]}
      />

      <Text variant="eyebrow" tone="tertiary" style={styles.section}>
        HOW YOU EAT
      </Text>
      <Choice
        value={dietaryPattern}
        onChange={setDietaryPattern}
        options={[
          { value: 'omnivore', label: 'Everything' },
          { value: 'pescatarian', label: 'Pescatarian' },
          { value: 'vegetarian', label: 'Vegetarian' },
          { value: 'vegan', label: 'Vegan' },
          { value: 'halal', label: 'Halal' },
          { value: 'kosher', label: 'Kosher' },
        ]}
      />

      {error ? (
        <Text variant="caption" tone="danger" style={styles.section}>
          {error}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Button label="Build my day" onPress={finish} loading={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.xl },
  card: { marginTop: spacing.md },
  note: { marginTop: spacing.sm },
  section: { marginTop: spacing.xl, marginBottom: spacing.sm },
  footer: { marginTop: spacing.xxl },
});
