'use client'

import { useState, useEffect } from 'react'
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import Logo from '@/components/Logo'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [showConf, setShowConf]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  const [ready, setReady]         = useState(false)   // session confirmed

  /* Show the form once the recovery link has given us a session — by EITHER
     route, because there are two and only one used to be handled.
     PASSWORD_RECOVERY fires on the older hash-fragment link; the PKCE link
     (?code=…) is exchanged silently and fires SIGNED_IN instead, so a page
     waiting only for PASSWORD_RECOVERY sat on "جارٍ التحقق من الرابط…"
     forever while the user was, in fact, already signed in.
     getSession() also covers the case where the exchange completed before
     this listener was even attached — a race that made the bug intermittent. */
  useEffect(() => {
    const supabase = createClient()
    let alive = true

    /* المسار المباشر — token_hash في الاستعلام، وهو الوحيد بلا تحويلات.
       الرابط القديم يمر بثلاث قفزات (تحقق ← نطاق قديم ← الموقع) والجلسة
       معلّقة في الـhash — وقِيس فعليًا أن متصفح الآيفون يفقدها في الطريق
       بينما متصفح آخر يوصلها: الرابط نفسه نجح هنا وفشل هناك. هذا الرابط
       يفتح هذه الصفحة مباشرة والتوكن في الاستعلام (لا يسقط في تحويل)،
       والصفحة تتحقق منه بنفسها — صفر قفزات، صفر فقدان. */
    const token_hash = new URLSearchParams(window.location.search).get('token_hash')
    if (token_hash) {
      const supa = supabase
      supa.auth.verifyOtp({ type: 'recovery', token_hash }).then(({ data, error: vErr }) => {
        if (!alive) return
        if (data?.session && !vErr) {
          window.history.replaceState(null, '', window.location.pathname)
          setReady(true)
        } else {
          /* الفشل يُقال على الشاشة بنصّه — «ما اشتغل» بلا سبب ظاهر كلّف
             ست جولات تخمين */
          setReady(true)
          setError(vErr?.message?.match(/expired|invalid/i)
            ? 'الرابط انتهت صلاحيته أو استُخدم من قبل — اطلب رابطاً جديداً.'
            : `تعذّر التحقق: ${vErr?.message ?? 'خطأ غير معروف'}`)
        }
      })
      return () => { alive = false }
    }

    /* استهلاك الـhash يدويًا — الخط الحاسم، وسبب وجوده مُقاس لا مُتخيَّل.
       مُشي التدفق كاملًا آليًا (owner-e2e): الرابط وصل، والتحويل إلى هنا نجح،
       والتوكنات جالسة في الـhash صالحة — والمكتبة لم تستهلكها؛ بقيت الصفحة
       على «جارٍ التحقق» والـhash كما هو. فالاستهلاك صار مسؤوليتنا المعلنة:
       نقرأ التوكنين ونمرّرهما لـsetSession — نداء صريح لا سحر فيه ولا سباق. */
    const params = new URLSearchParams(window.location.hash.slice(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
        if (!alive) return
        if (data.session && !error) {
          /* التوكن استُهلك — يُمسح من الشريط كي لا يُنسخ مع الرابط */
          window.history.replaceState(null, '', window.location.pathname)
          setReady(true)
        }
      })
    }

    supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return
      if (event === 'PASSWORD_RECOVERY' || (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION'))) {
        setReady(true)
      }
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.')
      return
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError('حدث خطأ، حاول مجدداً أو اطلب رابطاً جديداً.')
    } else {
      setDone(true)
      setTimeout(() => { window.location.href = '/' }, 2500)
    }
    setLoading(false)
  }

  // ── Strength indicator ─────────────────────────────────────────────────
  const strength = password.length === 0 ? 0
    : password.length < 6  ? 1
    : password.length < 10 ? 2
    : 3
  const strengthColors = ['transparent', '#ef4444', '#f59e0b', '#97E325']
  const strengthLabels = ['', 'ضعيفة', 'متوسطة', 'قوية']

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
        <p className="text-white/40 text-sm mt-1">إعادة تعيين كلمة المرور</p>
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

        {/* ── Success ── */}
        {done ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(151,227,37,0.12)', border: '1px solid rgba(151,227,37,0.3)' }}
            >
              <CheckCircle2 size={32} color="#97E325" />
            </div>
            <div>
              <p className="font-black text-white text-base">تم تغيير كلمة المرور! 🎉</p>
              <p className="text-sm text-white/50 mt-1">جارٍ تحويلك للصفحة الرئيسية...</p>
            </div>
          </div>

        /* ── Waiting for session (link not valid yet) ── */
        ) : !ready ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#97E325] border-t-transparent animate-spin" />
            <p className="text-sm text-white/40">جارٍ التحقق من الرابط...</p>
            <p className="text-xs text-white/25 leading-relaxed">
              إذا وصلت هنا بالخطأ،{' '}
              <a href="/login" className="underline" style={{ color: 'rgba(151,227,37,0.6)' }}>
                عد لتسجيل الدخول
              </a>
            </p>
          </div>

        /* ── Reset form ── */
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <p className="text-sm text-white/55 leading-relaxed">
              أدخل كلمة مرور جديدة قوية لحسابك.
            </p>

            {/* New password */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(151,227,37,0.6)' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  required
                  dir="ltr"
                  className="galaxy-input w-full pr-10 pl-10 py-3 text-sm"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ background: i <= strength ? strengthColors[strength] : 'rgba(255,255,255,0.08)' }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: strengthColors[strength] }}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="relative">
              <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(151,227,37,0.6)' }} />
              <input
                type={showConf ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="تأكيد كلمة المرور"
                required
                dir="ltr"
                className="galaxy-input w-full pr-10 pl-10 py-3 text-sm"
              />
              <button type="button" onClick={() => setShowConf(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(255,255,255,0.3)' }}>
                {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Match hint */}
            {confirm.length > 0 && (
              <p className="text-xs px-1 -mt-2"
                style={{ color: password === confirm ? '#97E325' : '#ef4444' }}>
                {password === confirm ? '✓ كلمتا المرور متطابقتان' : '✗ كلمتا المرور غير متطابقتين'}
              </p>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl p-3 text-sm text-center"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || password !== confirm || password.length < 6}
              className="btn-galaxy py-3.5 text-base font-black mt-1 disabled:opacity-50"
            >
              {loading ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور الجديدة'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
