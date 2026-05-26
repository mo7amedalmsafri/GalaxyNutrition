export interface FoodDBItem {
  id: string
  nameAr: string
  name: string
  emoji: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugars: number
  saturatedFat: number
  unsaturatedFat: number
  sodium?: number
  potassium?: number
  category: 'protein' | 'carbs' | 'vegetable' | 'fruit' | 'dairy' | 'fat' | 'arabic' | 'other'
}

export const COMMON_FOODS: FoodDBItem[] = [
  // Proteins
  { id: 'chicken_breast', nameAr: 'صدر دجاج', name: 'Chicken Breast', emoji: '🍗', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugars: 0, saturatedFat: 1.0, unsaturatedFat: 2.6, sodium: 74, potassium: 256, category: 'protein' },
  { id: 'egg', nameAr: 'بيضة', name: 'Egg', emoji: '🥚', calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugars: 1.1, saturatedFat: 3.3, unsaturatedFat: 7.7, sodium: 124, potassium: 138, category: 'protein' },
  { id: 'tuna', nameAr: 'تونة', name: 'Tuna', emoji: '🐟', calories: 116, protein: 26, carbs: 0, fat: 1.0, fiber: 0, sugars: 0, saturatedFat: 0.3, unsaturatedFat: 0.7, sodium: 47, potassium: 441, category: 'protein' },
  { id: 'beef', nameAr: 'لحم بقر', name: 'Lean Beef', emoji: '🥩', calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, sugars: 0, saturatedFat: 6.0, unsaturatedFat: 9.0, sodium: 72, potassium: 318, category: 'protein' },
  { id: 'salmon', nameAr: 'سمك سلمون', name: 'Salmon', emoji: '🐟', calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugars: 0, saturatedFat: 3.0, unsaturatedFat: 10, sodium: 59, potassium: 363, category: 'protein' },
  { id: 'whey', nameAr: 'واي بروتين', name: 'Whey Protein', emoji: '💪', calories: 380, protein: 80, carbs: 8, fat: 5, fiber: 0, sugars: 4, saturatedFat: 1.5, unsaturatedFat: 3.5, category: 'protein' },

  // Carbs
  { id: 'white_rice', nameAr: 'أرز أبيض', name: 'White Rice (cooked)', emoji: '🍚', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugars: 0.1, saturatedFat: 0.1, unsaturatedFat: 0.2, sodium: 1, potassium: 35, category: 'carbs' },
  { id: 'oats', nameAr: 'شوفان', name: 'Oats', emoji: '🌾', calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, sugars: 1, saturatedFat: 1.3, unsaturatedFat: 5.7, sodium: 2, potassium: 429, category: 'carbs' },
  { id: 'bread', nameAr: 'خبز أبيض', name: 'White Bread', emoji: '🍞', calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugars: 5, saturatedFat: 0.7, unsaturatedFat: 2.5, sodium: 491, potassium: 115, category: 'carbs' },
  { id: 'pasta', nameAr: 'معكرونة', name: 'Pasta (cooked)', emoji: '🍝', calories: 158, protein: 5.8, carbs: 31, fat: 0.9, fiber: 1.8, sugars: 0.6, saturatedFat: 0.2, unsaturatedFat: 0.7, category: 'carbs' },
  { id: 'sweet_potato', nameAr: 'بطاطا حلوة', name: 'Sweet Potato', emoji: '🍠', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, sugars: 4.2, saturatedFat: 0.0, unsaturatedFat: 0.1, potassium: 337, category: 'carbs' },
  { id: 'brown_rice', nameAr: 'أرز بني', name: 'Brown Rice (cooked)', emoji: '🍚', calories: 123, protein: 2.7, carbs: 26, fat: 1, fiber: 1.8, sugars: 0.4, saturatedFat: 0.2, unsaturatedFat: 0.8, category: 'carbs' },

  // Vegetables
  { id: 'broccoli', nameAr: 'بروكلي', name: 'Broccoli', emoji: '🥦', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugars: 1.7, saturatedFat: 0.0, unsaturatedFat: 0.4, potassium: 316, category: 'vegetable' },
  { id: 'spinach', nameAr: 'سبانخ', name: 'Spinach', emoji: '🥬', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugars: 0.4, saturatedFat: 0.1, unsaturatedFat: 0.3, potassium: 558, category: 'vegetable' },
  { id: 'tomato', nameAr: 'طماطم', name: 'Tomato', emoji: '🍅', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugars: 2.6, saturatedFat: 0.0, unsaturatedFat: 0.2, potassium: 237, category: 'vegetable' },
  { id: 'cucumber', nameAr: 'خيار', name: 'Cucumber', emoji: '🥒', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, sugars: 1.7, saturatedFat: 0.0, unsaturatedFat: 0.1, category: 'vegetable' },

  // Fruits
  { id: 'banana', nameAr: 'موز', name: 'Banana', emoji: '🍌', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugars: 12, saturatedFat: 0.1, unsaturatedFat: 0.2, potassium: 358, category: 'fruit' },
  { id: 'apple', nameAr: 'تفاح', name: 'Apple', emoji: '🍎', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugars: 10, saturatedFat: 0.0, unsaturatedFat: 0.2, potassium: 107, category: 'fruit' },
  { id: 'dates', nameAr: 'تمر', name: 'Dates', emoji: '🌴', calories: 277, protein: 1.8, carbs: 75, fat: 0.2, fiber: 6.7, sugars: 66, saturatedFat: 0.0, unsaturatedFat: 0.2, potassium: 696, category: 'fruit' },
  { id: 'orange', nameAr: 'برتقال', name: 'Orange', emoji: '🍊', calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, sugars: 9.4, saturatedFat: 0.0, unsaturatedFat: 0.1, potassium: 181, category: 'fruit' },

  // Dairy
  { id: 'milk', nameAr: 'حليب كامل', name: 'Whole Milk', emoji: '🥛', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, sugars: 5.1, saturatedFat: 2.1, unsaturatedFat: 1.2, potassium: 150, category: 'dairy' },
  { id: 'yogurt', nameAr: 'زبادي', name: 'Plain Yogurt', emoji: '🥣', calories: 59, protein: 3.5, carbs: 3.6, fat: 3.3, fiber: 0, sugars: 3.2, saturatedFat: 2.1, unsaturatedFat: 1.2, category: 'dairy' },
  { id: 'cheese', nameAr: 'جبنة', name: 'Cheddar Cheese', emoji: '🧀', calories: 403, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugars: 0.5, saturatedFat: 21, unsaturatedFat: 12, sodium: 621, category: 'dairy' },

  // Legumes
  { id: 'lentils', nameAr: 'عدس', name: 'Lentils (cooked)', emoji: '🫘', calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, sugars: 1.8, saturatedFat: 0.1, unsaturatedFat: 0.3, potassium: 369, category: 'other' },
  { id: 'chickpeas', nameAr: 'حمص حبوب', name: 'Chickpeas', emoji: '🫘', calories: 164, protein: 8.9, carbs: 27, fat: 2.6, fiber: 7.6, sugars: 4.8, saturatedFat: 0.3, unsaturatedFat: 2.3, potassium: 291, category: 'other' },

  // Fats
  { id: 'almonds', nameAr: 'لوز', name: 'Almonds', emoji: '🥜', calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5, sugars: 4.4, saturatedFat: 3.8, unsaturatedFat: 46, potassium: 733, category: 'fat' },
  { id: 'avocado', nameAr: 'أفوكادو', name: 'Avocado', emoji: '🥑', calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, sugars: 0.7, saturatedFat: 2.1, unsaturatedFat: 12.9, potassium: 485, category: 'fat' },
  { id: 'olive_oil', nameAr: 'زيت زيتون', name: 'Olive Oil', emoji: '🫒', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugars: 0, saturatedFat: 14, unsaturatedFat: 86, category: 'fat' },

  // Arabic foods
  { id: 'hummus', nameAr: 'حمص (معجون)', name: 'Hummus', emoji: '🫙', calories: 177, protein: 8.1, carbs: 20, fat: 8.6, fiber: 6, sugars: 3.7, saturatedFat: 1.3, unsaturatedFat: 7.3, category: 'arabic' },
  { id: 'falafel', nameAr: 'فلافل', name: 'Falafel', emoji: '🧆', calories: 333, protein: 13, carbs: 32, fat: 18, fiber: 4.9, sugars: 3.6, saturatedFat: 2.3, unsaturatedFat: 15.7, category: 'arabic' },
  { id: 'shawarma', nameAr: 'شاورما دجاج', name: 'Chicken Shawarma', emoji: '🌯', calories: 215, protein: 20, carbs: 12, fat: 10, fiber: 1, sugars: 2, saturatedFat: 2.5, unsaturatedFat: 7.5, sodium: 480, category: 'arabic' },
  { id: 'kabsa', nameAr: 'كبسة دجاج', name: 'Chicken Kabsa', emoji: '🍲', calories: 180, protein: 12, carbs: 22, fat: 5, fiber: 1, sugars: 1, saturatedFat: 1.5, unsaturatedFat: 3.5, category: 'arabic' },
  { id: 'mansaf', nameAr: 'منسف (لحم)', name: 'Mansaf Lamb', emoji: '🍖', calories: 220, protein: 18, carbs: 15, fat: 10, fiber: 0.5, sugars: 1, saturatedFat: 4, unsaturatedFat: 6, category: 'arabic' },
]

export const POPULAR_FOOD_IDS = [
  'chicken_breast', 'oats', 'white_rice', 'egg', 'banana',
  'brown_rice', 'tuna', 'sweet_potato', 'avocado', 'almonds',
  'dates', 'hummus',
]

export function getPopularFoods(): FoodDBItem[] {
  return POPULAR_FOOD_IDS
    .map(id => COMMON_FOODS.find(f => f.id === id))
    .filter(Boolean) as FoodDBItem[]
}

export function searchFoods(query: string): FoodDBItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return getPopularFoods()
  return COMMON_FOODS.filter(
    f => f.nameAr.includes(q) || f.name.toLowerCase().includes(q)
  ).slice(0, 15)
}
