import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { BackBar, goBack } from '../components/BackBar';
import {
  Chip,
  Display,
  Eyebrow,
  Field,
  GhostButton,
  GoldButton,
  Screen,
  SectionHeader,
  ToggleRow,
  confirm,
  tap,
} from '../components/ui';
import { uid } from '../lib/seed';
import { useAkol } from '../lib/store';
import type { Member, MemberRole } from '../lib/types';
import { JEWEL_KEYS, colors, jewels, radius, space } from '../theme';

const EMOJI = ['👑', '🦁', '🦊', '🐻', '🐼', '🦄', '🐯', '🐬', '🦉', '🌸', '⭐️', '🚀', '⚽️', '🎨', '🎧', '🌙'];
const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'other', label: 'Other' },
];

export default function MemberEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, dispatch } = useAkol();
  const existing = id ? state.members.find((m) => m.id === id) : undefined;
  const [draft, setDraft] = useState<Member>(
    () =>
      existing ?? {
        id: uid('m_'),
        name: '',
        role: 'child',
        color: JEWEL_KEYS.find((k) => !state.members.some((m) => m.color === k)) ?? 'emerald',
        emoji: EMOJI[(state.members.length + 1) % EMOJI.length],
      },
  );
  const [isMe, setIsMe] = useState(state.settings.meId === draft.id);
  const set = (patch: Partial<Member>) => setDraft((d) => ({ ...d, ...patch }));

  const save = () => {
    dispatch({ type: 'upsertMember', member: { ...draft, name: draft.name.trim() } });
    if (isMe) dispatch({ type: 'settings', patch: { meId: draft.id } });
    goBack();
  };

  return (
    <Screen>
      <BackBar icon="close" />
      <View style={{ alignItems: 'center' }}>
        <Avatar member={{ ...draft, name: draft.name || '?' }} size={104} ratio={1} />
        <Eyebrow style={{ marginTop: space.lg }}>{existing ? 'Edit member' : 'New member'}</Eyebrow>
        <Display style={{ marginTop: 4 }}>{draft.name.trim() || 'Who is it?'}</Display>
      </View>

      <View style={{ marginTop: space.xl }}>
        <Field label="Name" value={draft.name} onChangeText={(name) => set({ name })} placeholder="Ra" autoFocus={!existing} />
      </View>

      <SectionHeader title="Role" />
      <View style={styles.wrap}>
        {ROLES.map((r) => (
          <Chip key={r.value} label={r.label} active={draft.role === r.value} onPress={() => set({ role: r.value })} />
        ))}
      </View>

      <SectionHeader title="Jewel" />
      <View style={styles.wrap}>
        {JEWEL_KEYS.map((k) => (
          <Chip key={k} label={jewels[k].name} color={jewels[k].base} active={draft.color === k} onPress={() => set({ color: k })} left={<View style={[styles.dot, { backgroundColor: jewels[k].base }]} />} />
        ))}
      </View>

      <SectionHeader title="Emblem" />
      <View style={styles.wrap}>
        {EMOJI.map((e) => (
          <Pressable
            key={e}
            onPress={() => {
              tap();
              set({ emoji: e });
            }}
            style={[styles.emoji, draft.emoji === e && { borderColor: jewels[draft.color].base, backgroundColor: jewels[draft.color].base + '22' }]}
          >
            <Text style={{ fontSize: 24 }}>{e}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => set({ emoji: undefined })}
          style={[styles.emoji, !draft.emoji && { borderColor: colors.gold }]}
        >
          <Text style={{ fontSize: 16, color: colors.textDim }}>Aa</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: space.lg }}>
        <ToggleRow label="This is me" hint="Akol opens on this person's checklist on this device." value={isMe} onChange={setIsMe} />
      </View>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        <GoldButton label={existing ? 'Save' : 'Add to the family'} onPress={save} disabled={!draft.name.trim()} />
        {existing && state.members.length > 1 && (
          <GhostButton
            label={`Remove ${existing.name}`}
            tone="danger"
            onPress={() =>
              confirm(`Remove ${existing.name}?`, 'Their personal checklist items will be deleted too.', 'Remove', () => {
                dispatch({ type: 'removeMember', id: existing.id });
                goBack('/family');
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
  dot: { width: 10, height: 10, borderRadius: 5 },
  emoji: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
