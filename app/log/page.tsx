'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Star } from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import FoodEntryModal from '@/components/FoodEntryModal'
import { FoodItem } from '@/lib/types'
import { getTodayDate } from '@/lib/utils'
import { getFoodLogs, addFoodLog, deleteFoodLog, updateFoodLog } from '@/lib/db'
import { useSavedMeals } from '@/lib/savedMeals'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT, useUserEmail } from '@/lib/store'
import { canAddMeal, recordMealAdd } from '@/lib/limits'
import MealLimitModal from '@/components/MealLimitModal'

const MEAL_ORDER: FoodItem['mealType'][] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎',
}
const MEAL_COLORS: Record<string, string> = {
  breakfast: '#f59e0b', lunch: '#06b6d4', dinner: '#97E325', snack: '#10b981',
}
const MEAL_LABELS: Record<string, { ar: string; en: string }> = {
  breakfast: { ar: 'الإفطار',     en: 'Breakfast' },
  lunch:     { ar: 'الغداء',      en: 'Lunch'     },
  dinner:    { ar: 'العشاء',      en: 'Dinner'    },
  snack:     { ar: 'وجبة خفيفة', en: 'Snack'     },
}

export default function LogPage() {
  const t = useT()
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const lang  = profile.language ?? 'ar'
  const today = getTodayDate()

  const [foods,     setFoods]     = useState<FoodItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem,  setEditItem]  = useState<FoodItem | null>(null)  // الوجبة المراد تعديلها
  const [mealGate,  setMealGate]  = useState<Omit<FoodItem, 'id' | 'loggedAt'> | null>(null)
  const savedMeals = useSavedMeals()
  const email = useUserEmail()

  useEffect(() => {
    getFoodLogs(today).then(data => { setFoods(data); setLoading(false) })
  }, [today])

  const grouped = MEAL_ORDER.reduce((acc, meal) => {
    const items = foods.filter(f => f.mealType === meal)
    if (items.length) acc[meal] = items
    return acc
  }, {} as Record<string, FoodItem[]>)

  const totalCal = foods.reduce((s, f) => s + f.nutrition.calories, 0)

  // ── إضافة وجبة جديدة ──
  const handleAdd = async (item: Omit<FoodItem, 'id' | 'loggedAt'>) => {
    if (!canAddMeal(email)) {   // تجاوز الحد المجاني → بوابة الإعلان
      setShowModal(false)
      setMealGate(item)
      return
    }
    await doAdd(item)
    setShowModal(false)
  }

  const doAdd = async (item: Omit<FoodItem, 'id' | 'loggedAt'>) => {
    const tempItem: FoodItem = { ...item, id: `tmp-${Date.now()}`, loggedAt: new Date().toISOString() }
    setFoods(prev => [...prev, tempItem])
    recordMealAdd()
    const saved = await addFoodLog(today, item)
    if (saved) setFoods(prev => prev.map(f => f.id === tempItem.id ? saved : f))
  }

  // ── حفظ تعديل وجبة موجودة ──
  const handleEdit = async (item: Omit<FoodItem, 'id' | 'loggedAt'>) => {
    if (!editItem) return
    // تحديث optimistic
    setFoods(prev => prev.map(f => f.id === editItem.id
      ? { ...f, ...item, id: editItem.id, loggedAt: editItem.loggedAt }
      : f
    ))
    await updateFoodLog(editItem.id, item)
    setEditItem(null)
  }

  // ── حذف ──
  const handleDelete = async (id: string) => {
    setFoods(prev => prev.filter(f => f.id !== id))
    await deleteFoodLog(id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-[#97E325] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col px-4 pt-6 gap-5" style={{ direction: lang === 'en' ? 'ltr' : 'rtl' }}>

      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-black text-white">
            {t('وجبات', 'My')} <span className="text-gradient-galaxy">{t('اليوم', 'Meals')}</span>
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            {t('اليوم', 'Today')} • {Math.round(totalCal)} {t('سعرة', 'kcal')}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="btn-galaxy px-4 py-2.5 flex items-center gap-2 text-sm">
          <Plus size={16} />
          {t('إضافة', 'Add')}
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: t('سعرات', 'Kcal'),    value: Math.round(totalCal),                                                    color: '#f59e0b', icon: '🔥' },
          { label: t('بروتين', 'Protein'), value: Math.round(foods.reduce((s, f) => s + f.nutrition.protein, 0)),         color: '#06b6d4', icon: '💪' },
          { label: t('كارب', 'Carbs'),    value: Math.round(foods.reduce((s, f) => s + f.nutrition.carbs, 0)),            color: '#97E325', icon: '🌾' },
          { label: t('دهون', 'Fat'),      value: Math.round(foods.reduce((s, f) => s + f.nutrition.fat, 0)),              color: '#FF5F1F', icon: '🥑' },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center gap-1 py-3 rounded-2xl"
            style={{ background: `${s.color}12`, border: `1px solid ${s.color}25` }}>
            <span className="text-sm">{s.icon}</span>
            <span className="text-sm font-black" style={{ color: s.color }}>{s.value}</span>
            <span className="text-xs text-white/40">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Grouped meals */}
      {Object.entries(grouped).map(([meal, items]) => {
        const mealCal = items.reduce((s, i) => s + i.nutrition.calories, 0)
        const color   = MEAL_COLORS[meal]
        return (
          <div key={meal}>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{MEAL_ICONS[meal]}</span>
                <span className="font-bold" style={{ color }}>
                  {t(MEAL_LABELS[meal]?.ar ?? meal, MEAL_LABELS[meal]?.en ?? meal)}
                </span>
              </div>
              <span className="text-xs text-white/40">{Math.round(mealCal)} {t('سعرة', 'kcal')}</span>
            </div>

            <div className="space-y-2">
              {items.map(food => (
                <GlassCard key={food.id} glow="none" className="p-4" animate={false}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: `${color}18` }}>
                      {MEAL_ICONS[food.mealType]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white truncate">{food.name}</p>
                      <p className="text-xs text-white/40">
                        {food.quantity}{t('جم', 'g')} •{' '}
                        {t('بروتين', 'P')} {Math.round(food.nutrition.protein)}{t('جم', 'g')}
                      </p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="font-bold text-sm" style={{ color }}>
                        {Math.round(food.nutrition.calories)}
                        <span className="text-white/30 text-xs font-normal"> {t('كال', 'kcal')}</span>
                      </p>
                    </div>

                    {/* زر المفضلة */}
                    <button
                      onClick={() => savedMeals.toggle(food)}
                      aria-label={t('حفظ في المفضلة', 'Save to favorites')}
                      className="p-2 rounded-xl transition-colors flex-shrink-0"
                      style={{ background: savedMeals.isSaved(food) ? 'rgba(245,158,11,0.16)' : 'rgba(255,255,255,0.05)' }}>
                      <Star size={14} color={savedMeals.isSaved(food) ? '#f59e0b' : 'rgba(255,255,255,0.4)'}
                            fill={savedMeals.isSaved(food) ? '#f59e0b' : 'none'} />
                    </button>

                    {/* زر تعديل */}
                    <button
                      onClick={() => setEditItem(food)}
                      className="p-2 rounded-xl transition-colors flex-shrink-0"
                      style={{ background: 'rgba(151,227,37,0.08)' }}>
                      <Pencil size={14} color="rgba(151,227,37,0.7)" />
                    </button>

                    {/* زر حذف */}
                    <button
                      onClick={() => handleDelete(food.id)}
                      className="p-2 rounded-xl hover:bg-red-500/10 transition-colors flex-shrink-0">
                      <Trash2 size={14} color="rgba(239,68,68,0.5)" />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )
      })}

      {/* Empty state */}
      {foods.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16">
          <span className="text-6xl">🍽️</span>
          <p className="text-white/40 text-center">
            {t('لم تسجل أي وجبات اليوم بعد', 'No meals logged today yet')}
          </p>
          <button onClick={() => setShowModal(true)} className="btn-galaxy px-6 py-3">
            {t('ابدأ التسجيل', 'Start Logging')}
          </button>
        </div>
      )}

      {/* Modal إضافة */}
      {showModal && (
        <FoodEntryModal
          onSave={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* بوابة حد الوجبات — إعلان لفتح وجبة إضافية */}
      <MealLimitModal
        open={mealGate !== null}
        onClose={() => setMealGate(null)}
        onGranted={() => { const p = mealGate; setMealGate(null); if (p) doAdd(p) }}
      />

      {/* Modal تعديل */}
      {editItem && (
        <FoodEntryModal
          title={t('تعديل الوجبة', 'Edit Meal')}
          saveLabel={t('تحديث', 'Update')}
          initialName={editItem.name}
          initialNutrition={editItem.nutrition}
          initialQuantity={editItem.quantity}
          initialMealType={editItem.mealType}
          onSave={handleEdit}
          onClose={() => setEditItem(null)}
        />
      )}
    </div>
  )
}
