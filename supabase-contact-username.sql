-- ══════════════════════════════════════════════
--  Dietak — اسم المستخدم + رسائل التواصل
--  شغّلها في: Supabase → SQL Editor → New Query
-- ══════════════════════════════════════════════

-- ── اسم مستخدم فريد على الملف الشخصي (غير حسّاس لحالة الأحرف) ──
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- فهرس فريد على lower(username) يمنع تكرار الأسماء (NULL مسموح للحسابات بلا اسم)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username));

-- ── رسائل التواصل (مشكلة/اقتراح) ──
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username   TEXT,
  email      TEXT,
  type       TEXT DEFAULT 'problem' CHECK (type IN ('problem','suggestion')),
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- المستخدم يقدر يرسل رسالته فقط
DROP POLICY IF EXISTS "own contact insert" ON public.contact_messages;
CREATE POLICY "own contact insert" ON public.contact_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- لا توجد سياسة SELECT/DELETE للمستخدم العادي — المشرف يقرأ عبر مفتاح الخدمة (API)
