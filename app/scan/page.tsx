'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, Upload, Loader2, CheckCircle, X, Plus, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import { DetectedFood, FoodItem } from '@/lib/types'
import { addFoodLog } from '@/lib/db'
import { getTodayDate } from '@/lib/utils'
import { useT } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { canScan, remainingScans, incrementScanCount, FREE_DAILY_SCANS } from '@/lib/limits'

type ScanState = 'idle' | 'preview' | 'analyzing' | 'results' | 'error'

export default function ScanPage() {
  const t = useT()
  const [state, setState] = useState<ScanState>('idle')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [showLimitModal, setShowLimitModal] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMime, setImageMime] = useState<string>('image/jpeg')
  const [detectedFoods, setDetectedFoods] = useState<DetectedFood[]>([])
  const [mealDescription, setMealDescription] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [mealAdded, setMealAdded] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const processImage = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setImageMime(file.type || 'image/jpeg')
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1]
      setImageBase64(base64)
      setState('preview')
    }
    reader.readAsDataURL(file)
  }, [])

  const analyzeImage = async () => {
    if (!imageBase64) return

    // ── Limit check ──
    if (!canScan(userEmail)) {
      setShowLimitModal(true)
      return
    }

    setState('analyzing')
    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType: imageMime }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'فشل التحليل')
      incrementScanCount()   // سجّل الاستخدام بعد النجاح فقط
      setDetectedFoods(data.detectedFoods || [])
      setMealDescription(data.mealDescription || '')
      setState('results')
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ غير متوقع')
      setState('error')
    }
  }

  // حساب مجموع الوجبة كاملة
  const totalNutrition = detectedFoods.reduce(
    (acc, f) => ({
      calories: acc.calories + f.nutrition.calories,
      protein:  acc.protein  + f.nutrition.protein,
      carbs:    acc.carbs    + f.nutrition.carbs,
      fat:      acc.fat      + f.nutrition.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const totalWeight = detectedFoods.reduce((s, f) => s + (f.estimatedWeight || 0), 0)

  // إضافة الوجبة كاملة مباشرة بدون modal
  const handleAddWholeMeal = async () => {
    await addFoodLog(getTodayDate(), {
      name:      mealDescription || t('وجبة محللة', 'Analyzed Meal'),
      quantity:  totalWeight || 100,
      unit:      'g',
      mealType:  'lunch',
      nutrition: {
        calories:       totalNutrition.calories,
        protein:        totalNutrition.protein,
        carbs:          totalNutrition.carbs,
        fat:            totalNutrition.fat,
        fiber:          detectedFoods.reduce((s, f) => s + (f.nutrition.fiber ?? 0), 0),
        sugars:         detectedFoods.reduce((s, f) => s + (f.nutrition.sugars ?? 0), 0),
        saturatedFat:   detectedFoods.reduce((s, f) => s + (f.nutrition.saturatedFat ?? 0), 0),
        unsaturatedFat: detectedFoods.reduce((s, f) => s + (f.nutrition.unsaturatedFat ?? 0), 0),
        sodium:         detectedFoods.reduce((s, f) => s + (f.nutrition.sodium ?? 0), 0),
        potassium:      detectedFoods.reduce((s, f) => s + (f.nutrition.potassium ?? 0), 0),
      },
    })
    setMealAdded(true)
  }

  const reset = () => {
    setState('idle')
    setImageUrl(null)
    setImageBase64(null)
    setImageMime('image/jpeg')
    setDetectedFoods([])
    setMealDescription('')
    setMealAdded(false)
    setShowDetails(false)
    setErrorMsg('')
  }

  return (
    <div className="flex flex-col px-4 pt-6 gap-5">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">
              <span className="text-gradient-galaxy">{t('تحليل', 'Analyze')}</span> {t('الوجبة', 'Meal')}
            </h1>
            <p className="text-white/40 text-sm mt-1">{t('صوّر وجبتك ودع الذكاء الاصطناعي يحللها', 'Snap your meal and let AI analyze it')}</p>
          </div>
          {/* شارة التحليلات المتبقية */}
          <div className="flex flex-col items-center px-3 py-2 rounded-2xl flex-shrink-0"
            style={{ background: 'rgba(107,33,168,0.15)', border: '1px solid rgba(107,33,168,0.3)' }}>
            <span className="text-lg font-black" style={{ color: '#c084fc' }}>
              {remainingScans(userEmail)}
            </span>
            <span className="text-[10px] text-white/40">{t('متبقي', 'left')}</span>
          </div>
        </div>
      </div>

      {/* Idle State */}
      {state === 'idle' && (
        <div className="flex flex-col gap-4 animate-slide-up">
          <GlassCard glow="purple" className="p-8 flex flex-col items-center gap-5" onClick={() => cameraRef.current?.click()}>
            <div className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse-glow"
              style={{ background: 'linear-gradient(135deg, #6b21a8, #ec4899)' }}>
              <Camera size={44} color="white" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black text-white mb-1">{t('صوّر الوجبة', 'Photograph Meal')}</h2>
              <p className="text-white/50 text-sm">{t('افتح الكاميرا والتقط صورة لوجبتك', 'Open the camera and take a photo of your meal')}</p>
            </div>
            <div className="px-8 py-3 rounded-2xl font-bold text-white text-base"
              style={{ background: 'linear-gradient(135deg, #6b21a8, #ec4899)' }}>
              📸 {t('فتح الكاميرا', 'Open Camera')}
            </div>
          </GlassCard>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <span className="text-xs text-white/30">{t('أو', 'or')}</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <GlassCard glow="none" className="p-5 flex items-center gap-4" onClick={() => fileRef.current?.click()}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(107,33,168,0.3)' }}>
              <Upload size={24} color="#c084fc" />
            </div>
            <div>
              <h3 className="font-bold text-white">{t('رفع من المعرض', 'Upload from Gallery')}</h3>
              <p className="text-white/40 text-sm">{t('اختر صورة من جهازك', 'Choose an image from your device')}</p>
            </div>
            <ChevronRight size={18} color="rgba(255,255,255,0.2)" className="mr-auto" />
          </GlassCard>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '🔍', ar: 'تعرف تلقائي', en: 'Auto Detect' },
              { icon: '⚡', ar: 'نتائج فورية', en: 'Instant Results' },
              { icon: '🎯', ar: 'دقة عالية',   en: 'High Accuracy' },
            ].map(f => (
              <div key={f.en} className="flex flex-col items-center gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-2xl">{f.icon}</span>
                <span className="text-xs text-white/50 text-center">{t(f.ar, f.en)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview State */}
      {state === 'preview' && imageUrl && (
        <div className="flex flex-col gap-4 animate-slide-up">
          <div className="relative rounded-2xl overflow-hidden" style={{ border: '2px solid rgba(107,33,168,0.4)' }}>
            <img src={imageUrl} alt="preview" className="w-full object-cover" style={{ maxHeight: 320 }} />
            <button onClick={reset} className="absolute top-3 left-3 p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <X size={18} color="white" />
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-3.5 rounded-2xl font-bold text-white/60"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              {t('إعادة التصوير', 'Retake')}
            </button>
            <button onClick={analyzeImage} className="flex-[2] py-3.5 rounded-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6b21a8, #ec4899)' }}>
              ✨ {t('تحليل بالذكاء الاصطناعي', 'Analyze with AI')}
            </button>
          </div>
        </div>
      )}

      {/* Analyzing State */}
      {state === 'analyzing' && (
        <div className="flex flex-col items-center gap-6 py-16 animate-fade-in">
          {imageUrl && (
            <div className="relative">
              <img src={imageUrl} alt="analyzing" className="w-48 h-48 object-cover rounded-2xl"
                style={{ filter: 'brightness(0.5)', border: '2px solid rgba(107,33,168,0.6)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center animate-spin-slow"
                  style={{ border: '3px solid transparent', borderTopColor: '#ec4899', borderRightColor: '#6b21a8' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(10,0,20,0.8)' }}>
                    <Loader2 size={24} color="#c084fc" className="animate-spin" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="text-center">
            <h2 className="text-xl font-black text-white mb-2">{t('جاري التحليل...', 'Analyzing...')}</h2>
            <p className="text-white/50 text-sm">{t('الذكاء الاصطناعي يفحص الأطعمة ويحسب القيم الغذائية', 'AI is identifying food items and calculating nutrition')}</p>
          </div>
        </div>
      )}

      {/* ── Results State ── */}
      {state === 'results' && (
        <div className="flex flex-col gap-4 animate-slide-up">

          {/* صورة الوجبة */}
          {imageUrl && (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={imageUrl} alt="meal" className="w-full object-cover" style={{ maxHeight: 200 }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,0,20,0.9) 0%, transparent 50%)' }} />
              <div className="absolute bottom-3 right-4 left-4">
                <p className="text-white font-bold text-lg">{mealDescription}</p>
                <p className="text-white/60 text-sm">{detectedFoods.length} {t('مكوّن مكتشف', 'items detected')}</p>
              </div>
            </div>
          )}

          {/* ── بطاقة الوجبة الكاملة ── */}
          <GlassCard glow="purple" className="p-5" animate={false}>

            {/* اسم الوجبة + إجمالي السعرات */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-white/40 mb-0.5">{t('الوجبة الكاملة', 'Full Meal')}</p>
                <h2 className="text-lg font-black text-white">{mealDescription || t('وجبة محللة', 'Analyzed Meal')}</h2>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black" style={{ color: '#f59e0b' }}>
                  {Math.round(totalNutrition.calories)}
                </p>
                <p className="text-xs text-white/40">kcal</p>
              </div>
            </div>

            {/* شريط الماكرو */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: t('بروتين', 'Protein'), value: Math.round(totalNutrition.protein), color: '#06b6d4', icon: '💪' },
                { label: t('كارب', 'Carbs'),    value: Math.round(totalNutrition.carbs),   color: '#97E325', icon: '🌾' },
                { label: t('دهون', 'Fat'),       value: Math.round(totalNutrition.fat),     color: '#FF5F1F', icon: '🥑' },
              ].map(m => (
                <div key={m.label} className="flex flex-col items-center py-2 rounded-xl"
                  style={{ background: `${m.color}12`, border: `1px solid ${m.color}25` }}>
                  <span className="text-sm">{m.icon}</span>
                  <span className="text-sm font-black" style={{ color: m.color }}>{m.value}g</span>
                  <span className="text-xs text-white/40">{m.label}</span>
                </div>
              ))}
            </div>

            {/* زر إضافة الوجبة كاملة */}
            {mealAdded ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-2xl"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <CheckCircle size={18} color="#10b981" />
                <span className="font-bold text-sm" style={{ color: '#10b981' }}>
                  {t('تمت الإضافة ✓', 'Added to log ✓')}
                </span>
              </div>
            ) : (
              <button
                onClick={handleAddWholeMeal}
                className="w-full py-3.5 rounded-2xl font-black text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #6b21a8, #ec4899)' }}>
                <Plus size={18} />
                {t('إضافة الوجبة كاملة', 'Add Full Meal')}
              </button>
            )}
          </GlassCard>

          {/* ── زر عرض/إخفاء التفاصيل ── */}
          <button
            onClick={() => setShowDetails(v => !v)}
            className="flex items-center justify-between w-full px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-sm font-bold text-white/60">
              {t('تفاصيل المكوّنات', 'Ingredient Details')} ({detectedFoods.length})
            </span>
            {showDetails
              ? <ChevronUp size={18} color="rgba(255,255,255,0.4)" />
              : <ChevronDown size={18} color="rgba(255,255,255,0.4)" />}
          </button>

          {/* ── قائمة المكوّنات (تظهر عند الضغط) ── */}
          {showDetails && (
            <div className="flex flex-col gap-2 animate-fade-in">
              {detectedFoods.map((food, i) => (
                <GlassCard key={i} glow="none" className="p-4" animate={false}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white text-sm truncate">{food.nameAr || food.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: 'rgba(107,33,168,0.2)', color: '#c084fc' }}>
                          ~{food.estimatedWeight}{t('جم', 'g')}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span style={{ color: '#f59e0b' }}>{Math.round(food.nutrition.calories)} kcal</span>
                        <span style={{ color: '#06b6d4' }}>{Math.round(food.nutrition.protein)}g {t('بروتين', 'P')}</span>
                        <span style={{ color: '#97E325' }}>{Math.round(food.nutrition.carbs)}g {t('كارب', 'C')}</span>
                        <span style={{ color: '#FF5F1F' }}>{Math.round(food.nutrition.fat)}g {t('دهن', 'F')}</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(107,33,168,0.15)' }}>
                      <span className="text-lg">
                        {food.confidence > 0.85 ? '✅' : food.confidence > 0.6 ? '🟡' : '❓'}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {/* زر تصوير وجبة أخرى */}
          <button onClick={reset} className="w-full py-3.5 rounded-2xl font-bold"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
            {t('تصوير وجبة أخرى', 'Scan Another Meal')}
          </button>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="flex flex-col items-center gap-5 py-12 animate-fade-in">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.15)' }}>
            <span className="text-4xl">⚠️</span>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-2">{t('فشل التحليل', 'Analysis Failed')}</h2>
            <p className="text-white/50 text-sm">{errorMsg}</p>
          </div>
          <button onClick={reset} className="btn-galaxy px-8 py-3">
            {t('حاول مجدداً', 'Try Again')}
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && processImage(e.target.files[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => e.target.files?.[0] && processImage(e.target.files[0])} />

      {/* ── Limit Modal ── */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4 animate-slide-up"
            style={{ background: '#0f0f18', border: '1px solid rgba(151,227,37,0.25)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-4xl"
                style={{ background: 'rgba(107,33,168,0.15)' }}>
                📷
              </div>
              <div>
                <h3 className="text-xl font-black text-white">
                  {t('وصلت الحد اليومي', 'Daily Limit Reached')}
                </h3>
                <p className="text-white/50 text-sm mt-1">
                  {t(`استخدمت ${FREE_DAILY_SCANS}/${FREE_DAILY_SCANS} تحليلات اليوم`,
                     `You've used ${FREE_DAILY_SCANS}/${FREE_DAILY_SCANS} free scans today`)}
                </p>
                <p className="text-white/30 text-xs mt-1">
                  {t('يتجدد الحد غداً تلقائياً', 'Limit resets tomorrow automatically')}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl text-center"
              style={{ background: 'rgba(151,227,37,0.07)', border: '1px solid rgba(151,227,37,0.15)' }}>
              <p className="text-xs text-white/50 mb-1">{t('مع Galaxy Pro', 'With Galaxy Pro')}</p>
              <p className="text-sm font-bold" style={{ color: '#97E325' }}>
                {t('📷 تحليل صور غير محدود', '📷 Unlimited AI scans')}
              </p>
            </div>

            <button
              className="w-full py-3.5 rounded-2xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, #97E325, #00D4FF)' }}
              onClick={() => setShowLimitModal(false)}
            >
              ⭐ {t('ترقّ إلى Galaxy Pro', 'Upgrade to Galaxy Pro')}
            </button>
            <button
              onClick={() => setShowLimitModal(false)}
              className="text-sm text-center"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              {t('ليس الآن', 'Not now')}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
