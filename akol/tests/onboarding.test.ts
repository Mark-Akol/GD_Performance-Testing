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

const anchor = (over: Partial<Anchor>): Anchor => ({
  id: 'a',
  who: 'me',
  title: 'Work',
  days: [1, 2, 3, 4, 5],
  time: '08:00',
  travel: 20,
  stops: [],
  home: 'drive',
  back: [],
  ...over,
});

const AMA = 0;
const RA = 1;
const AVOCADO = 2;

/**
 * Mark's week: drop Ra (and Avocado) at creche near home, drop Ama in Century City, clock in at
 * Newlands at 7:30; on the way home collect Ama, then Ra and Avocado. Sets on Friday 10:30 p.m.
 * and Saturday 10 p.m. Ama's hours are placeholders until confirmed.
 */
function marksWeek(over: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  const a: OnboardingAnswers = {
    ...defaultAnswers(),
    household: 'family',
    myName: 'Mark',
    people: [
      { name: 'Ama', role: 'parent' },
      { name: 'Ra', role: 'child' },
      { name: 'Avocado', role: 'pet' },
    ],
    petPlans: { [AVOCADO]: { weekdays: 'creche', weekends: 'nap' } },
    typicalWake: '05:15',
    anchors: [
      anchor({
        id: 'work',
        title: 'Clock in at work',
        time: '07:30',
        end: '17:00',
        travel: 30,
        stops: [
          { label: 'Creche drop-off', minutes: 5, kind: 'kids' },
          { label: 'Drop Ama at work', minutes: 5, kind: 'person', person: AMA },
        ],
        back: [
          { label: 'Pick up Ama', minutes: 5, kind: 'person', person: AMA },
          { label: 'Creche pick-up', minutes: 5, kind: 'kids' },
        ],
      }),
      anchor({ id: 'ama', who: AMA, title: 'Clock in at work', time: '08:00', end: '17:00', travel: 20, home: 'lift' }),
      anchor({ id: 'set-fri', title: 'My set', days: [5], time: '22:30', travel: 30 }),
      anchor({ id: 'set-sat', title: 'My set', days: [6], time: '22:00', travel: 30 }),
    ],
    ...over,
  };
  return { ...a, picks: defaultPicks(a) };
}

const at = (items: { title: string; time: string }[], title: string) => items.find((i) => i.title === title)?.time;

describe('the morning trip', () => {
  it('works back from clocking in through creche, puppy creche, dropping Ama, the journey and a buffer', () => {
    const { items, insight } = planDay(marksWeek(), 1);
    // 7:30 − 30 min journey − 5 creche − 5 Ama − 5 puppy creche − 5 spare = 6:40
    assert.equal(at(items, 'Go time'), '06:40');
    assert.equal(insight.leave, '06:40');
    assert.equal(at(items, 'Drop Ra at creche'), '06:45');
    assert.equal(at(items, 'Drop Avocado at puppy creche'), '06:45');
    // Ama rides along, so she has no leave time of her own.
    assert.ok(!items.some((i) => i.owner === AMA && i.kind === 'leave'));
    assert.equal(at(items, 'Shoes & jacket on'), '06:35');
  });

  it('leaves early enough for the person being dropped off', () => {
    const a = marksWeek();
    a.anchors[1] = { ...a.anchors[1], time: '07:00' };
    // Ama's 7:00 start, 20 min away, after 10 min of creche stops, with 5 spare: leave by 6:25.
    assert.equal(at(planDay(a, 1).items, 'Go time'), '06:25');
  });

  it('fits pet care into your getting-ready time and wakes you when you need to be up', () => {
    const { items, insight } = planDay(marksWeek(), 1);
    assert.ok(items.some((i) => i.title === 'Walk Avocado' && i.owner === 'me'));
    // 85 min of your tasks before 6:40 starts at 5:15, your usual time: no spare, no early start.
    assert.equal(insight.wake, '05:15');
    assert.equal(insight.meTime, 0);
    assert.equal(insight.earlier, 0);
  });
});

describe('the trip home', () => {
  it('collects Ama, then Ra and Avocado near home', () => {
    const { items, insight } = planDay(marksWeek(), 1);
    assert.equal(at(items, 'Leave for home'), '17:00');
    // Century City is 10 min closer to home than Newlands.
    assert.equal(at(items, 'Pick up Ama'), '17:10');
    assert.equal(at(items, 'Pick up Ra from creche'), '17:30');
    assert.equal(at(items, 'Pick up Avocado from puppy creche'), '17:35');
    assert.equal(at(items, 'Home 🏠'), '17:45');
    assert.deepEqual(insight.creche, { from: '06:45', to: '17:30', by: 'Mark' });
  });

  it('waits when Ama finishes later than you pass', () => {
    const a = marksWeek();
    a.anchors[1] = { ...a.anchors[1], end: '17:30' };
    const pick = planDay(a, 1).items.find((i) => i.title === 'Pick up Ama')!;
    assert.equal(pick.time, '17:30');
    assert.equal(pick.note, '20 min wait');
  });

  it('plans a cab home when nobody picks someone up', () => {
    const a = marksWeek();
    a.anchors[0] = { ...a.anchors[0], back: [{ label: 'Creche pick-up', minutes: 5, kind: 'kids' }] };
    const { items, insight } = planDay(a, 1);
    assert.equal(items.find((i) => i.title === 'Order a cab home 🚕')?.owner, AMA);
    assert.ok(insight.warnings.some((w) => w.includes('Nobody is picking Ama up')));
  });
});

describe('who has Ra', () => {
  it('finds no gaps on a normal weekday or Friday night', () => {
    assert.deepEqual(planDay(marksWeek(), 1).insight.gaps, []);
    assert.deepEqual(planDay(marksWeek(), 5).insight.gaps, []);
  });

  it('flags when nobody collects Ra from creche', () => {
    const a = marksWeek();
    a.anchors[0] = { ...a.anchors[0], back: [{ label: 'Pick up Ama', minutes: 5, kind: 'person', person: AMA }] };
    const { insight } = planDay(a, 1);
    assert.ok(insight.warnings.some((w) => w.startsWith('Who collects Ra from creche')));
    assert.equal(insight.gaps[0].from, '06:45');
  });

  it('flags a night when both grown-ups are out', () => {
    const a = marksWeek();
    a.anchors.push(anchor({ id: 'ama-fri', who: AMA, title: 'Night out', days: [5], time: '21:00', travel: 15 }));
    const gaps = planDay(a, 5).insight.gaps;
    assert.equal(gaps[0].from, '21:55');
  });
});

describe('pets', () => {
  it('gives Avocado puppy creche on weekdays and a nap at weekends', () => {
    assert.ok(planDay(marksWeek(), 1).items.some((i) => i.owner === AVOCADO && i.title === 'Puppy creche 🐾'));
    assert.ok(planDay(marksWeek(), 6).items.some((i) => i.owner === AVOCADO && i.title === 'Napping at home 😴'));
  });
});

describe('the week', () => {
  it('plans evening sets with time to get ready, and groups days that work out the same', () => {
    assert.equal(at(planDay(marksWeek(), 5).items, 'Leave for my set'), '21:55');
    assert.equal(at(planDay(marksWeek(), 6).items, 'Leave for my set'), '21:25');
    assert.equal(at(planDay(marksWeek(), 6).items, 'Get ready for my set'), '21:05');
    assert.deepEqual(
      planWeek(marksWeek()).map((g) => g.name),
      ['Mon, Tue, Wed, Thu', 'Friday', 'Saturday', 'Sunday', 'Evenings'],
    );
  });

  it('caps time to yourself and lets you sleep in on a late start', () => {
    const a = marksWeek({ anchors: [anchor({ id: 'late', title: 'Clock in at work', time: '10:00', travel: 30 })] });
    const { insight } = planDay(a, 1);
    assert.equal(insight.meTime, 45);
    assert.ok(insight.sleepIn > 0);
  });

  it('says plainly when you would need to get up earlier than usual', () => {
    const { insight } = planDay(marksWeek({ typicalWake: '06:00' }), 1);
    assert.equal(insight.earlier, 45);
    assert.equal(insight.wake, '05:15');
  });
});

describe('building the household', () => {
  it('creates members (Avocado as a pet), fixed times and the Go time checkpoint', () => {
    const plan = buildPlan(marksWeek());
    assert.deepEqual(plan.members.map((m) => [m.name, m.role]), [
      ['Mark', 'parent'],
      ['Ama', 'parent'],
      ['Ra', 'child'],
      ['Avocado', 'pet'],
    ]);
    const mon = tasksForDay(plan, new Date(2026, 9, 19, 6, 0));
    const go = mon.find((t) => t.title === 'Go time')!;
    assert.equal(go.memberId, FAMILY_ID);
    assert.equal(go.checkpoint, true);
    assert.equal(go.alert, 'alarm');
    assert.equal(mon.find((t) => t.title === 'Creche 🧸')?.free, true);
    assert.equal(mon.find((t) => t.title === 'Puppy creche 🐾')?.memberId, plan.members[3].id);
    assert.equal(mon.find((t) => t.title === 'Clock in at work' && t.memberId === plan.members[0].id)?.fixed, true);
  });

  it('falls back to “when do you leave” without morning non-negotiables, and adds one-offs', () => {
    const a = marksWeek({ anchors: [], leaveAt: '08:15', oneOffs: [{ title: 'Dentist', date: '2026-10-20', time: '15:30' }] });
    const plan = buildPlan(a);
    const tue = tasksForDay(plan, new Date(2026, 9, 20, 6, 0));
    assert.equal(tue.find((t) => t.title === 'Go time')?.time, '08:15');
    assert.ok(tue.some((t) => t.title === 'Dentist' && t.routineId === ONE_OFF_ROUTINE_ID));
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
