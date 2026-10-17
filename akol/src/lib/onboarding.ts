// Turns the first-run questionnaire into a planned week. Pure, so it can be unit-tested.
//
// The plan is built around non-negotiables: times that don't move, like clocking in at 7:30.
// For each day Akol works back from each one through the journey, any stops on the way and a
// small buffer to a leave time, lays everyone's tasks out back to back before it, and works out
// when you really need to wake up. Spare time before that becomes time for yourself.
import { FAMILY_ID, ONE_OFF_ROUTINE_ID, parseTime, toClockTime } from './schedule.ts';
import { emptyState, uid } from './seed.ts';
import type { AkolState, ClockTime, DayKey, JewelKey, Member, MemberRole, Routine, Task, Weekday } from './types.ts';

export type Household = 'solo' | 'kids' | 'family';
export type Struggle = 'door' | 'forget' | 'ignore' | 'bedtime' | 'week';
export type RoutineKind = 'morning' | 'evening';

export interface Person {
  name: string;
  role: MemberRole;
}

export interface OneOff {
  title: string;
  date: DayKey;
  time: ClockTime;
}

/** A stop on the way, like dropping the kids at school. */
export interface Stop {
  label: string;
  minutes: number;
  /** Getting the kids out of the door is part of this trip. */
  kids?: boolean;
}

/** A time that doesn't move: clocking in, a shift, a set, school starting. */
export interface Anchor {
  id: string;
  /** 'me' for the person setting up, or an index into `people`. */
  who: 'me' | number;
  title: string;
  days: Weekday[];
  time: ClockTime;
  /** Minutes from home. 0 means it happens at home (or you work from home). */
  travel: number;
  stops: Stop[];
}

export interface OnboardingAnswers {
  household: Household;
  myName: string;
  /** Everyone else in the household. */
  people: Person[];
  struggles: Struggle[];
  /** When you usually wake up (not when you'd like to). */
  typicalWake: ClockTime;
  anchors: Anchor[];
  routines: RoutineKind[];
  /** Used only when there are no morning non-negotiables: when everyone needs to be out of the door. */
  leaveAt: ClockTime;
  morningDays: 'weekdays' | 'everyday';
  /** Evening: lights out. */
  lightsOut: ClockTime;
  /** Ids of the suggested tasks the person kept. */
  picks: string[];
  /** Minutes per suggested task, where the person changed it. */
  durations: Record<string, number>;
  oneOffs: OneOff[];
  /** Ring wake-up, Go time and Lights out as alarms (with the voice repeats). */
  loud: boolean;
}

/** A task Akol suggests, with how long it usually takes. */
export interface Suggestion {
  id: string;
  routine: RoutineKind;
  /** Who it's for: the person setting up, or each child. */
  who: 'me' | 'kids';
  title: string;
  minutes: number;
  /** Suggested because of a particular struggle. */
  because?: Struggle;
}

/** In the order they happen. */
const SUGGESTIONS: Suggestion[] = [
  { id: 'm_me_up', routine: 'morning', who: 'me', title: 'Shower & get dressed', minutes: 20 },
  { id: 'm_me_coffee', routine: 'morning', who: 'me', title: 'Coffee & check the day', minutes: 10, because: 'week' },
  { id: 'm_me_breakfast', routine: 'morning', who: 'me', title: 'Breakfast', minutes: 15 },
  { id: 'm_me_lunches', routine: 'morning', who: 'me', title: 'Pack lunches', minutes: 10 },
  { id: 'm_me_keys', routine: 'morning', who: 'me', title: 'Keys, phone, wallet', minutes: 5, because: 'forget' },
  { id: 'm_me_lock', routine: 'morning', who: 'me', title: 'Lights off, doors locked', minutes: 5, because: 'door' },

  { id: 'm_kid_up', routine: 'morning', who: 'kids', title: 'Up, bed made', minutes: 10 },
  { id: 'm_kid_teeth', routine: 'morning', who: 'kids', title: 'Brush teeth', minutes: 5 },
  { id: 'm_kid_dressed', routine: 'morning', who: 'kids', title: 'Get dressed', minutes: 10 },
  { id: 'm_kid_breakfast', routine: 'morning', who: 'kids', title: 'Breakfast', minutes: 15 },
  { id: 'm_kid_bag', routine: 'morning', who: 'kids', title: 'School bag by the door', minutes: 5, because: 'forget' },
  { id: 'm_kid_shoes', routine: 'morning', who: 'kids', title: 'Shoes & jacket on', minutes: 5, because: 'door' },

  { id: 'e_me_tidy', routine: 'evening', who: 'me', title: 'Ten-minute tidy', minutes: 10 },
  { id: 'e_me_tomorrow', routine: 'evening', who: 'me', title: 'Check tomorrow’s plans', minutes: 10, because: 'week' },
  { id: 'e_me_clothes', routine: 'evening', who: 'me', title: 'Lay out tomorrow’s clothes', minutes: 10, because: 'door' },
  { id: 'e_me_charge', routine: 'evening', who: 'me', title: 'Phone on charge', minutes: 5 },

  { id: 'e_kid_bath', routine: 'evening', who: 'kids', title: 'Bath & pyjamas', minutes: 20, because: 'bedtime' },
  { id: 'e_kid_bag', routine: 'evening', who: 'kids', title: 'Pack bag for tomorrow', minutes: 10, because: 'forget' },
  { id: 'e_kid_teeth', routine: 'evening', who: 'kids', title: 'Brush teeth', minutes: 5 },
  { id: 'e_kid_read', routine: 'evening', who: 'kids', title: 'Reading time', minutes: 15 },
];

export const STRUGGLES: { id: Struggle; label: string; emoji: string }[] = [
  { id: 'door', label: 'Getting out of the door on time', emoji: '🚪' },
  { id: 'forget', label: 'Forgetting things', emoji: '🧠' },
  { id: 'ignore', label: 'Reminders get ignored', emoji: '🙉' },
  { id: 'bedtime', label: 'Bedtime drags on', emoji: '🌙' },
  { id: 'week', label: 'A busy week with no plan', emoji: '🗓️' },
];

/** Quick picks when adding a non-negotiable. */
export const ANCHOR_IDEAS = ['Clock in at work', 'Shift starts', 'School starts', 'Gym class', 'My set', 'Practice'];

/** Quick picks for stops on the way. */
export const STOP_IDEAS: Stop[] = [
  { label: 'School drop-off', minutes: 15, kids: true },
  { label: 'Nursery drop-off', minutes: 15, kids: true },
  { label: 'Coffee', minutes: 5 },
  { label: 'Fuel', minutes: 10 },
];

export const ONE_OFF_IDEAS = ['Dentist', 'School trip money', 'Pick up parcel', 'Birthday present', 'Haircut', 'Parents’ evening'];

/** Spare minutes kept before leaving, so one slow shoe doesn't make you late. */
export const BUFFER = 5;
/** The most "me time" Akol plans before a day. Beyond that, you sleep in. */
export const MAX_ME_TIME = 45;
/** Morning non-negotiables get a getting-ready routine before them. */
const MORNING_UNTIL = parseTime('12:00');

const COLORS: JewelKey[] = ['sika', 'kente', 'adire', 'maasai', 'terracotta', 'malachite'];
const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5];
const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function defaultAnswers(): OnboardingAnswers {
  return {
    household: 'kids',
    myName: '',
    people: [],
    struggles: [],
    typicalWake: '06:30',
    anchors: [],
    routines: ['morning', 'evening'],
    leaveAt: '07:30',
    morningDays: 'weekdays',
    lightsOut: '20:00',
    picks: [],
    durations: {},
    oneOffs: [],
    loud: true,
  };
}

export function newAnchor(): Anchor {
  return { id: uid('a_'), who: 'me', title: '', days: [...WEEKDAYS], time: '08:00', travel: 20, stops: [] };
}

const kidsOf = (a: OnboardingAnswers) =>
  a.household === 'solo' ? [] : a.people.filter((p) => p.role === 'child' && p.name.trim());

export const minutesOf = (a: OnboardingAnswers, s: Suggestion) => a.durations[s.id] ?? s.minutes;

/** What Akol suggests for these answers. */
export function suggestionsFor(a: OnboardingAnswers): Suggestion[] {
  const kids = kidsOf(a).length > 0;
  return SUGGESTIONS.filter((s) => a.routines.includes(s.routine) && (s.who === 'me' || kids)).filter(
    (s) => !(s.id === 'm_me_lunches' && !kids),
  );
}

/** The suggestions that start ticked: the everyday basics, plus anything that answers a struggle. */
export function defaultPicks(a: OnboardingAnswers): string[] {
  return suggestionsFor(a)
    .filter((s) => !s.because || a.struggles.includes(s.because) || a.struggles.length === 0)
    .map((s) => s.id);
}

/** Who a planned item belongs to, before members have ids. */
export type Owner = 'me' | 'kids' | 'family' | number;

export type ItemKind = 'wake' | 'me-time' | 'task' | 'leave' | 'fixed' | 'lights-out' | 'your-time' | 'get-ready';

export interface PlanItem {
  time: ClockTime;
  title: string;
  owner: Owner;
  kind: ItemKind;
  minutes?: number;
  note?: string;
  /** The suggestion this came from, so it keeps its id across days. */
  key: string;
  /** Evening items get their own routine, so Lights out only counts the evening. */
  part: 'day' | 'evening';
}

/** How a day balances out for the person setting up. */
export interface DayInsight {
  wake?: ClockTime;
  /** Minutes to yourself before the day starts. */
  meTime: number;
  /** Minutes earlier than usual you'd need to get up. */
  earlier: number;
  /** Minutes later than usual you can get up, on a late-starting day. */
  sleepIn: number;
  leave?: ClockTime;
}

const sum = (xs: number[]) => xs.reduce((n, x) => n + x, 0);
const nameOf = (a: OnboardingAnswers, who: 'me' | number) => (who === 'me' ? a.myName.trim() || 'You' : a.people[who]?.name || 'Someone');

/** The morning non-negotiable a getting-ready routine leads up to, if the day has one. */
function morningAnchors(a: OnboardingAnswers, day: Weekday): Anchor[] {
  const real = a.anchors.filter((x) => x.title.trim() && x.days.includes(day) && parseTime(x.time) < MORNING_UNTIL);
  if (real.length || !a.routines.includes('morning')) return real;
  // No morning non-negotiables: fall back to "when do you need to be out of the door".
  const days = a.morningDays === 'weekdays' ? WEEKDAYS : ALL_DAYS;
  if (!days.includes(day)) return [];
  const kids = kidsOf(a).length > 0;
  return [{ id: 'fallback', who: 'me', title: 'Out of the door', days, time: a.leaveAt, travel: 0, stops: kids ? [{ label: 'School run', minutes: 0, kids: true }] : [] }];
}

const departOf = (x: Anchor) => parseTime(x.time) - x.travel - sum(x.stops.map((s) => s.minutes)) - (x.travel || x.stops.length ? BUFFER : 0);

/** Plan one day of the week. */
export function planDay(a: OnboardingAnswers, day: Weekday): { items: PlanItem[]; insight: DayInsight } {
  const items: PlanItem[] = [];
  const picks = new Set(a.picks);
  const kids = kidsOf(a);
  const together = a.household !== 'solo' && a.people.some((p) => p.name.trim());
  const chosen = (routine: RoutineKind, who: 'me' | 'kids') =>
    suggestionsFor(a).filter((s) => s.routine === routine && s.who === who && picks.has(s.id));
  const insight: DayInsight = { meTime: 0, earlier: 0, sleepIn: 0 };

  // Everyone's non-negotiables, with a leave time when there's a journey.
  for (const x of a.anchors.filter((x) => x.title.trim() && x.days.includes(day))) {
    const owner: Owner = x.who;
    items.push({ time: x.time, title: x.title.trim(), owner, kind: 'fixed', key: `fixed:${x.id}`, part: 'day' });
    const depart = departOf(x);
    const morning = parseTime(x.time) < MORNING_UNTIL;
    if (!morning) {
      items.push({ time: toClockTime(depart - 20), title: `Get ready for ${x.title.trim().toLowerCase()}`, owner, kind: 'get-ready', minutes: 20, key: `ready:${x.id}`, part: 'day' });
    }
    const withKids = kids.length > 0 && x.stops.some((s) => s.kids);
    if (x.travel || x.stops.length) {
      const via = x.stops.filter((s) => s.minutes).map((s) => `${s.label} (${s.minutes} min)`);
      items.push({
        time: toClockTime(depart),
        title: withKids && morning ? 'Go time' : `Leave for ${x.title.trim().toLowerCase()}`,
        owner: withKids && morning ? 'family' : owner,
        kind: 'leave',
        note: [`${x.travel} min journey`, ...via, `${BUFFER} min spare`].join(' · '),
        key: `leave:${x.id}`,
        part: 'day',
      });
    }
  }

  // Getting ready, back to back, before the earliest morning departure.
  const mornings = morningAnchors(a, day);
  const mine = mornings.filter((x) => x.who === 'me').sort((p, q) => departOf(p) - departOf(q))[0];
  const kidsTrip = mornings.filter((x) => x.stops.some((s) => s.kids)).sort((p, q) => departOf(p) - departOf(q))[0];
  if (mine && mine.id === 'fallback') {
    items.push({ time: mine.time, title: kids.length ? 'Go time' : 'Out of the door', owner: kids.length ? 'family' : 'me', kind: 'leave', key: 'leave:fallback', part: 'day' });
  }

  let kidsUp: number | null = null;
  if (kidsTrip && kids.length) {
    let t = departOf(kidsTrip);
    for (const s of [...chosen('morning', 'kids')].reverse()) {
      t -= minutesOf(a, s);
      items.push({ time: toClockTime(t), title: s.title, owner: 'kids', kind: 'task', minutes: minutesOf(a, s), key: s.id, part: 'day' });
    }
    kidsUp = t;
    // Waking the kids is on whoever does the school run.
    items.push({ time: toClockTime(t), title: `Wake ${kids.map((k) => k.name.trim()).join(' & ')}`, owner: kidsTrip.who, kind: 'wake', key: 'wake-kids', part: 'day' });
  }

  if (mine) {
    let t = departOf(mine);
    // Lunches only need packing on school-run days.
    const mineToday = chosen('morning', 'me').filter((s) => s.id !== 'm_me_lunches' || (kidsTrip && kids.length));
    for (const s of [...mineToday].reverse()) {
      t -= minutesOf(a, s);
      items.push({ time: toClockTime(t), title: s.title, owner: 'me', kind: 'task', minutes: minutesOf(a, s), key: s.id, part: 'day' });
    }
    if (kidsUp !== null && kidsTrip?.who === 'me') t = Math.min(t, kidsUp);
    const needed = t;
    const usual = parseTime(a.typicalWake);
    if (usual < needed) {
      // Spare time becomes time for yourself, up to a point; after that you get to sleep in.
      insight.meTime = Math.min(needed - usual, MAX_ME_TIME);
      insight.sleepIn = needed - insight.meTime - usual;
    } else insight.earlier = usual - needed;
    const wake = needed - insight.meTime;
    insight.wake = toClockTime(wake);
    insight.leave = toClockTime(departOf(mine));
    items.push({ time: toClockTime(wake), title: 'Wake up', owner: 'me', kind: 'wake', key: 'wake', part: 'day' });
    if (insight.meTime >= 10) {
      items.push({
        time: toClockTime(wake),
        title: 'Me time ☕',
        owner: 'me',
        kind: 'me-time',
        minutes: insight.meTime,
        note: 'Before the day starts',
        key: 'me-time',
        part: 'day',
      });
    }
  }

  // Evenings lead up to lights out, then the rest of the evening is yours.
  if (a.routines.includes('evening')) {
    const out = parseTime(a.lightsOut);
    for (const who of ['kids', 'me'] as const) {
      if (who === 'kids' && !kids.length) continue;
      let t = out;
      for (const s of [...chosen('evening', who)].reverse()) {
        t -= minutesOf(a, s);
        items.push({ time: toClockTime(t), title: s.title, owner: who, kind: 'task', minutes: minutesOf(a, s), key: s.id, part: 'evening' });
      }
    }
    items.push({
      time: a.lightsOut,
      title: 'Lights out',
      owner: together ? 'family' : 'me',
      kind: 'lights-out',
      key: 'lights-out',
      part: 'evening',
    });
    if (kids.length) {
      items.push({ time: toClockTime(out + 5), title: 'Your time 🛋️', owner: 'me', kind: 'your-time', note: 'The rest of the evening is yours', key: 'your-time', part: 'evening' });
    }
  }

  items.sort((p, q) => parseTime(p.time) - parseTime(q.time) || order(p.kind) - order(q.kind));
  return { items, insight };
}

const order = (k: ItemKind) => ['wake', 'me-time', 'task', 'get-ready', 'leave', 'fixed', 'lights-out', 'your-time'].indexOf(k);

/** A name for a set of days: "Weekdays", "Friday", "Sat & Sun". */
export function nameDays(days: Weekday[]): string {
  const d = [...days].sort();
  const key = d.join();
  if (key === '1,2,3,4,5') return 'Weekdays';
  if (key === '0,6') return 'Weekends';
  if (d.length === 7) return 'Every day';
  if (d.length === 1) return DAY_NAMES[d[0]];
  return d.map((x) => DAY_SHORT[x]).join(', ');
}

/** The week, with days that work out the same grouped together. */
export function planWeek(
  a: OnboardingAnswers,
): { days: Weekday[]; name: string; part: 'day' | 'evening'; items: PlanItem[]; insight: DayInsight }[] {
  const groups: { days: Weekday[]; part: 'day' | 'evening'; items: PlanItem[]; insight: DayInsight; sig: string }[] = [];
  for (const part of ['day', 'evening'] as const) {
    for (const day of [1, 2, 3, 4, 5, 6, 0] as Weekday[]) {
      const { items: all, insight } = planDay(a, day);
      const items = all.filter((i) => i.part === part);
      if (!items.length) continue;
      const sig = JSON.stringify(items);
      const g = groups.find((x) => x.sig === sig && x.part === part);
      if (g) g.days.push(day);
      else groups.push({ days: [day], part, items, insight: part === 'day' ? insight : { meTime: 0, earlier: 0, sleepIn: 0 }, sig });
    }
  }
  return groups.map(({ days, part, items, insight }) => ({
    days,
    part,
    name: part === 'day' ? nameDays(days) : days.length === 7 ? 'Evenings' : `${nameDays(days)} evenings`,
    items,
    insight,
  }));
}

/** Build the household, routines and tasks from the answers. */
export function buildPlan(a: OnboardingAnswers): AkolState {
  const s = emptyState();
  const me: Member = { id: uid('m_'), name: a.myName.trim() || 'Me', role: a.household === 'solo' ? 'other' : 'parent', color: COLORS[0] };
  const others: (Member | null)[] =
    a.household === 'solo'
      ? []
      : a.people.map((p, i) => (p.name.trim() ? { id: uid('m_'), name: p.name.trim(), role: p.role, color: COLORS[(i + 1) % COLORS.length] } : null));
  const kids = others.filter((m): m is Member => !!m && m.role === 'child');
  const routines: Routine[] = [];
  const tasks: Task[] = [];

  const idsFor = (owner: Owner): string[] =>
    owner === 'me' ? [me.id] : owner === 'kids' ? kids.map((k) => k.id) : owner === 'family' ? [FAMILY_ID] : others[owner] ? [others[owner]!.id] : [];

  for (const g of planWeek(a)) {
    const routine: Routine = { id: uid('r_'), name: g.name, days: g.days, enabled: true };
    routines.push(routine);
    for (const item of g.items) {
      for (const memberId of idsFor(item.owner)) {
        const loud = a.loud && (item.kind === 'wake' || item.kind === 'leave' || item.kind === 'lights-out');
        tasks.push({
          id: uid('t_'),
          routineId: routine.id,
          memberId,
          time: item.time,
          title: item.title,
          remind: item.kind !== 'fixed' && item.kind !== 'your-time' && item.kind !== 'me-time',
          ...(item.minutes ? { duration: item.minutes } : {}),
          ...(item.note ? { note: item.note } : {}),
          ...(item.kind === 'fixed' ? { fixed: true } : {}),
          ...(item.kind === 'me-time' || item.kind === 'your-time' ? { free: true } : {}),
          ...(item.kind === 'leave' && memberId === FAMILY_ID ? { checkpoint: true, note: item.note ?? 'Is everyone ready to go?' } : {}),
          ...(item.kind === 'lights-out' ? { checkpoint: memberId === FAMILY_ID, note: 'Ready for tomorrow?' } : {}),
          ...(loud ? { alert: 'alarm' as const } : {}),
        });
      }
    }
  }

  if (a.oneOffs.length) {
    routines.push({ id: ONE_OFF_ROUTINE_ID, name: 'One-offs', days: [0, 1, 2, 3, 4, 5, 6], enabled: true });
    for (const o of a.oneOffs) tasks.push({ id: uid('t_'), routineId: ONE_OFF_ROUTINE_ID, memberId: me.id, time: o.time, title: o.title, remind: true, date: o.date });
  }

  return {
    ...s,
    members: [me, ...others.filter((m): m is Member => !!m)],
    routines,
    tasks,
    settings: { ...s.settings, meId: me.id, onboarded: true, notificationsEnabled: true, alarmRepeats: true, voiceAlarms: true },
  };
}

export { nameOf };
