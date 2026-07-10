'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isProUser, trialDaysLeft, hasPremiumAccess } from '@/lib/limits'

/** عدد رسائل الوارد غير المقروءة (رسائل الأدمن/البث بعد آخر فتح للصندوق) */
export function useInboxUnread(): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let seen = 0
    try { seen = new Date(localStorage.getItem('dietak-inbox-seen') || 0).getTime() } catch {}
    fetch('/api/inbox')
      .then(r => r.ok ? r.json() : { messages: [] })
      .then(d => {
        const n = (d.messages ?? []).filter((m: { created_at: string }) => new Date(m.created_at).getTime() > seen).length
        setCount(n)
      })
      .catch(() => {})
  }, [])
  return count
}

/** بريد المستخدم الحالي (لفحص حالة الاشتراك/المشرف) — null قبل التحميل أو بلا جلسة */
export function useUserEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null)
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null)).catch(() => {})
  }, [])
  return email
}

/**
 * حالة الاشتراك/التجربة للمستخدم الحالي.
 * allowed = مسموح بالميزات المدفوعة (Pro/مشرف أو ضمن تجربة اليومين).
 */
export function useEntitlement() {
  const [s, setS] = useState<{ loading: boolean; email: string | null; createdAt: string | null }>({
    loading: true, email: null, createdAt: null,
  })
  useEffect(() => {
    createClient().auth.getUser()
      .then(({ data }) => setS({ loading: false, email: data.user?.email ?? null, createdAt: data.user?.created_at ?? null }))
      .catch(() => setS(prev => ({ ...prev, loading: false })))
  }, [])
  return {
    loading: s.loading,
    email: s.email,
    isPro: isProUser(s.email),
    daysLeft: trialDaysLeft(s.createdAt),
    allowed: hasPremiumAccess(s.email, s.createdAt),
  }
}

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(defaultValue)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored !== null) setValue(JSON.parse(stored))
    } catch {}
    setHydrated(true)
  }, [key])

  const set = useCallback(
    (newVal: T | ((prev: T) => T)) => {
      setValue(prev => {
        const next =
          typeof newVal === 'function' ? (newVal as (p: T) => T)(prev) : newVal
        try {
          window.localStorage.setItem(key, JSON.stringify(next))
        } catch {}
        return next
      })
    },
    [key]
  )

  return [value, set, hydrated]
}

export interface StoredProfile {
  name: string
  age: number
  height: number
  weight: number
  targetWeight: number
  gender: 'male' | 'female'
  activityLevel: string
  goal: string
  dailyCalories: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
  targetWater: number
  diet: string
  completedOnboarding: boolean
  theme: 'dark' | 'light'
  notifications: boolean
  language: 'ar' | 'en'
  // ── Gamification ──────────────────────────────────────────────────
  xpLocked?:  number   // XP من أيام سابقة — دائم لا يُمحى
  xpPending?: number   // XP اليوم الحالي — مؤقت قابل للخصم
  xpDate?:    string   // YYYY-MM-DD — تاريخ آخر تحديث لـ xpPending
}

export const DEFAULT_PROFILE: StoredProfile = {
  name: '',
  age: 25,
  height: 170,
  weight: 70,
  targetWeight: 65,
  gender: 'male',
  activityLevel: 'moderate',
  goal: 'maintain',
  dailyCalories: 2000,
  targetProtein: 130,
  targetCarbs: 250,
  targetFat: 65,
  targetWater: 2500,
  diet: 'balanced',
  completedOnboarding: false,
  theme: 'dark',
  notifications: false,
  language: 'ar',
  xpLocked:  0,
  xpPending: 0,
  xpDate:    '',
}

/** Returns t(ar, en) — picks based on the stored language preference. */
export function useT() {
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const lang = profile.language ?? 'ar'
  return (ar: string, en: string) => lang === 'en' ? en : ar
}

/** Returns the current UI language: 'ar' or 'en'. */
export function useLang(): 'ar' | 'en' {
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  return (profile.language ?? 'ar') as 'ar' | 'en'
}

/**
 * True when the site is running inside the native iOS/Android Capacitor shell.
 * Used to hide features that violate App Store rules (external payments,
 * web notifications) in the native app while keeping them on the web.
 */
export function useIsNativeApp(): boolean {
  const [isNative, setIsNative] = useState(false)
  useEffect(() => {
    const w = window as any
    const capacitor = !!(w.Capacitor?.isNativePlatform?.() ?? w.Capacitor)
    const uaNative  = /DietakApp|GalaxyNutritionApp/i.test(navigator.userAgent)
    setIsNative(capacitor || uaNative)
  }, [])
  return isNative
}
