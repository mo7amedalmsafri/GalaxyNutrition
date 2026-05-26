'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from '@/components/Logo'

export default function SuccessPage() {
  const router       = useRouter()
  const params       = useSearchParams()
  const sessionId    = params.get('session_id')
  const [count, setCount] = useState(5)

  // Mark Pro active in localStorage so limits.ts picks it up immediately
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('galaxy-pro-active', 'true')
    }
  }, [])

  // Countdown then redirect to settings
  useEffect(() => {
    if (count <= 0) { router.replace('/settings'); return }
    const t = setTimeout(() => setCount(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [count, router])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.12) 0%, transparent 60%), #09090D' }}
    >
      {/* Confetti stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-2xl animate-bounce"
            style={{
              left:             `${Math.random() * 100}%`,
              top:              `${Math.random() * 100}%`,
              animationDelay:   `${Math.random() * 2}s`,
              animationDuration:`${1.5 + Math.random()}s`,
              opacity:          0.6 + Math.random() * 0.4,
            }}
          >
            {['⭐', '✨', '🌟', '💫'][i % 4]}
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 animate-fade-in">
        <Logo size={72} />

        {/* Big checkmark */}
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center text-5xl"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(251,191,36,0.1))',
            border:     '2px solid rgba(245,158,11,0.5)',
            boxShadow:  '0 0 60px rgba(245,158,11,0.3)',
          }}
        >
          🎉
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-black text-white mb-2">
            مرحباً بك في{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Galaxy Pro ⭐
            </span>
          </h1>
          <p className="text-white/50 text-sm leading-relaxed">
            تم تفعيل اشتراكك بنجاح — استمتع بوصول كامل وغير محدود
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {[
            { icon: '📷', text: 'تصوير غير محدود' },
            { icon: '📋', text: 'خطط غذائية ∞'   },
            { icon: '⚡', text: 'ذكاء اصطناعي كامل' },
            { icon: '🚫', text: 'بدون قيود'        },
          ].map(b => (
            <div
              key={b.text}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <span className="text-lg">{b.icon}</span>
              <span className="text-xs text-white/80 font-medium">{b.text}</span>
            </div>
          ))}
        </div>

        {/* Redirect notice */}
        <p className="text-white/30 text-sm mt-2">
          سيتم تحويلك خلال {count} ثانية...
        </p>

        <button
          onClick={() => router.replace('/settings')}
          className="px-8 py-3.5 rounded-2xl font-black text-sm"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#09090D' }}
        >
          ابدأ الآن →
        </button>
      </div>
    </div>
  )
}
