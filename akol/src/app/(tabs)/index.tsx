import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar, jewelFor } from '../../components/Avatar';
import { KenteBand } from '../../components/Kente';
import { Timeline } from '../../components/Checklist';
import { Card, Dim, Display, Eyebrow, GoldButton, Screen, SectionHeader, Segmented } from '../../components/ui';
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
import { colors, fonts, gradients, lining, radius, space } from '../../theme';

type Scope = 'mine' | 'family';

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

  // Group by routine so "School Morning" and "Wind Down" read as distinct chapters.
  const groups = useMemo(() => {
    const out: { routineId: string; tasks: Task[] }[] = [];
    for (const t of visible) {
      const g = out.find((x) => x.routineId === t.routineId);
      if (g) g.tasks.push(t);
      else out.push({ routineId: t.routineId, tasks: [t] });
    }
    return out;
  }, [visible]);

  const dateLine = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Eyebrow>{dateLine}</Eyebrow>
          {state.settings.demoClock && (
            <Pressable
              onPress={() => dispatch({ type: 'settings', patch: { demoClock: null } })}
              style={styles.demo}
              accessibilityRole="button"
            >
              <Ionicons name="time-outline" size={12} color={colors.gold} />
              <Text style={styles.demoText}>
                Demo clock {formatTime(`${now.getHours()}:${now.getMinutes()}`)} · tap for real time
              </Text>
            </Pressable>
          )}
          <Display style={{ marginTop: 6 }}>
            {greeting(now)},{'\n'}
            <Text style={styles.name}>{me?.name ?? 'there'}</Text>
          </Display>
        </View>
        <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Settings">
          <Avatar member={me} size={58} ratio={progress(mine, state.completions, today).ratio} />
        </Pressable>
      </View>

      {/* Family medallions */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {state.members.map((m) => {
          const mp = progress(
            all.filter((t) => t.memberId === m.id),
            state.completions,
            today,
          );
          return (
            <Pressable key={m.id} style={styles.stripItem} onPress={() => router.push(`/member/${m.id}`)}>
              <Avatar member={m} size={52} ratio={mp.ratio} />
              <Text style={styles.stripName} numberOfLines={1}>
                {m.id === me?.id ? 'You' : m.name}
              </Text>
              <Text style={styles.stripCount}>{mp.total ? `${mp.done}/${mp.total}` : '—'}</Text>
            </Pressable>
          );
        })}
        <Pressable style={styles.stripItem} onPress={() => router.push('/member-edit')}>
          <View style={styles.addMember}>
            <Ionicons name="add" size={22} color={colors.gold} />
          </View>
          <Text style={styles.stripName}>Add</Text>
        </Pressable>
      </ScrollView>

      <HeroCard
        next={next}
        memberName={next ? (next.task.memberId === FAMILY_ID ? 'Everyone' : member(next.task.memberId)?.name) : undefined}
        now={now}
        done={p.done}
        total={p.total}
        lateCount={late.length}
      />

      <View style={{ marginTop: space.xl }}>
        <Segmented<Scope>
          value={scope}
          onChange={setScope}
          options={[
            { value: 'mine', label: 'My checklist' },
            { value: 'family', label: 'Whole family' },
          ]}
        />
      </View>

      {groups.length === 0 ? (
        <Card style={{ marginTop: space.xl, alignItems: 'center', gap: space.md }}>
          <Text style={{ fontSize: 34 }}>🌙</Text>
          <Dim style={{ textAlign: 'center' }}>Nothing scheduled today. Enjoy the calm — or plan something.</Dim>
          <GoldButton label="Plan a routine" onPress={() => router.push('/routines')} />
        </Card>
      ) : (
        groups.map((g) => {
          const gp = progress(g.tasks, state.completions, today);
          return (
            <View key={g.routineId}>
              <SectionHeader
                title={routine(g.routineId)?.name ?? 'Routine'}
                right={<Text style={styles.groupCount}>{gp.done} of {gp.total}</Text>}
              />
              <Timeline tasks={g.tasks} day={today} now={now} showMember={scope === 'family'} />
            </View>
          );
        })
      )}
      <Dim style={styles.tip}>Tap to tick off · long-press to edit</Dim>
    </Screen>
  );
}

function HeroCard({
  next,
  memberName,
  now,
  done,
  total,
  lateCount,
}: {
  next: ReturnType<typeof nextUp>;
  memberName?: string;
  now: Date;
  done: number;
  total: number;
  lateCount: number;
}) {
  const { member } = useAkol();
  const allDone = total > 0 && done === total;
  const j = next ? jewelFor(member(next.task.memberId), next.task.memberId) : null;

  return (
    <View style={styles.heroWrap}>
      <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBorder}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroInner}>
          <KenteBand height={8} repeats={5} />
          <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Eyebrow>{allDone ? 'All complete' : next ? (next.status === 'due' ? 'Due now' : 'Next up') : 'Today'}</Eyebrow>
            <Text style={styles.heroProgress}>
              {done}/{total}
            </Text>
          </View>
          {allDone ? (
            <>
              <Text style={styles.heroTitle}>Beautifully done.</Text>
              <Dim>Every item is checked off. ✨</Dim>
            </>
          ) : next ? (
            <>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {next.task.title}
              </Text>
              <View style={styles.heroMeta}>
                {memberName && (
                  <View style={[styles.pill, { borderColor: (j?.base ?? colors.gold) + '88' }]}>
                    <Text style={[styles.pillText, { color: j?.light ?? colors.gold }]}>{memberName}</Text>
                  </View>
                )}
                <Text style={styles.heroTime}>{formatTime(next.task.time)}</Text>
                <Text style={styles.heroRel}>· {relative(atTime(now, next.task.time), now)}</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.heroTitle}>{total ? "That's the day." : 'A quiet day.'}</Text>
              <Dim>{total ? 'Nothing else is scheduled.' : 'No routines run today.'}</Dim>
            </>
          )}
          <View style={styles.bar}>
            <LinearGradient
              colors={gradients.gold}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${total ? (done / total) * 100 : 0}%` }]}
            />
          </View>
          {lateCount > 0 && (
            <Text style={styles.late}>
              {lateCount} item{lateCount === 1 ? '' : 's'} overdue
            </Text>
          )}
          </View>
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  name: { fontFamily: fonts.displayItalic, color: colors.gold },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: space.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    backgroundColor: 'rgba(242,182,50,0.08)',
  },
  demoText: { fontFamily: fonts.medium, fontSize: 11, color: colors.goldPale },
  strip: { gap: space.lg, paddingVertical: space.lg, paddingRight: space.lg },
  stripItem: { alignItems: 'center', width: 60, gap: 4 },
  stripName: { fontFamily: fonts.medium, fontSize: 12, color: colors.ivory },
  stripCount: { fontFamily: fonts.body, fontSize: 11, color: colors.textFaint },
  addMember: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWrap: {
    borderRadius: radius.lg + 1,
    shadowColor: colors.gold,
    shadowOpacity: 0.28,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  heroBorder: { borderRadius: radius.lg + 1, padding: 1 },
  heroInner: { borderRadius: radius.lg, overflow: 'hidden' },
  hero: { padding: space.xl, gap: space.sm },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroProgress: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.textDim, ...lining },
  heroTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.ivory, marginTop: 4 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  heroTime: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.gold, ...lining },
  heroRel: { fontFamily: fonts.medium, fontSize: 14, color: colors.textDim },
  pill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontFamily: fonts.semibold, fontSize: 12 },
  bar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: space.md, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
  late: { fontFamily: fonts.semibold, fontSize: 12, color: colors.danger, marginTop: 2 },
  groupCount: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDim },
  tip: { textAlign: 'center', fontSize: 12, marginTop: space.xl, color: colors.textFaint },
});
