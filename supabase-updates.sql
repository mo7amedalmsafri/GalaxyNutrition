-- ══════════════════════════════════════════════════════════════
--  Galaxy Nutrition — تحديثات قاعدة البيانات المعلّقة
--  شغّل هذا الملف مرة واحدة في: Supabase → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════

-- ── 1. أعمدة نظام المستويات (XP) في جدول profiles ──────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp_locked  INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp_pending INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp_date    TEXT    DEFAULT '';

-- ── 2. جدول اشتراكات Stripe (للنسخة الويب) ─────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT DEFAULT 'inactive',
  current_period_end     TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own subscription select" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ملاحظة: الكتابة في subscriptions تتم فقط من الـ webhook
-- عبر service role key، لذا لا نضيف سياسات insert/update للمستخدمين.
