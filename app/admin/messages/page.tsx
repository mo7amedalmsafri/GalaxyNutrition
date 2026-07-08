'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Trash2, Mail, MailOpen, Loader2, Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/limits'
import { useT, useLang } from '@/lib/store'

interface Msg {
  id: string
  username: string | null
  email: string | null
  type: 'problem' | 'suggestion'
  message: string
  is_read: boolean
  created_at: string
}

export default function AdminMessagesPage() {
  const t = useT()
  const lang = useLang()
  const router = useRouter()

  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const email = data.user?.email ?? null
      if (!isAdmin(email)) { setAllowed(false); return }
      setAllowed(true)
      try {
        const res = await fetch('/api/admin/messages')
        const d = await res.json()
        if (res.ok) setMessages(d.messages ?? [])
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const toggleRead = async (m: Msg) => {
    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, is_read: !x.is_read } : x))
    await fetch('/api/admin/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, is_read: !m.is_read }),
    })
  }

  const remove = async (id: string) => {
    setMessages(prev => prev.filter(x => x.id !== id))
    await fetch(`/api/admin/messages?id=${id}`, { method: 'DELETE' })
  }

  const fmtDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      }).format(new Date(iso))
    } catch { return '' }
  }

  const unread = messages.filter(m => !m.is_read).length

  return (
    <div
      className="min-h-screen px-5 py-8"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(107,33,168,0.15) 0%, transparent 55%), #0a0014', direction: lang === 'en' ? 'ltr' : 'rtl' }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ChevronRight size={20} color="#fff" style={{ transform: lang === 'en' ? 'rotate(180deg)' : 'none' }} />
          </button>
          <h1 className="text-xl font-black text-white">{t('رسائل المستخدمين', 'User Messages')}</h1>
          {unread > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold"
              style={{ background: 'rgba(151,227,37,0.15)', color: '#97E325' }}>
              {unread} {t('جديدة', 'new')}
            </span>
          )}
        </div>

        {allowed === false && (
          <div className="text-center py-20 text-white/50">{t('غير مصرّح لك بهذه الصفحة', 'You are not authorized')}</div>
        )}

        {allowed && loading && (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin" color="#97E325" /></div>
        )}

        {allowed && !loading && messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-white/40">
            <Inbox size={48} /><p>{t('لا توجد رسائل بعد', 'No messages yet')}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {messages.map(m => (
            <div key={m.id} className="rounded-2xl p-4"
              style={{
                background: m.is_read ? 'rgba(255,255,255,0.03)' : 'rgba(151,227,37,0.07)',
                border: `1px solid ${m.is_read ? 'rgba(255,255,255,0.07)' : 'rgba(151,227,37,0.25)'}`,
              }}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={m.type === 'problem'
                    ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' }
                    : { background: 'rgba(151,227,37,0.15)', color: '#97E325' }}>
                  {m.type === 'problem' ? t('مشكلة', 'Problem') : t('اقتراح', 'Suggestion')}
                </span>
                <span className="text-sm font-bold text-white">@{m.username ?? '—'}</span>
                <span className="text-xs text-white/35">· {fmtDate(m.created_at)}</span>
                <div className="flex-1" />
                <button onClick={() => toggleRead(m)} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}
                  aria-label={t('تعليم مقروء', 'Toggle read')}>
                  {m.is_read ? <MailOpen size={14} color="rgba(255,255,255,0.4)" /> : <Mail size={14} color="#97E325" />}
                </button>
                <button onClick={() => remove(m.id)} className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)' }}
                  aria-label={t('حذف', 'Delete')}>
                  <Trash2 size={14} color="rgba(239,68,68,0.6)" />
                </button>
              </div>
              <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{m.message}</p>
              {m.email && <p className="text-xs text-white/30 mt-2" style={{ direction: 'ltr', textAlign: lang === 'en' ? 'left' : 'right' }}>{m.email}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
