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
import { colors, fonts, lining, radius, space } from '../theme';
import { Avatar } from './Avatar';
import { DiamondScene } from './three/Orrery';
import { tap } from './ui';

function TimeLabel({ time, faded, onPaper }: { time: string; faded?: boolean; onPaper?: boolean }) {
  const [clock, period] = formatTime(time).split(' ');
  const ink = onPaper ? colors.onPaper : colors.text;
  return (
    <View style={s.timeCol}>
      <Text style={[s.time, { color: ink }, faded && { color: colors.textFaint }]}>{clock}</Text>
      <Text style={[s.ampm, { color: onPaper ? colors.onPaper : colors.textDim }]}>{period}</Text>
    </View>
  );
}

/** A round seal: an open ring, or solid with a tick when done. Inverts on white. */
export function CheckCircle({ done, size = 30, onPaper }: { done: boolean; color?: string; size?: number; onPaper?: boolean; inverted?: boolean }) {
  const ink = onPaper ? colors.onPaper : colors.ink;
  const paper = onPaper ? colors.ink : colors.onPaper;
  return (
    <View style={[s.check, { width: size, height: size, borderRadius: size / 2, borderColor: ink }, done && { backgroundColor: ink }]}>
      {done && <Ionicons name="checkmark-sharp" size={size * 0.6} color={paper} />}
    </View>
  );
}

function StatusMark({ status, now, time }: { status: TaskStatus; now: Date; time: string }) {
  const rel = relative(atTime(now, time), now);
  if (status === 'due')
    return (
      <View style={s.nowPill}>
        <Text style={s.nowPillText}>Now</Text>
      </View>
    );
  if (status === 'overdue') return <Text style={s.late}>Late · {rel.replace(' ago', '')}</Text>;
  if (status === 'soon') return <Text style={s.soon}>{rel}</Text>;
  return null;
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
  // The item due now is set in reverse: black on a white bar.
  const lit = status === 'due';

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
      style={({ pressed }) => [s.row, lit && s.rowLit, pressed && { opacity: 0.6 }]}
    >
      <TimeLabel time={task.time} faded={done} onPaper={lit} />
      <View style={s.rowBody}>
        {showMember && (
          <View style={s.byRow}>
            <Avatar member={m} memberId={task.memberId} size={16} />
            <Text style={[s.byline, lit && { color: colors.onPaper }]}>{m ? m.name : 'Everyone'}</Text>
          </View>
        )}
        <Text style={[s.itemTitle, lit && { color: colors.onPaper }, done && s.itemDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {!done && !lit && (status !== 'upcoming' || !!task.note) && (
          <View style={s.meta}>
            {isToday && <StatusMark status={status} now={now} time={task.time} />}
            {!!task.note && <Text style={s.note} numberOfLines={1}>{task.note}</Text>}
          </View>
        )}
        {lit && <Text style={s.litNote}>Due now{task.note ? ` · ${task.note}` : ''}</Text>}
      </View>
      <CheckCircle done={done} onPaper={lit} />
    </Pressable>
  );
}

/** Go time: a solid white panel, heavy black type, and a crystal diamond turning in it. */
export function CheckpointCard({ task, day, now, isToday = true }: { task: Task; day: DayKey; now: Date; isToday?: boolean }) {
  const { state, member, toggle, dispatch } = useAkol();
  const [showDone, setShowDone] = useState(false);
  const summary = checkpointSummary(task, state, state.completions, day);
  const total = summary.done.length + summary.outstanding.length;
  const ratio = total ? summary.done.length / total : 1;
  const st = taskStatus(task, false, now);
  const reached = isToday && st !== 'upcoming' && st !== 'soon';
  const until = isToday ? relative(atTime(now, task.time), now) : '';

  return (
    <View style={s.panel}>
      <Pressable onLongPress={() => router.push({ pathname: '/task', params: { id: task.id } })}>
        <View style={s.cpTop}>
          <Text style={s.cpEyebrow}>{formatTime(task.time)}</Text>
          <Text style={s.cpEyebrow}>{isToday && !summary.complete ? (reached ? 'Time is up' : until) : 'Checkpoint'}</Text>
        </View>
        <View style={s.cpHead}>
          <Text style={s.cpTitle}>{task.title}.</Text>
          <DiamondScene ratio={ratio} size={96} />
        </View>
        <Text style={s.cpDeck}>{summary.complete ? 'Everyone is ready. Off you go.' : (task.note ?? 'Have you completed the checklist?')}</Text>
        <View style={s.tally}>
          <Text style={s.cpCount}>{summary.done.length}</Text>
          <Text style={s.cpOf}>/{total}</Text>
          <Text style={s.cpReady}>ready</Text>
        </View>
        <View style={s.meter}>
          <View style={[s.meterFill, { width: `${ratio * 100}%` }]} />
        </View>
      </Pressable>

      {summary.outstanding.length > 0 && (
        <View style={{ marginTop: space.md }}>
          {summary.outstanding.map((t) => (
            <Pressable
              key={t.id}
              style={s.cpItem}
              onPress={() => {
                tap('success');
                toggle(t.id, day);
              }}
            >
              <Text style={s.cpTime}>{formatTime(t.time).split(' ')[0]}</Text>
              <Text style={s.cpItemText} numberOfLines={1}>
                {t.title}
              </Text>
              <Text style={s.cpWho}>{member(t.memberId)?.name ?? ''}</Text>
              <CheckCircle done={false} size={22} onPaper />
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              tap('success');
              for (const t of summary.outstanding) dispatch({ type: 'toggle', taskId: t.id, day, done: true });
            }}
            style={({ pressed }) => [s.allDone, pressed && { opacity: 0.8 }]}
          >
            <Text style={s.allDoneText}>Mark all done</Text>
          </Pressable>
        </View>
      )}

      {summary.done.length > 0 && (
        <Pressable onPress={() => setShowDone((v) => !v)} style={{ marginTop: space.md }}>
          <Text style={s.showDone}>
            {showDone ? 'Hide' : 'Show'} {summary.done.length} completed {showDone ? '▴' : '▾'}
          </Text>
        </Pressable>
      )}
      {showDone &&
        summary.done.map((t) => (
          <Pressable key={t.id} style={s.cpItem} onPress={() => toggle(t.id, day)}>
            <Text style={[s.cpTime, { opacity: 0.4 }]}>{formatTime(t.time).split(' ')[0]}</Text>
            <Text style={[s.cpItemText, { opacity: 0.4, textDecorationLine: 'line-through' }]} numberOfLines={1}>
              {t.title}
            </Text>
            <CheckCircle done size={22} onPaper />
          </Pressable>
        ))}
    </View>
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
    gap: space.lg,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowLit: { backgroundColor: colors.ink, marginHorizontal: -space.lg, paddingHorizontal: space.lg, borderBottomColor: colors.ink },
  timeCol: { width: 64, alignItems: 'flex-start' },
  time: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -1, ...lining },
  ampm: { fontFamily: fonts.italic, fontSize: 13, marginTop: -2 },
  rowBody: { flex: 1, gap: 4 },
  byRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  byline: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase', color: colors.textDim },
  itemTitle: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 22, color: colors.text },
  itemDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  nowPill: { backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  nowPillText: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: colors.onPaper },
  late: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', color: colors.text },
  soon: { fontFamily: fonts.italic, fontSize: 15, color: colors.text },
  note: { fontFamily: fonts.light, fontSize: 13, color: colors.textDim, flexShrink: 1 },
  litNote: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', color: colors.onPaper },
  check: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  panel: { backgroundColor: colors.ink, padding: space.xl, marginVertical: space.xl },
  cpTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cpEyebrow: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 3, textTransform: 'uppercase', color: colors.onPaper },
  cpHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  cpTitle: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 60,
    lineHeight: 62,
    letterSpacing: -2,
    color: colors.onPaper,
    textTransform: 'uppercase',
  },
  cpDeck: { fontFamily: fonts.italic, fontSize: 20, lineHeight: 26, color: colors.onPaper, marginTop: space.xs },
  tally: { flexDirection: 'row', alignItems: 'baseline', marginTop: space.lg },
  cpCount: { fontFamily: fonts.display, fontSize: 72, lineHeight: 76, letterSpacing: -3, color: colors.onPaper, ...lining },
  cpOf: { fontFamily: fonts.display, fontSize: 30, color: 'rgba(0,0,0,0.35)', ...lining },
  cpReady: { fontFamily: fonts.italic, fontSize: 22, color: colors.onPaper, marginLeft: space.sm },
  meter: { height: 3, backgroundColor: 'rgba(0,0,0,0.12)', marginTop: space.sm },
  meterFill: { height: 3, backgroundColor: colors.onPaper },
  cpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.14)',
  },
  cpTime: { fontFamily: fonts.display, fontSize: 18, color: colors.onPaper, width: 48, ...lining },
  cpItemText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.onPaper },
  cpWho: { fontFamily: fonts.italic, fontSize: 15, color: 'rgba(0,0,0,0.55)' },
  allDone: {
    marginTop: space.lg,
    backgroundColor: colors.onPaper,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  allDoneText: { fontFamily: fonts.semibold, fontSize: 12.5, letterSpacing: 3, textTransform: 'uppercase', color: colors.ink },
  showDone: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(0,0,0,0.6)' },
});
