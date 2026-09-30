/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkpointSummary,
  dayKey,
  describeDays,
  formatTime,
  nextUp,
  overdue,
  planReminders,
  progress,
  pruneCompletions,
  streak,
  taskStatus,
  tasksForDay,
  toClockTime,
} from '../src/lib/schedule.ts';
import { exampleFamily } from '../src/lib/seed.ts';
import type { AkolState } from '../src/lib/types.ts';

// Wednesday 30 Sep 2026, local time.
const at = (hh: number, mm: number, day = 30) => new Date(2026, 8, day, hh, mm, 0, 0);
const WED = at(6, 0);
const SATURDAY = new Date(2026, 9, 3, 6, 0); // Sat 3 Oct 2026

function withDone(state: AkolState, day: Date, ids: string[]): AkolState {
  const k = dayKey(day);
  return {
    ...state,
    completions: { ...state.completions, [k]: Object.fromEntries(ids.map((id) => [id, 1])) },
  };
}

describe('time helpers', () => {
  it('formats 12-hour times', () => {
    assert.equal(formatTime('06:45'), '6:45 a.m.');
    assert.equal(formatTime('00:05'), '12:05 a.m.');
    assert.equal(formatTime('12:00'), '12:00 noon');
    assert.equal(formatTime('12:30'), '12:30 p.m.');
    assert.equal(formatTime('19:30'), '7:30 p.m.');
  });
  it('wraps clock arithmetic around midnight', () => {
    assert.equal(toClockTime(-5), '23:55');
    assert.equal(toClockTime(24 * 60 + 10), '00:10');
  });
  it('describes day sets', () => {
    assert.equal(describeDays([1, 2, 3, 4, 5]), 'Weekdays');
    assert.equal(describeDays([6, 0]), 'Weekends');
    assert.equal(describeDays([0, 1, 2, 3, 4, 5, 6]), 'Every day');
    assert.equal(describeDays([0, 1, 3]), 'Mon · Wed · Sun');
  });
});

describe('tasksForDay', () => {
  const s = exampleFamily();
  it('includes weekday routines on a Wednesday, sorted by time', () => {
    const tasks = tasksForDay(s, WED);
    assert.ok(tasks.length > 10);
    const times = tasks.map((t) => t.time);
    assert.deepEqual(times, [...times].sort());
  });
  it('skips the school routine on Saturday', () => {
    assert.equal(tasksForDay(s, SATURDAY).filter((t) => t.routineId === 'r_school').length, 0);
  });
  it("includes family items in a member's list but not other members'", () => {
    const ra = tasksForDay(s, WED, 'm_ra');
    assert.ok(ra.some((t) => t.id === 't_go'));
    assert.ok(!ra.some((t) => t.memberId === 'm_mark'));
  });
  it('ignores paused routines', () => {
    const paused = { ...s, routines: s.routines.map((r) => ({ ...r, enabled: false })) };
    assert.equal(tasksForDay(paused, WED).length, 0);
  });
});

describe('status & progress', () => {
  const s = exampleFamily();
  const lunch = s.tasks.find((t) => t.id === 't_ra_lunch')!; // 06:45
  it('moves from upcoming → soon → due → overdue', () => {
    assert.equal(taskStatus(lunch, false, at(6, 0)), 'upcoming');
    assert.equal(taskStatus(lunch, false, at(6, 35)), 'soon');
    assert.equal(taskStatus(lunch, false, at(6, 47)), 'due');
    assert.equal(taskStatus(lunch, false, at(7, 0)), 'overdue');
    assert.equal(taskStatus(lunch, true, at(7, 0)), 'done');
  });
  it('does not count checkpoints toward progress', () => {
    const tasks = tasksForDay(s, WED, 'm_ra');
    const p = progress(tasks, {}, dayKey(WED));
    assert.equal(p.total, tasks.filter((t) => !t.checkpoint).length);
  });
  it('lists overdue items only', () => {
    const tasks = tasksForDay(s, WED, 'm_ra');
    const late = overdue(tasks, {}, dayKey(WED), at(6, 50));
    assert.deepEqual(
      late.map((t) => t.id),
      ['t_ra_up', 't_ra_teeth', 't_ra_dress'],
    );
  });
  it('picks the item due now before later items', () => {
    const tasks = tasksForDay(s, WED, 'm_ra');
    assert.equal(nextUp(tasks, {}, dayKey(WED), at(6, 52))?.task.id, 't_ra_lunch');
  });
});

describe('checkpoint "Go time"', () => {
  it('reports outstanding items across the whole family up to 7:30', () => {
    const s = withDone(exampleFamily(), WED, ['t_ra_teeth', 't_ra_lunch', 't_mk_gps']);
    const go = s.tasks.find((t) => t.id === 't_go')!;
    const sum = checkpointSummary(go, s, s.completions, dayKey(WED));
    assert.equal(sum.done.length, 3);
    assert.ok(sum.outstanding.some((t) => t.id === 't_ra_bags'));
    assert.ok(!sum.outstanding.some((t) => t.routineId !== 'r_school'));
    assert.equal(sum.complete, false);
  });
  it('is complete once everything is ticked', () => {
    const base = exampleFamily();
    const ids = base.tasks.filter((t) => t.routineId === 'r_school' && !t.checkpoint).map((t) => t.id);
    const s = withDone(base, WED, ids);
    const go = s.tasks.find((t) => t.id === 't_go')!;
    assert.equal(checkpointSummary(go, s, s.completions, dayKey(WED)).complete, true);
  });
});

describe('planReminders', () => {
  it('schedules only future reminders, soonest first', () => {
    const s = exampleFamily();
    const plan = planReminders(s, at(6, 40));
    assert.ok(plan.length > 0);
    assert.ok(plan.every((p) => p.at.getTime() > at(6, 40).getTime()));
    const times = plan.map((p) => p.at.getTime());
    assert.deepEqual(times, [...times].sort((a, b) => a - b));
    assert.equal(plan[0].task.id, 't_ra_clothes');
  });
  it('skips items already ticked off when smartSkip is on', () => {
    const s = withDone(exampleFamily(), WED, ['t_ra_lunch']);
    assert.ok(!planReminders(s, at(6, 40)).some((p) => p.task.id === 't_ra_lunch' && p.day === dayKey(WED)));
    const noSkip = { ...s, settings: { ...s.settings, smartSkip: false } };
    assert.ok(planReminders(noSkip, at(6, 40)).some((p) => p.task.id === 't_ra_lunch' && p.day === dayKey(WED)));
  });
  it('filters by the members this device follows but keeps family checkpoints', () => {
    const s = exampleFamily();
    const markOnly = { ...s, settings: { ...s.settings, notifyFor: ['m_mark'] } };
    const plan = planReminders(markOnly, at(6, 0));
    assert.ok(!plan.some((p) => p.task.memberId === 'm_ra'));
    assert.ok(plan.some((p) => p.task.id === 't_go'));
  });
  it('respects the pending-notification cap', () => {
    assert.ok(planReminders(exampleFamily(), at(0, 1), { horizonDays: 30, limit: 60 }).length <= 60);
  });
});

describe('streak', () => {
  it('counts consecutive fully-completed scheduled days and skips unscheduled ones', () => {
    let s = exampleFamily();
    const raIds = (d: Date) => tasksForDay(s, d, 'm_ra').filter((t) => t.memberId === 'm_ra').map((t) => t.id);
    // Mon 28, Tue 29 complete; Wed 30 (today) in progress.
    for (const d of [28, 29]) s = withDone(s, at(8, 0, d), raIds(at(8, 0, d)));
    assert.equal(streak(s, 'm_ra', at(8, 0, 30)), 2);
  });
});

describe('pruneCompletions', () => {
  it('drops old history', () => {
    const out = pruneCompletions({ '2020-01-01': { a: 1 }, '2026-09-29': { b: 1 } }, WED, 30);
    assert.deepEqual(Object.keys(out), ['2026-09-29']);
  });
});
