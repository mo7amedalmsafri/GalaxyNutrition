'use client'

import { useState, useRef, useEffect } from 'react'
import { X, ChevronDown, ChevronUp, Sparkles, Loader2, ScanBarcode } from 'lucide-react'
import { NutritionData, FoodItem } from '@/lib/types'
import { searchFoods, FoodDBItem } from '@/lib/foodDatabase'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT, useEntitlement } from '@/lib/store'
import BarcodeScanner from './BarcodeScanner'
import ProUpsell from './ProUpsell'

interface FoodEntryModalProps {
  initialName?: string
  /** القيم الغذائية الإجمالية للكمية الموصوفة (لا لكل 100جم) */
  initialNutrition?: Partial<NutritionData>
  /** الوزن الفعلي بالجرام للكمية الموصوفة (يُشتق من الوصف/الباركود) */
  initialQuantity?: number
  initialMealType?: FoodItem['mealType']
  /** عنوان النافذة وزر الحفظ — يتغيّر في وضع التعديل */
  title?: string
  saveLabel?: string
  onSave: (item: Omit<FoodItem, 'id' | 'loggedAt'>) => void
  onClose: () => void
}

const MEAL_TYPES = [
  { value: 'breakfast', ar: 'إفطار',  en: 'Breakfast', icon: '🌅' },
  { value: 'lunch',     ar: 'غداء',   en: 'Lunch',     icon: '☀️' },
  { value: 'dinner',    ar: 'عشاء',   en: 'Dinner',    icon: '🌙' },
  { value: 'snack',     ar: 'خفيفة',  en: 'Snack',     icon: '🍎' },
]

const r1 = (v: number) => Math.round(v * 10) / 10

// Defined outside to keep stable identity
function NutritionField({
  label,
  value,
  onChange,
  unit = 'g',
  color = 'rgba(255,255,255,0.6)',
}: {
  label: string
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
  title,
  saveLabel,
  onSave,
  onClose,
}: FoodEntryModalProps) {
  const t    = useT()
  const ent  = useEntitlement()
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
  const mealActive = L ? 'rgba(0,0,0,0.12)'        : 'rgba(107,33,168,0.4)'
  const mealInact  = L ? 'rgba(0,0,0,0.04)'        : 'rgba(255,255,255,0.05)'
  const mealActBdr = L ? 'rgba(0,0,0,0.22)'        : 'rgba(192,132,252,0.6)'
  const mealInBdr  = L ? 'rgba(0,0,0,0.07)'        : 'rgba(255,255,255,0.08)'
  const mealActClr = L ? '#080808'                  : '#c084fc'
  const mealInClr  = L ? 'rgba(0,0,0,0.45)'        : 'rgba(255,255,255,0.45)'
  const modalBdr   = L ? 'rgba(0,0,0,0.15)'        : 'rgba(107,33,168,0.45)'
  const closeBtnCl = L ? 'rgba(0,0,0,0.45)'        : 'rgba(255,255,255,0.55)'
  const chevronCl  = L ? 'rgba(0,0,0,0.35)'        : 'rgba(255,255,255,0.4)'
  const microsBg   = L ? 'rgba(0,0,0,0.05)'        : 'rgba(255,255,255,0.04)'
  const microsBdr  = L ? 'rgba(0,0,0,0.09)'        : 'rgba(255,255,255,0.08)'

  const [name, setName] = useState(initialName)
  // grams = الوزن الفعلي للكمية الموصوفة (يُشتق تلقائياً، لا يُدخله المستخدم يدوياً)
  const [grams, setGrams] = useState<number>(initialQuantity && initialQuantity > 0 ? initialQuantity : 100)
  const [mealType, setMealType] = useState<FoodItem['mealType']>(initialMealType ?? 'lunch')
  const [showMicros, setShowMicros] = useState(false)
  // nutrition = القيم الإجمالية للكمية الموصوفة (لا لكل 100جم)
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

  // AI + barcode state
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiBlocked, setAiBlocked] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [barLoading, setBarLoading] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  // يحسب القيم الغذائية الإجمالية للوصف المكتوب بالذكاء الاصطناعي («ملعقة عسل»، «أرز 200جم»، «شوفان + عسل»)
  const calcWithAI = async () => {
    const foodName = name.trim()
    if (!foodName || aiLoading) return
    // قفل الاشتراك: بعد تجربة اليومين يحتاج اشتراك
    if (!ent.allowed) { setAiBlocked(true); return }
    setAiLoading(true)
    setAiError('')
    setAiBlocked(false)
    setShowSuggestions(false)
    try {
      const res = await fetch('/api/recalculate-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // بلا وزن صريح — يقدّره الذكاء من الوصف نفسه
        body: JSON.stringify({ foodName, language: lang }),
        signal: AbortSignal.timeout(50000),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      const n = data.nutrition ?? {}           // لكل 100جم
      const g = typeof data.totalGrams === 'number' && data.totalGrams > 0 ? data.totalGrams : 100
      const f = g / 100                          // معامل التحويل إلى الإجمالي
      setGrams(Math.round(g))
      setNutrition({
        calories: r1((n.calories ?? 0) * f),
        protein: r1((n.protein ?? 0) * f),
        carbs: r1((n.carbs ?? 0) * f),
        fiber: r1((n.fiber ?? 0) * f),
        sugars: r1((n.sugars ?? 0) * f),
        fat: r1((n.fat ?? 0) * f),
        saturatedFat: r1((n.saturatedFat ?? 0) * f),
        unsaturatedFat: r1((n.unsaturatedFat ?? 0) * f),
        sodium: r1((n.sodium ?? 0) * f),
        potassium: r1((n.potassium ?? 0) * f),
      })
    } catch (e) {
      const timedOut = e instanceof DOMException && e.name === 'TimeoutError'
      setAiError(timedOut
        ? t('الخدمة بطيئة الآن — حاول مرة أخرى', 'The service is slow right now — please try again')
        : t('تعذّر الحساب — تأكد من الاتصال وحاول مرة أخرى', 'Could not calculate — check your connection and try again'))
    } finally {
      setAiLoading(false)
    }
  }

  // بعد قراءة الباركود: نجلب المنتج من قاعدة Open Food Facts ونملأ القيم
  const onBarcode = async (code: string) => {
    setShowScanner(false)
    setBarLoading(true)
    setAiError('')
    try {
      const res = await fetch('/api/barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: code }),
        signal: AbortSignal.timeout(20000),
      })
      const data = await res.json()
      if (!res.ok || data.found === false) {
        setAiError(t('المنتج غير موجود في قاعدة البيانات — اكتب اسمه واحسبه بالذكاء الاصطناعي',
                     'Product not found — type its name and calculate with AI'))
        return
      }
      const p = data.per100 ?? {}
      const g = typeof data.grams === 'number' && data.grams > 0 ? data.grams : 100
      const f = g / 100
      if (data.name) setName(data.name)
      setGrams(Math.round(g))
      setNutrition({
        calories: r1((p.calories ?? 0) * f),
        protein: r1((p.protein ?? 0) * f),
        carbs: r1((p.carbs ?? 0) * f),
        fiber: r1((p.fiber ?? 0) * f),
        sugars: r1((p.sugars ?? 0) * f),
        fat: r1((p.fat ?? 0) * f),
        saturatedFat: r1((p.saturatedFat ?? 0) * f),
        unsaturatedFat: r1((p.unsaturatedFat ?? 0) * f),
        sodium: r1((p.sodium ?? 0) * f),
        potassium: r1((p.potassium ?? 0) * f),
      })
      setShowSuggestions(false)
    } catch (e) {
      const timedOut = e instanceof DOMException && e.name === 'TimeoutError'
      setAiError(timedOut
        ? t('الخدمة بطيئة الآن — حاول مرة أخرى', 'The service is slow right now — please try again')
        : t('تعذّر جلب المنتج — تأكد من الاتصال', 'Could not fetch product — check your connection'))
    } finally {
      setBarLoading(false)
    }
  }

  // Scroll to top on open
  useEffect(() => {
    const to = setTimeout(() => scrollRef.current?.scrollTo({ top: 0 }), 30)
    return () => clearTimeout(to)
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

  // اختيار من القائمة المحلية = حصة 100 جرام، والقيم لكل 100جم تساوي الإجمالي
  const selectSuggestion = (food: FoodDBItem) => {
    setName(lang === 'en' ? food.name : food.nameAr)
    setGrams(100)
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

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      quantity: grams,
      unit: 'g',
      mealType,
      nutrition,
    })
    onClose()
  }

  const setN = (field: keyof NutritionData, val: number) =>
    setNutrition(prev => ({ ...prev, [field]: val }))

  const hasValues = nutrition.calories > 0

  return (
    <>
    {/* Outer backdrop — paddingBottom lifts modal above the nav bar */}
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
          <h2 className="text-lg font-bold text-white">{title ?? t('إضافة طعام', 'Add Food')}</h2>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="btn-galaxy px-4 py-2 text-sm"
            style={{ opacity: name.trim() ? 1 : 0.5 }}
          >
            {saveLabel ?? t('حفظ', 'Save')}
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">

          {/* ── Barcode scan ── */}
          <button
            onClick={() => setShowScanner(true)}
            disabled={barLoading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.16), rgba(107,33,168,0.14))',
              border: '1px solid rgba(0,212,255,0.35)',
            }}
          >
            {barLoading
              ? <Loader2 size={19} color="#00D4FF" className="animate-spin" />
              : <ScanBarcode size={19} color="#00D4FF" />}
            <span className="text-sm font-bold" style={{ color: '#00D4FF' }}>
              {barLoading ? t('جارٍ جلب المنتج...', 'Fetching product...') : t('امسح باركود المنتج', 'Scan product barcode')}
            </span>
          </button>

          {/* ── Food name / description with autocomplete ── */}
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">
              {t('اسم الطعام والكمية', 'Food & amount')}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              onFocus={() => name.trim() && setShowSuggestions(suggestions.length > 0)}
              className="galaxy-input px-4 py-3 text-base w-full font-medium"
              placeholder={t('مثال: ملعقة عسل · أرز ٢٠٠ جرام · شوفان + عسل', 'e.g. a spoon of honey · rice 200g · oats + honey')}
            />
            <p className="text-xs text-white/35 mt-1.5 px-1">
              {t('اكتب الكمية داخل الوصف والذكاء الاصطناعي يحسبها بدقة',
                 'Write the amount in the description and AI calculates it precisely')}
            </p>

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

            {/* AI calculate button */}
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
                    : hasValues
                      ? t('أعد الحساب بالذكاء الاصطناعي', 'Recalculate with AI')
                      : t('احسب السعرات بالذكاء الاصطناعي', 'Calculate calories with AI')}
                </span>
              </button>
            )}
            {aiError && <p className="text-xs mt-1.5 px-1" style={{ color: '#ef4444' }}>{aiError}</p>}
            {aiBlocked && <ProUpsell text={t('انتهت تجربتك المجانية — اشترك لمواصلة استخدام الذكاء الاصطناعي', 'Your free trial ended — subscribe to keep using AI')} />}

            {/* Result badge — total calories + derived grams */}
            {hasValues && name.trim() && (
              <div
                className="mt-2 px-3 py-2 rounded-xl flex items-center gap-2 flex-wrap"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                <span className="text-green-400 text-xs">✓</span>
                <span className="text-xs text-green-300">
                  <strong>{nutrition.calories} {t('سعرة', 'kcal')}</strong> {t('لهذه الوجبة', 'for this meal')}
                </span>
                <span className="text-xs text-white/40">·</span>
                <span className="text-xs text-white/45">≈ {grams} {t('جرام', 'g')}</span>
              </div>
            )}
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

          {/* ── Nutrition (total for this meal) ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm">{t('القيم الغذائية للوجبة', 'Nutrition for this meal')}</h3>
              {hasValues && (
                <div
                  className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                >
                  ≈ {grams} {t('جرام', 'g')}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <NutritionField
                  label={t('السعرات الحرارية', 'Calories')}
                  value={nutrition.calories}
                  onChange={v => setN('calories', v)}
                  unit="kcal"
                  color="#f59e0b"
                />
              </div>
              <NutritionField label={t('البروتين', 'Protein')} value={nutrition.protein} onChange={v => setN('protein', v)} color="#06b6d4" />
              <NutritionField label={t('الكربوهيدرات', 'Carbs')} value={nutrition.carbs} onChange={v => setN('carbs', v)} color="#f59e0b" />
              <NutritionField label={t('الألياف', 'Fiber')} value={nutrition.fiber ?? 0} onChange={v => setN('fiber', v)} color="#10b981" />
              <NutritionField label={t('السكريات', 'Sugars')} value={nutrition.sugars ?? 0} onChange={v => setN('sugars', v)} color="#f97316" />
              <NutritionField label={t('الدهون الكلية', 'Total Fat')} value={nutrition.fat} onChange={v => setN('fat', v)} color="#ec4899" />
              <NutritionField label={t('دهون مشبعة', 'Sat. Fat')} value={nutrition.saturatedFat ?? 0} onChange={v => setN('saturatedFat', v)} color="#f43f5e" />
            </div>
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
              <NutritionField label={t('الصوديوم', 'Sodium')} value={nutrition.sodium ?? 0} onChange={v => setN('sodium', v)} unit={t('ملجم', 'mg')} color="#8b5cf6" />
              <NutritionField label={t('البوتاسيوم', 'Potassium')} value={nutrition.potassium ?? 0} onChange={v => setN('potassium', v)} unit={t('ملجم', 'mg')} color="#6366f1" />
            </div>
          )}
        </div>

        <div className="h-6" />
      </div>
    </div>

    {showScanner && (
      <BarcodeScanner onDetected={onBarcode} onClose={() => setShowScanner(false)} />
    )}
    </>
  )
}
