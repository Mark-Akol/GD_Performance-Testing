import type { DietaryPattern, GoalType } from '@/types/models';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Common allergen tags. Matched against the user's `allergies` array. */
export type Allergen = 'dairy' | 'nuts' | 'gluten' | 'eggs' | 'soy' | 'shellfish' | 'fish';

export interface FoodSuggestion {
  id: string;
  name: string;
  slots: MealSlot[];
  /** Goals this suits. Empty means "suits any goal". */
  goals: GoalType[];
  /** Dietary patterns this is allowed under. */
  patterns: DietaryPattern[];
  kcal: number;
  proteinG: number;
  contains: Allergen[];
}

const ALL_PATTERNS: DietaryPattern[] = ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'halal', 'kosher'];
const MEAT_OK: DietaryPattern[] = ['omnivore', 'halal', 'kosher'];
const FISH_OK: DietaryPattern[] = ['omnivore', 'pescatarian', 'halal', 'kosher'];
const VEG_OK: DietaryPattern[] = ['omnivore', 'vegetarian', 'pescatarian', 'halal', 'kosher'];

/**
 * A deliberately local food library.
 *
 * Nutrition APIs bill per call and add a network dependency to the one screen
 * that must work offline at 7am. A curated static list costs nothing to run,
 * never rate-limits, and is good enough for "what should I eat" prompting —
 * which is a nudge, not a prescription. Swap in an API later if the product
 * ever needs per-gram accuracy.
 */
export const FOODS: FoodSuggestion[] = [
  // Breakfast
  { id: 'b1', name: 'Greek yoghurt, berries, honey', slots: ['breakfast', 'snack'], goals: ['lose_fat', 'maintain', 'general_health'], patterns: VEG_OK, kcal: 280, proteinG: 20, contains: ['dairy'] },
  { id: 'b2', name: 'Three-egg omelette with spinach', slots: ['breakfast'], goals: ['build_muscle', 'maintain', 'lose_fat'], patterns: VEG_OK, kcal: 340, proteinG: 24, contains: ['eggs'] },
  { id: 'b3', name: 'Overnight oats with banana', slots: ['breakfast'], goals: ['endurance', 'build_muscle', 'general_health'], patterns: ALL_PATTERNS, kcal: 420, proteinG: 12, contains: ['gluten'] },
  { id: 'b4', name: 'Tofu scramble on rye', slots: ['breakfast'], goals: [], patterns: ['vegan', 'vegetarian', 'omnivore'], kcal: 360, proteinG: 22, contains: ['soy', 'gluten'] },
  { id: 'b5', name: 'Smoked salmon on sourdough', slots: ['breakfast', 'lunch'], goals: ['maintain', 'general_health'], patterns: FISH_OK, kcal: 400, proteinG: 26, contains: ['fish', 'gluten'] },
  { id: 'b6', name: 'Protein smoothie: oats, whey, berries', slots: ['breakfast', 'snack'], goals: ['build_muscle', 'endurance'], patterns: VEG_OK, kcal: 450, proteinG: 35, contains: ['dairy', 'gluten'] },

  // Lunch
  { id: 'l1', name: 'Grilled chicken, rice, greens', slots: ['lunch', 'dinner'], goals: ['build_muscle', 'maintain', 'lose_fat'], patterns: MEAT_OK, kcal: 520, proteinG: 42, contains: [] },
  { id: 'l2', name: 'Chickpea and quinoa bowl', slots: ['lunch', 'dinner'], goals: [], patterns: ALL_PATTERNS, kcal: 480, proteinG: 18, contains: [] },
  { id: 'l3', name: 'Tuna salad with olive oil', slots: ['lunch'], goals: ['lose_fat', 'maintain'], patterns: FISH_OK, kcal: 380, proteinG: 34, contains: ['fish'] },
  { id: 'l4', name: 'Lentil soup with wholegrain bread', slots: ['lunch'], goals: ['general_health', 'lose_fat'], patterns: ALL_PATTERNS, kcal: 400, proteinG: 20, contains: ['gluten'] },
  { id: 'l5', name: 'Beef stir-fry with vegetables', slots: ['lunch', 'dinner'], goals: ['build_muscle'], patterns: MEAT_OK, kcal: 600, proteinG: 45, contains: ['soy'] },
  { id: 'l6', name: 'Falafel wrap with tahini slaw', slots: ['lunch'], goals: ['maintain', 'endurance'], patterns: ALL_PATTERNS, kcal: 550, proteinG: 18, contains: ['gluten', 'nuts'] },

  // Dinner
  { id: 'd1', name: 'Baked salmon, sweet potato, broccoli', slots: ['dinner'], goals: ['build_muscle', 'general_health', 'maintain'], patterns: FISH_OK, kcal: 620, proteinG: 40, contains: ['fish'] },
  { id: 'd2', name: 'Turkey meatballs with courgette', slots: ['dinner'], goals: ['lose_fat', 'build_muscle'], patterns: MEAT_OK, kcal: 480, proteinG: 44, contains: ['eggs'] },
  { id: 'd3', name: 'Black bean chilli with brown rice', slots: ['dinner'], goals: ['endurance', 'general_health'], patterns: ALL_PATTERNS, kcal: 560, proteinG: 22, contains: [] },
  { id: 'd4', name: 'Roast vegetable and halloumi tray', slots: ['dinner'], goals: ['maintain', 'general_health'], patterns: VEG_OK, kcal: 520, proteinG: 26, contains: ['dairy'] },
  { id: 'd5', name: 'Lamb and aubergine stew', slots: ['dinner'], goals: ['build_muscle', 'maintain'], patterns: MEAT_OK, kcal: 640, proteinG: 38, contains: [] },

  // Snacks
  { id: 's1', name: 'Apple and a handful of almonds', slots: ['snack'], goals: [], patterns: ALL_PATTERNS, kcal: 210, proteinG: 6, contains: ['nuts'] },
  { id: 's2', name: 'Cottage cheese and cucumber', slots: ['snack'], goals: ['lose_fat', 'build_muscle'], patterns: VEG_OK, kcal: 160, proteinG: 18, contains: ['dairy'] },
  { id: 's3', name: 'Boiled eggs and rye crackers', slots: ['snack'], goals: ['lose_fat', 'maintain'], patterns: VEG_OK, kcal: 220, proteinG: 16, contains: ['eggs', 'gluten'] },
  { id: 's4', name: 'Hummus with carrot sticks', slots: ['snack'], goals: [], patterns: ALL_PATTERNS, kcal: 190, proteinG: 7, contains: [] },
  { id: 's5', name: 'Banana and peanut butter', slots: ['snack'], goals: ['endurance', 'build_muscle'], patterns: ALL_PATTERNS, kcal: 290, proteinG: 9, contains: ['nuts'] },
  { id: 's6', name: 'Edamame with sea salt', slots: ['snack'], goals: ['lose_fat', 'general_health'], patterns: ALL_PATTERNS, kcal: 180, proteinG: 17, contains: ['soy'] },
];

/**
 * Filter the library down to what this user can actually eat, then pick
 * deterministically by day index so the suggestion is stable across app
 * launches but rotates day to day. Deterministic beats random: a user who
 * reopens the app should not see a different dinner.
 */
export function suggestFood(params: {
  slot: MealSlot;
  goal: GoalType;
  pattern: DietaryPattern;
  allergies: string[];
  /** Any integer that changes once per day — see dayIndex(). */
  rotation: number;
}): FoodSuggestion | null {
  const blocked = new Set(params.allergies.map((a) => a.toLowerCase().trim()));

  const eligible = FOODS.filter(
    (f) =>
      f.slots.includes(params.slot) &&
      f.patterns.includes(params.pattern) &&
      !f.contains.some((c) => blocked.has(c)),
  );
  if (eligible.length === 0) return null;

  // Prefer items explicitly tagged for the goal; fall back to goal-agnostic
  // items so a restrictive filter can never produce an empty plate.
  const onGoal = eligible.filter((f) => f.goals.length === 0 || f.goals.includes(params.goal));
  const pool = onGoal.length > 0 ? onGoal : eligible;

  const index = ((params.rotation % pool.length) + pool.length) % pool.length;
  return pool[index] ?? null;
}

/** Days since the epoch — a rotation seed that advances exactly once a day. */
export function dayIndex(day: string): number {
  const ms = Date.parse(`${day}T00:00:00Z`);
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 86_400_000);
}
