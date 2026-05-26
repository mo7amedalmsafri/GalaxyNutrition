'use client'
import { useState, useEffect, useCallback } from 'react'

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
