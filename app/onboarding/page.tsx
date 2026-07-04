'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import Logo from '@/components/Logo'
import { calculateBMI, calculateDailyCalories } from '@/lib/utils'
import { StoredProfile } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'

// 0=welcome 1=personal 2=body 3=activity 4=goal 5=diet 6=summary
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6

const TOTAL_STEPS = 6

const ACTIVITY_OPTIONS = [
  { value: 'sedentary',  label: 'خامل',   desc: 'لا رياضة',           icon: '🛋️' },
  { value: 'light',      label: 'خفيف',   desc: '1–3 أيام/أسبوع',    icon: '🚶' },
  { value: 'moderate',   label: 'معتدل',  desc: '3–5 أيام/أسبوع',    icon: '🏃' },
  { value: 'active',     label: 'نشيط',   desc: '6–7 أيام/أسبوع',    icon: '🏋️' },
  { value: 'veryActive', label: 'خارق',   desc: 'رياضة مكثفة',         icon: '🔥' },
]

const GOAL_OPTIONS = [
  { value: 'lose',     label: 'إنقاص الوزن',       icon: '📉', desc: 'تقليل 500 سعرة/يوم',  color: '#06b6d4' },
  { value: 'maintain', label: 'الحفاظ على الوزن',  icon: '⚖️', desc: 'توازن مثالي',           color: '#10b981' },
  { value: 'gain',     label: 'زيادة الوزن',        icon: '📈', desc: 'زيادة 300 سعرة/يوم',  color: '#f59e0b' },
]

const DIET_OPTIONS = [
  { value: 'balanced',      icon: '⚖️', label: 'متوازن',          desc: 'مناسب لجميع الأهداف',           color: '#10b981' },
  { value: 'keto',          icon: '🥑', label: 'كيتو',             desc: 'دهون عالية، كارب منخفض',         color: '#f59e0b' },
  { value: 'mediterranean', icon: '🫒', label: 'متوسطي',           desc: 'زيت زيتون وخضار وبروتين',         color: '#06b6d4' },
  { value: 'intermittent',  icon: '⏱️', label: 'صيام متقطع',       desc: 'نافذة أكل 8h، صيام 16h',          color: '#8b5cf6' },
  { value: 'lowcarb',       icon: '🥩', label: 'كارب منخفض',       desc: 'أقل من 100g كارب يومياً',          color: '#ef4444' },
]

function calcMacros(
  weight: number, targetWeight: number, height: number, age: number,
  gender: 'male' | 'female', activityLevel: string, goal: string
) {
  const cal = calculateDailyCalories(weight, height, age, gender, activityLevel, goal)
  const ref = goal === 'lose' ? targetWeight : weight
  const protein = Math.round(ref * (goal === 'maintain' ? 1.6 : 2.0))
  const fat = Math.round((cal * 0.27) / 9)
  const carbs = Math.round((cal - protein * 4 - fat * 9) / 4)
  const water = Math.round(weight * 35)
  return { cal, protein, carbs: Math.max(carbs, 50), fat, water }
}

function InputNum({
  label, value, onChange, unit, min = 0, max = 999,
}: {
  label: string; value: number; onChange: (v: number) => void
  unit: string; min?: number; max?: number
}) {
  const [localVal, setLocalVal] = useState(String(value))
  const lastExternal = useRef(String(value))

  useEffect(() => {
    const str = String(value)
    if (str !== lastExternal.current) {
      lastExternal.current = str
      setLocalVal(str)
    }
  }, [value])

  const commit = (str: string) => {
    const n = parseInt(str)
    if (!isNaN(n)) {
      const clamped = Math.min(max, Math.max(min, n))
      onChange(clamped)
      setLocalVal(String(clamped))
      lastExternal.current = String(clamped)
    } else {
      setLocalVal(String(value))
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-white/60">{label}</label>
      <div className="flex items-center gap-3">
        <button onClick={() => { const v = Math.max(min, value - 1); onChange(v); setLocalVal(String(v)); lastExternal.current = String(v) }}
          className="w-11 h-11 rounded-xl text-xl font-bold flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(151,227,37,0.15)', color: '#97E325' }}>−</button>
        <div className="flex-1 relative">
          <input
            type="text" inputMode="numeric" value={localVal}
            onChange={e => setLocalVal(e.target.value)}
            onBlur={() => commit(localVal)}
            className="galaxy-input w-full px-4 py-3 text-center text-2xl font-black"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">{unit}</span>
        </div>
        <button onClick={() => { const v = Math.min(max, value + 1); onChange(v); setLocalVal(String(v)); lastExternal.current = String(v) }}
          className="w-11 h-11 rounded-xl text-xl font-bold flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(151,227,37,0.15)', color: '#97E325' }}>+</button>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)

  // Personal
  const [name,         setName]         = useState('')
  const [age,          setAge]          = useState(25)
  const [gender,       setGender]       = useState<'male' | 'female'>('male')
  // Body
  const [height,       setHeight]       = useState(170)
  const [weight,       setWeight]       = useState(75)
  const [targetWeight, setTargetWeight] = useState(70)
  // Activity & Goal
  const [activity,     setActivity]     = useState('moderate')
  const [goal,         setGoal]         = useState('lose')
  // Diet
  const [diet,         setDiet]         = useState('balanced')

  const macros = calcMacros(weight, targetWeight, height, age, gender, activity, goal)
  const bmi    = calculateBMI(weight, height)

  const complete = async () => {
    const profile: StoredProfile = {
      name: name || 'مستخدم',
      age, height, weight, targetWeight, gender,
      activityLevel: activity, goal, diet,
      dailyCalories: macros.cal,
      targetProtein: macros.protein,
      targetCarbs:   macros.carbs,
      targetFat:     macros.fat,
      targetWater:   macros.water,
      completedOnboarding: true,
      theme: 'dark',
      notifications: false,
      language: 'ar',
    }
    localStorage.setItem('galaxy-profile', JSON.stringify(profile))

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').upsert({
          id:                   user.id,
          name:                 profile.name,
          age:                  profile.age,
          height:               profile.height,
          weight:               profile.weight,
          target_weight:        profile.targetWeight,
          gender:               profile.gender,
          activity_level:       profile.activityLevel,
          goal:                 profile.goal,
          daily_calories:       profile.dailyCalories,
          target_protein:       profile.targetProtein,
          target_carbs:         profile.targetCarbs,
          target_fat:           profile.targetFat,
          target_water:         profile.targetWater,
          completed_onboarding: true,
          theme:                'dark',
          notifications:        false,
          updated_at:           new Date().toISOString(),
        }, { onConflict: 'id' })
      }
    } catch { /* Fail silently */ }

    router.replace('/')
  }

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS) as Step)
  const back = () => setStep(s => Math.max(s - 1, 0) as Step)

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          'radial-gradient(ellipse at 20% 20%, rgba(151,227,37,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(0,212,255,0.1) 0%, transparent 50%), linear-gradient(180deg, #09090D 0%, #0d0d14 100%)',
      }}
    >
      <div className="relative z-10 flex flex-col items-center px-5 py-8 max-w-md mx-auto w-full min-h-screen">

        {/* Progress bar */}
        {step > 0 && (
          <div className="w-full mb-8">
            <div className="flex items-center justify-between mb-2">
              <button onClick={back} className="p-2 rounded-xl hover:bg-white/10">
                <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
              </button>
              <div className="flex gap-1.5">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
                  <div
                    key={s}
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: s <= step ? 24 : 8,
                      background: s <= step
                        ? 'linear-gradient(90deg, #97E325, #00D4FF)'
                        : 'rgba(255,255,255,0.15)',
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-white/30">{step}/{TOTAL_STEPS}</span>
            </div>
          </div>
        )}

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div className="flex flex-col items-center gap-8 mt-12 animate-fade-in w-full">
            <div className="animate-float"><Logo size={140} /></div>
            <div className="text-center">
              <h1 className="text-4xl font-black mb-2">
                <span className="text-gradient-galaxy">دايتك</span>
                <span className="text-white"> Dietak</span>
              </h1>
              <p className="text-white/50 text-base leading-relaxed">رفيقك الذكي في رحلة الصحة والتغذية</p>
            </div>
            <div className="flex flex-col items-center gap-3 w-full mt-4">
              {['تحليل وجباتك بالذكاء الاصطناعي', 'تتبع سعراتك ومغذياتك يومياً', 'خطة مخصصة لهدفك'].map(f => (
                <div key={f} className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(151,227,37,0.2)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #97E325, #00D4FF)' }}>
                    <Check size={12} color="white" strokeWidth={3} />
                  </div>
                  <span className="text-sm text-white/70">{f}</span>
                </div>
              ))}
            </div>
            <button onClick={next} className="btn-galaxy w-full py-4 text-lg mt-4">
              ابدأ رحلتك 🚀
            </button>
          </div>
        )}

        {/* ── Step 1: Personal info ── */}
        {step === 1 && (
          <div className="flex flex-col gap-6 w-full animate-slide-up">
            <div>
              <h2 className="text-2xl font-black text-white mb-1">أخبرنا عنك 👤</h2>
              <p className="text-white/40 text-sm">سنستخدم هذه المعلومات لحساب خطتك</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-white/60">اسمك</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                className="galaxy-input px-4 py-3.5 text-lg font-bold w-full"
                placeholder="مثال: أحمد، سارة..."
              />
            </div>
            <InputNum label="العمر" value={age} onChange={setAge} unit="سنة" min={10} max={100} />
            <div>
              <label className="text-sm text-white/60 mb-2 block">الجنس</label>
              <div className="grid grid-cols-2 gap-3">
                {[{ v: 'male', l: '👨 ذكر' }, { v: 'female', l: '👩 أنثى' }].map(g => (
                  <button key={g.v} onClick={() => setGender(g.v as 'male' | 'female')}
                    className="py-4 rounded-2xl text-base font-bold transition-all"
                    style={{
                      background: gender === g.v ? 'rgba(151,227,37,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${gender === g.v ? 'rgba(151,227,37,0.6)' : 'transparent'}`,
                      color: gender === g.v ? '#97E325' : 'rgba(255,255,255,0.5)',
                    }}>
                    {g.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Body ── */}
        {step === 2 && (
          <div className="flex flex-col gap-6 w-full animate-slide-up">
            <div>
              <h2 className="text-2xl font-black text-white mb-1">قياسات جسمك 📏</h2>
              <p className="text-white/40 text-sm">لحساب BMI وهدفك الغذائي بدقة</p>
            </div>
            <InputNum label="الطول"          value={height}       onChange={setHeight}       unit="سم" min={100} max={250} />
            <InputNum label="وزنك الحالي"    value={weight}       onChange={setWeight}       unit="كغ" min={30}  max={300} />
            <InputNum label="الوزن المستهدف" value={targetWeight} onChange={setTargetWeight} unit="كغ" min={30}  max={300} />
            <div
              className="p-4 rounded-2xl flex items-center justify-between"
              style={{ background: `${bmi.color}15`, border: `1px solid ${bmi.color}35` }}>
              <div>
                <p className="text-white/50 text-sm">مؤشر كتلة الجسم الحالي</p>
                <p className="text-2xl font-black" style={{ color: bmi.color }}>{bmi.value}</p>
              </div>
              <span className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ background: `${bmi.color}25`, color: bmi.color }}>
                {bmi.categoryAr}
              </span>
            </div>
          </div>
        )}

        {/* ── Step 3: Activity ── */}
        {step === 3 && (
          <div className="flex flex-col gap-5 w-full animate-slide-up">
            <div>
              <h2 className="text-2xl font-black text-white mb-1">مستوى نشاطك 🏃</h2>
              <p className="text-white/40 text-sm">كم مرة تمارس الرياضة أسبوعياً؟</p>
            </div>
            {ACTIVITY_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setActivity(opt.value)}
                className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                style={{
                  background: activity === opt.value ? 'rgba(151,227,37,0.12)' : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${activity === opt.value ? 'rgba(151,227,37,0.5)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <span className="text-3xl">{opt.icon}</span>
                <div className="text-right flex-1">
                  <p className="font-bold" style={{ color: activity === opt.value ? '#97E325' : 'white' }}>{opt.label}</p>
                  <p className="text-sm text-white/40">{opt.desc}</p>
                </div>
                {activity === opt.value && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #97E325, #00D4FF)' }}>
                    <Check size={13} color="white" strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Step 4: Goal ── */}
        {step === 4 && (
          <div className="flex flex-col gap-5 w-full animate-slide-up">
            <div>
              <h2 className="text-2xl font-black text-white mb-1">هدفك الرئيسي 🎯</h2>
              <p className="text-white/40 text-sm">ما الذي تريد تحقيقه؟</p>
            </div>
            {GOAL_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setGoal(opt.value)}
                className="flex items-center gap-4 p-5 rounded-2xl transition-all"
                style={{
                  background: goal === opt.value ? `${opt.color}18` : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${goal === opt.value ? opt.color + '55' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <span className="text-4xl">{opt.icon}</span>
                <div className="text-right flex-1">
                  <p className="font-black text-lg" style={{ color: goal === opt.value ? opt.color : 'white' }}>
                    {opt.label}
                  </p>
                  <p className="text-sm text-white/40">{opt.desc}</p>
                </div>
                {goal === opt.value && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: `${opt.color}30`, border: `2px solid ${opt.color}` }}>
                    <Check size={13} color={opt.color} strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Step 5: Diet Type ── */}
        {step === 5 && (
          <div className="flex flex-col gap-5 w-full animate-slide-up">
            <div>
              <h2 className="text-2xl font-black text-white mb-1">نوع نظامك الغذائي 🥗</h2>
              <p className="text-white/40 text-sm">يستخدمه الذكاء الاصطناعي عند توليد خطتك</p>
            </div>
            <div className="flex flex-col gap-3">
              {DIET_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setDiet(opt.value)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl transition-all text-right"
                  style={{
                    background: diet === opt.value ? `${opt.color}18` : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${diet === opt.value ? opt.color + '55' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  <span className="text-3xl flex-shrink-0">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-base leading-tight"
                      style={{ color: diet === opt.value ? opt.color : 'white' }}>
                      {opt.label}
                    </p>
                    <p className="text-xs mt-0.5 leading-tight"
                      style={{ color: diet === opt.value ? `${opt.color}99` : 'rgba(255,255,255,0.4)' }}>
                      {opt.desc}
                    </p>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                    style={{ borderColor: diet === opt.value ? opt.color : 'rgba(255,255,255,0.2)' }}>
                    {diet === opt.value && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: opt.color }} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 6: Summary ── */}
        {step === 6 && (
          <div className="flex flex-col gap-5 w-full animate-slide-up">
            <div className="text-center">
              <Logo size={80} />
              <h2 className="text-2xl font-black text-white mt-4 mb-1">
                خطتك المخصصة <span className="text-gradient-galaxy">✨</span>
              </h2>
              <p className="text-white/40 text-sm">مصممة خصيصاً لهدفك</p>
            </div>

            <div className="glass-card p-5 space-y-0">
              {/* Name */}
              <div className="flex items-center justify-between py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-white/60">👤 الاسم</span>
                <span className="font-bold text-white">{name || 'مستخدم'}</span>
              </div>

              {/* Goal + Diet */}
              <div className="flex items-center justify-between py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-white/60">🎯 الهدف</span>
                <span className="font-bold text-white">
                  {GOAL_OPTIONS.find(g => g.value === goal)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-white/60">🥗 الدايت</span>
                <span className="font-bold text-white">
                  {DIET_OPTIONS.find(d => d.value === diet)?.icon}{' '}
                  {DIET_OPTIONS.find(d => d.value === diet)?.label}
                </span>
              </div>

              {/* Macros */}
              {[
                { label: '🔥 السعرات اليومية', value: `${macros.cal}`,                             unit: 'سعرة',    color: '#f59e0b' },
                { label: '💪 البروتين',         value: `${macros.protein}`,                         unit: 'جم/يوم', color: '#06b6d4' },
                { label: '🌾 الكربوهيدرات',    value: `${macros.carbs}`,                           unit: 'جم/يوم', color: '#f59e0b' },
                { label: '🥑 الدهون',           value: `${macros.fat}`,                             unit: 'جم/يوم', color: '#FF5F1F' },
                { label: '💧 الماء',            value: `${(macros.water / 1000).toFixed(1)}`,       unit: 'لتر/يوم',color: '#06b6d4' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-white/60 text-sm">{row.label}</span>
                  <div>
                    <span className="font-black text-xl" style={{ color: row.color }}>{row.value}</span>
                    <span className="text-white/30 text-xs mr-1">{row.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={complete} className="btn-galaxy w-full py-4 text-lg">
              ابدأ رحلتك الآن 🚀
            </button>
          </div>
        )}

        {/* Next button (steps 1–5) */}
        {step >= 1 && step <= 5 && (
          <div className="w-full mt-auto pt-6 pb-8">
            <button
              onClick={next}
              disabled={step === 1 && !name.trim()}
              className="btn-galaxy w-full py-4 text-base"
              style={{ opacity: step === 1 && !name.trim() ? 0.5 : 1 }}
            >
              التالي
              <ChevronLeft size={18} className="inline mr-2" />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
