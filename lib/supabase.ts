import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          age: number
          height: number
          weight: number
          target_weight: number
          activity_level: string
          goal: string
          daily_calorie_goal: number
          created_at: string
        }
      }
      food_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          food_name: string
          food_name_ar: string | null
          quantity: number
          calories: number
          protein: number
          carbs: number
          fat: number
          fiber: number | null
          sugars: number | null
          saturated_fat: number | null
          sodium: number | null
          meal_type: string
          logged_at: string
        }
      }
      weight_entries: {
        Row: {
          id: string
          user_id: string
          weight: number
          date: string
          note: string | null
          created_at: string
        }
      }
    }
  }
}
