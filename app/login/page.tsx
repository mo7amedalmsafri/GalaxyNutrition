'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [isUnconfirmed, setIsUnconfirmed] = useState(false)
  const [resent, setResent]     = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setIsUnconfirmed(false)

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      const msg = err.message.toLowerCase()
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setIsUnconfirmed(true)
        setError('البريد الإلكتروني لم يُؤكَّد بعد. تحقق من بريدك أو أعد إرسال رابط التأكيد.')
      } else if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.')
      } else if (msg.includes('too many requests')) {
        setError('حاولت كثيراً، انتظر قليلاً ثم أعد المحاولة.')
      } else {
        setError('حدث خطأ، حاول مجدداً.')
      }
      setLoading(false)
      return
    }

    window.location.href = '/'
  }

  const handleResend = async () => {
    if (!email) { setError('أدخل بريدك الإلكتروني أولاً.'); return }
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email })
    setResent(true)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background: 'radial-gradient(ellipse at 20% 20%, rgba(151,227,37,0.06) 0%, transparent 50%), #09090D',
      }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-8 animate-fade-in">
        <Logo size={64} />
        <h1 className="text-2xl font-black text-white mt-3">
          <span className="text-gradient-galaxy">Galaxy</span> Nutrition
        </h1>
        <p className="text-white/40 text-sm mt-1">سجّل دخولك للمتابعة</p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
        style={{
          background: 'rgba(14,14,20,0.9)',
          border: '1px solid rgba(151,227,37,0.12)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Email */}
          <div className="relative">
            <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(151,227,37,0.6)' }} />
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="البريد الإلكتروني" required dir="ltr"
              className="galaxy-input w-full pr-10 pl-4 py-3 text-sm"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(151,227,37,0.6)' }} />
            <input
              type={showPass ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="كلمة المرور" required dir="ltr"
              className="galaxy-input w-full pr-10 pl-10 py-3 text-sm"
            />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Error box */}
          {error && (
            <div className="rounded-xl p-3 flex flex-col gap-2"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>

              {/* Resend button — shown only for unconfirmed email */}
              {isUnconfirmed && (
                resent ? (
                  <p className="text-xs text-center font-medium" style={{ color: '#10b981' }}>
                    ✅ تم إرسال رابط التأكيد — تحقق من بريدك
                  </p>
                ) : (
                  <button type="button" onClick={handleResend}
                    className="text-xs font-bold py-1.5 px-3 rounded-lg self-center transition-all active:scale-95"
                    style={{ background: 'rgba(151,227,37,0.12)', color: '#97E325', border: '1px solid rgba(151,227,37,0.3)' }}>
                    إعادة إرسال رابط التأكيد
                  </button>
                )
              )}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="btn-galaxy py-3.5 text-base font-black mt-1 disabled:opacity-50">
            {loading ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>

        <p className="text-center text-sm text-white/40 mt-5">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="font-bold" style={{ color: '#97E325' }}>
            إنشاء حساب
          </Link>
        </p>
      </div>
    </div>
  )
}
