import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Lockup } from '../../components/Lockup';
import { Avatar, ProgressRing, jewelFor } from '../../components/Avatar';
import { Timeline } from '../../components/Checklist';
import { Card, Dim, FadeIn, GhostButton, InkButton, Screen, SectionHeader, Segmented } from '../../components/ui';
import {
  FAMILY_ID,
  atTime,
  dayKey,
  formatTime,
  greeting,
  nextUp,
  overdue,
  progress,
  streak,
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

  const nextMember = next ? member(next.task.memberId) : undefined;
  const nextJewel = next ? jewelFor(nextMember, next.task.memberId) : null;
  const nextWho = next ? (next.task.memberId === FAMILY_ID ? 'Everyone' : nextMember?.name) : undefined;
  const dateLine = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const minsToNext = next ? Math.round((atTime(now, next.task.time).getTime() - now.getTime()) / 60000) : 0;
  const myStreak = me ? streak(state, me.id, now) : 0;

  return (
    <Screen>
      <FadeIn>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Lockup size={36} />
          </View>
          <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Settings">
            <Avatar member={me} size={48} ratio={progress(mine, state.completions, today).ratio} />
          </Pressable>
        </View>
      </FadeIn>

      <FadeIn delay={80}>
        <Text style={styles.date}>{dateLine}</Text>
        <Text style={styles.greeting} numberOfLines={1} adjustsFontSizeToFit>
          {greeting(now)}, {me?.name ?? 'there'} 👋
        </Text>
        {state.settings.demoClock && (
          <Pressable
            onPress={() => dispatch({ type: 'settings', patch: { demoClock: null } })}
            style={styles.demo}
            accessibilityRole="button"
          >
            <Text style={styles.demoText}>
              Demo clock {formatTime(`${now.getHours()}:${now.getMinutes()}`)} · tap for real time
            </Text>
          </Pressable>
        )}
      </FadeIn>

      {/* Up next, with a countdown ring */}
      <FadeIn delay={200}>
        <Card style={styles.lead}>
          <View style={styles.ringWrap}>
            <ProgressRing
              size={96}
              stroke={9}
              ratio={allDone ? 1 : next ? (next.status === 'due' || minsToNext <= 0 ? 1 : 1 - Math.min(60, minsToNext) / 60) : 0}
              color={allDone ? colors.success : next?.status === 'due' || minsToNext <= 0 ? colors.accent : (nextJewel?.base ?? colors.ink)}
            />
            <View style={styles.ringCenter}>
              {allDone ? (
                <Text style={styles.ringEmoji}>🎉</Text>
              ) : next && minsToNext > 0 ? (
                <>
                  <Text style={styles.ringNum}>{minsToNext >= 60 ? Math.round(minsToNext / 60) : minsToNext}</Text>
                  <Text style={styles.ringUnit}>{minsToNext >= 60 ? 'hr' : 'min'}</Text>
                </>
              ) : (
                <Text style={[styles.ringNum, { color: colors.accent, fontSize: 20 }]}>{next ? 'Now' : '—'}</Text>
              )}
            </View>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.leadLabel}>{allDone ? 'All done' : next ? (next.status === 'due' ? 'Right now' : 'Up next') : 'Today'}</Text>
            <Text style={styles.leadTitle} numberOfLines={3}>
              {allDone ? 'Everything’s ticked. Nice!' : next ? next.task.title : p.total ? 'That’s a wrap.' : 'A quiet day.'}
            </Text>
            {next && !allDone && (
              <View style={styles.leadMeta}>
                <View style={[styles.timePill, { backgroundColor: nextJewel?.tint ?? colors.bgRaised }]}>
                  <Text style={styles.timePillText}>{formatTime(next.task.time)}</Text>
                </View>
                {nextWho && <Text style={styles.feat}>{nextWho}</Text>}
              </View>
            )}
          </View>
        </Card>
      </FadeIn>

      {/* Rewards */}
      <FadeIn delay={280}>
        <View style={styles.stats}>
          <Stat emoji="⭐" value={String(p.done)} label={p.done === 1 ? 'star' : 'stars'} />
          <Stat emoji="🔥" value={String(myStreak)} label="day streak" />
          <Stat emoji="⏰" value={String(late.length)} label="late" alert={late.length > 0} />
        </View>
      </FadeIn>

      <FadeIn delay={360} style={{ marginTop: space.xl }}>
        <Segmented<Scope>
          value={scope}
          onChange={setScope}
          options={[
            { value: 'mine', label: 'Mine' },
            { value: 'family', label: 'Whole family' },
          ]}
        />
      </FadeIn>

      {groups.length === 0 ? (
        <Card style={{ marginTop: space.xl, alignItems: 'center', gap: space.md }}>
          <Text style={styles.quiet}>Nothing on today</Text>
          <Dim style={{ textAlign: 'center' }}>Enjoy the quiet, or plan a routine.</Dim>
          <InkButton label="Plan a routine" onPress={() => router.push('/routines')} />
        </Card>
      ) : (
        groups.map((g, i) => {
          const gp = progress(g.tasks, state.completions, today);
          return (
            <FadeIn key={g.routineId} delay={420 + i * 80}>
              <SectionHeader
                title={`${routine(g.routineId)?.name ?? 'Routine'}`}
                right={
                  <View style={styles.groupCount}>
                    <Text style={styles.groupCountText}>
                      {gp.done}/{gp.total}
                    </Text>
                  </View>
                }
              />
              <Timeline tasks={g.tasks} day={today} now={now} showMember={scope === 'family'} />
            </FadeIn>
          );
        })
      )}
      <GhostButton
        label="+ One-off task"
        onPress={() => router.push({ pathname: '/task', params: { oneOff: '1' } })}
        style={{ marginTop: space.lg }}
      />
      <Text style={styles.outro}>Tap to tick · press and hold to edit</Text>
    </Screen>
  );
}

function Stat({ emoji, value, label, alert }: { emoji: string; value: string; label: string; alert?: boolean }) {
  return (
    <View style={[styles.stat, alert && { backgroundColor: colors.accentSoft }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <View>
        <Text style={[styles.statValue, alert && { color: colors.accent }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  date: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.textDim, marginTop: space.xl },
  greeting: { fontFamily: fonts.display, fontSize: 30, lineHeight: 38, color: colors.text, marginTop: 2 },
  demo: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
    backgroundColor: colors.bgRaised,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  demoText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDim },
  lead: { marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg },
  ringWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringNum: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.text, ...lining },
  ringUnit: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDim, marginTop: -2 },
  ringEmoji: { fontSize: 34 },
  leadLabel: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.accent },
  leadTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.text },
  leadMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2, flexWrap: 'wrap' },
  timePill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  timePillText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, ...lining },
  feat: { fontFamily: fonts.medium, fontSize: 13, color: colors.textDim },
  stats: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
  },
  statEmoji: { fontSize: 20 },
  statValue: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.text, ...lining },
  statLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.textDim },
  groupCount: { backgroundColor: colors.bgRaised, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  groupCountText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textDim, ...lining },
  quiet: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  outro: { fontFamily: fonts.medium, textAlign: 'center', fontSize: 13, marginTop: space.lg, color: colors.textFaint },
});
