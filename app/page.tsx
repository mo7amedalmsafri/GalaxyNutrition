'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Droplets, Activity, Trash2, Menu, X, User, Bell, Moon, Sun, Languages, Info, Star, Pencil, Gift, ChevronLeft, ChevronRight } from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import BMICircle from '@/components/BMICircle'
import CalorieRing from '@/components/CalorieRing'
import MacroBar from '@/components/MacroBar'
import WeightMiniChart from '@/components/WeightMiniChart'
import AICoachCard from '@/components/AICoachCard'
import FoodEntryModal from '@/components/FoodEntryModal'
import FoodSearchBar from '@/components/FoodSearchBar'
import TourOverlay, { TourStep } from '@/components/TourOverlay'
import { calculateBMI, getTodayDate } from '@/lib/utils'
import { FoodItem } from '@/lib/types'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT, useIsNativeApp, useInboxUnread } from '@/lib/store'
import { getFoodLogs, addFoodLog, deleteFoodLog, updateFoodLog, getWaterLog, setWaterLog, getWeightEntries, addWeightEntry, loadProfileFromSupabase, saveXpToSupabase } from '@/lib/db'
import { useSavedMeals } from '@/lib/savedMeals'
import { syncWaterWidget, getWaterWidgetState } from '@/lib/waterWidget'
import { isHealthPlatform, requestHealthAccess, getTodayBurnedFromHealth } from '@/lib/health'
import { getCurrentLevel, getLevelProgress, getXpToNextLevel, XP_REWARDS, XP_DAILY_CAP, capDailyXp, LevelInfo, buildXpRollover, xpMultiplier } from '@/lib/gamification'
import LevelRing from '@/components/LevelRing'

// ── Water drop SVG with partial fill ──
function WaterDrop({ index, fillPct }: { index: number; fillPct: number }) {
  const id = `wd-${index}`
  const fill = Math.max(0, Math.min(1, fillPct))
  return (
    <svg width="26" height="34" viewBox="0 0 26 34">
      <defs>
        <clipPath id={id}>
          <rect x="0" y={34 * (1 - fill)} width="26" height="34" />
        </clipPath>
      </defs>
      <path
        d="M13 2 C13 2, 2 15, 2 22 A11 11 0 0 0 24 22 C24 15, 13 2, 13 2Z"
        fill={fill > 0 ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.05)'}
        stroke={fill > 0 ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.15)'}
        strokeWidth="1.5"
      />
      {fill > 0 && (
        <path
          d="M13 2 C13 2, 2 15, 2 22 A11 11 0 0 0 24 22 C24 15, 13 2, 13 2Z"
          fill="rgba(6,182,212,0.75)"
          clipPath={`url(#${id})`}
        />
      )}
    </svg>
  )
}

function getDropFill(idx: number, totalMl: number, target: number, drops = 8): number {
  const filled = (totalMl / target) * drops
  if (idx < Math.floor(filled)) return 1
  if (idx === Math.floor(filled)) return filled % 1
  return 0
}

// Static fallback used only before Supabase data loads
const WEIGHT_HISTORY_FALLBACK = [
  { date: '2026-05-18', weight: 86.2 },
  { date: '2026-05-24', weight: 84.0 },
]

export default function Dashboard() {
  const router = useRouter()
  const t = useT()
  const isNativeApp = useIsNativeApp()
  const today = getTodayDate()

  // التاريخ المعروض (للتصفّح للأيام السابقة — عرض فقط). الإضافات دائماً لليوم الحقيقي.
  const [viewDate, setViewDate] = useState(today)
  const isToday = viewDate === today
  const shiftDate = (base: string, days: number) => {
    const d = new Date(base + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().split('T')[0]
  }

  const [profile, setProfile, profileHydrated] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const lang    = profile.language ?? 'ar'
  const isLight = (profile.theme ?? 'dark') === 'light'
  const [checkingRemoteProfile, setCheckingRemoteProfile] = useState(false)
  const [levelUpInfo, setLevelUpInfo] = useState<LevelInfo | null>(null)
  const [todayFoods, setTodayFoods] = useState<FoodItem[]>([])
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null)
  const savedMeals = useSavedMeals()
  const inboxUnread = useInboxUnread()
  const [showTour, setShowTour] = useState(false)
  const [waterMl, setWaterMlState] = useState(0)
  const [weightHistory, setWeightHistory] = useState(WEIGHT_HISTORY_FALLBACK)
  const [showFoodModal, setShowFoodModal] = useState(false)
  const [showDrawer,    setShowDrawer]    = useState(false)
  const [waterInput, setWaterInput] = useState('')
  const [showWeightInput, setShowWeightInput] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)

  // Redirect to onboarding if not completed — but first check Supabase
  // in case the user has a profile saved there (e.g. after logging out and back in)
  useEffect(() => {
    if (!profileHydrated) return
    if (!profile.completedOnboarding) {
      setCheckingRemoteProfile(true)
      loadProfileFromSupabase().then(remote => {
        if (remote) {
          // Found a completed profile in Supabase → sync to localStorage
          setProfile(remote)
        } else {
          // No remote profile either → send to onboarding
          router.replace('/onboarding')
        }
        setCheckingRemoteProfile(false)
      })
    }
  }, [profileHydrated, profile.completedOnboarding, router])

  // Load today's data from Supabase
  useEffect(() => {
    if (!profileHydrated || !profile.completedOnboarding) return
    getFoodLogs(viewDate).then(setTodayFoods)
    if (isToday) {
      getWaterLog(viewDate).then(async ml => {
        // إن كان الويدجت فيه تعديل غير مُزامن (إضافة/تراجع/مسح أثناء الإغلاق)
        // نعتمد قيمته كقيمة اليوم، وإلا نعتمد سجل Supabase
        const st = await getWaterWidgetState()
        const total = st.dirty ? st.waterMl : ml
        if (st.dirty && total !== ml) setWaterLog(viewDate, total)
        setWaterMlState(total)
        syncWaterWidget(total, profile.targetWater ?? 2500)   // يكتب القيمة المرجعية ويصفّر إشارة التعديل
      })
    } else {
      // يوم سابق — عرض فقط، بدون مزامنة الويدجت
      getWaterLog(viewDate).then(setWaterMlState)
    }
    getWeightEntries().then(entries => {
      if (entries.length > 0) {
        setWeightHistory(entries.map(e => ({ date: e.date as string, weight: e.weight as number })))
      }
    })
  }, [profileHydrated, profile.completedOnboarding, viewDate, isToday])

  // Apple Health: اطلب الإذن تلقائياً أول فتح، وإن قُبل احفظ الربط لصفحة التمارين
  useEffect(() => {
    if (!profileHydrated || !profile.completedOnboarding) return
    if (!isHealthPlatform()) return
    let done = false
    try { done = localStorage.getItem('galaxy-health-asked') === 'true' } catch {}
    if (done) return
    ;(async () => {
      try { localStorage.setItem('galaxy-health-asked', 'true') } catch {}
      const granted = await requestHealthAccess()
      if (!granted) return
      const kcal = await getTodayBurnedFromHealth()
      try {
        localStorage.setItem('galaxy-health-connected', JSON.stringify(true))
        localStorage.setItem('galaxy-health-burned', JSON.stringify(kcal))
      } catch {}
    })()
  }, [profileHydrated, profile.completedOnboarding])

  // XP day rollover: when a new day starts, lock yesterday's pending XP permanently
  useEffect(() => {
    if (!profileHydrated || !profile.completedOnboarding) return
    const patch = buildXpRollover(
      profile.xpLocked  ?? 0,
      profile.xpPending ?? 0,
      profile.xpDate,
      today
    )
    if (patch) setProfile(p => ({ ...p, ...patch }))
  }, [profileHydrated, profile.completedOnboarding]) // intentionally run once on mount

  // Sync XP to Supabase (debounced) so it survives device changes
  useEffect(() => {
    if (!profileHydrated || !profile.completedOnboarding) return
    const t = setTimeout(() => {
      saveXpToSupabase(profile.xpLocked ?? 0, profile.xpPending ?? 0, profile.xpDate ?? '')
    }, 1500)
    return () => clearTimeout(t)
  }, [profileHydrated, profile.completedOnboarding, profile.xpLocked, profile.xpPending, profile.xpDate])

  // الجولة التعريفية — أول زيارة بعد إكمال الإعداد
  useEffect(() => {
    if (!profileHydrated || !profile.completedOnboarding) return
    if (typeof window !== 'undefined' && !localStorage.getItem('dietak-tour-done')) {
      const to = setTimeout(() => setShowTour(true), 700)
      return () => clearTimeout(to)
    }
  }, [profileHydrated, profile.completedOnboarding])

  if (!profileHydrated || checkingRemoteProfile || !profile.completedOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  // ── Gamification helpers ────────────────────────────────────────────
  // Total XP = locked (previous days, permanent) + pending (today, reversible)
  const currentXp = (profile.xpLocked ?? 0) + (profile.xpPending ?? 0)
  const levelInfo = getCurrentLevel(currentXp)
  const xpToNext  = getXpToNextLevel(currentXp)

  /** Award XP for a positive action — respects the daily cap of XP_DAILY_CAP. */
  const earn = (amount: number) => {
    const currentPending = profile.xpPending ?? 0
    const oldTotal0    = (profile.xpLocked ?? 0) + currentPending
    // مضاعِف الجائزة: +٢٥٪ XP من المستوى ٤
    const boosted      = Math.round(amount * xpMultiplier(getCurrentLevel(oldTotal0).level))
    const actual = capDailyXp(currentPending, boosted)
    if (actual <= 0) return   // daily cap already reached

    const oldTotal     = (profile.xpLocked ?? 0) + currentPending
    const newTotal     = oldTotal + actual
    const oldLevelNum  = getCurrentLevel(oldTotal).level
    const newLevelInfo = getCurrentLevel(newTotal)
    setProfile(p => ({
      ...p,
      xpPending: (p.xpPending ?? 0) + actual,
      xpDate:    today,
    }))
    if (newLevelInfo.level > oldLevelNum) {
      setLevelUpInfo(newLevelInfo)
      setTimeout(() => setLevelUpInfo(null), 5000)
    }
  }

  /**
   * Deduct XP when an action is undone (e.g. meal deleted).
   * Only reduces today's pending XP — locked XP from previous days is NEVER touched.
   */
  const loseXp = (amount: number) => {
    setProfile(p => ({
      ...p,
      xpPending: Math.max(0, (p.xpPending ?? 0) - amount),
    }))
  }

  const bmi = calculateBMI(profile.weight, profile.height)
  const consumed = todayFoods.reduce((s, f) => s + f.nutrition.calories, 0)
  const protein = todayFoods.reduce((s, f) => s + f.nutrition.protein, 0)
  const carbs = todayFoods.reduce((s, f) => s + f.nutrition.carbs, 0)
  const fat = todayFoods.reduce((s, f) => s + f.nutrition.fat, 0)

  const handleAddFood = async (item: Omit<FoodItem, 'id' | 'loggedAt'>) => {
    if (!isToday) return
    const tempItem: FoodItem = { ...item, id: `tmp-${Date.now()}`, loggedAt: new Date().toISOString() }
    setTodayFoods(prev => [...prev, tempItem])
    const saved = await addFoodLog(today, item)
    if (saved) setTodayFoods(prev => prev.map(f => f.id === tempItem.id ? saved : f))
    earn(XP_REWARDS.LOG_FOOD)
  }

  const handleDeleteFood = async (id: string) => {
    if (!isToday) return
    setTodayFoods(prev => prev.filter(f => f.id !== id))
    await deleteFoodLog(id)
    loseXp(XP_REWARDS.LOG_FOOD)   // خصم XP — فقط من نقاط اليوم
  }

  // تعديل وجبة مضافة — يحدّث القيم بعد إعادة الحساب (بلا XP جديد)
  const handleEditFood = async (item: Omit<FoodItem, 'id' | 'loggedAt'>) => {
    if (!isToday) return
    const id = editingFood?.id
    if (!id) return
    setTodayFoods(prev => prev.map(f => f.id === id ? { ...f, ...item } : f))
    setEditingFood(null)
    const updated = await updateFoodLog(id, item)
    if (updated) setTodayFoods(prev => prev.map(f => f.id === id ? updated : f))
  }

  const addWater = (ml: number) => {
    if (!isToday) return
    const next = Math.min(waterMl + ml, 6000)
    setWaterMlState(next)
    setWaterLog(today, next)
    syncWaterWidget(next, profile.targetWater ?? 2500)
    earn(XP_REWARDS.LOG_WATER)
  }

  const handleWaterInput = () => {
    const ml = parseInt(waterInput)
    if (!isNaN(ml) && ml > 0) addWater(ml)
    setWaterInput('')
  }

  const handleClearWater = () => {
    if (!isToday) return
    setWaterMlState(0)
    setWaterLog(today, 0)
    syncWaterWidget(0, profile.targetWater ?? 2500)
  }

  const handleLogWeight = async () => {
    if (!isToday) return
    const w = parseFloat(weightInput)
    if (isNaN(w) || w < 20 || w > 400) return
    setSavingWeight(true)
    await addWeightEntry(w, today)
    const entries = await getWeightEntries()
    if (entries.length > 0) {
      setWeightHistory(entries.map(e => ({ date: e.date as string, weight: e.weight as number })))
    }
    setWeightInput('')
    setShowWeightInput(false)
    setSavingWeight(false)
    earn(XP_REWARDS.LOG_WEIGHT)
  }

  // ── Drawer settings handlers ─────────────────────────────────────
  const handleThemeToggle = () => {
    const next = (profile.theme ?? 'dark') === 'light' ? 'dark' : 'light'
    setProfile({ ...profile, theme: next as 'dark' | 'light' })
    document.documentElement.setAttribute('data-theme', next)
  }

  const handleLanguageToggle = () => {
    const next = (profile.language ?? 'ar') === 'ar' ? 'en' : 'ar'
    setProfile({ ...profile, language: next as 'ar' | 'en' })
    document.documentElement.setAttribute('lang', next)
    document.documentElement.setAttribute('dir', next === 'en' ? 'ltr' : 'rtl')
    setTimeout(() => window.location.reload(), 150)
  }

  const handleNotificationsToggle = async () => {
    if (profile.notifications) {
      setProfile({ ...profile, notifications: false })
      return
    }
    if (!('Notification' in window)) return
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setProfile({ ...profile, notifications: true })
      new Notification('Dietak دايتك 🚀', {
        body: profile.language === 'en'
          ? 'Notifications enabled!'
          : 'الإشعارات مفعّلة!',
        icon: '/icon-192.png',
      })
    }
  }

  return (
    <div className="flex flex-col px-4 pt-6 gap-5" style={{ direction: lang === 'en' ? 'ltr' : 'rtl' }}>

      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        {/* Left: greeting + level badge */}
        <div className="flex-1 min-w-0">
          {/* Date navigator — تصفّح الأيام السابقة (عرض فقط) */}
          <div className="flex items-center gap-1.5" dir="ltr">
            <button
              onClick={() => setViewDate(d => shiftDate(d, -1))}
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
              style={{ background: 'rgba(151,227,37,0.14)', color: '#97E325' }}
              aria-label="السابق"
            >
              <ChevronLeft size={15} />
            </button>
            <p className="text-white/55 text-sm font-semibold min-w-[130px] text-center"
              style={{ direction: lang === 'en' ? 'ltr' : 'rtl' }}>
              {isToday
                ? t('اليوم', 'Today')
                : new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ar-SA', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(viewDate + 'T00:00:00Z'))}
            </p>
            <button
              onClick={() => { if (!isToday) setViewDate(d => shiftDate(d, 1)) }}
              disabled={isToday}
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
              style={{
                background: isToday ? 'rgba(255,255,255,0.05)' : 'rgba(151,227,37,0.14)',
                color:      isToday ? 'rgba(255,255,255,0.2)'  : '#97E325',
              }}
              aria-label="التالي"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <h1 className="text-xl font-black text-white mt-0.5">
            {isToday
              ? <>{t('مرحباً،', 'Hello,')} <span className="text-gradient-galaxy">{profile.name}</span> 👋</>
              : <span className="text-gradient-galaxy">{new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ar-SA', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(viewDate + 'T00:00:00Z'))}</span>}
          </h1>
          {/* Level badge row */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
              style={{
                background: `${levelInfo.color}22`,
                color:       levelInfo.color,
                border:      `1px solid ${levelInfo.color}40`,
              }}
            >
              {t('مستوى', 'Lv')} {levelInfo.level} · {lang === 'en' ? levelInfo.nameEn : levelInfo.name}
            </span>
            <span className="text-[11px] text-white/30 flex-shrink-0">
              {currentXp} XP
            </span>
            {/* Daily cap indicator */}
            {(() => {
              const todayXp = profile.xpPending ?? 0
              const capReached = todayXp >= XP_DAILY_CAP
              return capReached ? (
                <span className="text-[11px] font-bold flex-shrink-0"
                  style={{ color: levelInfo.color }}>
                  ✓ {t('اكتملت حصة اليوم', 'Daily cap reached')}
                </span>
              ) : (
                <span className="text-[11px] text-white/20 flex-shrink-0">
                  · {todayXp}/{XP_DAILY_CAP} {t('اليوم', 'today')}
                </span>
              )
            })()}
          </div>
        </div>

        {/* Right: level ring + menu */}
        <div className="flex items-center gap-3 flex-shrink-0 mr-2">
          <button onClick={() => router.push('/rewards')} data-tour="level" className="relative active:scale-95 transition-transform"
            aria-label={t('الجوائز والمستويات', 'Rewards & levels')}>
            <LevelRing xp={currentXp} size={50} />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: '#f59e0b' }}>
              <Gift size={11} color="#09090D" />
            </span>
          </button>
          {/* Inbox bell */}
          <button onClick={() => router.push('/inbox')} data-tour="inbox"
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: isLight ? '#ffffff' : 'rgba(255,255,255,0.07)' }}
            aria-label={t('صندوق الوارد', 'Inbox')}>
            <Bell size={19} color={isLight ? '#1a1a1a' : '#fff'} />
            {inboxUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                style={{ background: '#ef4444' }}>{inboxUnread}</span>
            )}
          </button>
          <button
            onClick={() => setShowDrawer(true)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
            style={{
              background: isLight ? '#ffffff' : 'rgba(255,255,255,0.07)',
              border:     isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.12)',
              boxShadow:  isLight ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <Menu size={20} color={isLight ? 'rgba(30,30,50,0.65)' : 'rgba(255,255,255,0.75)'} />
          </button>
        </div>
      </div>

      {/* Food Search Bar — اليوم الحالي فقط */}
      {isToday ? (
        <div className="animate-slide-up" data-tour="search">
          <FoodSearchBar onAddFood={handleAddFood} saved={savedMeals.saved} onRemoveSaved={savedMeals.remove} />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Info size={13} /> {t('عرض فقط — يوم سابق', 'View only — past day')}
        </div>
      )}

      {/* ── Calorie Summary ── */}
      <GlassCard glow="purple" className="p-5" animate={false}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-base">{t('ملخص السعرات', 'Calorie Summary')}</h2>
          <span className="text-xs text-white/40">
            {new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ar-SA', { day: 'numeric', month: 'short' }).format(new Date())}
          </span>
        </div>

        <div className="flex items-center justify-around gap-4">
          <CalorieRing consumed={Math.round(consumed)} target={profile.dailyCalories} />

          <div className="flex flex-col gap-3 flex-1">
            {[
              { label: t('الهدف', 'Goal'),      value: profile.dailyCalories,                                         icon: '🎯', color: '#97E325' },
              { label: t('المستهلك', 'Eaten'),  value: Math.round(consumed),                                          icon: '🍽️', color: '#FF5F1F' },
              { label: t('المتبقي', 'Left'),    value: Math.max(profile.dailyCalories - Math.round(consumed), 0),    icon: '⚡', color: '#00D4FF' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-xs text-white/50">{item.label}</span>
                </div>
                <span className="font-bold text-sm" style={{ color: item.color }}>
                  {item.value.toLocaleString()}
                  <span className="text-xs text-white/30 font-normal"> {t('سعرة', 'kcal')}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min((consumed / profile.dailyCalories) * 100, 100)}%`,
                background: 'linear-gradient(90deg, #97E325, #00D4FF, #FF5F1F)',
                boxShadow: '0 0 10px rgba(151,227,37,0.4)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-white/30">
            <span>0</span>
            <span>{Math.round((consumed / profile.dailyCalories) * 100)}%</span>
            <span>{profile.dailyCalories.toLocaleString()}</span>
          </div>
        </div>
      </GlassCard>

      {/* ── Macros ── */}
      <GlassCard glow="none" className="p-5" animate={false}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-base">{t("معطيات اليوم", "Today's Macros")}</h2>
          <Activity size={16} color="rgba(255,255,255,0.3)" />
        </div>
        <MacroBar
          protein={protein} carbs={carbs} fat={fat}
          targetProtein={profile.targetProtein}
          targetCarbs={profile.targetCarbs}
          targetFat={profile.targetFat}
        />
      </GlassCard>

      {/* ── BMI ── */}
      <GlassCard glow="pink" className="p-5" animate={false}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-base">{t('مؤشر كتلة الجسم', 'Body Mass Index')}</h2>
          <div className="text-xs px-2.5 py-1 rounded-full font-bold"
            style={{ background: `${bmi.color}22`, color: bmi.color }}>
            {t(bmi.categoryAr, bmi.categoryEn)}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <BMICircle bmi={bmi} />
          <div className="mt-4 p-3 rounded-xl w-full text-sm text-center"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)' }}>
            💡 {t(bmi.advice, bmi.adviceEn)}
          </div>
        </div>
      </GlassCard>

      {/* ── Weight Journey ── */}
      <GlassCard glow="gold" className="p-5" animate={false}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-base">{t('رحلة الوزن', 'Weight Journey')}</h2>
          {isToday && (
            <button
              onClick={() => { setShowWeightInput(v => !v); setWeightInput('') }}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-all active:scale-95"
              style={{
                background: showWeightInput ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.12)',
                color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.35)',
              }}>
              {showWeightInput ? t('إلغاء', 'Cancel') : `+ ${t('تسجيل', 'Log')}`}
            </button>
          )}
        </div>

        {/* Inline weight logging */}
        {showWeightInput && (
          <div className="flex gap-2 mb-4 animate-fade-in">
            <input
              type="number"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogWeight()}
              placeholder={t('وزنك اليوم... (كغ)', 'Your weight today... (kg)')}
              className="galaxy-input flex-1 px-3 py-2.5 text-sm"
              inputMode="decimal"
              dir="ltr"
              autoFocus
            />
            <button
              onClick={handleLogWeight}
              disabled={savingWeight || !weightInput}
              className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }}
            >
              {savingWeight ? '...' : t('حفظ', 'Save')}
            </button>
          </div>
        )}

        <WeightMiniChart
          data={weightHistory}
          currentWeight={profile.weight}
          targetWeight={profile.targetWeight}
        />
      </GlassCard>

      {/* ── Water Tracker ── */}
      <GlassCard glow="cyan" className="p-5" animate={false}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets size={18} color="#06b6d4" />
            <h2 className="font-bold text-white text-base">{t('شرب الماء', 'Water Intake')}</h2>
          </div>
          <span className="text-sm font-bold" style={{ color: waterMl >= profile.targetWater ? '#10b981' : '#06b6d4' }}>
            {(waterMl / 1000).toFixed(1)}L
            {waterMl >= profile.targetWater
              ? ' ✅'
              : ` / ${(profile.targetWater / 1000).toFixed(1)}L`}
          </span>
        </div>

        {/* Drop display */}
        <div className="flex gap-1.5 mb-4 justify-between">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <WaterDrop index={i} fillPct={getDropFill(i, Math.min(waterMl, profile.targetWater), profile.targetWater)} />
            </div>
          ))}
        </div>

        {/* Quick add + custom input — اليوم الحالي فقط */}
        {isToday && (
          <>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[150, 250, 330, 500].map(ml => (
                <button
                  key={ml}
                  onClick={() => addWater(ml)}
                  className="py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)' }}
                >
                  +{ml}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={waterInput}
                  onChange={e => setWaterInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleWaterInput()}
                  placeholder={t('كمية مخصصة...', 'Custom amount...')}
                  className="galaxy-input w-full px-3 py-2.5 text-sm"
                  dir="ltr"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">{t('مل', 'ml')}</span>
              </div>
              <button
                onClick={handleWaterInput}
                className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ background: 'rgba(6,182,212,0.2)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}
              >
                {t('أضف', 'Add')}
              </button>
              {waterMl > 0 && (
                <button
                  onClick={handleClearWater}
                  className="px-3 py-2.5 rounded-xl text-xs text-white/30 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  {t('مسح', 'Clear')}
                </button>
              )}
            </div>
          </>
        )}

        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden mt-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min((waterMl / profile.targetWater) * 100, 100)}%`,
              background: waterMl >= profile.targetWater
                ? 'linear-gradient(90deg, #10b981, #059669)'
                : 'linear-gradient(90deg, #06b6d4, #3b82f6)',
              boxShadow: waterMl >= profile.targetWater
                ? '0 0 8px rgba(16,185,129,0.5)'
                : '0 0 8px rgba(6,182,212,0.5)',
            }}
          />
        </div>
        {waterMl > profile.targetWater && (
          <p className="text-xs mt-2 text-center font-medium" style={{ color: '#10b981' }}>
            +{((waterMl - profile.targetWater) / 1000).toFixed(2)}L {t('فوق الهدف', 'above goal')} 🎉
          </p>
        )}
      </GlassCard>

      {/* ── AI Coach ── */}
      <AICoachCard
        consumedCalories={Math.round(consumed)}
        targetCalories={profile.dailyCalories}
        proteinProgress={(protein / profile.targetProtein) * 100}
      />

      {/* يوم سابق بلا وجبات — توضيح أنه فارغ فعلاً (وليس معطّلاً) */}
      {!isToday && todayFoods.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Info size={26} color="rgba(255,255,255,0.2)" />
          <p className="text-sm text-white/40">{t('لا توجد وجبات مسجّلة في هذا اليوم', 'No meals logged on this day')}</p>
        </div>
      )}

      {/* ── Today's foods ── */}
      {todayFoods.length > 0 && (
        <GlassCard glow="none" className="p-5" animate={false}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-white text-base">{t("وجبات اليوم", "Today's Meals")}</h2>
            <span className="text-xs text-white/35">{todayFoods.length} {t('وجبة', 'items')}</span>
          </div>
          <div className="space-y-1">
            {todayFoods.map(food => (
              <div key={food.id}
                className="flex items-center gap-3 py-2.5 px-1 rounded-xl"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{food.name}</p>
                  <p className="text-xs text-white/40">{food.quantity}{t('جم', 'g')} · {t('بروتين', 'P')}: {Math.round(food.nutrition.protein)}{t('جم', 'g')}</p>
                </div>
                <p className="text-sm font-bold text-pink-400 flex-shrink-0">
                  {Math.round(food.nutrition.calories)} <span className="text-xs font-normal text-white/30">{t('سعرة', 'kcal')}</span>
                </p>
                <button
                  onClick={() => savedMeals.toggle(food)}
                  aria-label={t('حفظ في المفضلة', 'Save to favorites')}
                  className="p-1.5 rounded-lg flex-shrink-0 active:scale-90 transition-transform"
                  style={{ background: savedMeals.isSaved(food) ? 'rgba(245,158,11,0.16)' : 'rgba(255,255,255,0.05)' }}>
                  <Star size={14} color={savedMeals.isSaved(food) ? '#f59e0b' : 'rgba(255,255,255,0.4)'}
                        fill={savedMeals.isSaved(food) ? '#f59e0b' : 'none'} />
                </button>
                {isToday && (
                  <>
                    <button
                      onClick={() => setEditingFood(food)}
                      aria-label={t('تعديل', 'Edit')}
                      className="p-1.5 rounded-lg flex-shrink-0 active:scale-90 transition-transform"
                      style={{ background: 'rgba(0,212,255,0.08)' }}>
                      <Pencil size={14} color="rgba(0,212,255,0.6)" />
                    </button>
                    <button
                      onClick={() => handleDeleteFood(food.id)}
                      aria-label={t('حذف', 'Delete')}
                      className="p-1.5 rounded-lg flex-shrink-0 active:scale-90 transition-transform"
                      style={{ background: 'rgba(239,68,68,0.08)' }}>
                      <Trash2 size={14} color="rgba(239,68,68,0.55)" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* FAB — اليوم الحالي فقط */}
      {isToday && (
        <button
          onClick={() => setShowFoodModal(true)}
          data-tour="add"
          className="fixed bottom-24 left-5 z-40 fab-button flex items-center justify-center"
          aria-label="إضافة طعام"
        >
          <Plus size={28} color="white" strokeWidth={2.5} />
        </button>
      )}

      {showFoodModal && (
        <FoodEntryModal onSave={handleAddFood} onClose={() => setShowFoodModal(false)} />
      )}

      {/* ── الجولة التعريفية ── */}
      {showTour && (
        <TourOverlay
          lang={(lang as 'ar' | 'en')}
          onClose={() => { setShowTour(false); try { localStorage.setItem('dietak-tour-done', '1') } catch {} }}
          steps={[
            { selector: '[data-tour="level"]',  title: t('المستوى والجوائز', 'Level & Rewards'), body: t('اضغط هنا لترى مستواك وتستلم الهدايا كل ما ترتقي.', 'Tap here to see your level and claim rewards as you climb.') },
            { selector: '[data-tour="inbox"]',  title: t('صندوق الوارد', 'Inbox'),               body: t('ردود الدعم وإعلاناتنا (خصومات وأخبار) تجيك هنا.', 'Support replies and our announcements arrive here.') },
            { selector: '[data-tour="search"]', title: t('أضف وجباتك', 'Add your meals'),        body: t('ابحث عن أي طعام أو احسب سعراته بالذكاء الاصطناعي بكتابة الوصف.', 'Search any food or calculate its calories with AI.') },
            { selector: '[data-tour="add"]',    title: t('إضافة سريعة', 'Quick add'),            body: t('زر (+) لإضافة وجبة يدوياً أو بمسح باركود في أي وقت.', 'The + button adds a meal manually or by barcode anytime.') },
            { selector: '[data-tour="scan"]',   title: t('صوّر وجبتك', 'Snap your meal'),        body: t('صوّر وجبتك ويحللها الذكاء الاصطناعي تلقائياً.', 'Photograph your meal and AI analyzes it automatically.') },
            { selector: '[data-tour="nav"]',    title: t('التنقّل', 'Navigation'),               body: t('من هنا: الرئيسية، وجباتي، التصوير، الرياضة، وخطتي.', 'From here: Home, Meals, Scan, Workout, and My Plan.') },
          ] as TourStep[]}
        />
      )}

      {/* ── Edit an already-added meal ── */}
      {editingFood && (
        <FoodEntryModal
          title={t('تعديل الوجبة', 'Edit Meal')}
          saveLabel={t('تحديث', 'Update')}
          initialName={editingFood.name}
          initialQuantity={editingFood.quantity}
          initialMealType={editingFood.mealType}
          initialNutrition={editingFood.nutrition}
          onSave={handleEditFood}
          onClose={() => setEditingFood(null)}
        />
      )}

      {/* ── Level-Up Toast ── */}
      {levelUpInfo && (
        <div
          className="fixed bottom-28 left-4 right-4 z-50 max-w-lg mx-auto animate-slide-up"
          style={{
            background:   `linear-gradient(135deg, ${levelUpInfo.color}f0, ${levelUpInfo.color}b0)`,
            borderRadius: '20px',
            padding:      '14px 18px',
            boxShadow:    `0 8px 40px ${levelUpInfo.color}55, 0 2px 12px rgba(0,0,0,0.4)`,
            border:       `1px solid ${levelUpInfo.color}70`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="text-4xl animate-bounce flex-shrink-0">{levelUpInfo.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white text-sm leading-none mb-0.5">
                🎉 {lang === 'en' ? 'Level Up!' : 'مستوى جديد!'}
              </p>
              <p className="font-black text-white text-xl leading-none">
                {lang === 'en' ? levelUpInfo.nameEn : levelUpInfo.name}
              </p>
              <p className="text-white/80 text-xs mt-1 leading-snug">
                🎁 {lang === 'en' ? levelUpInfo.rewardEn : levelUpInfo.rewardAr}
              </p>
            </div>
            <button
              onClick={() => setLevelUpInfo(null)}
              className="p-1.5 rounded-xl flex-shrink-0 active:scale-90 transition-transform"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              <X size={16} color="white" />
            </button>
          </div>
        </div>
      )}

      {/* ── Side Drawer Backdrop ── */}
      <div
        className="fixed inset-0 z-40 transition-all duration-300"
        onClick={() => setShowDrawer(false)}
        style={{
          background:    'rgba(0,0,0,0.55)',
          backdropFilter: showDrawer ? 'blur(4px)' : 'none',
          opacity:        showDrawer ? 1 : 0,
          pointerEvents:  showDrawer ? 'all' : 'none',
        }}
      />

      {/* ── Side Drawer Panel ── */}
      <aside
        className="fixed top-0 left-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out"
        style={{
          width:       '272px',
          transform:   showDrawer ? 'translateX(0)' : 'translateX(-100%)',
          background:  isLight ? '#ffffff' : 'linear-gradient(160deg, #111128 0%, #0a0016 100%)',
          borderRight: isLight ? '1px solid rgba(0,0,0,0.09)' : '1px solid rgba(151,227,37,0.15)',
          boxShadow:   isLight ? '12px 0 40px rgba(0,0,0,0.12)' : '12px 0 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-14 pb-4">
          <span className="text-base font-black text-gradient-galaxy tracking-wide">
            دايتك Dietak
          </span>
          <button
            onClick={() => setShowDrawer(false)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }}
          >
            <X size={16} color={isLight ? 'rgba(20,20,40,0.55)' : 'rgba(255,255,255,0.6)'} />
          </button>
        </div>

        {/* ── Profile Card ── */}
        <div className="px-4 pb-4">
          <button
            onClick={() => { router.push('/settings'); setShowDrawer(false) }}
            className="w-full text-start p-4 rounded-2xl transition-all active:scale-[0.98]"
            style={{ background: isLight
              ? 'linear-gradient(135deg, rgba(151,227,37,0.1), rgba(0,212,255,0.07))'
              : 'linear-gradient(135deg, rgba(151,227,37,0.1), rgba(0,212,255,0.07))',
              border: isLight ? '1px solid rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #97E325, #00D4FF)' }}
              >
                {profile.gender === 'female' ? '👩' : '👨'}
              </div>
              <div className="min-w-0">
                <p className="font-black truncate"
                  style={{ color: isLight ? '#0f0f1e' : '#ffffff' }}>
                  {profile.name}
                </p>
                <p className="text-xs"
                  style={{ color: isLight ? 'rgba(15,15,35,0.45)' : 'rgba(255,255,255,0.45)' }}>
                  {profile.age} {t('سنة', 'yr')} · {profile.weight}{t('كغ', 'kg')} · {profile.height}{t('سم', 'cm')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: t('الهدف','Goal'),  val: `${profile.dailyCalories.toLocaleString()}`, sub: t('سعرة','cal'), color: '#97E325' },
                { label: t('الماء','Water'), val: `${(waterMl/1000).toFixed(1)}`,              sub: 'L',            color: '#06b6d4' },
                { label: 'BMI',              val: `${bmi.value}`,                              sub: '',             color: bmi.color },
              ].map(s => (
                <div key={s.label} className="flex flex-col p-2 rounded-xl"
                  style={{ background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)' }}>
                  <span className="text-[10px] mb-0.5"
                    style={{ color: isLight ? 'rgba(15,15,35,0.4)' : 'rgba(255,255,255,0.4)' }}>
                    {s.label}
                  </span>
                  <span className="text-xs font-bold" style={{ color: s.color }}>
                    {s.val}
                    {s.sub && (
                      <span className="text-[9px] font-normal"
                        style={{ color: isLight ? 'rgba(15,15,35,0.35)' : 'rgba(255,255,255,0.35)' }}>
                        {' '}{s.sub}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 mb-2"
          style={{ height: '1px', background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)' }} />

        {/* ── Settings ── */}
        <div className="flex flex-col px-3 flex-1 overflow-y-auto pb-2">
          <p className="text-[10px] uppercase tracking-widest px-3 pt-3 pb-2"
            style={{ color: isLight ? 'rgba(15,15,35,0.3)' : 'rgba(255,255,255,0.28)' }}>
            {t('الإعدادات', 'Settings')}
          </p>

          {/* Notifications — web only (Web Notifications API doesn't work in the iOS WebView) */}
          {!isNativeApp && (
            <button onClick={handleNotificationsToggle}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all">
              <Bell size={17} color="rgba(151,227,37,0.7)" className="flex-shrink-0" />
              <span className="text-sm flex-1 text-start"
                style={{ color: isLight ? 'rgba(15,15,35,0.82)' : 'rgba(255,255,255,0.82)' }}>
                {t('الإشعارات', 'Notifications')}
              </span>
              <div className={`toggle-track ${profile.notifications ? 'toggle-on' : ''}`}
                style={{ background: profile.notifications ? 'rgba(151,227,37,0.85)' : isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)' }}>
                <div className="toggle-thumb" />
              </div>
            </button>
          )}

          {/* Theme */}
          <button onClick={handleThemeToggle}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all">
            {isLight
              ? <Sun  size={17} color="rgba(245,158,11,0.9)" className="flex-shrink-0" />
              : <Moon size={17} color="rgba(151,227,37,0.7)" className="flex-shrink-0" />}
            <span className="text-sm flex-1 text-start"
              style={{ color: isLight ? 'rgba(15,15,35,0.82)' : 'rgba(255,255,255,0.82)' }}>
              {isLight ? t('الوضع الفاتح', 'Light Mode') : t('الوضع الداكن', 'Dark Mode')}
            </span>
            <div className={`toggle-track ${isLight ? 'toggle-on' : ''}`}
              style={{ background: isLight ? 'rgba(245,158,11,0.85)' : 'rgba(255,255,255,0.15)' }}>
              <div className="toggle-thumb" />
            </div>
          </button>

          {/* Language */}
          <button onClick={handleLanguageToggle}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all">
            <Languages size={17} color="rgba(0,212,255,0.8)" className="flex-shrink-0" />
            <span className="text-sm flex-1 text-start"
              style={{ color: isLight ? 'rgba(15,15,35,0.82)' : 'rgba(255,255,255,0.82)' }}>
              {(profile.language ?? 'ar') === 'ar' ? '🇦🇪 العربية' : '🇺🇸 English'}
            </span>
            <div className={`toggle-track ${(profile.language ?? 'ar') === 'en' ? 'toggle-on' : ''}`}
              style={{ background: (profile.language ?? 'ar') === 'en' ? 'rgba(0,212,255,0.85)' : isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)' }}>
              <div className="toggle-thumb" />
            </div>
          </button>

          {/* About */}
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all">
            <Info size={17} color="rgba(151,227,37,0.55)" className="flex-shrink-0" />
            <span className="text-sm flex-1 text-start"
              style={{ color: isLight ? 'rgba(15,15,35,0.65)' : 'rgba(255,255,255,0.65)' }}>
              {t('حول التطبيق', 'About')}
            </span>
            <span style={{ fontSize: '11px', color: isLight ? 'rgba(15,15,35,0.28)' : 'rgba(255,255,255,0.28)' }}>
              v1.0.0
            </span>
          </button>

          {/* Full profile */}
          <div className="mt-2">
            <button
              onClick={() => { router.push('/settings'); setShowDrawer(false) }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-[0.97]"
              style={{ background: 'rgba(151,227,37,0.09)', border: '1px solid rgba(151,227,37,0.2)' }}>
              <User size={17} color="rgba(151,227,37,0.8)" className="flex-shrink-0" />
              <span className="text-sm font-semibold flex-1 text-start"
                style={{ color: 'rgba(151,227,37,0.9)' }}>
                {t('الإعدادات', 'Settings')}
              </span>
              <span style={{ color: 'rgba(151,227,37,0.45)', fontSize: '16px' }}>›</span>
            </button>
          </div>

          {/* ── Subscription / Dietak Pro ── (Apple Pay when in the iOS app) */}
          <div className="mt-2">
            <button
              onClick={() => { router.push('/settings#pro'); setShowDrawer(false) }}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl transition-all active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(251,191,36,0.08))',
                border: '1px solid rgba(245,158,11,0.4)',
              }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(251,191,36,0.18))' }}>
                <Star size={16} color="#f59e0b" fill="#f59e0b" />
              </div>
              <span className="flex-1 text-start">
                <span className="block text-sm font-black" style={{ color: '#f59e0b' }}>
                  {t('اشترك في Dietak Pro', 'Subscribe to Dietak Pro')}
                </span>
                <span className="block text-[11px]" style={{ color: 'rgba(245,158,11,0.6)' }}>
                  {t('مزايا كاملة بلا حدود', 'Unlock everything')}
                </span>
              </span>
              <span style={{ color: 'rgba(245,158,11,0.5)', fontSize: '16px' }}>›</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center pb-10"
          style={{ fontSize: '11px', color: isLight ? 'rgba(15,15,35,0.2)' : 'rgba(255,255,255,0.18)' }}>
          Dietak دايتك v1.0 ✨
        </p>
      </aside>
    </div>
  )
}
