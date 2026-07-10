'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Loader2, Inbox, Megaphone, Mail } from 'lucide-react'
import { useT, useLang } from '@/lib/store'

interface InboxMsg {
  id: string
  title: string | null
  body: string
  created_at: string
  user_id: string | null   // null = بث للجميع
}

export default function InboxPage() {
  const t = useT()
  const lang = useLang()
  const router = useRouter()

  const [messages, setMessages] = useState<InboxMsg[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/inbox')
      .then(r => r.json())
      .then(d => setMessages(d.messages ?? []))
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        // علّم الكل كمقروء (لإخفاء الشارة)
        try { localStorage.setItem('dietak-inbox-seen', new Date().toISOString()) } catch {}
      })
  }, [])

  const fmtDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      }).format(new Date(iso))
    } catch { return '' }
  }

  return (
    <div className="min-h-screen px-5 py-8"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(107,33,168,0.15) 0%, transparent 55%), #0a0014', direction: lang === 'en' ? 'ltr' : 'rtl' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ChevronRight size={20} color="#fff" style={{ transform: lang === 'en' ? 'rotate(180deg)' : 'none' }} />
          </button>
          <h1 className="text-xl font-black text-white">{t('صندوق الوارد', 'Inbox')}</h1>
        </div>

        {loading && (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin" color="#97E325" /></div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-white/40">
            <Inbox size={48} /><p>{t('لا توجد رسائل', 'No messages')}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map(m => {
            const broadcast = m.user_id === null
            return (
              <div key={m.id} className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(151,227,37,0.18)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: broadcast ? 'rgba(245,158,11,0.15)' : 'rgba(151,227,37,0.15)' }}>
                    {broadcast ? <Megaphone size={15} color="#f59e0b" /> : <Mail size={15} color="#97E325" />}
                  </span>
                  <span className="text-sm font-bold text-white flex-1">
                    {m.title || (broadcast ? t('إعلان', 'Announcement') : t('رسالة من الدعم', 'Message from support'))}
                  </span>
                  <span className="text-xs text-white/35">{fmtDate(m.created_at)}</span>
                </div>
                <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{m.body}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
