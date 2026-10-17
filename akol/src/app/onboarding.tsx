import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TimePicker } from '../components/TimePicker';
import { Chip, FadeIn, InkButton, tap } from '../components/ui';
import { requestNotificationPermission } from '../lib/notifications';
import {
  ANCHOR_IDEAS,
  ONE_OFF_IDEAS,
  PET_PLANS,
  STRUGGLES,
  buildPlan,
  defaultAnswers,
  defaultPicks,
  minutesOf,
  nameDays,
  newAnchor,
  planDay,
  planWeek,
  stopIdeas,
  suggestionsFor,
  titleOf,
  type Anchor,
  type Household,
  type OnboardingAnswers,
  type Owner,
  type PetPlan,
  type PlanItem,
  type RoutineKind,
  type Stop,
} from '../lib/onboarding';
import { addDays, dayKey, formatDuration, formatTime, parseTime, toClockTime } from '../lib/schedule';
import { useAkol } from '../lib/store';
import type { AkolState, Weekday } from '../lib/types';
import { colors, fonts, jewels, radius, shadow, space } from '../theme';

type Step =
  | 'who'
  | 'name'
  | 'people'
  | 'pets'
  | 'struggles'
  | 'wake'
  | 'anchors'
  | 'travel'
  | 'routines'
  | 'leave'
  | 'lights'
  | 'picks'
  | 'oneoffs'
  | 'loud'
  | 'ready';

const named = (a: OnboardingAnswers) => a.anchors.filter((x) => x.title.trim());
const hasMorningAnchor = (a: OnboardingAnswers) => named(a).some((x) => x.who === 'me' && parseTime(x.time) < 12 * 60);
const DURATIONS = [5, 10, 15, 20, 30, 45, 60];
const ROLE_LABEL: Record<string, string> = { child: 'Kid', parent: 'Adult', other: 'Adult', pet: 'Pet' };

/** Remove someone, keeping everyone else's non-negotiables, stops and pet plans pointing at the right person. */
function removePerson(a: OnboardingAnswers, n: number): OnboardingAnswers {
  const shift = (i: number) => (i > n ? i - 1 : i);
  const fixStops = (stops: Stop[]) =>
    stops.filter((s) => s.person !== n).map((s) => (s.person === undefined ? s : { ...s, person: shift(s.person) }));
  const petPlans: OnboardingAnswers['petPlans'] = {};
  for (const [k, v] of Object.entries(a.petPlans)) if (Number(k) !== n) petPlans[shift(Number(k))] = v;
  return {
    ...a,
    people: a.people.filter((_, k) => k !== n),
    petPlans,
    anchors: a.anchors
      .filter((x) => x.who !== n)
      .map((x) => ({ ...x, who: x.who === 'me' ? 'me' : shift(x.who), stops: fixStops(x.stops), back: fixStops(x.back) })),
  };
}

function stepsFor(a: OnboardingAnswers): Step[] {
  return [
    'who',
    'name',
    ...(a.household === 'solo' ? [] : (['people'] as Step[])),
    ...(a.household !== 'solo' && a.people.some((p) => p.role === 'pet' && p.name.trim()) ? (['pets'] as Step[]) : []),
    'struggles',
    'wake',
    'anchors',
    ...(named(a).length ? (['travel'] as Step[]) : []),
    'routines',
    ...(a.routines.includes('morning') && !hasMorningAnchor(a) ? (['leave'] as Step[]) : []),
    ...(a.routines.includes('evening') ? (['lights'] as Step[]) : []),
    'picks',
    'oneoffs',
    'loud',
    'ready',
  ];
}

/** The first-run questionnaire. Each answer shapes the week Akol builds at the end. */
export default function Onboarding() {
  const { dispatch } = useAkol();
  const insets = useSafeAreaInsets();
  const [a, setA] = useState<OnboardingAnswers>(defaultAnswers);
  const [i, setI] = useState(0);
  const [picksReady, setPicksReady] = useState(false);
  const [plan, setPlan] = useState<AkolState | null>(null);
  const [idea, setIdea] = useState<string | null>(null);

  const steps = stepsFor(a);
  const step = steps[Math.min(i, steps.length - 1)];
  const set = (patch: Partial<OnboardingAnswers>) => setA((prev) => ({ ...prev, ...patch }));
  const kids = a.people.filter((p) => p.role === 'child' && p.name.trim());

  const goTo = (n: number) => {
    const next = steps[n];
    if (next === 'picks' && !picksReady) {
      set({ picks: defaultPicks(a) });
      setPicksReady(true);
    }
    if (next === 'anchors' && a.anchors.length === 0) set({ anchors: [newAnchor()] });
    if (next === 'ready') setPlan(buildPlan(a));
    setI(n);
  };
  const next = () => goTo(Math.min(i + 1, steps.length - 1));
  const back = () => (i === 0 ? router.back() : setI(i - 1));

  const finish = async () => {
    if (!plan) return;
    dispatch({ type: 'replace', state: plan });
    await requestNotificationPermission().catch(() => false);
    router.replace('/');
  };

  const canNext =
    step === 'name'
      ? a.myName.trim().length > 0
      : step === 'people'
        ? a.people.some((p) => p.name.trim())
        : step === 'routines'
          ? a.routines.length > 0
          : step === 'anchors'
            ? a.anchors.every((x) => !x.title.trim() || x.days.length > 0)
            : true;
  const editAnchor = (id: string, patch: Partial<Anchor>) =>
    setA((prev) => ({ ...prev, anchors: prev.anchors.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  const pickHousehold = (household: Household) => {
    const people =
      household === 'solo'
        ? []
        : a.people.length
          ? a.people
          : household === 'kids'
            ? [{ name: '', role: 'child' as const }]
            : [
                { name: '', role: 'parent' as const },
                { name: '', role: 'child' as const },
              ];
    set({ household, people });
    setPicksReady(false);
  };

  const toggleRoutine = (r: RoutineKind) => {
    set({ routines: a.routines.includes(r) ? a.routines.filter((x) => x !== r) : [...a.routines, r] });
    setPicksReady(false);
  };

  let body: ReactNode = null;
  let title = '';
  let sub = '';

  switch (step) {
    case 'who':
      title = 'Who’s Akol for?';
      sub = 'We’ll shape your lists around everyone.';
      body = (
        <View style={styles.options}>
          {(
            [
              ['solo', 'Just me', '🙋'],
              ['kids', 'Me and my kids', '👨‍👧'],
              ['family', 'The whole household', '🏠'],
            ] as [Household, string, string][]
          ).map(([v, label, emoji]) => (
            <Option key={v} label={label} emoji={emoji} active={a.household === v} onPress={() => pickHousehold(v)} />
          ))}
        </View>
      );
      break;

    case 'name':
      title = 'What should we call you?';
      sub = 'Your name shows on your own list.';
      body = (
        <TextInput
          value={a.myName}
          onChangeText={(myName) => set({ myName })}
          placeholder="Your first name"
          placeholderTextColor={colors.textFaint}
          autoFocus={Platform.OS !== 'web'}
          returnKeyType="next"
          onSubmitEditing={() => canNext && next()}
          style={styles.bigInput}
        />
      );
      break;

    case 'people':
      title = a.household === 'kids' ? 'Who are your kids?' : 'Who else is at home?';
      sub = 'Everyone gets their own colour and list.';
      body = (
        <View style={{ gap: space.md }}>
          {a.people.map((p, n) => (
            <View key={n} style={styles.personRow}>
              <View style={[styles.personDot, { backgroundColor: jewels[(['kente', 'adire', 'maasai', 'terracotta', 'malachite'] as const)[n % 5]].base }]} />
              <TextInput
                value={p.name}
                onChangeText={(name) => set({ people: a.people.map((x, k) => (k === n ? { ...x, name } : x)) })}
                placeholder={p.role === 'child' ? 'Child’s name' : p.role === 'pet' ? 'Pet’s name' : 'Name'}
                placeholderTextColor={colors.textFaint}
                style={styles.personInput}
              />
              <Pressable
                onPress={() =>
                  set({
                    people: a.people.map((x, k) =>
                      k === n ? { ...x, role: x.role === 'child' ? 'parent' : x.role === 'pet' ? 'child' : 'pet' } : x,
                    ),
                  })
                }
                style={styles.roleBtn}
                accessibilityRole="button"
                accessibilityLabel={`${p.name || 'This person'} is ${ROLE_LABEL[p.role]}. Tap to change.`}
              >
                <Text style={styles.roleText}>{ROLE_LABEL[p.role]}</Text>
              </Pressable>
              {a.people.length > 1 && (
                <Pressable hitSlop={8} onPress={() => setA((prev) => removePerson(prev, n))} accessibilityLabel="Remove">
                  <Ionicons name="close" size={20} color={colors.textFaint} />
                </Pressable>
              )}
            </View>
          ))}
          <View style={styles.addPair}>
            <Pressable
              onPress={() => set({ people: [...a.people, { name: '', role: 'child' }] })}
              style={[styles.addRow, { flex: 1 }]}
              accessibilityRole="button"
            >
              <Text style={styles.addText}>+ Add someone</Text>
            </Pressable>
            <Pressable
              onPress={() => set({ people: [...a.people, { name: '', role: 'pet' }] })}
              style={[styles.addRow, { flex: 1 }]}
              accessibilityRole="button"
            >
              <Text style={styles.addText}>+ Add a pet 🐶</Text>
            </Pressable>
          </View>
        </View>
      );
      break;

    case 'pets': {
      const pets = a.people.map((p, n) => ({ p, n })).filter(({ p }) => p.role === 'pet' && p.name.trim());
      title = pets.length === 1 ? `What’s ${pets[0].p.name.trim()}’s day?` : 'What’s your pets’ day?';
      sub = 'We’ll plan drop-offs, pick-ups, walks and dinner around it.';
      const planOf = (n: number) => a.petPlans[n] ?? { weekdays: 'home' as PetPlan, weekends: 'home' as PetPlan };
      body = (
        <View style={{ gap: space.md }}>
          {pets.map(({ p, n }) => (
            <View key={n} style={styles.anchorCard}>
              <Text style={styles.pickHead}>🐶 {p.name.trim()}</Text>
              {(['weekdays', 'weekends'] as const).map((when) => (
                <View key={when} style={{ gap: space.sm }}>
                  <Text style={styles.pickWho}>{when === 'weekdays' ? 'Weekdays' : 'Weekends'}</Text>
                  <View style={styles.chipRow}>
                    {PET_PLANS.map((o) => (
                      <Chip
                        key={o.id}
                        label={`${o.label} ${o.emoji}`}
                        active={planOf(n)[when] === o.id}
                        color={colors.ink}
                        onPress={() => set({ petPlans: { ...a.petPlans, [n]: { ...planOf(n), [when]: o.id } } })}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
      break;
    }

    case 'struggles':
      title = 'What do you struggle with?';
      sub = 'Pick any. We’ll suggest tasks that fit.';
      body = (
        <View style={styles.options}>
          {STRUGGLES.map((s) => (
            <Option
              key={s.id}
              label={s.label}
              emoji={s.emoji}
              multi
              active={a.struggles.includes(s.id)}
              onPress={() => {
                set({ struggles: a.struggles.includes(s.id) ? a.struggles.filter((x) => x !== s.id) : [...a.struggles, s.id] });
                setPicksReady(false);
              }}
            />
          ))}
        </View>
      );
      break;

    case 'wake':
      title = 'What time do you usually wake up?';
      sub = 'The time you actually get up, not the alarm you snooze. We’ll plan with what’s real.';
      body = <TimePicker value={a.typicalWake} onChange={(typicalWake) => set({ typicalWake })} />;
      break;

    case 'anchors':
      title = 'What can’t move?';
      sub = 'Times that never change: clocking in, a shift, school, your sets. We’ll plan everything else around them.';
      body = (
        <View style={{ gap: space.md }}>
          {a.anchors.map((x) => (
            <AnchorCard
              key={x.id}
              x={x}
              a={a}
              onChange={(patch) => editAnchor(x.id, patch)}
              onRemove={() => set({ anchors: a.anchors.filter((y) => y.id !== x.id) })}
            />
          ))}
          <Pressable onPress={() => set({ anchors: [...a.anchors, newAnchor()] })} style={styles.addRow} accessibilityRole="button">
            <Text style={styles.addText}>+ Add another</Text>
          </Pressable>
        </View>
      );
      break;

    case 'travel':
      title = 'How do you get there, and home?';
      sub = 'Journey time from home, drop-offs on the way, and who picks up whom. We add 5 spare minutes.';
      body = (
        <View style={{ gap: space.md }}>
          {named(a).map((x) => (
            <TravelCard
              key={x.id}
              x={x}
              a={a}
              onChange={(patch) => editAnchor(x.id, patch)}
              onPickUp={(person, on) =>
                setA((prev) => ({
                  ...prev,
                  anchors: prev.anchors.map((y) => (y.who === person ? { ...y, home: on ? 'lift' : 'drive' } : y)),
                }))
              }
            />
          ))}
        </View>
      );
      break;

    case 'routines':
      title = 'What should Akol plan?';
      sub = 'Mornings get you out of the door. Evenings get everyone to bed.';
      body = (
        <View style={styles.cards}>
          <BigCard emoji="☀️" label="Mornings" active={a.routines.includes('morning')} onPress={() => toggleRoutine('morning')} />
          <BigCard emoji="🌙" label="Evenings" active={a.routines.includes('evening')} onPress={() => toggleRoutine('evening')} />
        </View>
      );
      break;

    case 'leave':
      title = 'When do you need to be out of the door?';
      sub = 'Nothing fixed in your mornings, so we’ll work backwards from this.';
      body = (
        <View style={{ gap: space.lg }}>
          <TimePicker
            value={a.leaveAt}
            onChange={(leaveAt) => {
              set({ leaveAt });
            }}
          />
          <View style={styles.chipRow}>
            <Chip label="Weekdays" active={a.morningDays === 'weekdays'} onPress={() => set({ morningDays: 'weekdays' })} />
            <Chip label="Every day" active={a.morningDays === 'everyday'} onPress={() => set({ morningDays: 'everyday' })} />
          </View>
        </View>
      );
      break;

    case 'lights':
      title = a.household === 'solo' ? 'When do you want to be winding down?' : 'And lights out?';
      sub = 'Your evening routine leads up to it.';
      body = <TimePicker value={a.lightsOut} onChange={(lightsOut) => set({ lightsOut })} />;
      break;

    case 'picks': {
      title = 'Here’s what needs doing';
      sub = 'Untick what you don’t need, and tap a time to change how long it takes. We’ll fit it all in.';
      const all = suggestionsFor(a);
      const total = (r: RoutineKind, who: 'me' | 'kids') =>
        all
          .filter((s) => s.routine === r && (s.who === who || (who === 'me' && s.who === 'pets')) && a.picks.includes(s.id))
          .reduce((n, s) => n + minutesOf(a, s), 0);
      body = (
        <View style={{ gap: space.lg }}>
          {(['morning', 'evening'] as RoutineKind[])
            .filter((r) => a.routines.includes(r))
            .map((r) => (
              <View key={r} style={styles.pickGroup}>
                <Text style={styles.pickHead}>{r === 'morning' ? '☀️  Getting ready' : '🌙  Winding down'}</Text>
                <Text style={styles.pickWho}>
                  You: {total(r, 'me')} min{kids.length ? ` · ${kids.map((k) => k.name).join(' & ')}: ${total(r, 'kids')} min` : ''}
                </Text>
                {all
                  .filter((s) => s.routine === r)
                  .map((s) => {
                    const on = a.picks.includes(s.id);
                    const mins = minutesOf(a, s);
                    return (
                      <View key={s.id} style={styles.pickRow}>
                        <Pressable
                          onPress={() => {
                            tap();
                            set({ picks: on ? a.picks.filter((x) => x !== s.id) : [...a.picks, s.id] });
                          }}
                          style={styles.pickMain}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                        >
                          <View style={[styles.tick, on && styles.tickOn]}>{on && <Ionicons name="checkmark" size={16} color={colors.onAccent} />}</View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.pickTitle, !on && { color: colors.textFaint }]}>{titleOf(a, s)}</Text>
                            <Text style={styles.pickWho}>
                              {s.who === 'me' ? 'You' : s.who === 'pets' ? 'You, for the pets' : kids.map((k) => k.name).join(' & ') || 'Kids'}
                            </Text>
                          </View>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            tap();
                            const nextMins = DURATIONS[(DURATIONS.indexOf(mins) + 1) % DURATIONS.length] ?? 10;
                            set({ durations: { ...a.durations, [s.id]: nextMins } });
                          }}
                          style={[styles.minChip, !on && { opacity: 0.4 }]}
                          accessibilityRole="button"
                          accessibilityLabel={`${titleOf(a, s)} takes ${mins} minutes. Tap to change.`}
                        >
                          <Text style={styles.minText}>{mins} min</Text>
                        </Pressable>
                      </View>
                    );
                  })}
              </View>
            ))}
        </View>
      );
      break;
    }

    case 'oneoffs': {
      title = 'Anything just once this week?';
      sub = 'A dentist, a parcel, school trip money… Skip if not.';
      const days = Array.from({ length: 7 }, (_, n) => addDays(new Date(), n));
      body = (
        <View style={{ gap: space.lg }}>
          <View style={styles.chipRow}>
            {ONE_OFF_IDEAS.map((t) => (
              <Chip key={t} label={t} active={idea === t} onPress={() => setIdea(idea === t ? null : t)} />
            ))}
          </View>
          {idea && (
            <FadeIn>
              <Text style={styles.pickHead}>Which day?</Text>
              <View style={[styles.chipRow, { marginTop: space.sm }]}>
                {days.map((d, n) => (
                  <Chip
                    key={n}
                    label={n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
                    onPress={() => {
                      set({ oneOffs: [...a.oneOffs, { title: idea, date: dayKey(d), time: '09:00' }] });
                      setIdea(null);
                    }}
                  />
                ))}
              </View>
            </FadeIn>
          )}
          {a.oneOffs.map((o, n) => (
            <View key={n} style={styles.oneOffRow}>
              <Text style={styles.pickTitle}>📌 {o.title}</Text>
              <Text style={styles.pickWho}>
                {new Date(o.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
              </Text>
              <Pressable hitSlop={8} onPress={() => set({ oneOffs: a.oneOffs.filter((_, k) => k !== n) })} accessibilityLabel="Remove">
                <Ionicons name="close" size={18} color={colors.textFaint} />
              </Pressable>
            </View>
          ))}
        </View>
      );
      break;
    }

    case 'loud':
      title = 'How should Akol get your attention?';
      sub = 'For Go time and Lights out. You can set any task later.';
      body = (
        <View style={styles.options}>
          <Option label="A notification" emoji="🔔" active={!a.loud} onPress={() => set({ loud: false })} />
          <Option label="An alarm that rings until it’s done, with a voice" emoji="⏰" active={a.loud} onPress={() => set({ loud: true })} />
        </View>
      );
      break;

    case 'ready':
      title = `Your week is ready${a.myName.trim() ? `, ${a.myName.trim()}` : ''} 🎉`;
      sub = 'Built around what can’t move. Tap through your days.';
      body = plan ? <PlanPreview a={a} /> : null;
      break;
  }

  return (
    <View style={[styles.page, { paddingTop: insets.top + space.md }]}>
      <View style={styles.top}>
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${((i + 1) / steps.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <FadeIn key={step}>
          <View style={styles.ask}>
            <Image source={require('../../assets/icon.png')} style={styles.mascot} />
            <View style={styles.bubble}>
              <View style={styles.tail} />
              <Text style={styles.q}>{title}</Text>
              {!!sub && <Text style={styles.sub}>{sub}</Text>}
            </View>
          </View>
          <View style={{ marginTop: space.xl }}>{body}</View>
        </FadeIn>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]}>
        {step === 'struggles' && (
          <Pressable onPress={() => { set({ struggles: [] }); next(); }} hitSlop={8}>
            <Text style={styles.notSure}>I’m not sure</Text>
          </Pressable>
        )}
        {step === 'anchors' && (
          <Pressable onPress={() => { set({ anchors: [] }); next(); }} hitSlop={8}>
            <Text style={styles.notSure}>Nothing’s fixed for me</Text>
          </Pressable>
        )}
        {step === 'oneoffs' && a.oneOffs.length === 0 && (
          <Pressable onPress={next} hitSlop={8}>
            <Text style={styles.notSure}>Skip</Text>
          </Pressable>
        )}
        {step === 'ready' ? (
          <InkButton label="Let’s go" tone="accent" onPress={finish} />
        ) : (
          <InkButton label="Next" onPress={next} disabled={!canNext} />
        )}
      </View>
    </View>
  );
}

function Option({ label, emoji, active, onPress, multi }: { label: string; emoji: string; active: boolean; onPress: () => void; multi?: boolean }) {
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: active } : { selected: active }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.option, active && styles.optionOn, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <Text style={styles.optionText}>
        {label} {emoji}
      </Text>
      {active && <Ionicons name="checkmark-circle" size={22} color={colors.accentInk} />}
    </Pressable>
  );
}

function BigCard({ emoji, label, active, onPress }: { emoji: string; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.bigCard, active && styles.optionOn, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <Text style={styles.bigEmoji}>{emoji}</Text>
      <Text style={styles.bigLabel}>{label}</Text>
      {active && <Ionicons name="checkmark-circle" size={22} color={colors.accentInk} style={{ position: 'absolute', top: 14, right: 14 }} />}
    </Pressable>
  );
}

const DAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** One non-negotiable: what, whose, which days and when. */
function AnchorCard({
  x,
  a,
  onChange,
  onRemove,
}: {
  x: Anchor;
  a: OnboardingAnswers;
  onChange: (patch: Partial<Anchor>) => void;
  onRemove: () => void;
}) {
  const whos: ('me' | number)[] = [
    'me',
    ...a.people.map((_, n) => n).filter((n) => a.household !== 'solo' && a.people[n].name.trim() && a.people[n].role !== 'pet'),
  ];
  return (
    <View style={styles.anchorCard}>
      <View style={styles.anchorHead}>
        <Ionicons name="lock-closed" size={16} color={colors.textDim} />
        <TextInput
          value={x.title}
          onChangeText={(title) => onChange({ title })}
          placeholder="e.g. Clock in at work"
          placeholderTextColor={colors.textFaint}
          style={styles.anchorTitle}
        />
        <Pressable hitSlop={8} onPress={onRemove} accessibilityLabel="Remove">
          <Ionicons name="close" size={20} color={colors.textFaint} />
        </Pressable>
      </View>
      {!x.title.trim() && (
        <View style={styles.chipRow}>
          {ANCHOR_IDEAS.map((t) => (
            <Chip key={t} label={t} onPress={() => onChange({ title: t })} />
          ))}
        </View>
      )}
      {whos.length > 1 && (
        <View style={styles.chipRow}>
          {whos.map((w) => (
            <Chip
              key={String(w)}
              label={w === 'me' ? 'You' : a.people[w].name}
              active={x.who === w}
              color={colors.ink}
              onPress={() => onChange({ who: w })}
            />
          ))}
        </View>
      )}
      <View style={styles.dayRow}>
        {DAY_ORDER.map((d) => {
          const on = x.days.includes(d);
          return (
            <Pressable
              key={d}
              onPress={() => {
                tap();
                onChange({ days: on ? x.days.filter((y) => y !== d) : [...x.days, d] });
              }}
              style={[styles.dayDot, on && styles.dayOn]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={nameDays([d])}
            >
              <Text style={[styles.dayText, on && { color: '#FFFFFF' }]}>{DAY_LETTER[d]}</Text>
            </Pressable>
          );
        })}
      </View>
      <TimePicker value={x.time} onChange={(time) => onChange({ time })} />
      {x.end ? (
        <View style={{ gap: space.sm }}>
          <View style={styles.anchorHead}>
            <Text style={[styles.stepLabel, { fontSize: 15 }]}>Finishes at</Text>
            <Pressable hitSlop={8} onPress={() => onChange({ end: undefined })} accessibilityRole="button">
              <Text style={styles.linkText}>Remove</Text>
            </Pressable>
          </View>
          <TimePicker value={x.end} onChange={(end) => onChange({ end })} />
        </View>
      ) : (
        <Pressable
          onPress={() => onChange({ end: toClockTime(Math.min(parseTime(x.time) + 9 * 60, 23 * 60 + 55)) })}
          style={styles.addRow}
          accessibilityRole="button"
        >
          <Text style={styles.addText}>+ Add a finish time (to plan the trip home)</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Journey, drop-offs, and the trip home for one non-negotiable, with times worked out live. */
function TravelCard({
  x,
  a,
  onChange,
  onPickUp,
}: {
  x: Anchor;
  a: OnboardingAnswers;
  onChange: (patch: Partial<Anchor>) => void;
  onPickUp: (person: number, on: boolean) => void;
}) {
  const who = x.who === 'me' ? 'You' : a.people[x.who]?.name.trim() || '';
  const moving = x.travel > 0 || x.stops.length > 0;
  const day = x.days[0];
  const planned = day === undefined ? [] : planDay(a, day).items;
  const timeOf = (key: string) => planned.find((i) => i.key === key)?.time;
  const leave = timeOf(`leave:${x.id}`);
  const home = timeOf(`home:${x.id}`);
  const nameFor = (w: 'me' | number) => (w === 'me' ? a.myName.trim() || 'you' : a.people[w]?.name.trim());
  const driver =
    typeof x.who === 'number' && parseTime(x.time) < 12 * 60
      ? a.anchors.find((y) => y.title.trim() && y.days.some((d) => x.days.includes(d)) && y.stops.some((s) => s.person === x.who))
      : undefined;
  const pickedUpBy = typeof x.who === 'number' ? a.anchors.find((y) => y.end && y.back.some((s) => s.person === x.who)) : undefined;
  const step = (d: number) => onChange({ travel: Math.max(0, Math.min(180, x.travel + d)) });
  const has = (list: Stop[], s: Stop) => list.some((y) => y.label === s.label);
  const toggle = (field: 'stops' | 'back', s: Stop) => {
    const on = has(x[field], s);
    const next = on ? x[field].filter((y) => y.label !== s.label) : [...x[field], s];
    onChange(field === 'stops' ? { stops: next } : { back: next });
    if (field === 'back' && s.kind === 'person' && s.person !== undefined) onPickUp(s.person, !on);
  };
  return (
    <View style={styles.anchorCard}>
      <View>
        <Text style={styles.pickTitle}>
          🔒 {x.title} · {formatTime(x.time)}
          {x.end ? ` – ${formatTime(x.end)}` : ''}
        </Text>
        <Text style={styles.pickWho}>
          {who} · {nameDays(x.days)}
        </Text>
      </View>
      <View style={styles.stepRow}>
        <Text style={styles.stepLabel}>Journey from home</Text>
        <Pressable onPress={() => step(-5)} style={styles.stepBtn} accessibilityLabel="5 minutes less">
          <Ionicons name="remove" size={18} color={colors.ink} />
        </Pressable>
        <Text style={styles.stepValue}>{x.travel} min</Text>
        <Pressable onPress={() => step(5)} style={styles.stepBtn} accessibilityLabel="5 minutes more">
          <Ionicons name="add" size={18} color={colors.ink} />
        </Pressable>
      </View>
      {driver ? (
        <Text style={styles.pickWho}>🚗 Rides with {nameFor(driver.who)} in the morning</Text>
      ) : (
        <>
          <Text style={styles.wayLabel}>On the way there</Text>
          <View style={styles.chipRow}>
            <Chip label="At home" active={!moving} color={colors.ink} onPress={() => onChange({ travel: 0, stops: [] })} />
            {stopIdeas(a, x, 'there').map((sp) => (
              <Chip key={sp.label} label={`${sp.label} +${sp.minutes}`} active={has(x.stops, sp)} color={colors.ink} onPress={() => toggle('stops', sp)} />
            ))}
          </View>
          {leave && (
            <View style={styles.leaveBy}>
              <Text style={styles.leaveByText}>Leave by {formatTime(leave)}</Text>
            </View>
          )}
        </>
      )}
      {x.end && (moving || driver) && (
        <>
          <Text style={styles.wayLabel}>Getting home</Text>
          {pickedUpBy ? (
            <Text style={styles.pickWho}>🚗 Picked up by {nameFor(pickedUpBy.who)}</Text>
          ) : (
            <>
              <View style={styles.chipRow}>
                <Chip label="Drive home" active={x.home !== 'cab'} color={colors.ink} onPress={() => onChange({ home: 'drive' })} />
                <Chip label="Cab 🚕" active={x.home === 'cab'} color={colors.ink} onPress={() => onChange({ home: 'cab', back: [] })} />
              </View>
              {x.home !== 'cab' && (
                <View style={styles.chipRow}>
                  {stopIdeas(a, x, 'back').map((sp) => (
                    <Chip key={sp.label} label={`${sp.label} +${sp.minutes}`} active={has(x.back, sp)} color={colors.ink} onPress={() => toggle('back', sp)} />
                  ))}
                </View>
              )}
              {home && (
                <View style={styles.leaveBy}>
                  <Text style={styles.leaveByText}>Home by {formatTime(home)}</Text>
                </View>
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}

const KIND_ICON: Partial<Record<PlanItem['kind'], string>> = {
  wake: '⏰',
  leave: '🏁',
  fixed: '🔒',
  'lights-out': '🌙',
  'get-ready': '👟',
  drop: '🚗',
  pickup: '🚗',
};

/** The planned days, one group at a time, with how each one balances out. */
function PlanPreview({ a }: { a: OnboardingAnswers }) {
  const week = useMemo(() => planWeek(a), [a]);
  const [g, setG] = useState(0);
  const group = week[Math.min(g, week.length - 1)];
  if (!group) return null;
  const kidNames = a.people.filter((p) => p.role === 'child' && p.name.trim()).map((p) => p.name.trim()).join(' & ');
  const ownerName = (o: Owner) =>
    o === 'me' ? 'You' : o === 'kids' ? kidNames || 'Kids' : o === 'family' ? 'Everyone' : a.people[o]?.name ?? '';
  const { insight } = group;
  return (
    <View style={{ gap: space.md }}>
      <View style={styles.chipRow}>
        {week.map((w, n) => (
          <Chip key={w.name + w.part} label={w.name} active={n === g} color={colors.ink} onPress={() => setG(n)} />
        ))}
      </View>
      {group.part === 'day' && insight.wake && (
        <View style={[styles.insight, insight.earlier > 0 && styles.insightWarn]}>
          <Text style={styles.insightBig}>
            {insight.meTime >= 10
              ? `☕ ${insight.meTime} minutes to yourself`
              : insight.earlier > 0
                ? `⏰ Up ${insight.earlier} minutes earlier than usual`
                : '✅ Fits your usual wake-up'}
          </Text>
          <Text style={styles.insightSmall}>
            Wake {formatTime(insight.wake)}
            {insight.sleepIn >= 30 ? ` (a ${formatDuration(insight.sleepIn)} lie-in)` : ''}
            {insight.leave ? ` · leave ${formatTime(insight.leave)}` : ''}
          </Text>
        </View>
      )}
      {group.part === 'day' && insight.creche && (
        <View style={styles.careRow}>
          <Text style={styles.careText}>
            🧸 {kidNames} at creche {formatTime(insight.creche.from)}
            {insight.creche.to ? ` – ${formatTime(insight.creche.to)} · ${insight.creche.by} collects` : ''}
          </Text>
        </View>
      )}
      {group.part === 'day' &&
        insight.gaps.map((g, n) => (
          <View key={`gap${n}`} style={[styles.careRow, styles.warnRow]}>
            <Text style={styles.careText}>
              ⚠️ Nobody is with {kidNames} {formatTime(g.from)} – {formatTime(g.to)}
            </Text>
          </View>
        ))}
      {group.part === 'day' &&
        insight.warnings.map((w, n) => (
          <View key={`warn${n}`} style={[styles.careRow, styles.warnRow]}>
            <Text style={styles.careText}>⚠️ {w}</Text>
          </View>
        ))}
      {group.part === 'day' && !!kidNames && !insight.gaps.length && !insight.warnings.length && !!insight.creche?.to && (
        <View style={styles.careRow}>
          <Text style={styles.careText}>✅ {kidNames} always has a grown-up or the creche</Text>
        </View>
      )}
      <View style={styles.planList}>
        {group.items.map((it, n) => {
          const me = it.kind === 'me-time' || it.kind === 'your-time';
          return (
            <View key={n} style={[styles.planRow, n > 0 && styles.planBorder, me && styles.planMe, it.kind === 'fixed' && styles.planFixed]}>
              <Text style={styles.planTime}>{formatTime(it.time)}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.planTitle}>
                  {KIND_ICON[it.kind] ? `${KIND_ICON[it.kind]} ` : ''}
                  {it.title}
                </Text>
                <Text style={styles.planWho}>
                  {[ownerName(it.owner), it.minutes ? formatDuration(it.minutes) : null, it.note].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg, width: '100%', maxWidth: 600, alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.bgRaised, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.accentStrong },
  scroll: { padding: space.lg, paddingTop: space.xl, paddingBottom: space.xxl },
  ask: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mascot: { width: 56, height: 56, borderRadius: 16, transform: [{ rotate: '-8deg' }] },
  bubble: { flex: 1, backgroundColor: colors.card, borderRadius: 26, padding: space.lg, paddingVertical: space.lg + 2, ...shadow },
  tail: {
    position: 'absolute',
    left: -6,
    top: '50%',
    width: 14,
    height: 14,
    marginTop: -7,
    backgroundColor: colors.card,
    transform: [{ rotate: '45deg' }],
  },
  q: { fontFamily: fonts.display, fontSize: 23, lineHeight: 29, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textDim, marginTop: 4 },
  options: { gap: space.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: space.xl,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionOn: { backgroundColor: colors.accentSoft, borderColor: colors.accentStrong },
  optionText: { flex: 1, fontFamily: fonts.medium, fontSize: 17, lineHeight: 23, color: colors.text },
  cards: { flexDirection: 'row', gap: space.md },
  bigCard: {
    flex: 1,
    aspectRatio: 0.85,
    backgroundColor: colors.card,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bigEmoji: { fontSize: 56 },
  bigLabel: { fontFamily: fonts.medium, fontSize: 17, color: colors.text },
  bigInput: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.card, borderRadius: 22, paddingHorizontal: space.lg },
  personDot: { width: 14, height: 14, borderRadius: 7 },
  personInput: { flex: 1, fontFamily: fonts.medium, fontSize: 17, color: colors.text, paddingVertical: space.lg },
  roleBtn: { backgroundColor: colors.bgRaised, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  roleText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textDim },
  addRow: { borderRadius: 22, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.hairlineStrong, paddingVertical: space.lg, alignItems: 'center' },
  addText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textDim },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pickGroup: { backgroundColor: colors.card, borderRadius: 22, padding: space.lg, gap: 2 },
  pickHead: { fontFamily: fonts.display, fontSize: 16, color: colors.text, marginBottom: space.xs },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 7 },
  pickMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  minChip: { backgroundColor: colors.bgRaised, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  minText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  anchorCard: { backgroundColor: colors.card, borderRadius: 22, padding: space.lg, gap: space.md },
  addPair: { flexDirection: 'row', gap: space.sm },
  linkText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.accentInk },
  wayLabel: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.textDim },
  careRow: { backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: space.lg, paddingVertical: space.md },
  warnRow: { backgroundColor: '#FFF4DB' },
  careText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.text },
  anchorHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  anchorTitle: { flex: 1, fontFamily: fonts.display, fontSize: 19, color: colors.text, paddingVertical: 4 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  dayDot: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgRaised, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.ink },
  dayText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textDim },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  stepBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgRaised, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontFamily: fonts.display, fontSize: 18, color: colors.text, minWidth: 64, textAlign: 'center' },
  leaveBy: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6 },
  leaveByText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.accentInk },
  insight: { backgroundColor: colors.accentSoft, borderRadius: 20, padding: space.lg, gap: 2 },
  insightWarn: { backgroundColor: '#FFF4DB' },
  insightBig: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  insightSmall: { fontFamily: fonts.medium, fontSize: 14, color: colors.textDim },
  planList: { backgroundColor: colors.card, borderRadius: 22, paddingHorizontal: space.lg, paddingVertical: space.xs },
  planRow: { flexDirection: 'row', gap: space.md, paddingVertical: 10 },
  planBorder: { borderTopWidth: 1, borderTopColor: colors.hairline },
  planMe: { backgroundColor: colors.accentSoft, marginHorizontal: -space.lg, paddingHorizontal: space.lg },
  planFixed: { backgroundColor: colors.bgRaised, marginHorizontal: -space.lg, paddingHorizontal: space.lg },
  planTime: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textDim, width: 66, paddingTop: 2 },
  planTitle: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.text },
  planWho: { fontFamily: fonts.light, fontSize: 12, color: colors.textDim },
  pickTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  pickWho: { fontFamily: fonts.light, fontSize: 12, color: colors.textDim },
  tick: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.hairlineStrong, alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: colors.accentStrong, borderColor: colors.accentStrong },
  oneOffRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: 18, padding: space.lg },
  bottom: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md },
  notSure: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textDim, textAlign: 'center' },
});
