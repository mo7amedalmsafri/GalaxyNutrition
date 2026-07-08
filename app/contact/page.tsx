'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Send, Loader2, MessageSquare, Lightbulb, CheckCircle2 } from 'lucide-react'
import { useT, useLang } from '@/lib/store'

export default function ContactPage() {
  const t = useT()
  const lang = useLang()
  const router = useRouter()

  const [type, setType] = useState<'problem' | 'suggestion'>('problem')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [noUsername, setNoUsername] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (message.trim().length < 3 || loading) return
    setLoading(true); setError(''); setNoUsername(false)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: message.trim() }),
        signal: AbortSignal.timeout(20000),
      })
      if (res.status === 428) { setNoUsername(true); return }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || t('تعذّر الإرسال', 'Could not send')); return }
      setDone(true)
    } catch {
      setError(t('تعذّر الإرسال — تأكد من الاتصال', 'Could not send — check your connection'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen px-5 py-8"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(107,33,168,0.15) 0%, transparent 55%), #0a0014', direction: lang === 'en' ? 'ltr' : 'rtl' }}
    >
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ChevronRight size={20} color="#fff" style={{ transform: lang === 'en' ? 'rotate(180deg)' : 'none' }} />
          </button>
          <h1 className="text-xl font-black text-white">{t('تواصل معنا', 'Contact Us')}</h1>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <CheckCircle2 size={56} color="#10b981" />
            <p className="text-white font-bold text-lg">{t('وصلتنا رسالتك، شكراً لك!', 'We received your message, thank you!')}</p>
            <p className="text-white/50 text-sm">{t('سنطّلع عليها في أقرب وقت.', 'We\'ll review it soon.')}</p>
            <button onClick={() => router.push('/settings')} className="btn-galaxy px-6 py-3 mt-2">
              {t('رجوع للإعدادات', 'Back to Settings')}
            </button>
          </div>
        ) : noUsername ? (
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <p className="text-white font-bold">{t('أضف اسم مستخدم أولاً', 'Add a username first')}</p>
            <p className="text-white/55 text-sm">
              {t('عشان نعرف من أرسل الرسالة، أضف اسم مستخدم من الإعدادات ثم ارجع هنا.',
                 'So we know who sent the message, add a username in Settings then come back.')}
            </p>
            <button onClick={() => router.push('/settings')} className="btn-galaxy px-6 py-3">
              {t('اذهب للإعدادات', 'Go to Settings')}
            </button>
          </div>
        ) : (
          <>
            <p className="text-white/50 text-sm mb-4 leading-relaxed">
              {t('واجهت مشكلة أو عندك اقتراح؟ اكتب لنا وسنطّلع عليه.',
                 'Hit a problem or have a suggestion? Write to us and we\'ll review it.')}
            </p>

            {/* Type */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {([
                { v: 'problem',    icon: MessageSquare, ar: 'مشكلة',  en: 'Problem',    color: '#ef4444' },
                { v: 'suggestion', icon: Lightbulb,     ar: 'اقتراح', en: 'Suggestion', color: '#97E325' },
              ] as const).map(o => {
                const active = type === o.v
                return (
                  <button key={o.v} onClick={() => setType(o.v)}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl transition-all active:scale-95"
                    style={{
                      background: active ? `${o.color}22` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${active ? o.color : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    <o.icon size={17} color={active ? o.color : 'rgba(255,255,255,0.45)'} />
                    <span className="text-sm font-bold" style={{ color: active ? o.color : 'rgba(255,255,255,0.55)' }}>
                      {t(o.ar, o.en)}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Message */}
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              maxLength={2000}
              placeholder={t('اكتب رسالتك هنا...', 'Write your message here...')}
              className="galaxy-input w-full px-4 py-3 text-sm resize-none"
            />
            <div className="text-xs text-white/30 mt-1 px-1">{message.length}/2000</div>

            {error && <p className="text-xs mt-2 px-1" style={{ color: '#ef4444' }}>{error}</p>}

            <button
              onClick={submit}
              disabled={loading || message.trim().length < 3}
              className="btn-galaxy w-full py-3.5 mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {t('إرسال', 'Send')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
