'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Dumbbell, Trash2, RefreshCw, X } from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import ProUpsell from '@/components/ProUpsell'
import { useLocalStorage, StoredProfile, DEFAULT_PROFILE, useT, useEntitlement } from '@/lib/store'

// الرياضات المتاحة للاختيار
const SPORTS = [
  { id: 'weights',      icon: '🏋️', ar: 'رفع أثقال', en: 'Weights' },
  { id: 'cardio',       icon: '🔥', ar: 'كارديو',    en: 'Cardio' },
  { id: 'running',      icon: '🏃', ar: 'جري',       en: 'Running' },
  { id: 'swimming',     icon: '🏊', ar: 'سباحة',     en: 'Swimming' },
  { id: 'boxing',       icon: '🥊', ar: 'ملاكمة',    en: 'Boxing' },
  { id: 'cycling',      icon: '🚴', ar: 'دراجة',     en: 'Cycling' },
  { id: 'hiit',         icon: '⚡', ar: 'HIIT',      en: 'HIIT' },
  { id: 'calisthenics', icon: '🤸', ar: 'وزن الجسم', en: 'Calisthenics' },
  { id: 'jumprope',     icon: '⛹️', ar: 'نط الحبل',  en: 'Jump Rope' },
  { id: 'yoga',         icon: '🧘', ar: 'يوغا/إطالة', en: 'Yoga' },
]

const GOALS = [
  { id: 'fatloss',   ar: 'حرق دهون', en: 'Fat Loss' },
  { id: 'muscle',    ar: 'بناء عضل', en: 'Muscle' },
  { id: 'endurance', ar: 'لياقة',    en: 'Endurance' },
  { id: 'general',   ar: 'صحة عامة', en: 'General' },
]

const LEVELS = [
  { id: 'beginner',     ar: 'مبتدئ', en: 'Beginner' },
  { id: 'intermediate', ar: 'متوسط', en: 'Intermediate' },
  { id: 'advanced',     ar: 'متقدّم', en: 'Advanced' },
]

interface SavedPlan { plan: string; createdAt: string }

// يشتق هدف افتراضي من هدف الوزن في الملف الشخصي
function defaultGoal(goal?: string) {
  if (goal === 'lose') return 'fatloss'
  if (goal === 'gain') return 'muscle'
  return 'general'
}

export default function WorkoutPlanGenerator() {
  const t = useT()
  const ent = useEntitlement()
  const [profile] = useLocalStorage<StoredProfile>('galaxy-profile', DEFAULT_PROFILE)
  const lang = profile.language ?? 'ar'
  const [blocked, setBlocked] = useState(false)

  const [sports, setSports] = useState<string[]>(['weights'])
  const [customSport, setCustomSport] = useState('')
  const [days, setDays] = useState(3)
  const [minutes, setMinutes] = useState(45)
  const [goal, setGoal] = useState(defaultGoal(profile.goal))
  const [level, setLevel] = useState('beginner')
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [targetKg, setTargetKg] = useState('')

  const [saved, setSaved] = useLocalStorage<SavedPlan | null>('galaxy-workout-plan', null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const toggleSport = (id: string) =>
    setSports(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const PRESET_IDS = new Set(SPORTS.map(s => s.id))
  const customSports = sports.filter(s => !PRESET_IDS.has(s))

  const addCustomSport = () => {
    const v = customSport.trim()
    if (!v) return
    if (!sports.some(s => s.toLowerCase() === v.toLowerCase())) setSports(prev => [...prev, v])
    setCustomSport('')
  }

  const generate = async () => {
    if (loading) return
    if (!ent.allowed) { setBlocked(true); return }
    setLoading(true); setError(''); setBlocked(false)
    try {
      const res = await fetch('/api/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sports, days, minutes, goal, level, period,
          targetKg: targetKg ? parseFloat(targetKg) : undefined,
          gender: profile.gender, age: profile.age, weight: profile.weight,
          language: lang,
        }),
        signal: AbortSignal.timeout(55000),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.plan) {
        setError(data.error || t('تعذّر التوليد، حاول مرة أخرى', 'Could not generate, try again'))
        return
      }
      setSaved({ plan: data.plan, createdAt: new Date().toISOString() })
      setShowForm(false)
    } catch (e) {
      const timedOut = e instanceof DOMException && e.name === 'TimeoutError'
      setError(timedOut
        ? t('الخدمة بطيئة الآن — حاول مرة أخرى', 'The service is slow now — try again')
        : t('تعذّر الاتصال — تأكد من الإنترنت', 'Connection failed — check your internet'))
    } finally {
      setLoading(false)
    }
  }

  // ── تحليل نص الخطة إلى بنية منظّمة (أيام + تمارين + حرق) ──
  const parsePlan = (plan: string) => {
    const isDivider = (s: string) => /^[━─\-=_]{3,}$/.test(s.replace(/\s/g, ''))
    const isBullet  = (s: string) => /^[•\-–▪●*]\s+/.test(s)
    const dayRe     = /^📌/
    const tipsRe    = /💡|^نصائح|^tips/i

    type Item = { text: string; video: boolean }
    type Day  = { title: string; items: Item[]; burn: string; isRest: boolean }

    let title = '', meta = ''
    const days: Day[] = []
    const tips: string[] = []
    let cur: Day | null = null
    let inTips = false

    for (const raw of plan.split('\n')) {
      const s = raw.trim()
      if (!s || isDivider(s)) continue

      if (dayRe.test(s)) {
        inTips = false
        cur = {
          title: s.replace(/^📌\s*/, '').trim(),
          items: [], burn: '',
          isRest: /راحة|rest/i.test(s),
        }
        days.push(cur)
        continue
      }
      if (tipsRe.test(s) && !isBullet(s)) { inTips = true; cur = null; continue }
      if (/🏋/.test(s) && !title) { title = s.replace(/🏋️|🏋|️/g, '').trim(); continue }
      if (/🎯/.test(s) && !meta)  { meta = s.replace(/🎯/g, '').trim(); continue }
      if (/🔥/.test(s)) {
        if (cur) cur.burn = s.replace(/🔥/g, '').replace(/حرق تقريبي:?|approx\.?\s*burn:?/i, '').trim()
        continue
      }
      if (isBullet(s)) {
        const text = s.replace(/^[•\-–▪●*]\s+/, '').trim()
        if (inTips) tips.push(text)
        else if (cur) cur.items.push({ text, video: !cur.isRest })
        continue
      }
      if (cur && !inTips) cur.items.push({ text: s, video: false })
    }

    const totalBurn = days.reduce((sum, d) => {
      const m = d.burn.match(/\d[\d,]*/)
      return sum + (m ? parseInt(m[0].replace(/,/g, '')) : 0)
    }, 0)

    return { title, meta, days, tips, totalBurn }
  }

  const ytLink = (exText: string) => {
    const name = exText.split(/\s[—–-]\s|\(|:|\d/)[0].trim()
    const q = encodeURIComponent(`${name} ${lang === 'en' ? 'exercise proper form' : 'تمرين طريقة الأداء'}`)
    return `https://www.youtube.com/results?search_query=${q}`
  }

  // ── عرض الخطة كبطاقات يومية منظّمة ──
  const renderPlan = (plan: string) => {
    const { meta, days, tips, totalBurn } = parsePlan(plan)
    const metaChips = meta.split('|').map(s => s.trim()).filter(Boolean)

    return (
      <div className="flex flex-col gap-3">
        {(metaChips.length > 0 || totalBurn > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {metaChips.map((c, i) => (
              <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(151,227,37,0.12)', color: '#97E325', border: '1px solid rgba(151,227,37,0.22)' }}>
                {c}
              </span>
            ))}
            {totalBurn > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.22)' }}>
                🔥 ≈{totalBurn.toLocaleString()} {t('سعرة/أسبوع', 'kcal/week')}
              </span>
            )}
          </div>
        )}

        {days.map((day, di) => {
          const exCount = day.items.filter(x => x.video).length
          if (day.isRest) {
            return (
              <div key={di} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <span className="text-base">😴</span>
                <span className="text-[13px] font-semibold text-white/45">{day.title}</span>
              </div>
            )
          }
          return (
            <div key={di} className="rounded-xl overflow-hidden"
              style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(151,227,37,0.16)' }}>
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5"
                style={{ background: 'rgba(151,227,37,0.08)', borderBottom: '1px solid rgba(151,227,37,0.14)' }}>
                <span className="text-[13px] font-bold text-white/90 truncate">{day.title}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {exCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(0,212,255,0.12)', color: '#00D4FF' }}>
                      {exCount} {t('تمرين', 'ex')}
                    </span>
                  )}
                  {day.burn && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                      🔥 {day.burn}
                    </span>
                  )}
                </div>
              </div>
              <div className="px-3.5 py-1">
                {day.items.map((it, ii) => (
                  <div key={ii}
                    className="flex items-center gap-2.5 py-2"
                    style={{ borderBottom: ii < day.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    {it.video && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#97E325' }} />}
                    <span className={`flex-1 text-[13px] leading-snug break-words ${it.video ? 'text-white/85' : 'text-white/45 font-semibold'}`}>
                      {it.text}
                    </span>
                    {it.video && (
                      <a href={ytLink(it.text)} target="_blank" rel="noopener noreferrer"
                        aria-label={t('فيديو التمرين', 'Exercise video')}
                        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
                        style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.28)' }}>
                        <span className="text-xs">🎥</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {tips.length > 0 && (
          <div className="rounded-xl px-3.5 py-3"
            style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <p className="text-[12px] font-bold mb-1.5" style={{ color: '#a78bfa' }}>💡 {t('نصائح', 'Tips')}</p>
            <div className="flex flex-col gap-1.5">
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[11px] mt-0.5" style={{ color: '#a78bfa' }}>◆</span>
                  <span className="flex-1 text-[12px] text-white/70 leading-snug">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const chip = (active: boolean) => ({
    background: active ? 'rgba(151,227,37,0.16)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${active ? 'rgba(151,227,37,0.5)' : 'rgba(255,255,255,0.08)'}`,
    color: active ? '#97E325' : 'rgba(255,255,255,0.55)',
  })

  return (
    <GlassCard glow="none" className="p-5" animate={false}>
      <div className="flex items-center gap-2 mb-1">
        <Dumbbell size={18} color="#97E325" />
        <h2 className="text-sm font-bold text-white">{t('خطة تمارين بالذكاء الاصطناعي', 'AI Training Plan')}</h2>
      </div>
      <p className="text-xs text-white/40 mb-4">
        {t('برنامج تدريب متكامل حسب رياضتك وأيامك وهدفك',
           'A complete program based on your sports, days & goal')}
      </p>

      {/* ── Saved plan preview ── */}
      {saved && !showForm && (
        <>
          <p className="text-[11px] text-white/40 mb-2 flex items-center gap-1">
            🎥 {t('اضغط الفيديو جنب أي تمرين لمشاهدة طريقة أدائه', 'Tap the video icon next to any exercise to see how it\'s performed')}
          </p>
          <div className="rounded-xl p-4 mb-3"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(151,227,37,0.15)', direction: lang === 'en' ? 'ltr' : 'rtl' }}>
            {renderPlan(saved.plan)}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{ background: 'rgba(151,227,37,0.14)', color: '#97E325', border: '1px solid rgba(151,227,37,0.3)' }}>
              <RefreshCw size={15} /> {t('خطة جديدة', 'New Plan')}
            </button>
            <button onClick={() => setSaved(null)}
              className="px-4 py-2.5 rounded-xl flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)' }}
              aria-label={t('حذف', 'Delete')}>
              <Trash2 size={15} color="rgba(239,68,68,0.6)" />
            </button>
          </div>
        </>
      )}

      {/* ── Form ── */}
      {(!saved || showForm) && (
        <div className="flex flex-col gap-4">
          {/* Sports */}
          <div>
            <label className="text-xs text-white/50 mb-2 block">
              {t('الرياضات (اختر، أو اكتب رياضتك، أو اتركها للذكاء)', 'Sports (pick, type your own, or leave to AI)')}
            </label>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map(s => (
                <button key={s.id} onClick={() => toggleSport(s.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={chip(sports.includes(s.id))}>
                  <span>{s.icon}</span> {t(s.ar, s.en)}
                </button>
              ))}
              {/* الرياضات المكتوبة يدوياً */}
              {customSports.map(s => (
                <button key={s} onClick={() => toggleSport(s)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={chip(true)}>
                  ✨ {s} <X size={12} />
                </button>
              ))}
            </div>
            {/* إضافة رياضة حرة */}
            <div className="flex gap-2 mt-2">
              <input
                value={customSport}
                onChange={e => setCustomSport(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSport() } }}
                placeholder={t('أضف رياضة أخرى (مثال: تنس، كروسفت، جوجيتسو)', 'Add another sport (e.g. tennis, crossfit)')}
                className="galaxy-input flex-1 px-3 py-2 text-xs" />
              <button onClick={addCustomSport} disabled={!customSport.trim()}
                className="px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 disabled:opacity-40"
                style={{ background: 'rgba(0,212,255,0.14)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.3)' }}>
                {t('إضافة', 'Add')}
              </button>
            </div>
          </div>

          {/* Days */}
          <div>
            <label className="text-xs text-white/50 mb-2 block">{t('كم مرة تتمرّن في الأسبوع؟', 'How many times per week?')}</label>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className="w-9 h-9 rounded-lg text-sm font-bold transition-all"
                  style={chip(days === d)}>{d}</button>
              ))}
            </div>
          </div>

          {/* Minutes — open value */}
          <div>
            <label className="text-xs text-white/50 mb-2 block">{t('مدة الحصة (دقيقة)', 'Session length (min)')}</label>
            <div className="flex items-center gap-2">
              <input type="number" inputMode="numeric" min={10} max={480} value={minutes || ''}
                onChange={e => setMinutes(Math.min(480, Math.max(0, parseInt(e.target.value) || 0)))}
                className="galaxy-input px-3 py-2 text-sm w-24 text-center font-bold" dir="ltr" />
              <span className="text-xs text-white/40">
                {minutes >= 60 ? t(`≈ ${Math.floor(minutes / 60)} س ${minutes % 60 ? (minutes % 60) + ' د' : ''}`, `≈ ${Math.floor(minutes / 60)}h ${minutes % 60 ? (minutes % 60) + 'm' : ''}`) : t('دقيقة', 'minutes')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[30, 45, 60, 90, 120, 180, 240].map(m => (
                <button key={m} onClick={() => setMinutes(m)}
                  className="px-2.5 h-8 rounded-lg text-xs font-bold transition-all"
                  style={chip(minutes === m)}>
                  {m < 60 ? `${m}${t('د', 'm')}` : t(`${m / 60}س`, `${m / 60}h`)}
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div>
            <label className="text-xs text-white/50 mb-2 block">{t('الهدف', 'Goal')}</label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(g => (
                <button key={g.id} onClick={() => setGoal(g.id)}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={chip(goal === g.id)}>{t(g.ar, g.en)}</button>
              ))}
            </div>
          </div>

          {/* Level + Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-2 block">{t('المستوى', 'Level')}</label>
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map(l => (
                  <button key={l.id} onClick={() => setLevel(l.id)}
                    className="px-2.5 py-2 rounded-lg text-xs font-bold transition-all"
                    style={chip(level === l.id)}>{t(l.ar, l.en)}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-2 block">{t('المدة', 'Period')}</label>
              <div className="flex gap-1.5">
                {([{ id: 'week', ar: 'أسبوعي', en: 'Weekly' }, { id: 'month', ar: 'شهري', en: 'Monthly' }] as const).map(p => (
                  <button key={p.id} onClick={() => setPeriod(p.id)}
                    className="flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all"
                    style={chip(period === p.id)}>{t(p.ar, p.en)}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Target kg (optional) */}
          <div>
            <label className="text-xs text-white/50 mb-2 block">{t('كم كيلو تريد أن تنقص؟ (اختياري)', 'How many kg to lose? (optional)')}</label>
            <input type="number" inputMode="decimal" min="0" value={targetKg}
              onChange={e => setTargetKg(e.target.value)}
              placeholder={t('مثال: 5', 'e.g. 5')}
              className="galaxy-input px-3 py-2.5 text-sm w-full" dir="ltr" />
          </div>

          {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
          {blocked && <ProUpsell text={t('انتهت تجربتك المجانية — اشترك لتوليد خطط التمارين', 'Your free trial ended — subscribe to generate training plans')} />}

          <button onClick={generate} disabled={loading}
            className="btn-galaxy w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {loading ? t('يبني برنامجك...', 'Building your program...') : t('ولّد البرنامج', 'Generate Program')}
          </button>
          {sports.length === 0 && (
            <p className="text-[11px] text-white/35 text-center -mt-1">
              {t('ما اخترت رياضة — الذكاء الاصطناعي بيختار الأنسب لهدفك',
                 'No sport selected — AI will choose what fits your goal')}
            </p>
          )}

          {saved && showForm && (
            <button onClick={() => setShowForm(false)} className="text-xs text-white/40 py-1">
              {t('إلغاء', 'Cancel')}
            </button>
          )}
        </div>
      )}
    </GlassCard>
  )
}
