import { BMIInfo, NutritionData } from './types'

export function calculateBMI(weight: number, height: number): BMIInfo {
  const heightM = height / 100
  const bmi = weight / (heightM * heightM)
  const value = Math.round(bmi * 10) / 10

  if (value < 18.5) {
    return {
      value,
      category: 'underweight',
      categoryAr: 'نقص الوزن',
      categoryEn: 'Underweight',
      color: '#06b6d4',
      advice: 'أنت بحاجة إلى زيادة تناول السعرات الحرارية. ركّز على الأطعمة المغذية وكثيفة الطاقة.',
      adviceEn: 'You need to increase calorie intake. Focus on nutrient-dense, energy-rich foods.',
    }
  } else if (value < 25) {
    return {
      value,
      category: 'normal',
      categoryAr: 'وزن مثالي',
      categoryEn: 'Healthy Weight',
      color: '#10b981',
      advice: 'وزنك مثالي! حافظ على نمط حياتك الصحي ونظامك الغذائي المتوازن.',
      adviceEn: 'Your weight is ideal! Maintain your healthy lifestyle and balanced diet.',
    }
  } else if (value < 30) {
    return {
      value,
      category: 'overweight',
      categoryAr: 'زيادة في الوزن',
      categoryEn: 'Overweight',
      color: '#f59e0b',
      advice: 'يُنصح بتقليل السعرات الحرارية تدريجياً وزيادة النشاط البدني.',
      adviceEn: 'Consider gradually reducing calories and increasing physical activity.',
    }
  } else {
    return {
      value,
      category: 'obese',
      categoryAr: 'سمنة',
      categoryEn: 'Obese',
      color: '#ef4444',
      advice: 'يُستحسن استشارة طبيب أو أخصائي تغذية لوضع خطة صحية مخصصة.',
      adviceEn: 'Consulting a doctor or nutritionist to create a personalized health plan is recommended.',
    }
  }
}

export function calculateDailyCalories(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female',
  activityLevel: string,
  goal: string
): number {
  // Mifflin-St Jeor Equation
  let bmr: number
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161
  }

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
  }

  const tdee = bmr * (activityMultipliers[activityLevel] || 1.55)

  if (goal === 'lose') return Math.round(tdee - 500)
  if (goal === 'gain') return Math.round(tdee + 300)
  return Math.round(tdee)
}

export function emptyNutrition(): NutritionData {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fiber: 0,
    sugars: 0,
    fat: 0,
    saturatedFat: 0,
    unsaturatedFat: 0,
    sodium: 0,
    potassium: 0,
  }
}

export function sumNutrition(items: NutritionData[]): NutritionData {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fiber: (acc.fiber ?? 0) + (item.fiber ?? 0),
      sugars: (acc.sugars ?? 0) + (item.sugars ?? 0),
      fat: acc.fat + item.fat,
      saturatedFat: (acc.saturatedFat ?? 0) + (item.saturatedFat ?? 0),
      unsaturatedFat: (acc.unsaturatedFat ?? 0) + (item.unsaturatedFat ?? 0),
      sodium: (acc.sodium ?? 0) + (item.sodium ?? 0),
      potassium: (acc.potassium ?? 0) + (item.potassium ?? 0),
    }),
    emptyNutrition()
  )
}

export function formatNumber(n: number, decimals = 0): string {
  return n.toFixed(decimals)
}

export function getMealTypeAr(type: string): string {
  const map: Record<string, string> = {
    breakfast: 'الإفطار',
    lunch: 'الغداء',
    dinner: 'العشاء',
    snack: 'وجبة خفيفة',
  }
  return map[type] || type
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function getArabicDate(date: string): string {
  return new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
