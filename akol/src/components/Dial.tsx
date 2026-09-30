import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';

import { FAMILY_ID, formatTime, isDone, minutesOfDay, parseTime, taskStatus, type TaskStatus } from '../lib/schedule';
import type { Completions, DayKey, Member, Task } from '../lib/types';
import { colors, fonts, lining } from '../theme';
import { jewelFor } from './Avatar';
import { tap } from './ui';

/** The dial's arc runs from 7 o'clock round to 5 o'clock, leaving the bottom open. */
const SWEEP = (300 * Math.PI) / 180;
const START = -SWEEP / 2;

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
}

/** A ring-shaped slice between two radii, used to shade the part of the window already past. */
function band(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  if (a1 <= a0) return '';
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const o0 = polar(cx, cy, r1, a0);
  const o1 = polar(cx, cy, r1, a1);
  const i1 = polar(cx, cy, r0, a1);
  const i0 = polar(cx, cy, r0, a0);
  return `M ${o0.x} ${o0.y} A ${r1} ${r1} 0 ${large} 1 ${o1.x} ${o1.y} L ${i1.x} ${i1.y} A ${r0} ${r0} 0 ${large} 0 ${i0.x} ${i0.y} Z`;
}

/**
 * Concentric "tree rings" for the household: one ring per member in their line style,
 * drawn solid as far round as they have got through today's list.
 */
export function FamilyRings({
  rings,
  size,
}: {
  rings: { member: Member | undefined; memberId: string; ratio: number }[];
  size: number;
}) {
  const c = size / 2;
  const step = Math.min(12, (size / 2 - 10) / Math.max(1, rings.length));
  return (
    <Svg width={size} height={size}>
      {rings.map((r, i) => {
        const radius = size / 2 - 4 - i * step;
        const j = jewelFor(r.member, r.memberId);
        const a = Math.max(0.0001, Math.min(1, r.ratio)) * Math.PI * 2 - 0.0001;
        return (
          <G key={r.memberId}>
            <Circle cx={c} cy={c} r={radius} stroke={colors.hairline} strokeWidth={1} fill="none" strokeDasharray={j.dash} />
            {r.ratio > 0 && (
              <Path
                d={arc(c, c, radius, 0, a)}
                stroke={colors.ink}
                strokeWidth={Math.max(1.6, j.width)}
                strokeDasharray={j.dash}
                strokeLinecap={j.style === 'dotted' ? 'round' : 'butt'}
                fill="none"
              />
            )}
          </G>
        );
      })}
    </Svg>
  );
}

/** The window of the day the dial shows: the routine's first item to just past its last. */
export function dialWindow(tasks: Task[]) {
  const mins = tasks.map((t) => parseTime(t.time));
  let from = Math.floor((Math.min(...mins) - 10) / 5) * 5;
  let to = Math.ceil((Math.max(...mins) + 10) / 5) * 5;
  if (to - from < 60) {
    const pad = (60 - (to - from)) / 2;
    from = Math.floor((from - pad) / 5) * 5;
    to = Math.ceil((to + pad) / 5) * 5;
  }
  return { from, to };
}

/**
 * The Dial: one routine as a watch face. The outer scale is the routine's window of time,
 * each family member is a concentric orbit in their own line style, every item is a mark
 * at its exact minute, and the hand is now. Tap a mark to tick it off.
 */
export function Dial({
  tasks,
  members,
  completions,
  day,
  now,
  size,
  onToggle,
  inverted,
}: {
  tasks: Task[];
  members: Member[];
  completions: Completions;
  day: DayKey;
  now: Date;
  size: number;
  onToggle: (taskId: string) => void;
  inverted?: boolean;
}) {
  const ink = inverted ? colors.bg : colors.ink;
  const paper = inverted ? colors.ink : colors.bg;
  const faint = inverted ? 'rgba(251,251,249,0.28)' : colors.hairline;

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 26;
  const { from, to } = dialWindow(tasks);
  const angleOf = (mins: number) => START + ((mins - from) / (to - from)) * SWEEP;

  const chores = tasks.filter((t) => !t.checkpoint);
  const checkpoints = tasks.filter((t) => t.checkpoint);
  const orbitIds = [...new Set(chores.map((t) => t.memberId))].sort((a, b) => {
    // Parents outside, children inside, household items innermost.
    const rank = (id: string) => (id === FAMILY_ID ? 3 : members.find((m) => m.id === id)?.role === 'parent' ? 0 : 1);
    return rank(a) - rank(b);
  });
  const step = Math.min(24, (R * 0.42) / Math.max(1, orbitIds.length));
  const orbitR = (i: number) => R - 22 - i * step;
  const innerR = orbitR(orbitIds.length - 1) - 12;

  const nowMins = minutesOfDay(now);
  const inWindow = nowMins >= from && nowMins <= to;
  const handA = angleOf(Math.max(from, Math.min(to, nowMins)));

  const ticks: { a: number; major: boolean; label?: string }[] = [];
  for (let m = from; m <= to; m += 5) {
    const major = m % 15 === 0;
    const label = m % 30 === 0 && !checkpoints.some((c) => parseTime(c.time) === m) ? formatTime(`${Math.floor(m / 60)}:${m % 60}`).split(' ')[0] : undefined;
    ticks.push({ a: angleOf(m), major, label });
  }

  const nextOpen = chores.find((t) => !isDone(completions, day, t.id) && taskStatus(t, false, now) !== 'overdue');

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* elapsed part of the window */}
        {inWindow && (
          <Path d={band(cx, cy, innerR + 2, R, START, handA)} fill={inverted ? 'rgba(251,251,249,0.07)' : colors.wash} />
        )}

        {/* scale */}
        <Path d={arc(cx, cy, R, START, START + SWEEP)} stroke={ink} strokeWidth={1} fill="none" />
        {ticks.map((t, i) => {
          const p0 = polar(cx, cy, R, t.a);
          const p1 = polar(cx, cy, R - (t.major ? 9 : 4), t.a);
          const pl = polar(cx, cy, R + 13, t.a);
          return (
            <G key={i}>
              <Line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={ink} strokeWidth={t.major ? 1.2 : 0.7} />
              {t.label && (
                <SvgText x={pl.x} y={pl.y + 3.5} fontSize={10} fontFamily={fonts.displayMedium} fill={ink} textAnchor="middle">
                  {t.label}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* orbits */}
        {orbitIds.map((id, i) => {
          const j = jewelFor(members.find((m) => m.id === id), id);
          const r = orbitR(i);
          const d = arc(cx, cy, r, START, START + SWEEP);
          return (
            <G key={id}>
              {j.style === 'double' ? (
                <>
                  <Path d={arc(cx, cy, r + 1.8, START, START + SWEEP)} stroke={ink} strokeWidth={0.8} fill="none" />
                  <Path d={arc(cx, cy, r - 1.8, START, START + SWEEP)} stroke={ink} strokeWidth={0.8} fill="none" />
                </>
              ) : (
                <Path
                  d={d}
                  stroke={j.style === 'wash' ? (inverted ? 'rgba(251,251,249,0.6)' : colors.textDim) : ink}
                  strokeWidth={j.width * 0.6}
                  strokeDasharray={j.dash}
                  strokeLinecap={j.style === 'dotted' ? 'round' : 'butt'}
                  fill="none"
                  opacity={0.55}
                />
              )}
            </G>
          );
        })}

        {/* the hand */}
        {inWindow && (
          <G>
            <Line
              x1={polar(cx, cy, innerR + 2, handA).x}
              y1={polar(cx, cy, innerR + 2, handA).y}
              x2={polar(cx, cy, R + 4, handA).x}
              y2={polar(cx, cy, R + 4, handA).y}
              stroke={ink}
              strokeWidth={1.4}
            />
            <Circle cx={polar(cx, cy, R + 4, handA).x} cy={polar(cx, cy, R + 4, handA).y} r={3} fill={ink} />
          </G>
        )}

        {/* checkpoints: a filled lozenge on the scale */}
        {checkpoints.map((c) => {
          const a = angleOf(parseTime(c.time));
          const s = 7;
          const tip = polar(cx, cy, R - s * 1.6, a);
          const out = polar(cx, cy, R + s * 0.9, a);
          const l = polar(cx, cy, R, a - 0.05);
          const rr = polar(cx, cy, R, a + 0.05);
          const lab = polar(cx, cy, R + 15, a);
          const done = checkpointDone(c, tasks, completions, day);
          return (
            <G key={c.id}>
              <Polygon points={`${out.x},${out.y} ${l.x},${l.y} ${tip.x},${tip.y} ${rr.x},${rr.y}`} fill={done ? ink : paper} stroke={ink} strokeWidth={1.2} />
              <SvgText x={lab.x} y={lab.y + 3.5} fontSize={9} fontFamily={fonts.semibold} fill={ink} textAnchor="middle" letterSpacing={1.2}>
                {c.title.split(' ')[0].toUpperCase()}
              </SvgText>
            </G>
          );
        })}

        {/* marks */}
        {orbitIds.map((id, i) =>
          chores
            .filter((t) => t.memberId === id)
            .map((t) => {
              const p = polar(cx, cy, orbitR(i), angleOf(parseTime(t.time)));
              const done = isDone(completions, day, t.id);
              const st: TaskStatus = taskStatus(t, done, now);
              const isNext = t.id === nextOpen?.id;
              return (
                <G
                  key={t.id}
                  onPress={() => {
                    tap(done ? 'light' : 'success');
                    onToggle(t.id);
                  }}
                >
                  <Circle cx={p.x} cy={p.y} r={14} fill="transparent" />
                  {isNext && <Circle cx={p.x} cy={p.y} r={10} fill="none" stroke={ink} strokeWidth={0.8} />}
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={st === 'due' ? 6.5 : 5.5}
                    fill={done || st === 'due' ? ink : paper}
                    stroke={ink}
                    strokeWidth={1.3}
                  />
                  {st === 'due' && <Circle cx={p.x} cy={p.y} r={2} fill={paper} />}
                  {st === 'overdue' && (
                    <G>
                      <Line x1={p.x - 3.2} y1={p.y - 3.2} x2={p.x + 3.2} y2={p.y + 3.2} stroke={ink} strokeWidth={1.2} />
                      <Line x1={p.x - 3.2} y1={p.y + 3.2} x2={p.x + 3.2} y2={p.y - 3.2} stroke={ink} strokeWidth={1.2} />
                    </G>
                  )}
                </G>
              );
            }),
        )}

        {/* orbit initials at the open end of each ring */}
        {orbitIds.map((id, i) => {
          const m = members.find((x) => x.id === id);
          const p = polar(cx, cy, orbitR(i), START - 0.09);
          return (
            <SvgText key={id} x={p.x} y={p.y + 4} fontSize={11} fontFamily={fonts.italic} fill={ink} textAnchor="middle">
              {m ? m.name.slice(0, 1) : '✦'}
            </SvgText>
          );
        })}
      </Svg>

      {/* centre: the time, set large */}
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Text style={[styles.clock, { color: ink, fontSize: Math.max(40, innerR * 0.62) }]}>
          {formatTime(`${now.getHours()}:${now.getMinutes()}`).split(' ')[0]}
        </Text>
        <Text style={[styles.period, { color: ink }]}>{formatTime(`${now.getHours()}:${now.getMinutes()}`).split(' ')[1]}</Text>
      </View>
    </View>
  );
}

function checkpointDone(c: Task, tasks: Task[], completions: Completions, day: DayKey) {
  const limit = parseTime(c.time);
  return tasks.filter((t) => !t.checkpoint && parseTime(t.time) <= limit).every((t) => isDone(completions, day, t.id));
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  clock: { fontFamily: fonts.display, letterSpacing: -1, ...lining, includeFontPadding: false },
  period: { fontFamily: fonts.italic, fontSize: 15, marginTop: -4 },
});
