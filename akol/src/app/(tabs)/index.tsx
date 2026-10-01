import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, jewelFor } from '../../components/Avatar';
import { Timeline } from '../../components/Checklist';
import { Orrery, type OrbitRing } from '../../components/three/Orrery';
import { Card, Dim, FadeIn, InkButton, Screen, SectionHeader, Segmented, tap } from '../../components/ui';
import {
  FAMILY_ID,
  atTime,
  checkpointSummary,
  dayKey,
  formatTime,
  greeting,
  isDone,
  minutesOfDay,
  nextUp,
  overdue,
  parseTime,
  progress,
  relative,
  taskStatus,
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

/** The slice of the day a routine covers, padded a little either side. */
function windowOf(tasks: Task[]) {
  const mins = tasks.map((t) => parseTime(t.time));
  return { from: Math.min(...mins) - 10, to: Math.max(...mins) + 10 };
}

export default function Today() {
  const { state, me, member, routine, dispatch, toggle } = useAkol();
  const now = useNow();
  const [scope, setScope] = useState<Scope>('mine');
  const [pick, setPick] = useState<number | null>(null);
  const today = dayKey(now);

  const all = useMemo(() => tasksForDay(state, now), [state, now]);
  const mine = useMemo(() => (me ? tasksForDay(state, now, me.id) : all), [state, now, me, all]);
  const visible = scope === 'mine' ? mine : all;

  const next = nextUp(visible, state.completions, today, now);
  const late = overdue(visible, state.completions, today, now);
  const p = progress(visible, state.completions, today);
  const allDone = p.total > 0 && p.done === p.total;

  const groups = useMemo(() => groupByRoutine(visible), [visible]);
  const orbitGroups = useMemo(() => groupByRoutine(all), [all]);

  // The orrery shows the routine happening now, else the next one today, else the first.
  const nowMins = minutesOfDay(now);
  const auto = Math.max(0, orbitGroups.findIndex((g) => windowOf(g.tasks).to >= nowMins));
  const idx = pick !== null && pick < orbitGroups.length ? pick : auto;
  const active = orbitGroups[idx];

  const scene = useMemo(() => {
    if (!active) return null;
    const { from, to } = windowOf(active.tasks);
    const frac = (t: string) => (parseTime(t) - from) / (to - from);
    const chores = active.tasks.filter((t) => !t.checkpoint);
    const ids = [...new Set(chores.map((t) => t.memberId))];
    const rings: OrbitRing[] = ids.map((id) => {
      const j = jewelFor(member(id), id);
      return {
        id,
        hex: j.hex,
        metal: j.metal,
        beads: chores
          .filter((t) => t.memberId === id)
          .map((t) => {
            const done = isDone(state.completions, today, t.id);
            const st = taskStatus(t, done, now);
            return { id: t.id, frac: frac(t.time), done, due: st === 'due', late: st === 'overdue' };
          }),
      };
    });
    const cp = active.tasks.find((t) => t.checkpoint);
    const sum = cp ? checkpointSummary(cp, state, state.completions, today) : null;
    const ratio = sum ? sum.done.length / Math.max(1, sum.done.length + sum.outstanding.length) : undefined;
    return { rings, nowFrac: (nowMins - from) / (to - from), ratio, ids };
  }, [active, state, today, now, nowMins, member]);

  const nextWho = next ? (next.task.memberId === FAMILY_ID ? 'Everyone' : member(next.task.memberId)?.name) : undefined;
  const dateLine = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen>
      <FadeIn>
        <View style={styles.top}>
          <View style={{ flex: 1, gap: space.sm }}>
            <Text style={styles.date}>{dateLine}</Text>
            {state.settings.demoClock && (
              <Pressable
                onPress={() => dispatch({ type: 'settings', patch: { demoClock: null } })}
                style={styles.demo}
                accessibilityRole="button"
              >
                <View style={styles.demoDot} />
                <Text style={styles.demoText}>
                  Demo clock {formatTime(`${now.getHours()}:${now.getMinutes()}`)} · tap for real time
                </Text>
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Settings">
            <Avatar member={me} size={50} ratio={progress(mine, state.completions, today).ratio} />
          </Pressable>
        </View>
      </FadeIn>

      <FadeIn delay={120}>
        <Text style={styles.greeting}>{greeting(now)},</Text>
        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
          {(me?.name ?? 'there').toUpperCase()}.
        </Text>
      </FadeIn>

      {/* The orrery */}
      {active && scene ? (
        <FadeIn delay={240} style={styles.orreryWrap}>
          <Orrery
            rings={scene.rings}
            nowFrac={scene.nowFrac}
            checkpointRatio={scene.ratio}
            onToggle={(id) => {
              tap('success');
              toggle(id, today);
            }}
            height={400}
          />
          <View style={styles.orreryHead} pointerEvents="box-none">
            {orbitGroups.length > 1 && (
              <Pressable hitSlop={12} onPress={() => setPick((idx - 1 + orbitGroups.length) % orbitGroups.length)}>
                <Ionicons name="chevron-back" size={16} color={colors.ink} />
              </Pressable>
            )}
            <Text style={styles.orreryTitle}>{routine(active.routineId)?.name ?? 'Routine'}</Text>
            {orbitGroups.length > 1 && (
              <Pressable hitSlop={12} onPress={() => setPick((idx + 1) % orbitGroups.length)}>
                <Ionicons name="chevron-forward" size={16} color={colors.ink} />
              </Pressable>
            )}
          </View>
          <View style={styles.legend} pointerEvents="box-none">
            {scene.ids.map((id) => {
              const m = member(id);
              const j = jewelFor(m, id);
              const mp = progress(
                active.tasks.filter((t) => t.memberId === id),
                state.completions,
                today,
              );
              return (
                <Pressable key={id} style={styles.legendItem} onPress={() => m && router.push(`/member/${m.id}`)}>
                  <View style={[styles.legendDot, { backgroundColor: j.hex, shadowColor: j.hex }]} />
                  <Text style={styles.legendName}>{m?.name ?? 'Everyone'}</Text>
                  <Text style={styles.legendCount}>
                    {mp.done}/{mp.total}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>Tap a gem to tick it off · move to look around</Text>
        </FadeIn>
      ) : null}

      {/* Next up */}
      <FadeIn delay={360}>
        <View style={styles.lead}>
          <View style={styles.leadTop}>
            <Text style={styles.nextLabel}>{allDone ? 'All complete' : next ? (next.status === 'due' ? 'Due now' : 'Next') : 'Today'}</Text>
            {next && !allDone && <Text style={styles.nextLabel}>{relative(atTime(now, next.task.time), now)}</Text>}
          </View>
          <Text style={styles.nextTitle}>
            {allDone ? 'Beautifully done.' : next ? `${next.task.title}.` : p.total ? 'Nothing further.' : 'A quiet day.'}
          </Text>
          {next && !allDone && (
            <View style={styles.nextMeta}>
              <View style={styles.timePill}>
                <Text style={styles.timePillText}>{formatTime(next.task.time)}</Text>
              </View>
              {nextWho && <Text style={styles.nextWho}>{nextWho}</Text>}
            </View>
          )}
          <View style={styles.stats}>
            <Stat value={`${p.done}/${p.total}`} label="Done" />
            <View style={styles.statRule} />
            <Stat value={String(late.length)} label="Late" />
            <View style={styles.statRule} />
            <Stat value={`${Math.round(p.ratio * 100)}%`} label="Complete" />
          </View>
        </View>
      </FadeIn>

      <FadeIn delay={460} style={{ marginTop: space.xl }}>
        <Segmented<Scope>
          value={scope}
          onChange={setScope}
          options={[
            { value: 'mine', label: 'My list' },
            { value: 'family', label: 'Whole family' },
          ]}
        />
      </FadeIn>

      {groups.length === 0 ? (
        <Card style={{ marginTop: space.xl, alignItems: 'center', gap: space.md }}>
          <Text style={styles.quiet}>Nothing today.</Text>
          <Dim style={{ textAlign: 'center' }}>Enjoy the calm, or plan a routine.</Dim>
          <InkButton label="Plan a routine" onPress={() => router.push('/routines')} />
        </Card>
      ) : (
        groups.map((g, i) => {
          const gp = progress(g.tasks, state.completions, today);
          return (
            <FadeIn key={g.routineId} delay={540 + i * 80}>
              <SectionHeader
                title={routine(g.routineId)?.name ?? 'Routine'}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  demoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink },
  demoText: { fontFamily: fonts.medium, fontSize: 11, color: colors.textDim },
  greeting: { fontFamily: fonts.italic, fontSize: 26, lineHeight: 32, color: colors.textDim, marginTop: space.xl },
  name: { fontFamily: fonts.display, fontSize: 92, lineHeight: 96, color: colors.text, letterSpacing: -4 },
  orreryWrap: { marginHorizontal: -18, marginTop: -space.md },
  orreryHead: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.md,
  },
  orreryTitle: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 3, textTransform: 'uppercase', color: colors.text },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.lg, marginTop: -space.xl },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  legendDot: { width: 8, height: 8, borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  legendName: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  legendCount: { fontFamily: fonts.italic, fontSize: 15, color: colors.textDim, ...lining },
  hint: { fontFamily: fonts.light, fontSize: 12, color: colors.textFaint, textAlign: 'center', marginTop: space.sm },
  lead: { backgroundColor: colors.ink, padding: space.xl, marginTop: space.lg },
  leadTop: { flexDirection: 'row', justifyContent: 'space-between' },
  nextLabel: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 3, textTransform: 'uppercase', color: colors.onPaper },
  nextTitle: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: -1.5, color: colors.onPaper, marginTop: space.sm, textTransform: 'uppercase' },
  nextMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md, flexWrap: 'wrap' },
  timePill: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: colors.onPaper },
  timePillText: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 1, color: colors.ink, ...lining },
  nextWho: { fontFamily: fonts.italic, fontSize: 20, color: colors.onPaper },
  stats: { flexDirection: 'row', marginTop: space.xl, paddingTop: space.md, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.15)' },
  stat: { flex: 1, alignItems: 'center' },
  statRule: { width: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  statValue: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -1, color: colors.onPaper, ...lining },
  statLabel: { fontFamily: fonts.semibold, fontSize: 9.5, letterSpacing: 2.6, textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)' },
  groupCount: { fontFamily: fonts.italic, fontSize: 16, color: colors.ink, ...lining },
  quiet: { fontFamily: fonts.masthead, fontSize: 36, color: colors.text },
  tip: { textAlign: 'center', fontSize: 12, marginTop: space.xl, color: colors.textFaint },
});
