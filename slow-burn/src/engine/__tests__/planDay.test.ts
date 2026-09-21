import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planDay } from '../planDay';
import { dailyWaterTargetMl } from '../hydration';
import { parseTime } from '../time';
import { allCoached, goals, setting } from './fixtures';

const WEDNESDAY = 3;
const DAY = '2026-04-15';

test('a coached day produces a plan across every enabled domain', () => {
  const plan = planDay({ goals: goals(), settings: allCoached(), day: DAY, dayOfWeek: WEDNESDAY });
  const domains = new Set(plan.items.map((i) => i.domain));

  assert.ok(plan.items.length > 0);
  for (const d of ['hydration', 'nutrition', 'movement', 'screen_break', 'training']) {
    assert.ok(domains.has(d as never), `expected ${d} in plan`);
  }
});

test('items are ordered and never collide', () => {
  const plan = planDay({ goals: goals(), settings: allCoached(), day: DAY, dayOfWeek: WEDNESDAY });

  for (let i = 1; i < plan.items.length; i += 1) {
    const prev = plan.items[i - 1]!;
    const curr = plan.items[i]!;
    assert.ok(
      curr.minuteOfDay - prev.minuteOfDay >= 10,
      `${prev.domain}@${prev.minuteOfDay} and ${curr.domain}@${curr.minuteOfDay} are too close`,
    );
  }
});

test('nothing is scheduled while the user is asleep', () => {
  const g = goals({ wakeTime: '06:30', sleepTime: '22:30' });
  const plan = planDay({ goals: g, settings: allCoached(), day: DAY, dayOfWeek: WEDNESDAY });

  for (const item of plan.items) {
    assert.ok(item.minuteOfDay >= parseTime('06:30'), `${item.domain} fires before wake`);
    assert.ok(item.minuteOfDay <= parseTime('22:30'), `${item.domain} fires after sleep`);
  }
});

test('water prompts stop well before bedtime', () => {
  const plan = planDay({ goals: goals(), settings: allCoached(), day: DAY, dayOfWeek: WEDNESDAY });
  const water = plan.items.filter((i) => i.domain === 'hydration');
  const last = water[water.length - 1]!;

  assert.ok(last.minuteOfDay <= parseTime('22:30') - 60, 'last water prompt is too close to sleep');
});

test('a disabled domain contributes nothing', () => {
  const settings = allCoached().map((s) =>
    s.domain === 'screen_break' ? { ...s, enabled: false } : s,
  );
  const plan = planDay({ goals: goals(), settings, day: DAY, dayOfWeek: WEDNESDAY });

  assert.equal(plan.items.filter((i) => i.domain === 'screen_break').length, 0);
});

test('preset mode uses the user times and ignores the coached rules', () => {
  const settings = [
    setting('hydration', { mode: 'preset', presetTimes: ['08:00', '12:00', '16:00'] }),
  ];
  const plan = planDay({ goals: goals(), settings, day: DAY, dayOfWeek: WEDNESDAY });

  assert.deepEqual(
    plan.items.map((i) => i.minuteOfDay),
    [480, 720, 960],
  );
});

test('preset mode with no times configured schedules nothing rather than falling back', () => {
  const settings = [setting('hydration', { mode: 'preset', presetTimes: [] })];
  const plan = planDay({ goals: goals(), settings, day: DAY, dayOfWeek: WEDNESDAY });

  assert.equal(plan.items.length, 0);
});

test('a malformed stored time drops one prompt, not the whole day', () => {
  const settings = [
    setting('hydration', { mode: 'preset', presetTimes: ['08:00', 'not-a-time', '16:00'] }),
  ];
  const plan = planDay({ goals: goals(), settings, day: DAY, dayOfWeek: WEDNESDAY });

  assert.deepEqual(
    plan.items.map((i) => i.minuteOfDay),
    [480, 960],
  );
});

test('training only lands on the pattern days for the chosen frequency', () => {
  const settings = [setting('training')];
  const g = goals({ trainingDays: 3 }); // Mon / Wed / Fri
  const trainingOn = (dow: number) =>
    planDay({ goals: g, settings, day: DAY, dayOfWeek: dow }).items.length;

  assert.equal(trainingOn(1), 1, 'Monday should be a training day');
  assert.equal(trainingOn(3), 1, 'Wednesday should be a training day');
  assert.equal(trainingOn(5), 1, 'Friday should be a training day');
  assert.equal(trainingOn(0), 0, 'Sunday should be a rest day');
  assert.equal(trainingOn(2), 0, 'Tuesday should be a rest day');
});

test('water target scales with weight and activity but stays inside safe bounds', () => {
  assert.ok(dailyWaterTargetMl(goals({ weightKg: 80, activityLevel: 'sedentary' })) > 2000);
  assert.ok(
    dailyWaterTargetMl(goals({ weightKg: 80, activityLevel: 'athlete' })) >
      dailyWaterTargetMl(goals({ weightKg: 80, activityLevel: 'sedentary' })),
  );
  // A nonsense weight must not produce a dangerous target.
  assert.ok(dailyWaterTargetMl(goals({ weightKg: 400 })) <= 4500);
  assert.ok(dailyWaterTargetMl(goals({ weightKg: 5 })) >= 1500);
  assert.ok(dailyWaterTargetMl(goals({ weightKg: null })) >= 1500);
});

test('allergies and dietary pattern are respected in meal suggestions', () => {
  const settings = [setting('nutrition')];
  const g = goals({ dietaryPattern: 'vegan', allergies: ['nuts', 'gluten'] });
  const plan = planDay({ goals: g, settings, day: DAY, dayOfWeek: WEDNESDAY });

  assert.ok(plan.items.length > 0);
  for (const item of plan.items) {
    assert.ok(item.detail.length > 0);
    assert.ok(!/almond|peanut/i.test(item.detail), `suggested a nut item: ${item.detail}`);
  }
});

test('the plan is deterministic for a given day', () => {
  const a = planDay({ goals: goals(), settings: allCoached(), day: DAY, dayOfWeek: WEDNESDAY });
  const b = planDay({ goals: goals(), settings: allCoached(), day: DAY, dayOfWeek: WEDNESDAY });
  assert.deepEqual(a, b);
});

test('meal suggestions rotate across days', () => {
  const settings = [setting('nutrition')];
  const detailsFor = (day: string) =>
    planDay({ goals: goals(), settings, day, dayOfWeek: WEDNESDAY }).items.map((i) => i.detail).join('|');

  assert.notEqual(detailsFor('2026-04-15'), detailsFor('2026-04-16'));
});

test('an early riser with a late bedtime still gets a sane plan', () => {
  const g = goals({ wakeTime: '04:30', sleepTime: '00:30', workStart: '06:00', workEnd: '15:00' });
  const plan = planDay({ goals: g, settings: allCoached(), day: DAY, dayOfWeek: WEDNESDAY });

  assert.ok(plan.items.length > 0);
  for (const item of plan.items) {
    assert.ok(item.minuteOfDay >= 0 && item.minuteOfDay < 1440);
  }
});
