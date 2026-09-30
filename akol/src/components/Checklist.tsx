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
import { DiamondScene } from './three/Orrery';
import { Card, InkButton, tap } from './ui';

function TimeLabel({ time, faded }: { time: string; faded?: boolean }) {
  const [clock, period] = formatTime(time).split(' ');
  return (
    <View style={s.timeCol}>
      <Text style={[s.time, faded && { color: colors.textFaint }]}>{clock}</Text>
      <Text style={s.ampm}>{period}</Text>
    </View>
  );
}

/** A bead like the ones in the orrery: smoked glass when open, polished metal when done. */
export function CheckCircle({ done, color = colors.ink, size = 30 }: { done: boolean; color?: string; size?: number; inverted?: boolean }) {
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2 },
        done && { shadowColor: color, shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } },
      ]}
    >
      <LinearGradient
        colors={done ? ['#FFFFFF', color, color] : ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)']}
        start={{ x: 0.25, y: 0.1 }}
        end={{ x: 0.8, y: 1 }}
        style={[s.bead, { borderRadius: size / 2, borderColor: done ? 'rgba(255,255,255,0.5)' : color + '77' }]}
      >
        {done && <Ionicons name="checkmark" size={size * 0.56} color="#1A1206" />}
      </LinearGradient>
    </View>
  );
}

function StatusMark({ status, now, time }: { status: TaskStatus; now: Date; time: string }) {
  const rel = relative(atTime(now, time), now);
  if (status === 'due')
    return (
      <LinearGradient colors={gradients.ink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.nowPill}>
        <Text style={s.nowPillText}>Now</Text>
      </LinearGradient>
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
  const j = jewelFor(m, task.memberId);

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
      style={({ pressed }) => [s.row, status === 'due' && s.rowDue, pressed && { opacity: 0.7, transform: [{ scale: 0.99 }] }]}
    >
      <TimeLabel time={task.time} faded={done} />
      <View style={[s.accent, { backgroundColor: j.base, opacity: done ? 0.35 : 0.9 }]} />
      <View style={s.rowBody}>
        {showMember && (
          <View style={s.byRow}>
            <Avatar member={m} memberId={task.memberId} size={16} />
            <Text style={[s.byline, { color: j.light }]}>{m ? m.name : 'Everyone'}</Text>
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
      <CheckCircle done={done} color={j.base} />
    </Pressable>
  );
}

/** Go time: a lit glass panel with a live 3D diamond that brightens as the list fills. */
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
    <Card glow style={{ marginVertical: space.lg, padding: 0 }}>
      <LinearGradient colors={gradients.inkSoft} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      <Pressable onLongPress={() => router.push({ pathname: '/task', params: { id: task.id } })} style={s.cpHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.cpEyebrow}>
            {formatTime(task.time)} · {isToday && !summary.complete ? (reached ? 'time is up' : until) : 'checkpoint'}
          </Text>
          <Text style={s.cpTitle}>{task.title}</Text>
          <Text style={s.cpDeck}>{summary.complete ? 'Everyone is ready. Off you go.' : (task.note ?? 'Have you completed the checklist?')}</Text>
        </View>
        <DiamondScene ratio={ratio} size={112} />
      </Pressable>

      <View style={s.cpBody}>
        <View style={s.tally}>
          <Text style={s.cpCount}>{summary.done.length}</Text>
          <Text style={s.cpOf}> / {total} ready</Text>
        </View>
        <View style={s.meter}>
          <LinearGradient colors={gradients.ink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.meterFill, { width: `${ratio * 100}%` }]} />
        </View>

        {summary.outstanding.length > 0 && (
          <View style={{ marginTop: space.md }}>
            {summary.outstanding.map((t) => {
              const m = member(t.memberId);
              return (
                <Pressable
                  key={t.id}
                  style={s.cpItem}
                  onPress={() => {
                    tap('success');
                    toggle(t.id, day);
                  }}
                >
                  <Avatar member={m} memberId={t.memberId} size={24} />
                  <Text style={s.cpItemText} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text style={s.cpTime}>{formatTime(t.time)}</Text>
                  <CheckCircle done={false} size={22} color={jewelFor(m, t.memberId).base} />
                </Pressable>
              );
            })}
            <InkButton
              label="Mark all done"
              onPress={() => {
                tap('success');
                for (const t of summary.outstanding) dispatch({ type: 'toggle', taskId: t.id, day, done: true });
              }}
              style={{ marginTop: space.lg }}
            />
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
              <Avatar member={member(t.memberId)} memberId={t.memberId} size={24} />
              <Text style={[s.cpItemText, s.itemDone]} numberOfLines={1}>
                {t.title}
              </Text>
              <CheckCircle done size={22} color={jewelFor(member(t.memberId), t.memberId).base} />
            </Pressable>
          ))}
      </View>
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
    paddingHorizontal: space.md,
    marginVertical: 4,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,250,240,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,236,200,0.07)',
  },
  rowDue: { borderColor: colors.hairlineStrong, backgroundColor: 'rgba(232,199,138,0.08)' },
  timeCol: { width: 54, alignItems: 'flex-end' },
  time: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, color: colors.text, ...lining },
  ampm: { fontFamily: fonts.italic, fontSize: 12, color: colors.textDim },
  accent: { width: 2, alignSelf: 'stretch', borderRadius: 1 },
  rowBody: { flex: 1, gap: 4 },
  byRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  byline: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  itemTitle: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 21, color: colors.text },
  itemDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  nowPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  nowPillText: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: '#1A1206' },
  late: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.danger },
  soon: { fontFamily: fonts.italic, fontSize: 15, color: colors.ink },
  note: { fontFamily: fonts.light, fontSize: 13, color: colors.textDim, flexShrink: 1 },
  bead: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  cpHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.xl, paddingBottom: 0 },
  cpEyebrow: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 2.6, textTransform: 'uppercase', color: colors.ink },
  cpTitle: { fontFamily: fonts.masthead, fontSize: 52, lineHeight: 58, color: colors.text, marginTop: 2 },
  cpDeck: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.textDim },
  cpBody: { padding: space.xl, paddingTop: space.md },
  tally: { flexDirection: 'row', alignItems: 'baseline' },
  cpCount: { fontFamily: fonts.display, fontSize: 48, lineHeight: 52, color: colors.ink, ...lining },
  cpOf: { fontFamily: fonts.italic, fontSize: 20, color: colors.textDim },
  meter: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,236,200,0.1)', marginTop: space.sm, overflow: 'hidden' },
  meterFill: { height: 4, borderRadius: 2 },
  cpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,236,200,0.08)',
  },
  cpItemText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  cpTime: { fontFamily: fonts.italic, fontSize: 14, color: colors.textDim, ...lining },
  showDone: { fontFamily: fonts.medium, fontSize: 13, color: colors.textDim },
});
