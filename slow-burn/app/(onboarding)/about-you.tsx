import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Choice } from '@/components/Choice';
import { saveGoals } from '@/lib/repo';
import { useSession } from '@/store/session';
import { palette, radius, spacing } from '@/theme/tokens';
import type { ActivityLevel, GoalType } from '@/types/models';

export default function AboutYou() {
  const router = useRouter();
  const session = useSession((s) => s.session);

  const [goalType, setGoalType] = useState<GoalType>('general_health');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [weight, setWeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weightKg = Number.parseFloat(weight.replace(',', '.'));
  const weightValid = Number.isFinite(weightKg) && weightKg >= 25 && weightKg <= 400;

  const next = async () => {
    if (!session || !weightValid) return;
    setBusy(true);
    setError(null);
    try {
      await saveGoals(session.user.id, { goalType, activityLevel, weightKg });
      router.push('/(onboarding)/your-day');
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
          STEP 1 OF 2
        </Text>
        <Text variant="title">What are you working toward?</Text>
      </View>

      <Text variant="eyebrow" tone="tertiary" style={styles.section}>
        GOAL
      </Text>
      <Choice
        value={goalType}
        onChange={setGoalType}
        options={[
          { value: 'lose_fat', label: 'Lose fat', hint: 'Fewer, larger, more filling meals' },
          { value: 'build_muscle', label: 'Build muscle', hint: 'More frequent feeding, split training' },
          { value: 'endurance', label: 'Endurance', hint: 'Fuel around sessions, longer cardio' },
          { value: 'maintain', label: 'Maintain', hint: 'Hold the line, stay consistent' },
          { value: 'general_health', label: 'General health', hint: 'Move more, eat better, sit less' },
        ]}
      />

      <Text variant="eyebrow" tone="tertiary" style={styles.section}>
        HOW ACTIVE ARE YOU?
      </Text>
      <Choice
        value={activityLevel}
        onChange={setActivityLevel}
        options={[
          { value: 'sedentary', label: 'Sedentary', hint: 'Desk-bound most days' },
          { value: 'light', label: 'Light', hint: 'A walk or two a week' },
          { value: 'moderate', label: 'Moderate', hint: 'Training a few times a week' },
          { value: 'high', label: 'High', hint: 'Training most days' },
          { value: 'athlete', label: 'Athlete', hint: 'Structured, high volume' },
        ]}
      />

      <Text variant="eyebrow" tone="tertiary" style={styles.section}>
        WEIGHT (KG)
      </Text>
      <TextInput
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        placeholder="80"
        placeholderTextColor={palette.textTertiary}
        style={styles.input}
        accessibilityLabel="Your weight in kilograms"
      />
      <Text variant="caption" tone="tertiary">
        Used to size your water target. Never shared with your circle.
      </Text>

      {error ? (
        <Text variant="caption" tone="danger" style={styles.section}>
          {error}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Button label="Continue" onPress={next} loading={busy} disabled={!weightValid} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.xl },
  section: { marginTop: spacing.xl, marginBottom: spacing.sm },
  input: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    color: palette.textPrimary,
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 50,
    marginBottom: spacing.sm,
  },
  footer: { marginTop: spacing.xxl },
});
