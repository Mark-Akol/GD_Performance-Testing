import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Avatar } from '../../components/Avatar';
import { Timeline } from '../../components/Checklist';
import { Dial, dialWindow } from '../../components/Dial';
import { Fleuron } from '../../components/Rules';
import { Card, Dim, InkButton, Screen, SectionHeader, Segmented, tap } from '../../components/ui';
import {
  FAMILY_ID,
  atTime,
  dayKey,
  formatTime,
  greeting,
  minutesOfDay,
  nextUp,
  overdue,
  progress,
  relative,
  tasksForDay,
} from '../../lib/schedule';
import { useAkol, useNow } from '../../lib/store';
import type { Task } from '../../lib/types';
import { colors, fonts, lining, radius, space } from '../../theme';

type Scope = 'mine' | 'family';

function groupByRoutine(tasks: Task[]) {
  const out: { routineId: string; tasks: Task[] }[] = [];
  for (const t of tasks) {
    const g = out.find((x) => x.routineId === t.routineId);
    if (g) g.tasks.push(t);
    else out.push({ routineId: t.routineId, tasks: [t] });
  }
  return out;
}

export default function Today() {
  const { state, me, member, routine, dispatch, toggle } = useAkol();
  const now = useNow();
  const { width } = useWindowDimensions();
  const [scope, setScope] = useState<Scope>('mine');
  const [dialPick, setDialPick] = useState<number | null>(null);
  const today = dayKey(now);

  const all = useMemo(() => tasksForDay(state, now), [state, now]);
  const mine = useMemo(() => (me ? tasksForDay(state, now, me.id) : all), [state, now, me, all]);
  const visible = scope === 'mine' ? mine : all;

  const next = nextUp(visible, state.completions, today, now);
  const late = overdue(visible, state.completions, today, now);
  const p = progress(visible, state.completions, today);

  const groups = useMemo(() => groupByRoutine(visible), [visible]);
  const dialGroups = useMemo(() => groupByRoutine(all), [all]);

  // The dial shows the routine happening now, else the next one today, else the first.
  const nowMins = minutesOfDay(now);
  const autoIndex = Math.max(
    0,
    dialGroups.findIndex((g) => dialWindow(g.tasks).to >= nowMins),
  );
  const dialIndex = dialPick !== null && dialPick < dialGroups.length ? dialPick : autoIndex;
  const dialGroup = dialGroups[dialIndex];
  const dialSize = Math.min(width - 32, 400);

  const dateLine = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const nextWho = next ? (next.task.memberId === FAMILY_ID ? 'Everyone' : member(next.task.memberId)?.name) : undefined;

  return (
    <Screen>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.date}>{dateLine}</Text>
          {state.settings.demoClock && (
            <Pressable
              onPress={() => dispatch({ type: 'settings', patch: { demoClock: null } })}
              style={styles.demo}
              accessibilityRole="button"
            >
              <Text style={styles.demoText}>Demo clock · tap for real time</Text>
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Settings">
          <Avatar member={me} size={46} ratio={progress(mine, state.completions, today).ratio} />
        </Pressable>
      </View>

      <Text style={styles.greeting}>{greeting(now)},</Text>
      <Text style={styles.name}>{me?.name ?? 'there'}.</Text>

      {/* The Dial */}
      {dialGroup ? (
        <View style={styles.dialWrap}>
          <View style={styles.dialHead}>
            {dialGroups.length > 1 && (
              <Pressable
                hitSlop={12}
                onPress={() => {
                  tap();
                  setDialPick((dialIndex - 1 + dialGroups.length) % dialGroups.length);
                }}
              >
                <Ionicons name="chevron-back" size={16} color={colors.ink} />
              </Pressable>
            )}
            <Text style={styles.dialTitle}>{routine(dialGroup.routineId)?.name ?? 'Routine'}</Text>
            {dialGroups.length > 1 && (
              <Pressable
                hitSlop={12}
                onPress={() => {
                  tap();
                  setDialPick((dialIndex + 1) % dialGroups.length);
                }}
              >
                <Ionicons name="chevron-forward" size={16} color={colors.ink} />
              </Pressable>
            )}
          </View>
          <Dial
            tasks={dialGroup.tasks}
            members={state.members}
            completions={state.completions}
            day={today}
            now={now}
            size={dialSize}
            onToggle={(id) => toggle(id, today)}
          />
          <View style={styles.legend}>
            {state.members
              .filter((m) => dialGroup.tasks.some((t) => t.memberId === m.id))
              .map((m) => {
                const mp = progress(
                  dialGroup.tasks.filter((t) => t.memberId === m.id),
                  state.completions,
                  today,
                );
                return (
                  <Pressable key={m.id} style={styles.legendItem} onPress={() => router.push(`/member/${m.id}`)}>
                    <Avatar member={m} size={22} />
                    <Text style={styles.legendName}>{m.name}</Text>
                    <Text style={styles.legendCount}>
                      {mp.done}/{mp.total}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
          <Text style={styles.dialHint}>Tap a mark on the dial to tick it off</Text>
        </View>
      ) : null}

      {/* Next up */}
      <View style={styles.next}>
        <Text style={styles.nextLabel}>
          {p.total > 0 && p.done === p.total ? 'All done' : next ? (next.status === 'due' ? 'Now' : 'Next') : 'Today'}
        </Text>
        <Text style={styles.nextTitle}>
          {p.total > 0 && p.done === p.total
            ? 'Every item is ticked off.'
            : next
              ? next.task.title
              : p.total
                ? 'Nothing else today.'
                : 'A quiet day.'}
        </Text>
        {next && !(p.total > 0 && p.done === p.total) && (
          <Text style={styles.nextMeta}>
            {formatTime(next.task.time)} · {relative(atTime(now, next.task.time), now)}
            {nextWho ? ` · ${nextWho}` : ''}
          </Text>
        )}
        <View style={styles.stats}>
          <Stat value={`${p.done}/${p.total}`} label="done" />
          <View style={styles.statRule} />
          <Stat value={String(late.length)} label="late" />
          <View style={styles.statRule} />
          <Stat value={`${Math.round(p.ratio * 100)}%`} label="complete" />
        </View>
      </View>

      <View style={{ marginTop: space.xl }}>
        <Segmented<Scope>
          value={scope}
          onChange={setScope}
          options={[
            { value: 'mine', label: 'My list' },
            { value: 'family', label: 'Whole family' },
          ]}
        />
      </View>

      {groups.length === 0 ? (
        <Card style={{ marginTop: space.xl, alignItems: 'center', gap: space.md }}>
          <Text style={styles.quiet}>Nothing today.</Text>
          <Dim style={{ textAlign: 'center', fontFamily: fonts.light }}>Enjoy the calm, or plan a routine.</Dim>
          <InkButton label="Plan a routine" onPress={() => router.push('/routines')} />
        </Card>
      ) : (
        groups.map((g) => {
          const gp = progress(g.tasks, state.completions, today);
          return (
            <View key={g.routineId}>
              <SectionHeader
                title={routine(g.routineId)?.name ?? 'Routine'}
                right={
                  <Text style={styles.groupCount}>
                    {gp.done}/{gp.total}
                  </Text>
                }
              />
              <Timeline tasks={g.tasks} day={today} now={now} showMember={scope === 'family'} />
            </View>
          );
        })
      )}
      <Fleuron style={{ marginTop: space.xxl, width: 120, alignSelf: 'center' }} />
      <Dim style={styles.tip}>Tap to tick off · press and hold to edit</Dim>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  date: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 3, textTransform: 'uppercase', color: colors.ink, marginTop: 6 },
  demo: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  demoText: { fontFamily: fonts.medium, fontSize: 10.5, letterSpacing: 1, color: colors.ink },
  greeting: { fontFamily: fonts.italic, fontSize: 30, lineHeight: 36, color: colors.ink, marginTop: space.lg },
  name: { fontFamily: fonts.display, fontSize: 68, lineHeight: 72, letterSpacing: -2, color: colors.ink },
  dialWrap: { alignItems: 'center', marginTop: space.lg },
  dialHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  dialTitle: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 3, textTransform: 'uppercase', color: colors.ink },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.lg, marginTop: -space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendName: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  legendCount: { fontFamily: fonts.italic, fontSize: 14, color: colors.textDim, ...lining },
  dialHint: { fontFamily: fonts.light, fontSize: 12, color: colors.textFaint, marginTop: space.sm },
  next: { marginTop: space.xl, borderTopWidth: 1, borderTopColor: colors.ink, paddingTop: space.lg },
  nextLabel: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 3, textTransform: 'uppercase', color: colors.ink },
  nextTitle: { fontFamily: fonts.italic, fontSize: 36, lineHeight: 42, color: colors.ink, marginTop: space.xs },
  nextMeta: { fontFamily: fonts.light, fontSize: 15, color: colors.inkSoft, marginTop: 4, ...lining },
  stats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: space.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: space.md },
  statRule: { width: 1, backgroundColor: colors.hairline },
  statValue: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, letterSpacing: -0.5, ...lining },
  statLabel: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 2.4, textTransform: 'uppercase', color: colors.textDim },
  groupCount: { fontFamily: fonts.italic, fontSize: 15, color: colors.ink, ...lining },
  quiet: { fontFamily: fonts.italic, fontSize: 30, color: colors.ink },
  tip: { textAlign: 'center', fontSize: 12, marginTop: space.sm, color: colors.textFaint, fontFamily: fonts.light },
});
