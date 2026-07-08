'use client'

import { useState, useRef, useEffect } from 'react'
import { X, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react'
import { NutritionData, FoodItem } from '@/lib/types'
import { searchFoods, FoodDBItem } from '@/lib/foodDatabase'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT } from '@/lib/store'

interface FoodEntryModalProps {
  initialName?: string
  initialNutrition?: Partial<NutritionData>
  initialQuantity?: number
  initialMealType?: FoodItem['mealType']
  onSave: (item: Omit<FoodItem, 'id' | 'loggedAt'>) => void
  onClose: () => void
}

const MEAL_TYPES = [
  { value: 'breakfast', ar: 'إفطار',  en: 'Breakfast', icon: '🌅' },
  { value: 'lunch',     ar: 'غداء',   en: 'Lunch',     icon: '☀️' },
  { value: 'dinner',    ar: 'عشاء',   en: 'Dinner',    icon: '🌙' },
  { value: 'snack',     ar: 'خفيفة',  en: 'Snack',     icon: '🍎' },
]

// Defined outside to keep stable identity
function NutritionField({
  label,
  field,
  value,
  onChange,
  unit = 'g',
  color = 'rgba(255,255,255,0.6)',
}: {
  label: string
  field: string
  value: number
  onChange: (v: number) => void
  unit?: string
  color?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color }}>
        {label}{' '}
        <span className="text-white/25">({unit})</span>
      </label>
      <input
        type="number"
        min="0"
        step="0.1"
        value={value === 0 ? '' : value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        placeholder="0"
        className="galaxy-input px-3 py-2 text-sm w-full"
        dir="ltr"
      />
    </div>
  )
}

export default function FoodEntryModal({
  initialName = '',
  initialNutrition,
  initialQuantity,
  initialMealType,
  onSave,
  onClose,
}: FoodEntryModalProps) {
  const t    = useT()
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const L    = (profile.theme    ?? 'dark') === 'light'
  const lang = profile.language  ?? 'ar'

  // ── Theme-aware style tokens ──
  const modalBg   = L ? 'rgba(215,221,228,0.99)'  : 'linear-gradient(180deg,#1a0533 0%,#0d0025 100%)'
  const headerBg  = L ? 'rgba(205,213,220,0.99)'  : 'rgba(26,5,51,0.97)'
  const headerBdr = L ? 'rgba(0,0,0,0.09)'         : 'rgba(107,33,168,0.2)'
  const dropBg    = L ? 'rgba(218,224,230,0.99)'   : 'rgba(10,0,30,0.98)'
  const dropBdr   = L ? 'rgba(0,0,0,0.10)'         : 'rgba(107,33,168,0.35)'
  const rowBdr    = L ? 'rgba(0,0,0,0.06)'         : 'rgba(255,255,255,0.05)'
  const btnBg     = L ? 'rgba(0,0,0,0.08)'         : 'rgba(107,33,168,0.3)'
  const btnColor  = L ? '#080808'                   : '#c084fc'
  const qkActive  = L ? 'rgba(0,0,0,0.15)'         : 'rgba(107,33,168,0.5)'
  const qkInact   = L ? 'rgba(0,0,0,0.05)'         : 'rgba(255,255,255,0.06)'
  const qkActClr  = L ? '#080808'                   : '#c084fc'
  const qkInactCl = L ? 'rgba(0,0,0,0.40)'         : 'rgba(255,255,255,0.35)'
  const qkActBdr  = L ? 'rgba(0,0,0,0.25)'         : 'rgba(192,132,252,0.4)'
  const mealActive = L ? 'rgba(0,0,0,0.12)'        : 'rgba(107,33,168,0.4)'
  const mealInact  = L ? 'rgba(0,0,0,0.04)'        : 'rgba(255,255,255,0.05)'
  const mealActBdr = L ? 'rgba(0,0,0,0.22)'        : 'rgba(192,132,252,0.6)'
  const mealInBdr  = L ? 'rgba(0,0,0,0.07)'        : 'rgba(255,255,255,0.08)'
  const mealActClr = L ? '#080808'                  : '#c084fc'
  const mealInClr  = L ? 'rgba(0,0,0,0.45)'        : 'rgba(255,255,255,0.45)'
  const summaryBg  = L ? 'rgba(0,0,0,0.06)'        : 'rgba(107,33,168,0.12)'
  const summaryBdr = L ? 'rgba(0,0,0,0.10)'        : 'rgba(107,33,168,0.2)'
  const modalBdr   = L ? 'rgba(0,0,0,0.15)'        : 'rgba(107,33,168,0.45)'
  const closeBtnCl = L ? 'rgba(0,0,0,0.45)'        : 'rgba(255,255,255,0.55)'
  const chevronCl  = L ? 'rgba(0,0,0,0.35)'        : 'rgba(255,255,255,0.4)'
  const microsBg   = L ? 'rgba(0,0,0,0.05)'        : 'rgba(255,255,255,0.04)'
  const microsBdr  = L ? 'rgba(0,0,0,0.09)'        : 'rgba(255,255,255,0.08)'

  const [name, setName] = useState(initialName)
  const [quantity, setQuantity] = useState(initialQuantity ?? 100)
  const [mealType, setMealType] = useState<FoodItem['mealType']>(initialMealType ?? 'lunch')
  const [showMicros, setShowMicros] = useState(false)
  const [nutrition, setNutrition] = useState<NutritionData>({
    calories: initialNutrition?.calories ?? 0,
    protein: initialNutrition?.protein ?? 0,
    carbs: initialNutrition?.carbs ?? 0,
    fiber: initialNutrition?.fiber ?? 0,
    sugars: initialNutrition?.sugars ?? 0,
    fat: initialNutrition?.fat ?? 0,
    saturatedFat: initialNutrition?.saturatedFat ?? 0,
    unsaturatedFat: initialNutrition?.unsaturatedFat ?? 0,
    sodium: initialNutrition?.sodium ?? 0,
    potassium: initialNutrition?.potassium ?? 0,
  })

  // Autocomplete
  const [suggestions, setSuggestions] = useState<FoodDBItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // AI nutrition lookup
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)

  // يحسب القيم الغذائية للاسم المكتوب بالذكاء الاصطناعي (لكل 100 جرام) ويملأ الحقول
  const calcWithAI = async () => {
    const foodName = name.trim()
    if (!foodName || aiLoading) return
    setAiLoading(true)
    setAiError('')
    setShowSuggestions(false)
    try {
      const res = await fetch('/api/recalculate-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // بلا وزن صريح — يقدّره الذكاء من النص («ملعقة عسل» = ملعقة، ليس 100جم)
        body: JSON.stringify({ foodName, language: lang }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      const n = data.nutrition ?? {}
      setNutrition({
        calories: n.calories ?? 0,
        protein: n.protein ?? 0,
        carbs: n.carbs ?? 0,
        fiber: n.fiber ?? 0,
        sugars: n.sugars ?? 0,
        fat: n.fat ?? 0,
        saturatedFat: n.saturatedFat ?? 0,
        unsaturatedFat: n.unsaturatedFat ?? 0,
        sodium: n.sodium ?? 0,
        potassium: n.potassium ?? 0,
      })
      // اضبط الكمية على الوزن الفعلي للكمية الموصوفة (ملعقة، كوب…)
      if (typeof data.totalGrams === 'number' && data.totalGrams > 0) {
        setQuantity(data.totalGrams)
      }
    } catch {
      setAiError(t('تعذّر الحساب — تأكد من الاتصال وحاول مرة أخرى', 'Could not calculate — check your connection and try again'))
    } finally {
      setAiLoading(false)
    }
  }

  // Scroll to top on open
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollTo({ top: 0 }), 30)
    return () => clearTimeout(t)
  }, [])

  const handleNameChange = (val: string) => {
    setName(val)
    if (val.trim().length >= 1) {
      const results = searchFoods(val).slice(0, 6)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const selectSuggestion = (food: FoodDBItem) => {
    setName(lang === 'en' ? food.name : food.nameAr)
    setNutrition({
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fiber: food.fiber,
      sugars: food.sugars,
      fat: food.fat,
      saturatedFat: food.saturatedFat,
      unsaturatedFat: food.unsaturatedFat,
      sodium: food.sodium ?? 0,
      potassium: food.potassium ?? 0,
    })
    setShowSuggestions(false)
  }

  const scale = quantity / 100
  const scaled = (v: number) => Math.round(v * scale * 10) / 10

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      quantity,
      unit: 'g',
      mealType,
      nutrition: {
        calories: scaled(nutrition.calories),
        protein: scaled(nutrition.protein),
        carbs: scaled(nutrition.carbs),
        fiber: scaled(nutrition.fiber ?? 0),
        sugars: scaled(nutrition.sugars ?? 0),
        fat: scaled(nutrition.fat),
        saturatedFat: scaled(nutrition.saturatedFat ?? 0),
        unsaturatedFat: scaled(nutrition.unsaturatedFat ?? 0),
        sodium: scaled(nutrition.sodium ?? 0),
        potassium: scaled(nutrition.potassium ?? 0),
      },
    })
    onClose()
  }

  const setN = (field: keyof NutritionData, val: number) =>
    setNutrition(prev => ({ ...prev, [field]: val }))

  return (
    // Outer backdrop — paddingBottom lifts modal above the nav bar
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', paddingBottom: 78 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={scrollRef}
        className="w-full max-w-lg rounded-t-3xl overflow-y-auto animate-slide-up"
        style={{
          background: modalBg,
          border: `1px solid ${modalBdr}`,
          borderBottom: 'none',
          maxHeight: 'calc(92vh - 78px)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{
            background: headerBg,
            borderBottom: `1px solid ${headerBdr}`,
          }}
        >
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} color={closeBtnCl} />
          </button>
          <h2 className="text-lg font-bold text-white">{t('إضافة طعام', 'Add Food')}</h2>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="btn-galaxy px-4 py-2 text-sm"
            style={{ opacity: name.trim() ? 1 : 0.5 }}
          >
            {t('حفظ', 'Save')}
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">

          {/* ── Food name with autocomplete ── */}
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">{t('اسم الطعام', 'Food Name')}</label>
            <input
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              onFocus={() => name.trim() && setShowSuggestions(suggestions.length > 0)}
              className="galaxy-input px-4 py-3 text-base w-full font-medium"
              placeholder={t('اكتب أو ابحث: دجاج، أرز، شوفان...', 'Type or search: chicken, rice, oats...')}
            />

            {/* Suggestion dropdown */}
            {showSuggestions && (
              <div
                className="mt-1.5 rounded-xl overflow-hidden"
                style={{
                  background: dropBg,
                  border: `1px solid ${dropBdr}`,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                }}
              >
                {suggestions.map((food, i) => (
                  <button
                    key={food.id}
                    onClick={() => selectSuggestion(food)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors hover:bg-white/5 active:bg-white/10"
                    style={{
                      borderBottom:
                        i < suggestions.length - 1
                          ? `1px solid ${rowBdr}`
                          : 'none',
                    }}
                  >
                    <span className="text-xl leading-none">{food.emoji}</span>
                    <span className="flex-1 text-sm text-white">{lang === 'en' ? food.name : food.nameAr}</span>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-black" style={{ color: '#f59e0b' }}>
                        {food.calories}
                      </span>
                      <span className="text-xs text-white/30"> {t('كال/100جم', 'kcal/100g')}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* AI calculate button — fills nutrition for any typed food */}
            {name.trim() && !showSuggestions && (
              <button
                onClick={calcWithAI}
                disabled={aiLoading}
                className="mt-2 w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, rgba(151,227,37,0.16), rgba(0,212,255,0.10))',
                  border: '1px solid rgba(151,227,37,0.35)',
                }}
              >
                {aiLoading
                  ? <Loader2 size={16} color="#97E325" className="animate-spin flex-shrink-0" />
                  : <Sparkles size={16} color="#97E325" className="flex-shrink-0" />}
                <span className="text-sm font-semibold text-start flex-1" style={{ color: '#97E325' }}>
                  {aiLoading
                    ? t('يحسب السعرات...', 'Calculating...')
                    : nutrition.calories > 0
                      ? t('أعد الحساب بالذكاء الاصطناعي', 'Recalculate with AI')
                      : t('احسب السعرات بالذكاء الاصطناعي', 'Calculate calories with AI')}
                </span>
              </button>
            )}
            {aiError && <p className="text-xs mt-1.5 px-1" style={{ color: '#ef4444' }}>{aiError}</p>}

            {/* Auto-filled badge */}
            {nutrition.calories > 0 && name.trim() && (
              <div
                className="mt-2 px-3 py-1.5 rounded-xl flex items-center gap-2"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                <span className="text-green-400 text-xs">✓</span>
                <span className="text-xs text-green-300">
                  {t('تم تحميل القيم تلقائياً · للكمية المحددة:', 'Values auto-loaded · for selected quantity:')}{' '}
                  <strong>{scaled(nutrition.calories)} {t('سعرة', 'kcal')}</strong>
                </span>
              </div>
            )}
          </div>

          {/* ── Quantity ── */}
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">{t('الكمية', 'Quantity')}</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(5, q - 10))}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ background: btnBg, color: btnColor }}
              >
                −
              </button>
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="galaxy-input px-4 py-3 text-center text-xl font-black w-full"
                  dir="ltr"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                  {t('جرام', 'g')}
                </span>
              </div>
              <button
                onClick={() => setQuantity(q => q + 10)}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ background: btnBg, color: btnColor }}
              >
                +
              </button>
            </div>
            {/* Quick grams */}
            <div className="flex gap-2 mt-2">
              {[50, 100, 150, 200, 250].map(g => (
                <button
                  key={g}
                  onClick={() => setQuantity(g)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: quantity === g ? qkActive : qkInact,
                    color: quantity === g ? qkActClr : qkInactCl,
                    border: `1px solid ${quantity === g ? qkActBdr : 'transparent'}`,
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* ── Meal type ── */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('نوع الوجبة', 'Meal Type')}</label>
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMealType(m.value as FoodItem['mealType'])}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
                  style={{
                    background: mealType === m.value ? mealActive : mealInact,
                    border: `1px solid ${mealType === m.value ? mealActBdr : mealInBdr}`,
                  }}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: mealType === m.value ? mealActClr : mealInClr,
                    }}
                  >
                    {t(m.ar, m.en)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Macronutrients (per 100g) ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm">{t('القيم الغذائية / 100جم', 'Nutrition / 100g')}</h3>
              {nutrition.calories > 0 && (
                <div
                  className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                >
                  {t('للكمية:', 'For qty:')} {scaled(nutrition.calories)} {t('سعرة', 'kcal')}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <NutritionField
                  label={t('السعرات الحرارية', 'Calories')}
                  field="calories"
                  value={nutrition.calories}
                  onChange={v => setN('calories', v)}
                  unit="kcal"
                  color="#f59e0b"
                />
              </div>
              <NutritionField label={t('البروتين', 'Protein')} field="protein" value={nutrition.protein} onChange={v => setN('protein', v)} color="#06b6d4" />
              <NutritionField label={t('الكربوهيدرات', 'Carbs')} field="carbs" value={nutrition.carbs} onChange={v => setN('carbs', v)} color="#f59e0b" />
              <NutritionField label={t('الألياف', 'Fiber')} field="fiber" value={nutrition.fiber ?? 0} onChange={v => setN('fiber', v)} color="#10b981" />
              <NutritionField label={t('السكريات', 'Sugars')} field="sugars" value={nutrition.sugars ?? 0} onChange={v => setN('sugars', v)} color="#f97316" />
              <NutritionField label={t('الدهون الكلية', 'Total Fat')} field="fat" value={nutrition.fat} onChange={v => setN('fat', v)} color="#ec4899" />
              <NutritionField label={t('دهون مشبعة', 'Sat. Fat')} field="saturatedFat" value={nutrition.saturatedFat ?? 0} onChange={v => setN('saturatedFat', v)} color="#f43f5e" />
            </div>

            {/* Scaled summary row */}
            {quantity !== 100 && nutrition.calories > 0 && (
              <div
                className="mt-3 p-3 rounded-xl grid grid-cols-4 gap-2 text-center"
                style={{ background: summaryBg, border: `1px solid ${summaryBdr}` }}
              >
                {[
                  { label: t('سعرة', 'kcal'),    val: scaled(nutrition.calories), color: '#f59e0b' },
                  { label: t('بروتين', 'Protein'),val: scaled(nutrition.protein), color: '#06b6d4' },
                  { label: t('كارب', 'Carbs'),   val: scaled(nutrition.carbs), color: '#f59e0b' },
                  { label: t('دهن', 'Fat'),      val: scaled(nutrition.fat), color: '#ec4899' },
                ].map(n => (
                  <div key={n.label}>
                    <p className="text-sm font-black" style={{ color: n.color }}>{n.val}</p>
                    <p className="text-xs text-white/35">{n.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Micronutrients (optional) ── */}
          <button
            onClick={() => setShowMicros(s => !s)}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl"
            style={{
              background: microsBg,
              border: `1px solid ${microsBdr}`,
            }}
          >
            <span className="text-sm font-medium text-white/65">
              {t('المغذيات الدقيقة (اختياري)', 'Micronutrients (optional)')}
            </span>
            {showMicros ? (
              <ChevronUp size={18} color={chevronCl} />
            ) : (
              <ChevronDown size={18} color={chevronCl} />
            )}
          </button>

          {showMicros && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in">
              <NutritionField label={t('الصوديوم', 'Sodium')} field="sodium" value={nutrition.sodium ?? 0} onChange={v => setN('sodium', v)} unit={t('ملجم', 'mg')} color="#8b5cf6" />
              <NutritionField label={t('البوتاسيوم', 'Potassium')} field="potassium" value={nutrition.potassium ?? 0} onChange={v => setN('potassium', v)} unit={t('ملجم', 'mg')} color="#6366f1" />
            </div>
          )}
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
