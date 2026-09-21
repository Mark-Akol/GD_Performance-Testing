import { useCallback, useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { BurnRing } from '@/components/BurnRing';
import { ActionRow } from '@/components/ActionRow';
import { currentMinuteOfDay } from '@/lib/dates';
import { useDay } from '@/store/day';
import { useSession } from '@/store/session';
import { palette, spacing } from '@/theme/tokens';
import type { HabitEvent } from '@/types/models';
import type { ScheduledItem } from '@/types/schedule';

export default function Today() {
  const session = useSession((s) => s.session);
  const goals = useSession((s) => s.goals);
  const settings = useSession((s) => s.settings);

  const { items, events, summary, loading, error, load, complete, skip } = useDay();

  const reload = useCallback(() => {
    if (!session || !goals || settings.length === 0) return;
    void load(session.user.id, goals, settings);
  }, [session, goals, settings, load]);

  useEffect(reload, [reload]);

  // Join the locally-computed plan to the persisted events so the list has
  // both the copy (title, detail) and the state (done/skipped) in one place.
  const rows = useMemo(() => joinPlanToEvents(items, events), [items, events]);

  const nextIndex = rows.findIndex((r) => r.event?.status === 'pending');
  const score = summary?.score ?? 0;
  const streak = summary?.streak ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} tintColor={palette.ember} />
        }
      >
        <View style={styles.header}>
          <Text variant="eyebrow" tone="ember">
            {greeting().toUpperCase()}
          </Text>
          <Text variant="title">
            {summary && summary.total > 0
              ? `${summary.completed} of ${summary.total} done`
              : 'Your day is ready'}
          </Text>
        </View>

        <View style={styles.ringWrap}>
          <BurnRing score={score} caption="today" />
          {streak > 0 ? (
            <Text variant="label" tone="brass" style={styles.streak}>
              {streak} day{streak === 1 ? '' : 's'} running
            </Text>
          ) : (
            <Text variant="caption" tone="tertiary" style={styles.streak}>
              Hit 70% to start a streak
            </Text>
          )}
        </View>

        {error ? (
          <Text variant="caption" tone="danger" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Text variant="eyebrow" tone="tertiary" style={styles.section}>
          THE DAY
        </Text>

        <View style={styles.list}>
          {rows.length === 0 && !loading ? (
            <Text variant="body" tone="secondary">
              Nothing scheduled. Turn some reminders on in Plan.
            </Text>
          ) : null}

          {rows.map((row, index) => (
            <ActionRow
              key={row.item.key}
              domain={row.item.domain}
              title={row.item.title}
              detail={row.item.detail}
              minuteOfDay={row.item.minuteOfDay}
              status={row.event?.status ?? 'pending'}
              isNext={index === nextIndex}
              onComplete={() => {
                if (session && row.event) void complete(session.user.id, row.event.id);
              }}
              onSkip={() => {
                if (session && row.event) void skip(session.user.id, row.event.id);
              }}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface Row {
  item: ScheduledItem;
  event: HabitEvent | undefined;
}

/**
 * Events are matched to plan items by scheduled time rather than by key,
 * because deconfliction can move an item after it was first persisted. Time
 * is the thing both sides agree on.
 */
function joinPlanToEvents(items: ScheduledItem[], events: HabitEvent[]): Row[] {
  const byTime = new Map<string, HabitEvent>();
  for (const event of events) {
    const at = new Date(event.scheduledFor);
    byTime.set(`${event.domain}-${at.getHours() * 60 + at.getMinutes()}`, event);
  }

  return items.map((item) => ({
    item,
    event: byTime.get(`${item.domain}-${item.minuteOfDay}`),
  }));
}

function greeting(): string {
  const hour = Math.floor(currentMinuteOfDay() / 60);
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.void },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  header: { gap: spacing.sm },
  ringWrap: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.md },
  streak: { marginTop: spacing.xs },
  section: { marginTop: spacing.xxl, marginBottom: spacing.md },
  list: { gap: spacing.sm },
  error: { marginTop: spacing.lg },
});
