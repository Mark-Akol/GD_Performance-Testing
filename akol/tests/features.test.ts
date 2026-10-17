/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ALARM_REPEATS,
  FAMILY_ID,
  ONE_OFF_ROUTINE_ID,
  dayKey,
  planReminders,
  pruneOneOffs,
  tasksForDay,
  voiceFor,
} from '../src/lib/schedule.ts';
import { exampleFamily } from '../src/lib/seed.ts';
import {
  applyTicks,
  diffCompletions,
  makeBackup,
  normaliseFamilyCode,
  parseBackup,
} from '../src/lib/syncLogic.ts';
import type { AkolState, Task } from '../src/lib/types.ts';

// Wednesday 30 Sep 2026, local time.
const at = (hh: number, mm: number, day = 30) => new Date(2026, 8, day, hh, mm, 0, 0);
const SATURDAY = new Date(2026, 9, 3, 6, 0);

function withOneOff(state: AkolState, task: Partial<Task>): AkolState {
  return {
    ...state,
    routines: [...state.routines, { id: ONE_OFF_ROUTINE_ID, name: 'One-offs', days: [0, 1, 2, 3, 4, 5, 6], enabled: true }],
    tasks: [
      ...state.tasks,
      { id: 't_dentist', routineId: ONE_OFF_ROUTINE_ID, memberId: 'm_ra', title: 'Dentist', time: '15:30', ...task },
    ],
  };
}

describe('one-off tasks', () => {
  const s = withOneOff(exampleFamily(), { date: dayKey(at(8, 0, 31)) }); // Thu 1 Oct
  it('show only on their date', () => {
    assert.ok(tasksForDay(s, at(8, 0, 31)).some((t) => t.id === 't_dentist'));
    assert.ok(!tasksForDay(s, at(8, 0, 30)).some((t) => t.id === 't_dentist'));
    assert.ok(!tasksForDay(s, new Date(2026, 9, 2)).some((t) => t.id === 't_dentist'));
  });
  it('show on a weekend date too', () => {
    const sat = withOneOff(exampleFamily(), { date: dayKey(SATURDAY) });
    assert.ok(tasksForDay(sat, SATURDAY).some((t) => t.id === 't_dentist'));
  });
  it('get a reminder on their date', () => {
    const plan = planReminders(s, at(6, 0), { horizonDays: 4 });
    const r = plan.filter((p) => p.task.id === 't_dentist');
    assert.equal(r.length, 1);
    assert.equal(r[0].day, '2026-10-01');
  });
  it('are pruned two weeks after their date', () => {
    const tasks = withOneOff(exampleFamily(), { date: '2026-09-10' }).tasks;
    assert.ok(pruneOneOffs(tasks, at(8, 0)).every((t) => t.id !== 't_dentist'));
    assert.ok(pruneOneOffs(tasks, at(8, 0, 20)).some((t) => t.id === 't_dentist'));
    assert.equal(pruneOneOffs(tasks, at(8, 0)).length, tasks.length - 1);
  });
});

describe('alarm reminders', () => {
  const base = exampleFamily();
  const alarmed: AkolState = {
    ...base,
    tasks: base.tasks.map((t) => (t.id === 't_ra_lunch' ? { ...t, alert: 'alarm' } : t)),
  };
  const lunch = (s: AkolState) =>
    planReminders(s, at(6, 0)).filter((p) => p.task.id === 't_ra_lunch' && p.day === dayKey(at(6, 0)));
  it('ring again every 3 minutes until done', () => {
    const r = lunch(alarmed);
    assert.equal(r.length, ALARM_REPEATS + 1);
    assert.deepEqual(
      r.map((p) => p.repeat),
      [0, 1, 2, 3],
    );
    assert.equal(r[1].at.getTime() - r[0].at.getTime(), 3 * 60000);
  });
  it('ring once when repeats are turned off', () => {
    assert.equal(lunch({ ...alarmed, settings: { ...alarmed.settings, alarmRepeats: false } }).length, 1);
  });
  it('plain notifications ring once', () => {
    assert.equal(lunch(base).length, 1);
  });
});

describe('sync ticks', () => {
  it('diffs ticks and unticks', () => {
    const ticks = diffCompletions({ d1: { a: 5 } }, { d1: { b: 7 } }, 99);
    assert.deepEqual(
      ticks.sort((x, y) => x.taskId.localeCompare(y.taskId)),
      [
        { day: 'd1', taskId: 'a', done: false, at: 99 },
        { day: 'd1', taskId: 'b', done: true, at: 7 },
      ],
    );
  });
  it('applies a remote tick without moving an existing one', () => {
    const out = applyTicks({ d1: { a: 5 } }, [
      { day: 'd1', taskId: 'a', done: true, at: 9 },
      { day: 'd1', taskId: 'b', done: true, at: 9 },
    ]);
    assert.deepEqual(out, { d1: { a: 5, b: 9 } });
  });
  it('a later local tick beats an earlier remote untick', () => {
    assert.deepEqual(applyTicks({ d1: { a: 10 } }, [{ day: 'd1', taskId: 'a', done: false, at: 5 }]), { d1: { a: 10 } });
    assert.deepEqual(applyTicks({ d1: { a: 10 } }, [{ day: 'd1', taskId: 'a', done: false, at: 20 }]), { d1: {} });
  });
});

describe('backups', () => {
  it('round-trip', () => {
    const s = exampleFamily();
    const text = makeBackup(s, new Date(0));
    assert.ok(text.startsWith('AKOL BACKUP v1'));
    const parsed = parseBackup(`  ${text}\n`);
    assert.ok(parsed.ok);
    if (parsed.ok) {
      assert.deepEqual(parsed.data.tasks, s.tasks);
      assert.deepEqual(parsed.data.members, s.members);
    }
  });
  it('explain what is wrong with a bad paste', () => {
    assert.equal(parseBackup('hello').ok, false);
    assert.equal(parseBackup('AKOL BACKUP v1\n{"members": [').ok, false);
    assert.equal(parseBackup('AKOL BACKUP v1\n{"members": []}').ok, false);
  });
});

describe('family codes', () => {
  it('accept the code however it is typed', () => {
    assert.equal(normaliseFamilyCode('akol-ab3 xyz'), 'AB3XYZ');
    assert.equal(normaliseFamilyCode('AKOLAB3XYZ'), 'AB3XYZ');
    assert.equal(normaliseFamilyCode('ab3xyz99'), 'AB3XYZ');
  });
});

describe('voice alarms', () => {
  const base = exampleFamily();
  const alarmed: AkolState = {
    ...base,
    tasks: base.tasks.map((t) => (t.id === 't_ra_lunch' ? { ...t, alert: 'alarm' } : t)),
  };
  const rings = (s: AkolState) =>
    planReminders(s, at(6, 0)).filter((p) => p.task.id === 't_ra_lunch' && p.day === dayKey(at(6, 0)));
  const clip = { sound: 'akol_voice_mra_1.wav', uri: 'file:///voice.wav', recordedAt: 1 };

  it('ring first, then play a voice on the repeats', () => {
    assert.deepEqual(
      rings(alarmed).map((r) => voiceFor(alarmed, r)),
      [null, 'default', 'default', 'default'],
    );
  });
  it('use the recording made for that person', () => {
    const s = { ...alarmed, settings: { ...alarmed.settings, voices: { m_ra: clip } } };
    assert.deepEqual(voiceFor(s, rings(s)[1]), clip);
  });
  it('can be switched off', () => {
    const s = { ...alarmed, settings: { ...alarmed.settings, voiceAlarms: false } };
    assert.ok(rings(s).every((r) => voiceFor(s, r) === null));
  });
  it('Go time repeats in the family voice', () => {
    const s = { ...base, settings: { ...base.settings, voices: { [FAMILY_ID]: clip } } };
    const go = planReminders(s, at(6, 0)).filter((p) => p.task.id === 't_go' && p.day === dayKey(at(6, 0)));
    assert.equal(go.length, 4);
    assert.deepEqual(voiceFor(s, go[2]), clip);
  });
  it('plain notifications never use a voice', () => {
    assert.ok(planReminders(base, at(6, 0)).filter((p) => p.task.alert !== 'alarm').every((r) => voiceFor(base, r) === null));
  });
});
