'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Trash2, ChevronDown, ChevronUp, BarChart3, X, RefreshCw } from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT } from '@/lib/store'
import { savePlan, getPlans, deletePlan, WorkoutPlan } from '@/lib/db'
import { createClient } from '@/lib/supabase/client'

const GOAL_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  lose:     { ar: 'إنقاص الوزن',      en: 'Weight Loss',     color: '#06b6d4' },
  maintain: { ar: 'الحفاظ على الوزن', en: 'Maintain Weight', color: '#10b981' },
  gain:     { ar: 'زيادة الوزن',       en: 'Weight Gain',     color: '#f59e0b' },
}
const DIET_LABELS: Record<string, { ar: string; en: string; icon: string }> = {
  balanced:      { ar: 'متوازن',        en: 'Balanced',              icon: '⚖️' },
  keto:          { ar: 'كيتو',           en: 'Keto',                  icon: '🥑' },
  mediterranean: { ar: 'متوسطي',         en: 'Mediterranean',         icon: '🫒' },
  intermittent:  { ar: 'صيام متقطع',     en: 'Intermittent Fasting',  icon: '⏱️' },
  lowcarb:       { ar: 'كارب منخفض',     en: 'Low Carb',              icon: '🥩' },
}

interface MealMacros  { name: string; protein: number; carbs: number; fat: number; water: number }
interface DailyMacros { meals: MealMacros[]; calories: number }

function getMealIcon(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('إفطار') || n.includes('breakfast')) return '🌅'
  if (n.includes('غداء')  || n.includes('lunch'))     return '☀️'
  if (n.includes('عشاء')  || n.includes('dinner'))    return '🌙'
  if (n.includes('سناك')  || n.includes('snack'))     return '🍎'
  return '🍽️'
}

export default function PlansPage() {
  const t = useT()
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const lang = profile.language ?? 'ar'

  // generation state
  const [streaming,     setStreaming]     = useState(false)
  const [planText,      setPlanText]      = useState('')
  const [error,         setError]         = useState('')
  const [parsingMacros, setParsingMacros] = useState(false)
  const [macros,        setMacros]        = useState<DailyMacros | null>(null)
  const [macrosError,   setMacrosError]   = useState('')

  // saved plans
  const [plans,      setPlans]      = useState<WorkoutPlan[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // freemium
  const [userEmail,        setUserEmail]        = useState<string | null>(null)
  const [createdAt,        setCreatedAt]        = useState<string | null>(null)
  const [showPlanLimitMsg, setShowPlanLimitMsg] = useState(false)

  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => { getPlans().then(setPlans) }, [])
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
      setCreatedAt(data.user?.created_at ?? null)
    })
  }, [])
  useEffect(() => {
    textRef.current?.scrollTo({ top: textRef.current.scrollHeight, behavior: 'smooth' })
  }, [planText])

  // Build targets from profile
  const targets = {
    water:    profile.targetWater / 1000,
    calories: profile.dailyCalories,
    protein:  profile.targetProtein,
    carbs:    profile.targetCarbs,
    fat:      profile.targetFat,
  }

  const goalInfo  = GOAL_LABELS[profile.goal]  ?? GOAL_LABELS['maintain']
  const dietKey   = profile.diet ?? 'balanced'
  const dietInfo  = DIET_LABELS[dietKey] ?? DIET_LABELS['balanced']

  // ── Generate ──────────────────────────────────────────────────────────────
  const generate = async () => {
    // خطة التغذية مجانية للجميع — بلا قفل اشتراك
    setShowPlanLimitMsg(false)
    setPlanText(''); setError(''); setMacros(null); setMacrosError('')
    setStreaming(true)
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal:     profile.goal,
          gender:   profile.gender,
          activity: profile.activityLevel,
          diet:     dietKey,
          age:      profile.age,
          weight:   profile.weight,
          height:   profile.height,
          language: lang,
          targets,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.plan) {
        throw new Error(data?.error || t('فشل الاتصال بالخادم', 'Server connection failed'))
      }
      const full: string = data.plan
      // كشف تدريجي محلي (يعطي إحساس البث دون مشاكل البث في iOS)
      const step = Math.max(3, Math.round(full.length / 240))
      for (let i = 0; i <= full.length; i += step) {
        setPlanText(full.slice(0, i))
        await new Promise(r => setTimeout(r, 12))
      }
      setPlanText(full)
      const saved = await savePlan({
        goal:         profile.goal,
        equipment:    [profile.gender, profile.activityLevel, dietKey],
        age:          profile.age,
        weight:       profile.weight,
        plan_content: full,
      })
      if (saved) setPlans(prev => [saved, ...prev])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('حدث خطأ غير متوقع', 'Unexpected error'))
    } finally { setStreaming(false) }
  }

  // ── Extract macros ────────────────────────────────────────────────────────
  const extractMacros = async () => {
    if (!planText) return
    setParsingMacros(true); setMacrosError(''); setMacros(null)
    try {
      const res = await fetch('/api/parse-macros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planText, language: lang, targets }),
      })
      if (!res.ok) throw new Error(t('فشل استخراج المعطيات', 'Failed to extract macros'))
      const data: DailyMacros = await res.json()
      if (!data.meals?.length) throw new Error(t('لم يتم العثور على بيانات', 'No data found'))
      setMacros(data)
    } catch (err) {
      setMacrosError(err instanceof Error ? err.message : t('حدث خطأ', 'Error'))
    } finally { setParsingMacros(false) }
  }

  const handleDelete = async (id: string) => {
    await deletePlan(id); setPlans(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div
      className="flex flex-col px-4 pt-6 gap-5 pb-8"
      style={{ direction: lang === 'en' ? 'ltr' : 'rtl' }}
    >

      {/* ── Header ── */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-black text-white">
          {t('خطة التغذية', 'Nutrition Plan')}{' '}
          <span className="text-gradient-galaxy">AI ✨</span>
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {t('نظام غذائي مخصص بالذكاء الاصطناعي', 'Personalized diet plan powered by AI')}
        </p>
      </div>

      {/* ── Profile summary pill ── */}
      <div
        className="p-4 rounded-2xl flex flex-col gap-3"
        style={{ background: 'rgba(151,227,37,0.06)', border: '1px solid rgba(151,227,37,0.18)' }}
      >
        <p className="text-xs text-white/40 font-medium">{t('سيتم توليد الخطة بناءً على:', 'Plan will be generated based on:')}</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: '🎯', label: t('الهدف', 'Goal'),       value: t(goalInfo.ar, goalInfo.en), color: goalInfo.color },
            { icon: dietInfo.icon, label: t('الدايت', 'Diet'), value: t(dietInfo.ar, dietInfo.en), color: '#a78bfa' },
            { icon: '⚡', label: t('السعرات', 'Calories'),  value: `${profile.dailyCalories} kcal`,    color: '#f59e0b' },
            { icon: '💪', label: t('البروتين', 'Protein'),  value: `${profile.targetProtein}g`,         color: '#06b6d4' },
            { icon: '📏', label: t('الوزن', 'Weight'),      value: `${profile.weight} ${t('كغ','kg')}`, color: '#97E325' },
            { icon: '📅', label: t('العمر', 'Age'),          value: `${profile.age} ${t('سنة','yr')}`,  color: '#ec4899' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: `${item.color}0d` }}>
              <span className="text-base">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-[10px] text-white/35 leading-none">{item.label}</p>
                <p className="text-xs font-bold leading-tight truncate" style={{ color: item.color }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Hint to edit */}
        <p className="text-[11px] text-white/25 text-center">
          {t('لتغيير هذه البيانات، اذهب إلى الإعدادات', 'To change these, go to Settings')}
        </p>
      </div>

      {/* ── Weekly plan limit banner ── */}
      {showPlanLimitMsg && (
        <div
          className="p-4 rounded-2xl flex flex-col gap-2 animate-fade-in"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <p className="font-bold text-sm" style={{ color: '#f59e0b' }}>
              {t('انتهت تجربتك المجانية', 'Your free trial ended')}
            </p>
          </div>
          <p className="text-xs text-white/55 leading-relaxed">
            {t('اشترك في Dietak Pro لتوليد خطط غذائية غير محدودة.',
               'Subscribe to Dietak Pro to generate unlimited nutrition plans.')}
          </p>
          <a href="/settings#pro" className="text-xs font-bold px-3 py-2 rounded-lg text-center"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
            {t('اشترك الآن ✨', 'Subscribe now ✨')}
          </a>
        </div>
      )}

      {/* ── Generate button ── */}
      <button
        onClick={generate}
        disabled={streaming || showPlanLimitMsg}
        className="btn-galaxy py-4 flex items-center justify-center gap-2 text-base font-black"
        style={{ opacity: (streaming || showPlanLimitMsg) ? 0.45 : 1 }}
      >
        {streaming ? (
          <>
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            {t('جاري التوليد...', 'Generating...')}
          </>
        ) : showPlanLimitMsg ? (
          <>
            <span>✨</span>
            {t('اشترك للمتابعة', 'Subscribe to continue')}
          </>
        ) : (
          <>
            <Sparkles size={18} />
            {t('توليد خطة التغذية', 'Generate Nutrition Plan')}
          </>
        )}
      </button>

      {/* ── Streaming plan output ── */}
      {(streaming || planText) && (
        <GlassCard glow="purple" className="p-5" animate={false}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} color="#97E325" />
            <h2 className="font-bold text-white text-sm flex-1">
              {streaming ? t('جاري التوليد...', 'Generating...') : t('خطة التغذية ✓', 'Nutrition Plan ✓')}
            </h2>
            {streaming && <div className="w-2 h-2 rounded-full bg-[#97E325] animate-pulse" />}
            {!streaming && planText && (
              <button onClick={() => { setPlanText(''); setMacros(null) }}
                className="p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X size={14} color="rgba(255,255,255,0.35)" />
              </button>
            )}
          </div>
          <div
            ref={textRef}
            className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap overflow-y-auto"
            style={{ maxHeight: 520, direction: lang === 'en' ? 'ltr' : 'rtl' }}
          >
            {planText}
            {streaming && <span className="inline-block w-1.5 h-4 bg-[#97E325] animate-pulse ml-1 align-middle" />}
          </div>
        </GlassCard>
      )}

      {/* ── Extract macros button ── */}
      {planText && !streaming && (
        <button
          onClick={extractMacros}
          disabled={parsingMacros}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all"
          style={{
            background: 'rgba(151,227,37,0.10)',
            border: '1px solid rgba(151,227,37,0.28)',
            color: '#97E325',
            opacity: parsingMacros ? 0.7 : 1,
          }}
        >
          <BarChart3 size={16} />
          {parsingMacros
            ? t('جاري الاستخراج...', 'Extracting...')
            : t('عرض كمعطيات يومية', 'Show Daily Targets')}
        </button>
      )}

      {macrosError && (
        <div className="p-3 rounded-xl text-center text-xs"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          ⚠️ {macrosError}
        </div>
      )}

      {/* ── Daily Macro Tracker ── */}
      {macros && (
        <GlassCard glow="none" className="p-5" animate={false}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} color="#97E325" />
            <h2 className="font-bold text-white text-sm flex-1">{t('معطياتك اليومية', 'Daily Macro Targets')}</h2>
            <span className="text-xs font-black px-2 py-1 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              🔥 {macros.calories.toLocaleString()} kcal
            </span>
            <button onClick={() => setMacros(null)} className="p-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <X size={14} color="rgba(255,255,255,0.4)" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1 mb-2 px-1" dir="ltr">
            <span className="text-[10px] font-bold text-white/35">{t('الوجبة', 'Meal')}</span>
            <span className="text-[10px] font-bold text-center" style={{ color: '#06b6d4' }}>💪 {t('بروتين', 'Prot')}</span>
            <span className="text-[10px] font-bold text-center" style={{ color: '#97E325' }}>🌾 {t('كارب', 'Carbs')}</span>
            <span className="text-[10px] font-bold text-center" style={{ color: '#f59e0b' }}>🥑 {t('دهون', 'Fat')}</span>
            <span className="text-[10px] font-bold text-center" style={{ color: '#3b82f6' }}>💧 {t('ماء', 'Water')}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {macros.meals.map((meal, i) => (
              <div key={i}
                className="grid grid-cols-5 gap-1 py-3 px-2 rounded-xl items-center"
                style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.055)' }}
                dir="ltr">
                <span className="text-xs font-bold text-white/80">{getMealIcon(meal.name)} {meal.name}</span>
                <span className="text-xs font-mono font-black text-center" style={{ color: '#06b6d4' }}>{meal.protein}g</span>
                <span className="text-xs font-mono font-black text-center" style={{ color: '#97E325' }}>{meal.carbs}g</span>
                <span className="text-xs font-mono font-black text-center" style={{ color: '#f59e0b' }}>{meal.fat}g</span>
                <span className="text-xs font-mono font-black text-center" style={{ color: '#3b82f6' }}>
                  {meal.water >= 1000 ? `${(meal.water / 1000).toFixed(1)}L` : `${meal.water}ml`}
                </span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1 mt-3 pt-3 px-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} dir="ltr">
            <span className="text-[11px] font-black text-white/50">{t('المجموع', 'Total')}</span>
            <span className="text-xs font-mono font-black text-center" style={{ color: '#06b6d4' }}>
              {macros.meals.reduce((s, m) => s + (m.protein || 0), 0)}g</span>
            <span className="text-xs font-mono font-black text-center" style={{ color: '#97E325' }}>
              {macros.meals.reduce((s, m) => s + (m.carbs || 0), 0)}g</span>
            <span className="text-xs font-mono font-black text-center" style={{ color: '#f59e0b' }}>
              {macros.meals.reduce((s, m) => s + (m.fat || 0), 0)}g</span>
            <span className="text-xs font-mono font-black text-center" style={{ color: '#3b82f6' }}>
              {((macros.meals.reduce((s, m) => s + (m.water || 0), 0)) / 1000).toFixed(1)}L</span>
          </div>
        </GlassCard>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="p-4 rounded-2xl text-center text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Saved plans ── */}
      {plans.length > 0 && (
        <div>
          <h2 className="font-bold text-white text-base mb-3">{t('الخطط المحفوظة', 'Saved Plans')}</h2>
          <div className="flex flex-col gap-3">
            {plans.map(plan => {
              const planGoal = GOAL_LABELS[plan.goal]
              return (
                <GlassCard key={plan.id} glow="none" className="p-4" animate={false}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm" style={{ color: planGoal?.color ?? '#97E325' }}>
                        {planGoal ? t(planGoal.ar, planGoal.en) : plan.goal}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {plan.age} {t('سنة', 'yr')} · {plan.weight} {t('كجم', 'kg')} ·{' '}
                        {new Date(plan.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                        className="p-2 rounded-xl" style={{ background: 'rgba(151,227,37,0.1)' }}>
                        {expandedId === plan.id
                          ? <ChevronUp size={16} color="#97E325" />
                          : <ChevronDown size={16} color="#97E325" />}
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-2 rounded-xl hover:bg-red-500/10">
                        <Trash2 size={16} color="rgba(239,68,68,0.5)" />
                      </button>
                    </div>
                  </div>
                  {expandedId === plan.id && (
                    <div
                      className="mt-3 pt-3 text-sm text-white/75 leading-relaxed whitespace-pre-wrap"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)', direction: lang === 'en' ? 'ltr' : 'rtl' }}>
                      {plan.plan_content}
                    </div>
                  )}
                </GlassCard>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
