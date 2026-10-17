import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TimePicker } from '../components/TimePicker';
import { Chip, FadeIn, InkButton, tap } from '../components/ui';
import { requestNotificationPermission } from '../lib/notifications';
import {
  ONE_OFF_IDEAS,
  STRUGGLES,
  buildPlan,
  defaultAnswers,
  defaultPicks,
  suggestionsFor,
  type Household,
  type OnboardingAnswers,
  type RoutineKind,
} from '../lib/onboarding';
import { addDays, dayKey, formatTime, tasksForDay } from '../lib/schedule';
import { useAkol } from '../lib/store';
import type { AkolState } from '../lib/types';
import { colors, fonts, jewels, radius, shadow, space } from '../theme';

type Step = 'who' | 'name' | 'people' | 'struggles' | 'routines' | 'leave' | 'lights' | 'picks' | 'oneoffs' | 'loud' | 'ready';

function stepsFor(a: OnboardingAnswers): Step[] {
  return [
    'who',
    'name',
    ...(a.household === 'solo' ? [] : (['people'] as Step[])),
    'struggles',
    'routines',
    ...(a.routines.includes('morning') ? (['leave'] as Step[]) : []),
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
          : true;

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
                placeholder={p.role === 'child' ? 'Child’s name' : 'Name'}
                placeholderTextColor={colors.textFaint}
                style={styles.personInput}
              />
              <Pressable
                onPress={() =>
                  set({ people: a.people.map((x, k) => (k === n ? { ...x, role: x.role === 'child' ? 'parent' : 'child' } : x)) })
                }
                style={styles.roleBtn}
                accessibilityRole="button"
                accessibilityLabel={`Switch ${p.name || 'person'} between kid and adult`}
              >
                <Text style={styles.roleText}>{p.role === 'child' ? 'Kid' : 'Adult'}</Text>
              </Pressable>
              {a.people.length > 1 && (
                <Pressable hitSlop={8} onPress={() => set({ people: a.people.filter((_, k) => k !== n) })} accessibilityLabel="Remove">
                  <Ionicons name="close" size={20} color={colors.textFaint} />
                </Pressable>
              )}
            </View>
          ))}
          <Pressable
            onPress={() => set({ people: [...a.people, { name: '', role: 'child' }] })}
            style={styles.addRow}
            accessibilityRole="button"
          >
            <Text style={styles.addText}>+ Add someone</Text>
          </Pressable>
        </View>
      );
      break;

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

    case 'routines':
      title = 'Which routine should we build first?';
      sub = 'Pick one, or both.';
      body = (
        <View style={styles.cards}>
          <BigCard emoji="☀️" label="Morning routine" active={a.routines.includes('morning')} onPress={() => toggleRoutine('morning')} />
          <BigCard emoji="🌙" label="Evening routine" active={a.routines.includes('evening')} onPress={() => toggleRoutine('evening')} />
        </View>
      );
      break;

    case 'leave':
      title = 'When do you need to be out of the door?';
      sub = 'That’s Go time. We’ll work backwards from it.';
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
      title = 'Here’s your list';
      sub = 'Untick anything you don’t need. You can change it all later.';
      const all = suggestionsFor(a);
      body = (
        <View style={{ gap: space.lg }}>
          {(['morning', 'evening'] as RoutineKind[])
            .filter((r) => a.routines.includes(r))
            .map((r) => (
              <View key={r} style={styles.pickGroup}>
                <Text style={styles.pickHead}>{r === 'morning' ? '☀️  Morning' : '🌙  Evening'}</Text>
                {all
                  .filter((s) => s.routine === r)
                  .map((s) => {
                    const on = a.picks.includes(s.id);
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => {
                          tap();
                          set({ picks: on ? a.picks.filter((x) => x !== s.id) : [...a.picks, s.id] });
                        }}
                        style={styles.pickRow}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                      >
                        <Text style={styles.pickTime}>{formatTime(s.time).replace(' a.m.', '').replace(' p.m.', '')}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pickTitle, !on && { color: colors.textFaint }]}>{s.title}</Text>
                          <Text style={styles.pickWho}>
                            {s.who === 'me' ? 'You' : kids.map((k) => k.name).join(' & ') || 'Kids'}
                          </Text>
                        </View>
                        <View style={[styles.tick, on && styles.tickOn]}>{on && <Ionicons name="checkmark" size={16} color={colors.onAccent} />}</View>
                      </Pressable>
                    );
                  })}
                <View style={[styles.pickRow, styles.goRow]}>
                  <Text style={[styles.pickTime, { color: colors.accentInk }]}>
                    {formatTime(r === 'morning' ? a.leaveAt : a.lightsOut).split(' ')[0]}
                  </Text>
                  <Text style={[styles.pickTitle, { color: colors.accentInk, flex: 1 }]}>{r === 'morning' ? '🏁 Go time' : '🌙 Lights out'}</Text>
                </View>
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
      sub = 'Here’s what the next seven days look like.';
      body = plan ? <WeekPreview plan={plan} a={a} /> : null;
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

/** Seven days, with how much is on each, then the shape of the routine. */
function WeekPreview({ plan, a }: { plan: AkolState; a: OnboardingAnswers }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, n) => addDays(new Date(), n)), []);
  const counts = days.map((d) => tasksForDay(plan, d).filter((t) => !t.checkpoint));
  const max = Math.max(1, ...counts.map((c) => c.length));
  const first = (r: string) => {
    const list = plan.tasks.filter((t) => t.routineId === r).map((t) => t.time).sort();
    return list.length ? `${formatTime(list[0])} – ${formatTime(list[list.length - 1])}` : '';
  };
  return (
    <View style={{ gap: space.lg }}>
      <View style={styles.week}>
        {days.map((d, n) => (
          <View key={n} style={styles.weekDay}>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height: `${(counts[n].length / max) * 100}%` }, n === 0 && { backgroundColor: colors.accentStrong }]} />
            </View>
            <Text style={styles.weekCount}>{counts[n].length}</Text>
            <Text style={[styles.weekName, n === 0 && { color: colors.accentInk }]}>
              {n === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.summary}>
        {plan.routines
          .filter((r) => r.name !== 'One-offs')
          .map((r) => (
            <Text key={r.id} style={styles.summaryLine}>
              {r.name === 'Morning' ? '☀️' : '🌙'}  {r.name}s · {first(r.id)} · {r.days.length === 5 ? 'weekdays' : 'every day'}
            </Text>
          ))}
        {a.oneOffs.length > 0 && <Text style={styles.summaryLine}>📌  {a.oneOffs.length} one-off{a.oneOffs.length === 1 ? '' : 's'} this week</Text>}
        <Text style={styles.summaryLine}>
          {a.loud ? '⏰' : '🔔'}  {a.loud ? 'Go time rings until everyone’s ready' : 'A notification at Go time'}
        </Text>
        <Text style={styles.summaryLine}>👥  {plan.members.map((m) => m.name).join(', ')}</Text>
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
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 9 },
  goRow: { borderTopWidth: 1, borderTopColor: colors.hairline, marginTop: space.xs, paddingTop: space.md },
  pickTime: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textDim, width: 42 },
  pickTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  pickWho: { fontFamily: fonts.light, fontSize: 12, color: colors.textDim },
  tick: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.hairlineStrong, alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: colors.accentStrong, borderColor: colors.accentStrong },
  oneOffRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: 18, padding: space.lg },
  bottom: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md },
  notSure: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textDim, textAlign: 'center' },
  week: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 22, padding: space.lg, gap: 6 },
  weekDay: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { height: 90, width: 18, borderRadius: 9, backgroundColor: colors.bgRaised, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: 18, borderRadius: 9, backgroundColor: colors.ink, minHeight: 4 },
  weekCount: { fontFamily: fonts.display, fontSize: 15, color: colors.text },
  weekName: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textDim },
  summary: { backgroundColor: colors.card, borderRadius: 22, padding: space.lg, gap: space.sm },
  summaryLine: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.text },
});
