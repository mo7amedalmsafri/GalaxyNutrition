import { createClient } from '@/lib/supabase/client'
import { FoodItem } from '@/lib/types'

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

export async function addWeightEntry(weight: number, date: string, note?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('weight_entries')
    .insert({ user_id: user.id, weight, date, note })
    .select()
    .single()

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
