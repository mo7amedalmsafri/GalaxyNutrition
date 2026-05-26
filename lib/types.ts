export interface UserProfile {
  id: string
  name: string
  age: number
  height: number // cm
  weight: number // kg
  targetWeight: number
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive'
  goal: 'lose' | 'maintain' | 'gain'
  dailyCalorieGoal: number
  createdAt: string
}

export interface NutritionData {
  calories: number
  protein: number
  carbs: number
  fiber: number
  sugars: number
  fat: number
  saturatedFat: number
  unsaturatedFat: number
  sodium?: number
  potassium?: number
  vitaminC?: number
  vitaminD?: number
  calcium?: number
  iron?: number
}

export interface FoodItem {
  id: string
  name: string
  nameAr?: string
  quantity: number // grams
  unit: string
  nutrition: NutritionData
  image?: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  loggedAt: string
}

export interface DailyLog {
  id: string
  userId: string
  date: string
  foods: FoodItem[]
  totalNutrition: NutritionData
  waterIntake: number // ml
  notes?: string
}

export interface WeightEntry {
  id: string
  userId: string
  weight: number
  date: string
  note?: string
}

export interface BMIInfo {
  value: number
  category: 'underweight' | 'normal' | 'overweight' | 'obese'
  categoryAr: string
  categoryEn: string
  color: string
  advice: string
  adviceEn: string
}

export interface AIAnalysisResult {
  detectedFoods: DetectedFood[]
  confidence: number
  rawAnalysis: string
}

export interface DetectedFood {
  name: string
  nameAr: string
  estimatedWeight: number
  nutrition: NutritionData
  confidence: number
}

export interface DashboardStats {
  todayCalories: number
  targetCalories: number
  remainingCalories: number
  todayProtein: number
  todayCarbs: number
  todayFat: number
  currentWeight: number
  targetWeight: number
  bmi: BMIInfo
  weeklyWeightData: WeightEntry[]
  streak: number
}
