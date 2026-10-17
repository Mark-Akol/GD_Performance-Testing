/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPlan, defaultAnswers, defaultPicks, suggestionsFor, type OnboardingAnswers } from '../src/lib/onboarding.ts';
import { FAMILY_ID, ONE_OFF_ROUTINE_ID, tasksForDay } from '../src/lib/schedule.ts';

const family = (over: Partial<OnboardingAnswers> = {}): OnboardingAnswers => ({
  ...defaultAnswers(),
  household: 'kids',
  myName: 'Mark',
  people: [{ name: 'Ra', role: 'child' }],
  routines: ['morning', 'evening'],
  ...over,
});

describe('onboarding', () => {
  it('times suggestions back from when you leave', () => {
    const s = suggestionsFor(family({ leaveAt: '07:30' }));
    assert.equal(s.find((x) => x.id === 'm_kid_shoes')?.time, '07:25');
    assert.equal(s.find((x) => x.id === 'e_kid_teeth')?.time, '19:30');
    const times = s.map((x) => x.time);
    assert.deepEqual(times, [...times].sort());
  });
  it('only suggests kids’ tasks when there are kids', () => {
    const solo = { ...family(), household: 'solo' as const };
    assert.ok(suggestionsFor(solo).every((x) => x.who === 'me'));
    assert.ok(suggestionsFor(family()).some((x) => x.who === 'kids'));
  });
  it('pre-ticks the tasks that answer your struggles', () => {
    const a = family({ struggles: ['door'] });
    const picks = defaultPicks(a);
    assert.ok(picks.includes('m_kid_shoes'));
    assert.ok(!picks.includes('m_kid_bag'));
  });
  it('builds a household with a Go time for everyone', () => {
    const a = family();
    const plan = buildPlan({ ...a, picks: defaultPicks(a) });
    assert.deepEqual(plan.members.map((m) => m.name), ['Mark', 'Ra']);
    assert.equal(plan.settings.meId, plan.members[0].id);
    assert.equal(plan.settings.onboarded, true);
    const go = plan.tasks.find((t) => t.title === 'Go time')!;
    assert.equal(go.memberId, FAMILY_ID);
    assert.equal(go.alert, 'alarm');
    const ra = plan.members[1];
    assert.ok(plan.tasks.some((t) => t.memberId === ra.id && t.title === 'Brush teeth'));
  });
  it('runs weekday mornings on weekdays only, and adds one-offs on their day', () => {
    const a = family({ oneOffs: [{ title: 'Dentist', date: '2026-10-20', time: '15:30' }] });
    const plan = buildPlan({ ...a, picks: defaultPicks(a) });
    const sat = new Date(2026, 9, 17, 6, 0);
    const tue = new Date(2026, 9, 20, 6, 0);
    assert.ok(!tasksForDay(plan, sat).some((t) => t.title === 'Go time'));
    assert.ok(tasksForDay(plan, tue).some((t) => t.title === 'Go time'));
    assert.ok(tasksForDay(plan, tue).some((t) => t.title === 'Dentist' && t.routineId === ONE_OFF_ROUTINE_ID));
    assert.ok(!tasksForDay(plan, sat).some((t) => t.title === 'Dentist'));
  });
  it('keeps a solo checkpoint as your own', () => {
    const a = { ...family(), household: 'solo' as const, loud: false };
    const plan = buildPlan({ ...a, picks: defaultPicks(a) });
    assert.equal(plan.members.length, 1);
    const go = plan.tasks.find((t) => t.title === 'Go time')!;
    assert.equal(go.memberId, plan.members[0].id);
    assert.equal(go.alert, 'notify');
  });
});
