import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../../components/Avatar';
import { BackBar } from '../../components/BackBar';
import { Timeline } from '../../components/Checklist';
import { Card, Dim, Display, Eyebrow, GhostButton, Screen, SectionHeader } from '../../components/ui';
import { dayKey, progress, streak, tasksForDay } from '../../lib/schedule';
import { useAkol, useNow } from '../../lib/store';
import { colors, fonts, jewels, lining, space } from '../../theme';

export default function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, member, me, dispatch } = useAkol();
  const now = useNow();
  const m = member(id);
  const today = dayKey(now);

  if (!m) {
    return (
      <Screen>
        <BackBar fallback="/family" />
        <Dim>This family member no longer exists.</Dim>
      </Screen>
    );
  }

  const tasks = tasksForDay(state, now, m.id);
  const own = tasks.filter((t) => t.memberId === m.id);
  const p = progress(own, state.completions, today);
  const st = streak(state, m.id, now);
  const j = jewels[m.color];
  const firstRoutine = state.routines[0];

  return (
    <Screen>
      <BackBar
        fallback="/family"
        right={
          <Pressable onPress={() => router.push({ pathname: '/member-edit', params: { id: m.id } })} hitSlop={12}>
            <Text style={styles.edit}>Edit</Text>
          </Pressable>
        }
      />
      <View style={styles.hero}>
        <Avatar member={m} size={112} ratio={p.ratio} />
        <Display style={{ marginTop: space.lg }}>{m.name}</Display>
        <Eyebrow style={{ color: j.light, marginTop: 4 }}>{m.id === me?.id ? 'You · ' : ''}{m.role}</Eyebrow>
      </View>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={styles.statNum}>{p.done}/{p.total}</Text>
          <Dim style={styles.statLabel}>today</Dim>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statNum}>{Math.round(p.ratio * 100)}%</Text>
          <Dim style={styles.statLabel}>complete</Dim>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statNum}>{st}</Text>
          <Dim style={styles.statLabel}>day streak</Dim>
        </Card>
      </View>

      {m.id !== state.settings.meId && (
        <GhostButton
          label={`Use Akol as ${m.name} on this device`}
          tone="plain"
          onPress={() => dispatch({ type: 'settings', patch: { meId: m.id } })}
          style={{ marginTop: space.lg }}
        />
      )}

      <SectionHeader
        title={`${m.name}'s checklist`}
        right={
          firstRoutine && (
            <Pressable
              hitSlop={10}
              onPress={() => router.push({ pathname: '/task', params: { memberId: m.id, routineId: firstRoutine.id } })}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.gold} />
            </Pressable>
          )
        }
      />
      {tasks.length ? (
        <Timeline tasks={tasks} day={today} now={now} />
      ) : (
        <Card>
          <Dim>Nothing scheduled for {m.name} today. Add a task to one of your routines.</Dim>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: space.sm },
  edit: { fontFamily: fonts.semibold, color: colors.gold, fontSize: 15 },
  stats: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  stat: { flex: 1, alignItems: 'center', paddingVertical: space.lg },
  statNum: { fontFamily: fonts.display, fontSize: 24, color: colors.gold, ...lining },
  statLabel: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
});
