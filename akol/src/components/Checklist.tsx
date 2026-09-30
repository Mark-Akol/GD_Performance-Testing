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
import { tap } from './ui';

function TimeLabel({ time, faded }: { time: string; faded?: boolean }) {
  const [clock, period] = formatTime(time).split(' ');
  return (
    <View style={s.timeCol}>
      <Text style={[s.time, faded && { color: colors.textFaint }]}>{clock}</Text>
      <Text style={[s.ampm, faded && { color: colors.textFaint }]}>{period}</Text>
    </View>
  );
}

/** A round mark like the ones on the Dial: open, or filled solid when done. */
export function CheckCircle({
  done,
  size = 28,
  inverted,
}: {
  done: boolean;
  color?: string;
  size?: number;
  inverted?: boolean;
}) {
  const ink = inverted ? colors.bg : colors.ink;
  const paper = inverted ? colors.ink : colors.bg;
  return (
    <View style={[s.check, { width: size, height: size, borderRadius: size / 2, borderColor: ink }, done && { backgroundColor: ink }]}>
      {done && <Ionicons name="checkmark" size={size * 0.6} color={paper} />}
    </View>
  );
}

/** "now", "late · 28 min", "in 7 min". */
function StatusMark({ status, now, time }: { status: TaskStatus; now: Date; time: string }) {
  const rel = relative(atTime(now, time), now);
  if (status === 'due')
    return (
      <View style={s.nowPill}>
        <Text style={s.nowPillText}>Now</Text>
      </View>
    );
  if (status === 'overdue') return <Text style={s.late}>✕ late · {rel.replace(' ago', '')}</Text>;
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
      style={({ pressed }) => [s.row, pressed && { opacity: 0.55 }]}
    >
      <TimeLabel time={task.time} faded={done} />
      <View style={s.rowBody}>
        {showMember && (
          <View style={s.byRow}>
            <Avatar member={m} memberId={task.memberId} size={16} />
            <Text style={s.byline}>{m ? m.name : 'Everyone'}</Text>
          </View>
        )}
        <Text style={[s.itemTitle, done && s.itemDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {!done && (status !== 'upcoming' || !!task.note) && (
          <View style={s.meta}>
            {isToday && <StatusMark status={status} now={now} time={task.time} />}
            {!!task.note && <Text style={s.note} numberOfLines={1}>{task.note}</Text>}
          </View>
        )}
      </View>
      <CheckCircle done={done} />
    </Pressable>
  );
}

/** Go time: a solid black panel that asks whether everything is done. */
export function CheckpointCard({ task, day, now, isToday = true }: { task: Task; day: DayKey; now: Date; isToday?: boolean }) {
  const { state, member, toggle, dispatch } = useAkol();
  const [showDone, setShowDone] = useState(false);
  const summary = checkpointSummary(task, state, state.completions, day);
  const total = summary.done.length + summary.outstanding.length;
  const st = taskStatus(task, false, now);
  const reached = isToday && st !== 'upcoming' && st !== 'soon';
  const until = isToday ? relative(atTime(now, task.time), now) : '';

  return (
    <View style={s.panel}>
      <Pressable onLongPress={() => router.push({ pathname: '/task', params: { id: task.id } })}>
        <View style={s.panelTop}>
          <Text style={s.panelEyebrow}>{formatTime(task.time)} · Checkpoint</Text>
          {isToday && !summary.complete && <Text style={s.panelEyebrow}>{reached ? 'Time is up' : until}</Text>}
        </View>
        <Text style={s.cpTitle}>{task.title}.</Text>
        <Text style={s.cpDeck}>{summary.complete ? 'Everyone is ready. Off you go.' : (task.note ?? 'Have you completed the checklist?')}</Text>
        <View style={s.tally}>
          <Text style={s.cpCount}>{summary.done.length}</Text>
          <Text style={s.cpOf}>/{total}</Text>
          <Text style={s.cpReady}>ready</Text>
        </View>
        <View style={s.meter}>
          <View style={[s.meterFill, { width: `${total ? (summary.done.length / total) * 100 : 0}%` }]} />
        </View>
      </Pressable>

      {summary.outstanding.length > 0 && (
        <View style={{ marginTop: space.lg }}>
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
              <CheckCircle done={false} size={22} inverted />
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              tap('success');
              for (const t of summary.outstanding) dispatch({ type: 'toggle', taskId: t.id, day, done: true });
            }}
            style={s.allDone}
          >
            <Text style={s.allDoneText}>Mark all done</Text>
          </Pressable>
        </View>
      )}

      {summary.done.length > 0 && (
        <Pressable onPress={() => setShowDone((v) => !v)} style={{ marginTop: space.md }}>
          <Text style={s.panelNote}>
            {showDone ? 'Hide' : 'Show'} {summary.done.length} done {showDone ? '↑' : '↓'}
          </Text>
        </Pressable>
      )}
      {showDone &&
        summary.done.map((t) => (
          <Pressable key={t.id} style={s.cpItem} onPress={() => toggle(t.id, day)}>
            <Text style={[s.cpTime, { opacity: 0.5 }]}>{formatTime(t.time).split(' ')[0]}</Text>
            <Text style={[s.cpItemText, { opacity: 0.5, textDecorationLine: 'line-through' }]} numberOfLines={1}>
              {t.title}
            </Text>
            <CheckCircle done size={22} inverted />
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
  timeCol: { width: 62, alignItems: 'flex-start' },
  time: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.5, color: colors.text, ...lining },
  ampm: { fontFamily: fonts.italic, fontSize: 12, color: colors.textDim, marginTop: -2 },
  rowBody: { flex: 1, gap: 4 },
  byRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  byline: { fontFamily: fonts.semibold, fontSize: 9.5, letterSpacing: 2.2, textTransform: 'uppercase', color: colors.textDim },
  itemTitle: { fontFamily: fonts.body, fontSize: 17, lineHeight: 22, color: colors.text },
  itemDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  nowPill: { backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 2 },
  nowPillText: { fontFamily: fonts.semibold, fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', color: colors.bg },
  late: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.ink },
  soon: { fontFamily: fonts.italic, fontSize: 14, color: colors.text },
  note: { fontFamily: fonts.light, fontSize: 13, color: colors.textDim, flexShrink: 1 },
  check: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  panel: { backgroundColor: colors.ink, padding: space.xl, marginVertical: space.lg },
  panelTop: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  panelEyebrow: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2.6, textTransform: 'uppercase', color: colors.bg },
  panelNote: { fontFamily: fonts.light, fontSize: 13, color: 'rgba(251,251,249,0.7)' },
  cpTitle: { fontFamily: fonts.italic, fontSize: 58, lineHeight: 64, letterSpacing: -1, color: colors.bg, marginTop: space.md },
  cpDeck: { fontFamily: fonts.light, fontSize: 17, lineHeight: 23, color: colors.bg },
  tally: { flexDirection: 'row', alignItems: 'baseline', marginTop: space.lg },
  cpCount: { fontFamily: fonts.display, fontSize: 64, lineHeight: 68, color: colors.bg, letterSpacing: -2, ...lining },
  cpOf: { fontFamily: fonts.display, fontSize: 28, color: 'rgba(251,251,249,0.55)', ...lining },
  cpReady: { fontFamily: fonts.italic, fontSize: 18, color: colors.bg, marginLeft: space.sm },
  meter: { height: 2, backgroundColor: 'rgba(251,251,249,0.2)', marginTop: space.sm },
  meterFill: { height: 2, backgroundColor: colors.bg },
  cpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251,251,249,0.16)',
  },
  cpTime: { fontFamily: fonts.display, fontSize: 17, color: colors.bg, width: 40, ...lining },
  cpItemText: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.bg },
  cpWho: { fontFamily: fonts.italic, fontSize: 13, color: 'rgba(251,251,249,0.7)' },
  allDone: {
    alignSelf: 'flex-start',
    marginTop: space.lg,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  allDoneText: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 2.6, textTransform: 'uppercase', color: colors.ink },
});
