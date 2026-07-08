'use client'

import { useLocalStorage } from './store'
import { FoodItem, NutritionData } from './types'

// وجبة محفوظة في المفضلة — قالب جاهز لإعادة الإضافة لاحقاً
export interface SavedMeal {
  id: string
  name: string
  quantity: number
  mealType: FoodItem['mealType']
  nutrition: NutritionData
}

type MealLike = {
  name: string
  quantity: number
  mealType: FoodItem['mealType']
  nutrition: NutritionData
}

// مفتاح تعريف الوجبة (الاسم + الكمية + السعرات) لمنع التكرار
const keyOf = (m: { name: string; quantity: number; nutrition: NutritionData }) =>
  `${m.name.trim()}|${Math.round(m.quantity)}|${Math.round(m.nutrition.calories)}`

export function useSavedMeals() {
  const [saved, setSaved, hydrated] = useLocalStorage<SavedMeal[]>('galaxy-saved-meals', [])

  const isSaved = (m: { name: string; quantity: number; nutrition: NutritionData }) =>
    saved.some(s => keyOf(s) === keyOf(m))

  // يحفظ الوجبة أو يزيلها إن كانت محفوظة (زر النجمة)
  const toggle = (m: MealLike) => {
    const k = keyOf(m)
    setSaved(prev => {
      if (prev.some(s => keyOf(s) === k)) return prev.filter(s => keyOf(s) !== k)
      const entry: SavedMeal = {
        id: `sm-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        name: m.name.trim(),
        quantity: m.quantity,
        mealType: m.mealType,
        nutrition: m.nutrition,
      }
      return [entry, ...prev].slice(0, 60)
    })
  }

  const remove = (id: string) => setSaved(prev => prev.filter(s => s.id !== id))

  return { saved, hydrated, isSaved, toggle, remove }
}
