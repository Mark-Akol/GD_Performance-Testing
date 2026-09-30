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
import { colors, fonts, lining, SLANT, space, stroke } from '../theme';
import { Burst, SFX, SpeedLines } from './Manga';
import { tap } from './ui';

/** The time as a slanted black timecode tag. */
function TimeTag({ time, faded }: { time: string; faded?: boolean }) {
  const [clock, period] = formatTime(time).split(' ');
  return (
    <View style={[s.timeTag, faded && s.timeTagFaded]}>
      <Text style={[s.time, faded && { color: colors.ink }]}>{clock}</Text>
      <Text style={[s.ampm, faded && { color: colors.ink }]}>{period.replace(/\./g, '')}</Text>
    </View>
  );
}

/** A heavy square box; filled with a white tick when cleared. */
export function CheckCircle({ done, size = 30, inverted }: { done: boolean; color?: string; size?: number; inverted?: boolean }) {
  const ink = inverted ? colors.bg : colors.ink;
  const paper = inverted ? colors.ink : colors.bg;
  return (
    <View style={[s.check, { width: size, height: size, borderColor: ink }, done && { backgroundColor: ink }]}>
      {done && <Ionicons name="checkmark-sharp" size={size * 0.72} color={paper} />}
    </View>
  );
}

function StatusMark({ status, now, time }: { status: TaskStatus; now: Date; time: string }) {
  const rel = relative(atTime(now, time), now);
  if (status === 'due') return <Text style={s.nowText}>NOW!!</Text>;
  if (status === 'overdue')
    return (
      <View style={s.lateTag}>
        <Text style={s.lateText}>LATE · {rel.replace(' ago', '')}</Text>
      </View>
    );
  if (status === 'soon') return <Text style={s.soon}>T-{rel.replace('in ', '').toUpperCase()}</Text>;
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
      style={({ pressed }) => [s.row, status === 'due' && s.rowDue, pressed && { opacity: 0.6 }]}
    >
      <TimeTag time={task.time} faded={done} />
      <View style={s.rowBody}>
        {showMember && <Text style={s.byline}>{m ? m.name : 'Everyone'}</Text>}
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
      {done && (
        <View style={s.stamp} pointerEvents="none">
          <Text style={s.stampText}>CLEAR!</Text>
        </View>
      )}
      <CheckCircle done={done} />
    </Pressable>
  );
}

/** Go time: a black impact panel with speed lines, a sound effect and a speech bubble. */
export function CheckpointCard({ task, day, now, isToday = true }: { task: Task; day: DayKey; now: Date; isToday?: boolean }) {
  const { state, member, toggle, dispatch } = useAkol();
  const [showDone, setShowDone] = useState(false);
  const summary = checkpointSummary(task, state, state.completions, day);
  const total = summary.done.length + summary.outstanding.length;
  const st = taskStatus(task, false, now);
  const reached = isToday && st !== 'upcoming' && st !== 'soon';
  const until = isToday ? relative(atTime(now, task.time), now) : '';

  return (
    <View style={s.panelWrap}>
      <View style={s.panelShadow} />
      <View style={s.panel}>
        <SpeedLines focus={{ x: 0.3, y: 0.18 }} clear={0.22} count={72} inverted seed={11} style={{ opacity: 0.55 }} />
        <SFX
          text={summary.complete ? 'ダッ' : 'ゴゴゴ'}
          size={34}
          rotate={14}
          inverted
          style={{ position: 'absolute', right: -2, top: 96 }}
        />
        <Pressable onLongPress={() => router.push({ pathname: '/task', params: { id: task.id } })}>
          <View style={s.panelTop}>
            <View style={s.whiteTab}>
              <Text style={s.whiteTabText}>{formatTime(task.time)} · Checkpoint</Text>
            </View>
            {isToday && !summary.complete && <Text style={s.panelEyebrow}>{reached ? 'TIME IS UP!' : until.toUpperCase()}</Text>}
          </View>
          <Text style={s.cpTitle}>{task.title}!!</Text>

          <View style={s.bubbleRow}>
            <View style={s.bubble}>
              <Text style={s.bubbleText}>
                {summary.complete ? 'Everyone is ready. Let’s go!' : (task.note ?? 'Have you completed the checklist?')}
              </Text>
              <View style={s.bubbleTail} />
            </View>
            <Burst size={92} spikes={16} seed={5}>
              <Text style={s.burstCount}>
                {summary.done.length}/{total}
              </Text>
              <Text style={s.burstLabel}>READY</Text>
            </Burst>
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
                <Text style={s.cpWho}>{(member(t.memberId)?.name ?? '').toUpperCase()}</Text>
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
              <Text style={s.allDoneText}>All clear!</Text>
            </Pressable>
          </View>
        )}

        {summary.done.length > 0 && (
          <Pressable onPress={() => setShowDone((v) => !v)} style={{ marginTop: space.md }}>
            <Text style={s.panelNote}>
              {showDone ? 'HIDE' : 'SHOW'} {summary.done.length} CLEARED {showDone ? '▲' : '▼'}
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

const paperDim = 'rgba(255,255,255,0.7)';

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 14,
    borderBottomWidth: stroke.line,
    borderBottomColor: colors.ink,
  },
  rowDue: { backgroundColor: colors.wash, marginHorizontal: -8, paddingHorizontal: 8 },
  timeTag: {
    width: 66,
    backgroundColor: colors.ink,
    paddingVertical: 5,
    alignItems: 'center',
    transform: [{ skewX: SLANT }],
  },
  timeTagFaded: { backgroundColor: colors.bg, borderWidth: stroke.line, borderColor: colors.ink },
  time: { fontFamily: fonts.display, fontSize: 17, lineHeight: 21, color: colors.bg, ...lining },
  ampm: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.5, color: colors.bg, textTransform: 'uppercase' },
  rowBody: { flex: 1, gap: 3 },
  byline: { fontFamily: fonts.display, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.ink },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 21, color: colors.text },
  itemDone: { color: colors.textFaint, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  nowText: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 1, color: colors.ink },
  lateTag: { backgroundColor: colors.ink, paddingHorizontal: 7, paddingVertical: 2, transform: [{ skewX: SLANT }] },
  lateText: { fontFamily: fonts.display, fontSize: 10, letterSpacing: 1, color: colors.bg },
  soon: { fontFamily: fonts.displayItalic, fontSize: 13, letterSpacing: 1, color: colors.ink },
  note: { fontFamily: fonts.italic, fontSize: 13, color: colors.textDim, flexShrink: 1 },
  stamp: {
    position: 'absolute',
    right: 44,
    borderWidth: stroke.line,
    borderColor: colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 1,
    transform: [{ rotate: '-10deg' }],
    backgroundColor: colors.bg,
  },
  stampText: { fontFamily: fonts.display, fontSize: 12, letterSpacing: 1, color: colors.ink },
  check: { borderWidth: stroke.panel, alignItems: 'center', justifyContent: 'center' },

  panelWrap: { marginVertical: space.lg, paddingRight: 6, paddingBottom: 6 },
  panelShadow: {
    position: 'absolute',
    left: 6,
    top: 6,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderWidth: stroke.panel,
    borderColor: colors.ink,
  },
  panel: {
    backgroundColor: colors.ink,
    padding: space.xl,
    overflow: 'hidden',
    borderWidth: stroke.panel,
    borderColor: colors.ink,
  },
  panelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  whiteTab: { backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 4, transform: [{ skewX: SLANT }] },
  whiteTabText: { fontFamily: fonts.display, fontSize: 11, letterSpacing: 1, color: colors.ink, textTransform: 'uppercase' },
  panelEyebrow: { fontFamily: fonts.display, fontSize: 12, letterSpacing: 1, color: colors.bg },
  panelNote: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.5, color: paperDim },
  cpTitle: {
    fontFamily: fonts.display,
    fontSize: 50,
    lineHeight: 60,
    color: colors.bg,
    marginTop: space.md,
    textTransform: 'uppercase',
    transform: [{ skewX: SLANT }],
  },
  bubbleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md },
  bubble: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: stroke.panel,
    borderColor: colors.ink,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleTail: {
    position: 'absolute',
    left: 26,
    bottom: -9,
    width: 16,
    height: 16,
    backgroundColor: colors.bg,
    borderRightWidth: stroke.panel,
    borderBottomWidth: stroke.panel,
    borderColor: colors.ink,
    transform: [{ rotate: '45deg' }],
  },
  bubbleText: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  burstCount: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, ...lining },
  burstLabel: { fontFamily: fonts.semibold, fontSize: 8, letterSpacing: 1.5, color: colors.ink, marginTop: -2 },
  cpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    backgroundColor: colors.ink,
  },
  cpTime: { fontFamily: fonts.display, fontSize: 14, color: colors.bg, width: 50, ...lining },
  cpItemText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.bg },
  cpWho: { fontFamily: fonts.display, fontSize: 10, letterSpacing: 1, color: paperDim },
  allDone: {
    alignSelf: 'flex-start',
    marginTop: space.lg,
    backgroundColor: colors.bg,
    paddingVertical: 11,
    paddingHorizontal: 22,
    transform: [{ skewX: SLANT }],
  },
  allDoneText: { fontFamily: fonts.display, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink },
});
