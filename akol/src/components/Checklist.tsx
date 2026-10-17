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
import { colors, fonts, lining, radius, shadow, space } from '../theme';
import { Avatar, jewelFor } from './Avatar';
import { tap } from './ui';

function TimeLabel({ time, faded }: { time: string; faded?: boolean }) {
  const [clock, period] = formatTime(time).split(' ');
  return (
    <View style={s.timeCol}>
      <Text style={[s.time, faded && { color: colors.textFaint }]}>{clock}</Text>
      <Text style={s.ampm}>{period}</Text>
    </View>
  );
}

/** A round tick: an open ring in the person's colour, filled with a white tick when done. */
export function CheckCircle({
  done,
  size = 30,
  color = colors.ink,
  onPaper,
}: {
  done: boolean;
  color?: string;
  size?: number;
  onPaper?: boolean;
  inverted?: boolean;
}) {
  const ring = onPaper ? '#FFFFFF' : color;
  return (
    <View
      style={[
        s.check,
        { width: size, height: size, borderRadius: size / 2, borderColor: ring },
        done && { backgroundColor: ring },
        !done && !onPaper && { backgroundColor: '#FFFFFF' },
      ]}
    >
      {done && <Ionicons name="checkmark" size={size * 0.62} color={onPaper ? colors.accent : '#FFFFFF'} />}
    </View>
  );
}

function StatusMark({ status, now, time }: { status: TaskStatus; now: Date; time: string }) {
  const rel = relative(atTime(now, time), now);
  if (status === 'overdue') return <Text style={s.late}>Late · {rel.replace(' ago', '')}</Text>;
  if (status === 'soon') return <Text style={s.soon}>{rel}</Text>;
  return null;
}

/** One task as a soft block in its person's colour, on the day's timeline. */
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
  const j = jewelFor(m, task.memberId);
  const now_ = status === 'due';

  return (
    <View style={s.row}>
      <TimeLabel time={task.time} faded={done} />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${task.title} at ${formatTime(task.time)}${m ? ` for ${m.name}` : ''}`}
        onPress={() => {
          tap(done ? 'light' : 'success');
          toggle(task.id, day);
        }}
        onLongPress={() => router.push({ pathname: '/task', params: { id: task.id } })}
        style={({ pressed }) => [
          s.block,
          { backgroundColor: done ? colors.cardHi : j.tint, borderLeftColor: j.base },
          now_ && s.blockNow,
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={s.rowBody}>
          {(showMember || now_) && (
            <View style={s.byRow}>
              {showMember && (
                <>
                  <Avatar member={m} memberId={task.memberId} size={18} />
                  <Text style={s.byline}>{m ? m.name : 'Everyone'}</Text>
                </>
              )}
              {now_ && (
                <View style={s.nowPill}>
                  <Text style={s.nowPillText}>Now</Text>
                </View>
              )}
            </View>
          )}
          <Text style={[s.itemTitle, done && s.itemDone]} numberOfLines={2}>
            {task.title}
          </Text>
          {!done && (status === 'overdue' || status === 'soon' || !!task.note || !!task.date || task.alert === 'alarm') && (
            <View style={s.meta}>
              {isToday && <StatusMark status={status} now={now} time={task.time} />}
              {task.alert === 'alarm' && <Ionicons name="alarm" size={13} color={colors.accent} />}
              {!!task.date && <Text style={s.tag}>One-off</Text>}
              {!!task.note && (
                <Text style={s.note} numberOfLines={1}>
                  {task.note}
                </Text>
              )}
            </View>
          )}
        </View>
        <CheckCircle done={done} color={j.base} />
      </Pressable>
    </View>
  );
}

/** Go time: the one loud card. Coral, with everything still open across the family. */
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
    <LinearGradient colors={summary.complete ? [colors.success, '#3CC48C'] : [colors.accent, '#FF7A52']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.panel}>
      <Pressable onLongPress={() => router.push({ pathname: '/task', params: { id: task.id } })}>
        <View style={s.cpTop}>
          <View style={s.cpBadge}>
            <Text style={s.cpBadgeText}>{summary.complete ? '🎉' : '🏁'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cpEyebrow}>
              {formatTime(task.time)}
              {isToday && !summary.complete ? ` · ${reached ? 'time is up' : until}` : ''}
            </Text>
            <Text style={s.cpTitle}>{task.title}</Text>
          </View>
          <View style={s.tally}>
            <Text style={s.cpCount}>{summary.done.length}</Text>
            <Text style={s.cpOf}>/{total}</Text>
          </View>
        </View>
        <Text style={s.cpDeck}>{summary.complete ? 'Everyone is ready. Off you go!' : (task.note ?? 'Have you completed the checklist?')}</Text>
        <View style={s.meter}>
          <View style={[s.meterFill, { width: `${ratio * 100}%` }]} />
        </View>
      </Pressable>

      {summary.outstanding.length > 0 && (
        <View style={s.cpList}>
          {summary.outstanding.map((t, i) => {
            const who = member(t.memberId);
            return (
              <Pressable
                key={t.id}
                style={[s.cpItem, i > 0 && s.cpItemBorder]}
                onPress={() => {
                  tap('success');
                  toggle(t.id, day);
                }}
              >
                <Avatar member={who} memberId={t.memberId} size={26} />
                <Text style={s.cpItemText} numberOfLines={1}>
                  {t.title}
                </Text>
                <Text style={s.cpTime}>{formatTime(t.time).split(' ')[0]}</Text>
                <CheckCircle done={false} size={24} color={jewelFor(who, t.memberId).base} />
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              tap('success');
              for (const t of summary.outstanding) dispatch({ type: 'toggle', taskId: t.id, day, done: true });
            }}
            style={({ pressed }) => [s.allDone, pressed && { opacity: 0.85 }]}
          >
            <Text style={s.allDoneText}>Mark all done</Text>
          </Pressable>
        </View>
      )}

      {summary.done.length > 0 && (
        <Pressable onPress={() => setShowDone((v) => !v)} style={{ marginTop: space.md }}>
          <Text style={s.showDone}>
            {showDone ? 'Hide' : 'Show'} {summary.done.length} done {showDone ? '▴' : '▾'}
          </Text>
        </Pressable>
      )}
      {showDone &&
        summary.done.map((t) => (
          <Pressable key={t.id} style={s.cpDoneItem} onPress={() => toggle(t.id, day)}>
            <CheckCircle done size={20} onPaper />
            <Text style={s.cpDoneText} numberOfLines={1}>
              {t.title}
            </Text>
          </Pressable>
        ))}
    </LinearGradient>
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
  row: { flexDirection: 'row', alignItems: 'stretch', gap: space.md, marginBottom: space.sm + 2 },
  timeCol: { width: 52, paddingTop: 12, alignItems: 'flex-end' },
  time: { fontFamily: fonts.display, fontSize: 17, color: colors.text, ...lining },
  ampm: { fontFamily: fonts.light, fontSize: 11, color: colors.textDim, marginTop: -2 },
  block: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 14,
    paddingLeft: space.lg,
    paddingRight: space.md,
    borderRadius: radius.md,
    borderLeftWidth: 5,
  },
  blockNow: { borderWidth: 2, borderColor: colors.accent, borderLeftWidth: 5, backgroundColor: '#FFFFFF', ...shadow },
  rowBody: { flex: 1, gap: 3 },
  byRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  byline: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDim },
  itemTitle: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 21, color: colors.text },
  itemDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  nowPill: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1 },
  nowPillText: { fontFamily: fonts.semibold, fontSize: 11, color: '#FFFFFF' },
  late: { fontFamily: fonts.semibold, fontSize: 12, color: colors.danger },
  soon: { fontFamily: fonts.medium, fontSize: 12, color: colors.textDim },
  note: { fontFamily: fonts.light, fontSize: 12, color: colors.textDim, flexShrink: 1 },
  tag: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    color: colors.textDim,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    overflow: 'hidden',
  },
  check: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  panel: { borderRadius: radius.lg, padding: space.lg, marginVertical: space.md, marginLeft: 52 + space.md, ...shadow },
  cpTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cpBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cpBadgeText: { fontSize: 22 },
  cpEyebrow: { fontFamily: fonts.semibold, fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  cpTitle: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: '#FFFFFF' },
  tally: { flexDirection: 'row', alignItems: 'baseline' },
  cpCount: { fontFamily: fonts.display, fontSize: 30, color: '#FFFFFF', ...lining },
  cpOf: { fontFamily: fonts.displayBold, fontSize: 16, color: 'rgba(255,255,255,0.75)', ...lining },
  cpDeck: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: '#FFFFFF', marginTop: space.md },
  meter: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: space.md, overflow: 'hidden' },
  meterFill: { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  cpList: { marginTop: space.lg, backgroundColor: '#FFFFFF', borderRadius: radius.md, paddingHorizontal: space.md, paddingBottom: space.md },
  cpItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 11 },
  cpItemBorder: { borderTopWidth: 1, borderTopColor: colors.hairline },
  cpItemText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  cpTime: { fontFamily: fonts.medium, fontSize: 13, color: colors.textDim, ...lining },
  allDone: {
    marginTop: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  allDoneText: { fontFamily: fonts.semibold, fontSize: 15, color: '#FFFFFF' },
  showDone: { fontFamily: fonts.semibold, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  cpDoneItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6 },
  cpDoneText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: 'rgba(255,255,255,0.85)', textDecorationLine: 'line-through' },
});
