'use client'

import { useEffect } from 'react'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE } from '@/lib/store'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', profile.theme ?? 'dark')
  }, [profile.theme])

  useEffect(() => {
    const lang = profile.language ?? 'ar'
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', lang === 'en' ? 'ltr' : 'rtl')
  }, [profile.language])

  return <>{children}</>
}
