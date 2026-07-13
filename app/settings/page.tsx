'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Target, Bell, Moon, Sun, ChevronLeft, Info, Ruler,
  Calendar, Sparkles, Droplets, LogOut, Flame,
  Dumbbell, Wheat, Languages, Check, Weight,
  AtSign, MessageSquare, FileText, Shield, Inbox, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveProfileToSupabase } from '@/lib/db'
import { calculateBMI, calculateDailyCalories } from '@/lib/utils'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT, useIsNativeApp } from '@/lib/store'
import { isProUser, activatePro, deactivatePro, isAdmin, setProLocal } from '@/lib/limits'
import { purchasePro, restorePurchases, getProPrice, checkProEntitlement, purchasesAvailable } from '@/lib/purchases'

// ── Types ────────────────────────────────────────────────────────────
interface FieldProps {
  label: string
  icon: React.ElementType
  value: string | number
  onChange: (v: string) => void
  type?: string
  suffix?: string
}

// ── Editable row — stable identity prevents focus loss ──────────────
function ProfileField({ label, icon: Icon, value, onChange, type = 'text', suffix }: FieldProps) {
  const [localVal, setLocalVal] = useState(String(value))
  const lastExternal = useRef(String(value))

  useEffect(() => {
    const str = String(value)
    if (str !== lastExternal.current) {
      lastExternal.current = str
      setLocalVal(str)
    }
  }, [value])

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon size={18} color="rgba(151,227,37,0.7)" className="flex-shrink-0" />
      <span className="text-sm text-white/60 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <input
          type="text"
          inputMode={type === 'number' ? 'decimal' : 'text'}
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onBlur={() => onChange(localVal)}
          className="galaxy-input px-3 py-1.5 text-sm flex-1"
          dir="ltr"
        />
        {suffix && <span className="text-xs text-white/40 flex-shrink-0">{suffix}</span>}
      </div>
    </div>
  )
}

// ── Section container (table-style) ─────────────────────────────────
function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-white/35 font-semibold mb-2 px-1 uppercase tracking-widest">
        {title}
      </p>
      <div
        className="rounded-2xl overflow-hidden divide-y divide-white/5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {children}
      </div>
    </div>
  )
}

// ── Data ─────────────────────────────────────────────────────────────
const ACTIVITY_OPTIONS = [
  { value: 'sedentary', ar: 'خامل (لا رياضة)',        en: 'Sedentary (no exercise)'  },
  { value: 'light',     ar: 'خفيف (1–3 أيام/أسبوع)',  en: 'Light (1–3 days/week)'    },
  { value: 'moderate',  ar: 'معتدل (3–5 أيام/أسبوع)', en: 'Moderate (3–5 days/week)' },
  { value: 'active',    ar: 'نشيط (6–7 أيام/أسبوع)',  en: 'Active (6–7 days/week)'   },
  { value: 'veryActive',ar: 'خارق (رياضة مكثفة)',      en: 'Very Active (intense)'    },
]

const GOAL_OPTIONS = [
  { value: 'lose',     ar: 'إنقاص الوزن',      en: 'Lose Weight',     icon: '📉', color: '#06b6d4' },
  { value: 'maintain', ar: 'الحفاظ على الوزن', en: 'Maintain Weight', icon: '⚖️', color: '#10b981' },
  { value: 'gain',     ar: 'زيادة الوزن',      en: 'Gain Weight',     icon: '📈', color: '#f59e0b' },
]

// ── Page ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter()
  const t = useT()
  const isNativeApp = useIsNativeApp()
  const [storedProfile, setStoredProfile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const [local, setLocal] = useState<StoredProfile>(DEFAULT_PROFILE)
  const [saved, setSaved]                         = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmed, setDeleteConfirmed]     = useState(false)
  const [deleting, setDeleting]                   = useState(false)
  const [deleteError, setDeleteError]             = useState('')
  // Pro / subscription state
  const [userEmail, setUserEmail]       = useState<string | null>(null)
  const [proActive, setProActive]       = useState(false)
  const [proCode, setProCode]           = useState('')
  const [proError, setProError]         = useState('')
  const [proSuccess, setProSuccess]     = useState(false)
  const [stripeActive, setStripeActive] = useState(false)   // paid via Stripe
  const [subLoading, setSubLoading]     = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  // Apple IAP (تطبيق iOS)
  const [iapLoading, setIapLoading]     = useState(false)
  const [iapError, setIapError]         = useState('')
  const [iapPrice, setIapPrice]         = useState<string | null>(null)
  const [restoring, setRestoring]       = useState(false)

  // ── Pro / Subscription ──────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const email = data.user?.email ?? null
      setUserEmail(email)
      setProActive(isProUser(email))

      // Check Stripe subscription in DB
      if (data.user) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', data.user.id)
          .single()

        if (sub?.status === 'active') {
          setStripeActive(true)
          setProActive(true)
          localStorage.setItem('galaxy-pro-active', 'true')
        }
      }
    })
  }, [])

  // ── Apple IAP: مزامنة الاشتراك وجلب السعر (داخل تطبيق iOS فقط) ──
  useEffect(() => {
    if (!purchasesAvailable()) return
    getProPrice().then(p => { if (p) setIapPrice(p) })
    checkProEntitlement().then(active => {
      if (active) { setProLocal(true); setProActive(true) }
    })
  }, [])

  const handleNativeSubscribe = async () => {
    setIapLoading(true); setIapError('')
    const res = await purchasePro()
    if (res.ok) { setProLocal(true); setProActive(true) }
    else if (!res.cancelled) {
      // نعرض تفصيل الخطأ الفعلي لتشخيص المشكلة
      setIapError(`تعذّر الشراء: ${res.error || 'خطأ غير معروف'}`)
    }
    setIapLoading(false)
  }

  const handleRestore = async () => {
    setRestoring(true); setIapError('')
    const ok = await restorePurchases()
    if (ok) { setProLocal(true); setProActive(true) }
    else setIapError(t('لا يوجد اشتراك سابق لاستعادته', 'No previous subscription to restore'))
    setRestoring(false)
  }

  const handleUpgrade = async () => {
    setSubLoading(true)
    try {
      const res  = await fetch('/api/stripe/create-checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setProError(data.error || 'حدث خطأ')
    } catch {
      setProError('تعذّر الاتصال بخادم الدفع')
    }
    setSubLoading(false)
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const res  = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      /* silent */
    }
    setPortalLoading(false)
  }

  const handleActivatePro = () => {
    setProError('')
    if (activatePro(proCode)) {
      setProActive(true)
      setProSuccess(true)
      setProCode('')
      setTimeout(() => setProSuccess(false), 3000)
    } else {
      setProError(isEn ? 'Invalid activation code' : 'كود التفعيل غير صحيح')
    }
  }

  const handleDeactivatePro = () => {
    deactivatePro()
    setProActive(false)
  }

  // ── Auth actions ────────────────────────────────────────────────
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.rpc('delete_own_account')
      if (error) throw new Error(error.message)
      localStorage.clear()
      window.location.href = '/login'
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع')
      setDeleting(false)
    }
  }

  // ── Sync ────────────────────────────────────────────────────────
  useEffect(() => {
    setLocal(storedProfile)
  }, [storedProfile.name, storedProfile.theme, storedProfile.notifications, storedProfile.language])

  const set = (patch: Partial<StoredProfile>) => setLocal(p => ({ ...p, ...patch }))

  // ── Username ─────────────────────────────────────────────────────
  const [username, setUsername]       = useState('')          // المحفوظ
  const [usernameInput, setUsernameInput] = useState('')      // الحقل
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [usernameError, setUsernameError] = useState('')

  useEffect(() => {
    fetch('/api/username')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.username) { setUsername(d.username); setUsernameInput(d.username) } })
      .catch(() => {})
  }, [])

  const saveUsername = async () => {
    const val = usernameInput.trim().toLowerCase()
    if (usernameStatus === 'saving' || val === username) return
    setUsernameStatus('saving'); setUsernameError('')
    try {
      const res = await fetch('/api/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: val }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUsernameError(d.error || t('تعذّر الحفظ', 'Could not save'))
        setUsernameStatus('idle')
        return
      }
      setUsername(d.username); setUsernameInput(d.username)
      setUsernameStatus('saved')
      setTimeout(() => setUsernameStatus('idle'), 2000)
    } catch {
      setUsernameError(t('تعذّر الاتصال', 'Connection failed'))
      setUsernameStatus('idle')
    }
  }

  // ── Derived ─────────────────────────────────────────────────────
  const bmi      = calculateBMI(local.weight, local.height)
  const dailyCal = calculateDailyCalories(
    local.weight, local.height, local.age,
    local.gender as 'male' | 'female', local.activityLevel, local.goal
  )

  // ── Toggles ─────────────────────────────────────────────────────
  const handleThemeToggle = () => {
    const next = (local.theme ?? 'dark') === 'light' ? 'dark' : 'light'
    const updated = { ...local, theme: next as 'dark' | 'light' }
    setLocal(updated); setStoredProfile(updated)
    document.documentElement.setAttribute('data-theme', next)
  }

  const handleLanguageToggle = () => {
    const next = (local.language ?? 'ar') === 'ar' ? 'en' : 'ar'
    const updated = { ...local, language: next as 'ar' | 'en' }
    setLocal(updated); setStoredProfile(updated)
    document.documentElement.setAttribute('lang', next)
    document.documentElement.setAttribute('dir', next === 'en' ? 'ltr' : 'rtl')
    setTimeout(() => window.location.reload(), 150)
  }

  const handleNotificationsToggle = async () => {
    if (local.notifications) {
      const updated = { ...local, notifications: false }
      setLocal(updated); setStoredProfile(updated)
      return
    }
    if (!('Notification' in window)) {
      alert(local.language === 'en' ? "Your browser doesn't support notifications" : 'متصفحك لا يدعم الإشعارات')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      const updated = { ...local, notifications: true }
      setLocal(updated); setStoredProfile(updated)
      new Notification('Dietak دايتك 🚀', {
        body: local.language === 'en'
          ? 'Notifications enabled! We will remind you to log your meals daily.'
          : 'الإشعارات مفعّلة! سنذكّرك بتسجيل وجباتك يومياً.',
        icon: '/icon-192.png',
      })
    }
  }

  const handleSave = async () => {
    const updated = { ...local, completedOnboarding: true }
    setStoredProfile(updated)
    saveProfileToSupabase(updated) // fire-and-forget, no need to await
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const isEn = (local.language ?? 'ar') === 'en'

  return (
    <div className="flex flex-col px-4 pt-6 gap-5 pb-6" style={{ direction: isEn ? 'ltr' : 'rtl' }}>

      {/* ── Header ── */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-black text-white">
          {t('ملفي', 'My')} <span className="text-gradient-galaxy">{t('الشخصي', 'Profile')}</span>
        </h1>
        <p className="text-white/40 text-sm mt-0.5">
          {t('بياناتك وإعداداتك الشخصية', 'Your personal data & settings')}
        </p>
      </div>

      {/* ── Profile Card ── */}
      <div className="flex items-center gap-4 p-4 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(151,227,37,0.1), rgba(0,212,255,0.08))' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #97E325, #00D4FF)' }}>
          {local.gender === 'male' ? '👨' : '👩'}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-white text-lg truncate">{local.name}</h2>
          <p className="text-white/50 text-sm">
            {local.age} {t('سنة', 'yr')} · {local.height}{t('سم', 'cm')} · {local.weight}{t('كغ', 'kg')}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: `${bmi.color}22`, color: bmi.color }}>
              BMI {bmi.value}
            </span>
            <span className="text-xs text-white/40">{dailyCal} {t('سعرة/يوم', 'kcal/day')}</span>
            {proActive && (
              <span className="text-xs px-2 py-0.5 rounded-full font-black"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(251,191,36,0.15))', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }}>
                ⭐ Pro
              </span>
            )}
          </div>
        </div>
        <Sparkles size={20} color="rgba(245,158,11,0.7)" className="flex-shrink-0" />
      </div>

      {/* ── Personal Info ── */}
      <SettingsSection title={t('المعلومات الشخصية', 'Personal Info')}>
        <ProfileField label={t('الاسم', 'Name')} icon={User} value={local.name}
          onChange={v => set({ name: v })} />
        <ProfileField label={t('العمر', 'Age')} icon={Calendar} value={local.age} type="number"
          suffix={t('سنة', 'yr')} onChange={v => set({ age: parseInt(v) || local.age })} />
        <ProfileField label={t('الطول', 'Height')} icon={Ruler} value={local.height} type="number"
          suffix={t('سم', 'cm')} onChange={v => set({ height: parseInt(v) || local.height })} />
        <ProfileField label={t('الوزن', 'Weight')} icon={Weight} value={local.weight} type="number"
          suffix={t('كغ', 'kg')} onChange={v => set({ weight: parseFloat(v) || local.weight })} />
        <ProfileField label={t('هدف الوزن', 'Target Wt')} icon={Target} value={local.targetWeight} type="number"
          suffix={t('كغ', 'kg')} onChange={v => set({ targetWeight: parseFloat(v) || local.targetWeight })} />
        <ProfileField label={t('هدف الماء', 'Water Goal')} icon={Droplets} value={local.targetWater} type="number"
          suffix={t('مل', 'ml')} onChange={v => set({ targetWater: parseInt(v) || local.targetWater })} />

        {/* Gender */}
        <div className="flex items-center gap-3 px-4 py-3">
          <User size={18} color="rgba(151,227,37,0.7)" className="flex-shrink-0" />
          <span className="text-sm text-white/60 w-24 flex-shrink-0">{t('الجنس', 'Gender')}</span>
          <div className="flex gap-2 flex-1 justify-end">
            {[{ v: 'male', ar: '👨 ذكر', en: '👨 Male' }, { v: 'female', ar: '👩 أنثى', en: '👩 Female' }].map(g => (
              <button key={g.v} onClick={() => set({ gender: g.v as 'male' | 'female' })}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: local.gender === g.v ? 'rgba(151,227,37,0.15)' : 'rgba(255,255,255,0.05)',
                  color:      local.gender === g.v ? '#97E325'                : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${local.gender === g.v ? 'rgba(151,227,37,0.5)' : 'transparent'}`,
                }}>
                {t(g.ar, g.en)}
              </button>
            ))}
          </div>
        </div>
      </SettingsSection>

      {/* ── Main Goal ── */}
      <SettingsSection title={t('الهدف الرئيسي', 'Main Goal')}>
        {GOAL_OPTIONS.map(g => (
          <button key={g.value} onClick={() => set({ goal: g.value })}
            className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:bg-white/5">
            <span className="text-xl flex-shrink-0">{g.icon}</span>
            <span className="text-sm flex-1 text-start"
              style={{ color: local.goal === g.value ? g.color : 'rgba(255,255,255,0.6)' }}>
              {t(g.ar, g.en)}
            </span>
            {local.goal === g.value && <Check size={16} color={g.color} className="flex-shrink-0" />}
          </button>
        ))}
      </SettingsSection>

      {/* ── Activity Level ── */}
      <SettingsSection title={t('مستوى النشاط', 'Activity Level')}>
        {ACTIVITY_OPTIONS.map(a => (
          <button key={a.value} onClick={() => set({ activityLevel: a.value })}
            className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:bg-white/5">
            <div className="w-2 h-2 rounded-full flex-shrink-0 transition-all"
              style={{ background: local.activityLevel === a.value ? '#97E325' : 'rgba(255,255,255,0.2)' }} />
            <span className="text-sm flex-1 text-start"
              style={{ color: local.activityLevel === a.value ? '#e2e8f0' : 'rgba(255,255,255,0.5)' }}>
              {t(a.ar, a.en)}
            </span>
            {local.activityLevel === a.value && <Check size={16} color="#97E325" className="flex-shrink-0" />}
          </button>
        ))}
      </SettingsSection>

      {/* ── Macro Targets ── */}
      <SettingsSection title={t('أهداف المغذيات اليومية', 'Daily Macro Targets')}>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Target size={15} color="#00D4FF" className="flex-shrink-0" />
          <span className="text-xs text-white/50 flex-1">
            {t('المحسوب:', 'Calculated:')} {dailyCal} {t('سعرة/يوم', 'kcal/day')}
          </span>
          <button onClick={() => set({ dailyCalories: dailyCal })}
            className="text-xs px-3 py-1 rounded-lg font-semibold flex-shrink-0 transition-all active:scale-95"
            style={{ background: 'rgba(151,227,37,0.12)', color: '#97E325', border: '1px solid rgba(151,227,37,0.3)' }}>
            {t('تطبيق', 'Apply')}
          </button>
        </div>
        <ProfileField label={t('السعرات', 'Calories')} icon={Flame} value={local.dailyCalories} type="number"
          suffix={t('سعرة', 'kcal')} onChange={v => set({ dailyCalories: parseInt(v) || local.dailyCalories })} />
        <ProfileField label={t('بروتين', 'Protein')} icon={Dumbbell} value={local.targetProtein} type="number"
          suffix={t('غ', 'g')} onChange={v => set({ targetProtein: parseInt(v) || local.targetProtein })} />
        <ProfileField label={t('كربوهيدرات', 'Carbs')} icon={Wheat} value={local.targetCarbs} type="number"
          suffix={t('غ', 'g')} onChange={v => set({ targetCarbs: parseInt(v) || local.targetCarbs })} />
        <ProfileField label={t('دهون', 'Fat')} icon={Flame} value={local.targetFat} type="number"
          suffix={t('غ', 'g')} onChange={v => set({ targetFat: parseInt(v) || local.targetFat })} />
      </SettingsSection>

      {/* ── Save Button ── */}
      <button onClick={handleSave} className="btn-galaxy py-4 text-base w-full font-bold">
        {saved ? t('✅ تم الحفظ بنجاح!', '✅ Saved!') : t('حفظ التغييرات', 'Save Changes')}
      </button>

      {/* ── Preferences ── */}
      <SettingsSection title={t('التفضيلات', 'Preferences')}>
        {/* Notifications — web only (Web Notifications API doesn't work in the iOS WebView) */}
        {!isNativeApp && (
          <button onClick={handleNotificationsToggle}
            className="w-full flex items-center gap-3 px-4 py-3.5 transition-all">
            <Bell size={18} color="rgba(151,227,37,0.6)" className="flex-shrink-0" />
            <span className="text-sm text-white/70 flex-1">{t('الإشعارات', 'Notifications')}</span>
            <div className={`toggle-track ${local.notifications ? 'toggle-on' : ''}`}
              style={{ background: local.notifications ? 'rgba(151,227,37,0.85)' : 'rgba(255,255,255,0.12)' }}>
              <div className="toggle-thumb" />
            </div>
          </button>
        )}

        {/* Theme */}
        <button onClick={handleThemeToggle}
          className="w-full flex items-center gap-3 px-4 py-3.5 transition-all">
          {local.theme === 'light'
            ? <Sun  size={18} color="rgba(245,158,11,0.8)" className="flex-shrink-0" />
            : <Moon size={18} color="rgba(151,227,37,0.6)" className="flex-shrink-0" />}
          <span className="text-sm text-white/70 flex-1">
            {local.theme === 'light' ? t('الوضع الفاتح', 'Light Mode') : t('الوضع الداكن', 'Dark Mode')}
          </span>
          <div className={`toggle-track ${local.theme === 'light' ? 'toggle-on' : ''}`}
            style={{ background: local.theme === 'light' ? 'rgba(245,158,11,0.85)' : 'rgba(255,255,255,0.12)' }}>
            <div className="toggle-thumb" />
          </div>
        </button>

        {/* Language */}
        <button onClick={handleLanguageToggle}
          className="w-full flex items-center gap-3 px-4 py-3.5 transition-all">
          <Languages size={18} color="rgba(0,212,255,0.7)" className="flex-shrink-0" />
          <span className="text-sm text-white/70 flex-1">
            {(local.language ?? 'ar') === 'ar' ? '🇦🇪 العربية' : '🇺🇸 English'}
          </span>
          <div className={`toggle-track ${(local.language ?? 'ar') === 'en' ? 'toggle-on' : ''}`}
            style={{ background: (local.language ?? 'ar') === 'en' ? 'rgba(0,212,255,0.85)' : 'rgba(255,255,255,0.12)' }}>
            <div className="toggle-thumb" />
          </div>
        </button>

        {/* About */}
        <button className="w-full flex items-center gap-3 px-4 py-3.5 transition-all">
          <Info size={18} color="rgba(151,227,37,0.6)" className="flex-shrink-0" />
          <span className="text-sm text-white/70 flex-1">{t('حول التطبيق', 'About')}</span>
          <span className="text-xs text-white/30 flex-shrink-0">v1.0.0</span>
          <ChevronLeft size={15} color="rgba(255,255,255,0.2)" className="flex-shrink-0" />
        </button>
      </SettingsSection>

      {/* ── Username ── */}
      <SettingsSection title={t('اسم المستخدم', 'Username')}>
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <AtSign size={17} color="rgba(0,212,255,0.7)" className="flex-shrink-0" />
            <input
              value={usernameInput}
              onChange={e => { setUsernameInput(e.target.value); setUsernameError('') }}
              placeholder={t('اختر اسماً (٤ أحرف فأكثر)', 'Pick a name (4+ chars)')}
              maxLength={20}
              autoCapitalize="none"
              spellCheck={false}
              className="galaxy-input flex-1 px-3 py-2 text-sm"
              dir="ltr"
              style={{ textAlign: isEn ? 'left' : 'right' }}
            />
            <button
              onClick={saveUsername}
              disabled={usernameStatus === 'saving' || usernameInput.trim().toLowerCase() === username || usernameInput.trim().length < 4}
              className="text-xs px-3 py-2 rounded-lg font-bold flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'rgba(151,227,37,0.14)', color: '#97E325', border: '1px solid rgba(151,227,37,0.3)' }}
            >
              {usernameStatus === 'saving'
                ? <Loader2 size={14} className="animate-spin" />
                : usernameStatus === 'saved' ? t('✓ تم', '✓ Done') : t('حفظ', 'Save')}
            </button>
          </div>
          {usernameError
            ? <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{usernameError}</p>
            : <p className="text-xs mt-2 text-white/35">
                {t('اسم فريد يظهر عند تواصلك معنا. أحرف وأرقام بلا مسافات.',
                   'A unique name shown when you contact us. Letters & numbers, no spaces.')}
              </p>}
        </div>
      </SettingsSection>

      {/* ── Support & Legal ── */}
      <SettingsSection title={t('الدعم والقانوني', 'Support & Legal')}>
        <button onClick={() => router.push('/inbox')}
          className="w-full flex items-center gap-3 px-4 py-3.5 transition-all">
          <Bell size={18} color="rgba(245,158,11,0.8)" className="flex-shrink-0" />
          <span className="text-sm text-white/70 flex-1 text-start">{t('صندوق الوارد', 'Inbox')}</span>
          <ChevronLeft size={15} color="rgba(255,255,255,0.2)" className="flex-shrink-0" style={{ transform: isEn ? 'rotate(180deg)' : 'none' }} />
        </button>
        <button onClick={() => { try { localStorage.removeItem('dietak-tour-done') } catch {}; router.push('/') }}
          className="w-full flex items-center gap-3 px-4 py-3.5 transition-all">
          <Info size={18} color="rgba(0,212,255,0.7)" className="flex-shrink-0" />
          <span className="text-sm text-white/70 flex-1 text-start">{t('الجولة التعريفية', 'App Tour')}</span>
          <ChevronLeft size={15} color="rgba(255,255,255,0.2)" className="flex-shrink-0" style={{ transform: isEn ? 'rotate(180deg)' : 'none' }} />
        </button>
        <button onClick={() => router.push('/contact')}
          className="w-full flex items-center gap-3 px-4 py-3.5 transition-all">
          <MessageSquare size={18} color="rgba(151,227,37,0.7)" className="flex-shrink-0" />
          <span className="text-sm text-white/70 flex-1 text-start">{t('تواصل معنا', 'Contact Us')}</span>
          <ChevronLeft size={15} color="rgba(255,255,255,0.2)" className="flex-shrink-0" style={{ transform: isEn ? 'rotate(180deg)' : 'none' }} />
        </button>
        <button onClick={() => router.push('/terms')}
          className="w-full flex items-center gap-3 px-4 py-3.5 transition-all">
          <FileText size={18} color="rgba(0,212,255,0.7)" className="flex-shrink-0" />
          <span className="text-sm text-white/70 flex-1 text-start">{t('الشروط والأحكام', 'Terms & Conditions')}</span>
          <ChevronLeft size={15} color="rgba(255,255,255,0.2)" className="flex-shrink-0" style={{ transform: isEn ? 'rotate(180deg)' : 'none' }} />
        </button>
        <button onClick={() => router.push('/privacy')}
          className="w-full flex items-center gap-3 px-4 py-3.5 transition-all">
          <Shield size={18} color="rgba(192,132,252,0.7)" className="flex-shrink-0" />
          <span className="text-sm text-white/70 flex-1 text-start">{t('سياسة الخصوصية', 'Privacy Policy')}</span>
          <ChevronLeft size={15} color="rgba(255,255,255,0.2)" className="flex-shrink-0" style={{ transform: isEn ? 'rotate(180deg)' : 'none' }} />
        </button>
        {isAdmin(userEmail) && (
          <button onClick={() => router.push('/admin/messages')}
            className="w-full flex items-center gap-3 px-4 py-3.5 transition-all">
            <Inbox size={18} color="#f59e0b" className="flex-shrink-0" />
            <span className="text-sm flex-1 text-start font-semibold" style={{ color: '#f59e0b' }}>
              {t('رسائل المستخدمين (مشرف)', 'User Messages (Admin)')}
            </span>
            <ChevronLeft size={15} color="rgba(245,158,11,0.4)" className="flex-shrink-0" style={{ transform: isEn ? 'rotate(180deg)' : 'none' }} />
          </button>
        )}
      </SettingsSection>

      {/* ── Dietak Pro ── */}
      {proActive ? (
        /* ── Pro Active Card ── */
        <div className="rounded-2xl p-5 flex flex-col gap-3 animate-fade-in"
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.06))', border: '1px solid rgba(245,158,11,0.35)' }}>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(251,191,36,0.15))' }}>
                ⭐
              </div>
              <div>
                <p className="font-black text-base" style={{ color: '#f59e0b' }}>Dietak Pro</p>
                <p className="text-xs text-white/50">
                  {isAdmin(userEmail)
                    ? t('مفعّل — حساب المشرف', 'Active — Admin')
                    : stripeActive
                      ? t('اشتراك شهري نشط', 'Monthly subscription active')
                      : t('مفعّل بكود', 'Activated with code')}
                </p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              ✓ {t('نشط', 'Active')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: '📷', ar: 'تصوير غير محدود',        en: 'Unlimited scans'   },
              { icon: '📋', ar: 'خطط غذائية غير محدودة',  en: 'Unlimited plans'   },
              { icon: '⚡', ar: 'ذكاء اصطناعي كامل',      en: 'Full AI access'    },
              { icon: '🚫', ar: 'بدون قيود',               en: 'No limits'         },
            ].map(b => (
              <div key={b.en} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.07)' }}>
                <span className="text-sm">{b.icon}</span>
                <span className="text-xs text-white/70">{t(b.ar, b.en)}</span>
              </div>
            ))}
          </div>

          {/* Manage Stripe subscription — web only (App Store forbids external payment links) */}
          {stripeActive && !isNativeApp && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              {portalLoading ? '...' : t('⚙️ إدارة الاشتراك / الإلغاء', '⚙️ Manage / Cancel subscription')}
            </button>
          )}

          {/* Deactivate code-only Pro */}
          {!isAdmin(userEmail) && !stripeActive && (
            <button onClick={handleDeactivatePro}
              className="text-xs text-center mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {t('إلغاء التفعيل', 'Deactivate')}
            </button>
          )}
        </div>

      ) : isNativeApp ? (
        /* ── Native IAP Upgrade Card (Apple In-App Purchase) ── */
        <div id="pro" className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.25)' }}>
          <div className="p-5 flex flex-col gap-4"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(245,158,11,0.12)' }}>⭐</div>
                <div>
                  <p className="font-black text-base text-white">Dietak Pro</p>
                  <p className="text-xs text-white/40">{t('اشتراك شهري', 'Monthly subscription')}</p>
                </div>
              </div>
              {iapPrice && (
                <div className="text-right">
                  <p className="text-xl font-black" style={{ color: '#f59e0b' }}>{iapPrice}</p>
                  <p className="text-xs text-white/40">{t('/ شهر', '/ mo')}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '📷', ar: 'تصوير غير محدود',   en: 'Unlimited scans' },
                { icon: '📋', ar: 'خطط غذائية ∞',      en: 'Unlimited plans' },
                { icon: '🏋️', ar: 'خطط تمارين ∞',      en: 'Unlimited workouts' },
                { icon: '🚫', ar: 'بدون إعلانات',       en: 'No ads' },
              ].map(b => (
                <div key={b.en} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(245,158,11,0.06)' }}>
                  <span className="text-sm">{b.icon}</span>
                  <span className="text-xs text-white/60">{t(b.ar, b.en)}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleNativeSubscribe}
              disabled={iapLoading}
              className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#09090D' }}>
              {iapLoading
                ? t('جارٍ المعالجة...', 'Processing...')
                : t('⭐ اشترك الآن', '⭐ Subscribe Now')}
            </button>

            {iapError && <p className="text-xs text-center" style={{ color: '#ef4444' }}>✗ {iapError}</p>}

            <button onClick={handleRestore} disabled={restoring}
              className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {restoring ? t('...', '...') : t('استعادة المشتريات', 'Restore Purchases')}
            </button>

            {/* متطلبات Apple 3.1.2: إفصاح التجديد التلقائي + روابط الشروط والخصوصية */}
            <p className="text-[10px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {t(
                'يتجدد الاشتراك تلقائياً كل شهر ما لم يُلغَ قبل 24 ساعة على الأقل من نهاية الفترة الحالية. تُدار الاشتراكات وتُلغى من إعدادات Apple ID.',
                'Subscription automatically renews monthly unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your Apple ID settings.'
              )}
            </p>
            <div className="flex items-center justify-center gap-5">
              <button onClick={() => router.push('/terms')}
                className="text-xs underline" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {t('شروط الاستخدام', 'Terms of Use')}
              </button>
              <button onClick={() => router.push('/privacy')}
                className="text-xs underline" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {t('سياسة الخصوصية', 'Privacy Policy')}
              </button>
            </div>
          </div>
        </div>

      ) : (
        /* ── Upgrade Card — web only (App Store rule 3.1.1: no external payments in-app) ── */
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(245,158,11,0.25)' }}>

          {/* Header */}
          <div className="p-5 flex flex-col gap-4"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))' }}>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: 'rgba(245,158,11,0.12)' }}>⭐</div>
                <div>
                  <p className="font-black text-base text-white">Dietak Pro</p>
                  <p className="text-xs text-white/40">{t('اشتراك شهري', 'Monthly subscription')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black" style={{ color: '#f59e0b' }}>9.99</p>
                <p className="text-xs text-white/40">{t('درهم / شهر', 'AED / mo')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '📷', ar: 'تصوير غير محدود',       en: 'Unlimited scans'  },
                { icon: '📋', ar: 'خطط غذائية ∞',          en: 'Unlimited plans'  },
                { icon: '⚡', ar: 'ذكاء اصطناعي كامل',     en: 'Full AI access'   },
                { icon: '🔄', ar: 'إلغاء في أي وقت',       en: 'Cancel anytime'   },
              ].map(b => (
                <div key={b.en} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(245,158,11,0.06)' }}>
                  <span className="text-sm">{b.icon}</span>
                  <span className="text-xs text-white/60">{t(b.ar, b.en)}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpgrade}
              disabled={subLoading}
              className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#09090D' }}>
              {subLoading
                ? t('جارٍ التحميل...', 'Loading...')
                : t('⭐ اشترك الآن — 9.99 درهم/شهر', '⭐ Subscribe — AED 9.99/mo')}
            </button>

            {proError && (
              <p className="text-xs text-center" style={{ color: '#ef4444' }}>✗ {proError}</p>
            )}
          </div>

          {/* Code activation (collapsed / secondary) */}
          <div className="px-5 py-3 flex flex-col gap-2"
            style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[11px] text-white/30 text-center">{t('أو فعّل بكود إذا لديك', 'Or activate with a code')}</p>
            <div className="flex gap-2">
              <input
                value={proCode}
                onChange={e => { setProCode(e.target.value); setProError('') }}
                onKeyDown={e => e.key === 'Enter' && handleActivatePro()}
                placeholder={t('أدخل الكود هنا', 'Enter code here')}
                dir="ltr"
                className="galaxy-input flex-1 px-3 py-2 text-xs font-mono"
              />
              <button
                onClick={handleActivatePro}
                disabled={!proCode.trim()}
                className="px-3 py-2 rounded-xl font-bold text-xs disabled:opacity-40"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                {t('تفعيل', 'Activate')}
              </button>
            </div>
            {proSuccess && (
              <p className="text-xs text-center font-bold" style={{ color: '#10b981' }}>
                ✅ {t('Dietak Pro مفعّل!', 'Dietak Pro activated!')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Account ── */}
      <SettingsSection title={t('الحساب', 'Account')}>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 transition-all">
          <LogOut size={18} color="rgba(239,68,68,0.7)" className="flex-shrink-0" />
          <span className="text-sm flex-1" style={{ color: 'rgba(239,68,68,0.8)' }}>
            {t('تسجيل الخروج', 'Sign Out')}
          </span>
        </button>

        <button
          onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmed(false); setDeleteError('') }}
          className="w-full flex items-center gap-3 px-4 py-3.5 transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="rgba(239,68,68,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="flex-shrink-0">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
          <span className="text-sm flex-1 font-bold" style={{ color: 'rgba(239,68,68,0.9)' }}>
            {t('حذف الحساب', 'Delete Account')}
          </span>
        </button>
      </SettingsSection>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4 animate-slide-up"
            style={{ background: '#0f0f18', border: '1px solid rgba(239,68,68,0.4)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>

            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.35)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {t('حذف الحساب نهائياً', 'Delete Account Permanently')}
                </h3>
                <p className="text-sm text-white/45 mt-1 leading-relaxed">
                  {t(
                    'سيُحذف حسابك وجميع بياناتك (وجبات، وزن، ماء، خطط) بشكل نهائي ولا يمكن التراجع.',
                    'Your account and all data (meals, weight, water, plans) will be permanently deleted. This cannot be undone.'
                  )}
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer px-1 py-2 rounded-xl"
              style={{
                background: deleteConfirmed ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
              <input type="checkbox" checked={deleteConfirmed}
                onChange={e => setDeleteConfirmed(e.target.checked)}
                className="mt-0.5 flex-shrink-0 accent-red-500 w-4 h-4" />
              <span className="text-sm leading-snug"
                style={{ color: deleteConfirmed ? '#ef4444' : 'rgba(255,255,255,0.55)' }}>
                {t('أفهم أن هذا الإجراء نهائي ولا يمكن التراجع عنه',
                   'I understand this action is permanent and cannot be undone')}
              </span>
            </label>

            {deleteError && (
              <p className="text-xs text-center py-2 px-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                ⚠️ {deleteError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmed(false); setDeleteError('') }}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !deleteConfirmed}
                className="flex-1 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-35"
                style={{ background: 'rgba(239,68,68,0.85)', color: 'white' }}>
                {deleting ? t('جارٍ الحذف...', 'Deleting...') : t('حذف نهائي', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-white/20 pb-2">
        Dietak دايتك v1.0 • {t('مدعوم بالذكاء الاصطناعي', 'Powered by AI')} ✨
      </p>
    </div>
  )
}
