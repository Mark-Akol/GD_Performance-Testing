import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../../components/Avatar';
import { Timeline } from '../../components/Checklist';
import { Burst, CaptionTab, Panel, SFX } from '../../components/Manga';
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
  streak,
  tasksForDay,
} from '../../lib/schedule';
import { useAkol, useNow } from '../../lib/store';
import type { Task } from '../../lib/types';
import { colors, fonts, lining, SLANT, space, stroke } from '../../theme';

type Scope = 'mine' | 'family';

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
  const allDone = p.total > 0 && p.done === p.total;

  const groups = useMemo(() => {
    const out: { routineId: string; tasks: Task[] }[] = [];
    for (const t of visible) {
      const g = out.find((x) => x.routineId === t.routineId);
      if (g) g.tasks.push(t);
      else out.push({ routineId: t.routineId, tasks: [t] });
    }
    return out;
  }, [visible]);

  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  const nextWho = next ? (next.task.memberId === FAMILY_ID ? 'EVERYONE' : member(next.task.memberId)?.name.toUpperCase()) : undefined;
  const minsLeft = next ? Math.round((atTime(now, next.task.time).getTime() - now.getTime()) / 60000) : 0;

  return (
    <Screen>
      {/* Title bar */}
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <View style={styles.logoRow}>
            <Text style={styles.logo}>AKOL</Text>
            <Text style={styles.logoKana}>アコル</Text>
          </View>
          <View style={styles.epRow}>
            <CaptionTab>EP.{dayOfYear(now)}</CaptionTab>
            <Text style={styles.date}>
              {weekday} {dd}.{mm}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Settings">
          <Avatar member={me} size={56} ratio={progress(mine, state.completions, today).ratio} />
        </Pressable>
      </View>
      {state.settings.demoClock && (
        <Pressable
          onPress={() => dispatch({ type: 'settings', patch: { demoClock: null } })}
          style={styles.demo}
          accessibilityRole="button"
        >
          <Text style={styles.demoText}>
            ▶ DEMO CLOCK {formatTime(`${now.getHours()}:${now.getMinutes()}`).toUpperCase()} · TAP FOR REAL TIME
          </Text>
        </Pressable>
      )}

      {/* Splash panel: the next mission */}
      <View style={{ marginTop: space.lg }}>
        <Panel lines={{ x: 0.85, y: 0.25, clear: 0.2, count: 80 }} style={{ padding: space.xl, minHeight: 240 }}>
          <View style={styles.heroWhite} />
          <View style={styles.heroTop}>
            <CaptionTab>{allDone ? 'Mission complete' : next?.status === 'due' ? 'Now!!' : 'Next mission'}</CaptionTab>
          </View>
          <Text style={styles.kicker}>
            {greeting(now).toUpperCase()}, {(me?.name ?? 'HERO').toUpperCase()}
          </Text>
          <Text style={styles.headline}>
            {allDone ? 'All quests cleared!' : next ? next.task.title : p.total ? 'Nothing left today' : 'A quiet day'}
          </Text>
          {next && !allDone && (
            <View style={styles.heroMeta}>
              <View style={styles.timeTag}>
                <Text style={styles.timeTagText}>{formatTime(next.task.time).toUpperCase().replace(/\./g, '')}</Text>
              </View>
              <Text style={styles.heroRel}>{relative(atTime(now, next.task.time), now).toUpperCase()}</Text>
              {nextWho && <Text style={styles.heroWho}>▸ {nextWho}</Text>}
            </View>
          )}
          {next && !allDone && minsLeft > 0 && (
            <Burst size={86} style={styles.heroBurst} seed={9}>
              <Text style={styles.burstNum}>{minsLeft}</Text>
              <Text style={styles.burstUnit}>MIN</Text>
            </Burst>
          )}
          <SFX text={allDone ? 'キラッ' : late.length ? 'ゴゴゴ' : 'ドン'} size={32} rotate={-14} style={styles.heroSfx} />
        </Panel>
      </View>

      {/* Stat panels */}
      <View style={styles.stats}>
        <StatPanel label="Cleared" value={`${p.done}/${p.total}`} tilt={-1.2} />
        <StatPanel label="Late" value={String(late.length)} tilt={1} tone={late.length ? 0.45 : undefined} />
        <StatPanel label="Sync" value={`${Math.round(p.ratio * 100)}%`} tilt={-0.6} />
      </View>

      {/* The party */}
      <SectionHeader title="The party" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.party}>
        {state.members.map((m, i) => {
          const mp = progress(
            all.filter((t) => t.memberId === m.id),
            state.completions,
            today,
          );
          const combo = streak(state, m.id, now);
          return (
            <Pressable key={m.id} onPress={() => router.push(`/member/${m.id}`)}>
              <Panel tilt={i % 2 ? 1.2 : -1.2} style={styles.charCard}>
                <View style={styles.charTone} />
                <Avatar member={m} size={58} ratio={mp.ratio} />
                <Text style={styles.charName} numberOfLines={1}>
                  {m.name.toUpperCase()}
                </Text>
                <Text style={styles.charRole}>{m.id === me?.id ? 'YOU' : m.role.toUpperCase()}</Text>
                <View style={styles.hpBar}>
                  <View style={[styles.hpFill, { width: `${mp.ratio * 100}%` }]} />
                </View>
                <Text style={styles.charStat}>
                  {mp.done}/{mp.total} {combo > 0 ? `· COMBO ×${combo}` : ''}
                </Text>
              </Panel>
            </Pressable>
          );
        })}
        <Pressable onPress={() => router.push('/member-edit')} style={styles.addCard}>
          <Text style={styles.addPlus}>+</Text>
          <Text style={styles.addText}>NEW{'\n'}MEMBER</Text>
        </Pressable>
      </ScrollView>

      <View style={{ marginTop: space.lg }}>
        <Segmented<Scope>
          value={scope}
          onChange={setScope}
          options={[
            { value: 'mine', label: 'My quests' },
            { value: 'family', label: 'Party quests' },
          ]}
        />
      </View>

      {groups.length === 0 ? (
        <Card style={{ marginTop: space.xl, alignItems: 'center', gap: space.md }}>
          <SFX text="シーン" size={36} rotate={0} />
          <Dim style={{ textAlign: 'center' }}>Nothing scheduled today. Enjoy the calm, or plan a routine.</Dim>
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

      <View style={styles.tbc}>
        <Text style={styles.tbcText}>To be continued</Text>
        <Text style={styles.tbcArrow}>⟶</Text>
      </View>
      <Dim style={styles.tip}>Tap a quest to clear it · press and hold to edit</Dim>
    </Screen>
  );
}

function StatPanel({ label, value, tilt, tone }: { label: string; value: string; tilt: number; tone?: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Panel tilt={tilt} tone={tone} style={styles.statPanel}>
        <View style={styles.statInner}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  logoRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  logo: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: colors.ink, letterSpacing: 1 },
  logoKana: { fontFamily: fonts.display, fontSize: 13, color: colors.ink, marginBottom: 8 },
  epRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 4 },
  date: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 2, color: colors.ink },
  demo: {
    alignSelf: 'flex-start',
    marginTop: space.md,
    borderWidth: stroke.line,
    borderColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ skewX: SLANT }],
  },
  demoText: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 1, color: colors.ink },
  heroWhite: {
    position: 'absolute',
    left: -60,
    top: -10,
    width: '82%',
    bottom: -10,
    backgroundColor: colors.bg,
    transform: [{ skewX: '-8deg' }],
  },
  heroTop: { flexDirection: 'row' },
  kicker: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 2.4, color: colors.ink, marginTop: space.md },
  headline: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 44,
    color: colors.ink,
    textTransform: 'uppercase',
    marginTop: space.xs,
    maxWidth: '78%',
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md, flexWrap: 'wrap' },
  timeTag: { backgroundColor: colors.ink, paddingHorizontal: 8, paddingVertical: 3, transform: [{ skewX: SLANT }] },
  timeTagText: { fontFamily: fonts.display, fontSize: 13, color: colors.bg, ...lining },
  heroRel: { fontFamily: fonts.displayItalic, fontSize: 14, letterSpacing: 1, color: colors.ink },
  heroWho: { fontFamily: fonts.display, fontSize: 12, letterSpacing: 1, color: colors.ink, backgroundColor: colors.bg, paddingHorizontal: 4 },
  heroBurst: { position: 'absolute', right: 10, top: 14 },
  burstNum: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.ink, ...lining },
  burstUnit: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.5, color: colors.ink, marginTop: -3 },
  heroSfx: { position: 'absolute', right: 2, top: 108 },
  stats: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  statPanel: { padding: 0, paddingVertical: space.md },
  statInner: { alignItems: 'center', backgroundColor: colors.bg, alignSelf: 'center', paddingHorizontal: 6 },
  statValue: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.ink, ...lining },
  statLabel: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2, color: colors.ink, textTransform: 'uppercase' },
  party: { gap: space.lg, paddingVertical: space.xs, paddingRight: space.lg, paddingLeft: 2 },
  charCard: { width: 128, alignItems: 'center', gap: 4, paddingVertical: space.md, paddingHorizontal: space.sm },
  charTone: { position: 'absolute', left: 0, right: 0, top: 0, height: 38, backgroundColor: colors.bg },
  charName: { fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginTop: 4 },
  charRole: { fontFamily: fonts.semibold, fontSize: 9.5, letterSpacing: 2, color: colors.textDim },
  hpBar: { alignSelf: 'stretch', height: 8, borderWidth: stroke.line, borderColor: colors.ink, marginTop: 4 },
  hpFill: { height: '100%', backgroundColor: colors.ink },
  charStat: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1, color: colors.ink, ...lining },
  addCard: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: stroke.line,
    borderStyle: 'dashed',
    borderColor: colors.ink,
    marginVertical: 6,
  },
  addPlus: { fontFamily: fonts.display, fontSize: 32, color: colors.ink },
  addText: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.5, color: colors.ink, textAlign: 'center' },
  groupCount: { fontFamily: fonts.display, fontSize: 14, color: colors.ink, ...lining },
  tbc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'flex-end',
    marginTop: space.xxl,
    backgroundColor: colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 6,
    transform: [{ skewX: SLANT }],
  },
  tbcText: { fontFamily: fonts.displayItalic, fontSize: 14, letterSpacing: 1, color: colors.bg, textTransform: 'uppercase' },
  tbcArrow: { fontFamily: fonts.display, fontSize: 18, color: colors.bg },
  tip: { textAlign: 'center', fontSize: 12, marginTop: space.lg, color: colors.textFaint },
});
