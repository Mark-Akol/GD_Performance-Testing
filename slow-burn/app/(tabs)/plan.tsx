import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { TimeField } from '@/components/TimeField';
import { DOMAIN_META } from '@/theme/domains';
import { formatTimeLabel, parseTime } from '@/engine/time';
import { planDay } from '@/engine/planDay';
import { localDay, localDayOfWeek } from '@/lib/dates';
import { saveReminderSetting } from '@/lib/repo';
import { useSession } from '@/store/session';
import { palette, radius, spacing } from '@/theme/tokens';
import { REMINDER_DOMAINS, type ReminderDomain, type ReminderMode } from '@/types/models';

export default function Plan() {
  const session = useSession((s) => s.session);
  const goals = useSession((s) => s.goals);
  const settings = useSession((s) => s.settings);
  const refresh = useSession((s) => s.refresh);

  const [expanded, setExpanded] = useState<ReminderDomain | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    async (domain: ReminderDomain, patch: Parameters<typeof saveReminderSetting>[2]) => {
      if (!session) return;
      setError(null);
      try {
        await saveReminderSetting(session.user.id, domain, patch);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save that');
      }
    },
    [session, refresh],
  );

  // A live preview of what the current settings actually produce. Showing the
  // resulting times is the difference between "trust me" and "here is your day".
  const preview = useMemo(() => {
    if (!goals) return [];
    const now = new Date();
    return planDay({
      goals,
      settings,
      day: localDay(now),
      dayOfWeek: localDayOfWeek(now),
    }).items;
  }, [goals, settings]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="eyebrow" tone="ember">
            HOW YOU WANT IT
          </Text>
          <Text variant="title">Your plan</Text>
          <Text variant="body" tone="secondary">
            Every reminder is either on your schedule or on ours. Switch any of them,
            any time.
          </Text>
        </View>

        {error ? (
          <Text variant="caption" tone="danger" style={styles.block}>
            {error}
          </Text>
        ) : null}

        <View style={styles.list}>
          {REMINDER_DOMAINS.map((domain) => {
            const setting = settings.find((s) => s.domain === domain);
            if (!setting) return null;

            const meta = DOMAIN_META[domain];
            const isOpen = expanded === domain;
            const count = preview.filter((i) => i.domain === domain).length;

            return (
              <Card key={domain} style={styles.domainCard}>
                <Pressable
                  onPress={() => setExpanded(isOpen ? null : domain)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  style={styles.domainHead}
                >
                  <View style={[styles.glyph, { backgroundColor: `${meta.color}1F` }]}>
                    <Ionicons name={meta.icon as never} size={20} color={meta.color} />
                  </View>

                  <View style={styles.domainText}>
                    <Text variant="label">{meta.label}</Text>
                    <Text variant="caption" tone="tertiary">
                      {setting.enabled
                        ? `${setting.mode === 'coached' ? 'Recommended' : 'Your times'} · ${count} today`
                        : 'Off'}
                    </Text>
                  </View>

                  <Switch
                    value={setting.enabled}
                    onValueChange={(enabled) => void update(domain, { enabled })}
                    trackColor={{ false: palette.hairline, true: palette.emberDim }}
                    thumbColor={setting.enabled ? palette.ember : palette.textTertiary}
                    accessibilityLabel={`${meta.label} reminders`}
                  />
                </Pressable>

                {isOpen && setting.enabled ? (
                  <View style={styles.domainBody}>
                    <ModeToggle
                      mode={setting.mode}
                      onChange={(mode) => void update(domain, { mode })}
                    />

                    {setting.mode === 'preset' ? (
                      <PresetTimes
                        times={setting.presetTimes}
                        onChange={(presetTimes) => void update(domain, { presetTimes })}
                      />
                    ) : (
                      <View style={styles.previewTimes}>
                        <Text variant="caption" tone="tertiary">
                          {count > 0
                            ? preview
                                .filter((i) => i.domain === domain)
                                .map((i) => formatTimeLabel(i.minuteOfDay))
                                .join('   ')
                            : 'Nothing today — this one rests.'}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** The product's core choice, made concrete: your times, or ours. */
function ModeToggle({
  mode,
  onChange,
}: {
  mode: ReminderMode;
  onChange: (mode: ReminderMode) => void;
}) {
  return (
    <View style={styles.toggle}>
      {(['coached', 'preset'] as ReminderMode[]).map((option) => {
        const on = mode === option;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.toggleOption, on && styles.toggleOn]}
          >
            <Text variant="caption" tone={on ? 'primary' : 'tertiary'}>
              {option === 'coached' ? 'Recommend for me' : 'I set the times'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PresetTimes({
  times,
  onChange,
}: {
  times: string[];
  onChange: (times: string[]) => void;
}) {
  const sorted = [...times].sort((a, b) => safeParse(a) - safeParse(b));

  return (
    <View style={styles.presets}>
      {sorted.map((time, index) => (
        <View key={`${time}-${index}`} style={styles.presetRow}>
          <TimeField
            label={`Reminder ${index + 1}`}
            value={time}
            onChange={(next) => {
              const copy = [...sorted];
              copy[index] = next;
              onChange(copy);
            }}
          />
          <Pressable
            onPress={() => onChange(sorted.filter((_, i) => i !== index))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Remove reminder ${index + 1}`}
            style={styles.remove}
          >
            <Ionicons name="trash-outline" size={16} color={palette.textTertiary} />
          </Pressable>
        </View>
      ))}

      {sorted.length < 10 ? (
        <Pressable
          onPress={() => onChange([...sorted, '12:00'])}
          accessibilityRole="button"
          style={styles.add}
        >
          <Ionicons name="add" size={16} color={palette.ember} />
          <Text variant="caption" tone="ember">
            Add a time
          </Text>
        </Pressable>
      ) : null}

      {sorted.length === 0 ? (
        <Text variant="caption" tone="tertiary">
          No times set, so nothing is scheduled for this one.
        </Text>
      ) : null}
    </View>
  );
}

function safeParse(value: string): number {
  try {
    return parseTime(value);
  } catch {
    return 0;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.void },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  header: { gap: spacing.sm },
  block: { marginTop: spacing.lg },
  list: { marginTop: spacing.xl, gap: spacing.sm },
  domainCard: { padding: spacing.md },
  domainHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  glyph: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  domainText: { flex: 1, gap: 2 },
  domainBody: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.hairline,
    gap: spacing.md,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: palette.void,
    borderRadius: radius.pill,
    padding: 3,
    gap: 3,
  },
  toggleOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  toggleOn: { backgroundColor: palette.surfaceRaised },
  presets: { gap: spacing.xs },
  presetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  previewTimes: { paddingVertical: spacing.xs },
});
