-- ══════════════════════════════════════════════
--  Galaxy Nutrition — Supabase Schema
--  Run this in: Supabase → SQL Editor → New Query
-- ══════════════════════════════════════════════

-- ── Profiles ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name                 TEXT DEFAULT '',
  age                  INTEGER DEFAULT 25,
  height               NUMERIC DEFAULT 170,
  weight               NUMERIC DEFAULT 70,
  target_weight        NUMERIC DEFAULT 65,
  gender               TEXT DEFAULT 'male' CHECK (gender IN ('male','female')),
  activity_level       TEXT DEFAULT 'moderate',
  goal                 TEXT DEFAULT 'maintain',
  daily_calories       INTEGER DEFAULT 2000,
  target_protein       INTEGER DEFAULT 130,
  target_carbs         INTEGER DEFAULT 250,
  target_fat           INTEGER DEFAULT 65,
  target_water         INTEGER DEFAULT 2500,
  completed_onboarding BOOLEAN DEFAULT FALSE,
  theme                TEXT DEFAULT 'dark',
  notifications        BOOLEAN DEFAULT FALSE,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ── Food Logs ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.food_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date            DATE NOT NULL,
  name            TEXT NOT NULL,
  quantity        NUMERIC NOT NULL DEFAULT 100,
  unit            TEXT DEFAULT 'g',
  meal_type       TEXT DEFAULT 'lunch' CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  calories        NUMERIC NOT NULL DEFAULT 0,
  protein         NUMERIC DEFAULT 0,
  carbs           NUMERIC DEFAULT 0,
  fat             NUMERIC DEFAULT 0,
  fiber           NUMERIC DEFAULT 0,
  sugars          NUMERIC DEFAULT 0,
  saturated_fat   NUMERIC DEFAULT 0,
  unsaturated_fat NUMERIC DEFAULT 0,
  sodium          NUMERIC DEFAULT 0,
  potassium       NUMERIC DEFAULT 0,
  logged_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own food select" ON public.food_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own food insert" ON public.food_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own food delete" ON public.food_logs FOR DELETE USING (auth.uid() = user_id);

-- ── Weight Entries ────────────────────────────
CREATE TABLE IF NOT EXISTS public.weight_entries (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight     NUMERIC NOT NULL,
  date       DATE DEFAULT CURRENT_DATE,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weight select" ON public.weight_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own weight insert" ON public.weight_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own weight delete" ON public.weight_entries FOR DELETE USING (auth.uid() = user_id);

-- ── Water Logs ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.water_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date       DATE DEFAULT CURRENT_DATE,
  amount_ml  INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water select" ON public.water_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own water insert" ON public.water_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own water update" ON public.water_logs FOR UPDATE USING (auth.uid() = user_id);
