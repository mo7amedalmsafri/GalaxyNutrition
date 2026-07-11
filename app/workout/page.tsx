'use client'

import { useState, useEffect } from 'react'
import { Dumbbell, Plus, Trash2, Zap, Search, X, HeartPulse, RefreshCw } from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import WorkoutPlanGenerator from '@/components/WorkoutPlanGenerator'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT } from '@/lib/store'
import { getFoodLogs } from '@/lib/db'
import { getTodayDate } from '@/lib/utils'
import { isHealthPlatform, requestHealthAccess, getTodayBurnedFromHealth } from '@/lib/health'

// ── Exercise catalog with MET values ─────────────────────────────────────────
const EXERCISES = [
  { id: 'running',    icon: '🏃', ar: 'ركض',         en: 'Running',         met: 8.0  },
  { id: 'walking',    icon: '🚶', ar: 'مشي',          en: 'Walking',         met: 3.5  },
  { id: 'cycling',    icon: '🚴', ar: 'دراجة',        en: 'Cycling',         met: 7.5  },
  { id: 'swimming',   icon: '🏊', ar: 'سباحة',        en: 'Swimming',        met: 7.0  },
  { id: 'yoga',       icon: '🧘', ar: 'يوغا',         en: 'Yoga',            met: 2.5  },
  { id: 'weights',    icon: '🏋️', ar: 'رفع أثقال',   en: 'Weight Training', met: 5.0  },
  { id: 'jumprope',   icon: '⛹️', ar: 'قفز حبل',     en: 'Jump Rope',       met: 10.0 },
  { id: 'hiit',       icon: '⚡', ar: 'هيت HIIT',     en: 'HIIT',            met: 9.0  },
  { id: 'soccer',     icon: '⚽', ar: 'كرة قدم',      en: 'Football',        met: 7.0  },
  { id: 'basketball', icon: '🏀', ar: 'كرة سلة',     en: 'Basketball',      met: 6.5  },
  { id: 'dancing',    icon: '💃', ar: 'رقص',          en: 'Dancing',         met: 5.0  },
  { id: 'boxing',     icon: '🥊', ar: 'ملاكمة',       en: 'Boxing',          met: 7.8  },
  { id: 'hiking',     icon: '🥾', ar: 'مشي جبلي',    en: 'Hiking',          met: 5.3  },
  { id: 'elliptical', icon: '🔄', ar: 'إليبتيكال',   en: 'Elliptical',      met: 6.0  },
  { id: 'pilates',    icon: '🤸', ar: 'بيلاتيس',     en: 'Pilates',         met: 3.0  },
  { id: 'rowing',     icon: '🚣', ar: 'تجذيف',        en: 'Rowing',          met: 7.0  },
  { id: 'climbing',   icon: '🧗', ar: 'تسلق',         en: 'Climbing',        met: 7.5  },
  { id: 'stretching', icon: '🙆', ar: 'إطالة',        en: 'Stretching',      met: 2.3  },
]

type CatalogEx = typeof EXERCISES[0]

// ── SVG Ring ──────────────────────────────────────────────────────────────────
function Ring({ value, max, color, size = 118 }: {
  value: number; max: number; color: string; size?: number
}) {
  const sw    = 11
  const r     = (size - sw * 2) / 2
  const circ  = 2 * Math.PI * r
  const ratio = Math.min(Math.max(value / Math.max(max, 1), 0), 1)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke={`${color}20`} strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ}
        strokeDashoffset={circ - ratio * circ}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 0.65s cubic-bezier(0.4,0,0.2,1)',
          filter: `drop-shadow(0 0 5px ${color}90)`,
        }}
      />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExerciseEntry {
  id: string; name: string; icon: string; minutes: number; calories: number
}
interface WorkoutDay {
  date: string; exercises: ExerciseEntry[]
}
interface NutritionTargets {
  calories: number; water: number; protein: number; carbs: number; fat: number
}
const DEFAULT_TARGETS: NutritionTargets = {
  calories: 2000, water: 2.5, protein: 120, carbs: 250, fat: 65,
}
function todayStr() { return new Date().toISOString().split('T')[0] }

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WorkoutPage() {
  const t         = useT()
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const [targets] = useLocalStorage<NutritionTargets>('galaxy-nutrition-targets', DEFAULT_TARGETS)
  const lang      = profile.language ?? 'ar'
  const weight    = profile.weight   ?? 75

  // ── Workout log (localStorage, resets each new day) ───────────────────────
  const [workoutDay, setWorkoutDay] = useLocalStorage<WorkoutDay>('galaxy-workout-today', {
    date: todayStr(), exercises: [],
  })
  useEffect(() => {
    if (workoutDay.date !== todayStr()) {
      setWorkoutDay({ date: todayStr(), exercises: [] })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Calories eaten — live from Supabase food log ───────────────────────────
  const [caloriesEaten, setCaloriesEaten] = useState(0)
  useEffect(() => {
    getFoodLogs(getTodayDate()).then(foods => {
      setCaloriesEaten(Math.round(foods.reduce((s, f) => s + f.nutrition.calories, 0)))
    })
  }, [])

  // ── Apple Health — active energy burned (Apple Watch / Whoop / iPhone) ──────
  const [healthAvailable, setHealthAvailable] = useState(false)
  const [healthBurned, setHealthBurned] = useLocalStorage<number>('galaxy-health-burned', 0)
  const [healthConnected, setHealthConnected] = useLocalStorage<boolean>('galaxy-health-connected', false)
  const [healthLoading, setHealthLoading] = useState(false)

  const refreshHealth = async () => {
    if (!isHealthPlatform()) return
    setHealthLoading(true)
    const kcal = await getTodayBurnedFromHealth()
    setHealthBurned(kcal)
    setHealthLoading(false)
  }

  const connectHealth = async () => {
    setHealthLoading(true)
    const granted = await requestHealthAccess()
    if (granted) {
      setHealthConnected(true)
      const kcal = await getTodayBurnedFromHealth()
      setHealthBurned(kcal)
    }
    setHealthLoading(false)
  }

  // كشف المنصة + قراءة تلقائية عند فتح الصفحة إن كان مربوطاً
  useEffect(() => {
    const avail = isHealthPlatform()
    setHealthAvailable(avail)
    if (avail && healthConnected) refreshHealth()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Exercise selection state ───────────────────────────────────────────────
  const [search,     setSearch]     = useState('')
  const [selectedEx, setSelectedEx] = useState<CatalogEx | null>(null)  // from catalog
  const [customText, setCustomText] = useState('')                        // free-text
  const [duration,   setDuration]   = useState(30)                        // editable minutes

  // ── Calculation state ─────────────────────────────────────────────────────
  const [calcLoading, setCalcLoading] = useState(false)
  const [calcCals,    setCalcCals]    = useState<number | null>(null)
  const [calcError,   setCalcError]   = useState('')
  const [editedCals,  setEditedCals]  = useState(0)

  // ── Derived numbers ───────────────────────────────────────────────────────
  const manualBurned = workoutDay.exercises.reduce((s, e) => s + e.calories, 0)
  const healthActive = (healthAvailable && healthConnected) ? healthBurned : 0
  const totalBurned  = manualBurned + healthActive          // تمارين يدوية + Apple Health
  const calTarget    = targets.calories ?? 2000
  const netCals      = calTarget + totalBurned - caloriesEaten
  const netPositive  = netCals >= 0

  // ── Filtered catalog ──────────────────────────────────────────────────────
  const filteredExs = search.trim()
    ? EXERCISES.filter(e =>
        e.ar.includes(search) || e.en.toLowerCase().includes(search.toLowerCase()))
    : EXERCISES

  const hasSelection = !!(selectedEx || customText)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const pickCatalog = (ex: CatalogEx) => {
    setSelectedEx(ex); setCustomText(''); setCalcCals(null); setCalcError('')
  }

  const pickCustom = (text: string) => {
    setCustomText(text.trim()); setSelectedEx(null); setCalcCals(null); setCalcError('')
    setSearch('')
  }

  const clearSelection = () => {
    setSelectedEx(null); setCustomText(''); setCalcCals(null); setCalcError(''); setSearch('')
  }

  const handleCalc = async () => {
    if (selectedEx) {
      // Instant local calculation via MET: calories = MET × kg × hours
      const cals = Math.round(selectedEx.met * weight * (duration / 60))
      setCalcCals(cals); setEditedCals(cals)
    } else if (customText) {
      setCalcLoading(true); setCalcCals(null); setCalcError('')
      try {
        const query = `${customText} ${duration} ${lang === 'ar' ? 'دقيقة' : 'minutes'}`
        const res   = await fetch('/api/calc-burn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exercise: query, weight, language: lang }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setCalcCals(data.calories); setEditedCals(data.calories)
      } catch (err) {
        setCalcError(err instanceof Error ? err.message : t('حدث خطأ', 'Error'))
      } finally { setCalcLoading(false) }
    }
  }

  const addExercise = () => {
    if (calcCals === null) return
    const entry: ExerciseEntry = {
      id:       Date.now().toString(),
      name:     selectedEx ? t(selectedEx.ar, selectedEx.en) : customText,
      icon:     selectedEx?.icon ?? '💪',
      minutes:  duration,
      calories: editedCals,
    }
    setWorkoutDay(prev => ({ ...prev, exercises: [entry, ...prev.exercises] }))
    clearSelection(); setDuration(30)
  }

  const removeExercise = (id: string) =>
    setWorkoutDay(prev => ({ ...prev, exercises: prev.exercises.filter(e => e.id !== id) }))

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col px-4 pt-6 gap-5 pb-28"
      style={{ direction: lang === 'en' ? 'ltr' : 'rtl' }}>

      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-black text-white">
          {t('رياضة', 'Workout')} <span className="text-gradient-galaxy">{t('اليوم 🏋️', 'Today 🏋️')}</span>
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {t('تتبع تمارينك واحسب السعرات المحروقة', 'Track exercises & calculate burned calories')}
        </p>
      </div>

      {/* ── Two Rings ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Ring 1 — Eaten (from Supabase food log) */}
        <GlassCard glow="none" className="p-4 flex flex-col items-center gap-2" animate={false}>
          <p className="text-[11px] font-semibold text-white/40">{t('تناولت اليوم', 'Eaten Today')}</p>
          <div className="relative">
            <Ring value={caloriesEaten} max={calTarget} color="#f59e0b" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="text-xl font-black leading-none" style={{ color: '#f59e0b' }}>
                {caloriesEaten.toLocaleString()}
              </span>
              <span className="text-[10px] text-white/30">/ {calTarget.toLocaleString()}</span>
              <span className="text-[9px] text-white/20">kcal</span>
            </div>
          </div>
          <p className="text-[10px] text-white/20 text-center">
            {t('من سجل الوجبات', 'From meal log')}
          </p>
        </GlassCard>

        {/* Ring 2 — Burned */}
        <GlassCard glow="none" className="p-4 flex flex-col items-center gap-2" animate={false}>
          <p className="text-[11px] font-semibold text-white/40">{t('حرقت اليوم', 'Burned Today')}</p>
          <div className="relative">
            <Ring value={totalBurned} max={500} color="#97E325" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="text-xl font-black leading-none" style={{ color: '#97E325' }}>
                {totalBurned.toLocaleString()}
              </span>
              <span className="text-[10px] text-white/30">🔥 kcal</span>
            </div>
          </div>
          <p className="text-[11px] text-white/30">
            {workoutDay.exercises.length} {t('تمرين', 'exercises')}
            {healthActive > 0 && (
              <span style={{ color: '#f472b6' }}> + {healthActive} 🍎</span>
            )}
          </p>
        </GlassCard>
      </div>

      {/* ── Apple Health connect / status ─────────────────────────────────── */}
      {healthAvailable && (
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: healthConnected ? 'rgba(244,114,182,0.07)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${healthConnected ? 'rgba(244,114,182,0.25)' : 'rgba(255,255,255,0.09)'}`,
          }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(244,114,182,0.14)' }}>
            <HeartPulse size={20} color="#f472b6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white/85">{t('تطبيق الصحة Apple Health', 'Apple Health')}</p>
            <p className="text-[11px] text-white/35 leading-tight mt-0.5">
              {healthConnected
                ? t(`متصل — ${healthBurned} سعرة نشاط اليوم`, `Connected — ${healthBurned} kcal active today`)
                : t('اربط لسحب سعرات الحرق تلقائياً (ساعة آبل، Whoop…)', 'Connect to auto-import burned calories (Apple Watch, Whoop…)')}
            </p>
          </div>
          {healthConnected ? (
            <button onClick={refreshHealth} disabled={healthLoading}
              className="p-2.5 rounded-xl flex-shrink-0"
              style={{ background: 'rgba(244,114,182,0.12)' }}>
              <RefreshCw size={16} color="#f472b6"
                className={healthLoading ? 'animate-spin' : ''} />
            </button>
          ) : (
            <button onClick={connectHealth} disabled={healthLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold flex-shrink-0 flex items-center gap-1.5"
              style={{ background: 'rgba(244,114,182,0.16)', color: '#f472b6', opacity: healthLoading ? 0.6 : 1 }}>
              {healthLoading
                ? <span className="w-3.5 h-3.5 border-2 border-[#f472b6]/30 border-t-[#f472b6] rounded-full animate-spin" />
                : <HeartPulse size={14} />}
              {t('ربط', 'Connect')}
            </button>
          )}
        </div>
      )}

      {/* ── Net Calories ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 flex items-center justify-between gap-3"
        style={{
          background: netPositive ? 'rgba(151,227,37,0.07)' : 'rgba(239,68,68,0.07)',
          border: `1px solid ${netPositive ? 'rgba(151,227,37,0.22)' : 'rgba(239,68,68,0.22)'}`,
        }}>
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-[11px] font-bold" style={{ color: netPositive ? '#97E325' : '#f87171' }}>
            {netPositive
              ? t('✅ متبقي مع الحرق', '✅ Remaining with Burn')
              : t('⚠️ تجاوزت الهدف', '⚠️ Exceeded Target')}
          </p>
          <p className="text-[10px] text-white/25 leading-tight" dir="ltr">
            {calTarget.toLocaleString()} + {totalBurned} − {caloriesEaten}
          </p>
        </div>
        <span className="text-3xl font-black flex-shrink-0"
          style={{ color: netPositive ? '#97E325' : '#f87171' }}>
          {Math.abs(netCals).toLocaleString()}
          <span className="text-xs font-normal text-white/25 ms-1">kcal</span>
        </span>
      </div>

      {/* ── Add Exercise ──────────────────────────────────────────────────── */}
      <GlassCard glow="none" className="p-5 flex flex-col gap-4" animate={false}>
        <p className="text-sm font-bold text-white">{t('➕ أضف تمريناً', '➕ Add Exercise')}</p>

        {hasSelection ? (
          /* ── Selected exercise: show duration + calc ─────────────────── */
          <div className="flex flex-col gap-3">

            {/* Selection chip */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(151,227,37,0.1)', border: '1px solid rgba(151,227,37,0.25)' }}>
              <span className="text-xl">{selectedEx?.icon ?? '💪'}</span>
              <span className="flex-1 text-sm font-bold truncate" style={{ color: '#97E325' }}>
                {selectedEx ? t(selectedEx.ar, selectedEx.en) : customText}
              </span>
              {selectedEx && (
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(151,227,37,0.15)', color: 'rgba(151,227,37,0.6)' }}>
                  MET {selectedEx.met}
                </span>
              )}
              <button onClick={clearSelection}
                className="p-1.5 rounded-lg flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <X size={13} color="rgba(255,255,255,0.4)" />
              </button>
            </div>

            {/* Duration — directly typeable */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-white/40 flex-shrink-0">{t('المدة', 'Duration')}</label>
              <div className="flex items-center gap-1.5 flex-1" dir="ltr">
                <button onClick={() => setDuration(d => Math.max(1, d - 5))}
                  className="w-9 h-9 rounded-xl text-lg font-black flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(151,227,37,0.12)', color: '#97E325' }}>−</button>
                <input
                  type="number" min={1} max={360} value={duration}
                  onChange={e => {
                    const v = parseInt(e.target.value)
                    if (!isNaN(v)) setDuration(Math.max(1, Math.min(360, v)))
                  }}
                  onFocus={e => e.target.select()}
                  className="galaxy-input flex-1 py-2.5 text-center text-xl font-black"
                  style={{ color: '#97E325' }}
                  inputMode="numeric"
                />
                <button onClick={() => setDuration(d => Math.min(360, d + 5))}
                  className="w-9 h-9 rounded-xl text-lg font-black flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(151,227,37,0.12)', color: '#97E325' }}>+</button>
                <span className="text-xs text-white/35 flex-shrink-0">{t('دقيقة', 'min')}</span>
              </div>
            </div>

            {calcError && (
              <p className="text-xs" style={{ color: '#f87171' }}>⚠️ {calcError}</p>
            )}

            {calcCals === null ? (
              /* Calculate button */
              <button onClick={handleCalc} disabled={calcLoading}
                className="py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: 'rgba(151,227,37,0.14)',
                  border: '1px solid rgba(151,227,37,0.3)',
                  color: '#97E325',
                  opacity: calcLoading ? 0.6 : 1,
                }}>
                {calcLoading
                  ? <span className="w-4 h-4 border-2 border-[#97E325]/30 border-t-[#97E325] rounded-full animate-spin" />
                  : <Zap size={15} />}
                {selectedEx
                  ? t('احسب ⚡', 'Calculate ⚡')
                  : t('احسب بالذكاء AI ⚡', 'Calculate with AI ⚡')}
              </button>
            ) : (
              /* Result + editable calories */
              <div className="flex flex-col gap-3 rounded-xl p-4 animate-fade-in"
                style={{ background: 'rgba(151,227,37,0.07)', border: '1px solid rgba(151,227,37,0.2)' }}>
                <div className="flex items-center gap-2" dir="ltr">
                  <button onClick={() => setEditedCals(c => Math.max(0, c - 5))}
                    className="w-10 h-10 rounded-xl text-lg font-black flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(151,227,37,0.15)', color: '#97E325' }}>−</button>
                  <div className="flex-1 relative">
                    <input
                      type="number" min={0} value={editedCals}
                      onChange={e => setEditedCals(Math.max(0, parseInt(e.target.value) || 0))}
                      onFocus={e => e.target.select()}
                      className="galaxy-input w-full py-2.5 text-center text-2xl font-black"
                      style={{ color: '#97E325' }}
                      inputMode="numeric"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">🔥</span>
                  </div>
                  <button onClick={() => setEditedCals(c => c + 5)}
                    className="w-10 h-10 rounded-xl text-lg font-black flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(151,227,37,0.15)', color: '#97E325' }}>+</button>
                  <span className="text-xs text-white/30 flex-shrink-0">kcal</span>
                </div>
                <button onClick={addExercise}
                  className="btn-galaxy py-3 flex items-center justify-center gap-2 text-sm font-bold">
                  <Plus size={15} />
                  {t('إضافة للسجل', 'Add to Log')}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Catalog / search mode ────────────────────────────────────── */
          <div className="flex flex-col gap-3">

            {/* Search input */}
            <div className="relative">
              <Search size={14} color="rgba(255,255,255,0.3)"
                className="absolute top-1/2 -translate-y-1/2"
                style={{ [lang === 'ar' ? 'right' : 'left']: 12 }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t(
                  'ابحث عن تمرين... أو اكتب أي شيء',
                  'Search exercise… or type anything'
                )}
                className="galaxy-input w-full py-3 text-sm"
                style={{
                  [lang === 'ar' ? 'paddingRight' : 'paddingLeft']: 36,
                  [lang === 'ar' ? 'paddingLeft' : 'paddingRight']: search ? 36 : 12,
                }}
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ [lang === 'ar' ? 'left' : 'right']: 10 }}>
                  <X size={14} color="rgba(255,255,255,0.4)" />
                </button>
              )}
            </div>

            {/* Catalog grid */}
            {filteredExs.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {filteredExs.map(ex => (
                  <button key={ex.id} onClick={() => pickCatalog(ex)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all active:scale-95"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}>
                    <span className="text-2xl">{ex.icon}</span>
                    <span className="text-[11px] font-bold text-white/60 text-center leading-tight">
                      {t(ex.ar, ex.en)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Custom option: when search text has no catalog match */}
            {search.trim() && filteredExs.length === 0 && (
              <button
                onClick={() => pickCustom(search)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-start"
                style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)' }}>
                <span className="text-xl">🔍</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#a78bfa' }}>
                    {search.trim()}
                  </p>
                  <p className="text-[11px]" style={{ color: 'rgba(167,139,250,0.55)' }}>
                    {t('تمرين مخصص — حساب بالذكاء AI', 'Custom — calculate with AI')}
                  </p>
                </div>
              </button>
            )}

            {/* AI option when search has text but catalog also has results */}
            {search.trim() && filteredExs.length > 0 && (
              <button
                onClick={() => pickCustom(search)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-start"
                style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
                <span className="text-base">🤖</span>
                <p className="text-[11px]" style={{ color: 'rgba(167,139,250,0.65)' }}>
                  {t(`استخدم AI لـ "${search}"`, `Use AI for "${search}"`)}
                </p>
              </button>
            )}
          </div>
        )}
      </GlassCard>

      {/* ── Exercise list ─────────────────────────────────────────────────── */}
      {workoutDay.exercises.length > 0 && (
        <GlassCard glow="none" className="p-5" animate={false}>
          <h2 className="text-sm font-bold text-white mb-3">
            {t('تمارين اليوم 💪', "Today's Exercises 💪")}
          </h2>
          <div className="flex flex-col gap-2">
            {workoutDay.exercises.map(ex => (
              <div key={ex.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xl flex-shrink-0">{ex.icon ?? '💪'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white/85 leading-tight truncate">{ex.name}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {ex.minutes} {t('دقيقة', 'min')}
                  </p>
                </div>
                <span className="text-sm font-black px-2.5 py-1 rounded-lg flex-shrink-0"
                  style={{ background: 'rgba(151,227,37,0.12)', color: '#97E325' }}>
                  🔥 {ex.calories}
                </span>
                <button onClick={() => removeExercise(ex.id)}
                  className="p-1.5 rounded-lg flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.08)' }}>
                  <Trash2 size={14} color="rgba(239,68,68,0.55)" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 px-1"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="text-xs text-white/35">
              {t('إجمالي الحرق اليوم', 'Total burned today')}
            </span>
            <span className="text-sm font-black" style={{ color: '#97E325' }}>
              🔥 {totalBurned.toLocaleString()} kcal
            </span>
          </div>
        </GlassCard>
      )}

      {/* Empty state */}
      {workoutDay.exercises.length === 0 && !hasSelection && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Dumbbell size={42} color="rgba(255,255,255,0.07)" />
          <p className="text-sm text-white/22">
            {t('لا تمارين اليوم — اختر تمريناً للبدء!', 'No exercises today — pick one to start!')}
          </p>
        </div>
      )}

      {/* ── AI Training Plan ─────────────────────────────────────────────── */}
      <WorkoutPlanGenerator />
    </div>
  )
}
