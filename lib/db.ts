import { createClient } from '@/lib/supabase/client'
import { FoodItem } from '@/lib/types'
import type { StoredProfile } from '@/lib/store'

// ── helpers ─────────────────────────────────────────────────────────
function rowToFoodItem(row: Record<string, unknown>): FoodItem {
  return {
    id: row.id as string,
    name: row.name as string,
    quantity: row.quantity as number,
    unit: (row.unit as string) || 'g',
    mealType: row.meal_type as FoodItem['mealType'],
    loggedAt: row.logged_at as string,
    nutrition: {
      calories: row.calories as number,
      protein: row.protein as number,
      carbs: row.carbs as number,
      fat: row.fat as number,
      fiber: (row.fiber as number) || 0,
      sugars: (row.sugars as number) || 0,
      saturatedFat: (row.saturated_fat as number) || 0,
      unsaturatedFat: (row.unsaturated_fat as number) || 0,
      sodium: (row.sodium as number) || 0,
      potassium: (row.potassium as number) || 0,
    },
  }
}

// ── Food Logs ────────────────────────────────────────────────────────

export async function getFoodLogs(date: string): Promise<FoodItem[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('logged_at', { ascending: true })

  if (error || !data) return []
  return data.map(rowToFoodItem)
}

export async function addFoodLog(
  date: string,
  item: Omit<FoodItem, 'id' | 'loggedAt'>
): Promise<FoodItem | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('food_logs')
    .insert({
      user_id:         user.id,
      date,
      name:            item.name,
      quantity:        item.quantity,
      unit:            item.unit,
      meal_type:       item.mealType,
      calories:        item.nutrition.calories,
      protein:         item.nutrition.protein,
      carbs:           item.nutrition.carbs,
      fat:             item.nutrition.fat,
      fiber:           item.nutrition.fiber       ?? 0,
      sugars:          item.nutrition.sugars      ?? 0,
      saturated_fat:   item.nutrition.saturatedFat ?? 0,
      unsaturated_fat: item.nutrition.unsaturatedFat ?? 0,
      sodium:          item.nutrition.sodium      ?? 0,
      potassium:       item.nutrition.potassium   ?? 0,
    })
    .select()
    .single()

  if (error || !data) return null
  return rowToFoodItem(data)
}

export async function deleteFoodLog(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('food_logs').delete().eq('id', id)
}

export async function updateFoodLog(
  id: string,
  item: Omit<FoodItem, 'id' | 'loggedAt'>
): Promise<FoodItem | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('food_logs')
    .update({
      name:            item.name,
      quantity:        item.quantity,
      unit:            item.unit,
      meal_type:       item.mealType,
      calories:        item.nutrition.calories,
      protein:         item.nutrition.protein,
      carbs:           item.nutrition.carbs,
      fat:             item.nutrition.fat,
      fiber:           item.nutrition.fiber        ?? 0,
      sugars:          item.nutrition.sugars       ?? 0,
      saturated_fat:   item.nutrition.saturatedFat ?? 0,
      unsaturated_fat: item.nutrition.unsaturatedFat ?? 0,
      sodium:          item.nutrition.sodium       ?? 0,
      potassium:       item.nutrition.potassium    ?? 0,
    })
    .eq('id', id)
    .select()
    .single()
  if (error || !data) return null
  return rowToFoodItem(data)
}

// ── Weight Entries ────────────────────────────────────────────────────

export async function getWeightEntries() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('weight_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true })
    .limit(30)

  return data ?? []
}

/** Records today's weight — in BOTH places it has to live.
 *
 *  `weight_entries` is the history the chart draws. `profiles.weight` is the
 *  CURRENT weight every calorie, protein and plan target is computed from.
 *  Writing only the first is what made the app feel haunted: the chart showed
 *  85, every number on the page kept using the old weight, and the moment the
 *  user opened settings the figure "suddenly changed" on them. One weight, two
 *  homes, written together.
 *
 *  upsert, not insert: weighing yourself twice in a day used to add two rows
 *  for the same date and the chart drew two points stacked on one day. */
export async function addWeightEntry(weight: number, date: string, note?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const row = { user_id: user.id, weight, date, note }

  /* Upsert needs the UNIQUE(user_id, date) constraint from
     supabase-weight-fix.sql. The app is already live on the App Store and
     serves the site directly, so this code can reach real users BEFORE that
     migration is run — and a bare upsert would then fail silently and lose
     their reading. It falls back to a plain insert until the constraint
     exists, which is the old behaviour: saved, just not deduped. */
  let { data, error } = await supabase
    .from('weight_entries')
    .upsert(row, { onConflict: 'user_id,date' })
    .select()
    .single()

  if (error) {
    ({ data } = await supabase.from('weight_entries').insert(row).select().single())
  }

  /* the profile is the source of truth for every target on screen — done
     separately so a failure here never costs the user their reading */
  await supabase.from('profiles').update({ weight }).eq('id', user.id)

  return data
}

// ── Workout Plans ─────────────────────────────────────────────────────

export interface WorkoutPlan {
  id: string
  goal: string
  equipment: string[]
  age: number
  weight: number
  plan_content: string
  created_at: string
}

export async function savePlan(plan: {
  goal: string
  equipment: string[]
  age: number
  weight: number
  plan_content: string
}): Promise<WorkoutPlan | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('workout_plans')
    .insert({ user_id: user.id, ...plan })
    .select()
    .single()

  return data as WorkoutPlan | null
}

export async function getPlans(): Promise<WorkoutPlan[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (data as WorkoutPlan[]) ?? []
}

export async function deletePlan(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('workout_plans').delete().eq('id', id)
}

// ── Profile ──────────────────────────────────────────────────────────────

/**
 * Load the user's profile from Supabase.
 * Returns null if not logged in, no profile, or onboarding not completed.
 */
export async function loadProfileFromSupabase(): Promise<StoredProfile | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !data || !data.completed_onboarding) return null

    return {
      name:                data.name           ?? 'مستخدم',
      age:                 data.age            ?? 25,
      height:              data.height         ?? 170,
      weight:              data.weight         ?? 75,
      targetWeight:        data.target_weight  ?? 70,
      gender:              (data.gender        ?? 'male') as 'male' | 'female',
      activityLevel:       data.activity_level ?? 'moderate',
      goal:                data.goal           ?? 'lose',
      diet:                'balanced',          // not stored in DB, use default
      dailyCalories:       data.daily_calories ?? 2000,
      targetProtein:       data.target_protein ?? 150,
      targetCarbs:         data.target_carbs   ?? 200,
      targetFat:           data.target_fat     ?? 65,
      targetWater:         data.target_water   ?? 2500,
      completedOnboarding: true,
      theme:               (data.theme         ?? 'dark') as 'dark' | 'light',
      notifications:       data.notifications  ?? false,
      language:            'ar',               // not stored in DB, use default
      xpLocked:            data.xp_locked      ?? 0,
      xpPending:           data.xp_pending     ?? 0,
      xpDate:              data.xp_date        ?? '',
    }
  } catch {
    return null
  }
}

/**
 * Save the user's profile to Supabase (only persists columns that exist in the DB).
 * diet and language are localStorage-only and are intentionally excluded.
 */
export async function saveProfileToSupabase(profile: StoredProfile): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').upsert({
      id:                   user.id,
      name:                 profile.name,
      age:                  profile.age,
      height:               profile.height,
      weight:               profile.weight,
      target_weight:        profile.targetWeight,
      gender:               profile.gender,
      activity_level:       profile.activityLevel,
      goal:                 profile.goal,
      daily_calories:       profile.dailyCalories,
      target_protein:       profile.targetProtein,
      target_carbs:         profile.targetCarbs,
      target_fat:           profile.targetFat,
      target_water:         profile.targetWater,
      completed_onboarding: profile.completedOnboarding ?? true,
      theme:                profile.theme ?? 'dark',
      notifications:        profile.notifications ?? false,
      updated_at:           new Date().toISOString(),
    }, { onConflict: 'id' })
  } catch { /* silent */ }
}

/**
 * Sync XP to Supabase — separate from the profile upsert so it fails
 * silently if the xp columns haven't been added yet (supabase-updates.sql).
 */
export async function saveXpToSupabase(
  xpLocked: number, xpPending: number, xpDate: string
): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('profiles')
      .update({ xp_locked: xpLocked, xp_pending: xpPending, xp_date: xpDate })
      .eq('id', user.id)
  } catch { /* silent — columns may not exist yet */ }
}

// ── Water Logs ─────────────────────────────────────────────────────────

export async function getWaterLog(date: string): Promise<number> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data } = await supabase
    .from('water_logs')
    .select('amount_ml')
    .eq('user_id', user.id)
    .eq('date', date)
    .single()

  return data?.amount_ml ?? 0
}

export async function setWaterLog(date: string, amount_ml: number): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('water_logs')
    .upsert({ user_id: user.id, date, amount_ml, updated_at: new Date().toISOString() },
             { onConflict: 'user_id,date' })
}
