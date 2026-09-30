import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { colors, fonts, gradients, lining, radius, space } from '../theme';
import { Avatar, jewelFor } from './Avatar';
import { Body, Card, Dim, Eyebrow, tap } from './ui';

const STATUS_LABEL: Record<TaskStatus, string> = {
  done: 'Done',
  overdue: 'Overdue',
  due: 'Due now',
  soon: 'Coming up',
  upcoming: '',
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  done: colors.success,
  overdue: colors.danger,
  due: colors.gold,
  soon: colors.warning,
  upcoming: colors.textFaint,
};

function TimeLabel({ time, faded }: { time: string; faded?: boolean }) {
  const f = formatTime(time);
  const clock = f.slice(0, -2);
  const ampm = f.slice(-2);
  return (
    <View style={s.timeCol}>
      <Text style={[s.time, faded && { color: colors.textFaint }]}>{clock}</Text>
      <Text style={s.ampm}>{ampm}</Text>
    </View>
  );
}

export function CheckCircle({ done, color, size = 28 }: { done: boolean; color: string; size?: number }) {
  if (done)
    return (
      <LinearGradient
        colors={gradients.gold}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.check, { width: size, height: size, borderRadius: size / 2, borderColor: 'transparent' }]}
      >
        <Ionicons name="checkmark" size={size * 0.62} color={colors.bg} />
      </LinearGradient>
    );
  return <View style={[s.check, { width: size, height: size, borderRadius: size / 2, borderColor: color + 'AA' }]} />;
}

export function TaskRow({
  task,
  day,
  now,
  showMember,
  isToday = true,
  last,
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
  const j = jewelFor(m, task.memberId);
  const hot = status === 'due' || status === 'overdue';

  let hint = STATUS_LABEL[status];
  if (isToday && (status === 'soon' || status === 'overdue')) hint = `${hint} · ${relative(atTime(now, task.time), now)}`;

  return (
    <View style={s.rowWrap}>
      <TimeLabel time={task.time} faded={done} />
      <View style={s.rail}>
        <View style={[s.node, { backgroundColor: done ? colors.gold : hot ? STATUS_COLOR[status] : colors.bgRaised, borderColor: done ? colors.gold : j.base }]} />
        {!last && <View style={s.railLine} />}
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${task.title} at ${formatTime(task.time)}${m ? ` for ${m.name}` : ''}`}
        onPress={() => {
          tap(done ? 'light' : 'success');
          toggle(task.id, day);
        }}
        onLongPress={() => router.push({ pathname: '/task', params: { id: task.id } })}
        style={({ pressed }) => [s.item, hot && { borderColor: STATUS_COLOR[status] + '88' }, pressed && { opacity: 0.8 }]}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[s.itemTitle, done && s.itemDone]} numberOfLines={2}>
            {task.title}
          </Text>
          {(showMember || !!task.note || !!hint) && (
            <View style={s.meta}>
              {showMember && (
                <View style={[s.memberTag, { backgroundColor: j.base + '22' }]}>
                  <Text style={[s.memberTagText, { color: j.light }]}>{m ? m.name : 'Family'}</Text>
                </View>
              )}
              {!!hint && !done && <Text style={[s.hint, { color: STATUS_COLOR[status] }]}>{hint}</Text>}
              {!!task.note && <Text style={s.note} numberOfLines={1}>{task.note}</Text>}
            </View>
          )}
        </View>
        <CheckCircle done={done} color={j.base} />
      </Pressable>
    </View>
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
    <Card glow style={{ marginVertical: space.sm }}>
      <LinearGradient colors={gradients.goldSoft} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <Pressable onLongPress={() => router.push({ pathname: '/task', params: { id: task.id } })}>
        <View style={[s.meta, { justifyContent: 'space-between' }]}>
          <Eyebrow>Checkpoint · {formatTime(task.time)}</Eyebrow>
          {isToday && !summary.complete && <Text style={[s.hint, { color: reached ? colors.danger : colors.gold }]}>{until}</Text>}
        </View>
        <View style={[s.meta, { justifyContent: 'space-between', marginTop: space.sm }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.cpTitle}>{task.title}</Text>
            <Dim style={{ marginTop: 2 }}>
              {summary.complete ? 'Everyone is ready. Off you go ✨' : (task.note ?? 'Have you completed the checklist?')}
            </Dim>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.cpCount}>
              {summary.done.length}
              <Text style={s.cpOf}> / {total}</Text>
            </Text>
            <Text style={s.ampm}>ready</Text>
          </View>
        </View>
      </Pressable>

      {summary.outstanding.length > 0 && (
        <View style={{ marginTop: space.md, gap: 6 }}>
          <Eyebrow style={{ color: colors.textDim, fontSize: 10 }}>Still to do</Eyebrow>
          {summary.outstanding.map((t) => (
            <Pressable
              key={t.id}
              style={s.cpItem}
              onPress={() => {
                tap('success');
                toggle(t.id, day);
              }}
            >
              <Avatar member={member(t.memberId)} memberId={t.memberId} size={24} />
              <Body style={{ flex: 1 }} numberOfLines={1}>{t.title}</Body>
              <Text style={s.cpTime}>{formatTime(t.time)}</Text>
              <CheckCircle done={false} color={jewelFor(member(t.memberId), t.memberId).base} size={22} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              tap('success');
              for (const t of summary.outstanding) dispatch({ type: 'toggle', taskId: t.id, day, done: true });
            }}
            style={s.allDone}
          >
            <Ionicons name="checkmark-done" size={16} color={colors.gold} />
            <Text style={s.allDoneText}>Mark all as done</Text>
          </Pressable>
        </View>
      )}

      {summary.done.length > 0 && (
        <Pressable onPress={() => setShowDone((v) => !v)} style={{ marginTop: space.md }}>
          <Text style={[s.hint, { color: colors.textDim }]}>
            {showDone ? 'Hide' : 'Show'} {summary.done.length} completed {showDone ? '▴' : '▾'}
          </Text>
        </Pressable>
      )}
      {showDone &&
        summary.done.map((t) => (
          <Pressable key={t.id} style={s.cpItem} onPress={() => toggle(t.id, day)}>
            <Avatar member={member(t.memberId)} memberId={t.memberId} size={24} />
            <Body style={[{ flex: 1 }, s.itemDone]} numberOfLines={1}>{t.title}</Body>
            <CheckCircle done color={colors.gold} size={22} />
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
      {tasks.map((t, i) =>
        t.checkpoint ? (
          <CheckpointCard key={t.id} task={t} day={day} now={now} isToday={isToday} />
        ) : (
          <TaskRow key={t.id} task={t} day={day} now={now} showMember={showMember} isToday={isToday} last={i === tasks.length - 1 || !!tasks[i + 1]?.checkpoint} />
        ),
      )}
    </View>
  );
}

const s = StyleSheet.create({
  rowWrap: { flexDirection: 'row', alignItems: 'stretch', minHeight: 70 },
  timeCol: { width: 52, alignItems: 'flex-end', paddingTop: 16, paddingRight: 2 },
  time: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.ivory, ...lining },
  ampm: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1.4, color: colors.textFaint, textTransform: 'uppercase' },
  rail: { width: 26, alignItems: 'center' },
  node: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, marginTop: 22, zIndex: 2 },
  railLine: { position: 'absolute', top: 30, bottom: -24, width: 1, backgroundColor: colors.hairline },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    marginVertical: 5,
  },
  itemTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.ivory },
  itemDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  memberTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  memberTagText: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.4 },
  hint: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.3 },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.textDim, flexShrink: 1 },
  check: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  cpTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.ivory },
  cpCount: { fontFamily: fonts.display, fontSize: 32, color: colors.gold, ...lining },
  cpOf: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.textDim, ...lining },
  cpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 10,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(7,8,15,0.45)',
  },
  cpTime: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDim },
  allDone: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, marginTop: 2 },
  allDoneText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold },
});
