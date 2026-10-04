import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../../components/Avatar';
import { Timeline } from '../../components/Checklist';
import { Card, Dim, FadeIn, InkButton, Screen, SectionHeader, Segmented } from '../../components/ui';
import {
  FAMILY_ID,
  atTime,
  dayKey,
  formatTime,
  greeting,
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
  const { state, me, member, routine, dispatch } = useAkol();
  const now = useNow();
  const [scope, setScope] = useState<Scope>('mine');
  const today = dayKey(now);

  const all = useMemo(() => tasksForDay(state, now), [state, now]);
  const mine = useMemo(() => (me ? tasksForDay(state, now, me.id) : all), [state, now, me, all]);
  const visible = scope === 'mine' ? mine : all;

  const next = nextUp(visible, state.completions, today, now);
  const late = overdue(visible, state.completions, today, now);
  const p = progress(visible, state.completions, today);
  const allDone = p.total > 0 && p.done === p.total;

  const groups = useMemo(() => groupByRoutine(visible), [visible]);

  const nextWho = next ? (next.task.memberId === FAMILY_ID ? 'the whole crew' : member(next.task.memberId)?.name) : undefined;
  const dateLine = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen>
      <FadeIn>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <View style={styles.brandRow}>
              <Text style={styles.brand}>AKOL</Text>
              <Text style={styles.tag}>est. 2026</Text>
            </View>
            <Text style={styles.date}>{dateLine}</Text>
            {state.settings.demoClock && (
              <Pressable
                onPress={() => dispatch({ type: 'settings', patch: { demoClock: null } })}
                style={styles.demo}
                accessibilityRole="button"
              >
                <Text style={styles.demoText}>
                  ● Demo clock {formatTime(`${now.getHours()}:${now.getMinutes()}`)} · tap for real time
                </Text>
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Settings">
            <Avatar member={me} size={50} ratio={progress(mine, state.completions, today).ratio} />
          </Pressable>
        </View>
      </FadeIn>

      <FadeIn delay={100}>
        <Text style={styles.greeting}>{greeting(now)},</Text>
        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
          {(me?.name ?? 'there').toUpperCase()}.
        </Text>
      </FadeIn>

      {/* Now playing */}
      <FadeIn delay={320}>
        <View style={styles.lead}>
          <View style={styles.leadTop}>
            <Text style={styles.leadLabel}>{allDone ? 'Album complete' : next ? (next.status === 'due' ? '▶ Now playing' : 'Up next') : 'Today'}</Text>
            {next && !allDone && <Text style={styles.leadLabel}>{relative(atTime(now, next.task.time), now)}</Text>}
          </View>
          <Text style={styles.leadTitle}>
            {allDone ? 'All tracks played.' : next ? next.task.title : p.total ? 'That’s a wrap.' : 'Quiet day.'}
          </Text>
          {next && !allDone && (
            <View style={styles.leadMeta}>
              <View style={styles.timePill}>
                <Text style={styles.timePillText}>{formatTime(next.task.time)}</Text>
              </View>
              {nextWho && <Text style={styles.feat}>feat. {nextWho}</Text>}
            </View>
          )}
          <View style={styles.stats}>
            <Stat value={`${p.done}/${p.total}`} label="Played" />
            <View style={styles.statRule} />
            <Stat value={String(late.length)} label="Late" />
            <View style={styles.statRule} />
            <Stat value={`${Math.round(p.ratio * 100)}%`} label="Done" />
          </View>
        </View>
      </FadeIn>

      <FadeIn delay={420} style={{ marginTop: space.xl }}>
        <Segmented<Scope>
          value={scope}
          onChange={setScope}
          options={[
            { value: 'mine', label: 'My tracks' },
            { value: 'family', label: 'Whole crew' },
          ]}
        />
      </FadeIn>

      {groups.length === 0 ? (
        <Card style={{ marginTop: space.xl, alignItems: 'center', gap: space.md }}>
          <Text style={styles.quiet}>No tracks today.</Text>
          <Dim style={{ textAlign: 'center' }}>Enjoy the quiet, or cut a new routine.</Dim>
          <InkButton label="Plan a routine" onPress={() => router.push('/routines')} />
        </Card>
      ) : (
        groups.map((g, i) => {
          const gp = progress(g.tasks, state.completions, today);
          return (
            <FadeIn key={g.routineId} delay={500 + i * 80}>
              <SectionHeader
                title={`${routine(g.routineId)?.name ?? 'Routine'}`}
                right={
                  <Text style={styles.groupCount}>
                    {gp.done}/{gp.total}
                  </Text>
                }
              />
              <Timeline tasks={g.tasks} day={today} now={now} showMember={scope === 'family'} />
            </FadeIn>
          );
        })
      )}
      <Text style={styles.outro}>Tap a track to mark it played · press and hold to edit</Text>
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
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  brand: { fontFamily: fonts.display, fontSize: 30, letterSpacing: 2, color: colors.text },
  tag: { fontFamily: fonts.italic, fontSize: 15, color: colors.text, transform: [{ rotate: '-6deg' }], marginTop: 4 },
  date: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 2.6, textTransform: 'uppercase', color: colors.textDim },
  demo: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  demoText: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.textDim },
  greeting: { fontFamily: fonts.italic, fontSize: 24, color: colors.text, marginTop: space.xl, transform: [{ rotate: '-2deg' }] },
  name: { fontFamily: fonts.display, fontSize: 112, lineHeight: 124, color: colors.text, letterSpacing: 1 },
  lead: { backgroundColor: colors.ink, padding: space.xl, marginTop: space.xl },
  leadTop: { flexDirection: 'row', justifyContent: 'space-between' },
  leadLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 2.6, textTransform: 'uppercase', color: colors.onPaper },
  leadTitle: {
    fontFamily: fonts.display,
    fontSize: 52,
    lineHeight: 60,
    letterSpacing: 0.5,
    color: colors.onPaper,
    marginTop: space.sm,
    textTransform: 'uppercase',
  },
  leadMeta: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md, flexWrap: 'wrap' },
  timePill: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: colors.onPaper },
  timePillText: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 1, color: colors.ink, ...lining },
  feat: { fontFamily: fonts.italic, fontSize: 19, color: colors.onPaper, transform: [{ rotate: '-2deg' }] },
  stats: { flexDirection: 'row', marginTop: space.xl, paddingTop: space.md, borderTopWidth: 2, borderTopColor: colors.onPaper },
  stat: { flex: 1, alignItems: 'center' },
  statRule: { width: 2, backgroundColor: colors.onPaper },
  statValue: { fontFamily: fonts.display, fontSize: 34, color: colors.onPaper, ...lining },
  statLabel: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2.6, textTransform: 'uppercase', color: 'rgba(0,0,0,0.6)' },
  groupCount: { fontFamily: fonts.display, fontSize: 18, color: colors.text, ...lining },
  quiet: { fontFamily: fonts.display, fontSize: 34, color: colors.text, textTransform: 'uppercase' },
  outro: { fontFamily: fonts.italic, textAlign: 'center', fontSize: 14, marginTop: space.xl, color: colors.textFaint },
});
