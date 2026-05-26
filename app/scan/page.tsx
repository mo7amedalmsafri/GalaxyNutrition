'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, Upload, Loader2, CheckCircle, X, Plus, ChevronRight, ChevronDown, ChevronUp, Pencil, Check } from 'lucide-react'
import GlassCard from '@/components/GlassCard'
import { DetectedFood, FoodItem } from '@/lib/types'
import { addFoodLog } from '@/lib/db'
import { getTodayDate } from '@/lib/utils'
import { useT, useLang } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { canScan, remainingScans, incrementScanCount, FREE_DAILY_SCANS } from '@/lib/limits'

type ScanState = 'idle' | 'preview' | 'analyzing' | 'results' | 'error'

export default function ScanPage() {
  const t    = useT()
  const lang = useLang()
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
  const [editingName, setEditingName] = useState<{ index: number; value: string } | null>(null)
  const [recalculating, setRecalculating] = useState<number | null>(null)
  const [editingNutrition, setEditingNutrition] = useState<{
    index: number; field: 'calories' | 'protein' | 'carbs' | 'fat'; value: string
  } | null>(null)
  // تعديل اسم الوجبة الكاملة
  const [editingMealDesc, setEditingMealDesc] = useState(false)
  const [mealDescInput, setMealDescInput] = useState('')
  const [recalculatingMeal, setRecalculatingMeal] = useState(false)

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

  // تعديل قيمة غذائية يدوياً
  const updateFoodNutrition = (index: number, field: 'calories' | 'protein' | 'carbs' | 'fat', value: number) => {
    setDetectedFoods(foods => foods.map((f, i) =>
      i === index ? { ...f, nutrition: { ...f.nutrition, [field]: value } } : f
    ))
  }

  // تأكيد تعديل اسم مكوّن فردي → إعادة الحساب بالذكاء الاصطناعي
  const handleNameConfirm = async (index: number) => {
    if (!editingName || editingName.index !== index) return
    const newName = editingName.value.trim()
    if (!newName) { setEditingName(null); return }

    setEditingName(null)
    // احفظ الاسم الجديد فوراً (حتى لو فشل الـ API)
    setDetectedFoods(foods => foods.map((f, i) =>
      i === index ? { ...f, nameAr: newName } : f
    ))
    setRecalculating(index)

    try {
      const food = detectedFoods[index]
      const res = await fetch('/api/recalculate-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName: newName, estimatedWeight: food.estimatedWeight, language: lang }),
      })
      const data = await res.json()
      if (data.success) {
        setDetectedFoods(foods => foods.map((f, i) =>
          i === index
            ? { ...f, name: data.name || newName, nameAr: data.nameAr || newName, nutrition: { ...f.nutrition, ...data.nutrition } }
            : f
        ))
      }
    } catch (err) {
      console.error('recalculate-food error:', err)
    }
    setRecalculating(null)
  }

  // تأكيد تعديل اسم الوجبة الكاملة → إعادة حساب كل شيء
  const handleMealDescConfirm = async () => {
    const newDesc = mealDescInput.trim()
    if (!newDesc) { setEditingMealDesc(false); return }

    setEditingMealDesc(false)
    setMealDescription(newDesc)   // حدّث الاسم فوراً
    setRecalculatingMeal(true)

    try {
      const res = await fetch('/api/recalculate-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName: newDesc, estimatedWeight: totalWeight || 100, language: lang }),
      })
      const data = await res.json()
      if (data.success) {
        setDetectedFoods([{
          name:   data.name   || newDesc,
          nameAr: data.nameAr || (lang === 'ar' ? newDesc : data.name || newDesc),
          estimatedWeight: totalWeight  || 100,
          confidence:      1,
          nutrition: {
            calories:       data.nutrition.calories       ?? 0,
            protein:        data.nutrition.protein        ?? 0,
            carbs:          data.nutrition.carbs          ?? 0,
            fat:            data.nutrition.fat            ?? 0,
            fiber:          data.nutrition.fiber          ?? 0,
            sugars:         data.nutrition.sugars         ?? 0,
            saturatedFat:   data.nutrition.saturatedFat   ?? 0,
            unsaturatedFat: data.nutrition.unsaturatedFat ?? 0,
            sodium:         data.nutrition.sodium         ?? 0,
            potassium:      data.nutrition.potassium      ?? 0,
          },
        }])
      }
    } catch (err) {
      console.error('recalculate-meal error:', err)
    }
    setRecalculatingMeal(false)
  }

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
        body: JSON.stringify({ imageBase64, mimeType: imageMime, language: lang }),
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
    setEditingName(null)
    setRecalculating(null)
    setEditingNutrition(null)
    setEditingMealDesc(false)
    setMealDescInput('')
    setRecalculatingMeal(false)
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
              <div className="flex-1 min-w-0 ml-3">
                <p className="text-xs text-white/40 mb-0.5">{t('الوجبة الكاملة', 'Full Meal')}</p>

                {recalculatingMeal ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader2 size={16} color="#c084fc" className="animate-spin" />
                    <span className="text-sm font-bold text-white/60">{t('يعيد الحساب...', 'Recalculating...')}</span>
                  </div>
                ) : editingMealDesc ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      value={mealDescInput}
                      onChange={e => setMealDescInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleMealDescConfirm()
                        if (e.key === 'Escape') setEditingMealDesc(false)
                      }}
                      className="flex-1 text-base font-black text-white bg-transparent border-b outline-none min-w-0"
                      style={{ borderColor: 'rgba(192,132,252,0.5)' }}
                      autoFocus
                      dir="auto"
                    />
                    <button onClick={handleMealDescConfirm}
                      className="p-1.5 rounded-lg flex-shrink-0"
                      style={{ background: 'rgba(16,185,129,0.2)' }}>
                      <Check size={14} color="#10b981" />
                    </button>
                    <button onClick={() => setEditingMealDesc(false)}
                      className="p-1.5 rounded-lg flex-shrink-0"
                      style={{ background: 'rgba(239,68,68,0.15)' }}>
                      <X size={14} color="#ef4444" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white truncate">
                      {mealDescription || t('وجبة محللة', 'Analyzed Meal')}
                    </h2>
                    <button
                      onClick={() => { setMealDescInput(mealDescription); setEditingMealDesc(true) }}
                      className="p-1.5 rounded-lg flex-shrink-0"
                      style={{ background: 'rgba(192,132,252,0.12)', opacity: 0.75 }}
                      title={t('تعديل اسم الوجبة وإعادة الحساب', 'Edit meal name & recalculate')}>
                      <Pencil size={12} color="#c084fc" />
                    </button>
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
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
              {detectedFoods.map((food, i) => {
                const isRecalc  = recalculating === i
                const isEditingThisName = editingName?.index === i

                const macros: Array<{
                  field: 'calories' | 'protein' | 'carbs' | 'fat'
                  color: string
                  labelAr: string
                  labelEn: string
                  unit: string
                }> = [
                  { field: 'calories', color: '#f59e0b', labelAr: 'سعرة', labelEn: 'kcal', unit: '' },
                  { field: 'protein',  color: '#06b6d4', labelAr: 'بروتين', labelEn: 'P', unit: 'g' },
                  { field: 'carbs',    color: '#97E325', labelAr: 'كارب', labelEn: 'C', unit: 'g' },
                  { field: 'fat',      color: '#FF5F1F', labelAr: 'دهن', labelEn: 'F', unit: 'g' },
                ]

                return (
                  <GlassCard key={i} glow="none" className="p-4" animate={false}>
                    {isRecalc ? (
                      /* ── حالة إعادة الحساب ── */
                      <div className="flex items-center gap-3 py-1">
                        <Loader2 size={18} color="#c084fc" className="animate-spin flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-white/70">{t('يعيد الحساب...', 'Recalculating...')}</p>
                          <p className="text-xs text-white/35 mt-0.5">{t('الذكاء الاصطناعي يحسب القيم الجديدة', 'AI is computing new values')}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">

                          {/* ── صف الاسم ── */}
                          <div className="flex items-center gap-2 mb-2">
                            {isEditingThisName ? (
                              <>
                                <input
                                  value={editingName?.value ?? ''}
                                  onChange={e => setEditingName({ index: i, value: e.target.value })}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleNameConfirm(i)
                                    if (e.key === 'Escape') setEditingName(null)
                                  }}
                                  className="flex-1 text-sm font-bold text-white bg-transparent border-b outline-none min-w-0"
                                  style={{ borderColor: 'rgba(192,132,252,0.5)' }}
                                  autoFocus
                                  dir="auto"
                                />
                                {/* زر تأكيد */}
                                <button
                                  onClick={() => handleNameConfirm(i)}
                                  className="p-1.5 rounded-lg flex-shrink-0"
                                  style={{ background: 'rgba(16,185,129,0.2)' }}>
                                  <Check size={13} color="#10b981" />
                                </button>
                                {/* زر إلغاء */}
                                <button
                                  onClick={() => setEditingName(null)}
                                  className="p-1.5 rounded-lg flex-shrink-0"
                                  style={{ background: 'rgba(239,68,68,0.15)' }}>
                                  <X size={13} color="#ef4444" />
                                </button>
                              </>
                            ) : (
                              <>
                                <h3 className="font-bold text-white text-sm truncate">
                                  {lang === 'en' ? (food.name || food.nameAr) : (food.nameAr || food.name)}
                                </h3>
                                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                                  style={{ background: 'rgba(107,33,168,0.2)', color: '#c084fc' }}>
                                  ~{food.estimatedWeight}{t('جم', 'g')}
                                </span>
                                {/* زر تعديل الاسم */}
                                <button
                                  onClick={() => setEditingName({ index: i, value: lang === 'en' ? (food.name || food.nameAr) : (food.nameAr || food.name) })}
                                  className="p-1.5 rounded-lg flex-shrink-0"
                                  style={{ background: 'rgba(192,132,252,0.12)', opacity: 0.7 }}
                                  title={t('تعديل الاسم وإعادة الحساب', 'Edit name & recalculate')}>
                                  <Pencil size={12} color="#c084fc" />
                                </button>
                              </>
                            )}
                          </div>

                          {/* ── صف القيم الغذائية (قابلة للتعديل) ── */}
                          <div className="flex gap-1.5 flex-wrap">
                            {macros.map(({ field, color, labelAr, labelEn, unit }) => {
                              const isEditingThis =
                                editingNutrition?.index === i && editingNutrition.field === field
                              const displayVal = Math.round(food.nutrition[field])

                              return isEditingThis ? (
                                <div key={field} className="flex items-center gap-1 px-2 py-1 rounded-lg"
                                  style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
                                  <input
                                    type="number"
                                    value={editingNutrition.value}
                                    onChange={e => setEditingNutrition({ ...editingNutrition!, value: e.target.value })}
                                    onBlur={() => {
                                      const num = parseFloat(editingNutrition?.value ?? '')
                                      if (!isNaN(num) && num >= 0) updateFoodNutrition(i, field, num)
                                      setEditingNutrition(null)
                                    }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        const num = parseFloat(editingNutrition?.value ?? '')
                                        if (!isNaN(num) && num >= 0) updateFoodNutrition(i, field, num)
                                        setEditingNutrition(null)
                                      }
                                      if (e.key === 'Escape') setEditingNutrition(null)
                                    }}
                                    className="w-12 text-xs font-bold bg-transparent outline-none text-center"
                                    style={{ color }}
                                    autoFocus
                                    min={0}
                                  />
                                  <span className="text-xs" style={{ color: `${color}90` }}>
                                    {unit}{unit ? ' ' : ''}{t(labelAr, labelEn)}
                                  </span>
                                </div>
                              ) : (
                                <button
                                  key={field}
                                  onClick={() => setEditingNutrition({ index: i, field, value: String(displayVal) })}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-opacity hover:opacity-80 active:opacity-60"
                                  style={{ background: `${color}10` }}>
                                  <span style={{ color }}>
                                    {displayVal}{unit} {t(labelAr, labelEn)}
                                  </span>
                                </button>
                              )
                            })}
                          </div>

                          {/* تلميح صغير */}
                          {!isEditingThisName && (
                            <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                              {t('✏️ اضغط على أي قيمة لتعديلها', '✏️ Tap any value to edit')}
                            </p>
                          )}
                        </div>

                        {/* شارة الثقة */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: 'rgba(107,33,168,0.15)' }}>
                          <span className="text-base">
                            {food.confidence > 0.85 ? '✅' : food.confidence > 0.6 ? '🟡' : '❓'}
                          </span>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                )
              })}
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
