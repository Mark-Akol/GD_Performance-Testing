// Turns the first-run questionnaire into a ready-made week. Pure, so it can be unit-tested.
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

export interface OnboardingAnswers {
  household: Household;
  myName: string;
  /** Everyone else in the household. */
  people: Person[];
  struggles: Struggle[];
  routines: RoutineKind[];
  /** Morning: when everyone needs to be out of the door. */
  leaveAt: ClockTime;
  morningDays: 'weekdays' | 'everyday';
  /** Evening: lights out. */
  lightsOut: ClockTime;
  /** Ids of the suggested tasks the person kept. */
  picks: string[];
  oneOffs: OneOff[];
  /** Ring Go time and Lights out as alarms (with the voice repeats). */
  loud: boolean;
}

/** A task Akol suggests, timed as minutes before the routine's checkpoint. */
export interface Suggestion {
  id: string;
  routine: RoutineKind;
  /** Who it's for: the person setting up, or each child. */
  who: 'me' | 'kids';
  title: string;
  before: number;
  /** Suggested because of a particular struggle. */
  because?: Struggle;
}

const SUGGESTIONS: Suggestion[] = [
  // Morning, for the person setting up
  { id: 'm_me_up', routine: 'morning', who: 'me', title: 'Up & dressed', before: 60 },
  { id: 'm_me_coffee', routine: 'morning', who: 'me', title: 'Coffee & check the day', before: 50 },
  { id: 'm_me_breakfast', routine: 'morning', who: 'me', title: 'Breakfast', before: 40 },
  { id: 'm_me_lunches', routine: 'morning', who: 'me', title: 'Lunches packed', before: 30 },
  { id: 'm_me_keys', routine: 'morning', who: 'me', title: 'Keys, phone, wallet', before: 10, because: 'forget' },
  { id: 'm_me_lock', routine: 'morning', who: 'me', title: 'Lights off, doors locked', before: 5, because: 'door' },
  // Morning, for each child
  { id: 'm_kid_up', routine: 'morning', who: 'kids', title: 'Up, bed made', before: 55 },
  { id: 'm_kid_teeth', routine: 'morning', who: 'kids', title: 'Brush teeth', before: 45 },
  { id: 'm_kid_dressed', routine: 'morning', who: 'kids', title: 'Get dressed', before: 40 },
  { id: 'm_kid_breakfast', routine: 'morning', who: 'kids', title: 'Breakfast', before: 30 },
  { id: 'm_kid_bag', routine: 'morning', who: 'kids', title: 'School bag by the door', before: 15, because: 'forget' },
  { id: 'm_kid_shoes', routine: 'morning', who: 'kids', title: 'Shoes & jacket on', before: 5, because: 'door' },
  // Evening, for the person setting up
  { id: 'e_me_tidy', routine: 'evening', who: 'me', title: 'Ten-minute tidy', before: 90 },
  { id: 'e_me_tomorrow', routine: 'evening', who: 'me', title: 'Check tomorrow’s plans', before: 60, because: 'week' },
  { id: 'e_me_clothes', routine: 'evening', who: 'me', title: 'Lay out tomorrow’s clothes', before: 45, because: 'door' },
  { id: 'e_me_charge', routine: 'evening', who: 'me', title: 'Phone on charge', before: 10 },
  // Evening, for each child
  { id: 'e_kid_bath', routine: 'evening', who: 'kids', title: 'Bath & pyjamas', before: 75, because: 'bedtime' },
  { id: 'e_kid_bag', routine: 'evening', who: 'kids', title: 'Pack bag for tomorrow', before: 60, because: 'forget' },
  { id: 'e_kid_teeth', routine: 'evening', who: 'kids', title: 'Brush teeth', before: 30 },
  { id: 'e_kid_read', routine: 'evening', who: 'kids', title: 'Reading time', before: 25 },
];

export const STRUGGLES: { id: Struggle; label: string; emoji: string }[] = [
  { id: 'door', label: 'Getting out of the door on time', emoji: '🚪' },
  { id: 'forget', label: 'Forgetting things', emoji: '🧠' },
  { id: 'ignore', label: 'Reminders get ignored', emoji: '🙉' },
  { id: 'bedtime', label: 'Bedtime drags on', emoji: '🌙' },
  { id: 'week', label: 'A busy week with no plan', emoji: '🗓️' },
];

export const ONE_OFF_IDEAS = ['Dentist', 'School trip money', 'Pick up parcel', 'Birthday present', 'Haircut', 'Parents’ evening'];

const COLORS: JewelKey[] = ['sika', 'kente', 'adire', 'maasai', 'terracotta', 'malachite'];

export function defaultAnswers(): OnboardingAnswers {
  return {
    household: 'kids',
    myName: '',
    people: [],
    struggles: [],
    routines: ['morning'],
    leaveAt: '07:30',
    morningDays: 'weekdays',
    lightsOut: '20:00',
    picks: [],
    oneOffs: [],
    loud: true,
  };
}

const hasKids = (a: OnboardingAnswers) => a.household !== 'solo' && a.people.some((p) => p.role === 'child' && p.name.trim());

/** What Akol suggests for these answers, in time order, with each one's clock time. */
export function suggestionsFor(a: OnboardingAnswers): (Suggestion & { time: ClockTime })[] {
  const kids = hasKids(a);
  return SUGGESTIONS.filter((s) => a.routines.includes(s.routine) && (s.who === 'me' || kids))
    .filter((s) => !(s.who === 'me' && kids && s.id === 'm_me_up'))
    .map((s) => ({ ...s, time: toClockTime(parseTime(s.routine === 'morning' ? a.leaveAt : a.lightsOut) - s.before) }))
    .sort((x, y) => parseTime(x.time) - parseTime(y.time));
}

/** The suggestions that start ticked: the everyday basics, plus anything that answers a struggle. */
export function defaultPicks(a: OnboardingAnswers): string[] {
  return suggestionsFor(a)
    .filter((s) => !s.because || a.struggles.includes(s.because) || a.struggles.length === 0)
    .map((s) => s.id);
}

/** Build the household, routines and tasks from the answers. */
export function buildPlan(a: OnboardingAnswers): AkolState {
  const s = emptyState();
  const me: Member = { id: uid('m_'), name: a.myName.trim() || 'Me', role: a.household === 'solo' ? 'other' : 'parent', color: COLORS[0] };
  const others: Member[] =
    a.household === 'solo'
      ? []
      : a.people
          .filter((p) => p.name.trim())
          .map((p, i) => ({ id: uid('m_'), name: p.name.trim(), role: p.role, color: COLORS[(i + 1) % COLORS.length] }));
  const kids = others.filter((m) => m.role === 'child');
  const routines: Routine[] = [];
  const tasks: Task[] = [];
  const picked = new Set(a.picks);
  const together = others.length > 0;

  const add = (routineId: string, memberId: string, time: ClockTime, title: string, extra: Partial<Task> = {}) =>
    tasks.push({ id: uid('t_'), routineId, memberId, time, title, remind: true, ...extra });

  for (const kind of a.routines) {
    const days: Weekday[] = kind === 'morning' && a.morningDays === 'weekdays' ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];
    const routine: Routine = { id: uid('r_'), name: kind === 'morning' ? 'Morning' : 'Evening', days, enabled: true };
    routines.push(routine);
    for (const sug of suggestionsFor(a).filter((x) => x.routine === kind && picked.has(x.id))) {
      if (sug.who === 'me') add(routine.id, me.id, sug.time, sug.title);
      else for (const k of kids) add(routine.id, k.id, sug.time, sug.title);
    }
    const checkpoint = kind === 'morning' ? { time: a.leaveAt, title: 'Go time', note: 'Is everyone ready to go?' } : { time: a.lightsOut, title: 'Lights out', note: 'Ready for tomorrow?' };
    add(routine.id, together ? FAMILY_ID : me.id, checkpoint.time, checkpoint.title, {
      checkpoint: true,
      note: checkpoint.note,
      alert: a.loud ? 'alarm' : 'notify',
    });
  }

  if (a.oneOffs.length) {
    routines.push({ id: ONE_OFF_ROUTINE_ID, name: 'One-offs', days: [0, 1, 2, 3, 4, 5, 6], enabled: true });
    for (const o of a.oneOffs) add(ONE_OFF_ROUTINE_ID, me.id, o.time, o.title, { date: o.date });
  }

  return {
    ...s,
    members: [me, ...others],
    routines,
    tasks,
    settings: { ...s.settings, meId: me.id, onboarded: true, notificationsEnabled: true, alarmRepeats: true, voiceAlarms: true },
  };
}
