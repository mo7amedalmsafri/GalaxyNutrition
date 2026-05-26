'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  // ── Login state ──
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [isUnconfirmed, setIsUnconfirmed] = useState(false)
  const [resent, setResent]     = useState(false)

  // ── Forgot password state ──
  const [showForgot, setShowForgot]       = useState(false)
  const [forgotEmail, setForgotEmail]     = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent]       = useState(false)
  const [forgotError, setForgotError]     = useState('')

  // ── Handlers ──────────────────────────────────────────────────────────
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

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail) return
    setForgotLoading(true)
    setForgotError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (err) {
      setForgotError('حدث خطأ، تحقق من البريد وحاول مجدداً.')
    } else {
      setForgotSent(true)
    }
    setForgotLoading(false)
  }

  // ── UI ────────────────────────────────────────────────────────────────
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
        <p className="text-white/40 text-sm mt-1">
          {showForgot ? 'أعد تعيين كلمة المرور' : 'سجّل دخولك للمتابعة'}
        </p>
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

        {/* ══════════ FORGOT PASSWORD VIEW ══════════ */}
        {showForgot ? (
          forgotSent ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                style={{ background: 'rgba(151,227,37,0.12)', border: '1px solid rgba(151,227,37,0.25)' }}
              >
                📬
              </div>
              <div>
                <p className="font-black text-white text-base">تم إرسال الرابط!</p>
                <p className="text-sm text-white/50 mt-1 leading-relaxed">
                  تحقق من بريدك الإلكتروني
                  <br />
                  <span className="text-[#97E325] font-medium" dir="ltr">{forgotEmail}</span>
                  <br />
                  واضغط على الرابط لإعادة تعيين كلمة المرور.
                </p>
              </div>
              <p className="text-xs text-white/30">قد يصل في بضع دقائق، تحقق من مجلد الـ Spam إذا لم يصل.</p>
              <button
                onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail('') }}
                className="text-sm font-bold mt-1"
                style={{ color: '#97E325' }}
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          ) : (
            /* ── Forgot password form ── */
            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-white/60 leading-relaxed mb-4">
                  أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
                </p>
                <div className="relative">
                  <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(151,227,37,0.6)' }} />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="البريد الإلكتروني"
                    required
                    dir="ltr"
                    className="galaxy-input w-full pr-10 pl-4 py-3 text-sm"
                  />
                </div>
              </div>

              {forgotError && (
                <div className="rounded-xl p-3 text-sm text-center"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  {forgotError}
                </div>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="btn-galaxy py-3.5 text-base font-black disabled:opacity-50"
              >
                {forgotLoading ? 'جارٍ الإرسال...' : 'إرسال رابط الاسترداد'}
              </button>

              <button
                type="button"
                onClick={() => { setShowForgot(false); setForgotError('') }}
                className="flex items-center justify-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                <ArrowRight size={14} />
                العودة لتسجيل الدخول
              </button>
            </form>
          )
        ) : (

          /* ══════════ LOGIN FORM ══════════ */
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
            <div className="flex flex-col gap-1.5">
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

              {/* Forgot password link */}
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotEmail(email); setError('') }}
                  className="text-xs transition-colors"
                  style={{ color: 'rgba(151,227,37,0.7)' }}
                >
                  هل نسيت كلمة المرور؟
                </button>
              </div>
            </div>

            {/* Error box */}
            {error && (
              <div className="rounded-xl p-3 flex flex-col gap-2"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>

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
        )}

        {!showForgot && (
          <p className="text-center text-sm text-white/40 mt-5">
            ليس لديك حساب؟{' '}
            <Link href="/register" className="font-bold" style={{ color: '#97E325' }}>
              إنشاء حساب
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
