// Turns the first-run questionnaire into a planned week. Pure, so it can be unit-tested.
//
// The plan is built around non-negotiables: times that don't move, like clocking in at 7:30.
// For each day Akol works back from each one through the journey, any drop-offs on the way and
// a small buffer to a leave time, lays everyone's tasks out back to back before it, and works
// out when you really need to wake up. Spare time before that becomes time for yourself.
// With finish times it plans the trip home too (pick-ups included), and checks that a grown-up
// or the creche has the kids all day and all night.
import { FAMILY_ID, ONE_OFF_ROUTINE_ID, formatTime, parseTime, toClockTime } from './schedule.ts';
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

/**
 * A stop on a journey. Kids' and pets' stops (creche, school) are near home; a person's stop
 * (dropping your partner at work) is on the way to yours.
 */
export interface Stop {
  label: string;
  /** Minutes spent there. */
  minutes: number;
  kind: 'kids' | 'person' | 'other';
  /** For a person stop: who, as an index into `people`. */
  person?: number;
}

/** How someone gets home after a non-negotiable with a finish time. */
export type HomeBy = 'drive' | 'cab' | 'lift';

/** A time that doesn't move: clocking in, a shift, a set, school starting. */
export interface Anchor {
  id: string;
  /** 'me' for the person setting up, or an index into `people`. */
  who: 'me' | number;
  title: string;
  days: Weekday[];
  time: ClockTime;
  /** When it finishes, if it matters for getting home. */
  end?: ClockTime;
  /** Minutes from home. 0 means it happens at home (or you work from home). */
  travel: number;
  /** Drop-offs on the way there. */
  stops: Stop[];
  home: HomeBy;
  /** Pick-ups on the way home. */
  back: Stop[];
}

/** Where a pet spends the day. */
export type PetPlan = 'home' | 'nap' | 'creche' | 'along';

export interface OnboardingAnswers {
  household: Household;
  myName: string;
  /** Everyone else in the household, pets included. */
  people: Person[];
  /** Each pet's day on weekdays and at weekends, by index into `people`. */
  petPlans: Record<number, { weekdays: PetPlan; weekends: PetPlan }>;
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
  /** Who it's for: the person setting up, each child, or the person setting up on the pets' behalf. */
  who: 'me' | 'kids' | 'pets';
  title: string;
  minutes: number;
  /** Suggested because of a particular struggle. */
  because?: Struggle;
}

/** In the order they happen. `{pet}` is replaced with the pets' names. */
const SUGGESTIONS: Suggestion[] = [
  { id: 'm_me_up', routine: 'morning', who: 'me', title: 'Shower & get dressed', minutes: 20 },
  { id: 'm_pet_walk', routine: 'morning', who: 'pets', title: 'Walk {pet}', minutes: 15 },
  { id: 'm_me_coffee', routine: 'morning', who: 'me', title: 'Coffee & check the day', minutes: 10, because: 'week' },
  { id: 'm_me_breakfast', routine: 'morning', who: 'me', title: 'Breakfast', minutes: 15 },
  { id: 'm_pet_feed', routine: 'morning', who: 'pets', title: 'Feed {pet}', minutes: 5 },
  { id: 'm_me_lunches', routine: 'morning', who: 'me', title: 'Pack lunches', minutes: 10 },
  { id: 'm_me_keys', routine: 'morning', who: 'me', title: 'Keys, phone, wallet', minutes: 5, because: 'forget' },
  { id: 'm_me_lock', routine: 'morning', who: 'me', title: 'Lights off, doors locked', minutes: 5, because: 'door' },

  { id: 'm_kid_up', routine: 'morning', who: 'kids', title: 'Up, bed made', minutes: 10 },
  { id: 'm_kid_teeth', routine: 'morning', who: 'kids', title: 'Brush teeth', minutes: 5 },
  { id: 'm_kid_dressed', routine: 'morning', who: 'kids', title: 'Get dressed', minutes: 10 },
  { id: 'm_kid_breakfast', routine: 'morning', who: 'kids', title: 'Breakfast', minutes: 15 },
  { id: 'm_kid_bag', routine: 'morning', who: 'kids', title: 'Bag by the door', minutes: 5, because: 'forget' },
  { id: 'm_kid_shoes', routine: 'morning', who: 'kids', title: 'Shoes & jacket on', minutes: 5, because: 'door' },

  { id: 'e_pet_walk', routine: 'evening', who: 'pets', title: 'Walk {pet}', minutes: 20 },
  { id: 'e_pet_feed', routine: 'evening', who: 'pets', title: 'Feed {pet}', minutes: 5 },
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

export const PET_PLANS: { id: PetPlan; label: string; emoji: string }[] = [
  { id: 'home', label: 'Home', emoji: '🏠' },
  { id: 'nap', label: 'Napping at home', emoji: '😴' },
  { id: 'creche', label: 'Puppy creche', emoji: '🐾' },
  { id: 'along', label: 'Comes along', emoji: '🚗' },
];

export const ONE_OFF_IDEAS = ['Dentist', 'School trip money', 'Pick up parcel', 'Birthday present', 'Haircut', 'Parents’ evening'];

/** Spare minutes kept before leaving, so one slow shoe doesn't make you late. */
export const BUFFER = 5;
/** The most "me time" Akol plans before a day. Beyond that, you sleep in. */
export const MAX_ME_TIME = 45;
/** Creche, school and puppy creche are near home: this many minutes from the door. */
const NEAR_HOME = 5;
/** Morning non-negotiables get a getting-ready routine before them. */
const MORNING_UNTIL = parseTime('12:00');
const DAY_END = 24 * 60;

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
    petPlans: {},
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
  return { id: uid('a_'), who: 'me', title: '', days: [...WEEKDAYS], time: '08:00', travel: 20, stops: [], home: 'drive', back: [] };
}

const named = (p: Person) => !!p.name.trim();
const indicesOf = (a: OnboardingAnswers, test: (p: Person) => boolean) =>
  a.household === 'solo' ? [] : a.people.map((p, i) => (named(p) && test(p) ? i : -1)).filter((i) => i >= 0);
export const kidIndices = (a: OnboardingAnswers) => indicesOf(a, (p) => p.role === 'child');
export const petIndices = (a: OnboardingAnswers) => indicesOf(a, (p) => p.role === 'pet');
export const adultIndices = (a: OnboardingAnswers) => indicesOf(a, (p) => p.role === 'parent' || p.role === 'other');
const names = (a: OnboardingAnswers, idx: number[]) => idx.map((i) => a.people[i].name.trim()).join(' & ');
export const nameOf = (a: OnboardingAnswers, who: 'me' | number) => (who === 'me' ? a.myName.trim() || 'You' : a.people[who]?.name.trim() || 'Someone');

export const petPlanFor = (a: OnboardingAnswers, pet: number, day: Weekday): PetPlan => {
  const plan = a.petPlans[pet] ?? { weekdays: 'home', weekends: 'home' };
  return WEEKDAYS.includes(day) ? plan.weekdays : plan.weekends;
};

export const minutesOf = (a: OnboardingAnswers, s: Suggestion) => a.durations[s.id] ?? s.minutes;
export const titleOf = (a: OnboardingAnswers, s: Suggestion) => s.title.replace('{pet}', names(a, petIndices(a)) || 'the pet');

/** What Akol suggests for these answers. */
export function suggestionsFor(a: OnboardingAnswers): Suggestion[] {
  const kids = kidIndices(a).length > 0;
  const pets = petIndices(a).length > 0;
  return SUGGESTIONS.filter(
    (s) => a.routines.includes(s.routine) && (s.who === 'me' || (s.who === 'kids' && kids) || (s.who === 'pets' && pets)),
  ).filter((s) => !(s.id === 'm_me_lunches' && !kids));
}

/** The suggestions that start ticked: the everyday basics, plus anything that answers a struggle. */
export function defaultPicks(a: OnboardingAnswers): string[] {
  return suggestionsFor(a)
    .filter((s) => !s.because || a.struggles.includes(s.because) || a.struggles.length === 0)
    .map((s) => s.id);
}

/** Stops that make sense on the way to (or home from) this non-negotiable. */
export function stopIdeas(a: OnboardingAnswers, x: Anchor, way: 'there' | 'back'): Stop[] {
  const kids = kidIndices(a).length > 0;
  const others = adultIndices(a).filter((i) => x.who !== i && a.anchors.some((y) => y.who === i && y.title.trim()));
  const firstName = (i: number) => a.people[i].name.trim();
  return way === 'there'
    ? [
        ...(kids ? [{ label: 'Creche drop-off', minutes: 5, kind: 'kids' as const }, { label: 'School drop-off', minutes: 5, kind: 'kids' as const }] : []),
        ...others.map((i) => ({ label: `Drop ${firstName(i)} at work`, minutes: 5, kind: 'person' as const, person: i })),
        { label: 'Coffee', minutes: 5, kind: 'other' as const },
        { label: 'Fuel', minutes: 10, kind: 'other' as const },
      ]
    : [
        ...others.map((i) => ({ label: `Pick up ${firstName(i)}`, minutes: 5, kind: 'person' as const, person: i })),
        ...(kids ? [{ label: 'Creche pick-up', minutes: 5, kind: 'kids' as const }] : []),
        { label: 'Groceries', minutes: 20, kind: 'other' as const },
      ];
}

/** Who a planned item belongs to, before members have ids. */
export type Owner = 'me' | 'kids' | 'family' | number;

export type ItemKind =
  | 'wake'
  | 'me-time'
  | 'task'
  | 'care'
  | 'get-ready'
  | 'leave'
  | 'drop'
  | 'fixed'
  | 'pickup'
  | 'home'
  | 'lights-out'
  | 'your-time';

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

/** How a day balances out. */
export interface DayInsight {
  wake?: ClockTime;
  /** Minutes to yourself before the day starts. */
  meTime: number;
  /** Minutes earlier than usual you'd need to get up. */
  earlier: number;
  /** Minutes later than usual you can get up, on a late-starting day. */
  sleepIn: number;
  leave?: ClockTime;
  /** When the kids are at creche, and who collects them. */
  creche?: { from: ClockTime; to?: ClockTime; by?: string };
  /** Times when no grown-up (or the creche) has the kids. */
  gaps: { from: ClockTime; to: ClockTime }[];
  /** Things the plan couldn't work out, in plain words. */
  warnings: string[];
}

const emptyInsight = (): DayInsight => ({ meTime: 0, earlier: 0, sleepIn: 0, gaps: [], warnings: [] });
const sum = (xs: number[]) => xs.reduce((n, x) => n + x, 0);
const lower = (s: string) => s.trim().charAt(0).toLowerCase() + s.trim().slice(1);
const isMorning = (x: Anchor) => parseTime(x.time) < MORNING_UNTIL;
const moving = (x: Anchor) => x.travel > 0 || x.stops.length > 0;

/** The morning non-negotiables of a day, or "out of the door" when there are none. */
function morningAnchors(a: OnboardingAnswers, day: Weekday, today: Anchor[]): Anchor[] {
  const real = today.filter(isMorning);
  if (real.length || !a.routines.includes('morning')) return real;
  const days = a.morningDays === 'weekdays' ? WEEKDAYS : ALL_DAYS;
  if (!days.includes(day)) return [];
  const kids = kidIndices(a).length > 0;
  return [
    {
      id: 'fallback',
      who: 'me',
      title: 'Out of the door',
      days,
      time: a.leaveAt,
      travel: 0,
      stops: kids ? [{ label: 'School run', minutes: 0, kind: 'kids' }] : [],
      home: 'drive',
      back: [],
    },
  ];
}

/** Plan one day of the week. */
export function planDay(a: OnboardingAnswers, day: Weekday): { items: PlanItem[]; insight: DayInsight } {
  const items: PlanItem[] = [];
  const insight = emptyInsight();
  const picks = new Set(a.picks);
  const kids = kidIndices(a);
  const pets = petIndices(a);
  const adults = adultIndices(a);
  const together = a.household !== 'solo' && a.people.some(named);
  const kidNames = names(a, kids);
  const push = (item: Omit<PlanItem, 'part'> & { part?: PlanItem['part'] }) => items.push({ part: 'day', ...item });
  const chosen = (routine: RoutineKind, who: Suggestion['who']) =>
    suggestionsFor(a).filter((s) => s.routine === routine && s.who === who && picks.has(s.id));

  const today = a.anchors.filter((x) => x.title.trim() && x.days.includes(day));
  const mornings = morningAnchors(a, day, today);
  const anchorOf = (who: 'me' | number, morning: boolean) => today.find((y) => y.who === who && isMorning(y) === morning);

  // Who drives whom in the morning: a "drop X at work" stop means X rides along.
  const ridesWith = new Map<number, Anchor>();
  for (const x of mornings) for (const s of x.stops) if (s.kind === 'person' && s.person !== undefined) ridesWith.set(s.person, x);

  const byDeparture = (list: Anchor[]) => [...list].sort((p, q) => departOf(p) - departOf(q));
  const kidsTrip = (() => {
    const withKids = mornings.filter((x) => x.stops.some((s) => s.kind === 'kids'));
    return withKids.length ? withKids.sort((p, q) => parseTime(p.time) - parseTime(q.time))[0] : undefined;
  })();
  const crechePets = pets.filter((p) => petPlanFor(a, p, day) === 'creche');
  const petTrip = crechePets.length ? (kidsTrip ?? mornings.filter(moving).sort((p, q) => parseTime(p.time) - parseTime(q.time))[0]) : undefined;
  const petDwell = (x: Anchor) => (x === petTrip ? NEAR_HOME * crechePets.length : 0);

  /** Leave time: back from the start through the journey, the stops and a buffer, early enough for anyone riding along. */
  function departOf(x: Anchor): number {
    const dwell = sum(x.stops.map((s) => s.minutes)) + petDwell(x);
    let t = parseTime(x.time) - x.travel - dwell - (moving(x) || dwell ? BUFFER : 0);
    const nearHome = sum(x.stops.filter((s) => s.kind === 'kids').map((s) => s.minutes)) + petDwell(x);
    for (const s of x.stops) {
      const y = s.kind === 'person' && s.person !== undefined ? anchorOf(s.person, true) : undefined;
      if (y) t = Math.min(t, parseTime(y.time) - y.travel - BUFFER - nearHome);
    }
    return t;
  }

  // Everyone's non-negotiables and how they get there.
  for (const x of today) {
    const owner: Owner = x.who;
    const driver = typeof x.who === 'number' && isMorning(x) ? ridesWith.get(x.who) : undefined;
    push({
      time: x.time,
      title: x.title.trim(),
      owner,
      kind: 'fixed',
      ...(x.end ? { minutes: parseTime(x.end) - parseTime(x.time), note: `Until ${formatTime(x.end)}` } : {}),
      key: `fixed:${x.id}`,
    });
    if (driver) continue;
    const morning = isMorning(x);
    const depart = departOf(x);
    if (!morning && moving(x)) {
      push({ time: toClockTime(depart - 20), title: `Get ready for ${lower(x.title)}`, owner, kind: 'get-ready', minutes: 20, key: `ready:${x.id}` });
    }
    if (moving(x) || petDwell(x)) {
      const withKids = kids.length > 0 && x.stops.some((s) => s.kind === 'kids');
      const via = [
        ...x.stops.filter((s) => s.minutes).map((s) => s.label),
        ...(petDwell(x) ? [`${names(a, crechePets)} to puppy creche`] : []),
      ];
      push({
        time: toClockTime(depart),
        title: withKids && morning ? 'Go time' : `Leave for ${lower(x.title)}`,
        owner: withKids && morning ? 'family' : owner,
        kind: 'leave',
        note: [via.length ? `Via ${via.join(', ')}` : '', `${x.travel} min journey`, `${BUFFER} min spare`].filter(Boolean).join(' · '),
        key: `leave:${x.id}`,
      });
    }
  }

  // Creche and pets in the morning.
  const kidsDrop = kidsTrip && kidsTrip.stops.some((s) => s.kind === 'kids' && s.minutes > 0) ? departOf(kidsTrip) + NEAR_HOME : undefined;
  const petDrop = petTrip ? departOf(petTrip) + NEAR_HOME : undefined;
  if (kidsTrip && kidsDrop !== undefined) {
    push({ time: toClockTime(kidsDrop), title: `Drop ${kidNames} at creche`, owner: kidsTrip.who, kind: 'drop', key: 'drop-kids' });
  }
  if (petTrip && petDrop !== undefined) {
    push({ time: toClockTime(petDrop), title: `Drop ${names(a, crechePets)} at puppy creche`, owner: petTrip.who, kind: 'drop', key: 'drop-pets' });
  }

  // The trip home, for non-negotiables with a finish time.
  /** When each trip ends at home, by the non-negotiable it came from. */
  const homeAt = new Map<string, number>();
  let kidsPickup: { at: number; by: 'me' | number; home: number } | undefined;
  let petsPickup: number | undefined;
  const liftedBy = new Map<number, Anchor>();
  for (const x of today) for (const s of x.back) if (x.end && s.kind === 'person' && s.person !== undefined) liftedBy.set(s.person, x);

  for (const x of today.filter((y) => y.end)) {
    const end = parseTime(x.end!);
    const owner: Owner = x.who;
    if (typeof x.who === 'number' && liftedBy.has(x.who)) continue; // the driver plans this one
    if (x.home === 'cab' || (x.home === 'lift' && typeof x.who === 'number' && !liftedBy.has(x.who))) {
      if (x.home === 'lift') insight.warnings.push(`Nobody is picking ${nameOf(a, x.who)} up. Planned as a cab instead.`);
      push({ time: x.end!, title: 'Order a cab home 🚕', owner, kind: 'pickup', key: `cab:${x.id}` });
      homeAt.set(x.id, end + Math.max(x.travel, 10));
      continue;
    }
    if (!moving(x)) continue;
    push({ time: x.end!, title: 'Leave for home', owner, kind: 'leave', key: `home-leave:${x.id}` });
    let t = end;
    let remaining = x.travel;
    const riders: number[] = [];
    for (const s of x.back.filter((b) => b.kind === 'person' && b.person !== undefined)) {
      const y = today.find((z) => z.who === s.person && z.end);
      const theirTravel = y?.travel ?? remaining;
      const arrive = t + Math.max(0, remaining - theirTravel);
      const ready = y ? parseTime(y.end!) : arrive;
      const at = Math.max(arrive, ready);
      push({
        time: toClockTime(at),
        title: `Pick up ${nameOf(a, s.person!)}`,
        owner,
        kind: 'pickup',
        ...(ready > arrive ? { note: `${ready - arrive} min wait` } : {}),
        key: `pick-person:${x.id}:${s.person}`,
      });
      riders.push(s.person!);
      t = at + s.minutes;
      remaining = theirTravel;
    }
    const nearHomeStops = [
      ...x.back.filter((b) => b.kind === 'kids').map((s) => ({ s, what: 'kids' as const })),
      ...(crechePets.length && petsPickup === undefined && (x.back.some((b) => b.kind === 'kids') || x === petTrip)
        ? [{ s: { label: 'Puppy creche', minutes: NEAR_HOME, kind: 'other' as const }, what: 'pets' as const }]
        : []),
      ...x.back.filter((b) => b.kind === 'other').map((s) => ({ s, what: 'other' as const })),
    ];
    for (const { s, what } of nearHomeStops) {
      const at = t + Math.max(0, remaining - NEAR_HOME);
      const title = what === 'kids' ? `Pick up ${kidNames} from creche` : what === 'pets' ? `Pick up ${names(a, crechePets)} from puppy creche` : s.label;
      push({ time: toClockTime(at), title, owner, kind: 'pickup', key: `pick-${what}:${x.id}` });
      if (what === 'kids') kidsPickup = { at, by: x.who, home: -1 };
      if (what === 'pets') petsPickup = at;
      t = at + s.minutes;
      remaining = NEAR_HOME;
    }
    const home = t + remaining;
    push({ time: toClockTime(home), title: 'Home 🏠', owner, kind: 'home', note: riders.length ? `With ${riders.map((r) => nameOf(a, r)).join(' & ')}` : undefined, key: `home:${x.id}` });
    homeAt.set(x.id, home);
    if (kidsPickup && kidsPickup.home === -1) kidsPickup.home = home;
    for (const r of riders) {
      const theirs = today.find((z) => z.who === r && z.end);
      if (theirs) homeAt.set(theirs.id, home);
    }
  }

  if (kidsDrop !== undefined) {
    insight.creche = { from: toClockTime(kidsDrop), ...(kidsPickup ? { to: toClockTime(kidsPickup.at), by: nameOf(a, kidsPickup.by) } : {}) };
    push({
      time: toClockTime(kidsDrop),
      title: 'Creche 🧸',
      owner: 'kids',
      kind: 'care',
      ...(kidsPickup ? { minutes: kidsPickup.at - kidsDrop, note: `${nameOf(a, kidsPickup.by)} collects at ${formatTime(toClockTime(kidsPickup.at))}` } : {}),
      key: 'creche',
    });
    if (!kidsPickup) insight.warnings.push(`Who collects ${kidNames} from creche? Add a creche pick-up to someone’s trip home.`);
  }

  // Each pet's day.
  for (const p of pets) {
    const plan = petPlanFor(a, p, day);
    const info = PET_PLANS.find((x) => x.id === plan)!;
    const at = plan === 'creche' && petDrop !== undefined ? petDrop : mornings.length ? departOf(mornings[0]) : parseTime('09:00');
    push({
      time: toClockTime(at),
      title: `${info.label} ${info.emoji}`,
      owner: p,
      kind: 'care',
      ...(plan === 'creche' && petsPickup !== undefined ? { minutes: petsPickup - at } : {}),
      key: `pet:${p}:${plan}`,
    });
    if (plan === 'creche' && petDrop === undefined) insight.warnings.push(`${nameOf(a, p)} is due at puppy creche, but nobody is going out that morning.`);
    if (plan === 'creche' && petDrop !== undefined && petsPickup === undefined) insight.warnings.push(`Who collects ${nameOf(a, p)} from puppy creche? Add a creche pick-up to someone’s trip home.`);
  }

  // Getting ready, back to back, before the morning departures.
  const mine = byDeparture(mornings.filter((x) => x.who === 'me'))[0];
  if (mine && mine.id === 'fallback') {
    push({ time: mine.time, title: kids.length ? 'Go time' : 'Out of the door', owner: kids.length ? 'family' : 'me', kind: 'leave', key: 'leave:fallback' });
  }

  let kidsUp: number | null = null;
  if (kidsTrip && kids.length) {
    let t = departOf(kidsTrip);
    for (const s of [...chosen('morning', 'kids')].reverse()) {
      t -= minutesOf(a, s);
      push({ time: toClockTime(t), title: titleOf(a, s), owner: 'kids', kind: 'task', minutes: minutesOf(a, s), key: s.id });
    }
    kidsUp = t;
    push({ time: toClockTime(t), title: `Wake ${kidNames}`, owner: kidsTrip.who, kind: 'wake', key: 'wake-kids' });
  }

  if (mine) {
    let t = departOf(mine);
    const schoolRun = !!kidsTrip && kids.length > 0;
    const mineToday = suggestionsFor(a).filter(
      (s) => s.routine === 'morning' && (s.who === 'me' || s.who === 'pets') && picks.has(s.id) && (s.id !== 'm_me_lunches' || schoolRun),
    );
    for (const s of [...mineToday].reverse()) {
      t -= minutesOf(a, s);
      push({ time: toClockTime(t), title: titleOf(a, s), owner: 'me', kind: 'task', minutes: minutesOf(a, s), key: s.id });
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
    push({ time: toClockTime(wake), title: 'Wake up', owner: 'me', kind: 'wake', key: 'wake' });
    if (insight.meTime >= 10) {
      push({ time: toClockTime(wake), title: 'Me time ☕', owner: 'me', kind: 'me-time', minutes: insight.meTime, note: 'Before the day starts', key: 'me-time' });
    }
  }

  // Evenings lead up to lights out, then the rest of the evening is yours.
  if (a.routines.includes('evening')) {
    const out = parseTime(a.lightsOut);
    for (const who of ['kids', 'me'] as const) {
      if (who === 'kids' && !kids.length) continue;
      let t = out;
      const list = suggestionsFor(a).filter(
        (s) => s.routine === 'evening' && (who === 'kids' ? s.who === 'kids' : s.who === 'me' || s.who === 'pets') && picks.has(s.id),
      );
      for (const s of [...list].reverse()) {
        t -= minutesOf(a, s);
        push({ time: toClockTime(t), title: titleOf(a, s), owner: who, kind: 'task', minutes: minutesOf(a, s), key: s.id, part: 'evening' });
      }
    }
    push({ time: a.lightsOut, title: 'Lights out', owner: together ? 'family' : 'me', kind: 'lights-out', key: 'lights-out', part: 'evening' });
    if (kids.length) {
      push({ time: toClockTime(out + 5), title: 'Your time 🛋️', owner: 'me', kind: 'your-time', note: 'The rest of the evening is yours', key: 'your-time', part: 'evening' });
    }
  }

  // Who has the kids? Minute by minute: at creche, travelling with a grown-up, or a grown-up at home.
  if (kids.length) {
    const covered = new Array<boolean>(DAY_END).fill(false);
    const mark = (from: number, to: number) => {
      for (let m = Math.max(0, from); m < Math.min(DAY_END, to); m++) covered[m] = true;
    };
    const away = new Map<'me' | number, [number, number][]>();
    for (const who of ['me' as const, ...adults]) away.set(who, []);
    for (const x of today) {
      if (!away.has(x.who)) continue;
      const driver = typeof x.who === 'number' && isMorning(x) ? ridesWith.get(x.who) : undefined;
      if (!moving(x) && !driver) continue;
      const leave = driver ? departOf(driver) : departOf(x);
      const back = homeAt.get(x.id) ?? DAY_END;
      away.get(x.who)!.push([leave, back]);
      if (back === DAY_END && parseTime(x.time) < parseTime(a.lightsOut) && !x.end) {
        const whose = x.who === 'me' ? 'your' : `${nameOf(a, x.who)}’s`;
        insight.warnings.push(`Add a finish time for ${whose} ${lower(x.title)}, so Akol can check who’s home.`);
      }
    }
    for (let m = 0; m < DAY_END; m++) {
      for (const spans of away.values()) {
        if (!spans.some(([f, t]) => m >= f && m < t)) {
          covered[m] = true;
          break;
        }
      }
    }
    if (kidsTrip && kidsDrop !== undefined) {
      mark(departOf(kidsTrip), kidsDrop);
      mark(kidsDrop, kidsPickup?.at ?? kidsDrop);
      if (kidsPickup) mark(kidsPickup.at, kidsPickup.home);
    }
    for (let m = 0; m < DAY_END; ) {
      if (covered[m]) {
        m++;
        continue;
      }
      let e = m;
      while (e < DAY_END && !covered[e]) e++;
      if (e - m >= 5) insight.gaps.push({ from: toClockTime(m), to: toClockTime(e === DAY_END ? DAY_END - 1 : e) });
      m = e;
    }
  }

  items.sort((p, q) => parseTime(p.time) - parseTime(q.time) || order(p.kind) - order(q.kind));
  return { items, insight };
}

const ORDER: ItemKind[] = ['wake', 'me-time', 'task', 'get-ready', 'leave', 'drop', 'care', 'fixed', 'pickup', 'home', 'lights-out', 'your-time'];
const order = (k: ItemKind) => ORDER.indexOf(k);

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
      const sig = JSON.stringify(items) + (part === 'day' ? JSON.stringify(insight) : '');
      const g = groups.find((x) => x.sig === sig && x.part === part);
      if (g) g.days.push(day);
      else groups.push({ days: [day], part, items, insight: part === 'day' ? insight : emptyInsight(), sig });
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
      : a.people.map((p, i) =>
          named(p)
            ? { id: uid('m_'), name: p.name.trim(), role: p.role, color: COLORS[(i + 1) % COLORS.length], ...(p.role === 'pet' ? { emoji: '🐶' } : {}) }
            : null,
        );
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
        const quiet = item.kind === 'fixed' || item.kind === 'your-time' || item.kind === 'me-time' || item.kind === 'care' || item.kind === 'home';
        tasks.push({
          id: uid('t_'),
          routineId: routine.id,
          memberId,
          time: item.time,
          title: item.title,
          remind: !quiet,
          ...(item.minutes ? { duration: item.minutes } : {}),
          ...(item.note ? { note: item.note } : {}),
          ...(item.kind === 'fixed' ? { fixed: true } : {}),
          ...(item.kind === 'me-time' || item.kind === 'your-time' || item.kind === 'care' || item.kind === 'home' ? { free: true } : {}),
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
    settings: {
      ...s.settings,
      meId: me.id,
      onboarded: true,
      notificationsEnabled: true,
      alarmRepeats: true,
      voiceAlarms: true,
    },
  };
}
