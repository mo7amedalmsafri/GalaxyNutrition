'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Trash2, Mail, MailOpen, Loader2, Inbox, Send, Megaphone, Reply } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/limits'
import { useT, useLang } from '@/lib/store'

interface Msg {
  id: string
  user_id: string | null
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
  const [fetchError, setFetchError] = useState('')

  // إنشاء رسالة (بث / توجيه)
  const [mode, setMode] = useState<'all' | 'user'>('all')
  const [toUser, setToUser] = useState('')
  const [title, setTitle] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendStatus, setSendStatus] = useState('')

  // رد على رسالة
  const [replyId, setReplyId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const email = data.user?.email ?? null
      if (!isAdmin(email)) { setAllowed(false); return }
      setAllowed(true)
      try {
        const res = await fetch('/api/admin/messages')
        const d = await res.json().catch(() => ({}))
        if (res.ok) setMessages(d.messages ?? [])
        else setFetchError(d.error || `خطأ ${res.status}`)
      } catch {
        setFetchError('تعذّر الاتصال بالخادم')
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const send = async () => {
    if (bodyText.trim().length < 1 || sending) return
    setSending(true); setSendStatus('')
    try {
      const res = await fetch('/api/admin/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, username: mode === 'user' ? toUser : undefined, title, body: bodyText }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setSendStatus('✗ ' + (d.error || 'تعذّر الإرسال')); return }
      setSendStatus(mode === 'all' ? t('✓ أُرسلت للجميع', '✓ Sent to everyone') : t('✓ أُرسلت', '✓ Sent'))
      setTitle(''); setBodyText(''); setToUser('')
      setTimeout(() => setSendStatus(''), 3000)
    } catch {
      setSendStatus('✗ تعذّر الاتصال')
    } finally { setSending(false) }
  }

  const sendReply = async (m: Msg) => {
    if (replyText.trim().length < 1 || replySending) return
    setReplySending(true)
    try {
      const res = await fetch('/api/admin/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'user', userId: m.user_id, title: t('رد على رسالتك', 'Reply to your message'), body: replyText }),
      })
      if (res.ok) { setReplyId(null); setReplyText(''); if (!m.is_read) toggleRead(m) }
    } finally { setReplySending(false) }
  }

  const toggleRead = async (m: Msg) => {
    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, is_read: !x.is_read } : x))
    await fetch('/api/admin/messages', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, is_read: !m.is_read }),
    })
  }

  const remove = async (id: string) => {
    setMessages(prev => prev.filter(x => x.id !== id))
    await fetch(`/api/admin/messages?id=${id}`, { method: 'DELETE' })
  }

  const fmtDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
    } catch { return '' }
  }

  const unread = messages.filter(m => !m.is_read).length

  return (
    <div className="min-h-screen px-5 py-8"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(107,33,168,0.15) 0%, transparent 55%), #0a0014', direction: lang === 'en' ? 'ltr' : 'rtl' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.back()} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ChevronRight size={20} color="#fff" style={{ transform: lang === 'en' ? 'rotate(180deg)' : 'none' }} />
          </button>
          <h1 className="text-xl font-black text-white">{t('رسائل المستخدمين', 'User Messages')}</h1>
          {unread > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: 'rgba(151,227,37,0.15)', color: '#97E325' }}>
              {unread} {t('جديدة', 'new')}
            </span>
          )}
        </div>

        {allowed === false && <div className="text-center py-20 text-white/50">{t('غير مصرّح لك بهذه الصفحة', 'You are not authorized')}</div>}

        {allowed && (
          <>
            {/* ── إنشاء رسالة ── */}
            <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <p className="text-sm font-black text-white mb-3 flex items-center gap-2"><Megaphone size={16} color="#f59e0b" /> {t('أرسل رسالة', 'Send a message')}</p>
              <div className="flex gap-2 mb-2">
                {([{ v: 'all', ar: 'للجميع', en: 'Everyone' }, { v: 'user', ar: 'لشخص محدد', en: 'Specific user' }] as const).map(o => (
                  <button key={o.v} onClick={() => setMode(o.v)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                    style={{ background: mode === o.v ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)', color: mode === o.v ? '#f59e0b' : 'rgba(255,255,255,0.5)', border: `1px solid ${mode === o.v ? 'rgba(245,158,11,0.5)' : 'transparent'}` }}>
                    {t(o.ar, o.en)}
                  </button>
                ))}
              </div>
              {mode === 'user' && (
                <input value={toUser} onChange={e => setToUser(e.target.value)} placeholder={t('اسم المستخدم (username)', 'Username')}
                  className="galaxy-input w-full px-3 py-2 text-sm mb-2" dir="ltr" />
              )}
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('العنوان (اختياري)', 'Title (optional)')}
                className="galaxy-input w-full px-3 py-2 text-sm mb-2" />
              <textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={3} placeholder={t('نص الرسالة...', 'Message...')}
                className="galaxy-input w-full px-3 py-2 text-sm resize-none mb-2" />
              {sendStatus && <p className="text-xs mb-2" style={{ color: sendStatus.startsWith('✓') ? '#10b981' : '#ef4444' }}>{sendStatus}</p>}
              <button onClick={send} disabled={sending || bodyText.trim().length < 1}
                className="btn-galaxy w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {t('إرسال', 'Send')}
              </button>
            </div>

            <h2 className="text-sm font-bold text-white/60 mb-3">{t('الرسائل الواردة', 'Incoming messages')}</h2>

            {loading && <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin" color="#97E325" /></div>}
            {!loading && fetchError && (
              <div className="rounded-2xl p-4 text-center text-sm mb-3" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>{fetchError}</div>
            )}
            {!loading && !fetchError && messages.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-white/40"><Inbox size={44} /><p>{t('لا توجد رسائل بعد', 'No messages yet')}</p></div>
            )}

            <div className="flex flex-col gap-3">
              {messages.map(m => (
                <div key={m.id} className="rounded-2xl p-4"
                  style={{ background: m.is_read ? 'rgba(255,255,255,0.03)' : 'rgba(151,227,37,0.07)', border: `1px solid ${m.is_read ? 'rgba(255,255,255,0.07)' : 'rgba(151,227,37,0.25)'}` }}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={m.type === 'problem' ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' } : { background: 'rgba(151,227,37,0.15)', color: '#97E325' }}>
                      {m.type === 'problem' ? t('مشكلة', 'Problem') : t('اقتراح', 'Suggestion')}
                    </span>
                    <span className="text-sm font-bold text-white">@{m.username ?? '—'}</span>
                    <span className="text-xs text-white/35">· {fmtDate(m.created_at)}</span>
                    <div className="flex-1" />
                    <button onClick={() => { setReplyId(replyId === m.id ? null : m.id); setReplyText('') }} className="p-1.5 rounded-lg" style={{ background: 'rgba(0,212,255,0.1)' }} aria-label={t('رد', 'Reply')}>
                      <Reply size={14} color="#00D4FF" />
                    </button>
                    <button onClick={() => toggleRead(m)} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} aria-label={t('تعليم مقروء', 'Toggle read')}>
                      {m.is_read ? <MailOpen size={14} color="rgba(255,255,255,0.4)" /> : <Mail size={14} color="#97E325" />}
                    </button>
                    <button onClick={() => remove(m.id)} className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)' }} aria-label={t('حذف', 'Delete')}>
                      <Trash2 size={14} color="rgba(239,68,68,0.6)" />
                    </button>
                  </div>
                  <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{m.message}</p>
                  {m.email && <p className="text-xs text-white/30 mt-2" style={{ direction: 'ltr', textAlign: lang === 'en' ? 'left' : 'right' }}>{m.email}</p>}

                  {/* صندوق الرد */}
                  {replyId === m.id && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} placeholder={t('اكتب ردك...', 'Write your reply...')}
                        className="galaxy-input w-full px-3 py-2 text-sm resize-none mb-2" />
                      <button onClick={() => sendReply(m)} disabled={replySending || replyText.trim().length < 1}
                        className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: 'rgba(0,212,255,0.14)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.35)' }}>
                        {replySending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        {t('إرسال الرد', 'Send reply')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
