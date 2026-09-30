import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../../components/Avatar';
import { Timeline } from '../../components/Checklist';
import { DoubleRule, Fleuron, Rule } from '../../components/Rules';
import { Card, Dim, InkButton, Screen, SectionHeader, Segmented } from '../../components/ui';
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
import { colors, fonts, lining, space } from '../../theme';

type Scope = 'mine' | 'family';

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
/** Headlines spell small numbers out, as papers of the day did. */
const inWords = (n: number) => WORDS[n] ?? String(n);

function dayOfYear(d: Date) {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
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
  const household = progress(all, state.completions, today);

  // Group by routine so "School Morning" and "Wind Down" read as separate columns of the paper.
  const groups = useMemo(() => {
    const out: { routineId: string; tasks: Task[] }[] = [];
    for (const t of visible) {
      const g = out.find((x) => x.routineId === t.routineId);
      if (g) g.tasks.push(t);
      else out.push({ routineId: t.routineId, tasks: [t] });
    }
    return out;
  }, [visible]);

  const dateLine = now
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase();
  const edition = now.getHours() < 12 ? 'Morning Edition' : now.getHours() < 17 ? 'Afternoon Edition' : 'Evening Edition';
  const nextWho = next ? (next.task.memberId === FAMILY_ID ? 'The Whole Family' : member(next.task.memberId)?.name) : undefined;
  const allDone = p.total > 0 && p.done === p.total;

  return (
    <Screen>
      {/* Masthead */}
      <View style={styles.ears}>
        <View style={styles.ear}>
          <Text style={styles.earText}>{edition}</Text>
        </View>
        <Text style={styles.volume}>VOL. I · No. {dayOfYear(now)}</Text>
        <Pressable style={[styles.ear, { alignItems: 'flex-end' }]} onPress={() => router.push('/family')}>
          <Text style={styles.earText}>
            {household.done} of {household.total}
          </Text>
          <Text style={styles.earSub}>household tally</Text>
        </Pressable>
      </View>
      <Rule style={{ marginTop: space.sm }} />
      <Text style={styles.masthead} accessibilityRole="header">
        Akol
      </Text>
      <Text style={styles.motto}>“Every Task in Its Hour”</Text>
      <DoubleRule style={{ marginTop: space.sm }} />
      <View style={styles.dateBar}>
        <Text style={styles.dateText}>{dateLine}</Text>
        {state.settings.demoClock ? (
          <Pressable onPress={() => dispatch({ type: 'settings', patch: { demoClock: null } })} accessibilityRole="button">
            <Text style={[styles.dateText, styles.demo]}> DEMO CLOCK {formatTime(`${now.getHours()}:${now.getMinutes()}`).toUpperCase()} ✕ </Text>
          </Pressable>
        ) : (
          <Text style={styles.dateText}>{formatTime(`${now.getHours()}:${now.getMinutes()}`).toUpperCase()}</Text>
        )}
      </View>
      <DoubleRule inverted />

      {/* Lead story */}
      <View style={styles.lead}>
        <Text style={styles.kicker}>
          {greeting(now)}, {me?.name ?? 'Reader'}
        </Text>
        <Text style={styles.headline}>
          {allDone
            ? 'All Items Checked Off; Household Ready'
            : next
              ? next.task.title
              : p.total
                ? 'Nothing Further Scheduled Today'
                : 'A Quiet Day at Home'}
        </Text>
        <Rule weight={1} style={styles.shortRule} />
        <Text style={styles.deck}>
          {allDone
            ? 'Every item on the list is done. Well done, all.'
            : next
              ? `${next.status === 'due' ? 'Due now' : 'Next up'} at ${formatTime(next.task.time)}, ${relative(atTime(now, next.task.time), now)}${nextWho ? `; ${nextWho} to attend.` : '.'}`
              : p.total
                ? 'The day’s list has been read in full.'
                : 'No routines run today.'}
        </Text>
        <Rule weight={1} style={styles.shortRule} />
        <Text style={styles.subdeck}>
          {p.done === 0 ? 'None' : inWords(p.done)} of {inWords(p.total).toLowerCase()} complete
          {late.length ? ` · ${inWords(late.length)} item${late.length === 1 ? '' : 's'} late` : ''}
        </Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${p.total ? (p.done / p.total) * 100 : 0}%` }]} />
        </View>
      </View>

      {/* Who's who */}
      <SectionHeader title="The Household" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {state.members.map((m) => {
          const mp = progress(
            all.filter((t) => t.memberId === m.id),
            state.completions,
            today,
          );
          return (
            <Pressable key={m.id} style={styles.stripItem} onPress={() => router.push(`/member/${m.id}`)}>
              <Avatar member={m} size={54} ratio={mp.ratio} />
              <Text style={styles.stripName} numberOfLines={1}>
                {m.id === me?.id ? `${m.name} (you)` : m.name}
              </Text>
              <Text style={styles.stripCount}>{mp.total ? `${mp.done} of ${mp.total}` : '—'}</Text>
            </Pressable>
          );
        })}
        <Pressable style={styles.stripItem} onPress={() => router.push('/member-edit')}>
          <View style={styles.addMember}>
            <Ionicons name="add" size={22} color={colors.ink} />
          </View>
          <Text style={styles.stripName}>Add</Text>
        </Pressable>
      </ScrollView>

      <View style={{ marginTop: space.md }}>
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
          <Text style={styles.quiet}>☾</Text>
          <Dim style={{ textAlign: 'center', fontFamily: fonts.italic }}>Nothing scheduled today. Enjoy the calm, or plan something.</Dim>
          <InkButton label="Plan a routine" onPress={() => router.push('/routines')} />
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
      <Fleuron style={{ marginTop: space.xl }} />
      <Dim style={styles.tip}>Tap an item to tick it off · press and hold to edit</Dim>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ears: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  ear: { flex: 1 },
  earText: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.ink, ...lining },
  earSub: { fontFamily: fonts.italic, fontSize: 10, color: colors.textDim },
  volume: { fontFamily: fonts.displayMedium, fontSize: 10, letterSpacing: 1.2, color: colors.ink },
  masthead: {
    fontFamily: fonts.masthead,
    fontSize: 64,
    lineHeight: 76,
    color: colors.ink,
    textAlign: 'center',
    marginTop: space.sm,
  },
  motto: { fontFamily: fonts.displayItalic, fontSize: 13, color: colors.inkSoft, textAlign: 'center', marginTop: -4 },
  dateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    gap: space.sm,
    flexWrap: 'wrap',
  },
  dateText: { fontFamily: fonts.displayMedium, fontSize: 10.5, letterSpacing: 1.2, color: colors.ink, ...lining },
  demo: { backgroundColor: colors.ink, color: colors.bg, overflow: 'hidden' },
  lead: { alignItems: 'center', paddingTop: space.lg, paddingBottom: space.sm },
  kicker: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: colors.ink,
    textAlign: 'center',
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 40,
    textTransform: 'uppercase',
    color: colors.ink,
    textAlign: 'center',
    marginTop: space.sm,
    letterSpacing: 0.5,
  },
  shortRule: { width: 64, alignSelf: 'center', marginVertical: space.sm },
  deck: { fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 24, color: colors.ink, textAlign: 'center', ...lining },
  subdeck: {
    fontFamily: fonts.displayMedium,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.ink,
    textAlign: 'center',
  },
  bar: { height: 5, alignSelf: 'stretch', borderWidth: 1, borderColor: colors.ink, marginTop: space.md },
  barFill: { height: '100%', backgroundColor: colors.ink },
  strip: { gap: space.lg, paddingBottom: space.sm, paddingRight: space.lg },
  stripItem: { alignItems: 'center', width: 76, gap: 4 },
  stripName: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  stripCount: { fontFamily: fonts.italic, fontSize: 12, color: colors.textDim, ...lining },
  addMember: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCount: { fontFamily: fonts.italic, fontSize: 13, color: colors.textDim, ...lining },
  quiet: { fontFamily: fonts.display, fontSize: 34, color: colors.ink },
  tip: { textAlign: 'center', fontSize: 12, marginTop: space.sm, color: colors.textFaint, fontFamily: fonts.italic },
});
