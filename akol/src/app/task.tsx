import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { BackBar, goBack } from '../components/BackBar';
import { TimePicker } from '../components/TimePicker';
import {
  Chip,
  Dim,
  Display,
  Eyebrow,
  Field,
  GhostButton,
  InkButton,
  Screen,
  SectionHeader,
  ToggleRow,
  confirm,
  tap,
} from '../components/ui';
import {
  FAMILY_ID,
  ONE_OFF_ROUTINE_ID,
  addDays,
  dayKey,
  describeDays,
  parseTime,
  sortByTime,
  toClockTime,
} from '../lib/schedule';
import { uid } from '../lib/seed';
import { useAkol, useNow } from '../lib/store';
import type { DayKey, Task } from '../lib/types';
import { colors, familyJewel, fonts, jewels, radius, space } from '../theme';

const SUGGESTIONS = ['Brush teeth', 'Pack lunch', 'Get dressed', 'Bags in the car', 'Homework check', 'Water bottle', 'Medication', 'Feed the pet'];
const ONE_OFF_SUGGESTIONS = ['Dentist', 'Haircut', 'Pick up parcel', 'Swimming kit', 'School trip money', 'Birthday present', 'Parents’ evening'];

type AlertChoice = 'off' | 'notify' | 'alarm';

function fromKey(k: DayKey) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function TaskEditor() {
  const params = useLocalSearchParams<{ id?: string; routineId?: string; memberId?: string; checkpoint?: string; oneOff?: string }>();
  const { state, dispatch, me } = useAkol();
  const now = useNow();
  const today = dayKey(now);
  const existing = params.id ? state.tasks.find((t) => t.id === params.id) : undefined;
  const routines = state.routines.filter((r) => r.id !== ONE_OFF_ROUTINE_ID);

  const [draft, setDraft] = useState<Task>(() => {
    if (existing) return existing;
    const oneOff = params.oneOff === '1' || routines.length === 0;
    const routineId = oneOff ? ONE_OFF_ROUTINE_ID : (params.routineId ?? routines[0]?.id ?? '');
    const siblings = sortByTime(state.tasks.filter((t) => t.routineId === routineId && !t.checkpoint));
    const last = siblings[siblings.length - 1];
    const checkpoint = params.checkpoint === '1';
    // A one-off defaults to the next round half-hour today.
    const soon = toClockTime(Math.ceil((now.getHours() * 60 + now.getMinutes() + 15) / 30) * 30);
    return {
      id: uid('t_'),
      routineId,
      memberId: checkpoint ? FAMILY_ID : (params.memberId ?? me?.id ?? FAMILY_ID),
      title: checkpoint ? 'Go time' : '',
      time: oneOff ? soon : last ? toClockTime(parseTime(last.time) + 5) : '07:00',
      checkpoint,
      remind: true,
      alert: 'notify',
      date: oneOff ? today : undefined,
      note: checkpoint ? 'Have you completed the checklist?' : undefined,
    };
  });

  const set = (patch: Partial<Task>) => setDraft((d) => ({ ...d, ...patch }));
  const once = !!draft.date;
  const canSave = draft.title.trim().length > 0 && !!draft.routineId;
  const alertChoice: AlertChoice = draft.remind === false ? 'off' : draft.alert === 'alarm' ? 'alarm' : 'notify';

  const setOnce = (v: boolean) => {
    if (v) set({ date: draft.date ?? today, routineId: ONE_OFF_ROUTINE_ID, checkpoint: false });
    else set({ date: undefined, routineId: routines[0]?.id ?? '' });
  };

  const save = () => {
    // One-offs live in a hidden routine that runs every day; create it the first time.
    if (draft.routineId === ONE_OFF_ROUTINE_ID && !state.routines.some((r) => r.id === ONE_OFF_ROUTINE_ID)) {
      dispatch({
        type: 'upsertRoutine',
        routine: { id: ONE_OFF_ROUTINE_ID, name: 'One-offs', days: [0, 1, 2, 3, 4, 5, 6], enabled: true },
      });
    }
    dispatch({
      type: 'upsertTask',
      task: { ...draft, title: draft.title.trim(), note: draft.note?.trim() || undefined },
    });
    goBack();
  };

  const dateLabel = (k: DayKey) =>
    k === today
      ? 'Today'
      : k === dayKey(addDays(now, 1))
        ? 'Tomorrow'
        : fromKey(k).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  const kind = draft.checkpoint ? 'checkpoint' : once ? 'one-off task' : 'task';

  return (
    <Screen>
      <BackBar icon="close" />
      <Eyebrow>
        {existing ? 'Edit' : 'New'} {kind}
      </Eyebrow>
      <Display style={{ marginTop: 6, marginBottom: space.lg }}>
        {draft.title.trim() || (draft.checkpoint ? 'Checkpoint' : 'What needs doing?')}
      </Display>

      <Field
        label="What"
        value={draft.title}
        onChangeText={(title) => set({ title })}
        placeholder={draft.checkpoint ? 'Go time' : once ? 'Dentist' : 'Brush teeth'}
        autoFocus={!existing}
        returnKeyType="done"
      />
      {!draft.checkpoint && !existing && (
        <View style={[styles.wrap, { marginTop: space.md }]}>
          {(once ? ONE_OFF_SUGGESTIONS : SUGGESTIONS).map((s) => (
            <Chip key={s} label={s} active={draft.title === s} onPress={() => set({ title: s })} />
          ))}
        </View>
      )}

      {/* When: repeating, or just once */}
      {!draft.checkpoint && (
        <>
          <SectionHeader title="When" />
          <View style={styles.choiceRow}>
            <Choice
              active={!once}
              title="Every time"
              sub={routines.length ? 'part of a routine' : 'create a routine first'}
              onPress={() => routines.length && setOnce(false)}
            />
            <Choice active={once} title="Just once" sub="a single date" onPress={() => setOnce(true)} />
          </View>

          {once ? (
            <View style={{ marginTop: space.md, gap: space.md }}>
              <View style={styles.wrap}>
                <Chip label="Today" active={draft.date === today} onPress={() => set({ date: today })} />
                <Chip
                  label="Tomorrow"
                  active={draft.date === dayKey(addDays(now, 1))}
                  onPress={() => set({ date: dayKey(addDays(now, 1)) })}
                />
              </View>
              <View style={styles.dateStepper}>
                <Pressable
                  hitSlop={10}
                  accessibilityLabel="Previous day"
                  onPress={() => {
                    tap();
                    const prev = dayKey(addDays(fromKey(draft.date!), -1));
                    if (prev >= today) set({ date: prev });
                  }}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.ink} />
                </Pressable>
                <Text style={styles.dateText}>{dateLabel(draft.date!)}</Text>
                <Pressable
                  hitSlop={10}
                  accessibilityLabel="Next day"
                  onPress={() => {
                    tap();
                    set({ date: dayKey(addDays(fromKey(draft.date!), 1)) });
                  }}
                >
                  <Ionicons name="chevron-forward" size={22} color={colors.ink} />
                </Pressable>
              </View>
            </View>
          ) : (
            routines.length > 0 && (
              <View style={[styles.wrap, { marginTop: space.md }]}>
                {routines.map((r) => (
                  <Chip
                    key={r.id}
                    label={`${r.name} · ${describeDays(r.days)}`}
                    active={draft.routineId === r.id}
                    onPress={() => set({ routineId: r.id })}
                  />
                ))}
              </View>
            )
          )}
        </>
      )}

      <SectionHeader title="At" />
      <TimePicker value={draft.time} onChange={(time) => set({ time })} />
      <Dim style={styles.hint}>Tap arrows for 5-minute steps · long-press for 1 minute</Dim>

      {!draft.checkpoint && (
        <>
          <SectionHeader title="Who" />
          <View style={styles.wrap}>
            {state.members.map((m) => (
              <Chip
                key={m.id}
                label={m.name}
                color={jewels[m.color].base}
                active={draft.memberId === m.id}
                onPress={() => set({ memberId: m.id })}
                left={<Avatar member={m} size={20} />}
              />
            ))}
            <Chip
              label="Whole family"
              color={familyJewel.base}
              active={draft.memberId === FAMILY_ID}
              onPress={() => set({ memberId: FAMILY_ID })}
              left={<Avatar memberId={FAMILY_ID} size={20} />}
            />
          </View>
        </>
      )}

      {/* How to remind */}
      <SectionHeader title="How should it remind you?" />
      <View style={styles.choiceRow}>
        <Choice active={alertChoice === 'off'} title="No reminder" sub="just on the list" onPress={() => set({ remind: false })} />
        <Choice
          active={alertChoice === 'notify'}
          title="Notification"
          sub="a ping on time"
          onPress={() => set({ remind: true, alert: 'notify' })}
        />
        <Choice
          active={alertChoice === 'alarm'}
          loud
          title="Alarm"
          sub="rings until done"
          onPress={() => set({ remind: true, alert: 'alarm' })}
        />
      </View>
      {alertChoice === 'alarm' && (
        <Dim style={styles.alarmHint}>
          Rings louder and breaks through Focus and Do Not Disturb. If it isn’t ticked, it rings again every 3 minutes (3
          times) with a voice: “Hey, it’s time to go!” Record your own in Settings → Voice alarms.
        </Dim>
      )}

      <SectionHeader title="Details" />
      <Field
        label={draft.checkpoint ? 'Question to ask' : 'Note (optional)'}
        value={draft.note ?? ''}
        onChangeText={(note) => set({ note })}
        placeholder={draft.checkpoint ? 'Have you completed the checklist?' : once ? 'Bring the appointment card' : 'Water bottle too'}
      />
      {!once && (
        <View style={{ marginTop: space.sm }}>
          <ToggleRow
            label="Checkpoint"
            hint="Summarises everything due before it, for the whole family."
            value={!!draft.checkpoint}
            onChange={(checkpoint) => set({ checkpoint, memberId: checkpoint ? FAMILY_ID : (me?.id ?? draft.memberId) })}
          />
        </View>
      )}

      <View style={{ gap: space.md, marginTop: space.xl }}>
        <InkButton
          label={existing ? 'Save changes' : once ? `Add for ${dateLabel(draft.date!).toLowerCase()}` : 'Add to routine'}
          onPress={save}
          disabled={!canSave}
        />
        {existing && (
          <GhostButton
            label="Delete"
            tone="danger"
            onPress={() =>
              confirm(
                `Delete “${existing.title}”?`,
                existing.date ? 'This one-off task will be removed.' : 'It will be removed from every day this routine runs.',
                'Delete',
                () => {
                  dispatch({ type: 'removeTask', id: existing.id });
                  goBack();
                },
              )
            }
          />
        )}
      </View>
    </Screen>
  );
}

function Choice({
  active,
  title,
  sub,
  onPress,
  loud,
}: {
  active: boolean;
  title: string;
  sub: string;
  onPress: () => void;
  loud?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.choice, active && styles.choiceActive, active && loud && { backgroundColor: colors.accent, borderColor: colors.accent }]}
    >
      <Text style={[styles.choiceTitle, active && { color: colors.onPaper }]}>{title}</Text>
      <Text style={[styles.choiceSub, active && { color: colors.onPaper }]}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hint: { textAlign: 'center', fontSize: 12, marginTop: space.sm, color: colors.textFaint },
  choiceRow: { flexDirection: 'row', gap: space.sm },
  choice: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  choiceTitle: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.text, textAlign: 'center' },
  choiceSub: { fontFamily: fonts.light, fontSize: 12, color: colors.textDim, marginTop: 2, textAlign: 'center' },
  dateStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  dateText: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  alarmHint: { fontSize: 13, marginTop: space.sm },
});
