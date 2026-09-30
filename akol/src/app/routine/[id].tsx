import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, jewelFor } from '../../components/Avatar';
import { BackBar, goBack } from '../../components/BackBar';
import {
  Card,
  Chip,
  Dim,
  Eyebrow,
  Field,
  GhostButton,
  GoldButton,
  Screen,
  SectionHeader,
  ToggleRow,
  confirm,
} from '../../components/ui';
import { FAMILY_ID, WEEKDAY_SHORT, formatTime, sortByTime } from '../../lib/schedule';
import { useAkol } from '../../lib/store';
import type { Weekday } from '../../lib/types';
import { colors, fonts, lining, radius, space } from '../../theme';

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export default function RoutineEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, routine, member, dispatch } = useAkol();
  const r = routine(id);
  const [name, setName] = useState(r?.name ?? '');

  useEffect(() => setName(r?.name ?? ''), [r?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!r) {
    return (
      <Screen>
        <BackBar fallback="/routines" />
        <Dim>This routine was removed.</Dim>
      </Screen>
    );
  }

  const tasks = sortByTime(state.tasks.filter((t) => t.routineId === r.id));
  const save = (patch: Partial<typeof r>) => dispatch({ type: 'upsertRoutine', routine: { ...r, ...patch } });
  const toggleDay = (d: Weekday) =>
    save({ days: r.days.includes(d) ? r.days.filter((x) => x !== d) : [...r.days, d] });

  return (
    <Screen>
      <BackBar fallback="/routines" />
      <Eyebrow>Routine</Eyebrow>
      <View style={{ marginTop: space.md }}>
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          onBlur={() => save({ name: name.trim() || 'Routine' })}
          onSubmitEditing={() => save({ name: name.trim() || 'Routine' })}
          placeholder="School Morning"
          style={styles.nameInput}
          returnKeyType="done"
        />
      </View>

      <SectionHeader title="Runs on" />
      <View style={styles.days}>
        {WEEK.map((d) => (
          <Chip key={d} label={WEEKDAY_SHORT[d]} active={r.days.includes(d)} onPress={() => toggleDay(d)} />
        ))}
      </View>
      <View style={[styles.days, { marginTop: space.sm }]}>
        <Chip label="Weekdays" onPress={() => save({ days: [1, 2, 3, 4, 5] })} />
        <Chip label="Weekends" onPress={() => save({ days: [0, 6] })} />
        <Chip label="Every day" onPress={() => save({ days: [0, 1, 2, 3, 4, 5, 6] })} />
      </View>
      <ToggleRow label="Active" hint="Paused routines don't appear or remind." value={r.enabled} onChange={(enabled) => save({ enabled })} />

      <SectionHeader
        title={`Timeline · ${tasks.length}`}
        right={
          <Pressable hitSlop={10} onPress={() => router.push({ pathname: '/task', params: { routineId: r.id } })}>
            <Ionicons name="add-circle-outline" size={24} color={colors.gold} />
          </Pressable>
        }
      />
      <Card style={{ padding: 0 }}>
        {tasks.length === 0 && <Dim style={{ padding: space.lg }}>No items yet.</Dim>}
        {tasks.map((t, i) => {
          const m = member(t.memberId);
          const j = jewelFor(m, t.memberId);
          return (
            <Pressable
              key={t.id}
              onPress={() => router.push({ pathname: '/task', params: { id: t.id } })}
              style={({ pressed }) => [styles.item, i > 0 && styles.itemBorder, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.time}>{formatTime(t.time)}</Text>
              {t.checkpoint ? (
                <View style={styles.cpBadge}>
                  <Ionicons name="flag" size={14} color={colors.bg} />
                </View>
              ) : (
                <Avatar member={m} memberId={t.memberId} size={28} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, t.checkpoint && { color: colors.gold }]} numberOfLines={1}>
                  {t.title}
                </Text>
                <Text style={[styles.who, { color: j.light }]}>
                  {t.checkpoint ? 'Checkpoint · everyone' : t.memberId === FAMILY_ID ? 'Family' : (m?.name ?? '—')}
                  {t.remind === false ? '  ·  🔕' : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          );
        })}
      </Card>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        <GoldButton
          label="Add an item"
          icon={<Ionicons name="add" size={18} color={colors.bg} />}
          onPress={() => router.push({ pathname: '/task', params: { routineId: r.id } })}
        />
        <GhostButton
          label="Add a checkpoint"
          icon={<Ionicons name="flag-outline" size={16} color={colors.gold} />}
          onPress={() => router.push({ pathname: '/task', params: { routineId: r.id, checkpoint: '1' } })}
        />
        <GhostButton
          label="Delete routine"
          tone="danger"
          onPress={() =>
            confirm(`Delete “${r.name}”?`, `This removes the routine and its ${tasks.length} items.`, 'Delete', () => {
              goBack('/routines');
              dispatch({ type: 'removeRoutine', id: r.id });
            })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nameInput: { fontFamily: fonts.display, fontSize: 24 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14, paddingHorizontal: space.lg },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  time: { width: 66, fontFamily: fonts.displayMedium, fontSize: 15, color: colors.ivory, ...lining },
  title: { fontFamily: fonts.medium, fontSize: 15, color: colors.ivory },
  who: { fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
  cpBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
