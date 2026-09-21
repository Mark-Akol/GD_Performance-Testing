import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatTime, formatTimeLabel, parseTime, spread, wakingWindow } from '../time';

test('parseTime accepts valid 24h times', () => {
  assert.equal(parseTime('00:00'), 0);
  assert.equal(parseTime('06:30'), 390);
  assert.equal(parseTime('23:59'), 1439);
});

test('parseTime rejects malformed input rather than guessing', () => {
  for (const bad of ['24:00', '6:30', '06:60', '', 'lunch']) {
    assert.throws(() => parseTime(bad), /Invalid time/);
  }
});

test('formatTime round-trips parseTime', () => {
  for (const t of ['00:00', '07:05', '12:30', '23:55']) {
    assert.equal(formatTime(parseTime(t)), t);
  }
});

test('formatTimeLabel renders 12-hour labels with correct noon and midnight', () => {
  assert.equal(formatTimeLabel(0), '12:00 am');
  assert.equal(formatTimeLabel(720), '12:00 pm');
  assert.equal(formatTimeLabel(825), '1:45 pm');
});

test('wakingWindow handles a sleep time past midnight', () => {
  const w = wakingWindow('06:30', '00:30');
  assert.equal(w.start, 390);
  assert.equal(w.end, 1470);
  assert.ok(w.end > w.start);
});

test('spread stays inside the window and keeps even gaps', () => {
  const points = spread(0, 100, 4);
  assert.deepEqual(points, [13, 38, 63, 88]);
  assert.ok(points.every((p) => p > 0 && p < 100));
});

test('spread degenerates safely', () => {
  assert.deepEqual(spread(0, 100, 0), []);
  assert.deepEqual(spread(0, 100, 1), [50]);
});
