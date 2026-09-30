import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  atTime,
  checkpointSummary,
  formatTime,
  isDone,
  relative,
  taskStatus,
  type TaskStatus,
} from '../lib/schedule';
import { useAkol } from '../lib/store';
import type { DayKey, Task } from '../lib/types';
import { colors, fonts, lining, space } from '../theme';
import { Avatar } from './Avatar';
import { DoubleRule } from './Rules';
import { Card, Eyebrow, tap } from './ui';

const STATUS_LABEL: Record<TaskStatus, string> = {
  done: 'Done',
  overdue: 'Late',
  due: 'Due now',
  soon: 'Coming up',
  upcoming: '',
};

function TimeLabel({ time, faded }: { time: string; faded?: boolean }) {
  const [clock, period] = formatTime(time).split(' ');
  return (
    <View style={s.timeCol}>
      <Text style={[s.time, faded && { color: colors.textFaint }]}>{clock}</Text>
      <Text style={s.ampm}>{period}</Text>
    </View>
  );
}

/** A printed ballot box: empty, or struck through with a tick in reversed ink. */
export function CheckCircle({ done, size = 26 }: { done: boolean; color?: string; size?: number }) {
  return (
    <View style={[s.check, { width: size, height: size }, done && { backgroundColor: colors.ink }]}>
      {done && <Ionicons name="checkmark" size={size * 0.72} color={colors.bg} />}
    </View>
  );
}

/** "Late", "Due now" and friends, set as a newspaper would flag them. */
function StatusMark({ status, text }: { status: TaskStatus; text: string }) {
  if (!text) return null;
  if (status === 'overdue')
    return (
      <View style={s.reversed}>
        <Text style={s.reversedText}>{text}</Text>
      </View>
    );
  return <Text style={[s.hint, status === 'soon' && { fontFamily: fonts.italic, textTransform: 'none', letterSpacing: 0 }]}>{text}</Text>;
}

export function TaskRow({
  task,
  day,
  now,
  showMember,
  isToday = true,
}: {
  task: Task;
  day: DayKey;
  now: Date;
  showMember?: boolean;
  isToday?: boolean;
  last?: boolean;
}) {
  const { state, member, toggle } = useAkol();
  const done = isDone(state.completions, day, task.id);
  const status: TaskStatus = isToday ? taskStatus(task, done, now) : done ? 'done' : 'upcoming';
  const m = member(task.memberId);

  let hint = STATUS_LABEL[status];
  if (isToday && (status === 'soon' || status === 'overdue')) hint = `${hint} · ${relative(atTime(now, task.time), now)}`;
  if (status === 'soon') hint = relative(atTime(now, task.time), now);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${task.title} at ${formatTime(task.time)}${m ? ` for ${m.name}` : ''}`}
      onPress={() => {
        tap(done ? 'light' : 'success');
        toggle(task.id, day);
      }}
      onLongPress={() => router.push({ pathname: '/task', params: { id: task.id } })}
      style={({ pressed }) => [s.row, status === 'due' && s.rowDue, pressed && { opacity: 0.6 }]}
    >
      <TimeLabel time={task.time} faded={done} />
      <View style={s.rowBody}>
        {showMember && <Text style={s.byline}>{m ? m.name : 'The Family'}</Text>}
        <Text style={[s.itemTitle, done && s.itemDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {((!!hint && !done) || !!task.note) && (
          <View style={s.meta}>
            {!done && <StatusMark status={status} text={hint} />}
            {!!task.note && <Text style={s.note} numberOfLines={1}>{task.note}</Text>}
          </View>
        )}
      </View>
      <CheckCircle done={done} />
    </Pressable>
  );
}

/** "Go time — have you completed the checklist?" */
export function CheckpointCard({ task, day, now, isToday = true }: { task: Task; day: DayKey; now: Date; isToday?: boolean }) {
  const { state, member, toggle, dispatch } = useAkol();
  const [showDone, setShowDone] = useState(false);
  const summary = checkpointSummary(task, state, state.completions, day);
  const total = summary.done.length + summary.outstanding.length;
  const reached = isToday && taskStatus(task, false, now) !== 'upcoming' && taskStatus(task, false, now) !== 'soon';
  const until = isToday ? relative(atTime(now, task.time), now) : '';

  return (
    <Card glow style={{ marginVertical: space.md }}>
      <Pressable onLongPress={() => router.push({ pathname: '/task', params: { id: task.id } })} style={{ alignItems: 'center' }}>
        <Eyebrow>{summary.complete ? 'Late Edition' : 'Bulletin'} · {formatTime(task.time)}</Eyebrow>
        <Text style={s.cpTitle}>{task.title}</Text>
        <Text style={s.cpDeck}>
          {summary.complete ? 'Every Item Checked Off; Family Ready to Depart' : (task.note ?? 'Have you completed the checklist?')}
        </Text>
        <DoubleRule style={{ marginVertical: space.md }} />
        <View style={s.cpTally}>
          <Text style={s.cpCount}>
            {summary.done.length}
            <Text style={s.cpOf}> of {total} ready</Text>
          </Text>
          {isToday && !summary.complete && (
            <Text style={[s.hint, reached && s.reversedInline]}>{reached ? ' Time is up ' : until}</Text>
          )}
        </View>
      </Pressable>

      {summary.outstanding.length > 0 && (
        <View style={{ marginTop: space.md }}>
          <Eyebrow style={{ fontSize: 10, marginBottom: 4 }}>Still Outstanding</Eyebrow>
          {summary.outstanding.map((t) => (
            <Pressable
              key={t.id}
              style={s.cpItem}
              onPress={() => {
                tap('success');
                toggle(t.id, day);
              }}
            >
              <Avatar member={member(t.memberId)} memberId={t.memberId} size={22} />
              <Text style={s.cpItemText} numberOfLines={1}>{t.title}</Text>
              <View style={s.leader} />
              <Text style={s.cpTime}>{formatTime(t.time)}</Text>
              <CheckCircle done={false} size={20} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              tap('success');
              for (const t of summary.outstanding) dispatch({ type: 'toggle', taskId: t.id, day, done: true });
            }}
            style={s.allDone}
          >
            <Text style={s.allDoneText}>Mark all as done ☞</Text>
          </Pressable>
        </View>
      )}

      {summary.done.length > 0 && (
        <Pressable onPress={() => setShowDone((v) => !v)} style={{ marginTop: space.sm }}>
          <Text style={[s.note, { fontSize: 13 }]}>
            {showDone ? 'Hide' : 'Show'} {summary.done.length} completed {showDone ? '▴' : '▾'}
          </Text>
        </Pressable>
      )}
      {showDone &&
        summary.done.map((t) => (
          <Pressable key={t.id} style={s.cpItem} onPress={() => toggle(t.id, day)}>
            <Avatar member={member(t.memberId)} memberId={t.memberId} size={22} />
            <Text style={[s.cpItemText, s.itemDone]} numberOfLines={1}>{t.title}</Text>
            <View style={s.leader} />
            <CheckCircle done size={20} />
          </Pressable>
        ))}
    </Card>
  );
}

export function Timeline({
  tasks,
  day,
  now,
  showMember,
  isToday = true,
}: {
  tasks: Task[];
  day: DayKey;
  now: Date;
  showMember?: boolean;
  isToday?: boolean;
}) {
  return (
    <View>
      {tasks.map((t) =>
        t.checkpoint ? (
          <CheckpointCard key={t.id} task={t} day={day} now={now} isToday={isToday} />
        ) : (
          <TaskRow key={t.id} task={t} day={day} now={now} showMember={showMember} isToday={isToday} />
        ),
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    borderStyle: 'dotted',
  },
  rowDue: { backgroundColor: colors.wash, marginHorizontal: -8, paddingHorizontal: 8 },
  timeCol: { width: 50, alignItems: 'flex-end' },
  time: { fontFamily: fonts.display, fontSize: 18, color: colors.text, ...lining },
  ampm: { fontFamily: fonts.displayItalic, fontSize: 11, color: colors.textDim },
  rowBody: { flex: 1, gap: 3, borderLeftWidth: 1, borderLeftColor: colors.ink, paddingLeft: space.md },
  byline: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.textDim },
  itemTitle: { fontFamily: fonts.body, fontSize: 17, lineHeight: 22, color: colors.text },
  itemDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  hint: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.ink },
  reversed: { backgroundColor: colors.ink, paddingHorizontal: 6, paddingVertical: 2 },
  reversedText: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.bg },
  reversedInline: { backgroundColor: colors.ink, color: colors.bg },
  note: { fontFamily: fonts.italic, fontSize: 13, color: colors.textDim, flexShrink: 1 },
  check: { borderWidth: 1.5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  cpTitle: {
    fontFamily: fonts.display,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.text,
    textAlign: 'center',
    marginTop: 6,
  },
  cpDeck: { fontFamily: fonts.displayItalic, fontSize: 17, lineHeight: 22, color: colors.text, textAlign: 'center', marginTop: 4 },
  cpTally: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', alignSelf: 'stretch', gap: space.sm },
  cpCount: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, ...lining },
  cpOf: { fontFamily: fonts.displayItalic, fontSize: 17, color: colors.textDim },
  cpItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 9 },
  cpItemText: { fontFamily: fonts.body, fontSize: 15, color: colors.text, flexShrink: 1 },

  leader: { flex: 1, minWidth: 8, borderBottomWidth: 2, borderBottomColor: colors.textFaint, borderStyle: 'dotted', marginBottom: 4, alignSelf: 'flex-end' },
  cpTime: { fontFamily: fonts.displayItalic, fontSize: 13, color: colors.textDim, flexShrink: 0, ...lining },
  allDone: { alignSelf: 'flex-end', paddingVertical: 8, marginTop: 4 },
  allDoneText: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.ink },
});
