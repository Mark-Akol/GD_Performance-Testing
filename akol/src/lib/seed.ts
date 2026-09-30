import { FAMILY_ID } from './schedule.ts';
import type { AkolState, Member, Routine, Task } from './types.ts';

export function uid(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyState(): AkolState {
  return {
    version: 1,
    members: [],
    routines: [],
    tasks: [],
    completions: {},
    settings: {
      meId: null,
      notificationsEnabled: true,
      notifyFor: [],
      smartSkip: true,
      onboarded: false,
    },
  };
}

/** The Akol household: Mark (Dad) and Ra, on a school-morning routine. */
export function exampleFamily(parentName = 'Mark'): AkolState {
  const mark: Member = { id: 'm_mark', name: parentName, role: 'parent', color: 'sika' };
  const ra: Member = { id: 'm_ra', name: 'Ra', role: 'child', color: 'kente' };

  const school: Routine = { id: 'r_school', name: 'School Morning', days: [1, 2, 3, 4, 5], enabled: true };
  const weekend: Routine = { id: 'r_weekend', name: 'Weekend Football', days: [0, 6], enabled: true };
  const bedtime: Routine = { id: 'r_bed', name: 'Wind Down', days: [0, 1, 2, 3, 4, 5, 6], enabled: true };

  const t = (
    id: string,
    routineId: string,
    memberId: string,
    time: string,
    title: string,
    extra: Partial<Task> = {},
  ): Task => ({ id, routineId, memberId, time, title, remind: true, ...extra });

  const tasks: Task[] = [
    // Ra — school morning
    t('t_ra_up', 'r_school', ra.id, '06:30', 'Up, bed made'),
    t('t_ra_teeth', 'r_school', ra.id, '06:35', 'Brush teeth'),
    t('t_ra_dress', 'r_school', ra.id, '06:40', 'Get dressed'),
    t('t_ra_clothes', 'r_school', ra.id, '06:42', 'Add spare clothes to bag'),
    t('t_ra_lunch', 'r_school', ra.id, '06:45', 'Pack lunch', { note: 'Water bottle too' }),
    t('t_ra_bags', 'r_school', ra.id, '06:55', 'Put bags in the car'),
    t('t_ra_shoes', 'r_school', ra.id, '07:20', 'Shoes & jacket on'),
    // Mark — school morning
    t('t_mk_coffee', 'r_school', mark.id, '06:20', 'Coffee & glance at the day'),
    t('t_mk_breakfast', 'r_school', mark.id, '06:35', 'Breakfast on the table'),
    t('t_mk_gps', 'r_school', mark.id, '07:00', 'Tune GPS on the car radio'),
    t('t_mk_lock', 'r_school', mark.id, '07:25', 'Lights off, doors locked'),
    // Family checkpoint
    t('t_go', 'r_school', FAMILY_ID, '07:30', 'Go time', {
      checkpoint: true,
      note: 'Have you completed the checklist?',
    }),
    // Weekend
    t('t_ra_wk_breakfast', 'r_weekend', ra.id, '08:00', 'Breakfast'),
    t('t_ra_wk_teeth', 'r_weekend', ra.id, '08:30', 'Brush teeth'),
    t('t_ra_wk_kit', 'r_weekend', ra.id, '08:45', 'Football kit & boots in bag'),
    t('t_ra_wk_water', 'r_weekend', ra.id, '08:50', 'Fill water bottle'),
    t('t_mk_wk_snacks', 'r_weekend', mark.id, '08:55', 'Half-time oranges packed'),
    t('t_wk_go', 'r_weekend', FAMILY_ID, '09:15', 'Off to football', {
      checkpoint: true,
      note: 'Have you completed the checklist?',
    }),
    // Evening
    t('t_ra_bath', 'r_bed', ra.id, '19:00', 'Bath & pyjamas'),
    t('t_ra_bag', 'r_bed', ra.id, '19:15', 'Pack school bag for tomorrow'),
    t('t_ra_read', 'r_bed', ra.id, '19:30', 'Reading time'),
    t('t_mk_uniform', 'r_bed', mark.id, '20:00', "Lay out tomorrow's clothes"),
    t('t_bed', 'r_bed', FAMILY_ID, '20:15', 'Lights out', { checkpoint: true, note: 'Ready for tomorrow?' }),
  ];

  const s = emptyState();
  return {
    ...s,
    members: [mark, ra],
    routines: [school, weekend, bedtime],
    tasks,
    settings: { ...s.settings, meId: mark.id, onboarded: true },
  };
}

/** A fresh household with only the parent, ready to be built up. */
export function freshFamily(parentName: string): AkolState {
  const me: Member = { id: uid('m_'), name: parentName.trim() || 'Me', role: 'parent', color: 'sika' };
  const s = emptyState();
  const routine: Routine = { id: uid('r_'), name: 'Morning', days: [1, 2, 3, 4, 5], enabled: true };
  return {
    ...s,
    members: [me],
    routines: [routine],
    tasks: [
      {
        id: uid('t_'),
        routineId: routine.id,
        memberId: FAMILY_ID,
        time: '07:30',
        title: 'Go time',
        checkpoint: true,
        remind: true,
        note: 'Have you completed the checklist?',
      },
    ],
    settings: { ...s.settings, meId: me.id, onboarded: true },
  };
}
