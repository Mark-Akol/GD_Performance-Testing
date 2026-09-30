import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
  GoldButton,
  Screen,
  SectionHeader,
  ToggleRow,
  confirm,
} from '../components/ui';
import { FAMILY_ID, parseTime, sortByTime, toClockTime } from '../lib/schedule';
import { uid } from '../lib/seed';
import { useAkol } from '../lib/store';
import type { Task } from '../lib/types';
import { colors, familyJewel, jewels, space } from '../theme';

const SUGGESTIONS = ['Brush teeth', 'Pack lunch', 'Get dressed', 'Bags in the car', 'Homework check', 'Water bottle', 'Medication', 'Feed the pet'];

export default function TaskEditor() {
  const params = useLocalSearchParams<{ id?: string; routineId?: string; memberId?: string; checkpoint?: string }>();
  const { state, dispatch, me } = useAkol();
  const existing = params.id ? state.tasks.find((t) => t.id === params.id) : undefined;

  const [draft, setDraft] = useState<Task>(() => {
    if (existing) return existing;
    const routineId = params.routineId ?? state.routines[0]?.id ?? '';
    const siblings = sortByTime(state.tasks.filter((t) => t.routineId === routineId && !t.checkpoint));
    const last = siblings[siblings.length - 1];
    const checkpoint = params.checkpoint === '1';
    return {
      id: uid('t_'),
      routineId,
      memberId: checkpoint ? FAMILY_ID : (params.memberId ?? me?.id ?? FAMILY_ID),
      title: checkpoint ? 'Go time' : '',
      time: last ? toClockTime(parseTime(last.time) + 5) : '07:00',
      checkpoint,
      remind: true,
      note: checkpoint ? 'Have you completed the checklist?' : undefined,
    };
  });

  const set = (patch: Partial<Task>) => setDraft((d) => ({ ...d, ...patch }));
  const canSave = draft.title.trim().length > 0 && !!draft.routineId;

  const save = () => {
    dispatch({
      type: 'upsertTask',
      task: { ...draft, title: draft.title.trim(), note: draft.note?.trim() || undefined },
    });
    goBack();
  };

  if (state.routines.length === 0) {
    return (
      <Screen>
        <BackBar icon="close" />
        <Dim>Create a routine first, then add items to it.</Dim>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackBar icon="close" />
      <Eyebrow>{existing ? 'Edit' : 'New'} {draft.checkpoint ? 'checkpoint' : 'reminder'}</Eyebrow>
      <Display style={{ marginTop: 6, marginBottom: space.lg }}>{draft.title.trim() || (draft.checkpoint ? 'Checkpoint' : 'What needs doing?')}</Display>

      <Field
        label="Title"
        value={draft.title}
        onChangeText={(title) => set({ title })}
        placeholder={draft.checkpoint ? 'Go time' : 'Brush teeth'}
        autoFocus={!existing}
        returnKeyType="done"
      />
      {!draft.checkpoint && !existing && (
        <View style={[styles.wrap, { marginTop: space.md }]}>
          {SUGGESTIONS.map((s) => (
            <Chip key={s} label={s} active={draft.title === s} onPress={() => set({ title: s })} />
          ))}
        </View>
      )}

      <SectionHeader title="At" />
      <TimePicker value={draft.time} onChange={(time) => set({ time })} />
      <Dim style={styles.hint}>Tap arrows for 5-minute steps · long-press for 1 minute</Dim>

      {!draft.checkpoint && (
        <>
          <SectionHeader title="For" />
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

      {state.routines.length > 1 && (
        <>
          <SectionHeader title="Routine" />
          <View style={styles.wrap}>
            {state.routines.map((r) => (
              <Chip key={r.id} label={r.name} active={draft.routineId === r.id} onPress={() => set({ routineId: r.id })} />
            ))}
          </View>
        </>
      )}

      <SectionHeader title="Details" />
      <Field
        label={draft.checkpoint ? 'Question to ask' : 'Note (optional)'}
        value={draft.note ?? ''}
        onChangeText={(note) => set({ note })}
        placeholder={draft.checkpoint ? 'Have you completed the checklist?' : 'Water bottle too'}
      />
      <View style={{ marginTop: space.sm }}>
        <ToggleRow
          label="Checkpoint"
          hint="Summarises everything due before it, for the whole family."
          value={!!draft.checkpoint}
          onChange={(checkpoint) => set({ checkpoint, memberId: checkpoint ? FAMILY_ID : (me?.id ?? draft.memberId) })}
        />
        <ToggleRow
          label="Send a reminder"
          hint="A notification at this exact time — skipped if already done."
          value={draft.remind !== false}
          onChange={(remind) => set({ remind })}
        />
      </View>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        <GoldButton label={existing ? 'Save changes' : 'Add to routine'} onPress={save} disabled={!canSave} />
        {existing && (
          <GhostButton
            label="Delete"
            tone="danger"
            onPress={() =>
              confirm(`Delete “${existing.title}”?`, 'It will be removed from every day this routine runs.', 'Delete', () => {
                dispatch({ type: 'removeTask', id: existing.id });
                goBack();
              })
            }
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hint: { textAlign: 'center', fontSize: 12, marginTop: space.sm, color: colors.textFaint },
});
