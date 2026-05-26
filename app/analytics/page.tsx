'use client'

import { useState, useEffect } from 'react'
import GlassCard from '@/components/GlassCard'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT } from '@/lib/store'
import { FoodItem } from '@/lib/types'

interface DayData {
  date: string
  short: string
  calories: number
  protein: number
  carbs: number
  fat: number
  water: number
  hasData: boolean
}

const AR_SHORT = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب']
const EN_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getLast7Days(lang: string): { date: string; short: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const date = d.toISOString().split('T')[0]
    const isEn = lang === 'en'
    const short = i === 6
      ? (isEn ? 'Today' : 'اليوم')
      : i === 5
      ? (isEn ? 'Yest' : 'أمس')
      : (isEn ? EN_SHORT[d.getDay()] : AR_SHORT[d.getDay()])
    return { date, short }
  })
}

function readDayFoods(date: string): FoodItem[] {
  try {
    const raw = localStorage.getItem(`galaxy-foods-${date}`)
    if (!raw) return []
    return JSON.parse(raw) as FoodItem[]
  } catch {
    return []
  }
}

function readDayWater(date: string): number {
  try {
    const raw = localStorage.getItem(`galaxy-water-${date}`)
    return raw ? (parseInt(raw) || 0) : 0
  } catch {
    return 0
  }
}

type Tab = 'calories' | 'macros'

export default function AnalyticsPage() {
  const t = useT()
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const lang = profile.language ?? 'ar'
  const [weekData, setWeekData] = useState<DayData[]>([])
  const [tab, setTab] = useState<Tab>('calories')

  useEffect(() => {
    const days = getLast7Days(lang)
    setWeekData(
      days.map(({ date, short }) => {
        const foods = readDayFoods(date)
        const water = readDayWater(date)
        if (!foods.length && water === 0) {
          return { date, short, calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, hasData: false }
        }
        return {
          date,
          short,
          calories: Math.round(foods.reduce((s, f) => s + f.nutrition.calories, 0)),
          protein: Math.round(foods.reduce((s, f) => s + f.nutrition.protein, 0)),
          carbs: Math.round(foods.reduce((s, f) => s + f.nutrition.carbs, 0)),
          fat: Math.round(foods.reduce((s, f) => s + f.nutrition.fat, 0)),
          water,
          hasData: true,
        }
      })
    )
  }, [lang])

  const logged = weekData.filter(d => d.hasData)
  const avgCal = logged.length
    ? Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length)
    : 0

  const weeklyProtein = logged.reduce((s, d) => s + d.protein, 0)
  const weeklyCarbs   = logged.reduce((s, d) => s + d.carbs, 0)
  const weeklyFat     = logged.reduce((s, d) => s + d.fat, 0)

  const waterDays = weekData.filter(d => d.water > 0)
  const avgWater = waterDays.length
    ? Math.round(waterDays.reduce((s, d) => s + d.water, 0) / waterDays.length)
    : 0
  const maxWater = Math.max(...weekData.map(d => d.water), profile.targetWater, 1)

  // Composite adherence — each metric: actual_total / (logged_days × daily_target)
  const weekScore = (total: number, dailyTarget: number) =>
    dailyTarget > 0 && logged.length > 0
      ? Math.min(Math.round((total / (dailyTarget * logged.length)) * 100), 100)
      : 0
  const weeklyCalories = logged.reduce((s, d) => s + d.calories, 0)
  const calorieScore  = weekScore(weeklyCalories, profile.dailyCalories)
  const proteinScore  = weekScore(weeklyProtein,  profile.targetProtein)
  const carbsScore    = weekScore(weeklyCarbs,    profile.targetCarbs)
  const fatScore      = weekScore(weeklyFat,      profile.targetFat)
  const adherence = logged.length
    ? Math.round((calorieScore + proteinScore + carbsScore + fatScore) / 4)
    : 0

  const maxCal = Math.max(...weekData.map(d => d.calories), profile.dailyCalories * 1.05, 1)

  return (
    <div className="flex flex-col px-4 pt-6 gap-5">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-black text-white">
          <span className="text-gradient-galaxy">{t('تحليلات', 'Weekly')}</span> {t('الأسبوع', 'Analytics')}
        </h1>
        <p className="text-white/40 text-sm mt-1">{t('آخر 7 أيام · تُحسب من سجلاتك الفعلية', 'Last 7 days · calculated from your actual logs')}</p>
      </div>

      {/* Empty state */}
      {logged.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 animate-fade-in">
          <span className="text-6xl">📊</span>
          <div className="text-center">
            <p className="text-white font-bold mb-1">{t('لا توجد بيانات بعد', 'No data yet')}</p>
            <p className="text-white/40 text-sm leading-relaxed">
              {t('سجّل وجباتك من صفحة السجل أو التصوير', 'Log your meals from the Log or Scan page')}<br />
              {t('وستظهر تحليلاتك هنا تلقائياً', 'and your analytics will appear here automatically')}
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard glow="gold" className="p-4 text-center" animate={false}>
          <p className="text-2xl font-black" style={{ color: '#f59e0b' }}>
            {avgCal > 0 ? avgCal.toLocaleString('ar') : '—'}
          </p>
          <p className="text-xs text-white/40 mt-1">{t('متوسط السعرات', 'Avg Calories')}</p>
        </GlassCard>
        <GlassCard glow="none" className="p-4 text-center" animate={false}>
          <p className="text-2xl font-black" style={{ color: '#10b981' }}>
            {logged.length}
          </p>
          <p className="text-xs text-white/40 mt-1">{t('أيام مسجّلة', 'Logged Days')}</p>
        </GlassCard>
        <GlassCard glow="purple" className="p-4 text-center" animate={false}>
          <p className="text-2xl font-black" style={{ color: '#97E325' }}>
            {logged.length > 0 ? `${adherence}%` : '—'}
          </p>
          <p className="text-xs text-white/40 mt-1">{t('الالتزام', 'Adherence')}</p>
        </GlassCard>
      </div>

      {/* Tab selector */}
      <div className="flex rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {(['calories', 'macros'] as Tab[]).map(tabId => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300"
            style={{
              background:
                tab === tabId ? 'linear-gradient(135deg, #97E325, #00D4FF)' : 'transparent',
              color: tab === tabId ? 'white' : 'rgba(255,255,255,0.4)',
            }}
          >
            {tabId === 'calories' ? t('سعرات', 'Calories') : t('مغذيات', 'Macros')}
          </button>
        ))}
      </div>

      {/* ── Calories chart ── */}
      {tab === 'calories' && (
        <GlassCard glow="purple" className="p-5" animate={false}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-white">{t('السعرات اليومية', 'Daily Calories')}</h3>
            {avgCal > 0 && (
              <span className="text-xs text-white/40">{t('متوسط', 'Avg')} {avgCal.toLocaleString()} {t('كال', 'kcal')}</span>
            )}
          </div>

          {/* Bars */}
          <div className="flex items-end gap-2" style={{ height: 140 }}>
            {weekData.map((d, i) => {
              const pct = d.calories / maxCal
              const isToday = i === 6
              const isOver = d.calories > profile.dailyCalories
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end" style={{ height: 112 }}>
                    <div
                      className="w-full rounded-t-lg relative"
                      style={{
                        height: d.hasData ? `${Math.max(pct * 100, 3)}%` : '3%',
                        background: d.hasData
                          ? isToday
                            ? 'linear-gradient(180deg, #FF5F1F, #97E325)'
                            : isOver
                            ? 'linear-gradient(180deg, #ef4444, #7f1d1d)'
                            : 'linear-gradient(180deg, #06b6d4, #1e40af)'
                          : 'rgba(255,255,255,0.06)',
                        boxShadow: isToday && d.hasData ? '0 0 14px rgba(255,95,31,0.55)' : 'none',
                        transition: 'height 0.8s cubic-bezier(0.4,0,0.2,1)',
                      }}
                    >
                      {d.hasData && d.calories > 0 && (
                        <span
                          className="absolute -top-5 left-0 right-0 text-center"
                          style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)' }}
                        >
                          {d.calories >= 1000
                            ? `${(d.calories / 1000).toFixed(1)}k`
                            : d.calories}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className="text-center leading-none"
                    style={{
                      fontSize: 10,
                      color: isToday ? '#97E325' : 'rgba(255,255,255,0.3)',
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    {d.short}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Target dashed line legend */}
          <div className="flex items-center gap-2 mt-3 text-xs text-white/40">
            <div className="w-5 border-t border-dashed" style={{ borderColor: '#f59e0b' }} />
            <span>{t('الهدف', 'Goal')}: {profile.dailyCalories.toLocaleString()} {t('سعرة', 'kcal')}</span>
          </div>
        </GlassCard>
      )}

      {/* ── Macros ── */}
      {tab === 'macros' && (
        <div className="flex flex-col gap-4">
          {(
            [
              { label: t('البروتين', 'Protein'),      total: weeklyProtein, target: profile.targetProtein, color: '#06b6d4', icon: '💪', key: 'protein' as const },
              { label: t('الكربوهيدرات', 'Carbs'),   total: weeklyCarbs,   target: profile.targetCarbs,   color: '#f59e0b', icon: '🌾', key: 'carbs'   as const },
              { label: t('الدهون', 'Fat'),            total: weeklyFat,     target: profile.targetFat,     color: '#FF5F1F', icon: '🥑', key: 'fat'     as const },
            ]
          ).map(macro => {
            const weeklyTarget = macro.target * logged.length
            const pct = weeklyTarget > 0 ? Math.min(Math.round((macro.total / weeklyTarget) * 100), 100) : 0
            return (
              <GlassCard key={macro.key} glow="none" className="p-4" animate={false}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl">{macro.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1.5">
                      <div>
                        <span className="font-bold text-sm text-white">{macro.label}</span>
                        <span className="text-xs text-white/30 mr-1">· {t('أسبوعياً', 'weekly')}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: macro.color }}>
                        {macro.total > 0 ? `${macro.total}${t('جم', 'g')}` : '—'}
                      </span>
                    </div>
                    <div
                      className="h-2.5 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.08)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: `linear-gradient(90deg, ${macro.color}88, ${macro.color})`,
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full"
                    style={{ background: `${macro.color}18`, color: macro.color }}
                  >
                    {pct}%
                  </span>
                </div>

                {/* Mini daily bars */}
                <div className="flex gap-1">
                  {weekData.map((d, i) => {
                    const val = d[macro.key as 'protein' | 'carbs' | 'fat']
                    const barH =
                      macro.target > 0 && d.hasData
                        ? Math.min((val / (macro.target * 1.3)) * 100, 100)
                        : 0
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-sm overflow-hidden"
                          style={{ height: 22, background: 'rgba(255,255,255,0.05)' }}
                        >
                          {d.hasData && (
                            <div
                              style={{
                                height: `${Math.max(barH, 4)}%`,
                                marginTop: `${100 - Math.max(barH, 4)}%`,
                                background: macro.color + '75',
                                borderRadius: 2,
                              }}
                            />
                          )}
                        </div>
                        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>
                          {d.short.slice(0, 2)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            )
          })}

          {/* Adherence */}
          <GlassCard glow="none" className="p-4" animate={false}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white text-sm">{t('الالتزام الإجمالي', 'Overall Adherence')}</span>
              <span
                className="text-xl font-black"
                style={{ color: logged.length === 0 ? '#6b7280' : adherence >= 70 ? '#10b981' : '#f59e0b' }}
              >
                {logged.length > 0 ? `${adherence}%` : '—'}
              </span>
            </div>
            <div
              className="h-3 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${adherence}%`,
                  background:
                    adherence >= 70
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : 'linear-gradient(90deg, #f59e0b, #d97706)',
                }}
              />
            </div>
            {logged.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
                {[
                  { label: t('السعرات', 'Calories'),       score: calorieScore, color: '#97E325' },
                  { label: t('البروتين', 'Protein'),      score: proteinScore, color: '#06b6d4' },
                  { label: t('الكربوهيدرات', 'Carbs'),   score: carbsScore,   color: '#f59e0b' },
                  { label: t('الدهون', 'Fat'),            score: fatScore,     color: '#FF5F1F' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-xs text-white/40 flex-1">{item.label}</span>
                    <span className="text-xs font-bold" style={{ color: item.color }}>{item.score}%</span>
                  </div>
                ))}
              </div>
            )}
            {logged.length === 0 && (
              <p className="text-white/40 text-xs mt-2">{t('لا توجد بيانات — سجّل وجباتك لتبدأ التحليلات', 'No data — log your meals to start analytics')}</p>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── Water ── */}
      <GlassCard glow="cyan" className="p-5" animate={false}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">💧</span>
            <h3 className="font-bold text-white">{t('الماء الأسبوعي', 'Weekly Water')}</h3>
          </div>
          {avgWater > 0 && (
            <span className="text-xs text-white/40">
              {t('متوسط', 'Avg')} {(avgWater / 1000).toFixed(1)}L
            </span>
          )}
        </div>

        {waterDays.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">{t('لا توجد سجلات ماء بعد', 'No water logs yet')}</p>
        ) : (
          <>
            <div className="flex items-end gap-2" style={{ height: 100 }}>
              {weekData.map((d, i) => {
                const pct = d.water / maxWater
                const isToday = i === 6
                const hitTarget = d.water >= profile.targetWater
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex items-end" style={{ height: 76 }}>
                      <div
                        className="w-full rounded-t-lg relative"
                        style={{
                          height: d.water > 0 ? `${Math.max(pct * 100, 4)}%` : '4%',
                          background: d.water > 0
                            ? hitTarget
                              ? 'linear-gradient(180deg, #10b981, #0891b2)'
                              : isToday
                              ? 'linear-gradient(180deg, #06b6d4, #1e40af)'
                              : 'linear-gradient(180deg, #0ea5e9, #1e3a5f)'
                            : 'rgba(255,255,255,0.06)',
                          boxShadow: isToday && d.water > 0 ? '0 0 12px rgba(6,182,212,0.5)' : 'none',
                          transition: 'height 0.8s cubic-bezier(0.4,0,0.2,1)',
                        }}
                      >
                        {d.water > 0 && (
                          <span
                            className="absolute -top-5 left-0 right-0 text-center"
                            style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)' }}
                          >
                            {(d.water / 1000).toFixed(1)}L
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10,
                      color: isToday ? '#06b6d4' : 'rgba(255,255,255,0.3)',
                      fontWeight: isToday ? 700 : 400,
                    }}>
                      {d.short}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-2 mt-3 text-xs text-white/40">
              <div className="w-5 border-t border-dashed" style={{ borderColor: '#06b6d4' }} />
              <span>{t('الهدف', 'Goal')}: {(profile.targetWater / 1000).toFixed(1)}L {t('يومياً', '/day')}</span>
              <span className="mr-auto text-white/30">
                {waterDays.filter(d => d.water >= profile.targetWater).length}/{waterDays.length} {t('أيام حققت الهدف', 'days hit goal')}
              </span>
            </div>
          </>
        )}
      </GlassCard>

    </div>
  )
}
