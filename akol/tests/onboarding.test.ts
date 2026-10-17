/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPlan,
  defaultAnswers,
  defaultPicks,
  planDay,
  planWeek,
  type Anchor,
  type OnboardingAnswers,
} from '../src/lib/onboarding.ts';
import { FAMILY_ID, ONE_OFF_ROUTINE_ID, tasksForDay } from '../src/lib/schedule.ts';

const anchor = (over: Partial<Anchor>): Anchor => ({ id: 'a', who: 'me', title: 'Work', days: [1, 2, 3, 4, 5], time: '08:00', travel: 20, stops: [], ...over });

/** Mark and Ra: clock in 7:30 weekdays via the school run, sets Fri night and Sat morning; Mum's shift at 5 p.m. */
function markAndRa(over: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  const a: OnboardingAnswers = {
    ...defaultAnswers(),
    household: 'family',
    myName: 'Mark',
    people: [
      { name: 'Ama', role: 'parent' },
      { name: 'Ra', role: 'child' },
    ],
    typicalWake: '05:15',
    anchors: [
      anchor({ id: 'work', title: 'Clock in at work', time: '07:30', travel: 25, stops: [{ label: 'School drop-off', minutes: 15, kids: true }] }),
      anchor({ id: 'set-fri', title: 'My set', days: [5], time: '22:30', travel: 30 }),
      anchor({ id: 'set-sat', title: 'My set', days: [6], time: '10:00', travel: 30 }),
      anchor({ id: 'shift', who: 0, title: 'Shift starts', time: '17:00', travel: 20 }),
    ],
    ...over,
  };
  return { ...a, picks: defaultPicks(a) };
}

const at = (items: { title: string; time: string }[], title: string) => items.find((i) => i.title === title)?.time;

describe('planning around non-negotiables', () => {
  it('works back from clocking in through the journey, the school run and a buffer', () => {
    const { items, insight } = planDay(markAndRa(), 1);
    // 7:30 − 25 min drive − 15 min drop-off − 5 min spare = 6:45
    assert.equal(at(items, 'Go time'), '06:45');
    assert.equal(at(items, 'Clock in at work'), '07:30');
    assert.equal(insight.leave, '06:45');
    // Kids' tasks end just as everyone leaves.
    assert.equal(at(items, 'Shoes & jacket on'), '06:40');
    assert.equal(at(items, 'Wake Ra'), at(items, 'Up, bed made'));
  });

  it('turns spare time before the day into time for yourself', () => {
    const { items, insight } = planDay(markAndRa(), 1);
    // 65 minutes of getting ready before 6:45 means up by 5:40; usually up at 5:15.
    assert.equal(insight.meTime, 25);
    assert.equal(insight.earlier, 0);
    assert.equal(at(items, 'Wake up'), '05:15');
    assert.equal(at(items, 'Me time ☕'), '05:15');
  });

  it('says plainly when you would need to get up earlier than usual', () => {
    const { items, insight } = planDay(markAndRa({ typicalWake: '06:00' }), 1);
    assert.equal(insight.meTime, 0);
    assert.equal(insight.earlier, 20);
    assert.equal(at(items, 'Wake up'), '05:40');
    assert.equal(at(items, 'Me time ☕'), undefined);
  });

  it('plans evening non-negotiables with time to get ready', () => {
    const { items } = planDay(markAndRa(), 5);
    assert.equal(at(items, 'Leave for my set'), '21:55');
    assert.equal(at(items, 'Get ready for my set'), '21:35');
    assert.equal(at(items, 'Leave for shift starts'), '16:35');
  });

  it('gives a Saturday-morning set its own getting-ready routine, without the school run', () => {
    const { items } = planDay(markAndRa(), 6);
    assert.equal(at(items, 'Leave for my set'), '09:25');
    assert.equal(at(items, 'Go time'), undefined);
    assert.ok(!items.some((i) => i.owner === 'kids' && i.part === 'day'));
    assert.ok(!items.some((i) => i.title === 'Pack lunches'));
  });

  it('caps time to yourself and lets you sleep in on a late start', () => {
    const { items, insight } = planDay(markAndRa(), 6);
    assert.equal(insight.meTime, 45);
    // 55 min getting ready before a 9:25 leave starts at 8:30; 45 min to yourself first means up at 7:45, not 5:15.
    assert.equal(insight.wake, '07:45');
    assert.equal(insight.sleepIn, 150);
    assert.equal(at(items, 'Wake up'), '07:45');
  });

  it('groups days that work out the same', () => {
    const names = planWeek(markAndRa()).map((g) => g.name);
    assert.deepEqual(names, ['Mon, Tue, Wed, Thu', 'Friday', 'Saturday', 'Evenings']);
  });
});

describe('building the household', () => {
  it('creates members, routines and tasks with durations and fixed times', () => {
    const plan = buildPlan(markAndRa());
    assert.deepEqual(plan.members.map((m) => m.name), ['Mark', 'Ama', 'Ra']);
    const mon = new Date(2026, 9, 19, 6, 0);
    const today = tasksForDay(plan, mon);
    const go = today.find((t) => t.title === 'Go time')!;
    assert.equal(go.memberId, FAMILY_ID);
    assert.equal(go.checkpoint, true);
    assert.equal(go.alert, 'alarm');
    const clockIn = today.find((t) => t.title === 'Clock in at work')!;
    assert.equal(clockIn.fixed, true);
    assert.equal(clockIn.remind, false);
    assert.equal(today.find((t) => t.title === 'Breakfast' && t.memberId === plan.members[2].id)?.duration, 15);
    const shift = today.find((t) => t.title === 'Leave for shift starts')!;
    assert.equal(shift.memberId, plan.members[1].id);
    const sun = new Date(2026, 9, 18, 6, 0);
    assert.ok(!tasksForDay(plan, sun).some((t) => t.title === 'Go time'));
    assert.ok(tasksForDay(plan, sun).some((t) => t.title === 'Lights out'));
  });

  it('falls back to “when do you leave” without morning non-negotiables, and adds one-offs', () => {
    const a = markAndRa({ anchors: [], leaveAt: '08:15', oneOffs: [{ title: 'Dentist', date: '2026-10-20', time: '15:30' }] });
    const plan = buildPlan(a);
    const tue = new Date(2026, 9, 20, 6, 0);
    assert.equal(tasksForDay(plan, tue).find((t) => t.title === 'Go time')?.time, '08:15');
    assert.ok(tasksForDay(plan, tue).some((t) => t.title === 'Dentist' && t.routineId === ONE_OFF_ROUTINE_ID));
  });

  it('keeps a solo plan as your own', () => {
    const a: OnboardingAnswers = { ...defaultAnswers(), household: 'solo', myName: 'Sam', anchors: [anchor({ time: '09:00', travel: 30 })], loud: false };
    const plan = buildPlan({ ...a, picks: defaultPicks(a) });
    assert.equal(plan.members.length, 1);
    const leave = plan.tasks.find((t) => t.title === 'Leave for work')!;
    assert.equal(leave.memberId, plan.members[0].id);
    assert.equal(leave.time, '08:25');
    assert.equal(leave.alert, undefined);
  });
});
