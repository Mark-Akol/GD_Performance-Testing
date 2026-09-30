import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../../components/Avatar';
import { Card, Dim, Display, Eyebrow, InkButton, InkSwitch, Screen, SectionHeader } from '../../components/ui';
import { describeDays, formatTime, sortByTime } from '../../lib/schedule';
import { uid } from '../../lib/seed';
import { useAkol } from '../../lib/store';
import { colors, fonts, space } from '../../theme';

export default function Routines() {
  const { state, dispatch, member } = useAkol();

  const create = () => {
    const id = uid('r_');
    dispatch({ type: 'upsertRoutine', routine: { id, name: 'New routine', days: [1, 2, 3, 4, 5], enabled: true } });
    router.push(`/routine/${id}`);
  };

  return (
    <Screen>
      <Eyebrow>Rhythms of the day</Eyebrow>
      <Display style={{ marginTop: 6 }}>Routines</Display>
      <Dim style={{ marginTop: space.sm }}>
        Each routine is a timed sequence of reminders. Add a checkpoint — like “Go time” — to ask the family if
        everything is done.
      </Dim>

      <SectionHeader title={`${state.routines.length} routine${state.routines.length === 1 ? '' : 's'}`} />
      <View style={{ gap: space.md }}>
        {state.routines.map((r) => {
          const tasks = sortByTime(state.tasks.filter((t) => t.routineId === r.id));
          const people = [...new Set(tasks.map((t) => t.memberId))];
          const first = tasks[0];
          const last = tasks[tasks.length - 1];
          return (
            <Card key={r.id} onPress={() => router.push(`/routine/${r.id}`)} style={{ opacity: r.enabled ? 1 : 0.55 }}>
              <View style={styles.top}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.name}</Text>
                  <Text style={styles.days}>{describeDays(r.enabled ? r.days : [])}</Text>
                </View>
                <InkSwitch
                  value={r.enabled}
                  onValueChange={(enabled) => dispatch({ type: 'upsertRoutine', routine: { ...r, enabled } })}
                />
              </View>
              <View style={styles.bottom}>
                <View style={styles.avatars}>
                  {people.map((id, i) => (
                    <View key={id} style={{ marginLeft: i ? -10 : 0 }}>
                      <Avatar member={member(id)} memberId={id} size={30} />
                    </View>
                  ))}
                </View>
                <Text style={styles.span}>
                  {tasks.length} item{tasks.length === 1 ? '' : 's'}
                  {first && last ? ` · ${formatTime(first.time)} – ${formatTime(last.time)}` : ''}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </View>
              {tasks.some((t) => t.checkpoint) && (
                <Text style={styles.cp}>
                  ✦ {tasks.filter((t) => t.checkpoint).map((t) => `${t.title} ${formatTime(t.time)}`).join(' · ')}
                </Text>
              )}
              {people.length === 0 && <Dim style={{ marginTop: space.sm, fontSize: 13 }}>No items yet — tap to add.</Dim>}
            </Card>
          );
        })}
      </View>

      <InkButton
        label="Create a routine"
        icon={<Ionicons name="add" size={18} color={colors.bg} />}
        onPress={create}
        style={{ marginTop: space.xl }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  days: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.ink, marginTop: 4 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg },
  avatars: { flexDirection: 'row' },
  span: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.textDim },
  cp: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft, marginTop: space.md },
});
