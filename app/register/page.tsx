'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين'); return }
    if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (err) {
      setError(err.message === 'User already registered' ? 'هذا البريد مسجّل مسبقاً' : 'حدث خطأ، حاول مجدداً')
      setLoading(false)
      return
    }

    // Auto sign-in after registration (email confirmation disabled)
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
    if (!loginErr) {
      window.location.href = '/onboarding'
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#09090D' }}>
        <div className="text-center animate-fade-in">
          <span className="text-6xl">📧</span>
          <h2 className="text-xl font-black text-white mt-4">تحقق من بريدك</h2>
          <p className="text-white/40 text-sm mt-2">أرسلنا رابط التأكيد إلى {email}</p>
          <Link href="/login" className="btn-galaxy inline-block mt-6 px-8 py-3 text-sm font-bold">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background: 'radial-gradient(ellipse at 80% 20%, rgba(255,95,31,0.06) 0%, transparent 50%), #09090D',
      }}
    >
      <div className="flex flex-col items-center mb-8 animate-fade-in">
        <Logo size={64} />
        <h1 className="text-2xl font-black text-white mt-3">
          إنشاء <span className="text-gradient-galaxy">حساب جديد</span>
        </h1>
        <p className="text-white/40 text-sm mt-1">ابدأ رحلتك الغذائية اليوم</p>
      </div>

      <div
        className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
        style={{
          background: 'rgba(14,14,20,0.9)',
          border: '1px solid rgba(255,95,31,0.12)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div className="relative">
            <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(151,227,37,0.6)' }} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="البريد الإلكتروني" required dir="ltr"
              className="galaxy-input w-full pr-10 pl-4 py-3 text-sm" />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(151,227,37,0.6)' }} />
            <input type={showPass ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="كلمة المرور (6 أحرف+)" required dir="ltr"
              className="galaxy-input w-full pr-10 pl-10 py-3 text-sm" />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="relative">
            <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(151,227,37,0.6)' }} />
            <input type={showPass ? 'text' : 'password'} value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="تأكيد كلمة المرور" required dir="ltr"
              className="galaxy-input w-full pr-10 pl-4 py-3 text-sm" />
          </div>

          {error && (
            <p className="text-sm text-center py-2 px-3 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="btn-galaxy py-3.5 text-base font-black mt-1 disabled:opacity-50">
            {loading ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
          </button>
        </form>

        <p className="text-center text-sm text-white/40 mt-5">
          لديك حساب؟{' '}
          <Link href="/login" className="font-bold" style={{ color: '#97E325' }}>
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  )
}
