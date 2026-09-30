import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../../components/Avatar';
import { Burst, Panel } from '../../components/Manga';
import { CheckpointCard } from '../../components/Checklist';
import { Card, Dim, Display, Eyebrow, GhostButton, Screen, SectionHeader } from '../../components/ui';
import { dayKey, formatTime, nextUp, overdue, progress, streak, tasksForDay } from '../../lib/schedule';
import { useAkol, useNow } from '../../lib/store';
import { colors, fonts, jewels, lining, space } from '../../theme';

const ROLE: Record<string, string> = { parent: 'Parent', child: 'Child', other: 'Family' };

export default function Family() {
  const { state, me } = useAkol();
  const now = useNow();
  const today = dayKey(now);
  const all = tasksForDay(state, now);
  const household = progress(all, state.completions, today);
  const checkpoints = all.filter((t) => t.checkpoint);

  return (
    <Screen>
      <Eyebrow>家族 · The household</Eyebrow>
      <Display style={{ marginTop: 6 }}>THE PARTY</Display>

      <View style={{ marginTop: space.xl }}>
        <Panel lines={{ x: 0.15, y: 0.5, clear: 0.18, count: 70 }} style={styles.summary}>
          <Burst size={112} spikes={18} seed={4}>
            <Text style={styles.pct}>{Math.round(household.ratio * 100)}%</Text>
            <Text style={styles.pctLabel}>SYNC</Text>
          </Burst>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>
              {household.total === 0
                ? 'Free day!'
                : household.done === household.total
                  ? 'Party ready!'
                  : `${household.total - household.done} quests left`}
            </Text>
            <Dim>
              {household.done} of {household.total} cleared across {state.members.length}{' '}
              {state.members.length === 1 ? 'member' : 'members'} today.
            </Dim>
          </View>
        </Panel>
      </View>

      <SectionHeader title="Members" />
      <View style={{ gap: space.md }}>
        {state.members.map((m) => {
          const theirs = all.filter((t) => t.memberId === m.id);
          const p = progress(theirs, state.completions, today);
          const nx = nextUp(theirs, state.completions, today, now);
          const late = overdue(theirs, state.completions, today, now).length;
          const st = streak(state, m.id, now);
          const j = jewels[m.color];
          return (
            <Card key={m.id} onPress={() => router.push(`/member/${m.id}`)} style={styles.memberCard}>
              <Avatar member={m} size={64} ratio={p.ratio} />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  {m.id === me?.id && <Text style={[styles.tag, { color: j.light, borderColor: j.base + '88' }]}>You</Text>}
                </View>
                <Text style={styles.sub}>
                  {ROLE[m.role]} · {p.total ? `${p.done}/${p.total} done` : 'Nothing today'}
                  {late ? <Text style={{ color: colors.danger }}> · {late} overdue</Text> : null}
                </Text>
                {nx && (
                  <Text style={styles.next} numberOfLines={1}>
                    Next: {nx.task.title} · {formatTime(nx.task.time)}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'center' }}>
                {st > 0 && (
                  <>
                    <Text style={styles.streak}>{st}</Text>
                    <Text style={styles.streakLabel}>day{st === 1 ? '' : 's'} ✦</Text>
                  </>
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </View>
            </Card>
          );
        })}
      </View>
      <GhostButton
        label="Add family member"
        icon={<Ionicons name="person-add-outline" size={16} color={colors.ink} />}
        onPress={() => router.push('/member-edit')}
        style={{ marginTop: space.lg }}
      />

      {checkpoints.length > 0 && (
        <>
          <SectionHeader title="Checkpoints today" />
          {checkpoints.map((t) => (
            <CheckpointCard key={t.id} task={t} day={today} now={now} />
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  summaryText: { flex: 1, gap: 4, backgroundColor: colors.bg, padding: space.sm },
  pct: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.ink, ...lining },
  pctLabel: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 2, color: colors.ink },
  summaryTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text, ...lining },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  memberName: { fontFamily: fonts.display, fontSize: 21, color: colors.text },
  tag: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  sub: { fontFamily: fonts.medium, fontSize: 13, color: colors.textDim },
  next: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint },
  streak: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, ...lining },
  streakLabel: { fontFamily: fonts.medium, fontSize: 9, color: colors.textDim, letterSpacing: 1, textTransform: 'uppercase' },
});
