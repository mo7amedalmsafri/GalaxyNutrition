'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Sparkles, Loader2, Star } from 'lucide-react'
import { FoodDBItem, searchFoods, getPopularFoods } from '@/lib/foodDatabase'
import FoodEntryModal from './FoodEntryModal'
import { FoodItem } from '@/lib/types'
import { SavedMeal } from '@/lib/savedMeals'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT, useUserEmail } from '@/lib/store'
import { canUseFeature, recordFeatureUse } from '@/lib/limits'
import ProUpsell from './ProUpsell'

interface FoodSearchBarProps {
  onAddFood?: (item: Omit<FoodItem, 'id' | 'loggedAt'>) => void
  saved?: SavedMeal[]
  onRemoveSaved?: (id: string) => void
}

export default function FoodSearchBar({ onAddFood, saved = [], onRemoveSaved }: FoodSearchBarProps) {
  const t = useT()
  const email = useUserEmail()
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const L    = (profile.theme    ?? 'dark') === 'light'
  const lang = profile.language  ?? 'ar'

  const dropBg    = L ? 'rgba(215,221,228,0.99)' : 'rgba(13,0,37,0.97)'
  const dropBdr   = L ? 'rgba(0,0,0,0.12)'        : 'rgba(107,33,168,0.35)'
  const cardBg    = L ? 'rgba(0,0,0,0.06)'         : 'rgba(107,33,168,0.12)'
  const cardBdr   = L ? 'rgba(0,0,0,0.10)'         : 'rgba(107,33,168,0.2)'
  const searchCl  = L ? 'rgba(0,0,0,0.35)'         : 'rgba(255,255,255,0.35)'
  const clearCl   = L ? 'rgba(0,0,0,0.35)'         : 'rgba(255,255,255,0.4)'

  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodDBItem | null>(null)
  const [aiQuantity, setAiQuantity] = useState<number | undefined>(undefined)
  const [selectedMealType, setSelectedMealType] = useState<FoodItem['mealType'] | undefined>(undefined)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiBlocked, setAiBlocked] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const results = query.trim() ? searchFoods(query) : getPopularFoods()

  // يحسب سعرات أي أكلة بالاسم عبر الذكاء الاصطناعي، ثم يفتح نافذة التعديل
  const calcWithAI = async () => {
    const foodName = query.trim()
    if (!foodName || aiLoading) return
    if (!canUseFeature('aiCalc', email)) { setAiBlocked(true); return }
    setAiLoading(true)
    setAiError('')
    setAiBlocked(false)
    try {
      const res = await fetch('/api/recalculate-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // بلا وزن صريح — يقدّره الذكاء من النص («ملعقة عسل» = ملعقة، ليس 100جم)
        body: JSON.stringify({ foodName, language: lang }),
        // مهلة قصوى — لا ننتظر أكثر من ~50 ثانية ثم نعرض خطأ واضح
        signal: AbortSignal.timeout(50000),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      const n = data.nutrition ?? {}        // لكل 100جم
      const g = typeof data.totalGrams === 'number' && data.totalGrams > 0 ? data.totalGrams : 100
      const f = g / 100                       // معامل التحويل إلى القيم الإجمالية
      const r = (v: number) => Math.round((v ?? 0) * f * 10) / 10
      setAiQuantity(Math.round(g))
      setSelectedMealType(undefined)
      // نمرّر القيم الإجمالية للكمية الموصوفة (لا لكل 100جم)
      setSelectedFood({
        id: 'ai-' + Date.now(),
        name: data.name ?? foodName,
        nameAr: (lang === 'en' ? (data.name ?? foodName) : (data.nameAr ?? foodName)),
        emoji: '🍽️',
        calories: r(n.calories),
        protein: r(n.protein),
        carbs: r(n.carbs),
        fiber: r(n.fiber),
        sugars: r(n.sugars),
        fat: r(n.fat),
        saturatedFat: r(n.saturatedFat),
        unsaturatedFat: r(n.unsaturatedFat),
        sodium: r(n.sodium),
        potassium: r(n.potassium),
      } as FoodDBItem)
      recordFeatureUse('aiCalc')   // احتسب استخداماً بعد النجاح
      setIsOpen(false)
    } catch (e) {
      const timedOut = e instanceof DOMException && e.name === 'TimeoutError'
      setAiError(timedOut
        ? t('الخدمة بطيئة الآن — حاول مرة أخرى', 'The service is slow right now — please try again')
        : t('تعذّر الحساب — تأكد من الاتصال وحاول مرة أخرى', 'Could not calculate — check your connection and try again'))
    } finally {
      setAiLoading(false)
    }
  }

  // فتح النافذة على وجبة محفوظة (بقيمها الإجمالية ونوعها)
  const pickSaved = (m: SavedMeal) => {
    setAiQuantity(m.quantity)
    setSelectedMealType(m.mealType)
    setSelectedFood({
      id: m.id,
      name: m.name,
      nameAr: m.name,
      emoji: '⭐',
      calories: m.nutrition.calories,
      protein: m.nutrition.protein,
      carbs: m.nutrition.carbs,
      fiber: m.nutrition.fiber ?? 0,
      sugars: m.nutrition.sugars ?? 0,
      fat: m.nutrition.fat,
      saturatedFat: m.nutrition.saturatedFat ?? 0,
      unsaturatedFat: m.nutrition.unsaturatedFat ?? 0,
      sodium: m.nutrition.sodium ?? 0,
      potassium: m.nutrition.potassium ?? 0,
    } as FoodDBItem)
    setIsOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef}>
      {/* Label */}
      <p className="text-white/45 text-xs font-medium mb-1.5 px-1">
        {t('معرفة سعرات الوجبات', 'Look up meal calories')}
      </p>

      {/* Search input */}
      <div className="relative">
        <Search
          size={17}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: searchCl }}
        />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={t('ابحث عن طعام... (دجاج، أرز، شوفان...)', 'Search food... (chicken, rice, oats...)')}
          className="galaxy-input w-full pr-10 pl-10 py-3.5 text-sm"
        />
        {query ? (
          <button
            onClick={() => { setQuery(''); setIsOpen(true) }}
            className="absolute left-3 top-1/2 -translate-y-1/2"
          >
            <X size={16} color={clearCl} />
          </button>
        ) : null}
      </div>

      {/* Dropdown results */}
      {isOpen && (
        <div
          className="mt-2 rounded-2xl overflow-hidden animate-fade-in"
          style={{
            background: dropBg,
            border: `1px solid ${dropBdr}`,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 16px 50px rgba(0,0,0,0.6)',
          }}
        >
          {/* ── الوجبات المحفوظة (المفضلة) ── */}
          {!query.trim() && saved.length > 0 && (
            <div className="p-3 pb-1">
              <p className="text-xs text-white/45 px-1 mb-2 flex items-center gap-1.5">
                <Star size={12} color="#f59e0b" fill="#f59e0b" />
                {t('الوجبات المحفوظة', 'Saved Meals')}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {saved.map(m => (
                  <div
                    key={m.id}
                    className="relative flex-shrink-0 rounded-xl px-3 py-2 pr-7 min-w-[7.5rem]"
                    style={{ background: cardBg, border: `1px solid ${cardBdr}` }}
                  >
                    <button onClick={() => pickSaved(m)} className="block text-right w-full active:scale-95 transition-transform">
                      <span className="block text-xs text-white font-medium truncate max-w-[7rem]">{m.name}</span>
                      <span className="text-xs font-black" style={{ color: '#f59e0b' }}>
                        {Math.round(m.nutrition.calories)}
                      </span>
                      <span className="text-[10px] text-white/35"> {t('سعرة', 'kcal')} · {m.quantity}{t('جم', 'g')}</span>
                    </button>
                    {onRemoveSaved && (
                      <button
                        onClick={() => onRemoveSaved(m.id)}
                        aria-label={t('إزالة', 'Remove')}
                        className="absolute top-1 left-1 p-0.5 rounded-md active:scale-90"
                      >
                        <X size={13} color="rgba(255,255,255,0.4)" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 pb-1">
            {/* زر الذكاء الاصطناعي — يظهر أول ما تكتب أي أكلة */}
            {query.trim() && (
              <>
                <button
                  onClick={calcWithAI}
                  disabled={aiLoading}
                  className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl mb-2 transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, rgba(151,227,37,0.16), rgba(0,212,255,0.10))',
                    border: '1px solid rgba(151,227,37,0.35)',
                  }}
                >
                  {aiLoading
                    ? <Loader2 size={17} color="#97E325" className="animate-spin flex-shrink-0" />
                    : <Sparkles size={17} color="#97E325" className="flex-shrink-0" />}
                  <span className="text-sm font-semibold text-start flex-1" style={{ color: '#97E325' }}>
                    {aiLoading
                      ? t('يحسب السعرات...', 'Calculating...')
                      : t(`احسب «${query.trim()}» بالذكاء الاصطناعي`, `Calculate "${query.trim()}" with AI`)}
                  </span>
                </button>
                {aiError && <p className="text-xs px-1 mb-2" style={{ color: '#ef4444' }}>{aiError}</p>}
                {aiBlocked && <div className="mb-2"><ProUpsell text={t('انتهت حصتك المجانية اليوم — اشترك للحساب غير المحدود', 'Free AI calculations used up today — subscribe for unlimited')} /></div>}
              </>
            )}
            <p className="text-xs text-white/35 px-1 mb-2">
              {query.trim() ? t(`أو اختر من القائمة (${results.length})`, `Or pick from list (${results.length})`) : t('الأطعمة الشائعة', 'Popular Foods')}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 px-3 pb-3 max-h-72 overflow-y-auto">
            {results.map(food => (
              <button
                key={food.id}
                onClick={() => { setAiQuantity(100); setSelectedMealType(undefined); setSelectedFood({ ...food, nameAr: lang === 'en' ? food.name : food.nameAr }); setIsOpen(false) }}
                className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all active:scale-95"
                style={{
                  background: cardBg,
                  border: `1px solid ${cardBdr}`,
                }}
              >
                <span className="text-2xl leading-none">{food.emoji}</span>
                <span className="text-xs text-white font-medium text-center leading-tight line-clamp-2">
                  {lang === 'en' ? food.name : food.nameAr}
                </span>
                <span className="text-xs font-black" style={{ color: '#f59e0b' }}>
                  {food.calories}
                </span>
                <span className="text-[10px] text-white/30">{t('كال/100جم', 'kcal/100g')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Food entry modal */}
      {selectedFood && (
        <FoodEntryModal
          initialName={selectedFood.nameAr}
          initialQuantity={aiQuantity}
          initialMealType={selectedMealType}
          initialNutrition={{
            calories: selectedFood.calories,
            protein: selectedFood.protein,
            carbs: selectedFood.carbs,
            fiber: selectedFood.fiber,
            sugars: selectedFood.sugars,
            fat: selectedFood.fat,
            saturatedFat: selectedFood.saturatedFat,
            unsaturatedFat: selectedFood.unsaturatedFat,
            sodium: selectedFood.sodium,
            potassium: selectedFood.potassium,
          }}
          onSave={item => { onAddFood?.(item); setSelectedFood(null) }}
          onClose={() => setSelectedFood(null)}
        />
      )}
    </div>
  )
}
